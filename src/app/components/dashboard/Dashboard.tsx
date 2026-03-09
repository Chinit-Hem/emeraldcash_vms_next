"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import { useUI } from "@/app/components/UIContext";
import ChartCard from "@/app/components/dashboard/ChartCard";
import KpiCard from "@/app/components/dashboard/KpiCard";
import SkeletonDashboard from "@/app/components/dashboard/SkeletonDashboard";
import VehicleModal from "@/app/components/dashboard/VehicleModal";
import { GlassToast, useToast } from "@/app/components/ui/GlassToast";
import { Suspense, lazy } from "react";

// Lazy load charts
const MonthlyAddedChart = lazy(() => import("@/app/components/dashboard/charts/MonthlyAddedChart"));
const NewVsUsedChart = lazy(() => import("@/app/components/dashboard/charts/NewVsUsedChart"));
const PriceDistributionChart = lazy(() => import("@/app/components/dashboard/charts/PriceDistributionChart"));
const VehiclesByBrandChart = lazy(() => import("@/app/components/dashboard/charts/VehiclesByBrandChart"));
const VehiclesByCategoryChart = lazy(() => import("@/app/components/dashboard/charts/VehiclesByCategoryChart"));

// Chart loading fallback
function ChartSkeleton() {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  );
}
import {
  buildMonthlyAdded,
  buildNewVsUsed,
  buildPriceDistribution,
  buildVehiclesByBrand,
  buildVehiclesByCategory,
  marketPriceStats,
  normalizeCategoryLabel,
  normalizeConditionLabel,
} from "@/lib/analytics";

function normalizeCategoryParam(value: string): string {
  return normalizeCategoryLabel(value).toLowerCase().replace(/\s+/g, ' ');
}

function normalizeConditionParam(value: string): string {
  return normalizeConditionLabel(value).toLowerCase();
}

function applyFilter(router: ReturnType<typeof useRouter>, filter: { type: "category" | "condition" | "noImage"; value: string | boolean }) {
  const params = new URLSearchParams();
  if (filter.type === "category") {
    params.set("category", normalizeCategoryParam(filter.value as string));
  } else if (filter.type === "condition") {
    params.set("condition", normalizeConditionParam(filter.value as string));
  } else if (filter.type === "noImage") {
    params.set("noImage", "1");
  }
  router.push(`/vehicles?${params.toString()}`);
}

import { getCambodiaNowString } from "@/lib/cambodiaTime";
import { extractDriveFileId } from "@/lib/drive";
import type { Vehicle, VehicleMeta } from "@/lib/types";
import { writeVehicleCache } from "@/lib/vehicleCache";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

// Safe client-side only hook to prevent hydration mismatches
function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return isMounted;
}

