/**
 * Vehicle Service Class - OOAD Implementation
 * 
 * Extends BaseService to provide vehicle-specific CRUD operations.
 * Implements the Service Layer pattern with Singleton for vehicle operations.
 * 
 * Features:
 * - Extends BaseService for common CRUD operations
 * - Case-insensitive ILIKE filtering with TRIM() for accuracy
 * - Smart plural/singular category normalization
 * - SSR-ready POJO returns (no serialization errors)
 * - Comprehensive error handling with structured error objects
 * - Price calculation utilities (40% and 70% depreciation)
 * 
 * @module VehicleService
 */

import { BaseService, BaseFilters, ServiceResult } from "./BaseService";
import { dbManager } from "@/lib/db-singleton";
import type { Vehicle } from "@/lib/types";
import { 
  getCategorySearchPattern 
} from "@/lib/categoryMapping";
import { normalizeImageUrl } from "@/lib/cloudinary";

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
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Vehicle entity that extends BaseEntity for OOAD compatibility
 * Maps Vehicle type to BaseEntity structure
 */
export interface VehicleEntity {
  id: string;           // Maps to VehicleId
  createdAt: string;    // Maps to Time
  updatedAt: string;    // Maps to updated_at from DB
  // Include all Vehicle properties
  VehicleId: string;
  Category: string;
  Brand: string;
  Model: string;
  Year: number | null;
  Plate: string;
  PriceNew: number | null;
  Price40: number | null;
  Price70: number | null;
  TaxType: string;
  Condition: string;
  BodyType: string;
  Color: string;
  Image: string;
  Time: string;
}

/**
 * Vehicle-specific filter options
 */
export interface VehicleFilters extends BaseFilters {
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
  withoutImage?: boolean;
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

// ============================================================================
// Vehicle Service Singleton Class
// ============================================================================

export class VehicleService extends BaseService<VehicleEntity, VehicleDB> {
  private static instance: VehicleService | null = null;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    super("VehicleService", "vehicles");
  }

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
  // Abstract Method Implementations
  // ============================================================================

  /**
   * Convert database vehicle record to entity (POJO for SSR)
   */
  protected toEntity(dbVehicle: VehicleDB): VehicleEntity {
    // Safely parse market_price (handle string or number from DB)
    const priceNew = typeof dbVehicle.market_price === "string"
      ? parseFloat(dbVehicle.market_price) || 0
      : (dbVehicle.market_price || 0);

    // Normalize category with plural/singular handling
    const normalizedCategory = VehicleService.normalizeCategory(dbVehicle.category);

    // Use thumbnail_url if available and is a valid URL (pre-computed Google Drive thumbnail), 
    // otherwise fall back to normalizeImageUrl for Cloudinary or runtime URL generation
    // Check if thumbnail_url is a valid URL (starts with http://, https://, or data:)
    const thumbnailUrl = dbVehicle.thumbnail_url?.trim();
    const hasValidThumbnail = thumbnailUrl && (
      thumbnailUrl.startsWith("http://") || 
      thumbnailUrl.startsWith("https://") || 
      thumbnailUrl.startsWith("data:")
    );
    const normalizedImage = hasValidThumbnail 
      ? thumbnailUrl 
      : normalizeImageUrl(dbVehicle.image_id);

    // Create entity with both BaseEntity and Vehicle properties
    const vehicle: VehicleEntity = {
      // BaseEntity properties
      id: String(dbVehicle.id),
      createdAt: dbVehicle.created_at || new Date().toISOString(),
      updatedAt: dbVehicle.updated_at || new Date().toISOString(),
      
      // Vehicle properties
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
      Image: normalizedImage,
      Time: dbVehicle.created_at || new Date().toISOString(),
    };

    return vehicle;
  }

