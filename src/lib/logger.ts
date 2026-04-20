/**
 * Shared Logger Utility
 * 
 * Provides standardized logging across the application with:
 * - Structured log format with timestamps
 * - Log levels (INFO, DEBUG, ERROR, WARN)
 * - Request ID tracking for debugging
 * - Server-side only execution (safe for SSR)
 * 
 * @module logger
 */

export type LogLevel = "INFO" | "DEBUG" | "ERROR" | "WARN";

/**
 * Logger interface for type safety
 */
export interface Logger {
  info: (message: string, meta?: Record<string, unknown> | Error, _duration?: number) => void;
  debug: (message: string, meta?: Record<string, unknown> | Error, _duration?: number) => void;
  error: (message: string, errorOrMeta?: Error | Record<string, unknown>, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown> | Error, _duration?: number) => void;
  fatal: (message: string, error?: Error | Record<string, unknown>, meta?: Record<string, unknown>) => void;
  getRequestId: () => string;
  child: (_meta: Record<string, unknown>) => Logger;
}

/**
 * Structured logging function for server-side code
 * 
 * @param level - Log level (INFO, DEBUG, ERROR, WARN)
 * @param message - Log message
 * @param meta - Optional metadata object
 * @param requestId - Optional request ID for tracing
 */
export function log(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
  requestId?: string
): void {
  const timestamp = new Date().toISOString();
  const prefix = requestId ? `[${timestamp}] [${level}] [${requestId}]` : `[${timestamp}] [${level}]`;
  
  if (meta && Object.keys(meta).length > 0) {
    console.log(prefix, message, meta);
  } else {
    console.log(prefix, message);
  }
}

/**
 * Create a logger instance bound to a specific request ID
 * Useful for tracing requests through the system
 * 
 * @param requestId - The request ID to bind to (optional, will generate if not provided)
 * @returns Object with bound log methods
 */
export function createRequestLogger(requestId?: string): Logger {
  const id = requestId || generateRequestId();
  return {
    info: (message: string, meta?: Record<string, unknown> | Error, _duration?: number) => 
      log("INFO", message, meta as Record<string, unknown>, id),
    debug: (message: string, meta?: Record<string, unknown> | Error, _duration?: number) => 
      log("DEBUG", message, meta as Record<string, unknown>, id),
    error: (message: string, errorOrMeta?: Error | Record<string, unknown>, meta?: Record<string, unknown>) => {
      const combinedMeta = {
        ...(errorOrMeta instanceof Error ? { error: errorOrMeta.message, stack: errorOrMeta.stack } : errorOrMeta),
        ...meta,
      };
      log("ERROR", message, combinedMeta, id);
    },
    warn: (message: string, meta?: Record<string, unknown> | Error, _duration?: number) => 
      log("WARN", message, meta as Record<string, unknown>, id),
    fatal: (message: string, error?: Error | Record<string, unknown>, meta?: Record<string, unknown>) => {
      const combinedMeta = {
        ...(error instanceof Error ? { error: error.message, stack: error.stack } : error),
        ...meta,
      };
      log("ERROR", `[FATAL] ${message}`, combinedMeta, id);
    },
    getRequestId: () => id,
    child: (_childMeta: Record<string, unknown>) => createRequestLogger(id),
  };
}

/**
 * Generate a unique request ID
 * @returns Unique request ID string
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Convenience exports for direct usage
export const logger: Logger = {
  info: (message: string, meta?: Record<string, unknown> | Error, _duration?: number) => log("INFO", message, meta as Record<string, unknown>),
  debug: (message: string, meta?: Record<string, unknown> | Error, _duration?: number) => log("DEBUG", message, meta as Record<string, unknown>),
  error: (message: string, errorOrMeta?: Error | Record<string, unknown>, meta?: Record<string, unknown>) => {
    const combinedMeta = {
      ...(errorOrMeta instanceof Error ? { error: errorOrMeta.message, stack: errorOrMeta.stack } : errorOrMeta),
      ...meta,
    };
    log("ERROR", message, combinedMeta);
  },
  warn: (message: string, meta?: Record<string, unknown> | Error, _duration?: number) => log("WARN", message, meta as Record<string, unknown>),
  fatal: (message: string, error?: Error | Record<string, unknown>, meta?: Record<string, unknown>) => {
    const combinedMeta = {
      ...(error instanceof Error ? { error: error.message, stack: error.stack } : error),
      ...meta,
    };
    log("ERROR", `[FATAL] ${message}`, combinedMeta);
  },
  getRequestId: () => "global",
  child: (_meta: Record<string, unknown>) => logger,
};

// Global logger for backward compatibility
export const globalLogger = logger;
