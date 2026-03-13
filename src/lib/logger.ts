/**
 * Structured JSON Logger
 * 
 * Provides machine-readable JSON logs with:
 * - requestId for tracing
 * - timestamp in ISO format
 * - userId when available
 * - stack traces for errors
 * - configurable log levels
 * 
 * Works in both Node.js and Edge Runtime environments.
 * 
 * @module lib/logger
 */

// Cross-platform UUID generation that works in both Node.js and Edge Runtime
function generateUUID(): string {
  // Use crypto.randomUUID if available (Node.js 14.17+, modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Log levels in order of severity
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  requestId: string;
  userId?: string | null;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  durationMs?: number;
}

interface LoggerOptions {
  requestId?: string;
  userId?: string | null;
  context?: string;
}

class Logger {
  private requestId: string;
  private userId: string | null;
  private context: string;

  constructor(options: LoggerOptions = {}) {
    this.requestId = options.requestId || generateUUID();
    this.userId = options.userId || null;
    this.context = options.context || "app";
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string, additionalData?: Record<string, unknown>): Logger {
    const childLogger = new Logger({
      requestId: this.requestId,
      userId: this.userId,
      context: `${this.context}:${context}`,
    });
    return childLogger;
  }

  /**
   * Set user ID for the current logger instance
   */
  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  /**
   * Get current request ID
   */
  getRequestId(): string {
    return this.requestId;
  }

  /**
   * Build structured log entry
   */
  private buildEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error | unknown,
    durationMs?: number
  ): LogEntry {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      userId: this.userId,
      message,
      context: this.context,
    };

    if (data && Object.keys(data).length > 0) {
      // Sanitize sensitive data
      entry.data = this.sanitizeData(data);
    }

    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        entry.error = {
          name: "UnknownError",
          message: String(error),
        };
      }
    }

    if (durationMs !== undefined) {
      entry.durationMs = durationMs;
    }

    return entry;
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "apiKey",
      "api_key",
      "authorization",
      "cookie",
      "session",
      "creditCard",
      "credit_card",
      "ssn",
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeData(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Output log entry to console
   */
  private output(entry: LogEntry): void {
    // In production, output pure JSON for log aggregation
    // In development, output formatted JSON for readability
    const isDev = process.env.NODE_ENV === "development";
    
    if (isDev) {
      // Color-coded console output for development
      const colors: Record<LogLevel, string> = {
        debug: "\x1b[36m", // Cyan
        info: "\x1b[32m", // Green
        warn: "\x1b[33m", // Yellow
        error: "\x1b[31m", // Red
        fatal: "\x1b[35m", // Magenta
      };
      const reset = "\x1b[0m";
      
      const color = colors[entry.level] || "";
      console.log(`${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} | ${entry.requestId} | ${entry.context} | ${entry.message}`);
      
      if (entry.data) {
        console.log(`  Data:`, JSON.stringify(entry.data, null, 2));
      }
      
      if (entry.error) {
        console.log(`  Error: ${entry.error.name}: ${entry.error.message}`);
        if (entry.error.stack && isDev) {
          console.log(`  Stack: ${entry.error.stack}`);
        }
      }
    } else {
      // Production: Pure JSON for log aggregation systems
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      this.output(this.buildEntry("debug", message, data));
    }
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, unknown>, durationMs?: number): void {
    if (this.shouldLog("info")) {
      this.output(this.buildEntry("info", message, data, undefined, durationMs));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, unknown>, error?: Error | unknown): void {
    if (this.shouldLog("warn")) {
      this.output(this.buildEntry("warn", message, data, error));
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      this.output(this.buildEntry("error", message, data, error));
    }
  }

  /**
   * Log fatal message (critical errors)
   */
  fatal(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    if (this.shouldLog("fatal")) {
      this.output(this.buildEntry("fatal", message, data, error));
    }
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error", "fatal"];
    const configuredLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
    const configuredIndex = levels.indexOf(configuredLevel);
    const currentIndex = levels.indexOf(level);
    
    return currentIndex >= configuredIndex;
  }
}

// Global logger instance for non-request contexts
export const globalLogger = new Logger({ context: "global" });

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(requestId?: string, userId?: string | null): Logger {
  return new Logger({
    requestId: requestId || generateUUID(),
    userId,
    context: "request",
  });
}

export { Logger };
export default Logger;
