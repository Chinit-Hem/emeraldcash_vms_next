import { vehicleService } from "@/services/VehicleService";
import Dashboard from "@/app/components/dashboard/Dashboard";

// Disable ISR caching - always fetch fresh data
export const revalidate = 0;

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

/**
 * Fetch dashboard data with error handling
 */
async function fetchDashboardData() {
  try {
    // Fetch vehicles and stats in parallel
    const [vehiclesResult, statsResult] = await Promise.all([
      vehicleService.getVehicles({ limit: 100 }),
      vehicleService.getVehicleStats(false),
    ]);

    // Extract data or use defaults
    const vehicles = vehiclesResult.success ? vehiclesResult.data || [] : [];
    const stats = statsResult.success ? statsResult.data : null;

    // Build metadata for client
    const meta = stats
      ? {
          total: stats.total,
          countsByCategory: {
            Cars: stats.byCategory.Cars || 0,
            Motorcycles: stats.byCategory.Motorcycles || 0,
            TukTuks: stats.byCategory.TukTuks || 0,
          },
          countsByCondition: {
            New: stats.byCondition.New || 0,
            Used: stats.byCondition.Used || 0,
          },
          noImageCount: stats.noImageCount,
          avgPrice: stats.avgPrice,
        }
      : null;

    return {
      vehicles,
      meta,
      error: !vehiclesResult.success ? vehiclesResult.error || "Failed to load vehicles" : null,
    };
  } catch (error) {
    console.error("[Dashboard Page] Error fetching data:", error);
    return {
      vehicles: [],
      meta: null,
      error: error instanceof Error ? error.message : "Database connection failed. Please check your connection.",
    };
  }
}

/**
 * Dashboard Server Component
 * Fetches initial data server-side with caching for performance
 */
export default async function Page() {
  const { vehicles, meta, error } = await fetchDashboardData();

  // iOS fix: Ensure meta has default values to prevent hydration mismatch
  const safeMeta = meta || {
    total: 0,
    countsByCategory: { Cars: 0, Motorcycles: 0, TukTuks: 0 },
    countsByCondition: { New: 0, Used: 0 },
    noImageCount: 0,
    avgPrice: 0,
  };

  return (
    <Dashboard
      initialVehicles={vehicles}
      initialMeta={safeMeta}
      initialError={error}
    />
  );
}
