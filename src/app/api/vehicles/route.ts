/**
 * Vehicles API Route - OOAD Service Layer Implementation
 * 
 * Demonstrates professional API design using VehicleService:
 * - Singleton service for business logic
 * - Case-insensitive ILIKE filtering with TRIM()
 * - SSR-optimized responses
 * - Comprehensive error handling with withErrorHandling wrapper
 * - SQL injection protection via parameterized queries
 * - Defensive programming patterns
 * 
 * @module api/vehicles
 */

import { NextRequest, NextResponse } from "next/server";
import { vehicleService } from "@/services/VehicleService";
import { dbManager } from "@/lib/db-singleton";
import type { VehicleFilters } from "@/services/VehicleService";
import { withErrorHandling, createSuccessResponse, createErrorResponse } from "@/lib/api-error-wrapper";

// ============================================================================
// CORS Configuration
// ============================================================================

/**
 * Build CORS headers for cross-origin requests
 */
function buildCorsHeaders(req: NextRequest): Headers {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  const vercelOrigin = vercelUrl
    ? vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`
    : "";
  const requestOrigin = req.headers.get("origin") || "";
  const allowedOrigin = appOrigin || vercelOrigin || requestOrigin || "*";

  const headers = new Headers({
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  });

  if (allowedOrigin !== "*") {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
}

// ============================================================================
// OPTIONS Handler (CORS Preflight)
// ============================================================================

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req),
  });
}

// ============================================================================
// GET Handler - List/Search Vehicles
// ============================================================================

/**
 * GET /api/vehicles
 * 
 * Query Parameters:
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 * - category: string (case-insensitive)
 * - brand: string (case-insensitive, partial match)
 * - model: string (case-insensitive, partial match)
 * - condition: "New" | "Used" | "Other"
 * - yearMin: number
 * - yearMax: number
 * - priceMin: number
 * - priceMax: number
 * - color: string
 * - bodyType: string
 * - taxType: string
 * - searchTerm: string (searches brand, model, plate)
 * - orderBy: string (default: "id")
 * - orderDirection: "ASC" | "DESC" (default: "ASC")
 * 
 * Returns:
 * - success: boolean
 * - data: Vehicle[]
 * - meta: { total, limit, offset, durationMs, queryCount }
 */
const getHandler = withErrorHandling(async (req, { logger, requestId, startTime }) => {
  // Log request details
  logger.debug("Parsing query parameters", {
    url: req.url,
  });

  // Parse query parameters with validation
  const { searchParams } = new URL(req.url);
  
  const filters: VehicleFilters = {
    limit: Math.min(parseInt(searchParams.get("limit") || "100", 10), 1000), // Max 1000
    offset: Math.max(parseInt(searchParams.get("offset") || "0", 10), 0), // Min 0
    orderBy: searchParams.get("orderBy") || "id",
    orderDirection: (searchParams.get("orderDirection") as "ASC" | "DESC") || "ASC",
  };

  // Validate orderDirection
  if (!["ASC", "DESC"].includes(filters.orderDirection)) {
    return createErrorResponse(
      "Invalid orderDirection. Must be 'ASC' or 'DESC'.",
      requestId,
      Date.now() - startTime,
      400,
      buildCorsHeaders(req)
    );
  }

  // Optional filters (only add if provided)
  const category = searchParams.get("category");
  if (category) filters.category = category;

  const brand = searchParams.get("brand");
  if (brand) filters.brand = brand;

  const model = searchParams.get("model");
  if (model) filters.model = model;

  const condition = searchParams.get("condition");
  if (condition) filters.condition = condition;

  const yearMin = searchParams.get("yearMin");
  if (yearMin) {
    const year = parseInt(yearMin, 10);
    if (isNaN(year) || year < 1900 || year > 2100) {
      return createErrorResponse(
        "Invalid yearMin. Must be between 1900 and 2100.",
        requestId,
        Date.now() - startTime,
        400,
        buildCorsHeaders(req)
      );
    }
    filters.yearMin = year;
  }

  const yearMax = searchParams.get("yearMax");
  if (yearMax) {
    const year = parseInt(yearMax, 10);
    if (isNaN(year) || year < 1900 || year > 2100) {
      return createErrorResponse(
        "Invalid yearMax. Must be between 1900 and 2100.",
        requestId,
        Date.now() - startTime,
        400,
        buildCorsHeaders(req)
      );
    }
    filters.yearMax = year;
  }

  const priceMin = searchParams.get("priceMin");
  if (priceMin) {
    const price = parseInt(priceMin, 10);
    if (isNaN(price) || price < 0) {
      return createErrorResponse(
        "Invalid priceMin. Must be a positive number.",
        requestId,
        Date.now() - startTime,
        400,
        buildCorsHeaders(req)
      );
    }
    filters.priceMin = price;
  }

  const priceMax = searchParams.get("priceMax");
  if (priceMax) {
    const price = parseInt(priceMax, 10);
    if (isNaN(price) || price < 0) {
      return createErrorResponse(
        "Invalid priceMax. Must be a positive number.",
        requestId,
        Date.now() - startTime,
        400,
        buildCorsHeaders(req)
      );
    }
    filters.priceMax = price;
  }

  const color = searchParams.get("color");
  if (color) filters.color = color;

  const bodyType = searchParams.get("bodyType");
  if (bodyType) filters.bodyType = bodyType;

  const taxType = searchParams.get("taxType");
  if (taxType) filters.taxType = taxType;

  const searchTerm = searchParams.get("searchTerm");
  if (searchTerm) filters.searchTerm = searchTerm;

  // Handle withoutImage filter
  const withoutImage = searchParams.get("withoutImage");
  if (withoutImage === "1" || withoutImage === "true") {
    filters.withoutImage = true;
  }

  // When any filter is active, increase the limit to ensure all matching records are returned
  const hasActiveFilters = category || brand || model || condition || 
                         yearMin || yearMax || priceMin || priceMax || 
                         color || bodyType || taxType || searchTerm || filters.withoutImage;
  
  if (hasActiveFilters && !filters.limit) {
    filters.limit = 10000; // Get all matching records
  }

  logger.debug("Executing database queries", { filters });

  // Execute queries in parallel for better performance
  const [vehiclesResult, countResult, statsResult] = await Promise.all([
    vehicleService.getVehicles(filters),
    // Use filtered count to match the actual query results
    vehicleService.countWithFilters(filters),
    // Skip expensive stats if in lite mode (no filters except pagination)
    (filters.category || filters.brand || filters.model || filters.condition || 
     filters.searchTerm || filters.yearMin || filters.yearMax || 
     filters.priceMin || filters.priceMax || filters.color || 
     filters.bodyType || filters.taxType || filters.withoutImage)
      ? Promise.resolve({ success: true, data: null }) // Skip stats for filtered queries
      : vehicleService.getVehicleStats(),
  ]);

  if (!vehiclesResult.success) {
    // Log the service error but return sanitized message to user
    logger.error("Vehicle service returned error", new Error(vehiclesResult.error || "Unknown error"), {
      filters,
      queryCount: vehiclesResult.meta?.queryCount,
    });
    
    return createErrorResponse(
      "Failed to fetch vehicles. Please try again later.",
      requestId,
      Date.now() - startTime,
      500,
      buildCorsHeaders(req)
    );
  }

  // Use filtered count for accurate pagination
  const total = countResult.success ? (countResult.data || 0) : 0;
  const stats = statsResult.success ? statsResult.data : null;

  logger.info("Successfully fetched vehicles", {
    count: vehiclesResult.data?.length,
    total,
    filters: Object.keys(filters).filter(k => k !== 'limit' && k !== 'offset'),
  });

  return createSuccessResponse(
    vehiclesResult.data,
    requestId,
    Date.now() - startTime,
    {
      total,
      limit: filters.limit,
      offset: filters.offset,
      totalPages: Math.ceil(total / (filters.limit || 100)),
      queryCount: vehiclesResult.meta?.queryCount || 0,
      cacheHit: vehiclesResult.meta?.cacheHit || false,
      // Include category and condition counts for KPIs
      countsByCategory: stats ? {
        Cars: stats.byCategory?.Cars || 0,
        Motorcycles: stats.byCategory?.Motorcycles || 0,
        TukTuks: stats.byCategory?.TukTuks || 0,
      } : undefined,
      countsByCondition: stats ? {
        New: stats.byCondition?.New || 0,
        Used: stats.byCondition?.Used || 0,
      } : undefined,
      avgPrice: stats?.avgPrice,
      noImageCount: stats?.noImageCount,
    },
    buildCorsHeaders(req)
  );
}, { context: "vehicles-api", timeoutMs: 30000 });

export { getHandler as GET };

// ============================================================================
// POST Handler - Create Vehicle
// ============================================================================

/**
 * POST /api/vehicles
 * 
 * Body: Partial<VehicleDB> (without id, created_at, updated_at)
 * Supports both JSON and FormData (with image file upload)
 * 
 * Returns:
 * - success: boolean
 * - data: Vehicle (created)
 * - meta: { durationMs, queryCount }
 */
const postHandler = withErrorHandling(async (req, { logger, requestId, startTime }) => {
  // Check if request is FormData or JSON
  const contentType = req.headers.get("content-type") || "";
  const isFormData = contentType.includes("multipart/form-data");
  
  let vehicleData: Record<string, unknown>;
  let imageFile: File | null = null;
  
  if (isFormData) {
    // Handle FormData with potential image upload
    const formData = await req.formData();
    
    // Extract vehicle data from form fields
    vehicleData = {};
    formData.forEach((value, key) => {
      if (key === "image" && value instanceof File) {
        imageFile = value;
      } else {
        vehicleData[key] = value;
      }
    });
    
    logger.debug("Processing FormData request", {
      hasImage: !!imageFile,
      imageSize: imageFile?.size,
      fields: Object.keys(vehicleData),
    });
  } else {
    // Handle JSON request
    try {
      vehicleData = await req.json();
      logger.debug("Processing JSON request", {
        fields: Object.keys(vehicleData),
      });
    } catch (parseError) {
      return createErrorResponse(
        "Invalid JSON in request body",
        requestId,
        Date.now() - startTime,
        400,
        buildCorsHeaders(req)
      );
    }
  }
  
  // Validate required fields
  const requiredFields = ["category", "brand", "model", "year", "plate"];
  const missingFields = requiredFields.filter(field => !vehicleData[field]);
  
  if (missingFields.length > 0) {
    return createErrorResponse(
      `Missing required fields: ${missingFields.join(", ")}`,
      requestId,
      Date.now() - startTime,
      400,
      buildCorsHeaders(req)
    );
  }
  
  // Validate year is reasonable
  const year = parseInt(vehicleData.year as string, 10);
  if (isNaN(year) || year < 1900 || year > 2100) {
    return createErrorResponse(
      "Invalid year. Must be between 1900 and 2100.",
      requestId,
      Date.now() - startTime,
      400,
      buildCorsHeaders(req)
    );
  }
  
  // Validate market price if provided
  const marketPrice = vehicleData.market_price || vehicleData.marketPrice;
  if (marketPrice !== undefined) {
    const price = parseInt(marketPrice as string, 10);
    if (isNaN(price) || price < 0) {
      return createErrorResponse(
        "Invalid market price. Must be a positive number.",
        requestId,
        Date.now() - startTime,
        400,
        buildCorsHeaders(req)
      );
    }
  }
  
  // Create vehicle through service layer
  logger.info("Creating new vehicle", {
    plate: vehicleData.plate,
    category: vehicleData.category,
    brand: vehicleData.brand,
  });
  
  const result = await vehicleService.createVehicle({
    category: vehicleData.category as string,
    brand: vehicleData.brand as string,
    model: vehicleData.model as string,
    year: year,
    plate: vehicleData.plate as string,
    market_price: marketPrice as number,
    tax_type: (vehicleData.tax_type as string) || (vehicleData.taxType as string),
    condition: vehicleData.condition as "New" | "Used" | "Other",
    body_type: (vehicleData.body_type as string) || (vehicleData.bodyType as string),
    color: vehicleData.color as string,
    image_id: (vehicleData.image_id as string) || (vehicleData.imageId as string),
    thumbnail_url: (vehicleData.thumbnail_url as string) || (vehicleData.thumbnailUrl as string),
  });
  
  if (!result.success) {
    logger.error("Failed to create vehicle", new Error(result.error || "Unknown error"), {
      plate: vehicleData.plate,
    });
    
    return createErrorResponse(
      result.error || "Failed to create vehicle. Please try again.",
      requestId,
      Date.now() - startTime,
      500,
      buildCorsHeaders(req)
    );
  }
  
  logger.info("Vehicle created successfully", {
    vehicleId: result.data?.VehicleId,
    plate: result.data?.Plate,
  });
  
  return createSuccessResponse(
    result.data,
    requestId,
    Date.now() - startTime,
    {
      queryCount: result.meta?.queryCount || 0,
    },
    buildCorsHeaders(req)
  );
}, { context: "vehicles-api-create", timeoutMs: 30000 });

export { postHandler as POST };

// ============================================================================
// PUT Handler - Update Vehicle
// ============================================================================

/**
 * PUT /api/vehicles?id={number}
 * 
 * Query Parameters:
 * - id: number (required)
 * 
 * Body: Partial<VehicleDB>
 * 
 * Returns:
 * - success: boolean
 * - data: Vehicle (updated)
 * - meta: { durationMs, queryCount }
 */
export async function PUT(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "", 10);

    if (!id || isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid vehicle ID is required",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 0,
          },
        },
        {
          status: 400,
          headers: buildCorsHeaders(req),
        }
      );
    }

    const body = await req.json();

    // Update vehicle through service layer
    const result = await vehicleService.updateVehicle(id, {
      category: body.category,
      brand: body.brand,
      model: body.model,
      year: body.year,
      plate: body.plate,
      market_price: body.market_price || body.marketPrice,
      tax_type: body.tax_type || body.taxType,
      condition: body.condition,
      body_type: body.body_type || body.bodyType,
      color: body.color,
      image_id: body.image_id || body.imageId,
      thumbnail_url: body.thumbnail_url || body.thumbnailUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to update vehicle",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: result.meta?.queryCount || 0,
          },
        },
        {
          status: result.error?.includes("not found") ? 404 : 500,
          headers: buildCorsHeaders(req),
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: result.meta?.queryCount || 0,
        },
      },
      {
        headers: buildCorsHeaders(req),
      }
    );
  } catch (error) {
    console.error("[API /vehicles PUT] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 0,
        },
      },
      {
        status: 500,
        headers: buildCorsHeaders(req),
      }
    );
  }
}

// ============================================================================
// DELETE Handler - Delete Vehicle
// ============================================================================

/**
 * DELETE /api/vehicles?id={number}
 * 
 * Query Parameters:
 * - id: number (required)
 * 
 * Returns:
 * - success: boolean
 * - data: boolean (true if deleted)
 * - meta: { durationMs, queryCount }
 */
export async function DELETE(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "", 10);

    if (!id || isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid vehicle ID is required",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 0,
          },
        },
        {
          status: 400,
          headers: buildCorsHeaders(req),
        }
      );
    }

    // Delete vehicle through service layer
    const result = await vehicleService.deleteVehicle(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to delete vehicle",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: result.meta?.queryCount || 0,
          },
        },
        {
          status: 500,
          headers: buildCorsHeaders(req),
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: result.meta?.queryCount || 0,
        },
      },
      {
        headers: buildCorsHeaders(req),
      }
    );
  } catch (error) {
    console.error("[API /vehicles DELETE] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 0,
        },
      },
      {
        status: 500,
        headers: buildCorsHeaders(req),
      }
    );
  }
}
