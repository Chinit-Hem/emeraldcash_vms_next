/**
 * Vehicle Service Class - OOAD Implementation
 * 
 * Implements the Service Layer pattern with Singleton for vehicle CRUD operations.
 * Provides optimized database access with:
 * - Static methods for stateless operations (memory efficient)
 * - Case-insensitive ILIKE filtering with TRIM() for accuracy
 * - Smart plural/singular category normalization
 * - SSR-ready POJO returns (no serialization errors)
 * - Comprehensive error handling with structured error objects
 * 
 * @module VehicleService
 */

import { dbManager } from "@/lib/db-singleton";
import type { Vehicle, VehicleMeta } from "@/lib/types";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Database vehicle record structure (snake_case from PostgreSQL)
 */
export interface VehicleDB {
  id: number;
  category: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  market_price: number;
  tax_type: string | null;
  condition: string;
  body_type: string | null;
  color: string | null;
  image_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Vehicle filter options for queries
 */
export interface VehicleFilters {
  category?: string;
  brand?: string;
  model?: string;
  condition?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  color?: string;
  bodyType?: string;
  taxType?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
  orderBy?: "id" | "brand" | "model" | "year" | "market_price" | "created_at";
  orderDirection?: "ASC" | "DESC";
}

/**
 * Vehicle statistics
 */
export interface VehicleStats {
  total: number;
  byCategory: Record<string, number>;
  byCondition: Record<string, number>;
  avgPrice: number;
  noImageCount: number;
}

/**
 * Pagination result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Service operation result with structured error handling
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    durationMs: number;
    queryCount: number;
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
}

// ============================================================================
// Vehicle Service Singleton Class
// ============================================================================

export class VehicleService {
  private static instance: VehicleService | null = null;
  
  // Cache for SSR optimization (short TTL for data freshness)
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();
  private readonly DEFAULT_CACHE_TTL_MS = 5000; // 5 seconds for SSR

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): VehicleService {
    if (!VehicleService.instance) {
      VehicleService.instance = new VehicleService();
    }
    return VehicleService.instance;
  }

  // ============================================================================
  // STATIC HELPER METHODS (Stateless - Memory Efficient)
  // ============================================================================

  /**
   * Normalize condition to proper case (New, Used, Other)
   * Static method for stateless operation
   */
  public static normalizeCondition(condition: string): "New" | "Used" | "Other" {
    if (!condition) return "Other";
    const lower = condition.toLowerCase().trim();
    if (lower === "new") return "New";
    if (lower === "used") return "Used";
    return "Other";
  }

  /**
   * Normalize category with smart plural/singular handling
   * Handles variations like: "Car" -> "Cars", "Tuktuks" -> "TukTuks", etc.
   * Static method for stateless operation
   */
  public static normalizeCategory(category: string): string {
    if (!category) return "Other";
    
    const lower = category.toLowerCase().trim();
    
    // Remove trailing 's' for singular matching (Cars -> Car)
    const singular = lower.endsWith('s') ? lower.slice(0, -1) : lower;
    
    // Car/Cars variations
    if (lower === "car" || lower === "cars" || singular === "car") {
      return "Cars";
    }
    
    // Motorcycle/Motorcycles variations
    if (lower === "motorcycle" || lower === "motorcycles" || singular === "motorcycle") {
      return "Motorcycles";
    }
    
    // Tuk Tuk variations (with spaces, hyphens, or concatenated)
    if (
      lower === "tuk tuk" || 
      lower === "tuk-tuk" || 
      lower === "tuktuk" || 
      lower === "tuktuks" ||
      lower === "tuk tuks" ||
      singular === "tuktuk" ||
      singular === "tuk tuk"
    ) {
      return "TukTuks";
    }
    
    // Truck/Trucks variations
    if (lower === "truck" || lower === "trucks" || singular === "truck") {
      return "Trucks";
    }
    
    // Van/Vans variations
    if (lower === "van" || lower === "vans" || singular === "van") {
      return "Vans";
    }
    
    // Bus/Buses variations
    if (lower === "bus" || lower === "buses" || singular === "bus" || lower === "buse") {
      return "Buses";
    }
    
    // Default: return trimmed original with first letter capitalized
    return category.trim().charAt(0).toUpperCase() + category.trim().slice(1).toLowerCase();
  }

