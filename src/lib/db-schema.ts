// Database schema definitions and CRUD operations for vehicles
// REFACTORED: Now uses VehicleService singleton for all operations
// Maintains backward compatibility with existing exports

import { vehicleService } from "@/services/VehicleService";
import type { VehicleDB as VehicleDBType } from "@/services/VehicleService";
import { normalizeImageUrl } from "./cloudinary";

// Re-export VehicleDB type for backward compatibility
export type VehicleDB = VehicleDBType;

// Note: The vehicles table is managed by Google Sheets sync
// This function is kept for compatibility but doesn't create the table
export async function createVehiclesTable(): Promise<void> {
  // Table is created by Google Sheets sync, not by the application
  console.log("vehicles table is managed by Google Sheets sync");
}

// Get all vehicles (alias for getVehicles without filters)
// Supports optional limit for performance when only a subset is needed
export async function getAllVehicles(limit?: number): Promise<VehicleDB[]> {
  const result = await vehicleService.getVehicles(limit ? { limit } : undefined);
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch vehicles");
  }
  // Convert back to DB format for backward compatibility
  return result.data.map(v => vehicleToDB(v));
}

// Get all vehicles with optional filtering
// Uses case-insensitive ILIKE for text searches via VehicleService
export async function getVehicles(filters?: {
  category?: string;
  brand?: string;
  condition?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
}): Promise<VehicleDB[]> {
  const result = await vehicleService.getVehicles(filters);
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch vehicles");
  }
  // Convert back to DB format for backward compatibility
  return result.data.map(v => vehicleToDB(v));
}

// Get a single vehicle by ID
export async function getVehicleById(id: number): Promise<VehicleDB | null> {
  const result = await vehicleService.getVehicleById(id);
  if (!result.success) {
    return null;
  }
  return result.data ? vehicleToDB(result.data) : null;
}

// Get a single vehicle by plate (case-insensitive ILIKE)
export async function getVehicleByPlate(plate: string): Promise<VehicleDB | null> {
  const result = await vehicleService.getVehicleByPlate(plate);
  if (!result.success) {
    return null;
  }
  return result.data ? vehicleToDB(result.data) : null;
}

// Create a new vehicle
export async function createVehicle(vehicle: Omit<VehicleDB, "id" | "created_at" | "updated_at">): Promise<VehicleDB> {
  const result = await vehicleService.createVehicle(vehicle);
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to create vehicle");
  }
  return vehicleToDB(result.data);
}

// Update a vehicle
export async function updateVehicle(id: number, vehicle: Partial<VehicleDB>): Promise<VehicleDB | null> {
  const result = await vehicleService.updateVehicle(id, vehicle);
  if (!result.success) {
    return null;
  }
  return result.data ? vehicleToDB(result.data) : null;
}

// Delete a vehicle
export async function deleteVehicle(id: number): Promise<boolean> {
  const result = await vehicleService.deleteVehicle(id);
  if (!result.success || result.data === undefined) {
    return false;
  }
  return result.data;
}

// Normalize condition to proper case
// Note: Currently unused but kept for future use in data validation
function normalizeCondition(condition: string): "New" | "Used" | "Other" {
  const lower = condition?.toLowerCase().trim();
  if (lower === "new") return "New";
  if (lower === "used") return "Used";
  return "Other";
}

// Normalize category to standard format
function normalizeCategory(category: string): string {
  const lower = category?.toLowerCase().trim();
  if (lower === "car" || lower === "cars") return "Cars";
  if (lower === "motorcycle" || lower === "motorcycles") return "Motorcycles";
  if (lower === "tuk tuk" || lower === "tuktuk" || lower === "tuk-tuk" || lower === "tuktuks") return "TukTuks";
  return category?.trim() || "Other";
}

