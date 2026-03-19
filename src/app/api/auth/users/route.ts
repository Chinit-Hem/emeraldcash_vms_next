import { requireSession } from "@/lib/auth";
import { createUser, deleteUser, listUsers } from "@/lib/userStore";
import type { Role } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import {
  isValidationError,
  isDuplicateError,
  isNotFoundError,
} from "@/lib/errors";

// Validation constants
const USERNAME_REGEX = /^[a-z0-9._-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 72;
const VALID_ROLES: Role[] = ["Admin", "Staff"];

// Logger utility for structured logging
function log(level: "INFO" | "ERROR" | "DEBUG" | "WARN", message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${timestamp}] [${level}] [API_USERS] ${message}${metaStr}`);
}

// Security headers for all responses
const securityHeaders = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// Cache control headers
const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

// Validation result types
type ValidationSuccess<T> = { valid: true; value: T };
type ValidationError = { valid: false; error: string };
type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

// Input validation functions
function validateUsername(username: unknown): ValidationResult<string> {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required and must be a string" };
  }
  
  const trimmed = username.trim();
  
  if (!trimmed) {
    return { valid: false, error: "Username cannot be empty" };
  }
  
  if (!USERNAME_REGEX.test(trimmed.toLowerCase())) {
    return { 
      valid: false, 
      error: "Username must be 3-32 characters, lowercase letters, numbers, dot, dash, underscore only" 
    };
  }
  
  return { valid: true, value: trimmed };
}

function validatePassword(password: unknown): ValidationResult<string> {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required and must be a string" };
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be ${MAX_PASSWORD_LENGTH} characters or less` };
  }
  
  return { valid: true, value: password };
}

function validateRole(role: unknown): ValidationResult<Role> {
  if (!role || typeof role !== "string") {
    return { valid: false, error: "Role is required and must be a string" };
  }
  
  const normalizedRole = role === "Admin" ? "Admin" : "Staff";
  
  if (!VALID_ROLES.includes(normalizedRole)) {
    return { valid: false, error: `Role must be one of: ${VALID_ROLES.join(", ")}` };
  }
  
  return { valid: true, value: normalizedRole };
}

// Helper to create error response
function createErrorResponse(error: string, code: string, status: number) {
  return NextResponse.json(
    { ok: false, error, code },
    { 
      status,
      headers: { ...securityHeaders, ...noCacheHeaders }
    }
  );
}

// Helper to create success response
function createSuccessResponse(data: Record<string, unknown>, status: number = 200) {
  return NextResponse.json(
    { ok: true, ...data },
    { 
      status,
      headers: { ...securityHeaders, ...noCacheHeaders }
    }
  );
}

