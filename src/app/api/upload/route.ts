/**
 * Image Upload API Route
 * 
 * Handles image uploads to Cloudinary and updates the database.
 * Follows software engineering best practices:
 * - Comprehensive error handling with try-catch blocks
 * - Input validation for file type and size
 * - Environment variable configuration
 * - JSDoc documentation
 * - Reused database connection (via @/lib/db)
 * 
 * @module api/upload
 */

import { requireSession } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Configuration
// ============================================================================

/** Maximum allowed file size in bytes (5MB) */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Allowed MIME types for image uploads */
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

/** Environment configuration */
const CONFIG = {
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  appOrigin: process.env.NEXT_PUBLIC_APP_ORIGIN,
  vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Upload response data structure
 */
interface UploadResponseData {
  url: string;
  publicId: string | undefined;
  folder: string;
}

/**
 * Error response structure
 */
interface ErrorResponse {
  ok: false;
  error: string;
  details?: string;
}

/**
 * Success response structure
 */
interface SuccessResponse {
  ok: true;
  data: UploadResponseData;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Builds CORS headers for the response
 * 
 * @param {NextRequest} req - The incoming request
 * @returns {Headers} CORS headers
 */
function buildCorsHeaders(req: NextRequest): Headers {
  const appOrigin = CONFIG.appOrigin?.trim();
  const vercelUrl = CONFIG.vercelUrl?.trim();
  const vercelOrigin = vercelUrl
    ? vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`
    : "";
  const requestOrigin = req.headers.get("origin") || "";
  const allowedOrigin = appOrigin || vercelOrigin || requestOrigin || "*";

  const headers = new Headers({
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  });

  if (allowedOrigin !== "*") {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
}

/**
 * Validates the uploaded file
 * 
 * Checks:
 * - File exists
 * - File type is allowed image format
 * - File size is under MAX_FILE_SIZE (5MB)
 * 
 * @param {File | null} file - The uploaded file
 * @returns {{ isValid: boolean; error?: string }} Validation result
 */
function validateImageFile(file: File | null): { isValid: boolean; error?: string } {
  // Check if file exists
  if (!file) {
    return { isValid: false, error: "No image file provided" };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}` 
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
    };
  }

  return { isValid: true };
}

/**
 * Converts a File to base64 string
 * 
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 encoded string with data URI prefix
 * @throws {Error} If conversion fails
 */