function formatMoney(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${Math.round(value).toLocaleString()}`;
}

// Icons
function IconRefresh({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}

function IconPlus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconClock({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconAlert({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function Dashboard() {
  const user = useAuthUser();
  const { isModalOpen, setIsModalOpen } = useUI();
  const {
    toasts,
    removeToast,
    success: showSuccessToast,
    error: showErrorToast,
  } = useToast();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [meta, setMeta] = useState<VehicleMeta | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [cambodiaNow, setCambodiaNow] = useState(() => getCambodiaNowString());
  const [isLoading, setIsLoading] = useState(true);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const isMounted = useIsMounted();

  // Modal state - now using global UI state
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!isMounted) return;
    const interval = window.setInterval(() => setCambodiaNow(getCambodiaNowString()), 1000);
    return () => window.clearInterval(interval);
  }, [isMounted]);

  // Load from cache immediately on mount (client-side only)
  useEffect(() => {
    if (!isMounted) return;
    try {
      // Check cache version to invalidate old cached data with wrong category keys
      const cacheVersion = localStorage.getItem("vms-vehicles-version");
      if (cacheVersion !== "3") {
        // Clear old cache to force fresh data load with normalized categories
        localStorage.removeItem("vms-vehicles");
        localStorage.removeItem("vms-vehicles-meta");
        localStorage.setItem("vms-vehicles-version", "3");
        console.log("[Dashboard] Cleared old cache to load normalized category data");
        return;
      }
      
      const cached = localStorage.getItem("vms-vehicles");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setVehicles(parsed as Vehicle[]);
        }
      }
      const cachedMeta = localStorage.getItem("vms-vehicles-meta");
      if (cachedMeta) {
        const parsedMeta = JSON.parse(cachedMeta);
        setMeta(parsedMeta);
      }
    } catch {
      // Ignore cache errors
    }
  }, [isMounted]);

  const fetchVehicles = async () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setIsRefreshing(true);
    setVehiclesError("");
    try {
      const res = await fetch("/api/vehicles?noCache=1", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      const data = await res.json();
      const newVehicles = (data.data || []) as Vehicle[];
      const newMeta = data.meta as VehicleMeta | undefined;
      setVehicles(newVehicles);
      setMeta(newMeta || null);
      setLastUpdated(getCambodiaNowString());
      setIsLoading(false);
      // Save to localStorage (client-side only)
      if (isMounted) {
        try {
          writeVehicleCache(newVehicles);
          if (newMeta) {
            localStorage.setItem("vms-vehicles-meta", JSON.stringify(newMeta));
          }
        } catch {
          // Ignore storage errors
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setVehiclesError(err instanceof Error ? err.message : "Error loading vehicles");
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Fetch fresh data in background
    void fetchVehicles();
    return () => {
      fetchAbortRef.current?.abort();
      fetchAbortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Safe error message extraction to prevent circular reference issues
  const getSafeErrorMessage = (errorData: unknown): string => {
    if (errorData === null || errorData === undefined) {
      return "Failed to save vehicle";
    }
    if (typeof errorData === "string") {
      return errorData || "Failed to save vehicle";
    }
    if (typeof errorData === "object") {
      // Handle { error: "message" } format
      if (errorData && "error" in errorData) {
        const err = (errorData as { error: unknown }).error;
        if (typeof err === "string") return err;
        if (err === null || err === undefined) return "Failed to save vehicle";
        try {
          return String(err);
        } catch {
          return "Failed to save vehicle";
        }
      }
      // Handle { message: "message" } format
      if ("message" in errorData) {
        const msg = (errorData as { message: unknown }).message;
        if (typeof msg === "string") return msg;
        try {
          return String(msg);
        } catch {
          return "Failed to save vehicle";
        }
      }
      // Try to stringify safely
      try {
        const str = JSON.stringify(errorData);
        return str || "Failed to save vehicle";
      } catch {
        return "Failed to save vehicle";
      }
    }
    try {
      return String(errorData);
    } catch {
      return "Failed to save vehicle";
    }
  };

  const handleSaveVehicle = async (vehicleData: Partial<Vehicle>) => {
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicleData),
      });

      if (!res.ok) {
        let errorData: unknown;
        try {
          errorData = await res.json();
        } catch {
          errorData = null;
        }
        const errorMessage = getSafeErrorMessage(errorData);
        throw new Error(errorMessage);
      }

      // Refresh vehicles list after successful save
      await fetchVehicles();
      showSuccessToast("Vehicle added successfully.", 3000);
    } catch (error) {
      console.error("Failed to save vehicle:", error);
      const message = error instanceof Error ? error.message : "Failed to save vehicle";
      showErrorToast(message, 4500);
      throw error;
    }
  };

  const handleOpenAddModal = () => {
    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVehicle(null);
  };

  // Use server-provided meta for counts to ensure consistency with table
  const kpis = useMemo(() => {
    // If we have meta from server, use it for counts (single source of truth)
    if (meta) {
      const stats = marketPriceStats(vehicles);
      return {
        total: meta.total ?? vehicles.length,
        // API now returns normalized category names
        cars: meta.countsByCategory?.Cars ?? 0,
        motorcycles: meta.countsByCategory?.Motorcycles ?? 0,
        tukTuk: meta.countsByCategory?.TukTuks ?? 0,
        newCount: meta.countsByCondition?.New ?? 0,
        usedCount: meta.countsByCondition?.Used ?? 0,
        noImagesCount: meta.noImageCount ?? 0,
        totalMarketValue: stats.sum,
        avgPrice: stats.avg,
        medianPrice: stats.median,
        pricedCount: stats.count,
      };
    }

    // Fallback: compute from vehicles array (client-side only)
    const countsByCategory: Record<string, number> = { Cars: 0, Motorcycles: 0, "Tuk Tuk": 0, Other: 0 };
    const countsByCondition: Record<string, number> = { New: 0, Used: 0, Other: 0 };
    let noImagesCount = 0;

    for (const v of vehicles) {
      countsByCategory[normalizeCategoryLabel(v.Category)] += 1;
      countsByCondition[normalizeConditionLabel(v.Condition)] += 1;
      if (!v.Image || v.Image.trim() === "" || !extractDriveFileId(v.Image)) {
        noImagesCount += 1;
      }
    }

    const stats = marketPriceStats(vehicles);
    return {
      total: vehicles.length,
      cars: countsByCategory.Cars ?? 0,
      motorcycles: countsByCategory.Motorcycles ?? 0,
      tukTuk: countsByCategory["Tuk Tuk"] ?? 0,
      newCount: countsByCondition.New ?? 0,
      usedCount: countsByCondition.Used ?? 0,
      noImagesCount,
      totalMarketValue: stats.sum,
      avgPrice: stats.avg,
      medianPrice: stats.median,
      pricedCount: stats.count,
    };
  }, [vehicles, meta]);

  // iOS now gets full functionality like desktop
  const byCategory = useMemo(() => buildVehiclesByCategory(vehicles), [vehicles]);
  const byBrand = useMemo(() => buildVehiclesByBrand(vehicles, 12), [vehicles]);
  const priceDistribution = useMemo(() => buildPriceDistribution(vehicles), [vehicles]);
  const newVsUsed = useMemo(() => buildNewVsUsed(vehicles), [vehicles]);
  const monthlyAdded = useMemo(() => buildMonthlyAdded(vehicles), [vehicles]);

  if (isLoading && vehicles.length === 0) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen pb-20 lg:pb-8">
      <GlassToast toasts={toasts} onRemove={removeToast} />
      {/* Glass Hero Header */}
      <div className="ec-dashboard-hero rounded-2xl p-5 sm:p-6 mb-6">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Title + Welcome */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-slate-600 dark:text-white">
              Welcome, <span className="font-semibold text-slate-800 dark:text-white">{user?.username || "Guest"}</span>
              <span className="mx-2 text-slate-400">•</span>
              <span 
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-600 dark:text-white"
              >
                {user?.role || "User"}
              </span>
            </p>
            {lastUpdated && (
              <p className="text-xs text-slate-500 dark:text-white flex items-center gap-1.5">
                <span>Last updated:</span>
                <span className="font-mono text-slate-600 dark:text-white">{lastUpdated}</span>
                {isRefreshing && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Syncing...
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchVehicles()}
              disabled={isRefreshing}
              className="ec-dashboard-btn-icon touch-target"
              aria-label="Refresh data"
            >
              <IconRefresh className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {/* Add Vehicle Button */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="ec-dashboard-btn-primary touch-target"
            >
              <IconPlus className="h-4 w-4" />
              <span>Add Vehicle</span>
            </button>

            {/* Cambodia Time Pill */}
            <div className="ec-time-pill">
              <IconClock />
              <span>{cambodiaNow}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {vehiclesError ? (
        <div className="ec-alert-glass mb-6">
          <div className="flex items-start gap-3">
            <IconAlert className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="ec-alert-glass-title">Failed to load vehicles</div>
              <div className="ec-alert-glass-message">{vehiclesError}</div>
            </div>
          </div>
          <button
            onClick={() => fetchVehicles()}
            className="ec-alert-glass-action mt-3"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : null}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        <KpiCard 
          label="Total" 
          value={kpis.total.toLocaleString()} 
          sublabel="vehicles"
          accent="green" 
          onClick={() => router.push("/vehicles")} 
        />
        <KpiCard 
          label="Cars" 
          value={kpis.cars.toLocaleString()} 
          sublabel="vehicles"
          accent="green" 
          onClick={() => applyFilter(router, { type: "category", value: "Car" })} 
        />
        <KpiCard
          label="Motorcycles"
          value={kpis.motorcycles.toLocaleString()}
          sublabel="vehicles"
          accent="gray"
          onClick={() => applyFilter(router, { type: "category", value: "Motorcycle" })}
        />
        <KpiCard 
          label="Tuk Tuk" 
          value={kpis.tukTuk.toLocaleString()} 
          sublabel="vehicles"
          accent="green" 
          onClick={() => applyFilter(router, { type: "category", value: "Tuk Tuk" })} 
        />
        <KpiCard 
          label="New" 
          value={kpis.newCount.toLocaleString()} 
          sublabel="condition"
          accent="green" 
          onClick={() => applyFilter(router, { type: "condition", value: "New" })} 
        />
        <KpiCard 
          label="Used" 
          value={kpis.usedCount.toLocaleString()} 
          sublabel="condition"
          accent="red" 
          onClick={() => applyFilter(router, { type: "condition", value: "Used" })} 
        />
        <KpiCard 
          label="No Images" 
          value={kpis.noImagesCount.toLocaleString()} 
          sublabel="need upload"
          accent="red" 
          onClick={() => applyFilter(router, { type: "noImage", value: true })} 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Vehicles by Category" subtitle="Distribution across categories">
          <Suspense fallback={<ChartSkeleton />}>
            <VehiclesByCategoryChart data={byCategory} />
          </Suspense>
        </ChartCard>

        <ChartCard title="New vs Used" subtitle="Condition ratio">
          <Suspense fallback={<ChartSkeleton />}>
            <NewVsUsedChart data={newVsUsed} />
          </Suspense>
        </ChartCard>
      </div>

      <div className="space-y-4">
        <ChartCard title="Vehicles by Brand" subtitle="Top brands (others grouped)">
          <Suspense fallback={<ChartSkeleton />}>
            <VehiclesByBrandChart data={byBrand} />
          </Suspense>
        </ChartCard>

        <ChartCard title="Monthly Added Vehicles" subtitle="Based on Time column">
          <Suspense fallback={<ChartSkeleton />}>
            <MonthlyAddedChart data={monthlyAdded} />
          </Suspense>
        </ChartCard>

        <ChartCard
          title="Market Price Distribution"
          subtitle={`Histogram of MARKET PRICE (priced vehicles: ${kpis.pricedCount.toLocaleString()})`}
          right={
            <div className="space-y-0.5 text-right text-xs font-medium text-[var(--muted)]">
              <div>
                Total: <span className="font-mono text-[var(--text)]">{formatMoney(kpis.totalMarketValue)}</span>
              </div>
              <div>
                Avg: <span className="font-mono text-[var(--text)]">{formatMoney(kpis.avgPrice)}</span>
                <span className="mx-1 text-[var(--muted)]/70">•</span>
                Median: <span className="font-mono text-[var(--text)]">{formatMoney(kpis.medianPrice)}</span>
              </div>
            </div>
          }
        >
          <Suspense fallback={<ChartSkeleton />}>
            <PriceDistributionChart data={priceDistribution} />
          </Suspense>
        </ChartCard>
      </div>

      {/* Vehicle Modal for Add/Edit */}
      <VehicleModal
        isOpen={isModalOpen}
        vehicle={selectedVehicle}
        onClose={handleCloseModal}
        onSave={handleSaveVehicle}
      />
    </div>
  );
}
