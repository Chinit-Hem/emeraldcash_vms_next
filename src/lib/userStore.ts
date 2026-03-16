import type { Role } from "./types";
import {
  ensureUsersTable,
  createUserInDB,
  getUserByUsername,
  listUsersFromDB,
  updateUserInDB,
  deleteUserFromDB,
  countAdminUsers,
  type UserDB,
} from "./user-db";
import {
  DatabaseError,
  isDuplicateError,
  isNotFoundError,
  isValidationError,
} from "./errors";

export type StoredUser = {
  username: string;
  role: Role;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
};

export type PublicUser = Omit<StoredUser, "passwordHash">;

export type CreateUserErrorCode =
  | "invalid_username"
  | "invalid_password"
  | "invalid_role"
  | "already_exists"
  | "database_error";

export type CreateUserResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: string; code: CreateUserErrorCode };

export type DeleteUserErrorCode =
  | "invalid_username"
  | "not_found"
  | "self_delete_forbidden"
  | "last_admin_forbidden"
  | "database_error";

export type DeleteUserResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: string; code: DeleteUserErrorCode };

export type UpdatePasswordResult =
  | { ok: true }
  | { ok: false; error: string; code: "invalid_password" | "not_found" | "database_error" };

const DEMO_PASSWORD_HASH = "$2b$10$mc.blHBFe/9vs2VJMG/Dqe7PlwgrQAlnPUmNJ0bXIaQFnnSnarmvy"; // 1234
const USERNAME_REGEX = /^[a-z0-9._-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 72;

// Track if we've initialized the database
let dbInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Logger utility for structured logging
function log(level: "INFO" | "ERROR" | "DEBUG", message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${timestamp}] [${level}] [USER_STORE] ${message}${metaStr}`);
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function sanitizeRole(role: unknown): Role {
  return role === "Admin" ? "Admin" : "Staff";
}

function publicUserFromDB(user: UserDB): PublicUser {
  return {
    username: user.username,
    role: user.role,
    createdAt: new Date(user.created_at).getTime(),
    updatedAt: new Date(user.updated_at).getTime(),
    createdBy: user.created_by,
  };
}

// Initialize database and seed default users if needed
async function initializeDatabase(): Promise<void> {
  if (dbInitialized) {
    log("DEBUG", "Database already initialized, skipping");
    return;
  }
  
  // Prevent concurrent initialization
  if (initializationPromise) {
    log("DEBUG", "Waiting for existing initialization");
    return initializationPromise;
  }
  
  log("INFO", "Starting database initialization");
  
  initializationPromise = (async () => {
    try {
      // Ensure users table exists
      await ensureUsersTable();
      
      // Check if we have any users
      const users = await listUsersFromDB();
      
      // Seed default users if database is empty
      if (users.length === 0) {
        log("INFO", "Database empty, seeding default users");
        
        const seeds = [
          { username: "admin", role: "Admin" as Role, passwordHash: DEMO_PASSWORD_HASH },
          { username: "staff", role: "Staff" as Role, passwordHash: DEMO_PASSWORD_HASH },
        ];
        
        for (const seed of seeds) {
          try {
            await createUserInDB({
              username: seed.username,
              passwordHash: seed.passwordHash,
              role: seed.role,
              createdBy: "system",
            });
            log("INFO", "Seeded user successfully", { username: seed.username });
          } catch (error) {
            if (isDuplicateError(error)) {
              log("DEBUG", "User already exists, skipping seed", { username: seed.username });
            } else {
              log("ERROR", "Failed to seed user", { 
                username: seed.username,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
        }
      } else {
        log("INFO", "Database already has users", { count: users.length });
      }
      
      dbInitialized = true;
      log("INFO", "Database initialization complete");
    } catch (error) {
      log("ERROR", "Database initialization failed", { 
        error: error instanceof Error ? error.message : String(error)
      });
      throw new DatabaseError("Failed to initialize database");
    } finally {
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
}

function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username);
  
  if (!normalized) {
    return "Username is required";
  }
  
  if (!USERNAME_REGEX.test(normalized)) {
    return "Username must be 3-32 chars, lowercase letters, numbers, dot, dash, underscore only";
  }
  
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or less`;
  }
  
  return null;
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    const bcrypt = await import("bcryptjs");
    return await bcrypt.compare(password, hash);
  } catch (error) {
    log("ERROR", "Password comparison failed", { 
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

export async function hashPassword(password: string): Promise<string> {
  try {
    const bcrypt = await import("bcryptjs");
    return await bcrypt.hash(password, 10);
  } catch (error) {
    log("ERROR", "Password hashing failed", { 
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to hash password");
  }
}

export async function listUsers(): Promise<PublicUser[]> {
  log("INFO", "listUsers() called");
  
  try {
    // Initialize database if needed
    await initializeDatabase();
    
    const users = await listUsersFromDB();
    log("INFO", "listUsers() returning users", { count: users.length });
    
    return users.map(publicUserFromDB);
  } catch (error) {
    log("ERROR", "listUsers() FAILED", { 
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<PublicUser | null> {
  log("INFO", "authenticateUser() called", { username });
  
  try {
    // Initialize database if needed
    await initializeDatabase();
    
    // Validate inputs
    const usernameError = validateUsername(username);
    if (usernameError) {
      log("INFO", "authenticateUser() - invalid username", { username, error: usernameError });
      return null;
    }
    
    const normalized = normalizeUsername(username);
    
    if (!normalized) {
      log("INFO", "authenticateUser() - empty username after normalization");
      return null;
    }
    
    const user = await getUserByUsername(normalized);
    if (!user) {
      log("INFO", "authenticateUser() - user not found", { username: normalized });
      return null;
    }

    const passwordOk = await comparePassword(password, user.password_hash);
    if (!passwordOk) {
      log("INFO", "authenticateUser() - password mismatch", { username: normalized });
      return null;
    }

    log("INFO", "authenticateUser() - SUCCESS", { username: normalized });
    return publicUserFromDB(user);
  } catch (error) {
    log("ERROR", "authenticateUser() FAILED", { 
      username,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function createUser(params: {
  username: string;
  password: string;
  role: Role;
  createdBy: string;
}): Promise<CreateUserResult> {
  log("INFO", "createUser() called", { username: params.username });
  
  try {
    // Initialize database if needed
    await initializeDatabase();

    // Validate username
    const usernameError = validateUsername(params.username);
    if (usernameError) {
      log("INFO", "createUser() - username validation failed", { 
        username: params.username,
        error: usernameError 
      });
      return { ok: false, error: usernameError, code: "invalid_username" };
    }

    // Validate password
    const passwordError = validatePassword(params.password);
    if (passwordError) {
      log("INFO", "createUser() - password validation failed", { error: passwordError });
      return { ok: false, error: passwordError, code: "invalid_password" };
    }

    // Validate role
    const role = sanitizeRole(params.role);
    if (role !== "Admin" && role !== "Staff") {
      log("INFO", "createUser() - invalid role", { role: params.role });
      return { ok: false, error: "Invalid role", code: "invalid_role" };
    }

    // Validate createdBy
    if (!params.createdBy || typeof params.createdBy !== "string") {
      log("INFO", "createUser() - invalid createdBy");
      return { ok: false, error: "Invalid createdBy", code: "invalid_username" };
    }

    const username = normalizeUsername(params.username);
    const createdBy = normalizeUsername(params.createdBy) || "admin";
    
    // Check if user already exists
    try {
      const existingUser = await getUserByUsername(username);
      if (existingUser) {
        log("INFO", "createUser() - username already exists", { username });
        return { ok: false, error: "Username already exists", code: "already_exists" };
      }
    } catch (error) {
      if (!isNotFoundError(error)) {
        log("ERROR", "createUser() - error checking existing user", { 
          username,
          error: error instanceof Error ? error.message : String(error)
        });
        return { ok: false, error: "Database error", code: "database_error" };
      }
      // User not found is expected, continue
    }

    const passwordHash = await hashPassword(params.password);
    
    log("INFO", "createUser() - inserting into database", { username });
    
    const newUser = await createUserInDB({
      username,
      passwordHash,
      role,
      createdBy,
    });
    
    log("INFO", "createUser() - SUCCESS", { username });
    return { ok: true, user: publicUserFromDB(newUser) };
  } catch (error) {
    log("ERROR", "createUser() FAILED", { 
      username: params.username,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Check for specific error types
    if (isDuplicateError(error)) {
      return { ok: false, error: "Username already exists", code: "already_exists" };
    }
    
    if (isValidationError(error)) {
      return { ok: false, error: error.message, code: "invalid_username" };
    }
    
    // Re-throw other errors so they're not swallowed
    throw error;
  }
}

export async function verifyCurrentPassword(
  username: string,
  password: string
): Promise<boolean> {
  log("INFO", "verifyCurrentPassword() called", { username });
  
  try {
    // Validate inputs
    const usernameError = validateUsername(username);
    if (usernameError) {
      log("INFO", "verifyCurrentPassword() - invalid username", { username, error: usernameError });
      return false;
    }
    
    const normalized = normalizeUsername(username);
    const user = await getUserByUsername(normalized);
    
    if (!user) {
      log("INFO", "verifyCurrentPassword() - user not found", { username: normalized });
      return false;
    }
    
    const result = await comparePassword(password, user.password_hash);
    log("INFO", "verifyCurrentPassword() - result", { username: normalized, valid: result });
    return result;
  } catch (error) {
    log("ERROR", "verifyCurrentPassword() FAILED", { 
      username,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function updateUserPassword(
  username: string,
  newPassword: string
): Promise<UpdatePasswordResult> {
  log("INFO", "updateUserPassword() called", { username });
  
  try {
    // Validate password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      log("INFO", "updateUserPassword() - validation failed", { error: passwordError });
      return { ok: false, error: passwordError, code: "invalid_password" };
    }

    // Validate username
    const usernameError = validateUsername(username);
    if (usernameError) {
      log("INFO", "updateUserPassword() - invalid username", { error: usernameError });
      return { ok: false, error: usernameError, code: "not_found" };
    }

    const normalized = normalizeUsername(username);
    const passwordHash = await hashPassword(newPassword);
    
    await updateUserInDB({
      username: normalized,
      passwordHash,
    });
    
    log("INFO", "updateUserPassword() - SUCCESS", { username: normalized });
    return { ok: true };
  } catch (error) {
    log("ERROR", "updateUserPassword() FAILED", { 
      username,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (isNotFoundError(error)) {
      return { ok: false, error: "User not found", code: "not_found" };
    }
    
    if (isValidationError(error)) {
      return { ok: false, error: error.message, code: "invalid_password" };
    }
    
    return { ok: false, error: "Database error", code: "database_error" };
  }
}

export async function deleteUser(params: {
  username: string;
  requestedBy: string;
}): Promise<DeleteUserResult> {
  log("INFO", "deleteUser() called", { 
    targetUsername: params.username,
    requestedBy: params.requestedBy 
  });
  
  try {
    // Validate target username
    const usernameError = validateUsername(params.username);
    if (usernameError) {
      log("INFO", "deleteUser() - target username validation failed", { error: usernameError });
      return { ok: false, error: usernameError, code: "invalid_username" };
    }

    // Validate requestedBy
    const requestedByError = validateUsername(params.requestedBy);
    if (requestedByError) {
      log("INFO", "deleteUser() - requestedBy validation failed", { error: requestedByError });
      return { ok: false, error: "Invalid requesting user", code: "invalid_username" };
    }

    const targetUsername = normalizeUsername(params.username);
    const requestedBy = normalizeUsername(params.requestedBy);
    
    // Check for self-delete
    if (targetUsername === requestedBy) {
      log("INFO", "deleteUser() - self-delete forbidden", { username: targetUsername });
      return { ok: false, error: "You cannot delete your own account", code: "self_delete_forbidden" };
    }

    // Get the user to check role
    let existing: UserDB;
    try {
      existing = await getUserByUsername(targetUsername);
      if (!existing) {
        log("INFO", "deleteUser() - user not found", { username: targetUsername });
        return { ok: false, error: "User not found", code: "not_found" };
      }
    } catch (error) {
      if (isNotFoundError(error)) {
        log("INFO", "deleteUser() - user not found", { username: targetUsername });
        return { ok: false, error: "User not found", code: "not_found" };
      }
      throw error;
    }

    // Check if trying to delete last admin
    if (existing.role === "Admin") {
      const adminCount = await countAdminUsers();
      if (adminCount <= 1) {
        log("INFO", "deleteUser() - last admin forbidden", { username: targetUsername });
        return { ok: false, error: "Cannot delete the last Admin account", code: "last_admin_forbidden" };
      }
    }

    await deleteUserFromDB(targetUsername);
    
    log("INFO", "deleteUser() - SUCCESS", { username: targetUsername });
    return { ok: true, user: publicUserFromDB(existing) };
  } catch (error) {
    log("ERROR", "deleteUser() FAILED", { 
      username: params.username,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (isNotFoundError(error)) {
      return { ok: false, error: "User not found", code: "not_found" };
    }
    
    if (isValidationError(error)) {
      return { ok: false, error: error.message, code: "invalid_username" };
    }
    
    return { ok: false, error: "Database error", code: "database_error" };
  }
}
