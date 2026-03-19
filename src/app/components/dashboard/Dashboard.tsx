/**
 * Dashboard Component - Complete A-to-Z Refactor
 * 
 * Features:
 * A. Case-insensitive data counting with SQL LOWER()
 * B. O(n) Hash Map aggregation + 300ms debounced search
 * C. Fixed Recharts with proper containers + ssr: false
 * D. Skeleton loaders + 100% responsive mobile layout
 * 
 * @module Dashboard
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Vehicle } from "@/lib/types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { normalizeCategoryLabel } from "@/lib/analytics";
import { CATEGORY_COLORS } from "@/lib/categoryColors";
import { safeGetMonthKey } from "@/lib/safeDate";

// ============================================================================
// Dynamic Chart Imports (ssr: false prevents hydration errors)
// ============================================================================

const VehiclesByCategoryChart = dynamic(
  () => import("./charts/VehiclesByCategoryChart"),
  { 
    ssr: false, 
    loading: () => <ChartSkeleton height={300} /> 
  }
);

const NewVsUsedChart = dynamic(
  () => import("./charts/NewVsUsedChart"),
  { 
    ssr: false, 
    loading: () => <ChartSkeleton height={300} /> 
  }
);

const VehiclesByBrandChart = dynamic(
  () => import("./charts/VehiclesByBrandChart"),
  { 
    ssr: false, 
    loading: () => <ChartSkeleton height={300} /> 
  }
);

const MonthlyAddedChart = dynamic(
  () => import("./charts/MonthlyAddedChart"),
  { 
    ssr: false, 
    loading: () => <ChartSkeleton height={300} /> 
  }
);

// ============================================================================
// Types & Interfaces
// ============================================================================

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

type DashboardProps = {
  initialVehicles: Vehicle[];
  initialMeta: DashboardMeta;
  initialError: string | null;
};

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  subtitleHref?: string;
  icon: React.ReactNode;
  color?: "emerald" | "blue" | "purple" | "orange" | "red";
  isLoading?: boolean;
  onClick?: () => void;
  href?: string;
};

type ChartSkeletonProps = {
  height?: number;
};

// ============================================================================
// Utility Components
// ============================================================================

/**
 * Chart Skeleton Loader
 */
function ChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div 
      className="w-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse"
      style={{ height: `${height}px` }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 animate-spin" />
        <span className="text-sm text-gray-400 dark:text-gray-500">Loading chart...</span>
      </div>
    </div>
  );
}

/**
 * Stat Card with Skeleton State
 */