// Helper to generate request ID with fallback for HTTP environments
function generateRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback when crypto.randomUUID is not available (HTTP instead of HTTPS)
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  log("INFO", "GET /api/auth/users - Request started", { requestId });
  
  try {
    // Authenticate session
    const session = requireSession(req);
    if (!session) {
      log("WARN", "GET /api/auth/users - Unauthorized access attempt", { requestId });
      return createErrorResponse("Invalid or expired session", "unauthorized", 401);
    }

    // Authorize admin access
    if (session.role !== "Admin") {
      log("WARN", "GET /api/auth/users - Forbidden access attempt", { 
        requestId, 
        username: session.username,
        role: session.role 
      });
      return createErrorResponse("Forbidden. Admin access required.", "forbidden", 403);
    }

    log("DEBUG", "GET /api/auth/users - Fetching users", { requestId, admin: session.username });
    
    // Fetch users
    const users = await listUsers();
    
    log("INFO", "GET /api/auth/users - Success", { 
      requestId, 
      userCount: users.length,
      admin: session.username 
    });
    
    return createSuccessResponse({ users });
  } catch (error) {
    log("ERROR", "GET /api/auth/users - Unexpected error", { 
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return createErrorResponse(
      "Failed to retrieve users from database", 
      "internal_error", 
      500
    );
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  log("INFO", "POST /api/auth/users - Request started", { requestId });
  
  try {
    // Authenticate session
    const session = requireSession(req);
    if (!session) {
      log("WARN", "POST /api/auth/users - Unauthorized access attempt", { requestId });
      return createErrorResponse("Invalid or expired session", "unauthorized", 401);
    }

    // Authorize admin access
    if (session.role !== "Admin") {
      log("WARN", "POST /api/auth/users - Forbidden access attempt", { 
        requestId, 
        username: session.username,
        role: session.role 
      });
      return createErrorResponse("Forbidden. Admin access required.", "forbidden", 403);
    }

    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (parseError) {
      log("WARN", "POST /api/auth/users - Invalid JSON body", { 
        requestId,
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      return createErrorResponse("Invalid JSON in request body", "invalid_json", 400);
    }

    log("DEBUG", "POST /api/auth/users - Request body received", { 
      requestId,
      hasUsername: !!body.username,
      hasPassword: !!body.password,
      hasRole: !!body.role
    });

    // Validate all inputs
    const usernameValidation = validateUsername(body.username);
    if (usernameValidation.valid === false) {
      log("WARN", "POST /api/auth/users - Username validation failed", { 
        requestId,
        error: usernameValidation.error 
      });
      return createErrorResponse(usernameValidation.error, "invalid_username", 400);
    }

    const passwordValidation = validatePassword(body.password);
    if (passwordValidation.valid === false) {
      log("WARN", "POST /api/auth/users - Password validation failed", { 
        requestId,
        error: passwordValidation.error 
      });
      return createErrorResponse(passwordValidation.error, "invalid_password", 400);
    }

    const roleValidation = validateRole(body.role);
    if (roleValidation.valid === false) {
      log("WARN", "POST /api/auth/users - Role validation failed", { 
        requestId,
        error: roleValidation.error 
      });
      return createErrorResponse(roleValidation.error, "invalid_role", 400);
    }

    log("DEBUG", "POST /api/auth/users - All inputs validated, creating user", { 
      requestId,
      username: usernameValidation.value,
      role: roleValidation.value,
      createdBy: session.username
    });

    // Create user
    const result = await createUser({
      username: usernameValidation.value,
      password: passwordValidation.value,
      role: roleValidation.value,
      createdBy: session.username,
    });

    if (result.ok === false) {
      const code = result.code;
      const errorMessage = result.error;
      
      log("WARN", "POST /api/auth/users - User creation failed", { 
        requestId,
        code,
        error: errorMessage,
        username: usernameValidation.value
      });
      
      // Map error codes to appropriate HTTP status codes
      const statusMap: Record<string, number> = {
        "already_exists": 409,
        "invalid_username": 400,
        "invalid_password": 400,
        "invalid_role": 400,
        "database_error": 500,
      };
      
      const status = statusMap[code] || 400;
      return createErrorResponse(errorMessage, code, status);
    }

    log("INFO", "POST /api/auth/users - User created successfully", { 
      requestId,
      username: result.user.username,
      role: result.user.role,
      createdBy: session.username
    });

    return createSuccessResponse({ user: result.user }, 201);
  } catch (error) {
    log("ERROR", "POST /api/auth/users - Unexpected error", { 
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Check for specific error types
    if (isDuplicateError(error)) {
      return createErrorResponse("Username already exists", "already_exists", 409);
    }
    
    if (isValidationError(error)) {
      return createErrorResponse(error.message, "validation_error", 400);
    }
    
    return createErrorResponse(
      "Failed to create user", 
      "internal_error", 
      500
    );
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = generateRequestId();
  log("INFO", "DELETE /api/auth/users - Request started", { requestId });
  
  try {
    // Authenticate session
    const session = requireSession(req);
    if (!session) {
      log("WARN", "DELETE /api/auth/users - Unauthorized access attempt", { requestId });
      return createErrorResponse("Invalid or expired session", "unauthorized", 401);
    }

    // Authorize admin access
    if (session.role !== "Admin") {
      log("WARN", "DELETE /api/auth/users - Forbidden access attempt", { 
        requestId, 
        username: session.username,
        role: session.role 
      });
      return createErrorResponse("Forbidden. Admin access required.", "forbidden", 403);
    }

    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (parseError) {
      log("WARN", "DELETE /api/auth/users - Invalid JSON body", { 
        requestId,
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      return createErrorResponse("Invalid JSON in request body", "invalid_json", 400);
    }

    log("DEBUG", "DELETE /api/auth/users - Request body received", { 
      requestId,
      hasUsername: !!body.username
    });

    // Validate username
    const usernameValidation = validateUsername(body.username);
    if (usernameValidation.valid === false) {
      log("WARN", "DELETE /api/auth/users - Username validation failed", { 
        requestId,
        error: usernameValidation.error 
      });
      return createErrorResponse(usernameValidation.error, "invalid_username", 400);
    }

    log("DEBUG", "DELETE /api/auth/users - Deleting user", { 
      requestId,
      targetUsername: usernameValidation.value,
      requestedBy: session.username
    });

    // Delete user
    const result = await deleteUser({
      username: usernameValidation.value,
      requestedBy: session.username,
    });

    if (result.ok === false) {
      const code = result.code;
      const errorMessage = result.error;
      
      log("WARN", "DELETE /api/auth/users - User deletion failed", { 
        requestId,
        code,
        error: errorMessage,
        targetUsername: usernameValidation.value,
        requestedBy: session.username
      });
      
      // Map error codes to appropriate HTTP status codes
      const statusMap: Record<string, number> = {
        "not_found": 404,
        "self_delete_forbidden": 403,
        "last_admin_forbidden": 409,
        "invalid_username": 400,
        "database_error": 500,
      };
      
      const status = statusMap[code] || 400;
      return createErrorResponse(errorMessage, code, status);
    }

    log("INFO", "DELETE /api/auth/users - User deleted successfully", { 
      requestId,
      deletedUsername: result.user.username,
      deletedRole: result.user.role,
      requestedBy: session.username
    });

    return createSuccessResponse({ user: result.user });
  } catch (error) {
    log("ERROR", "DELETE /api/auth/users - Unexpected error", { 
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Check for specific error types
    if (isNotFoundError(error)) {
      return createErrorResponse("User not found", "not_found", 404);
    }
    
    if (isValidationError(error)) {
      return createErrorResponse(error.message, "validation_error", 400);
    }
    
    return createErrorResponse(
      "Failed to delete user", 
      "internal_error", 
      500
    );
  }
}