  /**
   * Round number to specified decimals safely
   * Static method for stateless operation
   */
  public static roundTo(value: number, decimals = 2): number {
    if (!Number.isFinite(value)) return 0;
    const safeDecimals = Math.max(0, Math.min(6, Math.trunc(decimals)));
    const factor = 10 ** safeDecimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  /**
   * Calculate percentage of price safely
   * Static method for stateless operation
   */
  public static percentOfPrice(price: number | null, percent: number, decimals = 2): number | null {
    if (price == null || !Number.isFinite(price)) return null;
    if (!Number.isFinite(percent)) return null;
    return VehicleService.roundTo(price * percent, decimals);
  }

  /**
   * Derive 40% depreciation price
   * Static method for stateless operation
   */
  public static derivePrice40(priceNew: number | null): number | null {
    return VehicleService.percentOfPrice(priceNew, 0.4);
  }

  /**
   * Derive 70% depreciation price
   * Static method for stateless operation
   */
  public static derivePrice70(priceNew: number | null): number | null {
    return VehicleService.percentOfPrice(priceNew, 0.7);
  }

  /**
   * Convert database vehicle to API format (POJO for SSR)
   * Returns plain JavaScript object to avoid serialization errors
   * Static method for stateless operation
   */
  public static toVehicle(dbVehicle: VehicleDB): Vehicle {
    // Safely parse market_price (handle string or number from DB)
    const priceNew = typeof dbVehicle.market_price === "string"
      ? parseFloat(dbVehicle.market_price) || 0
      : (dbVehicle.market_price || 0);

    // Normalize category with plural/singular handling
    const normalizedCategory = VehicleService.normalizeCategory(dbVehicle.category);

    // Create plain object (POJO) for SSR compatibility
    const vehicle: Vehicle = {
      VehicleId: String(dbVehicle.id),
      Category: normalizedCategory,
      Brand: dbVehicle.brand || "",
      Model: dbVehicle.model || "",
      Year: dbVehicle.year || null,
      Plate: dbVehicle.plate || "",
      PriceNew: priceNew,
      Price40: VehicleService.derivePrice40(priceNew),
      Price70: VehicleService.derivePrice70(priceNew),
      TaxType: dbVehicle.tax_type || "",
      Condition: dbVehicle.condition || "",
      BodyType: dbVehicle.body_type || "",
      Color: dbVehicle.color || "",
      Image: dbVehicle.image_id || "",
      Time: dbVehicle.created_at || new Date().toISOString(),
    };

    return vehicle;
  }

  /**
   * Build ILIKE pattern for case-insensitive partial matching
   * Static method for stateless operation
   */
  public static buildIlikePattern(searchTerm: string): string {
    if (!searchTerm) return "%";
    // Escape special SQL characters to prevent injection
    const escaped = searchTerm
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    return `%${escaped}%`;
  }

  /**
   * Create a structured error object
   * Static method for stateless operation
   */
  public static createError(code: string, message: string, details?: string): ServiceError {
    return {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // INSTANCE HELPER METHODS (Stateful - Require Cache Access)
  // ============================================================================

  /**
   * Build cache key from filters
   */
  private buildCacheKey(filters?: VehicleFilters): string {
    if (!filters) return "vehicles:all";
    // Sort keys for consistent cache keys
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        acc[key] = filters[key as keyof VehicleFilters];
        return acc;
      }, {} as Record<string, unknown>);
    return `vehicles:${JSON.stringify(sortedFilters)}`;
  }

  /**
   * Get from cache or null if expired
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  /**
   * Set cache value with TTL
   */
  private setCache<T>(key: string, data: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs || this.DEFAULT_CACHE_TTL_MS);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Clear all cache
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

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Get all vehicles with optional filtering
   * Uses case-insensitive ILIKE with TRIM() for accurate text matching
   * Returns POJOs for SSR compatibility
   */
  public async getVehicles(filters?: VehicleFilters): Promise<ServiceResult<Vehicle[]>> {
    const startTime = Date.now();
    const cacheKey = this.buildCacheKey(filters);

    // Check cache first
    const cached = this.getFromCache<Vehicle[]>(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached,
        meta: { durationMs: Date.now() - startTime, queryCount: 0 },
      };
    }

    try {
      const sql = dbManager.getClient();
      
      let dbVehicles: VehicleDB[];
      
      if (!filters || Object.keys(filters).length === 0) {
        // No filters - get all vehicles
        const result = await dbManager.query(
          async () => sql`SELECT * FROM cleaned_vehicles_for_google_sheets ORDER BY id ASC`,
          { operationName: "getVehiclesAll", maxRetries: 3 }
        );
        dbVehicles = result as unknown as VehicleDB[];
      } else {
        // Build parameterized query
        const conditions: string[] = [];
        const params: (string | number)[] = [];
        let paramIndex = 1;

        // Category filter with ILIKE + TRIM() for case-insensitive matching
        if (filters?.category) {
          const normalizedCategory = VehicleService.normalizeCategory(filters.category);
          conditions.push(`TRIM(category) ILIKE $${paramIndex}`);
          params.push(normalizedCategory);
          paramIndex++;
        }
        
        // Brand filter with ILIKE
        if (filters?.brand) {
          conditions.push(`brand ILIKE $${paramIndex}`);
          params.push(VehicleService.buildIlikePattern(filters.brand));
          paramIndex++;
        }
        
        // Model filter with ILIKE
        if (filters?.model) {
          conditions.push(`model ILIKE $${paramIndex}`);
          params.push(VehicleService.buildIlikePattern(filters.model));
          paramIndex++;
        }
        
        // Condition filter
        if (filters?.condition) {
          const normalizedCondition = VehicleService.normalizeCondition(filters.condition);
          conditions.push(`condition = $${paramIndex}`);
          params.push(normalizedCondition);
          paramIndex++;
        }
        
        // Color filter with ILIKE
        if (filters?.color) {
          conditions.push(`color ILIKE $${paramIndex}`);
          params.push(VehicleService.buildIlikePattern(filters.color));
          paramIndex++;
        }
        
        // Body type filter with ILIKE
        if (filters?.bodyType) {
          conditions.push(`body_type ILIKE $${paramIndex}`);
          params.push(VehicleService.buildIlikePattern(filters.bodyType));
          paramIndex++;
        }
        
        // Tax type filter with ILIKE
        if (filters?.taxType) {
          conditions.push(`tax_type ILIKE $${paramIndex}`);
          params.push(VehicleService.buildIlikePattern(filters.taxType));
          paramIndex++;
        }
        
        // Year range filters
        if (filters?.yearMin !== undefined && filters.yearMin !== null) {
          conditions.push(`year >= $${paramIndex}`);
          params.push(filters.yearMin);
          paramIndex++;
        }
        
        if (filters?.yearMax !== undefined && filters.yearMax !== null) {
          conditions.push(`year <= $${paramIndex}`);
          params.push(filters.yearMax);
          paramIndex++;
        }
        
        // Price range filters
        if (filters?.priceMin !== undefined && filters.priceMin !== null) {
          conditions.push(`market_price >= $${paramIndex}`);
          params.push(filters.priceMin);
          paramIndex++;
        }
        
        if (filters?.priceMax !== undefined && filters.priceMax !== null) {
          conditions.push(`market_price <= $${paramIndex}`);
          params.push(filters.priceMax);
          paramIndex++;
        }
        
        // Global search term
        if (filters?.searchTerm) {
          const pattern = VehicleService.buildIlikePattern(filters.searchTerm);
          conditions.push(`(brand ILIKE $${paramIndex} OR model ILIKE $${paramIndex} OR plate ILIKE $${paramIndex})`);
          params.push(pattern);
          paramIndex++;
        }

        // For complex filtered queries, use the SQL client directly with parameterized queries
        // Build the query using tagged template literals
        const sql = dbManager.getClient();
        
        // Execute query with proper tagged template syntax
        const result = await dbManager.query(
          async () => {
            if (conditions.length === 0) {
              // No filters - simple query
              if (filters?.limit !== undefined && filters.limit !== null) {
                if (filters?.offset !== undefined && filters.offset !== null) {
                  return sql`SELECT * FROM cleaned_vehicles_for_google_sheets ORDER BY id ASC LIMIT ${filters.limit} OFFSET ${filters.offset}`;
                }
                return sql`SELECT * FROM cleaned_vehicles_for_google_sheets ORDER BY id ASC LIMIT ${filters.limit}`;
              }
              return sql`SELECT * FROM cleaned_vehicles_for_google_sheets ORDER BY id ASC`;
            } else {
              // Build WHERE clause with ILIKE conditions
              // Note: For complex dynamic queries with multiple optional filters,
              // we use the sql function with array expansion for the IN clause pattern
              let query = sql`SELECT * FROM cleaned_vehicles_for_google_sheets WHERE `;
              
              const conditions_sql = [];
              if (filters?.category) {
                const normalizedCategory = VehicleService.normalizeCategory(filters.category);
                conditions_sql.push(sql`TRIM(category) ILIKE ${normalizedCategory}`);
              }
              if (filters?.brand) {
                conditions_sql.push(sql`brand ILIKE ${'%' + filters.brand + '%'}`);
              }
              if (filters?.model) {
                conditions_sql.push(sql`model ILIKE ${'%' + filters.model + '%'}`);
              }
              if (filters?.condition) {
                const normalizedCondition = VehicleService.normalizeCondition(filters.condition);
                conditions_sql.push(sql`condition = ${normalizedCondition}`);
              }
              if (filters?.color) {
                conditions_sql.push(sql`color ILIKE ${'%' + filters.color + '%'}`);
              }
              if (filters?.bodyType) {
                conditions_sql.push(sql`body_type ILIKE ${'%' + filters.bodyType + '%'}`);
              }
              if (filters?.taxType) {
                conditions_sql.push(sql`tax_type ILIKE ${'%' + filters.taxType + '%'}`);
              }
              if (filters?.yearMin !== undefined && filters.yearMin !== null) {
                conditions_sql.push(sql`year >= ${filters.yearMin}`);
              }
              if (filters?.yearMax !== undefined && filters.yearMax !== null) {
                conditions_sql.push(sql`year <= ${filters.yearMax}`);
              }
              if (filters?.priceMin !== undefined && filters.priceMin !== null) {
                conditions_sql.push(sql`market_price >= ${filters.priceMin}`);
              }
              if (filters?.priceMax !== undefined && filters.priceMax !== null) {
                conditions_sql.push(sql`market_price <= ${filters.priceMax}`);
              }
              if (filters?.searchTerm) {
                const pattern = '%' + filters.searchTerm + '%';
                conditions_sql.push(sql`(brand ILIKE ${pattern} OR model ILIKE ${pattern} OR plate ILIKE ${pattern})`);
              }
              
              // Combine conditions with AND
              for (let i = 0; i < conditions_sql.length; i++) {
                if (i > 0) {
                  query = sql`${query} AND `;
                }
                query = sql`${query} ${conditions_sql[i]}`;
              }
              
              // Add ORDER BY
              query = sql`${query} ORDER BY id ASC`;
              
              // Add pagination
              if (filters?.limit !== undefined && filters.limit !== null) {
                if (filters?.offset !== undefined && filters.offset !== null) {
                  query = sql`${query} LIMIT ${filters.limit} OFFSET ${filters.offset}`;
                } else {
                  query = sql`${query} LIMIT ${filters.limit}`;
                }
              }
              
              return query;
            }
          },
          { operationName: "getVehiclesFiltered", maxRetries: 3 }
        );
        dbVehicles = result as unknown as VehicleDB[];
      }

      // Convert to POJOs using static method
      const vehicles = dbVehicles.map(v => VehicleService.toVehicle(v));

      // Cache result
      this.setCache(cacheKey, vehicles);

      return {
        success: true,
        data: vehicles,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vehicles";
      console.error("[VehicleService.getVehicles] Error:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get a single vehicle by ID
   * Returns POJO for SSR compatibility
   */
  public async getVehicleById(id: number): Promise<ServiceResult<Vehicle>> {
    const startTime = Date.now();

    try {
      const cacheKey = `vehicle:${id}`;
      const cached = this.getFromCache<Vehicle>(cacheKey);
      
      if (cached) {
        return {
          success: true,
          data: cached,
          meta: { durationMs: Date.now() - startTime, queryCount: 0 },
        };
      }

      const sql = dbManager.getClient();
      
      const result = await dbManager.query(
        async () => sql`SELECT * FROM cleaned_vehicles_for_google_sheets WHERE id = ${id}`,
        { operationName: "getVehicleById", maxRetries: 3 }
      );

      const dbResult = result as unknown as VehicleDB[];

      if (dbResult.length === 0) {
        return {
          success: false,
          error: `Vehicle with ID ${id} not found`,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      const vehicle = VehicleService.toVehicle(dbResult[0]);
      this.setCache(cacheKey, vehicle, 10000); // Cache for 10 seconds

      return {
        success: true,
        data: vehicle,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vehicle";
      console.error("[VehicleService.getVehicleById] Error:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get a single vehicle by plate number (case-insensitive)
   * Returns POJO for SSR compatibility
   */
  public async getVehicleByPlate(plate: string): Promise<ServiceResult<Vehicle>> {
    const startTime = Date.now();

    try {
      const sql = dbManager.getClient();
      
      const result = await dbManager.query(
        async () => sql`SELECT * FROM cleaned_vehicles_for_google_sheets WHERE plate ILIKE ${plate}`,
        { operationName: "getVehicleByPlate", maxRetries: 3 }
      );

      const dbResult = result as unknown as VehicleDB[];

      if (dbResult.length === 0) {
        return {
          success: false,
          error: `Vehicle with plate ${plate} not found`,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      return {
        success: true,
        data: VehicleService.toVehicle(dbResult[0]),
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vehicle by plate";
      console.error("[VehicleService.getVehicleByPlate] Error:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Create a new vehicle
   * Returns POJO for SSR compatibility
   */
  public async createVehicle(
    vehicle: Omit<VehicleDB, "id" | "created_at" | "updated_at">
  ): Promise<ServiceResult<Vehicle>> {
    const startTime = Date.now();

    try {
      const sql = dbManager.getClient();
      const now = new Date().toISOString();

      // Get next available ID
      const maxIdResult = await dbManager.query(
        async () => sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM cleaned_vehicles_for_google_sheets`,
        { operationName: "getNextId", maxRetries: 3 }
      );

      const nextId = (maxIdResult as unknown as { next_id: number }[])[0].next_id;

      // Normalize category before saving
      const normalizedCategory = VehicleService.normalizeCategory(vehicle.category);

      // Insert vehicle
      const result = await dbManager.query(
        async () => sql`
          INSERT INTO cleaned_vehicles_for_google_sheets (
            id, category, brand, model, year, plate, market_price,
            tax_type, condition, body_type, color, image_id,
            created_at, updated_at
          ) VALUES (
            ${nextId}, ${normalizedCategory}, ${vehicle.brand}, ${vehicle.model}, 
            ${vehicle.year || new Date().getFullYear()}, ${vehicle.plate}, ${vehicle.market_price || 0},
            ${vehicle.tax_type}, ${vehicle.condition}, ${vehicle.body_type}, ${vehicle.color}, ${vehicle.image_id},
            ${now}, ${now}
          )
          RETURNING *
        `,
        { operationName: "createVehicle", maxRetries: 3 }
      );

      const newVehicle = VehicleService.toVehicle((result as unknown as VehicleDB[])[0]);

      // Invalidate cache
      this.clearCache();

      return {
        success: true,
        data: newVehicle,
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create vehicle";
      console.error("[VehicleService.createVehicle] Error:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 0 },
      };
    }
  }

  /**
   * Update a vehicle
   * Returns POJO for SSR compatibility
   */
  public async updateVehicle(
    id: number,
    vehicle: Partial<VehicleDB>
  ): Promise<ServiceResult<Vehicle>> {
    const startTime = Date.now();

    try {
      // Normalize category if provided
      const category = vehicle.category 
        ? VehicleService.normalizeCategory(vehicle.category)
        : undefined;

      // Build dynamic update query using raw SQL with parameters
      const updateFields: string[] = [];
      const updateParams: (string | number | null)[] = [];
      let paramIndex = 1;

      if (category !== undefined) {
        updateFields.push(`category = $${paramIndex}`);
        updateParams.push(category);
        paramIndex++;
      }
      if (vehicle.brand !== undefined) {
        updateFields.push(`brand = $${paramIndex}`);
        updateParams.push(vehicle.brand);
        paramIndex++;
      }
      if (vehicle.model !== undefined) {
        updateFields.push(`model = $${paramIndex}`);
        updateParams.push(vehicle.model);
        paramIndex++;
      }
      if (vehicle.year !== undefined) {
        updateFields.push(`year = $${paramIndex}`);
        updateParams.push(vehicle.year);
        paramIndex++;
      }
      if (vehicle.plate !== undefined) {
        updateFields.push(`plate = $${paramIndex}`);
        updateParams.push(vehicle.plate);
        paramIndex++;
      }
      if (vehicle.market_price !== undefined) {
        updateFields.push(`market_price = $${paramIndex}`);
        updateParams.push(vehicle.market_price);
        paramIndex++;
      }
      if (vehicle.tax_type !== undefined) {
        updateFields.push(`tax_type = $${paramIndex}`);
        updateParams.push(vehicle.tax_type);
        paramIndex++;
      }
      if (vehicle.condition !== undefined) {
        updateFields.push(`condition = $${paramIndex}`);
        updateParams.push(vehicle.condition);
        paramIndex++;
      }
      if (vehicle.body_type !== undefined) {
        updateFields.push(`body_type = $${paramIndex}`);
        updateParams.push(vehicle.body_type);
        paramIndex++;
      }
      if (vehicle.color !== undefined) {
        updateFields.push(`color = $${paramIndex}`);
        updateParams.push(vehicle.color);
        paramIndex++;
      }
      if (vehicle.image_id !== undefined) {
        updateFields.push(`image_id = $${paramIndex}`);
        updateParams.push(vehicle.image_id);
        paramIndex++;
      }

      // Always update updated_at
      const now = new Date().toISOString();
      updateFields.push(`updated_at = $${paramIndex}`);
      updateParams.push(now);
      paramIndex++;

      // Add id for WHERE clause
      updateParams.push(id);

      if (updateFields.length === 0) {
        return {
          success: false,
          error: "No fields to update",
          meta: { durationMs: Date.now() - startTime, queryCount: 0 },
        };
      }

      const updateQuery = `
        UPDATE cleaned_vehicles_for_google_sheets 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      // Use sql.query for conventional parameterized queries (not tagged template)
      const sql = dbManager.getClient();
      const result = await dbManager.query(
        async () => sql.query(updateQuery, updateParams),
        { operationName: "updateVehicle", maxRetries: 3 }
      );

      const dbResult = result as unknown as VehicleDB[];

      if (dbResult.length === 0) {
        return {
          success: false,
          error: `Vehicle with ID ${id} not found`,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      const updatedVehicle = VehicleService.toVehicle(dbResult[0]);

      // Invalidate cache
      this.clearCache();
      this.invalidateCache(`vehicle:${id}`);

      return {
        success: true,
        data: updatedVehicle,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update vehicle";
      console.error("[VehicleService.updateVehicle] Error:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Delete a vehicle
   */
  public async deleteVehicle(id: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();

    try {
      const sql = dbManager.getClient();
      
      const result = await dbManager.query(
        async () => sql`DELETE FROM cleaned_vehicles_for_google_sheets WHERE id = ${id} RETURNING id`,
        { operationName: "deleteVehicle", maxRetries: 3 }
      );

      const deleted = (result as unknown as { id: number }[]).length > 0;

      if (deleted) {
        // Invalidate cache
        this.clearCache();
        this.invalidateCache(`vehicle:${id}`);
      }

      return {
        success: true,
        data: deleted,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete vehicle";
      console.error("[VehicleService.deleteVehicle] Error:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  /**
   * Get vehicle statistics with optimized single query
   * Returns POJO for SSR compatibility
   */
  public async getVehicleStats(): Promise<ServiceResult<VehicleStats>> {
    const startTime = Date.now();

    try {
      const cacheKey = "vehicle:stats";
      const cached = this.getFromCache<VehicleStats>(cacheKey);
      
      if (cached) {
        return {
          success: true,
          data: cached,
          meta: { durationMs: Date.now() - startTime, queryCount: 0 },
        };
      }

      const sql = dbManager.getClient();

      // Single query using CTEs for all stats
      const result = await dbManager.query(
        async () => sql`
          WITH 
            total_count AS (
              SELECT COUNT(*) as count FROM cleaned_vehicles_for_google_sheets
            ),
            category_counts AS (
              SELECT TRIM(category) as category, COUNT(*) as count 
              FROM cleaned_vehicles_for_google_sheets 
              GROUP BY TRIM(category)
            ),
            condition_counts AS (
              SELECT condition, COUNT(*) as count 
              FROM cleaned_vehicles_for_google_sheets 
              GROUP BY condition
            ),
            price_stats AS (
              SELECT AVG(market_price) as avg_price 
              FROM cleaned_vehicles_for_google_sheets 
              WHERE market_price IS NOT NULL AND market_price > 0
            ),
            no_image_count AS (
              SELECT COUNT(*) as count 
              FROM cleaned_vehicles_for_google_sheets 
              WHERE image_id IS NULL OR image_id = ''
            )
          SELECT 
            (SELECT count FROM total_count) as total,
            (SELECT avg_price FROM price_stats) as avg_price,
            (SELECT count FROM no_image_count) as no_image_count,
            (SELECT json_agg(json_build_object('category', category, 'count', count)) FROM category_counts) as categories,
            (SELECT json_agg(json_build_object('condition', condition, 'count', count)) FROM condition_counts) as conditions
        `,
        { operationName: "getVehicleStats", maxRetries: 3 }
      );

      const row = (result as unknown as {
        total: string;
        avg_price: string;
        no_image_count: string;
        categories: { category: string; count: string }[] | null;
        conditions: { condition: string; count: string }[] | null;
      }[])[0];
      
      const total = parseInt(row.total) || 0;
      const avgPrice = parseFloat(row.avg_price) || 0;
      const noImageCount = parseInt(row.no_image_count) || 0;

      // Parse and normalize category counts with plural/singular handling
      const byCategory: Record<string, number> = {};
      if (row.categories) {
        for (const cat of row.categories) {
          const normalized = VehicleService.normalizeCategory(cat.category);
          byCategory[normalized] = (byCategory[normalized] || 0) + parseInt(cat.count);
        }
      }

      // Parse and normalize condition counts
      const byCondition: Record<string, number> = { New: 0, Used: 0, Other: 0 };
      if (row.conditions) {
        for (const cond of row.conditions) {
          const normalized = VehicleService.normalizeCondition(cond.condition);
          byCondition[normalized] += parseInt(cond.count);
        }
      }

      const stats: VehicleStats = {
        total,
        byCategory,
        byCondition,
        avgPrice,
        noImageCount,
      };

      // Cache for 10 seconds
      this.setCache(cacheKey, stats, 10000);

      return {
        success: true,
        data: stats,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vehicle stats";
      console.error("[VehicleService.getVehicleStats] Error:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get lightweight stats (total count only)
   * Returns POJO for SSR compatibility
   */
  public async getVehicleStatsLite(): Promise<ServiceResult<{ total: number }>> {
    const startTime = Date.now();

    try {
      const sql = dbManager.getClient();
      
      const result = await dbManager.query(
        async () => sql`SELECT COUNT(*) as count FROM cleaned_vehicles_for_google_sheets`,
        { operationName: "getVehicleStatsLite", maxRetries: 3 }
      );

      return {
        success: true,
        data: { total: parseInt((result as unknown as { count: string }[])[0].count) || 0 },
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vehicle count";
      console.error("[VehicleService.getVehicleStatsLite] Error:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  // ============================================================================
  // SEARCH OPERATIONS
  // ============================================================================

  /**
   * Search vehicles by text with case-insensitive ILIKE
   * Returns POJOs for SSR compatibility
   */
  public async searchVehicles(searchTerm: string, limit?: number): Promise<ServiceResult<Vehicle[]>> {
    const startTime = Date.now();

    try {
      const sql = dbManager.getClient();
      const pattern = VehicleService.buildIlikePattern(searchTerm);
      
      // Build the query based on whether limit is provided
      let result;
      if (limit !== undefined && limit !== null) {
        result = await dbManager.query(
          async () => sql`
            SELECT * FROM cleaned_vehicles_for_google_sheets 
            WHERE 
              brand ILIKE ${pattern} OR
              model ILIKE ${pattern} OR
              plate ILIKE ${pattern}
            ORDER BY brand, model
            LIMIT ${limit}
          `,
          { operationName: "searchVehiclesWithLimit", maxRetries: 3 }
        );
      } else {
        result = await dbManager.query(
          async () => sql`
            SELECT * FROM cleaned_vehicles_for_google_sheets 
            WHERE 
              brand ILIKE ${pattern} OR
              model ILIKE ${pattern} OR
              plate ILIKE ${pattern}
            ORDER BY brand, model
          `,
          { operationName: "searchVehicles", maxRetries: 3 }
        );
      }

      return {
        success: true,
        data: (result as unknown as VehicleDB[]).map(v => VehicleService.toVehicle(v)),
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to search vehicles";
      console.error("[VehicleService.searchVehicles] Error:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Advanced search with multiple criteria
   * Returns POJOs for SSR compatibility
   */
  public async advancedSearch(criteria: VehicleFilters): Promise<ServiceResult<Vehicle[]>> {
    return this.getVehicles(criteria);
  }

  /**
   * Get vehicles by category with normalization
   * Returns POJOs for SSR compatibility
   */
  public async getVehiclesByCategory(category: string): Promise<ServiceResult<Vehicle[]>> {
    const normalizedCategory = VehicleService.normalizeCategory(category);
    return this.getVehicles({ category: normalizedCategory });
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

/**
 * Singleton instance of VehicleService
 * Use this for all vehicle operations
 */
export const vehicleService = VehicleService.getInstance();

// Default export for convenience
export default vehicleService;
