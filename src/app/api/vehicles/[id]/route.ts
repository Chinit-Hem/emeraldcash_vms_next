
import {
  requireSession,
} from "@/lib/auth";
import { normalizeCambodiaTimeString } from "@/lib/cambodiaTime";
import { extractDriveFileId } from "@/lib/drive";
import type { Vehicle } from "@/lib/types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getVehicleById, updateVehicle, deleteVehicle, toVehicle as dbToVehicle } from "@/lib/db-schema";
import { uploadImage, getCloudinaryFolder, deleteImage } from "@/lib/cloudinary";

import { clearCachedVehicles, getCachedVehicles } from "../_cache";
import {
  appsScriptUrl,
  driveFolderIdForCategory,
  driveThumbnailUrl,
  fetchAppsScript,
  toAppsScriptPayload,
  toVehicle as sharedToVehicle,
} from "../_shared";



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

function toIntOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchAllVehicleRows(baseUrl: string, cache: RequestCache): Promise<Record<string, unknown>[]> {
  const requestedLimit = 500;
  const maxPages = 50; // 50 * 500 = 25k rows safety cap

  let offset = 0;
  let total: number | null = null;
  let lastMetaOffset: number | null = null;
  const allRows: Record<string, unknown>[] = [];

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(appsScriptUrl(baseUrl, "getVehicles"));
    url.searchParams.set("limit", String(requestedLimit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url.toString(), { cache });
    if (!res.ok) throw new Error(`Failed to fetch vehicles: ${res.status}`);

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (json.ok === false) {
      const message = typeof json.error === "string" && json.error.trim() ? json.error.trim() : "Apps Script ok=false";
      throw new Error(message);
    }

    const rows = (Array.isArray(json.data) ? (json.data as unknown[]) : [])
      .filter((row) => row && typeof row === "object") as Record<string, unknown>[];
    allRows.push(...rows);

    const metaRaw = json.meta && typeof json.meta === "object" ? (json.meta as Record<string, unknown>) : null;
    if (!metaRaw) break;

    const meta = {
      total: toIntOrNull(metaRaw.total),
      limit: toIntOrNull(metaRaw.limit),
      offset: toIntOrNull(metaRaw.offset),
    };

    if (meta.total != null && meta.total >= 0) total ??= meta.total;
    const effectiveLimit = meta.limit && meta.limit > 0 ? meta.limit : requestedLimit;
    const effectiveOffset = meta.offset != null && meta.offset >= 0 ? meta.offset : offset;

    if (lastMetaOffset != null && effectiveOffset === lastMetaOffset) break;
    lastMetaOffset = effectiveOffset;

    if (rows.length === 0) break;
    if (rows.length < effectiveLimit) break;
    if (total != null && allRows.length >= total) break;

    offset = effectiveOffset + effectiveLimit;
    if (total != null && offset >= total) break;
  }

  return allRows;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Enhanced debugging for mobile
  const userAgent = req.headers.get("user-agent") || "";
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const mobilePrefix = isMobile ? "[MOBILE] " : "";
  
  // Log all cookies for debugging
  const allCookies = req.cookies.getAll();
  console.log(`[VEHICLE_API] ${mobilePrefix}GET request cookies:`, {
    count: allCookies.length,
    names: allCookies.map(c => c.name),
    hasSession: allCookies.some(c => c.name === "session"),
  });
  
  const session = requireSession(req);
  if (!session) {
    console.log(`[VEHICLE_API] ${mobilePrefix}Session check failed - returning 401`);
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }
  
  console.log(`[VEHICLE_API] ${mobilePrefix}Session valid for user: ${session.username}`);

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

    // If not found in database or cache, check if we have Apps Script fallback
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, error: "Vehicle not found and Apps Script fallback not configured" },
        { status: 404 }
      );
    }

    // If not found in database or cache, return 404
    return NextResponse.json({ ok: false, error: "Vehicle not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[PUT /api/vehicles/[id]] Handler started");
  
  const session = requireSession(req);
  if (!session) {
    console.log("[PUT /api/vehicles/[id]] No session found");
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }

  console.log(`[PUT /api/vehicles/[id]] Session valid for user: ${session.username}, role: ${session.role}`);

  if (session.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  console.log(`[PUT /api/vehicles/[id]] Vehicle ID: ${id}`);

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
    // Handle both FormData (new) and JSON (legacy) requests
    let body: Record<string, unknown>;
    let newImageFile: File | null = null;
    let imageDataBase64: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    console.log(`[PUT /api/vehicles/${id}] Content-Type: ${contentType}`);
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = {};
      for (const [key, value] of formData.entries()) {
        console.log(`[PUT /api/vehicles/${id}] FormData key: ${key}, type: ${typeof value}, isFile: ${value instanceof File}`);
        if ((key === "image" || key === "imageData") && value instanceof File) {
          newImageFile = value;
          console.log(`[PUT /api/vehicles/${id}] Found image file: ${value.name}, size: ${value.size}`);
        } else {
          body[key] = value;
        }
      }
    } else {
      body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      // Check for base64 image data in JSON
      imageDataBase64 = (body.imageData || body.image_data) as string;
      if (imageDataBase64) {
        console.log(`[PUT /api/vehicles/${id}] Found base64 image data in JSON`);
      }
    }

    // Validate required fields
    const category = sanitizeString(body.Category);
    const brand = sanitizeString(body.Brand);
    const model = sanitizeString(body.Model);

    if (!category || !brand || !model) {
      return NextResponse.json(
        { ok: false, error: "Category, Brand, and Model are required" },
        { status: 400 }
      );
    }

    // Validate numeric fields
    const year = sanitizeNumber(body.Year);
    const priceNew = sanitizeNumber(body.PriceNew);

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

    // Handle image upload if provided
    let imageId: string | null = null;
    let imageDataToUpload: string | null = null;

    if (newImageFile) {
      // Convert File to base64
      const arrayBuffer = await newImageFile.arrayBuffer();
      imageDataToUpload = `data:${newImageFile.type};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
      console.log(`[PUT /api/vehicles/${vehicleId}] Converted file to base64, length: ${imageDataToUpload.length}`);
    } else if (imageDataBase64 && typeof imageDataBase64 === "string" && imageDataBase64.startsWith("data:image/")) {
      imageDataToUpload = imageDataBase64;
      console.log(`[PUT /api/vehicles/${vehicleId}] Using base64 image data from JSON`);
    }

    if (imageDataToUpload) {
      // Validate Cloudinary configuration before upload
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      
      if (!cloudName || !apiKey || !apiSecret) {
        console.error(`[PUT /api/vehicles/${vehicleId}] Cloudinary configuration missing`);
        return NextResponse.json(
          { ok: false, error: "Image upload service not configured. Please contact administrator." },
          { status: 503 }
        );
      }
      
      // Get folder using explicit vms/ prefix pattern
      const targetFolder = getCloudinaryFolder(category);
      console.log(`[PUT /api/vehicles/${vehicleId}] Uploading to Cloudinary folder: ${targetFolder}`);
      
      try {
        // Upload with explicit folder option
        const uploadResult = await uploadImage(imageDataToUpload, {
          folder: targetFolder,
          publicId: `vehicle_${vehicleId}_${Date.now()}`,
          tags: [category, brand, model].filter(Boolean),
        });

        console.log(`[PUT /api/vehicles/${vehicleId}] Upload result: success=${uploadResult.success}, url=${uploadResult.url ? 'present' : 'none'}, error=${uploadResult.error || 'none'}`);

        if (!uploadResult.success) {
          // Return specific error to client
          console.error(`[PUT /api/vehicles/${vehicleId}] Image upload failed: ${uploadResult.error}`);
          return NextResponse.json(
            { ok: false, error: `Image upload failed: ${uploadResult.error || "Unknown error"}` },
            { status: 502 }
          );
        } else {
          // Use secure_url from Cloudinary response
          imageId = uploadResult.url || null;
          console.log(`✅ [PUT /api/vehicles/${vehicleId}] Image successfully uploaded to Cloudinary folder '${targetFolder}'`);
          console.log(`[PUT /api/vehicles/${vehicleId}] Secure URL: ${imageId?.substring(0, 100)}...`);
        }
      } catch (uploadError) {
        console.error(`[PUT /api/vehicles/${vehicleId}] Upload exception:`, uploadError);
        return NextResponse.json(
          { ok: false, error: "Image upload service error. Please try again later." },
          { status: 502 }
        );
      }
    } else {
      console.log(`[PUT /api/vehicles/${vehicleId}] No image data to upload`);
    }

    // Prepare update data
    const updateData: Parameters<typeof updateVehicle>[1] = {
      category,
      brand,
      model,
      year: year || new Date().getFullYear(),
      plate: sanitizeString(body.Plate),
      market_price: priceNew || 0,
      tax_type: sanitizeString(body.TaxType),
      condition: sanitizeString(body.Condition) || "New",
      body_type: sanitizeString(body.BodyType),
      color: sanitizeString(body.Color),
    };

    if (imageId) {
      updateData.image_id = imageId;
    }

    // Update vehicle in database
    const updatedVehicle = await updateVehicle(vehicleId, updateData);

    if (!updatedVehicle) {
      return NextResponse.json({ ok: false, error: "Vehicle not found" }, { status: 404 });
    }

    // Convert to API format and log the response
    const responseVehicle = dbToVehicle(updatedVehicle);
    const imageUrl = typeof responseVehicle.Image === "string" ? responseVehicle.Image : "";
    console.log(`[PUT /api/vehicles/${vehicleId}] Response:`, {
      vehicleId: responseVehicle.VehicleId,
      hasImage: !!imageUrl,
      imageUrl: imageUrl.substring(0, 100) + "..."
    });

    // Clear server-side cache and revalidate
    clearCachedVehicles();
    
    // Revalidate Next.js cache tags
    try {
      revalidateTag('vehicles', {});
      console.log(`[PUT /api/vehicles/${vehicleId}] Revalidated vehicles tag`);
    } catch (e) {
      console.error(`[PUT /api/vehicles/${vehicleId}] Failed to revalidate:`, e);
    }
    
    return NextResponse.json({ ok: true, data: responseVehicle });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[PUT /api/vehicles/[id]] Error:", message);
    console.error("[PUT /api/vehicles/[id]] Stack:", e instanceof Error ? e.stack : "No stack trace");
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[DELETE /api/vehicles/[id]] Handler started");
  
  const session = requireSession(req);
  if (!session) {
    console.log("[DELETE /api/vehicles/[id]] No session found");
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }

  if (session.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  console.log(`[DELETE /api/vehicles/[id]] Vehicle ID: ${id}`);

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
      console.log(`[DELETE /api/vehicles/${vehicleId}] Vehicle not found`);
      return NextResponse.json({ ok: false, error: "Vehicle not found" }, { status: 404 });
    }

    console.log(`[DELETE /api/vehicles/${vehicleId}] Found vehicle:`, {
      brand: vehicle.brand,
      model: vehicle.model,
      hasImage: !!vehicle.image_id
    });

    // If vehicle has a Cloudinary image, delete it
    if (vehicle.image_id) {
      // Check if it's a Cloudinary URL (not a Google Drive ID)
      if (vehicle.image_id.includes('cloudinary.com')) {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{public_id}
        const urlParts = vehicle.image_id.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0]; // Remove file extension
        const folder = urlParts[urlParts.length - 2];
        const fullPublicId = `${folder}/${publicId}`;
        
        console.log(`[DELETE /api/vehicles/${vehicleId}] Deleting Cloudinary image: ${fullPublicId}`);
        
        const deleteResult = await deleteImage(fullPublicId);
        if (deleteResult.success) {
          console.log(`[DELETE /api/vehicles/${vehicleId}] Cloudinary image deleted successfully`);
        } else {
          console.warn(`[DELETE /api/vehicles/${vehicleId}] Failed to delete Cloudinary image: ${deleteResult.error}`);
          // Continue with vehicle deletion even if image deletion fails
        }
      } else {
        console.log(`[DELETE /api/vehicles/${vehicleId}] Image is not a Cloudinary URL, skipping image deletion`);
      }
    }

    // Delete vehicle from database
    const deleted = await deleteVehicle(vehicleId);
    
    if (!deleted) {
      console.log(`[DELETE /api/vehicles/${vehicleId}] Database deletion failed`);
      return NextResponse.json({ ok: false, error: "Failed to delete vehicle" }, { status: 500 });
    }

    console.log(`[DELETE /api/vehicles/${vehicleId}] Vehicle deleted successfully`);
    
    // Clear server-side cache and revalidate
    clearCachedVehicles();
    
    // Revalidate Next.js cache tags
    try {
      revalidateTag('vehicles', {});
      console.log(`[DELETE /api/vehicles/${vehicleId}] Revalidated vehicles tag`);
    } catch (e) {
      console.error(`[DELETE /api/vehicles/${vehicleId}] Failed to revalidate:`, e);
    }
    
    return NextResponse.json({ ok: true, data: null });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[DELETE /api/vehicles/[id]] Error:", message);
    console.error("[DELETE /api/vehicles/[id]] Stack:", e instanceof Error ? e.stack : "No stack trace");
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