// Get vehicle statistics - optimized single query with CTEs via VehicleService
export async function getVehicleStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  byCondition: Record<string, number>;
  avgPrice: number;
}> {
  const result = await vehicleService.getVehicleStats();
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch vehicle stats");
  }
  
  const { total, byCategory, byCondition, avgPrice } = result.data;
  return {
    total,
    byCategory,
    byCondition,
    avgPrice
  };
}

// Get lightweight stats (total count only) for lite mode
export async function getVehicleStatsLite(): Promise<{
  total: number;
}> {
  const result = await vehicleService.getVehicleStatsLite();
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch vehicle count");
  }
  return {
    total: result.data.total
  };
}

// Search vehicles by text with case-insensitive ILIKE
export async function searchVehicles(searchTerm: string): Promise<VehicleDB[]> {
  const result = await vehicleService.searchVehicles(searchTerm);
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to search vehicles");
  }
  return result.data.map(v => vehicleToDB(v));
}

// Pricing calculation helpers
function roundTo(value: number, decimals = 2): number {
  const safeDecimals = Math.max(0, Math.min(6, Math.trunc(decimals)));
  const factor = 10 ** safeDecimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function percentOfPrice(price: number | null, percent: number, decimals = 2): number | null {
  if (price == null) return null;
  if (!Number.isFinite(price)) return null;
  if (!Number.isFinite(percent)) return null;
  return roundTo(price * percent, decimals);
}

function derivePrice40(priceNew: number | null): number | null {
  return percentOfPrice(priceNew, 0.4);
}

function derivePrice70(priceNew: number | null): number | null {
  return percentOfPrice(priceNew, 0.7);
}

// Convert API vehicle format back to DB format (for backward compatibility)
function vehicleToDB(vehicle: Record<string, unknown>): VehicleDB {
  return {
    id: parseInt(vehicle.VehicleId as string),
    category: vehicle.Category as string,
    brand: vehicle.Brand as string,
    model: vehicle.Model as string,
    year: vehicle.Year as number,
    plate: vehicle.Plate as string,
    market_price: vehicle.PriceNew as number,
    tax_type: (vehicle.TaxType as string) || null,
    condition: vehicle.Condition as string,
    body_type: (vehicle.BodyType as string) || null,
    color: (vehicle.Color as string) || null,
    image_id: (vehicle.Image as string) || null,
    thumbnail_url: (vehicle.ThumbnailUrl as string) || null,
    created_at: vehicle.Time as string,
    updated_at: vehicle.Time as string,
  };
}

// Convert DB vehicle format to API vehicle format
export function toVehicle(dbVehicle: VehicleDB): Record<string, unknown> {
  const priceNew = typeof dbVehicle.market_price === 'string' 
    ? parseFloat(dbVehicle.market_price) 
    : (dbVehicle.market_price || 0);
  
  // Normalize category to match the stats format
  const normalizedCategory = normalizeCategory(dbVehicle.category);
  
  // Normalize image URL - converts Cloudinary public_ids to full URLs
  // Use thumbnail_url if available and is a valid URL, otherwise fall back to image_id
  const thumbnailUrl = dbVehicle.thumbnail_url?.trim();
  const hasValidThumbnail = thumbnailUrl && (
    thumbnailUrl.startsWith("http://") || 
    thumbnailUrl.startsWith("https://") || 
    thumbnailUrl.startsWith("data:")
  );
  const normalizedImage = hasValidThumbnail 
    ? thumbnailUrl 
    : normalizeImageUrl(dbVehicle.image_id);
  
  return {
    VehicleId: String(dbVehicle.id),
    Category: normalizedCategory,
    Brand: dbVehicle.brand,
    Model: dbVehicle.model,
    Year: dbVehicle.year,
    Plate: dbVehicle.plate,
    PriceNew: priceNew,
    Price40: derivePrice40(priceNew),
    Price70: derivePrice70(priceNew),
    TaxType: dbVehicle.tax_type,
    Condition: dbVehicle.condition,
    BodyType: dbVehicle.body_type,
    Color: dbVehicle.color,
    Image: normalizedImage,
    Time: dbVehicle.created_at,
  };
}
