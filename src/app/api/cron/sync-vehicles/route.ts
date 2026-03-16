import { NextRequest, NextResponse } from "next/server";
import { setCachedVehicles } from "../../vehicles/_cache";
import type { Vehicle, VehicleMeta } from "@/lib/types";

// Logging utility
function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    service: "cron-sync-vehicles",
    ...meta,
  };
  
  // In production, you might want to send this to a logging service
  if (level === "error") {
    console.error(JSON.stringify(logEntry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// Validation functions
function isValidVehicle(vehicle: unknown): vehicle is Vehicle {
  if (!vehicle || typeof vehicle !== "object") return false;
  
  const v = vehicle as Record<string, unknown>;
  
  // Required fields
  if (!v.VehicleId || String(v.VehicleId).trim() === "") return false;
  if (!v.Category || String(v.Category).trim() === "") return false;
  if (!v.Brand || String(v.Brand).trim() === "") return false;
  if (!v.Model || String(v.Model).trim() === "") return false;
  
  // Validate data types
  if (v.Year !== undefined && v.Year !== null) {
    const year = Number(v.Year);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2) {
      return false;
    }
  }
  
  if (v.PriceNew !== undefined && v.PriceNew !== null) {
    const price = Number(v.PriceNew);
    if (isNaN(price) || price < 0) {
      return false;
    }
  }
  
  return true;
}

function sanitizeConfidence(value: unknown): "High" | "Medium" | "Low" | null {
  if (!value) return null;
  const str = String(value).trim().toLowerCase();
  if (str === "high") return "High";
  if (str === "medium") return "Medium";
  if (str === "low") return "Low";
  return null;
}

function sanitizeVehicle(vehicle: Vehicle): Vehicle {
  return {
    ...vehicle,
    VehicleId: String(vehicle.VehicleId).trim(),
    Category: String(vehicle.Category).trim(),
    Brand: String(vehicle.Brand).trim(),
    Model: String(vehicle.Model).trim(),
    Year: vehicle.Year ? Number(vehicle.Year) : undefined,
    Plate: vehicle.Plate ? String(vehicle.Plate).trim() : undefined,
    PriceNew: vehicle.PriceNew ? Number(vehicle.PriceNew) : undefined,
    Price40: vehicle.Price40 ? Number(vehicle.Price40) : undefined,
    Price70: vehicle.Price70 ? Number(vehicle.Price70) : undefined,
    TaxType: vehicle.TaxType ? String(vehicle.TaxType).trim() : undefined,
    Condition: vehicle.Condition ? String(vehicle.Condition).trim() : undefined,
    BodyType: vehicle.BodyType ? String(vehicle.BodyType).trim() : undefined,
    Color: vehicle.Color ? String(vehicle.Color).trim() : undefined,
    Image: vehicle.Image ? String(vehicle.Image).trim() : undefined,
    Time: vehicle.Time ? String(vehicle.Time).trim() : undefined,
    // Market price fields
    MarketPriceLow: vehicle.MarketPriceLow ? Number(vehicle.MarketPriceLow) : undefined,
    MarketPriceMedian: vehicle.MarketPriceMedian ? Number(vehicle.MarketPriceMedian) : undefined,
    MarketPriceHigh: vehicle.MarketPriceHigh ? Number(vehicle.MarketPriceHigh) : undefined,
    MarketPriceSource: vehicle.MarketPriceSource ? String(vehicle.MarketPriceSource).trim() : undefined,
    MarketPriceSamples: vehicle.MarketPriceSamples ? Number(vehicle.MarketPriceSamples) : undefined,
    MarketPriceConfidence: sanitizeConfidence(vehicle.MarketPriceConfidence),
    MarketPriceUpdatedAt: vehicle.MarketPriceUpdatedAt ? String(vehicle.MarketPriceUpdatedAt).trim() : undefined,
  };
}


// Fetch vehicles from Google Apps Script
async function fetchVehiclesFromSheet(baseUrl: string): Promise<{ vehicles: Vehicle[]; meta: VehicleMeta; duration: number }> {
  const startTime = Date.now();
  
  const appsScriptUrl = (base: string, action: string) => {
    const u = new URL(base);
    u.searchParams.set("action", action);
    return u.toString();
  };

  const toIntOrNull = (value: unknown): number | null => {
    if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : null;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const fetchVehiclesPage = async (offset: number, limit: number) => {
    const url = new URL(appsScriptUrl(baseUrl, "getVehicles"));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url.toString(), {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Apps Script error: ${res.status}`);
    }

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (json.ok === false) {
      const message = typeof json.error === "string" && json.error.trim() ? json.error.trim() : "Apps Script ok=false";
      throw new Error(message);
    }

    const rows = (Array.isArray(json.data) ? (json.data as unknown[]) : [])
      .filter((row) => row && typeof row === "object") as Record<string, unknown>[];

    const metaRaw = json.meta && typeof json.meta === "object" ? (json.meta as Record<string, unknown>) : null;
    const meta = metaRaw
      ? {
          total: toIntOrNull(metaRaw.total),
          limit: toIntOrNull(metaRaw.limit),
          offset: toIntOrNull(metaRaw.offset),
        }
      : null;

    return { rows, meta };
  };

  // Fetch all pages
  const requestedLimit = 500;
  const maxPages = 50;

  let offset = 0;
  let total: number | null = null;
  let lastMetaOffset: number | null = null;
  const allRows: Record<string, unknown>[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _pageCounter = 0;

  for (let page = 0; page < maxPages; page++) {
    const { rows, meta } = await fetchVehiclesPage(offset, requestedLimit);
    // Page counter for tracking (intentionally unused)
    void _pageCounter;

    // Filter out empty rows
    const validRows = rows.filter((row) => {
      const vehicleId = row["VehicleId"] || row["VehicleID"] || row["Id"] || row["id"] || row["#"];
      const hasId = vehicleId !== undefined && vehicleId !== null && String(vehicleId).trim() !== "";
      const hasData = Object.values(row).some(v => v !== undefined && v !== null && v !== "");
      return hasId && hasData;
    });

    allRows.push(...validRows);

    if (!meta) break;

    if (meta.total != null && meta.total >= 0) total ??= meta.total;

    const effectiveLimit = meta.limit && meta.limit > 0 ? meta.limit : requestedLimit;
    const effectiveOffset = meta.offset != null && meta.offset >= 0 ? meta.offset : offset;

    if (lastMetaOffset != null && effectiveOffset === lastMetaOffset) break;
    lastMetaOffset = effectiveOffset;

    if (rows.length === 0) break;
    if (total != null && allRows.length >= total) break;

    offset = effectiveOffset + effectiveLimit;
    if (total != null && offset >= total) break;
  }

  // Convert to vehicles
  const vehicles = allRows.map((row) => ({
    VehicleId: String(row["VehicleId"] || row["VehicleID"] || row["Id"] || row["id"] || row["#"] || ""),
    Category: String(row["Category"] || row["category"] || ""),
    Brand: String(row["Brand"] || row["brand"] || ""),
    Model: String(row["Model"] || row["model"] || ""),
    Year: row["Year"] ? Number(row["Year"]) : undefined,
    Plate: row["Plate"] ? String(row["Plate"]) : undefined,
    PriceNew: row["PriceNew"] || row["MARKET PRICE"] ? Number(row["PriceNew"] || row["MARKET PRICE"]) : undefined,
    Price40: row["Price40"] || row["D.O.C.40%"] ? Number(row["Price40"] || row["D.O.C.40%"]) : undefined,
    Price70: row["Price70"] || row["Vehicles70%"] ? Number(row["Price70"] || row["Vehicles70%"]) : undefined,
    TaxType: row["TaxType"] || row["Tax Type"] ? String(row["TaxType"] || row["Tax Type"]) : undefined,
    Condition: row["Condition"] ? String(row["Condition"]) : undefined,
    BodyType: row["BodyType"] || row["Body Type"] ? String(row["BodyType"] || row["Body Type"]) : undefined,
    Color: row["Color"] ? String(row["Color"]) : undefined,
    Image: row["Image"] ? String(row["Image"]) : undefined,
    Time: row["Time"] ? String(row["Time"]) : undefined,
    MarketPriceLow: row["MarketPriceLow"] || row["MARKET_PRICE_LOW"] ? Number(row["MarketPriceLow"] || row["MARKET_PRICE_LOW"]) : undefined,
    MarketPriceMedian: row["MarketPriceMedian"] || row["MARKET_PRICE_MEDIAN"] ? Number(row["MarketPriceMedian"] || row["MARKET_PRICE_MEDIAN"]) : undefined,
    MarketPriceHigh: row["MarketPriceHigh"] || row["MARKET_PRICE_HIGH"] ? Number(row["MarketPriceHigh"] || row["MARKET_PRICE_HIGH"]) : undefined,
    MarketPriceSource: row["MarketPriceSource"] || row["MARKET_PRICE_SOURCE"] ? String(row["MarketPriceSource"] || row["MARKET_PRICE_SOURCE"]) : undefined,
    MarketPriceSamples: row["MarketPriceSamples"] || row["MARKET_PRICE_SAMPLES"] ? Number(row["MarketPriceSamples"] || row["MARKET_PRICE_SAMPLES"]) : undefined,
    MarketPriceConfidence: row["MarketPriceConfidence"] || row["MARKET_PRICE_CONFIDENCE"] ? String(row["MarketPriceConfidence"] || row["MARKET_PRICE_CONFIDENCE"]) : undefined,
    MarketPriceUpdatedAt: row["MarketPriceUpdatedAt"] || row["MARKET_PRICE_UPDATED_AT"] ? String(row["MarketPriceUpdatedAt"] || row["MARKET_PRICE_UPDATED_AT"]) : undefined,
  })).filter(v => v.VehicleId && v.VehicleId.trim() !== "") as Vehicle[];

  // Validate and sanitize
  const validVehicles = vehicles.filter(isValidVehicle).map(sanitizeVehicle);

  // Compute meta
  const meta: VehicleMeta = {
    total: validVehicles.length,
    countsByCategory: {
      Cars: validVehicles.filter(v => v.Category === "Cars").length,
      Motorcycles: validVehicles.filter(v => v.Category === "Motorcycles").length,
      TukTuks: validVehicles.filter(v => v.Category === "Tuk Tuk").length,
    },
    avgPrice: validVehicles.length > 0
      ? validVehicles.reduce((sum, v) => sum + (v.PriceNew || 0), 0) / validVehicles.length
      : 0,
    noImageCount: validVehicles.filter(v => !v.Image).length,
    countsByCondition: {
      New: validVehicles.filter(v => v.Condition === "New").length,
      Used: validVehicles.filter(v => v.Condition === "Used").length,
    },
  };

  const duration = Date.now() - startTime;

  return { vehicles: validVehicles, meta, duration };
}

// Main handler
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const cronSecret = process.env.CRON_SECRET;
  
  // Verify cron secret if configured
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      log("error", "Unauthorized cron request", { ip: clientIp });
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }


  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    log("error", "Missing NEXT_PUBLIC_API_URL configuration");
    return NextResponse.json({ ok: false, error: "Missing API configuration" }, { status: 500 });
  }

  try {
    log("info", "Starting scheduled vehicle sync", { baseUrl });

    // Fetch and validate data
    const { vehicles, meta, duration: fetchDuration } = await fetchVehiclesFromSheet(baseUrl);
    
    // Update cache
    setCachedVehicles(vehicles);
    
    const totalDuration = Date.now() - startTime;
    
    // Log success metrics
    log("info", "Vehicle sync completed successfully", {
      vehicleCount: vehicles.length,
      fetchDuration,
      totalDuration,
      cacheUpdated: true,
      categories: meta.countsByCategory,
      conditions: meta.countsByCondition,
      avgPrice: meta.avgPrice,
      noImageCount: meta.noImageCount,
    });

    return NextResponse.json({
      ok: true,
      message: "Vehicle sync completed",
      metrics: {
        vehicleCount: vehicles.length,
        fetchDuration,
        totalDuration,
        categories: meta.countsByCategory,
        conditions: meta.countsByCondition,
        avgPrice: meta.avgPrice,
        noImageCount: meta.noImageCount,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log("error", "Vehicle sync failed", { 
      error: errorMessage,
      duration: Date.now() - startTime,
    });
    
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req);
}
