// Database schema definitions and CRUD operations for vehicles
import { sql } from "./db";



// Vehicle type definition matching the cleaned_vehicles_for_google_sheets table schema (14 columns)
export interface VehicleDB {
  id: number;
  category: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  market_price: number;
  tax_type: string | null;
  condition: string;
  body_type: string | null;
  color: string | null;
  image_id: string | null;
  created_at: string;
  updated_at: string;
}



// Note: The cleaned_vehicles_for_google_sheets table is managed by Google Sheets sync
// This function is kept for compatibility but doesn't create the table
export async function createVehiclesTable(): Promise<void> {
  // Table is created by Google Sheets sync, not by the application
  console.log("cleaned_vehicles_for_google_sheets table is managed by Google Sheets sync");
}


// Get all vehicles (alias for getVehicles without filters)
export async function getAllVehicles(): Promise<VehicleDB[]> {
  return await getVehicles();
}

// Get all vehicles with optional filtering
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

  let query = sql`SELECT * FROM cleaned_vehicles_for_google_sheets WHERE 1=1`;
  
  if (filters?.category) {
    query = sql`${query} AND TRIM(category) ILIKE ${filters.category}`;
  }
  
  if (filters?.brand) {
    query = sql`${query} AND brand ILIKE ${`%${filters.brand}%`}`;
  }
  
  if (filters?.condition) {
    query = sql`${query} AND condition = ${filters.condition}`;
  }
  
  if (filters?.yearMin) {
    query = sql`${query} AND year >= ${filters.yearMin}`;
  }
  
  if (filters?.yearMax) {
    query = sql`${query} AND year <= ${filters.yearMax}`;
  }
  
  if (filters?.priceMin) {
    query = sql`${query} AND market_price >= ${filters.priceMin}`;
  }
  
  if (filters?.priceMax) {
    query = sql`${query} AND market_price <= ${filters.priceMax}`;
  }
  
  query = sql`${query} ORDER BY id ASC`;
  
  if (filters?.limit) {
    query = sql`${query} LIMIT ${filters.limit}`;
  }
  
  if (filters?.offset) {
    query = sql`${query} OFFSET ${filters.offset}`;
  }
  
  return await query as VehicleDB[];
}



// Get a single vehicle by ID
export async function getVehicleById(id: number): Promise<VehicleDB | null> {
  const result = await sql`SELECT * FROM cleaned_vehicles_for_google_sheets WHERE id = ${id}`;
  return (result[0] as VehicleDB) || null;
}

// Get a single vehicle by plate (since cleaned_vehicles_for_google_sheets doesn't have vehicle_id)
export async function getVehicleByPlate(plate: string): Promise<VehicleDB | null> {
  const result = await sql`SELECT * FROM cleaned_vehicles_for_google_sheets WHERE plate = ${plate}`;
  return (result[0] as VehicleDB) || null;
}



