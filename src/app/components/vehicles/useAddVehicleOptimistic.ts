"use client";

import { useState, useCallback } from "react";
import { compressImage } from "@/lib/clientImageCompression";
import { getCloudinaryFolder } from "@/lib/cloudinary-folders";
import { recordMutation } from "@/lib/vehicleCache";
import type { Vehicle } from "@/lib/types";

interface UseAddVehicleOptimisticOptions {
  onSuccess?: (vehicle: Vehicle) => void;
  onError?: (error: Error) => void;
}

interface UseAddVehicleOptimisticReturn {
  addVehicle: (
    data: Partial<Vehicle>,
    imageFile?: File | null
  ) => Promise<Vehicle>;
  isAdding: boolean;
  isProcessing: boolean; // Background processing indicator
}

// Maximum retry attempts for transient errors - OPTIMIZED for faster response
const MAX_RETRY_ATTEMPTS = 2; // Reduced from 3 for faster failure
const RETRY_DELAY_MS = 500; // Reduced from 1000 for faster retry
const MAX_CLOUDINARY_RETRIES = 1; // Reduced from 2
const CLOUDINARY_RETRY_DELAY = 300; // Reduced from 500

// Image compression settings - OPTIMIZED for speed
const COMPRESSION_MAX_WIDTH = 800; // Reduced from 1280 for faster processing
const COMPRESSION_QUALITY = 0.7; // Reduced from 0.75 for faster processing

