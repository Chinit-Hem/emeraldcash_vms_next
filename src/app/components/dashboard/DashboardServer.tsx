/**
 * Dashboard Server Component
 * 
 * Server-side data fetching with Next.js caching for optimal performance.
 * Uses VehicleService for direct database access without API round-trip.
 * Implements revalidatePath for cache invalidation.
 * 
 * @module DashboardServer
 */

import { revalidatePath } from "next/cache";
import DashboardClient from "./DashboardClient";

// Cache tag for dashboard data
export const DASHBOARD_CACHE_TAG = "dashboard-vehicles";

// Revalidate every 60 seconds (ISR)
export const revalidate = 60;

/**
 * Fetch dashboard data server-side
 * Uses public API endpoints for stats (no auth required)
 */
async function getDashboardData() {
  try {
    console.log("[DashboardServer] Fetching dashboard data...");
    
    // Use relative URLs to avoid hardcoded base URL issues
    // This works correctly regardless of how the app is accessed (localhost, IP address, or domain)
    
    // Fetch vehicles and stats in parallel
    const [vehiclesRes, statsRes] = await Promise.all([
      fetch("/api/cleaned-vehicles?limit=1000", { 
        cache: "no-store",
        next: { revalidate: 0 }
      }),
      fetch("/api/cleaned-vehicles?stats=full", { 
        cache: "no-store",
        next: { revalidate: 0 }
      }),
    ]);

    console.log("[DashboardServer] Vehicles response status:", vehiclesRes.status);
    console.log("[DashboardServer] Stats response status:", statsRes.status);

    if (!vehiclesRes.ok || !statsRes.ok) {
      throw new Error(`Failed to fetch: vehicles=${vehiclesRes.status}, stats=${statsRes.status}`);
    }

    const vehiclesData = await vehiclesRes.json();
    const statsData = await statsRes.json();

    console.log("[DashboardServer] Vehicles result:", vehiclesData.success ? `${vehiclesData.data?.length} vehicles` : `Error: ${vehiclesData.error}`);
    console.log("[DashboardServer] Stats result:", statsData.success ? JSON.stringify(statsData.data) : `Error: ${statsData.error}`);

    if (!vehiclesData.success || !statsData.success) {
      throw new Error(vehiclesData.error || statsData.error || "Failed to fetch dashboard data");
    }

    // Debug: Log the raw stats data structure
    console.log("[DashboardServer] Raw stats data:", JSON.stringify(statsData.data, null, 2));
    console.log("[DashboardServer] byCategory:", JSON.stringify(statsData.data?.byCategory));
    console.log("[DashboardServer] byCondition:", JSON.stringify(statsData.data?.byCondition));

    // Ensure proper mapping from API response to meta structure
    const byCategory = statsData.data?.byCategory || {};
    const byCondition = statsData.data?.byCondition || {};
    
    console.log("[DashboardServer] byCategory type:", typeof byCategory);
    console.log("[DashboardServer] byCategory keys:", Object.keys(byCategory));
    console.log("[DashboardServer] byCategory.Cars:", byCategory.Cars);
    console.log("[DashboardServer] byCategory.Motorcycles:", byCategory.Motorcycles);
    console.log("[DashboardServer] byCategory.TukTuks:", byCategory.TukTuks);

    const meta = {
      total: statsData.data?.total || 0,
      countsByCategory: {
        Cars: byCategory.Cars || 0,
        Motorcycles: byCategory.Motorcycles || 0,
        TukTuks: byCategory.TukTuks || 0,
      },
      countsByCondition: {
        New: byCondition.New || 0,
        Used: byCondition.Used || 0,
      },
      noImageCount: statsData.data?.noImageCount || 0,
      avgPrice: statsData.data?.avgPrice || 0,
    };

    console.log("[DashboardServer] Final meta:", JSON.stringify(meta, null, 2));
    console.log("[DashboardServer] countsByCategory keys:", Object.keys(meta.countsByCategory));
    console.log("[DashboardServer] countsByCategory.Cars:", meta.countsByCategory.Cars);

    return {
      vehicles: vehiclesData.data || [],
      meta,
      error: null,
    };
  } catch (error) {
    console.error("[DashboardServer] Error fetching data:", error);
    return {
      vehicles: [],
      meta: null,
      error: error instanceof Error ? error.message : "Failed to load dashboard data",
    };
  }
}

/**
 * Server Action to revalidate dashboard cache
 * Call this after vehicle mutations (add, edit, delete)
 */
export async function revalidateDashboard() {
  "use server";
  revalidatePath("/dashboard");
  // Note: revalidateTag requires Next.js 14.1+ with specific config
  // Using revalidatePath only for compatibility
  console.log("[DashboardServer] Cache revalidated");
}

/**
 * Dashboard Server Component
 * Fetches data server-side and passes to client component for interactivity
 */
export default async function DashboardServer() {
  const { vehicles, meta, error } = await getDashboardData();

  // Pass server-fetched data to client component
  // Client component handles UI interactions (modals, toasts, etc.)
  return (
    <DashboardClient 
      initialVehicles={vehicles}
      initialMeta={meta}
      initialError={error}
      onRevalidate={revalidateDashboard}
    />
  );
}