function StatCard({
  title,
  value,
  subtitle,
  subtitleHref,
  icon,
  color = "emerald",
  isLoading = false,
  onClick,
  href,
}: StatCardProps) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  };

  const isClickable = !!onClick || !!href;
  const clickableClasses = isClickable 
    ? "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200" 
    : "hover:shadow-md transition-shadow";

  // If we have both href and subtitleHref, we can't nest anchors
  // Instead, use a div with onClick for the main card and a separate anchor for subtitle
  const hasNestedLinks = href && subtitleHref;

  const subtitleContent = subtitle && subtitleHref ? (
    <a 
      href={subtitleHref} 
      className="text-xs text-red-500 dark:text-red-400 mt-1 truncate hover:underline cursor-pointer inline-block relative z-10"
      onClick={(e) => e.stopPropagation()}
    >
      {subtitle}
    </a>
  ) : subtitle ? (
    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{subtitle}</p>
  ) : null;

  const innerContent = (
    <div className="flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        {subtitleContent}
      </div>
      <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${colorClasses[color]}`}>
        {icon}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]} opacity-50`}>
            {icon}
          </div>
        </div>
      </div>
    );
  }

  // When we have nested links (href + subtitleHref), use div with onClick instead of anchor
  if (hasNestedLinks) {
    return (
      <div 
        className={`bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${clickableClasses}`}
        onClick={() => window.location.href = href!}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            window.location.href = href!;
          }
        }}
      >
        {innerContent}
      </div>
    );
  }

  if (href) {
    return (
      <a href={href} className="block no-underline">
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${clickableClasses}`}>
          {innerContent}
        </div>
      </a>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${clickableClasses}`}>
          {innerContent}
        </div>
      </button>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${clickableClasses}`}>
      {innerContent}
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  car: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  ),
  motorcycle: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="5.5" cy="17.5" r="2.5" strokeWidth={1.5} />
      <circle cx="17.5" cy="17.5" r="2.5" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 17h7l3-6H8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 11l2 6" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 11l2-3h3" />
    </svg>
  ),
  tuk: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v-3a2 2 0 0 1 2-2h8l3 3v3" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 13V9a2 2 0 0 1 2-2h2" />
      <circle cx="7" cy="17" r="2" strokeWidth={1.5} />
      <circle cx="17" cy="17" r="2" strokeWidth={1.5} />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  image: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  noImage: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

// Filter out invalid/placeholder brands that aren't real vehicle brands
const INVALID_BRANDS = ['DIRECT_DB', 'TEST', 'UNKNOWN', 'N/A', 'NULL', 'NONE', ''];

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function Dashboard({
  initialVehicles,
  initialMeta,
  initialError,
}: DashboardProps) {
  // iOS fix: Use state for data to handle hydration issues
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [meta, setMeta] = useState<DashboardMeta>(initialMeta);
  
  // B. Debounced search (300ms) for smooth performance
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // iOS fix: Ensure data is set on mount if initial props change
  useEffect(() => {
    setVehicles(initialVehicles);
    setMeta(initialMeta);
  }, [initialVehicles, initialMeta]);

  // ============================================================================
  // B. O(n) Hash Map Aggregation - Single Pass Algorithm
  // ============================================================================
  
  const aggregatedStats = useMemo(() => {
    if (!vehicles.length) return null;

    // Single pass O(n) aggregation using Hash Maps
    const stats = {
      byCategory: {} as Record<string, number>,
      byCondition: {} as Record<string, number>,
      byBrand: {} as Record<string, number>,
      byMonth: {} as Record<string, number>,
      totalValue: 0,
      withImages: 0,
      withoutImages: 0,
    };

    for (const vehicle of vehicles) {
      // A. Case-insensitive category counting
      const category = (vehicle.Category || "Unknown").toLowerCase().trim();
      const normalizedCategory = category.includes("car") ? "Cars" :
                                  category.includes("motor") ? "Motorcycles" :
                                  category.includes("tuk") ? "TukTuks" : "Other";
      
      stats.byCategory[normalizedCategory] = (stats.byCategory[normalizedCategory] || 0) + 1;

      // Condition counting
      const condition = (vehicle.Condition || "Unknown").toLowerCase().trim();
      const normalizedCondition = condition.includes("new") ? "New" :
                                   condition.includes("used") ? "Used" : "Other";
      stats.byCondition[normalizedCondition] = (stats.byCondition[normalizedCondition] || 0) + 1;

      // Brand counting - normalize to uppercase for consistent grouping
      const brand = (vehicle.Brand || "Unknown").toUpperCase();
      stats.byBrand[brand] = (stats.byBrand[brand] || 0) + 1;

      // Monthly aggregation - Safari-safe date parsing
      if (vehicle.Time) {
        const monthKey = safeGetMonthKey(vehicle.Time);
        if (monthKey) {
          stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;
        }
      }

      // Price aggregation (use Price40 as the main price)
      const price = parseFloat(vehicle.Price40?.toString() || "0");
      if (price > 0) stats.totalValue += price;

      // Image counting
      if (vehicle.Image && vehicle.Image.length > 0) {
        stats.withImages++;
      } else {
        stats.withoutImages++;
      }
    }

    return stats;
  }, [vehicles]);

  // ============================================================================
  // B. Debounced Search Filter - Search ALL vehicle fields
  // ============================================================================

  const filteredVehicles = useMemo(() => {
    let result = vehicles;

    // Apply search query - Search ALL vehicle fields
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim();
      const queryNumber = parseFloat(debouncedSearch);
      
      // Normalize search term for category matching
      const normalizedSearchCategory = normalizeCategoryLabel(query);
      
      result = result.filter((v) => {
        // Normalize vehicle category
        const normalizedVehicleCategory = normalizeCategoryLabel(v.Category);
        
        // Check if search matches category (using normalized values)
        const categoryMatch = 
          normalizedSearchCategory !== "Other" && normalizedSearchCategory === normalizedVehicleCategory;
        
        // Also check raw category string for partial matches
        const categoryRaw = v.Category?.toLowerCase() || "";
        const categoryPartialMatch = categoryRaw.includes(query);
        
        // Text fields to search
        const textMatch = 
          v.Brand?.toLowerCase().includes(query) ||
          v.Model?.toLowerCase().includes(query) ||
          v.Plate?.toLowerCase().includes(query) ||
          categoryMatch ||
          categoryPartialMatch ||
          v.Condition?.toLowerCase().includes(query) ||
          v.Color?.toLowerCase().includes(query) ||
          v.TaxType?.toLowerCase().includes(query) ||
          v.BodyType?.toLowerCase().includes(query) ||
          v.VehicleId?.toString().toLowerCase().includes(query) ||
          v.Year?.toString().includes(query);
        
        // Numeric fields - match if search is a valid number
        let numberMatch = false;
        if (!isNaN(queryNumber)) {
          numberMatch = 
            v.PriceNew === queryNumber ||
            v.Price40 === queryNumber ||
            v.Price70 === queryNumber ||
            v.Year === queryNumber;
        }
        
        return textMatch || numberMatch;
      });
    }

    return result;
  }, [vehicles, debouncedSearch]);

  // ============================================================================
  // Chart Data Preparation
  // ============================================================================

  const categoryChartData = useMemo(() => {
    if (!meta) return [];
    return [
      { name: "Cars", value: meta.countsByCategory.Cars || 0, color: CATEGORY_COLORS.Cars },
      { name: "Motorcycles", value: meta.countsByCategory.Motorcycles || 0, color: CATEGORY_COLORS.Motorcycles },
      { name: "Tuk Tuks", value: meta.countsByCategory.TukTuks || 0, color: CATEGORY_COLORS.TukTuks },
    ].filter((item) => item.value > 0);
  }, [meta]);

  const conditionChartData = useMemo(() => {
    if (!meta) return [];
    return [
      { name: "New", value: meta.countsByCondition.New || 0, color: "#10b981" },
      { name: "Used", value: meta.countsByCondition.Used || 0, color: "#6b7280" },
    ].filter((item) => item.value > 0);
  }, [meta]);

  const brandChartData = useMemo(() => {
    if (!aggregatedStats) return [];
    return Object.entries(aggregatedStats.byBrand)
      .filter(([name]) => !INVALID_BRANDS.includes(name))
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [aggregatedStats]);

  const monthlyChartData = useMemo(() => {
    if (!aggregatedStats) return [];
    return Object.entries(aggregatedStats.byMonth)
      .sort()
      .slice(-12) // Last 12 months
      .map(([month, count]) => ({
        name: month,
        value: count,
      }));
  }, [aggregatedStats]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      window.location.reload();
    } catch {
      setError("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // ============================================================================
  // Render States
  // ============================================================================

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // D. Show data immediately from initialMeta, skeleton only for charts
  // iOS fix: Use actual data values directly
  const totalVehicles = meta.total;
  const carsCount = meta.countsByCategory.Cars;
  const motorcyclesCount = meta.countsByCategory.Motorcycles;
  const tukTuksCount = meta.countsByCategory.TukTuks;
  const noImageCount = meta.noImageCount;

  const isLoading = isRefreshing;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* ============================================================================
          Header Section - Mobile Responsive
      ============================================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isLoading ? (
              <span className="inline-block w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              `${totalVehicles.toLocaleString()} total vehicles`
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm sm:text-base w-full sm:w-auto"
        >
          <span className={isRefreshing ? "animate-spin" : ""}>{Icons.refresh}</span>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ============================================================================
          Stats Grid - 2 cols mobile, 5 cols desktop
          Fixed: Always display actual data values, never "—" on iOS
      ============================================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Vehicles"
          value={totalVehicles.toLocaleString()}
          subtitle={`${noImageCount} without images`}
          subtitleHref="/vehicles?noImage=1"
          icon={Icons.totalVehicles}
          color="emerald"
          isLoading={isRefreshing}
          href="/vehicles"
        />
        <StatCard
          title="Cars"
          value={carsCount.toLocaleString()}
          subtitle="All car types"
          icon={Icons.car}
          color="blue"
          isLoading={isRefreshing}
          href="/vehicles?category=Cars"
        />
        <StatCard
          title="Motorcycles"
          value={motorcyclesCount.toLocaleString()}
          subtitle="All motorcycle types"
          icon={Icons.motorcycle}
          color="purple"
          isLoading={isRefreshing}
          href="/vehicles?category=Motorcycles"
        />
        <StatCard
          title="Tuk Tuks"
          value={tukTuksCount.toLocaleString()}
          subtitle="All tuk tuk types"
          icon={Icons.tuk}
          color="orange"
          isLoading={isRefreshing}
          href="/vehicles?category=Tuk+Tuk"
        />
        <StatCard
          title="No Images"
          value={noImageCount.toLocaleString()}
          subtitle="Click to view"
          icon={Icons.noImage}
          color="red"
          isLoading={isRefreshing}
          href="/vehicles?noImage=1"
        />
      </div>

      {/* ============================================================================
          Search Bar - Debounced (300ms)
      ============================================================================ */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {Icons.search}
        </div>
        <input
          type="text"
          placeholder="Search vehicles (Brand, Model, Category, Plate...)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
        />
        {debouncedSearch !== searchQuery && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results Count */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>
          Showing {filteredVehicles.length.toLocaleString()} of {meta.total.toLocaleString()} vehicles
          {vehicles.length < meta.total && (
            <span className="text-amber-600 dark:text-amber-400 ml-1">
              (displaying first {vehicles.length})
            </span>
          )}
        </span>
        {debouncedSearch && (
          <span>
            matching &quot;{debouncedSearch}&quot;
          </span>
        )}
      </div>

      {/* ============================================================================
          Charts Grid - C. Fixed Recharts with h-[300px] containers
      ============================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Vehicles by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Vehicles by Category
          </h3>
          {/* C. Fixed: h-[300px] container prevents width(-1) height(-1) error */}
          <div className="w-full h-[250px] sm:h-[300px]">
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : (
              <VehiclesByCategoryChart data={categoryChartData} />
            )}
          </div>
        </div>

        {/* New vs Used */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
            New vs Used
          </h3>
          <div className="w-full h-[250px] sm:h-[300px]">
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : (
              <NewVsUsedChart data={conditionChartData} />
            )}
          </div>
        </div>

        {/* Top Brands */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Brands
          </h3>
          <div className="w-full h-[250px] sm:h-[300px]">
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : (
              <VehiclesByBrandChart data={brandChartData} />
            )}
          </div>
        </div>

        {/* Monthly Added */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Added
          </h3>
          <div className="w-full h-[250px] sm:h-[300px]">
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : (
              <MonthlyAddedChart data={monthlyChartData} />
            )}
          </div>
        </div>
      </div>

      {/* ============================================================================
          Quick Stats Footer - Use meta for accurate totals, aggregatedStats for derived metrics
      ============================================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {(meta.total - meta.noImageCount).toLocaleString()}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">With Images</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
            {meta.noImageCount.toLocaleString()}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Without Images</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
            ${Math.round(meta.avgPrice).toLocaleString()}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Avg Price</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
            {aggregatedStats ? Object.keys(aggregatedStats.byBrand).length : '-'}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Unique Brands (sample)</p>
        </div>
      </div>
    </div>
  );
}
