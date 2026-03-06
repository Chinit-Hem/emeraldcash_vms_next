import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Connection configuration with pooling options
const connectionOptions = {
  // Connection timeout in milliseconds
  connectionTimeoutMillis: 10000,
  // Idle timeout in milliseconds
  idleTimeoutMillis: 30000,
  // Maximum number of connections in pool
  max: 10,
};

// Create a SQL client using the Neon serverless driver
// The Neon driver automatically handles connection pooling in serverless environments
const sql = neon(DATABASE_URL, {
  // Enable connection caching for better performance
  fetchOptions: {
    // Keep connections alive for reuse
    keepalive: true,
  },
});

// Export as both default and named export for compatibility
export { sql };
export default sql;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 100; // ms
const MAX_RETRY_DELAY = 2000; // ms

// Helper function to check if error is retryable
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return (
    message.includes("too many database connection attempts") ||
    message.includes("failed to acquire permit") ||
    message.includes("neon:retryable") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("econnrefused") ||
    message.includes("enotfound")
  );
}

// Helper function to delay with exponential backoff
function delay(attempt: number): Promise<void> {
  const backoff = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 100;
  return new Promise(resolve => setTimeout(resolve, backoff + jitter));
}

// Wrapper function for database queries with retry logic
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  operationName: string = "database query"
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Log retry attempt
      console.log(`[DB_RETRY] ${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES}): ${lastError.message}`);
      
      // Don't delay on last attempt
      if (attempt < MAX_RETRIES - 1) {
        await delay(attempt);
      }
    }
  }
  
  // All retries exhausted
  throw new Error(
    `${operationName} failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`
  );
}

// Test connection function with retry
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await queryWithRetry(
      async () => sql`SELECT version()`,
      "test connection"
    );
    return {
      success: true,
      message: `Connected to PostgreSQL: ${result[0].version}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown connection error",
    };
  }
}

// Helper function to check if database is accessible with retry
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await queryWithRetry(
      async () => sql`SELECT 1`,
      "health check"
    );
    return true;
  } catch {
    return false;
  }
}

// Connection pool stats (for monitoring)
let connectionStats = {
  totalQueries: 0,
  failedQueries: 0,
  retriedQueries: 0,
};

export function getConnectionStats() {
  return { ...connectionStats };
}

export function resetConnectionStats() {
  connectionStats = {
    totalQueries: 0,
    failedQueries: 0,
    retriedQueries: 0,
  };
}
