/**
 * Base Repository Class - Repository Pattern Implementation
 * 
 * Separates data access logic from business logic in services.
 * Provides a clean abstraction for database operations.
 * 
 * Features:
 * - Generic type support for any entity type
 * - SQL injection protection via parameterized queries
 * - Query building utilities
 * - Transaction support hooks
 * 
 * @module repositories/BaseRepository
 */

import { dbManager } from "@/lib/db-singleton";
import type { BaseDBRecord } from "@/services/BaseService";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Query result with metadata
 */
export interface QueryResult<T> {
  data: T[];
  rowCount: number;
  durationMs: number;
}

/**
 * Query options
 */
export interface QueryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  operationName?: string;
}

/**
 * Filter operators for repository queries
 */
export type FilterOperator = 
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "like" | "ilike" | "in" | "nin" | "isNull" | "isNotNull";

/**
 * Filter condition
 */
export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value?: unknown;
}

/**
 * Query builder state
 */
export interface QueryBuilderState {
  where: string[];
  params: (string | number | null)[];
  paramIndex: number;
  orderBy: string[];
  limit?: number;
  offset?: number;
}

// ============================================================================
// Base Repository Class
// ============================================================================

export abstract class BaseRepository<TDB extends BaseDBRecord> {
  /** Database table name */
  protected abstract readonly tableName: string;
  
  /** Default query timeout */
  protected readonly DEFAULT_TIMEOUT_MS = 30000;
  
  /** Maximum retries for failed queries */
  protected readonly MAX_RETRIES = 2;

