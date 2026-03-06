// Database operations for users table using Neon PostgreSQL
import { sql, queryWithRetry } from "./db";
import type { Role } from "./types";
import {
  DatabaseError,
  NotFoundError,
  DuplicateError,
  ValidationError,
} from "./errors";

export interface UserDB {
  username: string;
  role: Role;
  password_hash: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Validation constants
const USERNAME_REGEX = /^[a-z0-9._-]{3,32}$/;
const MAX_PASSWORD_HASH_LENGTH = 255;
const VALID_ROLES: Role[] = ["Admin", "Staff"];

// Logger utility for structured logging
function log(level: "INFO" | "ERROR" | "DEBUG", message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${timestamp}] [${level}] [USER_DB] ${message}${metaStr}`);
}

// Input validation functions
function validateUsername(username: string): void {
  if (!username || typeof username !== "string") {
    throw new ValidationError("Username is required and must be a string");
  }
  
  const normalized = username.trim().toLowerCase();
  
  if (!USERNAME_REGEX.test(normalized)) {
    throw new ValidationError(
      "Username must be 3-32 characters, lowercase letters, numbers, dot, dash, underscore only"
    );
  }
}

function validateRole(role: string): void {
  if (!role || typeof role !== "string") {
    throw new ValidationError("Role is required and must be a string");
  }
  
  if (!VALID_ROLES.includes(role as Role)) {
    throw new ValidationError(`Role must be one of: ${VALID_ROLES.join(", ")}`);
  }
}

function validatePasswordHash(passwordHash: string): void {
  if (!passwordHash || typeof passwordHash !== "string") {
    throw new ValidationError("Password hash is required and must be a string");
  }
  
  if (passwordHash.length > MAX_PASSWORD_HASH_LENGTH) {
    throw new ValidationError(`Password hash must not exceed ${MAX_PASSWORD_HASH_LENGTH} characters`);
  }
}

function validateCreatedBy(createdBy: string): void {
  if (!createdBy || typeof createdBy !== "string") {
    throw new ValidationError("Created by is required and must be a string");
  }
  
  if (createdBy.trim().length === 0) {
    throw new ValidationError("Created by cannot be empty");
  }
}

// Check if a user exists before performing operations
async function checkUserExists(username: string): Promise<UserDB> {
  log("DEBUG", "Checking if user exists", { username });
  
  const result = await queryWithRetry(
    async () => sql`SELECT * FROM users WHERE username = ${username}`,
    "checkUserExists"
  );
  
  if (result.length === 0) {
    log("DEBUG", "User not found", { username });
    throw new NotFoundError("User");
  }
  
  return result[0] as UserDB;
}

// Ensure users table exists
export async function ensureUsersTable(): Promise<void> {
  log("INFO", "Checking if users table exists");
  
  try {
    await queryWithRetry(
      async () => sql`
        CREATE TABLE IF NOT EXISTS users (
          username VARCHAR(32) PRIMARY KEY,
          role VARCHAR(10) NOT NULL CHECK (role IN ('Admin', 'Staff')),
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(32) NOT NULL
        )
      `,
      "ensureUsersTable"
    );
    log("INFO", "Users table verified/created successfully");
  } catch (error) {
    log("ERROR", "Failed to create users table", { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new DatabaseError("Failed to create users table");
  }
}

// Create a new user in the database
export async function createUserInDB(params: {
  username: string;
  passwordHash: string;
  role: Role;
  createdBy: string;
}): Promise<UserDB> {
  log("INFO", "Attempting to INSERT user", { username: params.username });
  
  // Validate all inputs
  try {
    validateUsername(params.username);
    validateRole(params.role);
    validatePasswordHash(params.passwordHash);
    validateCreatedBy(params.createdBy);
  } catch (error) {
    log("ERROR", "Input validation failed", { 
      username: params.username,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
  
  const normalizedUsername = params.username.trim().toLowerCase();
  
  try {
    // Check if user already exists
    const existingResult = await queryWithRetry(
      async () => sql`SELECT username FROM users WHERE username = ${normalizedUsername}`,
      "createUserInDB-checkExists"
    );
    
    if (existingResult.length > 0) {
      log("ERROR", "User already exists", { username: normalizedUsername });
      throw new DuplicateError("User");
    }
    
    const result = await queryWithRetry(
      async () => sql`
        INSERT INTO users (username, role, password_hash, created_by)
        VALUES (
          ${normalizedUsername},
          ${params.role},
          ${params.passwordHash},
          ${params.createdBy.trim()}
        )
        RETURNING *
      `,
      "createUserInDB-insert"
    );
    
    if (!result || result.length === 0) {
      throw new DatabaseError("Failed to create user - no result returned");
    }
    
    log("INFO", "User INSERTED successfully", { 
      username: result[0]?.username,
      role: result[0]?.role
    });
    log("DEBUG", "Full result", { result: result[0] });
    
    return result[0] as UserDB;
  } catch (error) {
    // Re-throw known errors
    if (error instanceof ValidationError || 
        error instanceof DuplicateError || 
        error instanceof DatabaseError) {
      throw error;
    }
    
    // Handle PostgreSQL specific errors
    if (error instanceof Error) {
      if (error.message.includes("duplicate key") || 
          error.message.includes("unique constraint")) {
        log("ERROR", "Duplicate key error", { username: normalizedUsername });
        throw new DuplicateError("User");
      }
      
      log("ERROR", "Database error during user creation", { 
        username: normalizedUsername,
        error: error.message
      });
    }
    
    throw new DatabaseError("Failed to create user in database");
  }
}

// Get user by username
export async function getUserByUsername(username: string): Promise<UserDB | null> {
  log("DEBUG", "Querying user by username", { username });
  
  // Validate input
  if (!username || typeof username !== "string") {
    log("ERROR", "Invalid username parameter", { username });
    throw new ValidationError("Username must be a non-empty string");
  }
  
  const normalizedUsername = username.trim().toLowerCase();
  
  try {
    const result = await queryWithRetry(
      async () => sql`SELECT * FROM users WHERE username = ${normalizedUsername}`,
      "getUserByUsername"
    );
    
    if (result.length === 0) {
      log("DEBUG", "User not found", { username: normalizedUsername });
      return null;
    }
    
    log("DEBUG", "User found", { username: normalizedUsername });
    return result[0] as UserDB;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    
    log("ERROR", "Error querying user", { 
      username: normalizedUsername,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to retrieve user from database");
  }
}

// List all users
export async function listUsersFromDB(): Promise<UserDB[]> {
  log("INFO", "Listing all users from database");
  
  try {
    const result = await queryWithRetry(
      async () => sql`SELECT * FROM users ORDER BY username ASC`,
      "listUsersFromDB"
    );
    
    log("INFO", "Found users in database", { count: result.length });
    return result as UserDB[];
  } catch (error) {
    log("ERROR", "Error listing users", { 
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to list users from database");
  }
}

// Update user password
export async function updateUserInDB(params: {
  username: string;
  passwordHash: string;
}): Promise<UserDB> {
  log("INFO", "Updating user password", { username: params.username });
  
  // Validate inputs
  try {
    validateUsername(params.username);
    validatePasswordHash(params.passwordHash);
  } catch (error) {
    log("ERROR", "Input validation failed for update", { 
      username: params.username,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
  
  const normalizedUsername = params.username.trim().toLowerCase();
  
  try {
    // Check if user exists before updating
    await checkUserExists(normalizedUsername);
    
    const result = await queryWithRetry(
      async () => sql`
        UPDATE users 
        SET 
          password_hash = ${params.passwordHash},
          updated_at = CURRENT_TIMESTAMP
        WHERE username = ${normalizedUsername}
        RETURNING *
      `,
      "updateUserInDB"
    );
    
    if (!result || result.length === 0) {
      log("ERROR", "Update returned no rows", { username: normalizedUsername });
      throw new DatabaseError("Failed to update user - no rows affected");
    }
    
    log("INFO", "User updated successfully", { username: normalizedUsername });
    return result[0] as UserDB;
  } catch (error) {
    // Re-throw known errors
    if (error instanceof NotFoundError || 
        error instanceof ValidationError || 
        error instanceof DatabaseError) {
      throw error;
    }
    
    log("ERROR", "Error updating user", { 
      username: normalizedUsername,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to update user in database");
  }
}

// Delete user from database
export async function deleteUserFromDB(username: string): Promise<boolean> {
  log("INFO", "Deleting user", { username });
  
  // Validate input
  try {
    validateUsername(username);
  } catch (error) {
    log("ERROR", "Input validation failed for delete", { 
      username,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
  
  const normalizedUsername = username.trim().toLowerCase();
  
  try {
    // Check if user exists before deleting
    await checkUserExists(normalizedUsername);
    
    const result = await queryWithRetry(
      async () => sql`
        DELETE FROM users WHERE username = ${normalizedUsername}
        RETURNING username
      `,
      "deleteUserFromDB"
    );
    
    const deleted = result.length > 0;
    
    if (!deleted) {
      log("ERROR", "Delete returned no rows", { username: normalizedUsername });
      throw new DatabaseError("Failed to delete user - no rows affected");
    }
    
    log("INFO", "User deleted successfully", { username: normalizedUsername });
    return true;
  } catch (error) {
    // Re-throw known errors
    if (error instanceof NotFoundError || 
        error instanceof ValidationError || 
        error instanceof DatabaseError) {
      throw error;
    }
    
    log("ERROR", "Error deleting user", { 
      username: normalizedUsername,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to delete user from database");
  }
}

// Count admin users
export async function countAdminUsers(): Promise<number> {
  log("DEBUG", "Counting admin users");
  
  try {
    const result = await queryWithRetry(
      async () => sql`SELECT COUNT(*) as count FROM users WHERE role = 'Admin'`,
      "countAdminUsers"
    );
    
    if (!result || result.length === 0 || !result[0].count) {
      log("ERROR", "Count query returned unexpected result");
      throw new DatabaseError("Failed to count admin users");
    }
    
    const count = parseInt(result[0].count, 10);
    
    if (isNaN(count)) {
      log("ERROR", "Count result is not a valid number", { raw: result[0].count });
      throw new DatabaseError("Invalid count result from database");
    }
    
    log("DEBUG", "Admin count", { count });
    return count;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    log("ERROR", "Error counting admin users", { 
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to count admin users");
  }
}