async function fileToBase64(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${file.type};base64,${base64}`;
  } catch (error) {
    throw new Error(
      `Failed to convert file to base64: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Determines the Cloudinary folder based on vehicle category
 * 
 * @param {string} category - Vehicle category (e.g., "Cars", "Motorcycles")
 * @returns {string} Cloudinary folder path (e.g., "vms/cars", "vms/motorcycles", "vms/tuktuks")
 */
function getCloudinaryFolder(category: string): string {
  const normalizedCategory = category.toLowerCase().trim();
  
  // Map categories to folder names using explicit vms/ prefix
  const folderMap: Record<string, string> = {
    "cars": "vms/cars",
    "car": "vms/cars",
    "suv": "vms/cars",
    "sedan": "vms/cars",
    "truck": "vms/cars",
    "pickup": "vms/cars",
    "van": "vms/cars",
    "motorcycles": "vms/motorcycles",
    "motorcycle": "vms/motorcycles",
    "moto": "vms/motorcycles",
    "bike": "vms/motorcycles",
    "scooter": "vms/motorcycles",
    "tuktuk": "vms/tuktuks",
    "tuk-tuk": "vms/tuktuks",
    "tuk tuk": "vms/tuktuks",
    "tuk": "vms/tuktuks",
    "auto rickshaw": "vms/tuktuks",
    "three wheeler": "vms/tuktuks",
  };

  // Return mapped folder or default to vms/{category}s
  const folder = folderMap[normalizedCategory] || `vms/${normalizedCategory}s`;
  console.log(`[getCloudinaryFolder] Category: "${category}" -> Folder: "${folder}"`);
  return folder;
}

/**
 * Updates the vehicle record in the database with the new image URL
 * 
 * @param {number} vehicleId - The vehicle ID
 * @param {string} imageUrl - The Cloudinary image URL
 * @returns {Promise<void>}
 * @throws {Error} If database update fails
 */
async function updateVehicleImage(vehicleId: number, imageUrl: string): Promise<void> {
  try {
    await sql`
      UPDATE "cleaned_vehicles_for_google_sheets" 
      SET 
        "image_id" = ${imageUrl}, 
        "updated_at" = NOW() 
      WHERE "id" = ${vehicleId}
    `;
  } catch (error) {
    throw new Error(
      `Database update failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Creates an error response with proper formatting
 * 
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {string} [details] - Additional error details
 * @param {Headers} corsHeaders - CORS headers
 * @returns {NextResponse} Formatted error response
 */
function createErrorResponse(
  message: string, 
  status: number, 
  details: string | undefined, 
  corsHeaders: Headers
): NextResponse {
  const response: ErrorResponse = { 
    ok: false, 
    error: message,
    ...(details && { details })
  };
  
  return NextResponse.json(response, { status, headers: corsHeaders });
}

/**
 * Creates a success response with proper formatting
 * 
 * @param {UploadResponseData} data - Response data
 * @param {Headers} corsHeaders - CORS headers
 * @returns {NextResponse} Formatted success response
 */
function createSuccessResponse(
  data: UploadResponseData, 
  corsHeaders: Headers
): NextResponse {
  const response: SuccessResponse = { ok: true, data };
  return NextResponse.json(response, { headers: corsHeaders });
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Handles OPTIONS requests for CORS preflight
 * 
 * @param {NextRequest} req - The incoming request
 * @returns {NextResponse} Empty response with CORS headers
 */
export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req),
  });
}

/**
 * Handles POST requests for image uploads
 * 
 * Flow:
 * 1. Authenticate and authorize the user
 * 2. Parse and validate the form data
 * 3. Validate the image file (type and size)
 * 4. Convert file to base64
 * 5. Upload to Cloudinary
 * 6. Update database with new image URL
 * 7. Return success response
 * 
 * @param {NextRequest} req - The incoming request
 * @returns {NextResponse} Upload result or error
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const corsHeaders = buildCorsHeaders(req);
  
  // Step 1: Authentication
  try {
    const session = requireSession(req);
    if (!session) {
      return createErrorResponse(
        "Invalid or expired session", 
        401, 
        "Please log in again", 
        corsHeaders
      );
    }

    if (session.role !== "Admin") {
      return createErrorResponse(
        "Forbidden", 
        403, 
        "Only administrators can upload images", 
        corsHeaders
      );
    }
  } catch (error) {
    console.error("[POST /api/upload] Authentication error:", error);
    return createErrorResponse(
      "Authentication failed", 
      401, 
      error instanceof Error ? error.message : undefined, 
      corsHeaders
    );
  }

  // Step 2: Parse form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    console.error("[POST /api/upload] Form data parsing error:", error);
    return createErrorResponse(
      "Invalid form data", 
      400, 
      error instanceof Error ? error.message : undefined, 
      corsHeaders
    );
  }

  // Extract form fields
  const imageFile = formData.get("image") as File | null;
  const vehicleId = formData.get("vehicleId") as string | null;
  const category = formData.get("category") as string | null;

  // Step 3: Validate inputs
  if (!vehicleId) {
    return createErrorResponse(
      "Vehicle ID is required", 
      400, 
      undefined, 
      corsHeaders
    );
  }

  if (!category) {
    return createErrorResponse(
      "Category is required", 
      400, 
      undefined, 
      corsHeaders
    );
  }

  // Validate image file
  const validation = validateImageFile(imageFile);
  if (!validation.isValid) {
    return createErrorResponse(
      validation.error!, 
      400, 
      undefined, 
      corsHeaders
    );
  }

  // Step 4: Convert file to base64
  let base64Image: string;
  try {
    base64Image = await fileToBase64(imageFile!);
  } catch (error) {
    console.error("[POST /api/upload] File conversion error:", error);
    return createErrorResponse(
      "File processing failed", 
      500, 
      error instanceof Error ? error.message : undefined, 
      corsHeaders
    );
  }

  // Step 5: Upload to Cloudinary
  const folder = getCloudinaryFolder(category);
  let uploadResult;
  
  try {
    uploadResult = await uploadImage(base64Image, {
      folder: folder,
      publicId: `vehicle_${vehicleId}_${Date.now()}`,
      tags: [category],
    });
  } catch (error) {
    console.error("[POST /api/upload] Cloudinary upload error:", error);
    return createErrorResponse(
      "Cloudinary upload failed", 
      502, 
      error instanceof Error ? error.message : undefined, 
      corsHeaders
    );
  }

  // Check upload result
  if (!uploadResult.success) {
    return createErrorResponse(
      `Upload failed: ${uploadResult.error}`, 
      502, 
      undefined, 
      corsHeaders
    );
  }

  const secureUrl = uploadResult.url;
  if (!secureUrl) {
    return createErrorResponse(
      "No URL returned from Cloudinary", 
      502, 
      "The upload succeeded but no URL was provided", 
      corsHeaders
    );
  }

  // Step 6: Update database
  const vehicleIdNum = parseInt(vehicleId, 10);
  if (isNaN(vehicleIdNum)) {
    return createErrorResponse(
      "Invalid vehicle ID format", 
      400, 
      "Vehicle ID must be a number", 
      corsHeaders
    );
  }

  try {
    await updateVehicleImage(vehicleIdNum, secureUrl);
  } catch (error) {
    console.error("[POST /api/upload] Database update error:", error);
    return createErrorResponse(
      "Database update failed", 
      500, 
      error instanceof Error ? error.message : undefined, 
      corsHeaders
    );
  }

  // Step 7: Return success
  console.log(`[POST /api/upload] Success: Vehicle ${vehicleIdNum} image uploaded to ${folder}`);
  
  return createSuccessResponse(
    {
      url: secureUrl,
      publicId: uploadResult.publicId,
      folder: folder,
    },
    corsHeaders
  );
}
