/**
 * Image Upload API Route
 * 
 * Handles image uploads to Cloudinary for vehicle images.
 * Supports multipart/form-data uploads.
 * 
 * @module api/upload
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";

// ============================================================================
// Types
// ============================================================================

interface UploadResponse {
  ok: boolean;
  data?: {
    url: string;
    publicId: string;
  };
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse multipart form data from request
 */
async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  vehicleId: string | null;
  category: string | null;
  error?: string;
}> {
  try {
    const formData = await request.formData();
    
    const file = formData.get("image") as File | null;
    const vehicleId = formData.get("vehicleId") as string | null;
    const category = formData.get("category") as string | null;
    
    return { file, vehicleId, category };
  } catch (error) {
    return {
      file: null,
      vehicleId: null,
      category: null,
      error: error instanceof Error ? error.message : "Failed to parse form data",
    };
  }
}

/**
 * Validate uploaded file
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }

  return { valid: true };
}

// ============================================================================
// API Handlers
// ============================================================================

/**
 * POST /api/upload
 * Upload an image to Cloudinary
 */
export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse form data
    const { file, vehicleId, category, error: parseError } = await parseFormData(request);

    if (parseError) {
      return NextResponse.json(
        { ok: false, error: parseError },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { ok: false, error: validation.error },
        { status: 400 }
      );
    }

    // Upload to Cloudinary with increased timeout
    const uploadResult = await uploadImage(file, {
      category: category || "vehicles",
      publicId: vehicleId ? `vehicle_${vehicleId}` : undefined,
      timeout: 120000, // 2 minutes - Cloudinary can be slow
      retryAttempts: 2, // Reduce retries to avoid long waits
      retryDelay: 1000,
      compress: true,
      maxWidth: 1280,
      quality: 0.8,
    });

    if (!uploadResult.success) {
      return NextResponse.json(
        { ok: false, error: uploadResult.error || "Upload failed" },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        ok: true,
        data: {
          url: uploadResult.url!,
          publicId: uploadResult.publicId!,
        },
      },
      {
        status: 200,
        headers: {
          "X-Request-ID": requestId,
          "X-Response-Time": `${duration}ms`,
        },
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log detailed error information
    console.error("[Upload API] Error:", {
      message: errorMessage,
      error: error,
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      duration: `${duration}ms`,
    });

    // Provide more helpful error messages based on error type
    let userErrorMessage = errorMessage;
    
    if (errorMessage.includes("signature") || errorMessage.includes("401")) {
      userErrorMessage = "Cloudinary authentication failed. Please check your API credentials configuration.";
    } else if (errorMessage.includes("timeout")) {
      userErrorMessage = "Upload timed out. Please try again with a smaller image or check your connection.";
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      userErrorMessage = "Network error. Please check your internet connection and try again.";
    }

    return NextResponse.json(
      { 
        ok: false, 
        error: userErrorMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        requestId,
      },
      {
        status: 500,
        headers: {
          "X-Request-ID": requestId,
          "X-Response-Time": `${duration}ms`,
        },
      }
    );
  }
}

/**
 * GET /api/upload
 * Health check endpoint with Cloudinary configuration status
 */
export async function GET(): Promise<NextResponse> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "vms_unsigned";
  
  const isConfigured = !!(cloudName && apiKey && apiSecret);
  
  // Test Cloudinary connection if configured
  let connectionTest = null;
  if (isConfigured) {
    try {
      const { testCloudinaryConnection } = await import("@/lib/cloudinary");
      connectionTest = await testCloudinaryConnection();
    } catch (error) {
      connectionTest = {
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }
  
  return NextResponse.json(
    { 
      ok: true, 
      message: "Upload API is running",
      cloudinary: {
        configured: isConfigured,
        cloudName: cloudName || "NOT_SET",
        apiKey: apiKey ? "****" + apiKey.slice(-4) : "NOT_SET",
        apiSecret: apiSecret ? "****" + apiSecret.slice(-4) : "NOT_SET",
        uploadPreset: uploadPreset,
      },
      connectionTest,
      env: process.env.NODE_ENV,
    },
    { status: 200 }
  );
}
