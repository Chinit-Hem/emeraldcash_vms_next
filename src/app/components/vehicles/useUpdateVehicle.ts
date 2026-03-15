"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/compressImage";
import { refreshVehicleCache, writeVehicleCache } from "@/lib/vehicleCache";
import type { Vehicle } from "@/lib/types";

interface UpdateVehicleData {
  VehicleId: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface UseUpdateVehicleResult {
  updateVehicle: (data: UpdateVehicleData, imageFile?: File | null) => Promise<boolean>;
  isUpdating: boolean;
  error: string | null;
}

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Skip compression if file is already small enough (under 800KB)
// This prevents double compression when VehicleForm already compressed the image
const SKIP_COMPRESSION_THRESHOLD_KB = 800;

export function useUpdateVehicle(
  onSuccess?: (updatedVehicle?: Vehicle) => void,
  onError?: (error: string) => void
): UseUpdateVehicleResult {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateVehicle = useCallback(
    async (data: UpdateVehicleData, imageFile?: File | null): Promise<boolean> => {
      setIsUpdating(true);
      setError(null);

      try {
        let cloudinaryImageUrl: string | null = null;

        // Step 1: Upload image to Cloudinary if provided
        if (imageFile) {
          console.log("[useUpdateVehicle] Uploading image to Cloudinary...");
          console.log("[useUpdateVehicle] Cloudinary config:", {
            cloudName: CLOUDINARY_CLOUD_NAME ? "SET" : "MISSING",
            uploadPreset: CLOUDINARY_UPLOAD_PRESET ? "SET" : "MISSING"
          });
          
          if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            throw new Error("Cloudinary configuration missing. Please check your environment variables.");
          }

          // Check if we should skip compression (file already small enough)
          const fileSizeKB = imageFile.size / 1024;
          let fileToUpload: File;
          
          if (fileSizeKB < SKIP_COMPRESSION_THRESHOLD_KB) {
            console.log(`[useUpdateVehicle] File already small (${fileSizeKB.toFixed(2)}KB < ${SKIP_COMPRESSION_THRESHOLD_KB}KB), skipping compression`);
            fileToUpload = imageFile;
          } else {
            // Compress image first
            console.log("[useUpdateVehicle] Compressing image...");
            const compressedResult = await compressImage(imageFile, {
              maxWidth: 1280,
              quality: 0.75,
              targetMinSizeKB: 250,
              targetMaxSizeKB: 800,
            });
            console.log("[useUpdateVehicle] Image compressed:", {
              originalSize: compressedResult.originalSize,
              compressedSize: compressedResult.compressedSize
            });
            fileToUpload = compressedResult.file;
          }

          // Upload to Cloudinary
          const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
          console.log("[useUpdateVehicle] Uploading to:", url);
          
          const formData = new FormData();
          formData.append("file", fileToUpload);
          formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
          formData.append("folder", "vms/vehicles");

          const uploadRes = await fetch(url, {
            method: "POST",
            body: formData,
          });

          console.log("[useUpdateVehicle] Cloudinary response status:", uploadRes.status);

          if (!uploadRes.ok) {
            const errorData = await uploadRes.json().catch(() => ({}));
            console.error("[useUpdateVehicle] Cloudinary upload failed:", errorData);
            throw new Error(errorData.error?.message || `Failed to upload image to Cloudinary: ${uploadRes.status}`);
          }

          const uploadData = await uploadRes.json();
          cloudinaryImageUrl = uploadData.secure_url;
          
          console.log("[useUpdateVehicle] Image uploaded to Cloudinary:", {
            url: cloudinaryImageUrl?.substring(0, 100) + "..."
          });
        }

        // Step 2: Prepare JSON payload with Cloudinary URL
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };

        // Map capitalized keys to lowercase for API compatibility
        const keyMapping: Record<string, string> = {
          "VehicleId": "id",
          "Category": "category",
          "Brand": "brand",
          "Model": "model",
          "Year": "year",
          "Plate": "plate",
          "Color": "color",
          "Condition": "condition",
          "BodyType": "body_type",
          "TaxType": "tax_type",
          "PriceNew": "market_price",
          "Image": "image_id",
        };

        // Build mapped data
        const mappedData: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          if (value != null && key !== "Image") { // Exclude Image, we'll add image_id separately
            const mappedKey = keyMapping[key] || key.toLowerCase();
            mappedData[mappedKey] = value;
          }
        });

        // Add the Cloudinary image URL if we have one
        if (cloudinaryImageUrl) {
          mappedData.image_id = cloudinaryImageUrl;
        }

        const body = JSON.stringify(mappedData);
        console.log("[useUpdateVehicle] Sending update to API:", {
          hasImage: !!cloudinaryImageUrl,
          imageUrl: cloudinaryImageUrl?.substring(0, 100) + "..."
        });

        const res = await fetch(`/api/vehicles/${encodeURIComponent(data.VehicleId)}`, {
          method: "PUT",
          headers,
          body,
          credentials: "include",
        });

        if (res.status === 401) {
          router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
          return false;
        }

        const json = await res.json().catch(() => ({}));
        
        if (res.status === 403) {
          throw new Error("You don't have permission to update this vehicle");
        }
        
        if (!res.ok || json.ok === false) {
          // Add HTTP status prefix for retry logic detection
          const error = new Error(`[HTTP ${res.status}] ${json.error || "Failed to save vehicle"}`);
          (error as Error & { statusCode: number }).statusCode = res.status;
          throw error;
        }

        // Get the updated vehicle data from the response (includes new image URL)
        const updatedVehicle = json.data as Vehicle;
        console.log("[useUpdateVehicle] Updated vehicle received:", {
          vehicleId: updatedVehicle.VehicleId,
          imageUrl: updatedVehicle.Image?.substring(0, 100) + "..."
        });
        
        // Update local cache immediately with the new data
        try {
          const cached = localStorage.getItem("vms-vehicles");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const index = parsed.findIndex((v: Vehicle) => v.VehicleId === data.VehicleId);
              if (index >= 0) {
                // Use the server-returned data which includes the new image URL
                parsed[index] = updatedVehicle;
                writeVehicleCache(parsed);
                console.log("[useUpdateVehicle] Cache updated with new image URL");
              }
            }
          }
        } catch (e) {
          console.error("[useUpdateVehicle] Cache update error:", e);
        }

        // Also trigger a background cache refresh
        refreshVehicleCache().catch(() => {});

        // Pass the updated vehicle to the success callback so the UI can show the new image immediately
        onSuccess?.(updatedVehicle);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save vehicle";
        setError(errorMessage);
        onError?.(errorMessage);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [router, onSuccess, onError]
  );

  return {
    updateVehicle,
    isUpdating,
    error,
  };
}
