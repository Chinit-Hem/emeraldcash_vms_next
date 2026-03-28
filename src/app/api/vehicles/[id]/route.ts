import {
  requireSession,
} from "@/lib/auth";
import type { Vehicle } from "@/lib/types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getVehicleById, updateVehicle, deleteVehicle, toVehicle as dbToVehicle } from "@/lib/db-schema";
// MEMORY OPTIMIZATION: Lazy import deleteImage to avoid loading Cloudinary SDK unnecessarily
const deleteImage = async (publicId: string): Promise<{ success: boolean; error?: string }> => {
  const { deleteImage: cloudinaryDelete } = await import("@/lib/cloudinary");
  return cloudinaryDelete(publicId);
};

import { clearCachedVehicles, getCachedVehicles } from "../_cache";



// Input validation helper
function sanitizeString(value: unknown, maxLength = 1000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

// Helper function removed - was not used

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }

  const { id } = await params;

  // Validate ID format
  const safeId = sanitizeString(id, 100);
  if (!safeId) {
    return NextResponse.json({ ok: false, error: "Invalid vehicle ID" }, { status: 400 });
  }

  try {
    // Try to fetch from Neon database first
    const vehicleId = parseInt(safeId, 10);
    if (!isNaN(vehicleId)) {
      const dbVehicle = await getVehicleById(vehicleId);
      if (dbVehicle) {
        const vehicle = dbToVehicle(dbVehicle) as Vehicle;
        return NextResponse.json({ ok: true, data: vehicle });
      }
    }

    // Fallback: try cached vehicles
    const cachedVehicles = getCachedVehicles();
    if (cachedVehicles) {
      const cached = cachedVehicles.find((vehicle) => vehicle.VehicleId === safeId);
      if (cached) {
        return NextResponse.json({ ok: true, data: cached });
      }
    }

    // If not found in database or cache, return 404
    return NextResponse.json({ ok: false, error: "Vehicle not found" }, { status: 404 });
  } catch (_e) {
    return NextResponse.json(
      { ok: false, error: _e instanceof Error ? _e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Constants for timeout configuration
// Note: Image uploads are now handled directly by the frontend to Cloudinary
// This API only receives the image URL and updates the database
const DB_TIMEOUT_MS = 30000; // 30 seconds for database operations (increased from 5000)
const TOTAL_TIMEOUT_MS = 35000; // 35 seconds total request timeout (increased to accommodate DB operations)

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Set up total request timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${TOTAL_TIMEOUT_MS}ms`)), TOTAL_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      handlePutRequest(req, params),
      timeoutPromise
    ]);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check if it's a timeout error
    if (errorMessage.includes("timeout")) {
      return NextResponse.json(
        { 
          ok: false, 
          error: "Request timeout. The database operation took too long to complete. Please try again.",
          details: {
            type: "timeout_error",
            message: errorMessage
          }
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { 
        ok: false, 
        error: errorMessage,
        details: {
          type: "request_error"
        }
      },
      { status: 500 }
    );
  }
}

async function handlePutRequest(
  req: NextRequest,
  params: Promise<{ id: string }>
) {
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }

  if (session.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Validate ID format
  const safeId = sanitizeString(id, 100);
  if (!safeId) {
    return NextResponse.json({ ok: false, error: "Invalid vehicle ID" }, { status: 400 });
  }

  const vehicleId = parseInt(safeId, 10);
  if (isNaN(vehicleId)) {
    return NextResponse.json({ ok: false, error: "Invalid vehicle ID format" }, { status: 400 });
  }

  // This API now only accepts JSON (no FormData)
  // Image uploads are handled directly by the frontend to Cloudinary
  const contentType = req.headers.get("content-type") || "";
  
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { ok: false, error: "This API only accepts JSON. Image uploads should be done directly to Cloudinary from the frontend." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Validate required fields (check both capitalized and lowercase keys)
  const category = sanitizeString(body.Category) || sanitizeString(body.category);
  const brand = sanitizeString(body.Brand) || sanitizeString(body.brand);
  const model = sanitizeString(body.Model) || sanitizeString(body.model);

  if (!category || !brand || !model) {
    return NextResponse.json(
      { ok: false, error: "Category, Brand, and Model are required" },
      { status: 400 }
    );
  }

  // Validate numeric fields (check both capitalized and lowercase keys)
  const year = sanitizeNumber(body.Year) ?? sanitizeNumber(body.year);
  const priceNew = sanitizeNumber(body.PriceNew) ?? sanitizeNumber(body.market_price) ?? sanitizeNumber(body.price_new);

  if (year !== null && (year < 1900 || year > new Date().getFullYear() + 2)) {
    return NextResponse.json(
      { ok: false, error: "Invalid year" },
      { status: 400 }
    );
  }

  if (priceNew !== null && priceNew < 0) {
    return NextResponse.json(
      { ok: false, error: "Price must be positive" },
      { status: 400 }
    );
  }

  // Get image_id from the request (should be a Cloudinary URL from frontend)
  // The frontend uploads directly to Cloudinary and sends us the URL
  const imageId = sanitizeString(body.image_id) || 
                  sanitizeString(body.imageId) || 
                  sanitizeString(body.Image) || 
                  null;

  // Prepare update data (check both capitalized and lowercase keys)
  const updateData: Parameters<typeof updateVehicle>[1] = {
    category,
    brand,
    model,
    year: year || new Date().getFullYear(),
    plate: sanitizeString(body.Plate) || sanitizeString(body.plate),
    market_price: priceNew || 0,
    tax_type: sanitizeString(body.TaxType) || sanitizeString(body.tax_type),
    condition: sanitizeString(body.Condition) || sanitizeString(body.condition) || "New",
    body_type: sanitizeString(body.BodyType) || sanitizeString(body.body_type),
    color: sanitizeString(body.Color) || sanitizeString(body.color),
    thumbnail_url: sanitizeString(body.ThumbnailUrl) || sanitizeString(body.thumbnail_url) || null,
  };

  // Add image_id if provided (should be a Cloudinary URL from frontend)
  if (imageId) {
    updateData.image_id = imageId;
  }

  // Update vehicle in database with timeout
  let updatedVehicle;
  
  try {
    updatedVehicle = await Promise.race([
      updateVehicle(vehicleId, updateData),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Database timeout after ${DB_TIMEOUT_MS}ms`)), DB_TIMEOUT_MS)
      )
    ]);
  } catch (dbError) {
    const errorMessage = dbError instanceof Error ? dbError.message : "Unknown database error";
    
    return NextResponse.json(
      { 
        ok: false, 
        error: `Database update failed: ${errorMessage}`,
        details: {
          type: "database_error",
          message: errorMessage
        }
      },
      { status: 503 }
    );
  }

  if (!updatedVehicle) {
    return NextResponse.json({ ok: false, error: "Vehicle not found" }, { status: 404 });
  }

  // Convert to API format
  const responseVehicle = dbToVehicle(updatedVehicle);

  // Clear server-side cache and revalidate
  clearCachedVehicles();
  
  // Revalidate Next.js cache tags
  try {
    revalidateTag('vehicles', {});
  } catch {
    // Silently handle revalidation errors
  }
  
  return NextResponse.json({ ok: true, data: responseVehicle });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }

  if (session.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Validate ID format
  const safeId = sanitizeString(id, 100);
  if (!safeId) {
    return NextResponse.json({ ok: false, error: "Invalid vehicle ID" }, { status: 400 });
  }

  const vehicleId = parseInt(safeId, 10);
  if (isNaN(vehicleId)) {
    return NextResponse.json({ ok: false, error: "Invalid vehicle ID format" }, { status: 400 });
  }

  try {
    // First, get the vehicle to check if it has an image to delete from Cloudinary
    const vehicle = await getVehicleById(vehicleId);
    
    if (!vehicle) {
      return NextResponse.json({ ok: false, error: "Vehicle not found" }, { status: 404 });
    }

    // If vehicle has a Cloudinary image, delete it
    if (vehicle.image_id) {
      // Check if it's a Cloudinary URL (not a Google Drive ID) - guard against "undefined"/"null" strings
      if (vehicle.image_id !== 'undefined' && 
          vehicle.image_id !== 'null' && 
          vehicle.image_id.includes('cloudinary.com')) {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{public_id}
        const urlParts = vehicle.image_id.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0]; // Remove file extension
        const folder = urlParts[urlParts.length - 2];
        const fullPublicId = `${folder}/${publicId}`;
        
        // Delete image from Cloudinary (continue even if it fails)
        await deleteImage(fullPublicId);
      }
    }

    // Delete vehicle from database
    const deleted = await deleteVehicle(vehicleId);
    
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Failed to delete vehicle" }, { status: 500 });
    }

    // Clear server-side cache and revalidate
    clearCachedVehicles();
    
    // Revalidate Next.js cache tags
    try {
      revalidateTag('vehicles', {});
  } catch (_e) {
    // Silently handle revalidation errors
  }
    
    return NextResponse.json({ ok: true, data: null });
  } catch (_e: unknown) {
    const message = _e instanceof Error ? _e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
