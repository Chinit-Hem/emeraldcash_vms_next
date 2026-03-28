"use client";

import EnhancedDashboard from "@/app/components/dashboard/EnhancedDashboard";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { NeuDashboardSkeleton } from "@/app/components/skeletons";
import { useVehiclesNeon, useVehicleStats } from "@/lib/useVehiclesNeon";
import { Suspense } from "react";

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
  const { vehicles, meta, error, loading } = useVehiclesNeon();
  const { stats, loading: statsLoading } = useVehicleStats();

  const dashboardMeta: DashboardMeta = {
    total: stats?.total || meta?.total || vehicles.length || 0,
    countsByCategory: {
      Cars: stats?.byCategory?.Cars || 0,
      Motorcycles: stats?.byCategory?.Motorcycles || 0,
      TukTuks: stats?.byCategory?.TukTuks || 0,
    },
    countsByCondition: {
      New: stats?.byCondition?.New || 0,
      Used: stats?.byCondition?.Used || 0,
    },
    noImageCount: stats?.noImageCount || 0,
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

