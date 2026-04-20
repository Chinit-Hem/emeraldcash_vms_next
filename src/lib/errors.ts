/**
 * Custom error classes for better error handling and categorization
 * across the application.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    this.name = this.constructor.name;
  }
}

// Database-related errors
export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed") {
    super(message, "DATABASE_ERROR", 500, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, "NOT_FOUND", 404, true);
  }
}

export class DuplicateError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} already exists`, "DUPLICATE_ERROR", 409, true);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed") {
    super(message, "VALIDATION_ERROR", 400, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, "FORBIDDEN", 403, true);
  }
}

// Helper function to check if error is a specific type
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isDuplicateError(error: unknown): error is DuplicateError {
  return error instanceof DuplicateError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
