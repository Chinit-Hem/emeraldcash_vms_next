/**
 * BaseService Abstract Class - OOAD Implementation
 * 
 * Provides the foundation for all service layer classes using:
 * - Singleton Pattern for single instance management
 * - Template Method Pattern for extensible CRUD operations
 * - Strategy Pattern for flexible query building
 * 
 * Features:
 * - Generic type support for any entity type
 * - Standardized caching with TTL (Time-To-Live)
 * - Comprehensive error handling with structured error objects
 * - Performance metrics tracking (duration, query count)
 * - SQL injection protection via parameterized queries
 * - SSR-ready POJO returns (no serialization errors)
 * 
 * @module BaseService
 */

import dbManager from "@/lib/db-singleton";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Base database record interface
 * All entity DB interfaces must extend this
 */
export interface BaseDBRecord {
  id: number;
  created_at: string;
  updated_at: string;
}

/**
 * Base entity interface for API responses
 * All entity interfaces must extend this
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Standard service operation result
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    durationMs: number;
    queryCount: number;
    cacheHit?: boolean;
  };
}

/**
 * Structured error object for consistent error handling
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  operation?: string;
}

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Query filter options base interface
 */
export interface BaseFilters {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
  searchTerm?: string;
}

/**
 * Pagination result structure
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Service statistics
 */
export interface ServiceStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTimeMs: number;
}

// ============================================================================
// Abstract BaseService Class
// ============================================================================

export abstract class BaseService<TEntity extends BaseEntity, TDB extends BaseDBRecord> {
  // Singleton instance storage (static map to support multiple service types)
  private static instances: Map<string, BaseService<BaseEntity, BaseDBRecord>> = new Map();
  
  // Instance-level cache
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  
  // Default cache TTL (30 seconds for better hit rate)
  protected readonly DEFAULT_CACHE_TTL_MS = 30000;
  
  // Stats cache TTL (5 minutes - stats change infrequently)
  protected readonly STATS_CACHE_TTL_MS = 300000;
  
  // Long cache TTL for reference data (5 minutes)
  protected readonly LONG_CACHE_TTL_MS = 300000;
  
  // MEMORY OPTIMIZATION: Maximum cache entries to prevent unbounded growth
  private readonly MAX_CACHE_ENTRIES = 50;
  
  // MEMORY OPTIMIZATION: Reduced from 100 to 10 to save memory
  private readonly MAX_QUERY_HISTORY = 10;
  
