/**
 * Vehicles Edge API Route - Neon-Style Serverless Implementation
 * 
 * Features:
 * - Edge runtime for instant cold starts (<50ms)
 * - Direct SQL template literals (Neon style)
 * - Streaming JSON responses
 * - Cursor-based pagination
 * - No complex abstraction layers
 * 
 * @module api/vehicles/edge
 */

export const runtime = 'edge';
export const preferredRegion = 'iad1'; // US East (N. Virginia) - closest to Neon DB

import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Database Connection (Neon Style)
// ============================================================================

/**
 * Get Neon SQL client - Edge compatible
 * Uses DATABASE_URL directly like Neon docs recommend
 */
function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not configured");
  }

  // Add sdk_semver for Neon API compatibility
  const url = new URL(databaseUrl);
  url.searchParams.set('sdk_semver', '1.0.2');
  
  return neon(url.toString());
}

/**
 * Escape string for safe SQL insertion
 * Prevents SQL injection when using unsafe queries
 */
function escapeSqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'NULL';
  // Escape single quotes by doubling them
  return "'" + String(value).replace(/'/g, "''") + "'";
}

/**
 * Build INSERT query with inlined parameters for Neon unsafe()
 * Neon unsafe() doesn't support parameterized queries, so we inline values safely
 */
