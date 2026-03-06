import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryFolder } from "./cloudinary-folders";

// Configure Cloudinary using individual environment variables
// Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Check if Cloudinary is configured with all required credentials
const isCloudinaryConfigured = !!(
  CLOUDINARY_CLOUD_NAME && 
  CLOUDINARY_API_KEY && 
  CLOUDINARY_API_SECRET
);

// Configure Cloudinary SDK
if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export { cloudinary };


// Upload image to Cloudinary with automatic folder selection
export async function uploadImage(
  imageData: string,
  options: {
    folder?: string;
    publicId?: string;
    tags?: string[];
    transformation?: object;
    category?: string; // Vehicle category for automatic folder selection
  } = {}
): Promise<{
  success: boolean;
  url?: string;
  publicId?: string;
  folder?: string;
  error?: string;
}> {
  if (!isCloudinaryConfigured) {
    return {
      success: false,
      error: "Cloudinary is not configured. Set CLOUDINARY_URL environment variable.",
    };
  }

  try {
    // Determine folder based on category or use provided folder
    let targetFolder = options.folder;
    if (options.category && !options.folder) {
      targetFolder = getCloudinaryFolder(options.category);
    }
    
    // Handle base64 image data
    const uploadOptions: any = {
      folder: targetFolder || "vehicles",
      resource_type: "image",
    };

    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }

    if (options.tags) {
      uploadOptions.tags = options.tags;
    }

    if (options.transformation) {
      uploadOptions.transformation = options.transformation;
    }

    const result = await cloudinary.uploader.upload(imageData, uploadOptions);

    // Ensure we return the secure_url from Cloudinary
    const secureUrl = result.secure_url;
    if (!secureUrl) {
      console.error("Cloudinary upload succeeded but no secure_url returned:", result);
      return {
        success: false,
        error: "Upload succeeded but no secure_url was returned from Cloudinary",
      };
    }

    return {
      success: true,
      url: secureUrl,
      publicId: result.public_id,
      folder: targetFolder,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Upload failed";
    
    // Provide helpful guidance for 401 errors
    if (errorMessage.includes("401") || errorMessage.includes("Invalid api_key")) {
      return {
        success: false,
        error: `Cloudinary 401 Error: Invalid API credentials.
        
Please verify your Cloudinary credentials:
1. Log in to https://cloudinary.com/console
2. Go to Dashboard → Account Details
3. Copy the correct values for:
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET

4. Update your .env.local file:
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

Original error: ${errorMessage}`,
      };
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}


// Delete image from Cloudinary
export async function deleteImage(publicId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isCloudinaryConfigured) {
    return {
      success: false,
      error: "Cloudinary is not configured. Set CLOUDINARY_URL environment variable.",
    };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === "ok") {
      return { success: true };
    } else {
      return {
        success: false,
        error: `Delete failed: ${result.result}`,
      };
    }
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}


// Get optimized image URL
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: number;
    format?: string;
  } = {}
): string {
  if (!isCloudinaryConfigured) {
    return "";
  }

  const transformation: any = {};

  if (options.width) transformation.width = options.width;
  if (options.height) transformation.height = options.height;
  if (options.crop) transformation.crop = options.crop;
  if (options.quality) transformation.quality = options.quality;
  if (options.format) transformation.fetch_format = options.format;

  return cloudinary.url(publicId, {
    transformation: Object.keys(transformation).length > 0 ? transformation : undefined,
    secure: true,
  });
}


// Test Cloudinary connection
export async function testCloudinaryConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isCloudinaryConfigured) {
    return {
      success: false,
      message: "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.",
    };
  }

  try {
    const result = await cloudinary.api.ping();
    return {
      success: true,
      message: `Cloudinary connected successfully. Cloud: ${CLOUDINARY_CLOUD_NAME}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Connection failed";
    
    // Provide helpful guidance for 401 errors
    if (errorMessage.includes("401") || errorMessage.includes("Invalid api_key")) {
      return {
        success: false,
        message: `Cloudinary 401 Error: Invalid API credentials. 
        
Please verify your Cloudinary credentials:
1. Log in to https://cloudinary.com/console
2. Go to Dashboard → Account Details
3. Copy the correct values:
   - Cloud Name: ${CLOUDINARY_CLOUD_NAME || "NOT SET"}
   - API Key: ${CLOUDINARY_API_KEY ? "****" + CLOUDINARY_API_KEY.slice(-4) : "NOT SET"}
   - API Secret: ${CLOUDINARY_API_SECRET ? "****" + CLOUDINARY_API_SECRET.slice(-4) : "NOT SET"}

4. Update your .env.local file with the correct credentials:
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

Original error: ${errorMessage}`,
      };
    }
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}


// Re-export folder utilities
export { getCloudinaryFolder } from "./cloudinary-folders";