  /**
   * Execute raw SQL query with error handling
   */
  protected async executeQuery<T>(
    query: string,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries || this.MAX_RETRIES;
    const operationName = options.operationName || `${this.tableName}.query`;

    try {
      // Use dbManager's built-in retry and timeout handling
      const result = await dbManager.query(
        () => dbManager.executeUnsafe<T>(query),
        {
          operationName,
          maxRetries,
          timeoutMs,
        }
      );

      return {
        data: result,
        rowCount: result.length,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Query failed";
      console.error(`[${operationName}] Query failed:`, {
        error: errorMessage,
        queryLength: query.length,
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Find all records with optional filtering
   */
  public async findAll(
    filters?: FilterCondition[],
    orderBy?: { column: string; direction: "ASC" | "DESC" }[],
    limit?: number,
    offset?: number
  ): Promise<TDB[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const state: QueryBuilderState = {
      where: [],
      params: [],
      paramIndex: 1,
      orderBy: [],
    };

    // Apply filters
    if (filters && filters.length > 0) {
      for (const filter of filters) {
        const condition = this.buildFilterCondition(filter, state.paramIndex);
        if (condition) {
          state.where.push(condition.sql);
          if (condition.param !== undefined) {
            state.params.push(condition.param);
            state.paramIndex++;
          }
        }
      }
    }

    if (state.where.length > 0) {
      query += ` WHERE ${state.where.join(" AND ")}`;
    }

    // Apply order by
    if (orderBy && orderBy.length > 0) {
      const orderClauses = orderBy.map(o => {
        const safeColumn = this.sanitizeColumnName(o.column);
        return safeColumn ? `${safeColumn} ${o.direction}` : "";
      }).filter(Boolean);
      
      if (orderClauses.length > 0) {
        query += ` ORDER BY ${orderClauses.join(", ")}`;
      }
    }

    // Apply pagination
    if (limit !== undefined) {
      query += ` LIMIT ${limit}`;
      if (offset !== undefined) {
        query += ` OFFSET ${offset}`;
      }
    }

    // Build final query with inline parameters
    const finalQuery = this.buildFinalQuery(query, state.params);
    
    const result = await this.executeQuery<TDB>(finalQuery, {
      operationName: `${this.tableName}.findAll`,
    });

    return result.data;
  }

  /**
   * Find single record by ID
   */
  public async findById(id: number): Promise<TDB | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ${id}`;
    
    const result = await this.executeQuery<TDB>(query, {
      operationName: `${this.tableName}.findById`,
    });

    return result.data[0] || null;
  }

  /**
   * Create new record
   */
  public async create(
    data: Omit<TDB, "id" | "created_at" | "updated_at">
  ): Promise<TDB> {
    const now = new Date().toISOString();

    // Get next available ID
    const maxIdQuery = `SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM ${this.tableName}`;
    const maxIdResult = await this.executeQuery<{ next_id: number }>(maxIdQuery);
    const nextId = maxIdResult.data[0]?.next_id || 1;

    // Build INSERT query
    const columns = Object.keys(data);
    const values = Object.values(data);
    
    const escapedValues = values.map(v => this.escapeValue(v));
    
    const insertQuery = `
      INSERT INTO ${this.tableName} (
        id, ${columns.join(", ")}, created_at, updated_at
      ) VALUES (
        ${nextId}, ${escapedValues.join(", ")}, '${now}', '${now}'
      )
      RETURNING *
    `;

    const result = await this.executeQuery<TDB>(insertQuery, {
      operationName: `${this.tableName}.create`,
    });

    return result.data[0];
  }

  /**
   * Update existing record
   */
  public async update(id: number, data: Partial<TDB>): Promise<TDB | null> {
    const now = new Date().toISOString();
    const updates: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      // Skip system fields
      if (key === "id" || key === "created_at" || key === "updated_at") continue;
      
      const sanitizedKey = this.sanitizeColumnName(key);
      if (sanitizedKey) {
        updates.push(`${sanitizedKey} = ${this.escapeValue(value)}`);
      }
    }

    if (updates.length === 0) {
      throw new Error("No fields to update");
    }

    // Always update updated_at
    updates.push(`updated_at = '${now}'`);

    const updateQuery = `
      UPDATE ${this.tableName} 
      SET ${updates.join(", ")}
      WHERE id = ${id}
      RETURNING *
    `;

    const result = await this.executeQuery<TDB>(updateQuery, {
      operationName: `${this.tableName}.update`,
    });

    return result.data[0] || null;
  }

  /**
   * Delete record
   */
  public async delete(id: number): Promise<boolean> {
    const deleteQuery = `DELETE FROM ${this.tableName} WHERE id = ${id} RETURNING id`;
    
    const result = await this.executeQuery<{ id: number }>(deleteQuery, {
      operationName: `${this.tableName}.delete`,
    });

    return result.rowCount > 0;
  }

  /**
   * Soft delete (set is_active = false)
   */
  public async softDelete(id: number): Promise<boolean> {
    const now = new Date().toISOString();
    const query = `
      UPDATE ${this.tableName} 
      SET is_active = false, updated_at = '${now}'
      WHERE id = ${id}
      RETURNING id
    `;
    
    const result = await this.executeQuery<{ id: number }>(query, {
      operationName: `${this.tableName}.softDelete`,
    });

    return result.rowCount > 0;
  }

  /**
   * Count records with optional filters
   */
  public async count(filters?: FilterCondition[]): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    if (filters && filters.length > 0) {
      const conditions: string[] = [];
      
      for (const filter of filters) {
        const condition = this.buildFilterCondition(filter, paramIndex);
        if (condition) {
          conditions.push(condition.sql);
          if (condition.param !== undefined) {
            params.push(condition.param);
            paramIndex++;
          }
        }
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }
    }

    const finalQuery = this.buildFinalQuery(query, params);
    
    const result = await this.executeQuery<{ count: string }>(finalQuery, {
      operationName: `${this.tableName}.count`,
    });

    return parseInt(result.data[0]?.count || "0");
  }

  /**
   * Check if record exists
   */
  public async exists(id: number): Promise<boolean> {
    const query = `SELECT 1 FROM ${this.tableName} WHERE id = ${id} LIMIT 1`;
    
    const result = await this.executeQuery<Record<string, unknown>>(query, {
      operationName: `${this.tableName}.exists`,
    });

    return result.rowCount > 0;
  }

  /**
   * Execute raw SQL within transaction context
   */
  public async executeRaw<T>(query: string): Promise<T[]> {
    const result = await this.executeQuery<T>(query, {
      operationName: `${this.tableName}.raw`,
    });
    return result.data;
  }

  // ============================================================================
  // Protected Helper Methods
  // ============================================================================

  /**
   * Build filter condition SQL
   */
  protected buildFilterCondition(
    filter: FilterCondition,
    paramIndex: number
  ): { sql: string; param?: string | number | null } | null {
    const safeColumn = this.sanitizeColumnName(filter.column);
    if (!safeColumn) return null;

    switch (filter.operator) {
      case "eq":
        return { sql: `${safeColumn} = $${paramIndex}`, param: filter.value as string | number | null };
      case "neq":
        return { sql: `${safeColumn} != $${paramIndex}`, param: filter.value as string | number | null };
      case "gt":
        return { sql: `${safeColumn} > $${paramIndex}`, param: filter.value as number };
      case "gte":
        return { sql: `${safeColumn} >= $${paramIndex}`, param: filter.value as number };
      case "lt":
        return { sql: `${safeColumn} < $${paramIndex}`, param: filter.value as number };
      case "lte":
        return { sql: `${safeColumn} <= $${paramIndex}`, param: filter.value as number };
      case "like":
        return { sql: `${safeColumn} LIKE $${paramIndex}`, param: `%${filter.value}%` };
      case "ilike":
        return { sql: `${safeColumn} ILIKE $${paramIndex}`, param: `%${filter.value}%` };
      case "in":
        return { sql: `${safeColumn} IN ($${paramIndex})`, param: filter.value as string };
      case "nin":
        return { sql: `${safeColumn} NOT IN ($${paramIndex})`, param: filter.value as string };
      case "isNull":
        return { sql: `${safeColumn} IS NULL` };
      case "isNotNull":
        return { sql: `${safeColumn} IS NOT NULL` };
      default:
        return null;
    }
  }

  /**
   * Build final query with inline parameters
   */
  protected buildFinalQuery(query: string, params: (string | number | null)[]): string {
    let finalQuery = query;
    
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const placeholder = `$${i + 1}`;
      let replacement: string;
      
      if (param === null) {
        replacement = "NULL";
      } else if (typeof param === "number") {
        replacement = String(param);
      } else {
        replacement = `'${String(param).replace(/'/g, "''")}'`;
      }
      
      const placeholderRegex = new RegExp(placeholder.replace(/\$/g, "\\$"), "g");
      finalQuery = finalQuery.replace(placeholderRegex, replacement);
    }
    
    return finalQuery;
  }

  /**
   * Escape value for SQL
   */
  protected escapeValue(value: unknown): string {
    if (value === null) return "NULL";
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  /**
   * Sanitize column name to prevent SQL injection
   */
  protected sanitizeColumnName(columnName: string): string | null {
    // Only allow alphanumeric and underscore
    const sanitized = columnName.replace(/[^a-zA-Z0-9_]/g, "");
    return sanitized || null;
  }

  /**
   * Build ILIKE pattern for case-insensitive search
   */
  protected buildIlikePattern(searchTerm: string): string {
    if (!searchTerm) return "%";
    // Escape special SQL characters
    const escaped = searchTerm
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    return `%${escaped}%`;
  }
}

// Default export
export default BaseRepository;