  // Statistics tracking
  private stats: ServiceStats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTimeMs: 0,
  };
  
  // Query times for rolling average
  private queryTimes: number[] = [];

  /**
   * Protected constructor - enforce singleton pattern via getInstance()
   */
  protected constructor(
    protected readonly serviceName: string,
    protected readonly tableName: string
  ) {}

  /**
   * Get singleton instance - must be implemented by subclasses
   * Subclasses should override this method with their own implementation
   */
  public static getInstance(): BaseService<BaseEntity, BaseDBRecord> {
    throw new Error("Subclasses must implement getInstance()");
  }

  // ============================================================================
  // Abstract Methods - Must be implemented by subclasses
  // ============================================================================

  /**
   * Convert database record to entity (POJO for SSR)
   */
  protected abstract toEntity(dbRecord: TDB): TEntity;

  /**
   * Build cache key from filters
   */
  protected abstract buildCacheKey(filters?: BaseFilters): string;

  /**
   * Apply entity-specific filters to query
   */
  protected abstract applyFilters(
    baseQuery: string,
    filters: BaseFilters,
    params: (string | number | null)[]
  ): { query: string; params: (string | number | null)[]; paramIndex: number };

  // ============================================================================
  // Cache Management Methods
  // ============================================================================

  /**
   * Get data from cache or null if expired
   */
  protected getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    this.stats.cacheHits++;
    return entry.data as T;
  }

  /**
   * Set data in cache with TTL
   * MEMORY OPTIMIZATION: Enforces maximum cache size to prevent unbounded growth
   */
  protected setCache<T>(key: string, data: T, ttlMs?: number): void {
    // MEMORY OPTIMIZATION: Enforce cache size limit
    if (this.cache.size >= this.MAX_CACHE_ENTRIES) {
      // Remove oldest entry (first in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    const expiresAt = Date.now() + (ttlMs || this.DEFAULT_CACHE_TTL_MS);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Clear all cache entries
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate specific cache entry
   */
  public invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate cache by pattern (partial key match)
   */
  public invalidateCachePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // ============================================================================
  // Statistics & Metrics
  // ============================================================================

  /**
   * Update performance metrics
   */
  protected updateMetrics(durationMs: number, cacheHit: boolean = false): void {
    this.stats.totalQueries++;
    
    if (cacheHit) {
      this.stats.cacheHits++;
    } else {
      this.stats.cacheMisses++;
    }

    // Track query time
    this.queryTimes.push(durationMs);
    if (this.queryTimes.length > this.MAX_QUERY_HISTORY) {
      this.queryTimes.shift();
    }

    // Calculate rolling average
    this.stats.averageResponseTimeMs = 
      this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
  }

  /**
   * Get service statistics
   */
  public getStats(): ServiceStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTimeMs: 0,
    };
    this.queryTimes = [];
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  /**
   * Create structured error object
   */
  protected createError(
    code: string,
    message: string,
    details?: string,
    operation?: string
  ): ServiceError {
    return {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      operation,
    };
  }

  /**
   * Log error with service context
   */
  protected logError(error: ServiceError | Error, operation: string): void {
    const errorInfo = error instanceof Error 
      ? this.createError("UNKNOWN_ERROR", error.message, undefined, operation)
      : error;
    
    console.error(
      `[${this.serviceName}.${operation}] Error: ${errorInfo.code} - ${errorInfo.message}`,
      errorInfo.details || ""
    );
  }

  // ============================================================================
  // SQL Injection Protection Utilities
  // ============================================================================

  /**
   * Build ILIKE pattern for case-insensitive partial matching
   * Escapes special SQL characters to prevent injection
   */
  protected buildIlikePattern(searchTerm: string): string {
    if (!searchTerm) return "%";
    // Escape special SQL characters to prevent injection
    const escaped = searchTerm
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    return `%${escaped}%`;
  }

  /**
   * Sanitize column name to prevent SQL injection
   * Only allows alphanumeric and underscore characters
   */
  protected sanitizeColumnName(columnName: string): string | null {
    const sanitized = columnName.replace(/[^a-zA-Z0-9_]/g, "");
    return sanitized || null;
  }

  /**
   * Validate order direction
   */
  protected validateOrderDirection(direction: string): "ASC" | "DESC" {
    const upper = direction.toUpperCase();
    return upper === "DESC" ? "DESC" : "ASC";
  }

  // ============================================================================
  // CRUD Operations - Template Methods
  // ============================================================================

  /**
   * Get all records with optional filtering
   * Template method with hooks for customization
   */
  public async getAll(filters?: BaseFilters): Promise<ServiceResult<TEntity[]>> {
    const startTime = Date.now();
    const cacheKey = this.buildCacheKey(filters);

    // Check cache first
    const cached = this.getFromCache<TEntity[]>(cacheKey);
    if (cached) {
      this.updateMetrics(Date.now() - startTime, true);
      return {
        success: true,
        data: cached,
        meta: { 
          durationMs: Date.now() - startTime, 
          queryCount: 0,
          cacheHit: true 
        },
      };
    }

    try {
      // Build base query
      let query = `SELECT * FROM ${this.tableName}`;
      let params: (string | number | null)[] = [];
      let paramIndex = 1;

      // Apply filters if provided
      if (filters && Object.keys(filters).length > 0) {
        const filterResult = this.applyFilters(query, filters, params);
        query = filterResult.query;
        params = filterResult.params;
        paramIndex = filterResult.paramIndex;
      }

      // Add ORDER BY
      const orderBy = this.sanitizeColumnName(filters?.orderBy || "id") || "id";
      const orderDirection = this.validateOrderDirection(filters?.orderDirection || "ASC");
      query += ` ORDER BY ${orderBy} ${orderDirection}`;

      // Add pagination - inline LIMIT and OFFSET since they are numeric and safe
      if (filters?.limit !== undefined && filters.limit !== null) {
        query += ` LIMIT ${filters.limit}`;
        
        if (filters?.offset !== undefined && filters.offset !== null) {
          query += ` OFFSET ${filters.offset}`;
        }
      }

      // Build final query with inline parameters (same approach as countWithFilters)
      let finalQuery = query;
      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        const placeholder = `$${i + 1}`;
        let replacement: string;
        
        if (param === null) {
          replacement = 'NULL';
        } else if (typeof param === 'number') {
          replacement = String(param);
        } else {
          replacement = `'${String(param).replace(/'/g, "''")}'`;
        }
        
        const placeholderRegex = new RegExp(placeholder.replace(/\$/g, '\\$'), 'g');
        finalQuery = finalQuery.replace(placeholderRegex, replacement);
      }

      // Execute query using executeUnsafe with timeout and detailed error handling
      // INCREASED: 45 seconds for large datasets with complex filters
      const QUERY_TIMEOUT_MS = 45000;
      
      let dbRecords: TDB[];
      try {
        // Use dbManager's built-in timeout support for better retry handling
        dbRecords = await dbManager.query(
          () => dbManager.executeUnsafe<TDB>(finalQuery),
          { 
            operationName: `${this.serviceName}.getAll`,
            maxRetries: 2,
            timeoutMs: QUERY_TIMEOUT_MS 
          }
        );
      } catch (dbError) {
        // Enhanced error logging for timeout scenarios
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        console.error(`[${this.serviceName}.getAll] Query failed:`, {
          error: errorMessage,
          queryLength: finalQuery.length,
          timeoutMs: QUERY_TIMEOUT_MS,
          filters: filters ? Object.keys(filters) : 'none'
        });
        throw dbError;
      }
      
      const entities = dbRecords.map(record => this.toEntity(record));

      // Cache result
      this.setCache(cacheKey, entities);

      const duration = Date.now() - startTime;
      this.updateMetrics(duration);

      return {
        success: true,
        data: entities,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch records";
      
      this.logError(error instanceof Error ? error : new Error(String(error)), "getAll");
      
      return {
        success: false,
        error: errorMessage,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    }
  }

  /**
   * Get a single record by ID
   */
  public async getById(id: number): Promise<ServiceResult<TEntity>> {
    const startTime = Date.now();
    const cacheKey = `${this.serviceName}:id:${id}`;

    // Check cache first
    const cached = this.getFromCache<TEntity>(cacheKey);
    if (cached) {
      this.updateMetrics(Date.now() - startTime, true);
      return {
        success: true,
        data: cached,
        meta: { 
          durationMs: Date.now() - startTime, 
          queryCount: 0,
          cacheHit: true 
        },
      };
    }

    try {
      // Use executeUnsafe with inline parameter
      const query = `SELECT * FROM ${this.tableName} WHERE id = ${id}`;
      const result = await dbManager.executeUnsafe<TDB>(query);

      if (result.length === 0) {
        return {
          success: false,
          error: `${this.serviceName} with ID ${id} not found`,
          meta: { 
            durationMs: Date.now() - startTime, 
            queryCount: 1,
            cacheHit: false 
          },
        };
      }

      const entity = this.toEntity(result[0]);
      
      // Cache for longer (10 seconds) since single records change less frequently
      this.setCache(cacheKey, entity, 10000);

      const duration = Date.now() - startTime;
      this.updateMetrics(duration);

      return {
        success: true,
        data: entity,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch record";
      this.logError(error instanceof Error ? error : new Error(String(error)), "getById");
      
      return {
        success: false,
        error: errorMessage,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    }
  }

  /**
   * Create a new record
   */
  public async create(
    data: Omit<TDB, "id" | "created_at" | "updated_at">
  ): Promise<ServiceResult<TEntity>> {
    const startTime = Date.now();

    try {
      const now = new Date().toISOString();

      // Get next available ID
      const maxIdQuery = `SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM ${this.tableName}`;
      const maxIdResult = await dbManager.executeUnsafe<{ next_id: number }>(maxIdQuery);

      const nextId = maxIdResult[0].next_id;

      // Build INSERT query dynamically with inline values
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      // Escape string values
      const escapedValues = values.map(v => {
        if (v === null) return 'NULL';
        if (typeof v === 'number') return String(v);
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      
      const insertQuery = `
        INSERT INTO ${this.tableName} (
          id, ${columns.join(", ")}, created_at, updated_at
        ) VALUES (
          ${nextId}, ${escapedValues.join(", ")}, '${now}', '${now}'
        )
        RETURNING *
      `;

      const result = await dbManager.executeUnsafe<TDB>(insertQuery);

      const newRecord = this.toEntity(result[0]);

      // Invalidate list cache
      this.invalidateCachePattern(`${this.serviceName}:`);

      const duration = Date.now() - startTime;
      this.updateMetrics(duration);

      return {
        success: true,
        data: newRecord,
        meta: { 
          durationMs: duration, 
          queryCount: 2,
          cacheHit: false 
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Failed to create record";
      this.logError(error instanceof Error ? error : new Error(String(error)), "create");
      
      return {
        success: false,
        error: errorMessage,
        meta: { 
          durationMs: duration, 
          queryCount: 0,
          cacheHit: false 
        },
      };
    }
  }

  /**
   * Update a record
   */
  public async update(
    id: number,
    data: Partial<TDB>
  ): Promise<ServiceResult<TEntity>> {
    const startTime = Date.now();

    try {
      // Build dynamic UPDATE query with inline values
      const updateFields: string[] = [];
      const now = new Date().toISOString();

      for (const [key, value] of Object.entries(data)) {
        // Skip id, created_at, updated_at
        if (key === "id" || key === "created_at" || key === "updated_at") continue;
        
        const sanitizedKey = this.sanitizeColumnName(key);
        if (sanitizedKey) {
          // Escape value
          let escapedValue: string;
          if (value === null) {
            escapedValue = 'NULL';
          } else if (typeof value === 'number') {
            escapedValue = String(value);
          } else {
            escapedValue = `'${String(value).replace(/'/g, "''")}'`;
          }
          updateFields.push(`${sanitizedKey} = ${escapedValue}`);
        }
      }

      // Always update updated_at
      updateFields.push(`updated_at = '${now}'`);

      if (updateFields.length === 0) {
        return {
          success: false,
          error: "No fields to update",
          meta: { 
            durationMs: Date.now() - startTime, 
            queryCount: 0,
            cacheHit: false 
          },
        };
      }

      const updateQuery = `
        UPDATE ${this.tableName} 
        SET ${updateFields.join(', ')}
        WHERE id = ${id}
        RETURNING *
      `;

      const result = await dbManager.executeUnsafe<TDB>(updateQuery);

      if (result.length === 0) {
        return {
          success: false,
          error: `${this.serviceName} with ID ${id} not found`,
          meta: { 
            durationMs: Date.now() - startTime, 
            queryCount: 1,
            cacheHit: false 
          },
        };
      }

      const updatedRecord = this.toEntity(result[0]);

      // Invalidate cache
      this.invalidateCache(`${this.serviceName}:id:${id}`);
      this.invalidateCachePattern(`${this.serviceName}:`);

      const duration = Date.now() - startTime;
      this.updateMetrics(duration);

      return {
        success: true,
        data: updatedRecord,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Failed to update record";
      this.logError(error instanceof Error ? error : new Error(String(error)), "update");
      
      return {
        success: false,
        error: errorMessage,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    }
  }

  /**
   * Delete a record
   */
  public async delete(id: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();

    try {
      const deleteQuery = `DELETE FROM ${this.tableName} WHERE id = ${id} RETURNING id`;
      const result = await dbManager.executeUnsafe<{ id: number }>(deleteQuery);

      const deleted = result.length > 0;

      if (deleted) {
        // Invalidate cache
        this.invalidateCache(`${this.serviceName}:id:${id}`);
        this.invalidateCachePattern(`${this.serviceName}:`);
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration);

      return {
        success: true,
        data: deleted,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Failed to delete record";
      this.logError(error instanceof Error ? error : new Error(String(error)), "delete");
      
      return {
        success: false,
        error: errorMessage,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    }
  }

  /**
   * Get total count of records
   */
  public async count(): Promise<ServiceResult<number>> {
    const startTime = Date.now();

    try {
      const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const result = await dbManager.executeUnsafe<{ count: string }>(countQuery);

      let count = 0;
      if (result.length > 0 && result[0] && typeof result[0].count !== 'undefined') {
        count = parseInt(result[0].count) || 0;
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration);

      return {
        success: true,
        data: count,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Failed to count records";
      this.logError(error instanceof Error ? error : new Error(String(error)), "count");
      
      return {
        success: false,
        error: errorMessage,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    }
  }

  /**
   * Check if record exists
   */
  public async exists(id: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();

    try {
      const existsQuery = `SELECT 1 FROM ${this.tableName} WHERE id = ${id} LIMIT 1`;
      const result = await dbManager.executeUnsafe<Record<string, unknown>>(existsQuery);

      const exists = result.length > 0;

      const duration = Date.now() - startTime;
      this.updateMetrics(duration);

      return {
        success: true,
        data: exists,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Failed to check existence";
      this.logError(error instanceof Error ? error : new Error(String(error)), "exists");
      
      return {
        success: false,
        error: errorMessage,
        meta: { 
          durationMs: duration, 
          queryCount: 1,
          cacheHit: false 
        },
      };
    }
  }
}

// Default export
export default BaseService;
