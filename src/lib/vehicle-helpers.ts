/**
 * Vehicle Helper Utilities
 * Centralized functions for vehicle-related operations to avoid code duplication
 */

import { driveThumbnailUrl, extractDriveFileId } from "./drive";

/**
 * Format price for display
 */
export function formatPrice(price: string | number | null): string {
  if (!price) return "—";
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "—";
  return `$${num.toLocaleString()}`;
}

/**
 * Check if an image ID is a Cloudinary URL
 */
export function isCloudinaryUrl(imageId: string | null): boolean {
  if (!imageId) return false;
  if (imageId === "undefined" || imageId === "null") return false;
  return imageId.includes("res.cloudinary.com");
}

/**
 * Get thumbnail URL for vehicle image
 */
export function getVehicleThumbnailUrl(imageId: string | null, size: string = "w200-h150"): string | null {
  if (!imageId) return null;
  if (isCloudinaryUrl(imageId)) return imageId;
  
  // Extract file ID from Google Drive URL if needed
  const fileId = extractDriveFileId(imageId);
  if (!fileId) return null;
  
  return driveThumbnailUrl(fileId, size);
}

/**
 * Get full-size URL for vehicle image modal
 */
export function getVehicleFullImageUrl(imageId: string | null): string | null {
  if (!imageId) return null;
  if (isCloudinaryUrl(imageId)) return imageId;
  
  // Extract file ID from Google Drive URL if needed
  const fileId = extractDriveFileId(imageId);
  if (!fileId) return null;
  
  return driveThumbnailUrl(fileId, "w1200-h900");
}

/**
 * Filter state interface for vehicle filtering
 */
export interface VehicleFilterState {
  search: string;
  category: string;
  brand: string;
  yearMin: string;
  yearMax: string;
  priceMin: string;
  priceMax: string;
  condition: string;
  color: string;
  dateFrom: string;
  dateTo: string;
  withoutImage: boolean;
}

/**
 * Default filter state
 */
export const defaultVehicleFilterState: VehicleFilterState = {
  search: "",
  category: "All",
  brand: "All",
  yearMin: "",
  yearMax: "",
  priceMin: "",
  priceMax: "",
  condition: "All",
  color: "All",
  dateFrom: "",
  dateTo: "",
  withoutImage: false,
};
