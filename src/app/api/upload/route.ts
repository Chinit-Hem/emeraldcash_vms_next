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

/** Maximum allowed file size in bytes (4MB) 
 * NOTE: Vercel serverless functions have a 4.5MB body size limit.
 * We use 4MB to leave room for headers and other form data.
 */
const MAX_FILE_SIZE = 4 * 1024 * 1024;

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
      UPDATE "vehicles" 
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
  const requestStartTime = Date.now();
  
  // Log request start with environment info
  console.log("[POST /api/upload] Request started:", {
    timestamp: new Date().toISOString(),
    contentLength: req.headers.get("content-length"),
    contentType: req.headers.get("content-type"),
    userAgent: req.headers.get("user-agent")?.substring(0, 50),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });

  // Check content length before processing
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > MAX_FILE_SIZE) {
      console.error(`[POST /api/upload] Request body too large: ${size} bytes`);
      return createErrorResponse(
        `Request body too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB. Please compress your image or use a smaller file.`,
        413,
        `Received ${(size / 1024 / 1024).toFixed(2)}MB, max allowed is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`,
        corsHeaders
      );
    }
  }
  
  // Step 1: Authentication
  try {
    const session = requireSession(req);
    if (!session) {
      console.error("[POST /api/upload] Authentication failed: No valid session");
      return createErrorResponse(
        "Invalid or expired session", 
        401, 
        "Please log in again", 
        corsHeaders
      );
    }

    if (session.role !== "Admin") {
      console.error(`[POST /api/upload] Authorization failed: User ${session.username} is not Admin`);
      return createErrorResponse(
        "Forbidden", 
        403, 
        "Only administrators can upload images", 
        corsHeaders
      );
    }
    
    console.log(`[POST /api/upload] Authenticated as ${session.username} (${session.role})`);
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
    console.log("[POST /api/upload] Form data parsed successfully");
  } catch (error) {
    console.error("[POST /api/upload] Form data parsing error:", error);
    
    // Check if this is a 413 error (Payload Too Large)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("413") || errorMessage.includes("Payload Too Large") || errorMessage.includes("exceeds")) {
      return createErrorResponse(
        `File too large for serverless function. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        413,
        "Vercel serverless functions have a 4.5MB limit. Please compress your image before uploading.",
        corsHeaders
      );
    }
    
    return createErrorResponse(
      "Invalid form data", 
      400, 
      errorMessage, 
      corsHeaders
    );
  }

  // Extract form fields
  const imageFile = formData.get("image") as File | null;
  const vehicleId = formData.get("vehicleId") as string | null;
  const category = formData.get("category") as string | null;

  console.log("[POST /api/upload] Extracted form fields:", {
    hasImageFile: !!imageFile,
    imageFileSize: imageFile?.size,
    imageFileType: imageFile?.type,
    vehicleId,
    category,
  });

  // Step 3: Validate inputs
  if (!vehicleId) {
    console.error("[POST /api/upload] Validation failed: Vehicle ID is required");
    return createErrorResponse(
      "Vehicle ID is required", 
      400, 
      undefined, 
      corsHeaders
    );
  }

  if (!category) {
    console.error("[POST /api/upload] Validation failed: Category is required");
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
    console.error("[POST /api/upload] Validation failed:", validation.error);
    return createErrorResponse(
      validation.error!, 
      400, 
      undefined, 
      corsHeaders
    );
  }

  console.log("[POST /api/upload] File validation passed:", {
    fileSize: imageFile?.size,
    fileType: imageFile?.type,
  });

  // Step 4: Upload to Cloudinary (pass File directly - more efficient than base64)
  const folder = getCloudinaryFolder(category);
  let uploadResult;
  
  console.log("[POST /api/upload] Starting Cloudinary upload to folder:", folder);
  
  try {
    const uploadStartTime = Date.now();
    // Pass the File object directly - uploadImage handles compression and streaming
    uploadResult = await uploadImage(imageFile!, {
      folder: folder,
      publicId: `vehicle_${vehicleId}_${Date.now()}`,
      tags: [category],
      timeout: 55000, // 55 seconds - just under Vercel's 60s limit
      retryAttempts: 2,
      compress: true,
      maxWidth: 1200, // Slightly larger for better quality
      quality: 0.85, // Better quality
    });
    console.log(`[POST /api/upload] Cloudinary upload completed in ${Date.now() - uploadStartTime}ms`);
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
    console.error("[POST /api/upload] Cloudinary upload failed:", uploadResult.error);
    return createErrorResponse(
      `Upload failed: ${uploadResult.error}`, 
      502, 
      undefined, 
      corsHeaders
    );
  }

  const secureUrl = uploadResult.url;
  if (!secureUrl) {
    console.error("[POST /api/upload] No secure_url returned from Cloudinary");
    return createErrorResponse(
      "No URL returned from Cloudinary", 
      502, 
      "The upload succeeded but no URL was provided", 
      corsHeaders
    );
  }

  console.log("[POST /api/upload] Cloudinary upload successful:", {
    publicId: uploadResult.publicId,
    url: secureUrl.substring(0, 100) + "...",
  });

  // Step 6: Update database
  const vehicleIdNum = parseInt(vehicleId, 10);
  if (isNaN(vehicleIdNum)) {
    console.error("[POST /api/upload] Invalid vehicle ID format:", vehicleId);
    return createErrorResponse(
      "Invalid vehicle ID format", 
      400, 
      "Vehicle ID must be a number", 
      corsHeaders
    );
  }

  try {
    const dbStartTime = Date.now();
    await updateVehicleImage(vehicleIdNum, secureUrl);
    console.log(`[POST /api/upload] Database updated in ${Date.now() - dbStartTime}ms`);
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
  const totalDuration = Date.now() - requestStartTime;
  console.log(`[POST /api/upload] Success: Vehicle ${vehicleIdNum} image uploaded to ${folder} in ${totalDuration}ms`);
  
  return createSuccessResponse(
    {
      url: secureUrl,
      publicId: uploadResult.publicId,
      folder: folder,
    },
    corsHeaders
  );
}
