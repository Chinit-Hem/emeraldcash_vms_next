"use client";

import EnhancedDashboard from "@/app/components/dashboard/EnhancedDashboard";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { NeuDashboardSkeleton } from "@/app/components/skeletons";
import { useVehiclesNeon, useVehicleStats } from "@/lib/useVehiclesNeon";
import { mutate } from "swr";
import { Suspense, useEffect } from "react";

type DashboardMeta = {
  total: number;
  countsByCategory: {
    Cars: number;
    Motorcycles: number;
    TukTuks: number;
  };
  countsByCondition: {
    New: number;
    Used: number;
  };
  noImageCount: number;
  avgPrice: number;
};

/**
 * Dashboard Page - Client component with data fetching
 * Provides initial props to EnhancedDashboard from useVehiclesNeon
 */
export default function Page() {
  // Clear SWR cache on mount to ensure fresh data
  useEffect(() => {
    // Clear all vehicle-related SWR cache including stats
    mutate(
      (key) => typeof key === "string" && (key.startsWith("/api/vehicles") || key.includes("/stats")),
      undefined,
      { revalidate: true }
    );
  }, []);

  const { vehicles, meta, error, loading } = useVehiclesNeon();
  const { stats, loading: statsLoading } = useVehicleStats();

  // DEBUG: Log the values to see what's happening
  useEffect(() => {
    console.log('[DEBUG] stats:', stats);
    console.log('[DEBUG] dashboardMeta:', {
      total: stats?.total ?? meta?.total ?? 0,
      noImageCount: (stats?.noImageCount ?? meta?.noImageCount) || 0,
      avgPrice: stats?.avgPrice || 0,
    });
  }, [stats, meta]);

  const dashboardMeta: DashboardMeta = {
    // Use stats.total if available (accurate count from DB), otherwise show loading state
    total: stats?.total ?? meta?.total ?? 0,
    countsByCategory: {
      Cars: stats?.byCategory?.Cars || 0,
      Motorcycles: stats?.byCategory?.Motorcycles || 0,
      TukTuks: stats?.byCategory?.TukTuks || 0,
    },
    countsByCondition: {
      New: stats?.byCondition?.New || 0,
      Used: stats?.byCondition?.Used || 0,
    },
    noImageCount: (stats?.noImageCount ?? meta?.noImageCount) || 0,
    avgPrice: stats?.avgPrice || 0,
  };

  if (loading || statsLoading) {
    return <NeuDashboardSkeleton />;
  }

  return (
    <ErrorBoundary fallback={<NeuDashboardSkeleton />}>
      <Suspense fallback={<NeuDashboardSkeleton />}>
        <EnhancedDashboard 
          initialVehicles={vehicles.slice(0, 50)}
          initialMeta={dashboardMeta}
          initialError={error ? 'Failed to load dashboard data' : null}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