// Create a new vehicle
export async function createVehicle(vehicle: Omit<VehicleDB, "id" | "created_at" | "updated_at">): Promise<VehicleDB> {
  const now = new Date().toISOString();
  
  // Get the next available ID
  const maxIdResult = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM cleaned_vehicles_for_google_sheets`;
  const nextId = maxIdResult[0].next_id;
  
  const result = await sql`
    INSERT INTO cleaned_vehicles_for_google_sheets (
      id, category, brand, model, year, plate, market_price,
      tax_type, condition, body_type, color, image_id,
      created_at, updated_at
    ) VALUES (
      ${nextId},
      ${vehicle.category}, 
      ${vehicle.brand}, 
      ${vehicle.model}, 
      ${vehicle.year || new Date().getFullYear()}, 
      ${vehicle.plate},
      ${vehicle.market_price || 0}, 
      ${vehicle.tax_type},
      ${vehicle.condition}, 
      ${vehicle.body_type},
      ${vehicle.color},
      ${vehicle.image_id},
      ${now},
      ${now}
    )
    RETURNING *
  `;
  return result[0] as VehicleDB;
}






// Update a vehicle
export async function updateVehicle(id: number, vehicle: Partial<VehicleDB>): Promise<VehicleDB | null> {
  const result = await sql`
    UPDATE cleaned_vehicles_for_google_sheets 
    SET 
      category = COALESCE(${vehicle.category}, category),
      brand = COALESCE(${vehicle.brand}, brand),
      model = COALESCE(${vehicle.model}, model),
      year = COALESCE(${vehicle.year}, year),
      plate = COALESCE(${vehicle.plate}, plate),
      market_price = COALESCE(${vehicle.market_price}, market_price),
      tax_type = COALESCE(${vehicle.tax_type}, tax_type),
      condition = COALESCE(${vehicle.condition}, condition),
      body_type = COALESCE(${vehicle.body_type}, body_type),
      color = COALESCE(${vehicle.color}, color),
      image_id = COALESCE(${vehicle.image_id}, image_id),
      updated_at = ${new Date().toISOString()}
    WHERE id = ${id}
    RETURNING *
  `;
  return (result[0] as VehicleDB) || null;
}




// Delete a vehicle
export async function deleteVehicle(id: number): Promise<boolean> {
  const result = await sql`DELETE FROM cleaned_vehicles_for_google_sheets WHERE id = ${id} RETURNING id`;
  return result.length > 0;
}


// Normalize condition to proper case
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

// Get vehicle statistics
export async function getVehicleStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  byCondition: Record<string, number>;
  avgPrice: number;
}> {
  const totalResult = await sql`SELECT COUNT(*) as count FROM cleaned_vehicles_for_google_sheets`;
  const total = parseInt(totalResult[0].count);
  
  const byCategoryResult = await sql`
    SELECT category, COUNT(*) as count 
    FROM cleaned_vehicles_for_google_sheets 
    GROUP BY category
  `;
  
  // Merge counts by normalized category to avoid duplicates
  const byCategory: Record<string, number> = {};
  for (const row of byCategoryResult) {
    const normalized = normalizeCategory(row.category);
    byCategory[normalized] = (byCategory[normalized] || 0) + parseInt(row.count);
  }
  
  const byConditionResult = await sql`
    SELECT condition, COUNT(*) as count 
    FROM cleaned_vehicles_for_google_sheets 
    GROUP BY condition
  `;
  
  // Merge counts by normalized condition to avoid duplicates
  const byCondition: Record<string, number> = { New: 0, Used: 0, Other: 0 };
  for (const row of byConditionResult) {
    const normalized = normalizeCondition(row.condition);
    byCondition[normalized] += parseInt(row.count);
  }
  
  const avgPriceResult = await sql`
    SELECT AVG(market_price) as avg_price 
    FROM cleaned_vehicles_for_google_sheets 
    WHERE market_price IS NOT NULL
  `;
  const avgPrice = parseFloat(avgPriceResult[0].avg_price) || 0;
  
  return {
    total,
    byCategory,
    byCondition,
    avgPrice
  };
}


// Search vehicles by text
export async function searchVehicles(searchTerm: string): Promise<VehicleDB[]> {
  const pattern = `%${searchTerm}%`;
  const result = await sql`
    SELECT * FROM cleaned_vehicles_for_google_sheets 
    WHERE 
      brand ILIKE ${pattern} OR
      model ILIKE ${pattern} OR
      plate ILIKE ${pattern}
    ORDER BY brand, model
  `;
  return result as VehicleDB[];
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

// Convert DB vehicle format to API vehicle format
export function toVehicle(dbVehicle: VehicleDB): Record<string, unknown> {
  const priceNew = typeof dbVehicle.market_price === 'string' 
    ? parseFloat(dbVehicle.market_price) 
    : (dbVehicle.market_price || 0);
  
  // Normalize category to match the stats format
  const normalizedCategory = normalizeCategory(dbVehicle.category);
  
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
    Image: dbVehicle.image_id || "",
    Time: dbVehicle.created_at,
  };
}