// Cloudinary configuration from environment variables
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Helper function to check Cloudinary configuration
function checkCloudinaryConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'your_cloud_name_here') {
    missing.push('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  }
  if (!CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET === 'your_unsigned_preset_name') {
    missing.push('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

// Helper function to delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check if error is retryable
const isRetryableError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  const has502 = message.includes('502') || message.includes('[http 502]');
  const has504 = message.includes('504') || message.includes('[http 504]');
  const hasTimeout = message.includes('timeout');
  const hasNetworkError = message.includes('network') || 
                          message.includes('econnreset') ||
                          message.includes('econnrefused') ||
                          message.includes('socket hang up');
  
  const statusCode = (error as Error & { statusCode?: number }).statusCode;
  const isRetryableStatus = statusCode === 502 || statusCode === 504 || statusCode === 503;
  
  return has502 || has504 || hasTimeout || hasNetworkError || isRetryableStatus;
};

/**
 * Generate a temporary ID for optimistic vehicle
 */
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Upload image file to Cloudinary using unsigned upload preset
 */
async function uploadImageToCloudinary(
  file: File,
  category: string,
  tempId: string
): Promise<string> {
  const config = checkCloudinaryConfig();
  
  if (!config.valid) {
    const missingVars = config.missing.join(', ');
    const errorMessage = [
      `Cloudinary configuration error: ${missingVars} not configured.`,
      '',
      'To fix this:',
      '1. Copy .env.local.example to .env.local',
      '2. Fill in your Cloudinary credentials:',
      '   - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: Your cloud name from https://cloudinary.com/console',
      '   - NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: Create an unsigned preset in Cloudinary dashboard',
      '3. Restart your Next.js dev server',
      '',
      'See CLOUDINARY_SETUP_GUIDE.md for detailed instructions.'
    ].join('\n');
    
    console.error('[uploadImageToCloudinary] Configuration error:', errorMessage);
    throw new Error(errorMessage);
  }

  const folder = getCloudinaryFolder(category);
  const publicId = `vehicle_${tempId}_${Date.now()}`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET!);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("tags", `vehicle,${category}`);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  console.log(`[uploadImageToCloudinary] Uploading to Cloudinary:`, {
    cloudName: CLOUDINARY_CLOUD_NAME,
    folder,
    publicId,
    fileSize: `${(file.size / 1024).toFixed(2)}KB`,
  });

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `Upload failed: ${response.status}`;
    
    // Enhanced error detection and messaging
    if (errorMessage.includes('Upload preset not found') || 
        errorMessage.includes('upload preset') ||
        errorMessage.includes('preset')) {
      const enhancedError = new Error([
        `❌ Cloudinary Upload Preset Error: "${CLOUDINARY_UPLOAD_PRESET}"`,
        '',
        'The upload preset was not found in your Cloudinary account.',
        '',
        '🔧 To fix this:',
        '1. Go to Cloudinary Dashboard: https://cloudinary.com/console',
        '2. Click Settings (gear icon) → Upload',
        '3. Scroll to "Upload presets" section',
        '4. Click "Add upload preset" or verify existing preset',
        '5. Set the preset name to exactly: ' + CLOUDINARY_UPLOAD_PRESET,
        '6. Set Signing Mode to: UNSIGNED (⚠️ Important!)',
        '7. Click Save',
        '8. Restart your Next.js dev server',
        '',
        '📚 Full guide: CLOUDINARY_SETUP_GUIDE.md',
        '',
        `Original error: ${errorMessage}`
      ].join('\n'));
      
      console.error('[uploadImageToCloudinary] Upload preset error:', {
        preset: CLOUDINARY_UPLOAD_PRESET,
        cloudName: CLOUDINARY_CLOUD_NAME,
        error: errorMessage,
        errorData
      });
      
      throw enhancedError;
    }
    
    // Check for cloud name errors
    if (errorMessage.includes('cloud name') || 
        errorMessage.includes('Cloud name') ||
        response.status === 401) {
      const enhancedError = new Error([
        `❌ Cloudinary Cloud Name Error: "${CLOUDINARY_CLOUD_NAME}"`,
        '',
        'The cloud name appears to be invalid or not found.',
        '',
        '🔧 To fix this:',
        '1. Go to Cloudinary Dashboard: https://cloudinary.com/console',
        '2. Find your Cloud Name at the top of the dashboard',
        '3. Update NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in .env.local',
        '4. Restart your Next.js dev server',
        '',
        '📚 Full guide: CLOUDINARY_SETUP_GUIDE.md',
        '',
        `Original error: ${errorMessage}`
      ].join('\n'));
      
      console.error('[uploadImageToCloudinary] Cloud name error:', {
        cloudName: CLOUDINARY_CLOUD_NAME,
        error: errorMessage,
        errorData
      });
      
      throw enhancedError;
    }
    
    throw new Error(errorMessage);
  }

  const result = await response.json();
  
  if (!result.secure_url) {
    throw new Error("Cloudinary response missing secure_url");
  }

  console.log(`[uploadImageToCloudinary] Success:`, {
    url: result.secure_url.substring(0, 100) + "...",
  });

  return result.secure_url;
}

/**
 * Convert Base64 string to File object
 */
function base64ToFile(base64String: string, filename: string): File {
  const arr = base64String.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export function useAddVehicleOptimistic(
  options: UseAddVehicleOptimisticOptions = {}
): UseAddVehicleOptimisticReturn {
  const { onSuccess, onError } = options;
  const [isAdding, setIsAdding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const addVehicle = useCallback(
    async (
      data: Partial<Vehicle>,
      imageFile?: File | null
    ): Promise<Vehicle> => {
      setIsAdding(true);
      const tempId = generateTempId();
      
      // Create optimistic vehicle for instant UI feedback
      const optimisticVehicle: Vehicle = {
        VehicleId: tempId,
        Brand: data.Brand || "",
        Model: data.Model || "",
        Category: data.Category || "",
        Plate: data.Plate || "",
        Year: data.Year || null,
        Color: data.Color || "",
        Condition: data.Condition || "New",
        BodyType: data.BodyType || "",
        TaxType: data.TaxType || "",
        PriceNew: data.PriceNew || null,
        Price40: data.Price40 || null,
        Price70: data.Price70 || null,
        Image: "", // Will be updated after upload
        Time: new Date().toISOString(),
      };

      console.log(`[addVehicle] Starting optimistic add with temp ID: ${tempId}`);

      // Start background processing
      setIsProcessing(true);

      let cloudinaryImageUrl: string | null = null;

      // Step 1: Handle image upload to Cloudinary (if provided)
      try {
        // Case A: We have a File object from file input
        if (imageFile) {
          console.log(`[addVehicle] Compressing image file...`);
          
          const compressedResult = await compressImage(imageFile, {
            maxWidth: COMPRESSION_MAX_WIDTH,
            quality: COMPRESSION_QUALITY,
          });
          
          console.log(`[addVehicle] Image compressed:`, {
            originalSize: `${(imageFile.size / 1024).toFixed(2)}KB`,
            compressedSize: `${(compressedResult.compressedSize / 1024).toFixed(2)}KB`,
          });

          console.log(`[addVehicle] Uploading compressed image to Cloudinary...`);
          cloudinaryImageUrl = await uploadImageToCloudinary(
            compressedResult.file,
            data.Category || "Cars",
            tempId
          );
          
          console.log(`[addVehicle] Cloudinary upload complete:`, {
            url: cloudinaryImageUrl.substring(0, 100) + "...",
          });
        }
        // Case B: We have a Base64 string in data.Image
        else if (data.Image && data.Image.startsWith("data:image/")) {
          console.log(`[addVehicle] Converting Base64 to File and uploading to Cloudinary...`);
          
          const fileFromBase64 = base64ToFile(data.Image, `vehicle_${tempId}_${Date.now()}.jpg`);
          
          console.log(`[addVehicle] Base64 converted to File:`, {
            size: `${(fileFromBase64.size / 1024).toFixed(2)}KB`,
          });

          cloudinaryImageUrl = await uploadImageToCloudinary(
            fileFromBase64,
            data.Category || "Cars",
            tempId
          );
          
          console.log(`[addVehicle] Cloudinary upload complete:`, {
            url: cloudinaryImageUrl.substring(0, 100) + "...",
          });
        }
        // Case C: We have an existing URL in data.Image
        else if (data.Image && (data.Image.startsWith("http://") || data.Image.startsWith("https://"))) {
          console.log(`[addVehicle] Using existing URL:`, {
            url: data.Image.substring(0, 100) + "...",
          });
          cloudinaryImageUrl = data.Image;
        }
      } catch (uploadError) {
        console.error(`[addVehicle] Image upload failed:`, uploadError);
        setIsAdding(false);
        setIsProcessing(false);
        const error = uploadError instanceof Error ? uploadError : new Error("Image upload failed");
        onError?.(error);
        throw error;
      }

      // Step 2: Validate image upload result
      // CRITICAL: If an image was provided but upload failed, block submission
      const imageWasProvided = !!imageFile || (data.Image && data.Image.startsWith("data:image/"));
      const imageUploadFailed = imageWasProvided && !cloudinaryImageUrl;
      const imageUrlIsInvalid = cloudinaryImageUrl === "undefined" || 
                                cloudinaryImageUrl === "null" || 
                                (cloudinaryImageUrl && cloudinaryImageUrl.includes("/undefined"));

      if (imageUploadFailed || imageUrlIsInvalid) {
        console.error(`[addVehicle] Image upload failed or returned invalid URL:`, {
          cloudinaryImageUrl,
          imageWasProvided,
          imageUploadFailed,
          imageUrlIsInvalid,
        });
        setIsAdding(false);
        setIsProcessing(false);
        const error = new Error(
          imageUrlIsInvalid 
            ? "Image upload returned an invalid URL. Please try uploading the image again."
            : "Image upload failed. Please check your internet connection and try again."
        );
        onError?.(error);
        throw error;
      }

      // Step 3: Prepare payload with Cloudinary URL
      const payload: Record<string, unknown> = {
        category: data.Category,
        brand: data.Brand,
        model: data.Model,
        year: data.Year,
        plate: data.Plate,
        color: data.Color,
        condition: data.Condition,
        body_type: data.BodyType,
        tax_type: data.TaxType,
        market_price: data.PriceNew,
      };

      // Only add image_id if we have a valid Cloudinary URL
      if (cloudinaryImageUrl && 
          (cloudinaryImageUrl.startsWith("http://") || 
           cloudinaryImageUrl.startsWith("https://"))) {
        // Double-check that we're not accidentally sending a Base64 string
        if (cloudinaryImageUrl.startsWith('data:image/')) {
          console.error(`[addVehicle] CRITICAL: Attempted to send Base64 in payload! Blocking.`);
          setIsAdding(false);
          setIsProcessing(false);
          const error = new Error("Image upload failed: Invalid image format detected. Please try again.");
          onError?.(error);
          throw error;
        }
        payload.image_id = cloudinaryImageUrl;
        optimisticVehicle.Image = cloudinaryImageUrl;
        console.log(`[addVehicle] Payload will include Cloudinary URL`);
      } else {
        console.log(`[addVehicle] No image to save - payload has no image_id`);
      }

      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      // Step 3: Send to API with retry logic
      let lastError: Error | null = null;
      let attempts = 0;
      let createdVehicle: Vehicle | null = null;

      while (attempts < MAX_RETRY_ATTEMPTS) {
        attempts++;
        
        console.log(`[addVehicle] API call attempt ${attempts}/${MAX_RETRY_ATTEMPTS}`);

        try {
          const res = await fetch(`/api/vehicles`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            credentials: "include",
          });

          console.log(`[addVehicle] API response status: ${res.status}`);

          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            const errorMessage = json.error || `Failed to add vehicle: ${res.status}`;
            throw new Error(`[HTTP ${res.status}] ${errorMessage}`);
          }

          const result = await res.json();

          if (!result.success) {
            throw new Error(result.error || "API returned error");
          }

          createdVehicle = result.data || optimisticVehicle;
          
          console.log(`[addVehicle] Add successful for vehicle ${createdVehicle.VehicleId || tempId}`);

          // Record mutation to trigger auto-refresh
          recordMutation();
          console.log(`[addVehicle] Mutation recorded - VehicleList will auto-refresh`);

          // Call success callback
          onSuccess?.(createdVehicle);
          
          setIsAdding(false);
          setIsProcessing(false);
          return createdVehicle;
          
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Failed to add vehicle");
          
          console.error(`[addVehicle] API error on attempt ${attempts}:`, lastError.message);

          // Check if we should retry
          if (attempts < MAX_RETRY_ATTEMPTS && isRetryableError(lastError)) {
            const retryDelay = RETRY_DELAY_MS * Math.pow(2, attempts - 1);
            console.log(`[addVehicle] Retrying after ${retryDelay}ms...`);
            await delay(retryDelay);
            continue;
          }
          
          break;
        }
      }

      // All retries exhausted
      setIsAdding(false);
      setIsProcessing(false);
      
      if (lastError) {
        const enhancedError = new Error(
          `${lastError.message}\n\n(Attempted ${attempts} time${attempts > 1 ? 's' : ''})`
        );
        onError?.(enhancedError);
        throw enhancedError;
      }

      // Should never reach here, but TypeScript needs it
      throw new Error("Unexpected error in addVehicle");
    },
    [onSuccess, onError]
  );

  return {
    addVehicle,
    isAdding,
    isProcessing,
  };
}