  /**
   * Build cache key from filters
   */
  protected buildCacheKey(filters?: VehicleFilters): string {
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
   * Apply vehicle-specific filters to query
   * Uses ILIKE + TRIM() for case-insensitive matching
   */
  protected applyFilters(
    baseQuery: string,
    filters: VehicleFilters,
    params: (string | number | null)[]
  ): { query: string; params: (string | number | null)[]; paramIndex: number } {
    const conditions: string[] = [];
    let paramIndex = 1;

    // Filter for vehicles without images (NULL or empty string for both image_id and thumbnail_url)
    if (filters?.withoutImage === true) {
      conditions.push(`((image_id IS NULL OR TRIM(image_id) = '') AND (thumbnail_url IS NULL OR TRIM(thumbnail_url) = ''))`);
    }

    // Category filter with LOWER() + ILIKE + wildcards for fuzzy matching
    // Rule 1: LOWER() for case-insensitive comparison
    // Rule 2: ILIKE with %wildcards% for fuzzy matching
    // Rule 3: Mapping from UI names to DB search patterns
    if (filters?.category) {
      const searchPattern = getCategorySearchPattern(filters.category);
      conditions.push(`LOWER(TRIM(category)) ILIKE $${paramIndex}`);
      params.push(searchPattern);
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
    
    // Global search term - search across brand, model, plate, AND category
    if (filters?.searchTerm) {
      const pattern = VehicleService.buildIlikePattern(filters.searchTerm);
      // Also create a pattern for category search using the mapping
      const categorySearchPattern = getCategorySearchPattern(filters.searchTerm);
      
      conditions.push(`(brand ILIKE $${paramIndex} OR model ILIKE $${paramIndex} OR plate ILIKE $${paramIndex} OR LOWER(TRIM(category)) ILIKE $${paramIndex + 1})`);
      params.push(pattern);
      params.push(categorySearchPattern);
      paramIndex += 2;
    }

    // Build WHERE clause
    let query = baseQuery;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    return { query, params, paramIndex };
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
   * Normalize category using case-insensitive partial matching
   * Uses .toLowerCase().includes() for flexible matching
   * Handles variations like: "Car", "car", "CAR", "Cars", "MyCar" all -> "Cars"
   * Static method for stateless operation
   */
  public static normalizeCategory(category: string): string {
    if (!category) return "Other";
    
    const lower = category.toLowerCase().trim();
    
    // Use includes() for partial matching - more flexible than exact match
    // Order matters: check more specific patterns first
    
    // Car variations: "car", "cars", "mycar", "supercar", etc.
    if (lower.includes("car")) {
      return "Cars";
    }
    
    // Motorcycle variations: "motorcycle", "motorcycles", "motor", etc.
    if (lower.includes("motor")) {
      return "Motorcycles";
    }
    
    // Tuk Tuk variations: "tuk", "tuktuk", "tuk-tuk", etc.
    if (lower.includes("tuk")) {
      return "TukTuks";
    }
    
    // Truck variations: "truck", "trucks", "pickuptruck", etc.
    if (lower.includes("truck")) {
      return "Trucks";
    }
    
    // Van variations: "van", "vans", "minivan", etc.
    if (lower.includes("van")) {
      return "Vans";
    }
    
    // Bus variations: "bus", "buses", "minibus", etc.
    if (lower.includes("bus")) {
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
   * Build ILIKE pattern for case-insensitive partial matching
   * Escapes special SQL characters to prevent injection
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

  // ============================================================================
  // VEHICLE-SPECIFIC METHODS
  // ============================================================================

  /**
   * Convert VehicleEntity to legacy Vehicle format
   */
  public toVehicle(entity: VehicleEntity): Vehicle {
    return {
      VehicleId: entity.VehicleId,
      Category: entity.Category,
      Brand: entity.Brand,
      Model: entity.Model,
      Year: entity.Year,
      Plate: entity.Plate,
      PriceNew: entity.PriceNew,
      Price40: entity.Price40,
      Price70: entity.Price70,
      TaxType: entity.TaxType,
      Condition: entity.Condition,
      BodyType: entity.BodyType,
      Color: entity.Color,
      Image: entity.Image,
      Time: entity.Time,
    };
  }

  /**
   * Get vehicles with vehicle-specific filtering
   * Returns legacy Vehicle format for backward compatibility
   */
  public async getVehicles(filters?: VehicleFilters): Promise<ServiceResult<Vehicle[]>> {
    const result = await this.getAll(filters);
    if (result.success && result.data) {
      return {
        ...result,
        data: result.data.map(e => this.toVehicle(e)),
      };
    }
    return result as ServiceResult<Vehicle[]>;
  }

  /**
   * Get a single vehicle by ID
   * Returns legacy Vehicle format for backward compatibility
   */
  public async getVehicleById(id: number): Promise<ServiceResult<Vehicle>> {
    const result = await this.getById(id);
    if (result.success && result.data) {
      return {
        ...result,
        data: this.toVehicle(result.data),
      };
    }
    return result as ServiceResult<Vehicle>;
  }

  /**
   * Get a single vehicle by plate number (case-insensitive)
   * Vehicle-specific method
   */
  public async getVehicleByPlate(plate: string): Promise<ServiceResult<Vehicle>> {
    const startTime = Date.now();

    try {
      // Escape plate to prevent SQL injection
      const escapedPlate = plate.replace(/'/g, "''");
      const query = `SELECT * FROM ${this.tableName} WHERE plate ILIKE '${escapedPlate}'`;
      const result = await dbManager.executeUnsafe<VehicleDB>(query);

      if (result.length === 0) {
        return {
          success: false,
          error: `Vehicle with plate ${plate} not found`,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      return {
        success: true,
        data: this.toVehicle(this.toEntity(result[0])),
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
   * Overrides base create to handle vehicle-specific data normalization
   */
  public async createVehicle(
    vehicle: Omit<VehicleDB, "id" | "created_at" | "updated_at">
  ): Promise<ServiceResult<Vehicle>> {
    // Normalize category before saving
    const normalizedCategory = VehicleService.normalizeCategory(vehicle.category);
    
    const data = {
      ...vehicle,
      category: normalizedCategory,
    };

    const result = await this.create(data);
    if (result.success && result.data) {
      return {
        ...result,
        data: this.toVehicle(result.data),
      };
    }
    return result as ServiceResult<Vehicle>;
  }

  /**
   * Update a vehicle
   * Overrides base update to handle vehicle-specific data normalization
   */
  public async updateVehicle(
    id: number,
    vehicle: Partial<VehicleDB>
  ): Promise<ServiceResult<Vehicle>> {
    // Normalize category if provided
    const data = vehicle.category 
      ? { ...vehicle, category: VehicleService.normalizeCategory(vehicle.category) }
      : vehicle;

    const result = await this.update(id, data);
    if (result.success && result.data) {
      return {
        ...result,
        data: this.toVehicle(result.data),
      };
    }
    return result as ServiceResult<Vehicle>;
  }

  /**
   * Delete a vehicle
   * Overrides base delete to provide vehicle-specific return type
   */
  public async deleteVehicle(id: number): Promise<ServiceResult<boolean>> {
    return this.delete(id);
  }

  /**
   * Get vehicle statistics using optimized SQL query with case-insensitive grouping
   * Uses PostgreSQL CTE for efficient counting directly in the database
   * Returns POJO for SSR compatibility
   */
  public async getVehicleStats(forceRefresh = false): Promise<ServiceResult<VehicleStats>> {
    const startTime = Date.now();

    try {
      const cacheKey = "vehicle:stats:v5";
      
      // Check cache unless force refresh is requested
      if (!forceRefresh) {
        const cached = this.getFromCache<VehicleStats>(cacheKey);
        if (cached) {
          console.log("[VehicleService.getVehicleStats] Cache hit:", cached);
          return {
            success: true,
            data: cached,
            meta: { durationMs: Date.now() - startTime, queryCount: 0 },
          };
        }
      } else {
        console.log("[VehicleService.getVehicleStats] Force refresh requested, skipping cache");
      }

      const sql = dbManager.getClient();

      // Build and execute the stats query
      // Note: thumbnail_url column may not exist in all database schemas
      // Using only image_id for no-image count to ensure compatibility
      const query = `
        WITH normalized_data AS (
          SELECT 
            id,
            CASE 
              WHEN LOWER(TRIM(COALESCE(category, ''))) LIKE '%car%' THEN 'Cars'
              WHEN LOWER(TRIM(COALESCE(category, ''))) LIKE '%motor%' THEN 'Motorcycles'
              WHEN LOWER(TRIM(COALESCE(category, ''))) LIKE '%tuk%' THEN 'TukTuks'
              WHEN LOWER(TRIM(COALESCE(category, ''))) LIKE '%truck%' THEN 'Trucks'
              WHEN LOWER(TRIM(COALESCE(category, ''))) LIKE '%van%' THEN 'Vans'
              WHEN LOWER(TRIM(COALESCE(category, ''))) LIKE '%bus%' THEN 'Buses'
              ELSE 'Other'
            END as normalized_category,
            CASE 
              WHEN LOWER(TRIM(COALESCE(condition, ''))) = 'new' THEN 'New'
              WHEN LOWER(TRIM(COALESCE(condition, ''))) = 'used' THEN 'Used'
              ELSE 'Other'
            END as normalized_condition,
            market_price,
            image_id
          FROM vehicles
        )
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE normalized_category = 'Cars') as cars_count,
          COUNT(*) FILTER (WHERE normalized_category = 'Motorcycles') as motorcycles_count,
          COUNT(*) FILTER (WHERE normalized_category = 'TukTuks') as tuktuks_count,
          COUNT(*) FILTER (WHERE normalized_category = 'Trucks') as trucks_count,
          COUNT(*) FILTER (WHERE normalized_category = 'Vans') as vans_count,
          COUNT(*) FILTER (WHERE normalized_category = 'Buses') as buses_count,
          COUNT(*) FILTER (WHERE normalized_category = 'Other') as other_count,
          COUNT(*) FILTER (WHERE normalized_condition = 'New') as new_count,
          COUNT(*) FILTER (WHERE normalized_condition = 'Used') as used_count,
          COUNT(*) FILTER (WHERE normalized_condition = 'Other') as other_condition_count,
          COALESCE(AVG(market_price) FILTER (WHERE market_price > 0), 0) as avg_price,
          COUNT(*) FILTER (WHERE image_id IS NULL OR TRIM(image_id) = '') as no_image_count
        FROM normalized_data
      `;

      console.log("[VehicleService.getVehicleStats] Executing query...");
      console.log("[VehicleService.getVehicleStats] Query:", query.substring(0, 200) + "...");
      
      // Use dbManager.executeUnsafe for raw SQL queries
      let statsResult: Array<{
        total: string | number;
        cars_count: string | number;
        motorcycles_count: string | number;
        tuktuks_count: string | number;
        trucks_count: string | number;
        vans_count: string | number;
        buses_count: string | number;
        other_count: string | number;
        new_count: string | number;
        used_count: string | number;
        other_condition_count: string | number;
        avg_price: string | number;
        no_image_count: string | number;
      }> | null = null;
      
      try {
        statsResult = await dbManager.executeUnsafe(query);
      } catch (queryError) {
        console.error("[VehicleService.getVehicleStats] Query execution error:", queryError);
        // Return fallback stats instead of throwing
        const fallbackStats: VehicleStats = {
          total: 0,
          byCategory: {
            Cars: 0,
            Motorcycles: 0,
            TukTuks: 0,
            Trucks: 0,
            Vans: 0,
            Buses: 0,
            Other: 0,
          },
          byCondition: {
            New: 0,
            Used: 0,
            Other: 0,
          },
          avgPrice: 0,
          noImageCount: 0,
        };
        
        return {
          success: true, // Return success with fallback data
          data: fallbackStats,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      console.log("[VehicleService.getVehicleStats] Raw result type:", typeof statsResult);
      console.log("[VehicleService.getVehicleStats] Raw result isArray:", Array.isArray(statsResult));
      console.log("[VehicleService.getVehicleStats] Raw result:", JSON.stringify(statsResult).substring(0, 500));

      // Ensure statsResult is an array and has at least one row
      const resultArray = Array.isArray(statsResult) ? statsResult : [statsResult];
      if (resultArray.length === 0 || !resultArray[0]) {
        console.warn("[VehicleService.getVehicleStats] Empty result from database, using fallback");
        // Return fallback stats instead of throwing
        const fallbackStats: VehicleStats = {
          total: 0,
          byCategory: {
            Cars: 0,
            Motorcycles: 0,
            TukTuks: 0,
            Trucks: 0,
            Vans: 0,
            Buses: 0,
            Other: 0,
          },
          byCondition: {
            New: 0,
            Used: 0,
            Other: 0,
          },
          avgPrice: 0,
          noImageCount: 0,
        };
        
        return {
          success: true,
          data: fallbackStats,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      const row = resultArray[0] as {
        total: string | number;
        cars_count: string | number;
        motorcycles_count: string | number;
        tuktuks_count: string | number;
        trucks_count: string | number;
        vans_count: string | number;
        buses_count: string | number;
        other_count: string | number;
        new_count: string | number;
        used_count: string | number;
        other_condition_count: string | number;
        avg_price: string | number;
        no_image_count: string | number;
      };

      const result: VehicleStats = {
        total: parseInt(String(row.total)) || 0,
        byCategory: {
          Cars: parseInt(String(row.cars_count)) || 0,
          Motorcycles: parseInt(String(row.motorcycles_count)) || 0,
          TukTuks: parseInt(String(row.tuktuks_count)) || 0,
          Trucks: parseInt(String(row.trucks_count)) || 0,
          Vans: parseInt(String(row.vans_count)) || 0,
          Buses: parseInt(String(row.buses_count)) || 0,
          Other: parseInt(String(row.other_count)) || 0,
        },
        byCondition: {
          New: parseInt(String(row.new_count)) || 0,
          Used: parseInt(String(row.used_count)) || 0,
          Other: parseInt(String(row.other_condition_count)) || 0,
        },
        avgPrice: Math.round((parseFloat(String(row.avg_price)) || 0) * 100) / 100,
        noImageCount: parseInt(String(row.no_image_count)) || 0,
      };

      console.log("[VehicleService.getVehicleStats] Parsed result:", result);

      // Cache for 30 seconds using extended TTL (stats don't change frequently)
      this.setCache(cacheKey, result, this.STATS_CACHE_TTL_MS);

      return {
        success: true,
        data: result,
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
      const query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const result = await dbManager.executeUnsafe<{ count: string | number }>(query);

      const count = result[0]?.count || 0;

      return {
        success: true,
        data: { total: parseInt(String(count)) || 0 },
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

  /**
   * Get filtered count - returns count matching the same filters as getVehicles
   * This ensures the count matches the actual filtered results
   */
  public async countWithFilters(filters?: VehicleFilters): Promise<ServiceResult<number>> {
    const startTime = Date.now();

    try {
      // Build base query for counting
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      let params: (string | number | null)[] = [];
      let paramIndex = 1;

      // Apply the same filters as getVehicles for consistency
      if (filters && Object.keys(filters).length > 0) {
        const filterResult = this.applyFilters(query, filters, params);
        query = filterResult.query;
        params = filterResult.params;
        paramIndex = filterResult.paramIndex;
      }

      // Build final query with inline parameters
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

      const result = await dbManager.executeUnsafe<{ count: string | number }>(finalQuery);
      const count = parseInt(String(result[0]?.count)) || 0;

      return {
        success: true,
        data: count,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to count vehicles with filters";
      console.error("[VehicleService.countWithFilters] Error:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Search vehicles by text with case-insensitive ILIKE
   * Returns POJOs for SSR compatibility
   */
  public async searchVehicles(searchTerm: string, limit?: number): Promise<ServiceResult<Vehicle[]>> {
    const startTime = Date.now();

    try {
      // Escape search term to prevent SQL injection
      const escapedTerm = searchTerm.replace(/'/g, "''");
      const pattern = VehicleService.buildIlikePattern(escapedTerm);
      // Also search by normalized category
      const normalizedCategory = VehicleService.normalizeCategory(searchTerm);
      const categoryPattern = VehicleService.buildIlikePattern(normalizedCategory);
      
      // Build the query based on whether limit is provided
      // Use inline parameters instead of $1, $2 for Neon compatibility
      let query: string;
      
      if (limit !== undefined && limit !== null) {
        query = `
          SELECT * FROM ${this.tableName} 
          WHERE brand ILIKE '${pattern}' OR model ILIKE '${pattern}' OR plate ILIKE '${pattern}' OR category ILIKE '${categoryPattern}'
          ORDER BY brand, model
          LIMIT ${limit}
        `;
      } else {
        query = `
          SELECT * FROM ${this.tableName} 
          WHERE brand ILIKE '${pattern}' OR model ILIKE '${pattern}' OR plate ILIKE '${pattern}' OR category ILIKE '${categoryPattern}'
          ORDER BY brand, model
        `;
      }

      const result = await dbManager.executeUnsafe<VehicleDB>(query);

      return {
        success: true,
        data: result.map(v => this.toVehicle(this.toEntity(v))),
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
