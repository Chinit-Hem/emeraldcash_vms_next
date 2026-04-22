/** Database Singleton - Neon PostgreSQL Connection */
import { neon } from '@neondatabase/serverless';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { log } from '../logger';

interface ConnectionConfig {
  url: string;
}

let dbManager: any | null = null;

export function initConnection(config: ConnectionConfig): any {
  if (dbManager) {
    log('DEBUG', 'DB singleton already initialized, reusing connection');
    return dbManager;
  }

  try {
    log('INFO', 'Initializing Neon DB singleton connection', { url: config.url.substring(0, 30) + '...' });
    dbManager = neon(config.url);
    log('INFO', 'Neon DB singleton initialized successfully');
    return dbManager;
  } catch (error) {
    log('ERROR', 'Failed to initialize Neon DB singleton', { error: error instanceof Error ? error.message : 'Unknown' });
    throw error;
  }
}

export function getDbManager(): any {
  if (!dbManager) {
    throw new Error('Database not initialized. Call initConnection first.');
  }
  return dbManager;
}

export function testConnection(): Promise<boolean> {
  return queryWithRetry(async () => {
    await sql`SELECT 1`;
    return true;
  }, 'testConnection');
}

export function isDatabaseHealthy(): Promise<boolean> {
  return queryWithRetry(async () => {
    const result = await sql`SELECT 1 as healthy`;
    return result[0]?.healthy === 1;
  }, 'isDatabaseHealthy');
}

export async function getConnectionStats(): Promise<unknown> {
  try {
    const result = await sql`
      SELECT 
        pg_stat_database.datname,
        pg_stat_database.numbackends,
        pg_stat_database.xact_commit,
        pg_stat_database.xact_rollback
      FROM pg_stat_database 
      WHERE pg_stat_database.datname = current_database()
    `;
    return result[0];
  } catch (error) {
    log('WARN', 'Failed to get connection stats', { error });
    return null;
  }
}

export function resetConnection(): void {
  dbManager = null;
  log('INFO', 'DB singleton connection reset');
}

export const sql = getDbManager();

export async function queryWithRetry<T = unknown>(
  queryFn: () => Promise<T>,
  operation: string,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      log('WARN', `DB query retry ${attempt}/${maxRetries}`, { operation, error: error instanceof Error ? error.message : 'Unknown' });
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
  throw new Error('Unreachable');
}