function buildInsertQuery(table: string, data: Record<string, unknown>): string {
  const columns = Object.keys(data);
  const values = Object.values(data).map(v => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return escapeSqlString(String(v));
  });
  
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING *`;
}

/**
 * Build WHERE clause with inlined parameters
 */
function buildWhereClause(conditions: string[], params: (string | number | null)[]): string {
  if (conditions.length === 0) return '';

  const inlinedConditions = conditions.map((rawCondition) => {
    let condition = rawCondition;

    params.forEach((param, index) => {
      const placeholderRegex = new RegExp(`\\$${index + 1}(?!\\d)`, "g");
      let replacement: string;

      if (param === null || param === undefined) {
        replacement = "NULL";
      } else if (typeof param === "number") {
        replacement = String(param);
      } else {
        replacement = escapeSqlString(String(param));
      }

      condition = condition.replace(placeholderRegex, replacement);
    });

    const unresolved = condition.match(/\$\d+\b/g);
    if (unresolved) {
      throw new Error(`Unresolved SQL placeholders: ${unresolved.join(", ")}`);
    }

    return condition;
  });

  return `WHERE ${inlinedConditions.join(" AND ")}`;
}

// ============================================================================
// Types
// ============================================================================

interface VehicleDB {
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

interface VehicleResponse {
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize category using case-insensitive matching
 */
function normalizeCategory(category: string): string {
  if (!category) return "Other";
  const lower = category.toLowerCase().trim();
  
  if (lower.includes("car")) return "Cars";
  if (lower.includes("motor")) return "Motorcycles";
  if (lower.includes("tuk")) return "TukTuks";
  if (lower.includes("truck")) return "Trucks";
  if (lower.includes("van")) return "Vans";
  if (lower.includes("bus")) return "Buses";
  
  return category.trim().charAt(0).toUpperCase() + category.trim().slice(1).toLowerCase();
}

/**
 * Calculate depreciated prices
 */
function calculatePrices(marketPrice: number): { price40: number; price70: number } {
  return {
    price40: Math.round(marketPrice * 0.4 * 100) / 100,
    price70: Math.round(marketPrice * 0.7 * 100) / 100,
  };
}

/**
 * Transform DB record to API response
 */
function transformVehicle(dbVehicle: VehicleDB): VehicleResponse {
  const { price40, price70 } = calculatePrices(dbVehicle.market_price || 0);
  
  // Use thumbnail_url if valid, otherwise image_id
  const thumbnailUrl = dbVehicle.thumbnail_url?.trim();
  const hasValidThumbnail = thumbnailUrl && (
    thumbnailUrl.startsWith("http://") || 
    thumbnailUrl.startsWith("https://") || 
    thumbnailUrl.startsWith("data:")
  );
  
  const imageId = dbVehicle.image_id?.trim() || "";
  const isImageIdUrl = imageId && (
    imageId.startsWith("http://") || 
    imageId.startsWith("https://") || 
    imageId.startsWith("data:")
  );
  
  return {
    VehicleId: String(dbVehicle.id),
    Category: normalizeCategory(dbVehicle.category),
    Brand: dbVehicle.brand || "",
    Model: dbVehicle.model || "",
    Year: dbVehicle.year || null,
    Plate: dbVehicle.plate || "",
    PriceNew: dbVehicle.market_price || 0,
    Price40: price40,
    Price70: price70,
    TaxType: dbVehicle.tax_type || "",
    Condition: dbVehicle.condition || "",
    BodyType: dbVehicle.body_type || "",
    Color: dbVehicle.color || "",
    Image: hasValidThumbnail ? thumbnailUrl : (isImageIdUrl ? imageId : imageId),
    Time: dbVehicle.created_at || new Date().toISOString(),
  };
}

/**
 * Build ILIKE pattern for case-insensitive search
 */
function buildIlikePattern(searchTerm: string): string {
  if (!searchTerm) return "%";
  const escaped = searchTerm
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
  return `%${escaped}%`;
}

// ============================================================================
// GET Handler - List Vehicles with Cursor Pagination
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse pagination
    const cursor = searchParams.get("cursor");
const limit = Math.min(parseInt(searchParams.get("limit") || "500", 10), 1000); // Increased for pagination fix (DB total 1218)
    
    // Parse filters
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const searchTerm = searchParams.get("search");
    
    const sql = getSqlClient();
    
    // Build dynamic WHERE conditions with parameterized queries
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;
    
    // Category filter
    if (category && category !== "All") {
      conditions.push(`LOWER(TRIM(category)) ILIKE $${paramIndex}`);
      params.push(`%${category.toLowerCase()}%`);
      paramIndex++;
    }
    
    // Brand filter
    if (brand && brand !== "All") {
      conditions.push(`brand ILIKE $${paramIndex}`);
      params.push(`%${brand}%`);
      paramIndex++;
    }
    
    // Search term (brand, model, plate, category, year, color, body_type)
    // EXPANDED: Now searches across more fields to find newly added vehicles
    if (searchTerm) {
      // Check if search term is a number (could be year or price)
      const isNumeric = !isNaN(parseInt(searchTerm));
      const numericValue = isNumeric ? parseInt(searchTerm) : null;
      
      const searchConditions = [
        `brand ILIKE $${paramIndex}`,
        `model ILIKE $${paramIndex}`,
        `plate ILIKE $${paramIndex}`,
        `category ILIKE $${paramIndex}`,
        `color ILIKE $${paramIndex}`,
        `body_type ILIKE $${paramIndex}`
      ];
      
      // If numeric, also search year and price ranges
      if (isNumeric && numericValue) {
        searchConditions.push(`year = ${numericValue}`);
        searchConditions.push(`market_price BETWEEN ${numericValue * 0.9} AND ${numericValue * 1.1}`);
      }
      
      conditions.push(`(${searchConditions.join(' OR ')})`);
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }
    
    // Cursor condition for pagination
    if (cursor) {
      conditions.push(`id > $${paramIndex}`);
      params.push(parseInt(cursor, 10));
      paramIndex++;
    }
    
    // Build WHERE clause with inlined parameters
    const whereClause = buildWhereClause(conditions, params);
    
    // Execute main query using sql.query() with empty params (already inlined)
    const mainQuery = `
      SELECT 
        id, category, brand, model, year, plate, 
        market_price, tax_type, condition, 
        body_type, color, image_id, thumbnail_url,
        created_at, updated_at
      FROM vehicles
      ${whereClause}
      ORDER BY id ASC
      LIMIT ${limit + 1}
    `;
    
    const vehiclesResult = await (sql as unknown as { 
      query: <T>(query: string, params: unknown[]) => Promise<T[]> 
    }).query<VehicleDB>(mainQuery, []);
    
    const vehicles = vehiclesResult || [];
    
    // Check if there are more results
    const hasMore = vehicles.length > limit;
    const results = hasMore ? vehicles.slice(0, limit) : vehicles;
    const nextCursor = hasMore ? String(results[results.length - 1]?.id) : undefined;
    
    // Transform to API format
    const data = results.map((v) => transformVehicle(v));
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM vehicles ${whereClause}`;
    const countResult = await (sql as unknown as { 
      query: <T>(query: string, params: unknown[]) => Promise<T[]> 
    }).query<{ count: string }>(countQuery, []);
    
    const total = parseInt(countResult[0]?.count || "0", 10);
    
    const durationMs = Date.now() - startTime;
    
    // Build response
    const response = {
      success: true,
      data,
      meta: {
        total,
        returned: data.length,
        limit,
        cursor,
        nextCursor,
        hasMore,
        durationMs,
        requestId,
      },
    };
    
    // Return with caching headers
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
        "X-Request-ID": requestId,
        "X-Response-Time": `${durationMs}ms`,
      },
    });
    
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[Vehicles Edge API] Error: ${errorMessage}`, {
      requestId,
      durationMs,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        meta: {
          durationMs,
          requestId,
        },
      },
      {
        status: 500,
        headers: {
          "X-Request-ID": requestId,
          "X-Response-Time": `${durationMs}ms`,
        },
      }
    );
  }
}

// ============================================================================
// POST Handler - Create Vehicle
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    const body = await request.json();
    
    // Validate required fields
    const required = ["category", "brand", "model", "year", "plate"];
    const missing = required.filter(field => !body[field]);
    
    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missing.join(", ")}`,
        },
        { status: 400 }
      );
    }
    
    const sql = getSqlClient();
    
    // Build INSERT data
    const insertData: Record<string, unknown> = {
      category: normalizeCategory(body.category),
      brand: body.brand || "",
      model: body.model || "",
      year: parseInt(body.year, 10),
      plate: body.plate || "",
      market_price: parseInt(body.market_price || 0, 10),
      tax_type: body.tax_type || null,
      condition: body.condition || "Other",
      body_type: body.body_type || null,
      color: body.color || null,
      image_id: body.image_id || null,
      thumbnail_url: body.thumbnail_url || null,
    };
    
    // Build INSERT query with parameterized values
    const columns = Object.keys(insertData);
    const values = Object.values(insertData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const insertQuery = `
      INSERT INTO vehicles (${columns.join(', ')}) 
      VALUES (${placeholders}) 
      RETURNING *
    `;
    
    // Use sql.query() with parameters - this is the correct Neon SDK API
    const insertResult = await (sql as unknown as { 
      query: <T>(query: string, params: unknown[]) => Promise<T[]> 
    }).query<VehicleDB>(insertQuery, values);
    
    const vehicle = insertResult[0];
    if (!vehicle) {
      console.error('[Vehicles Edge API] No vehicle returned from INSERT');
      throw new Error("Failed to create vehicle - no data returned");
    }
    
    const durationMs = Date.now() - startTime;
    
    return NextResponse.json(
      {
        success: true,
        data: transformVehicle(vehicle),
        meta: {
          durationMs,
          requestId,
        },
      },
      {
        headers: {
          "Cache-Control": "no-cache",
          "X-Request-ID": requestId,
        },
      }
    );
    
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        meta: {
          durationMs,
          requestId,
        },
      },
      { status: 500 }
    );
  }
}

