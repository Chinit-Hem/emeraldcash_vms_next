/**
 * Dashboard Client Component
 * 
 * Client-side interactivity for the dashboard.
 * Uses dynamic imports with ssr: false for charts to prevent hydration errors.
 * 
 * @module DashboardClient
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Vehicle } from "@/lib/types";
import { useMounted } from "@/lib/useHydrationSafe";
import { CATEGORY_COLORS } from "@/lib/categoryColors";

// Dynamic imports for charts (ssr: false prevents hydration errors)
const VehiclesByCategoryChart = dynamic(
  () => import("./charts/VehiclesByCategoryChart"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const NewVsUsedChart = dynamic(
  () => import("./charts/NewVsUsedChart"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const VehiclesByBrandChart = dynamic(
  () => import("./charts/VehiclesByBrandChart"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

// Types
type DashboardMeta = {
  total: number;
  countsByCategory: Record<string, number>;
  countsByCondition: Record<string, number>;
  noImageCount: number;
  avgPrice: number;
};

type DashboardClientProps = {
  initialVehicles: Vehicle[];
  initialMeta: DashboardMeta | null;
  initialError: string | null;
  onRevalidate: () => Promise<void>;
};

// Chart skeleton loader
function ChartSkeleton() {
  return (
    <div className="w-full h-[300px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  );
}

// Stat card component
function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = "emerald",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "emerald" | "blue" | "purple" | "orange" | "red";
}) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

// Icons
const Icons = {
  car: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  motorcycle: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="5.5" cy="17.5" r="2.5" strokeWidth={1.5} />
      <circle cx="17.5" cy="17.5" r="2.5" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 17h7l3-6H8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 11l2 6" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 11l2-3h3" />
    </svg>
  ),
  tuk: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v-3a2 2 0 0 1 2-2h8l3 3v3" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 13V9a2 2 0 0 1 2-2h2" />
      <circle cx="7" cy="17" r="2" strokeWidth={1.5} />
      <circle cx="17" cy="17" r="2" strokeWidth={1.5} />
    </svg>
  ),
  noImage: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
    </svg>
  ),
  refresh: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  totalVehicles: (
    <div className="flex items-center gap-1">
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="5.5" cy="17.5" r="2.5" strokeWidth={1.5} />
        <circle cx="17.5" cy="17.5" r="2.5" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 17h7l3-6H8.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 11l2 6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 11l2-3h3" />
      </svg>
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v-3a2 2 0 0 1 2-2h8l3 3v3" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 13V9a2 2 0 0 1 2-2h2" />
        <circle cx="7" cy="17" r="2" strokeWidth={1.5} />
        <circle cx="17" cy="17" r="2" strokeWidth={1.5} />
      </svg>
    </div>
  ),
};

/**
 * Dashboard Client Component
 */
export default function DashboardClient({
  initialVehicles,
  initialMeta,
  initialError,
  onRevalidate,
}: DashboardClientProps) {
  const isMounted = useMounted();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Use initial data
  const vehicles = initialVehicles;
  const meta = initialMeta;

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRevalidate();
      setError(null);
    } catch {
      setError("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }, [onRevalidate]);

  // Prepare chart data
  const categoryData = useMemo(() => {
    if (!meta) return [];
    return [
      { name: "Cars", value: meta.countsByCategory.Cars, color: CATEGORY_COLORS.Cars },
      { name: "Motorcycles", value: meta.countsByCategory.Motorcycles, color: CATEGORY_COLORS.Motorcycles },
      { name: "Tuk Tuks", value: meta.countsByCategory.TukTuks, color: CATEGORY_COLORS.TukTuks },
    ].filter((item) => item.value > 0);
  }, [meta]);

  const conditionData = useMemo(() => {
    if (!meta) return [];
    return [
      { name: "New", value: meta.countsByCondition.New, color: "#10b981" },
      { name: "Used", value: meta.countsByCondition.Used, color: "#6b7280" },
    ].filter((item) => item.value > 0);
  }, [meta]);

  // Calculate brand distribution - normalize to uppercase for consistent grouping
  const brandData = useMemo(() => {
    const brandCounts: Record<string, number> = {};
    vehicles.forEach((v) => {
      const brand = (v.Brand || "Unknown").toUpperCase();
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    });
    return Object.entries(brandCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [vehicles]);

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Don't render charts until mounted (prevents hydration mismatch)
  if (!isMounted) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {meta?.total.toLocaleString()} total vehicles
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <span className={isRefreshing ? "animate-spin" : ""}>{Icons.refresh}</span>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Vehicles"
          value={meta?.total.toLocaleString() || "0"}
          subtitle={`${meta?.noImageCount || 0} without images`}
          icon={Icons.totalVehicles}
          color="emerald"
        />
        <StatCard
          title="Cars"
          value={meta?.countsByCategory.Cars.toLocaleString() || "0"}
          subtitle="All car types"
          icon={Icons.car}
          color="blue"
        />
        <StatCard
          title="Motorcycles"
          value={meta?.countsByCategory.Motorcycles.toLocaleString() || "0"}
          subtitle="All motorcycle types"
          icon={Icons.motorcycle}
          color="purple"
        />
        <StatCard
          title="Tuk Tuks"
          value={meta?.countsByCategory.TukTuks.toLocaleString() || "0"}
          subtitle="All tuk tuk types"
          icon={Icons.tuk}
          color="orange"
        />
        <Link href="/vehicles?noImage=1" className="block no-underline">
          <StatCard
            title="No Images"
            value={meta?.noImageCount.toLocaleString() || "0"}
            subtitle="Click to view"
            icon={Icons.noImage}
            color="red"
          />
        </Link>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicles by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Vehicles by Category
          </h3>
          <div className="w-full h-[300px]">
            <VehiclesByCategoryChart data={categoryData} />
          </div>
        </div>

        {/* New vs Used */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            New vs Used
          </h3>
          <div className="w-full h-[300px]">
            <NewVsUsedChart data={conditionData} />
          </div>
        </div>

        {/* Top Brands */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Brands
          </h3>
          <div className="w-full h-[300px]">
            <VehiclesByBrandChart data={brandData} />
          </div>
        </div>
      </div>
    </div>
  );
}
