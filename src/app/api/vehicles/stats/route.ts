/**
 * Vehicles Stats API Route
 * Returns category counts and statistics from Neon database
 * 
 * @module api/vehicles/stats
 */

export const runtime = 'edge';
export const preferredRegion = 'iad1';

import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

/**
 * Get Neon SQL client
 */
function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not configured");
  }

  const url = new URL(databaseUrl);
  url.searchParams.set('sdk_semver', '1.0.2');
  
  return neon(url.toString());
}

/**
 * Normalize category for counting
 */
function normalizeCategory(category: string): string {
  if (!category) return "Other";
  const lower = category.toLowerCase().trim();
  
  if (lower.includes("car")) return "Cars";
  if (lower.includes("motor")) return "Motorcycles";
  if (lower.includes("tuk")) return "TukTuks";
  if (lower.includes("truck")) return "Trucks";
  if (lower.includes("van")) return "Vans";
  if (lower.includes("bus")) return "Buses";
  
  return "Other";
}

export async function GET() {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    const sql = getSqlClient();
    
    // Get total count
    const totalResult = await sql.query(
      "SELECT COUNT(*) as count FROM vehicles",
      []
    );
    const total = parseInt((totalResult[0] as { count: string })?.count || "0", 10);
    
    // Get counts by category using raw category values from DB
    const categoryResult = await sql.query(
      `SELECT 
        LOWER(TRIM(category)) as category,
        COUNT(*) as count
      FROM vehicles
      GROUP BY LOWER(TRIM(category))`,
      []
    );
    
    // Initialize counters
    let cars = 0;
    let motorcycles = 0;
    let tuktuks = 0;
    let trucks = 0;
    let vans = 0;
    let buses = 0;
    let other = 0;
    
    // Process category results
    (categoryResult as { category: string; count: string }[]).forEach((row) => {
      const cat = row.category || "";
      const count = parseInt(row.count, 10);
      
      if (cat.includes("car")) {
        cars += count;
      } else if (cat.includes("motor") || cat.includes("bike") || cat.includes("scooter")) {
        motorcycles += count;
      } else if (cat.includes("tuk") || cat.includes("rickshaw") || cat.includes("three wheel")) {
        tuktuks += count;
      } else if (cat.includes("truck")) {
        trucks += count;
      } else if (cat.includes("van")) {
        vans += count;
      } else if (cat.includes("bus")) {
        buses += count;
      } else {
        other += count;
      }
    });
    
    // Get counts by condition
    const conditionResult = await sql.query(
      `SELECT 
        LOWER(TRIM(condition)) as condition,
        COUNT(*) as count
      FROM vehicles
      GROUP BY LOWER(TRIM(condition))`,
      []
    );
    
    let newCount = 0;
    let usedCount = 0;
    
    (conditionResult as { condition: string; count: string }[]).forEach((row) => {
      const cond = row.condition || "";
      const count = parseInt(row.count, 10);
      
      if (cond.includes("new")) {
        newCount += count;
      } else if (cond.includes("used")) {
        usedCount += count;
      }
    });
    
    const durationMs = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      data: {
        total,
        byCategory: {
          Cars: cars,
          Motorcycles: motorcycles,
          TukTuks: tuktuks,
          Trucks: trucks,
          Vans: vans,
          Buses: buses,
          Other: other,
        },
        byCondition: {
          New: newCount,
          Used: usedCount,
        },
      },
      meta: {
        durationMs,
        requestId,
      },
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Request-ID": requestId,
        "X-Response-Time": `${durationMs}ms`,
      },
    });
    
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[Vehicles Stats API] Error: ${errorMessage}`, {
      requestId,
      durationMs,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        meta: {
          durationMs,
          requestId,
        },
      },
      {
        status: 500,
        headers: {
          "X-Request-ID": requestId,
          "X-Response-Time": `${durationMs}ms`,
        },
      }
    );
  }
}
