"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import DashboardHeader from "@/app/components/dashboard/DashboardHeader";
import DeleteConfirmationModal from "@/app/components/dashboard/DeleteConfirmationModal";
import FiltersBar from "@/app/components/dashboard/FiltersBar";
import KpiCard from "@/app/components/dashboard/KpiCard";
import Pagination from "@/app/components/dashboard/Pagination";
import VehicleCardMobile from "@/app/components/dashboard/VehicleCardMobile";
import VehicleModal from "@/app/components/dashboard/VehicleModal";
import VehicleTable from "@/app/components/dashboard/VehicleTable";
import { GlassButton } from "@/app/components/ui/GlassButton";
import { useDeleteVehicleOptimistic } from "@/app/components/vehicles/useDeleteVehicleOptimistic";
import { useUpdateVehicleOptimistic } from "@/app/components/vehicles/useUpdateVehicleOptimistic";
import { extractDriveFileId } from "@/lib/drive";
import { normalizeCategoryLabel, normalizeConditionLabel } from "@/lib/analytics";
import { useVehicles } from "@/lib/useVehicles";
import { isConfigError } from "@/lib/api";
import type { Vehicle, VehicleMeta } from "@/lib/types";
import { isIOSSafariBrowser } from "@/lib/platform";

import { useSearchParams } from "next/navigation";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/ui/GlassToast";
import { onVehicleCacheUpdate } from "@/lib/vehicleCache";




interface FilterState {

  search: string;
  category: string;
  brand: string;
  yearMin: string;
  yearMax: string;
  priceMin: string;
  priceMax: string;
  condition: string;
  color: string;
  dateFrom: string;
  dateTo: string;
  withoutImage: boolean;
}

// Helper function to compute meta from vehicle array
function computeVehicleMeta(vehicles: Vehicle[]): VehicleMeta {
  return {
    total: vehicles.length,
    countsByCategory: {
      Cars: vehicles.filter(v => v.Category === "Cars").length,
      Motorcycles: vehicles.filter(v => v.Category === "Motorcycles").length,
      TukTuks: vehicles.filter(v => v.Category === "Tuk Tuk").length,
    },
    avgPrice: vehicles.length > 0
      ? vehicles.reduce((sum, v) => sum + (v.PriceNew || 0), 0) / vehicles.length
      : 0,
    noImageCount: vehicles.filter(v => !v.Image || !extractDriveFileId(v.Image)).length,
    countsByCondition: {
      New: vehicles.filter(v => v.Condition === "New").length,
      Used: vehicles.filter(v => v.Condition === "Used").length,
    },
  };
}

function deferMicrotask(callback: () => void): void {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }
  Promise.resolve().then(callback);
}

export default function VehiclesClient() {
  const user = useAuthUser();
  const searchParams = useSearchParams();
  const isAdmin = user.role === "Admin";
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    setIsIOSSafari(isIOSSafariBrowser());
  }, []);


  // Use the robust vehicles hook
  const { vehicles: fetchedVehicles, meta, loading, error, refetch, lastSyncTime } = useVehicles();

  // Local state for optimistic updates
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Sync fetched vehicles with local state
  useEffect(() => {
    setVehicles(fetchedVehicles);
  }, [fetchedVehicles]);

  // Listen for cache updates from other components (e.g., after adding a vehicle)
  useEffect(() => {
    if (isIOSSafari) return;
    const unsubscribe = onVehicleCacheUpdate((updatedVehicles) => {
      // Update local state with fresh data from cache
      setVehicles(updatedVehicles);
    });
    return unsubscribe;
  }, [isIOSSafari]);

  // View mode: "all-time" shows API meta totals, "filtered" shows filtered totals


  const [viewMode, setViewMode] = useState<"all-time" | "filtered">("all-time");


  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "All",
    brand: "All",
    yearMin: "",
    yearMax: "",
    priceMin: "",
    priceMax: "",
    condition: "All",
    color: "All",
    dateFrom: "",
    dateTo: "",
    withoutImage: false,
  });

  // Sort state
  const [sortField, setSortField] = useState<keyof Vehicle | null>("Brand");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!isIOSSafari) return;
    setPageSize((prev) => (prev > 6 ? 6 : prev));
  }, [isIOSSafari]);

  // Modal state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Toast hook
  const { success: toastSuccess, error: toastError, addToast, removeToast } = useToast();


  // Optimistic update/delete hooks with toast notifications

  const { updateVehicle, isUpdating } = useUpdateVehicleOptimistic({
    onSuccess: (vehicle) => {
      toastSuccess(`${vehicle.Brand} ${vehicle.Model} updated successfully!`, 2000);
      // Update local state immediately
      setVehicles((prev) =>
        prev.map((v) => (v.VehicleId === vehicle.VehicleId ? { ...v, ...vehicle } : v))
      );
      setIsAddEditModalOpen(false);
      setEditingVehicle(null);
    },
    onError: (error, originalVehicle) => {
      toastError(`Failed to update ${originalVehicle.Brand}: ${error.message}`, 4000);
      // Rollback: restore original vehicle
      setVehicles((prev) =>
        prev.map((v) => (v.VehicleId === originalVehicle.VehicleId ? originalVehicle : v))
      );
    },
  });

  const { deleteVehicle, isDeleting } = useDeleteVehicleOptimistic({
    onSuccess: (vehicle) => {
      toastSuccess(`${vehicle.Brand} ${vehicle.Model} deleted successfully!`, 2000);
      // Remove from local state immediately
      setVehicles((prev) => prev.filter((v) => v.VehicleId !== vehicle.VehicleId));
      setIsDeleteModalOpen(false);
      setSelectedVehicle(null);
    },
    onError: (error, restoredVehicle) => {
      toastError(`Failed to delete ${restoredVehicle.Brand}: ${error.message}`, 4000);
      // Restore: add vehicle back to list
      setVehicles((prev) => {
        if (prev.find((v) => v.VehicleId === restoredVehicle.VehicleId)) return prev;
        return [...prev, restoredVehicle];
      });
    },
  });



  // Filter and sort vehicles
  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (v) =>
          v.Brand?.toLowerCase().includes(searchLower) ||
          v.Model?.toLowerCase().includes(searchLower) ||
          v.Plate?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category !== "All") {
      result = result.filter((v) => normalizeCategoryLabel(v.Category) === filters.category);
    }

    if (filters.brand !== "All") {
      result = result.filter((v) => v.Brand === filters.brand);
    }

    if (filters.condition !== "All") {
      result = result.filter((v) => normalizeConditionLabel(v.Condition) === filters.condition);
    }

    if (filters.color !== "All") {
      result = result.filter((v) => v.Color === filters.color);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter((v) => v.Time && new Date(v.Time) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      result = result.filter((v) => v.Time && new Date(v.Time) <= toDate);
    }

    if (filters.yearMin) {
      result = result.filter((v) => v.Year && v.Year >= parseInt(filters.yearMin));
    }

    if (filters.yearMax) {
      result = result.filter((v) => v.Year && v.Year <= parseInt(filters.yearMax));
    }

    if (filters.priceMin) {
      result = result.filter((v) => v.PriceNew && v.PriceNew >= parseFloat(filters.priceMin));
    }

    if (filters.priceMax) {
      result = result.filter((v) => v.PriceNew && v.PriceNew <= parseFloat(filters.priceMax));
    }

    // Filter for vehicles without images
    if (filters.withoutImage) {
      result = result.filter((vehicle) => {
        const imageValue = vehicle.Image;
        if (!imageValue || !String(imageValue).trim()) return true;
        // Check if it's a valid Drive URL (has a file ID)
        const fileId = extractDriveFileId(imageValue);
        return !fileId;
      });
    }

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (aVal === null || aVal === undefined) return sortDirection === "asc" ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortDirection === "asc" ? -1 : 1;

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    return result;
  }, [vehicles, filters, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredVehicles.length / pageSize);
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, currentPage, pageSize]);

  // Reset page when filters change - use useLayoutEffect to avoid setState in render warning
  useEffect(() => {
    // Use queueMicrotask to defer state update to after render
    deferMicrotask(() => {
      setCurrentPage(1);
    });
  }, [filters, pageSize]);

  // Initialize filters from URL query params (so dashboard links like
  // `/vehicles?category=car&condition=new&noImage=1` work).
  const categoryParam = searchParams.get("category");
  const conditionParam = searchParams.get("condition");
  const noImageParam = searchParams.get("noImage");

  useEffect(() => {
    const nextCategory = categoryParam ? normalizeCategoryLabel(categoryParam) : "All";
    const nextCondition = conditionParam ? normalizeConditionLabel(conditionParam) : "All";
    const nextWithoutImage = noImageParam === "1";

    // Use queueMicrotask to defer state update to after render
    deferMicrotask(() => {
      setFilters((prev) => {
        // Avoid no-op state writes that can cause render loops on some mobile browsers.
        if (
          prev.category === nextCategory &&
          prev.condition === nextCondition &&
          prev.withoutImage === nextWithoutImage
        ) {
          return prev;
        }

        return {
          ...prev,
          category: nextCategory,
          condition: nextCondition,
          withoutImage: nextWithoutImage,
        };
      });
    });
  }, [categoryParam, conditionParam, noImageParam]);


  // Check if filters are active
  const isFiltered = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.category !== "All" ||
      filters.brand !== "All" ||
      filters.yearMin !== "" ||
      filters.yearMax !== "" ||
      filters.priceMin !== "" ||
      filters.priceMax !== "" ||
      filters.condition !== "All" ||
      filters.color !== "All" ||
      filters.dateFrom !== "" ||
      filters.dateTo !== "" ||
      filters.withoutImage
    );
  }, [filters]);

  // Compute filtered meta for when filters are active
  const filteredMeta = useMemo(() => computeVehicleMeta(filteredVehicles), [filteredVehicles]);

  // KPI calculations - use API meta for all-time, filteredMeta for filtered view
  // This fixes the mismatch: meta.total = actual count, NOT max(ID)
  const kpis = useMemo(() => {
    const isFilteredView = viewMode === "filtered" && isFiltered;
    
    if (isFilteredView) {
      return {
        total: filteredMeta.total,
        cars: filteredMeta.countsByCategory.Cars,
        motorcycles: filteredMeta.countsByCategory.Motorcycles,
        tukTuks: filteredMeta.countsByCategory.TukTuks,
        avgPrice: filteredMeta.avgPrice,
      };
    }
    
    // All-time view: use API meta (source of truth)
    return {
      total: meta?.total ?? vehicles.length,
      cars: meta?.countsByCategory.Cars ?? 0,
      motorcycles: meta?.countsByCategory.Motorcycles ?? 0,
      tukTuks: meta?.countsByCategory.TukTuks ?? 0,
      avgPrice: meta?.avgPrice ?? 0,
    };
  }, [filteredMeta, meta, vehicles.length, viewMode, isFiltered]);


  // Handlers
  const handleSort = (field: keyof Vehicle) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleAdd = () => {
    setSelectedVehicle(null);
    setEditingVehicle(null);
    setIsAddEditModalOpen(true);
  };

  const handleEditClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setEditingVehicle(vehicle);
    setIsAddEditModalOpen(true);
  };

  const handleDeleteClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteModalOpen(true);
  };


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

  const handleSaveVehicle = async (vehicleData: Partial<Vehicle>, imageFile?: File | null) => {
    if (!editingVehicle) {
      // For new vehicles, use traditional flow
      const url = "/api/vehicles";
      const loadingToastId = addToast("Adding vehicle...", "info");

      try {
        let body: string | FormData;
        const headers: Record<string, string> = {};

        if (imageFile) {
          const formData = new FormData();
          Object.entries(vehicleData).forEach(([key, value]) => {
            if (value != null) formData.append(key, String(value));
          });
          formData.append("image", imageFile);
          body = formData;
        } else {
          headers["Content-Type"] = "application/json";
          body = JSON.stringify(vehicleData);
        }

        const res = await fetch(url, {
          method: "POST",
          headers,
          body,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Failed to add vehicle");
        }

        removeToast(loadingToastId);
        toastSuccess("Vehicle added successfully!", 2000);

        await refetch();
        setIsAddEditModalOpen(false);
      } catch (err) {
        removeToast(loadingToastId);
        const errorMessage = err instanceof Error ? err.message : "Failed to add vehicle";
        toastError(errorMessage, 4000);
        throw err;
      }

      return;
    }

    // For existing vehicles - use optimistic update
    const loadingToastId = addToast("Saving changes...", "info");

    // Optimistic update: update UI immediately
    setVehicles((prev) =>
      prev.map((v) =>
        v.VehicleId === editingVehicle.VehicleId ? { ...v, ...vehicleData } : v
      )
    );

    try {
      await updateVehicle(editingVehicle.VehicleId, vehicleData, editingVehicle, imageFile);
      removeToast(loadingToastId);
    } catch (err) {
      removeToast(loadingToastId);
      // Error is handled by onError callback (rollback happens there)
      throw err;
    }


  };

  const handleDeleteConfirm = async () => {
    if (!selectedVehicle?.VehicleId) return;

    const loadingToastId = addToast("Deleting vehicle...", "info");

    // Optimistic delete: remove from UI immediately
    setVehicles((prev) => prev.filter((v) => v.VehicleId !== selectedVehicle.VehicleId));

    try {
      await deleteVehicle(selectedVehicle);
      removeToast(loadingToastId);
    } catch (err) {
      removeToast(loadingToastId);
      // Error is handled by onError callback (restore happens there)
    }
  };


  if (isIOSSafari) {
    const safeTotalPages = Math.max(1, totalPages);
    const safeCurrentPage = Math.min(currentPage, safeTotalPages);

    return (
      <div className="min-h-screen pb-20 lg:pb-0">
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
          <div className="mb-4 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-200">
            iPhone Safari compatibility mode is active.
          </div>

          <div className="mb-4 rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Search vehicles
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  search: event.target.value,
                }))
              }
              placeholder="Brand, model, or plate"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200/70 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              Loading vehicles...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-300/70 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-200">
              <p className="mb-3 whitespace-pre-line">{error}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Retry
              </button>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="rounded-xl border border-slate-200/70 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              No vehicles found.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedVehicles.map((vehicle) => (
                  <div
                    key={vehicle.VehicleId}
                    className="rounded-xl border border-slate-200/70 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {vehicle.Brand || "-"} {vehicle.Model || "-"}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-300">
                          ID {vehicle.VehicleId || "-"} • {vehicle.Category || "-"} • {vehicle.Plate || "-"}
                        </p>
                      </div>
                      <a
                        href={`/vehicles/${encodeURIComponent(vehicle.VehicleId)}/view`}
                        className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200/70 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Page {safeCurrentPage} / {safeTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(safeTotalPages, prev + 1))}
                  disabled={safeCurrentPage >= safeTotalPages}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <DashboardHeader />

        {isIOSSafari ? (
          <div className="mb-4 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-200">
            iPhone Safari compatibility mode is active to prevent tab crashes on large vehicle lists.
          </div>
        ) : null}

        {/* Data Status Bar - Enterprise Grade */}
        {!loading && !error && (
          <div className="ec-status-bar relative z-[1] flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gradient-to-r from-white/90 to-white/70 dark:from-gray-800/90 dark:to-gray-800/70 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <div className="flex items-center gap-6 text-sm">
              {/* Last Sync */}
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4 text-emerald-500"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
                <span>
                  Last sync: <span className="font-medium text-gray-900 dark:text-gray-100">{lastSyncTime ? lastSyncTime.toLocaleString() : "Never"}</span>
                </span>
              </div>

              {/* Active Filters Count */}
              {isFiltered && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                    {[
                      filters.search,
                      filters.category !== "All" ? filters.category : null,
                      filters.brand !== "All" ? filters.brand : null,
                      filters.condition !== "All" ? filters.condition : null,
                      filters.color !== "All" ? filters.color : null,
                      filters.yearMin || filters.yearMax ? "Year" : null,
                      filters.priceMin || filters.priceMax ? "Price" : null,
                      filters.dateFrom || filters.dateTo ? "Date" : null,
                      filters.withoutImage ? "No Image" : null,
                    ].filter(Boolean).length} active
                  </span>
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="ec-status-toggle flex items-center gap-2 bg-gray-100/80 dark:bg-gray-700/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("all-time")}
                  className={`ec-status-btn px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    viewMode === "all-time"
                      ? "ec-status-btn-active bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "ec-status-btn-inactive text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  All-time Totals
                </button>
                <button
                  onClick={() => setViewMode("filtered")}
                  disabled={!isFiltered}
                  className={`ec-status-btn px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    viewMode === "filtered"
                      ? "ec-status-btn-active bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "ec-status-btn-inactive text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  Filtered Results
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isFiltered && (
                <GlassButton
                  onClick={() => {
                    setFilters({
                      search: "",
                      category: "All",
                      brand: "All",
                      yearMin: "",
                      yearMax: "",
                      priceMin: "",
                      priceMax: "",
                      condition: "All",
                      color: "All",
                      dateFrom: "",
                      dateTo: "",
                      withoutImage: false,
                    });
                    setViewMode("all-time");
                  }}
                  className="text-sm"
                  variant="outline"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4 mr-1"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  Clear Filters
                </GlassButton>
              )}
            </div>
          </div>
        )}


        {/* KPI Cards - Enterprise Grade with Glassmorphism */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <KpiCard
            label={viewMode === "filtered" && isFiltered ? "Filtered Vehicles" : "Total Vehicles"}
            value={kpis.total.toLocaleString()}
            accent="green"
            subtitle={viewMode === "filtered" && isFiltered ? `of ${meta?.total ?? vehicles.length} total` : undefined}
          />
          <KpiCard
            label="Cars"
            value={kpis.cars.toLocaleString()}
            accent="blue"
          />
          <KpiCard
            label="Motorcycles"
            value={kpis.motorcycles.toLocaleString()}
            accent="orange"
          />
          <KpiCard
            label="Tuk Tuks"
            value={kpis.tukTuks.toLocaleString()}
            accent="green"
          />
          <KpiCard
            label="Avg Price"
            value={kpis.avgPrice > 0 ? `$${Math.round(kpis.avgPrice).toLocaleString()}` : "-"}
            accent="blue"
          />
        </div>


        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: "All", label: "All Vehicles", count: kpis.total },
            { key: "Cars", label: "Cars", count: kpis.cars },
            { key: "Motorcycles", label: "Motorcycles", count: kpis.motorcycles },
            { key: "Tuk Tuk", label: "TukTuks", count: kpis.tukTuks },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilters((prev) => ({ ...prev, category: tab.key }))}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filters.category === tab.key
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filters.category === tab.key
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Add Button */}
        {isAdmin && (
          <div className="mb-4">
            <GlassButton onClick={handleAdd} className="w-full sm:w-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5 mr-2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </svg>
              Add Vehicle
            </GlassButton>
          </div>
        )}

        {/* Filters - Enhanced with proper totals */}
        <FiltersBar
          filters={filters}
          onFilterChange={setFilters}
          vehicles={vehicles}
          resultCount={filteredVehicles.length}
          totalCount={viewMode === "filtered" ? filteredVehicles.length : (meta?.total ?? vehicles.length)}
          isFiltered={isFiltered}
          onClearFilters={() => {
            setFilters({
              search: "",
              category: "All",
              brand: "All",
              yearMin: "",
              yearMax: "",
              priceMin: "",
              priceMax: "",
              condition: "All",
              color: "All",
              dateFrom: "",
              dateTo: "",
              withoutImage: false,
            });
            setViewMode("all-time");
          }}
        />


        {/* Content */}
        <div className="ec-glassPanel rounded-2xl overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="p-12 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading vehicles...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-8 w-8 text-red-600 dark:text-red-400"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Failed to load vehicles
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-2xl mx-auto">
                <p className="whitespace-pre-line">{error}</p>
                
                {/* Dev mode: Show detailed error information */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                      Development Mode - Error Details:
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 font-mono">
                      Check browser console for full error stack trace
                    </p>
                  </div>
                )}
                
                {/* Config error: Show setup instructions */}
                {isConfigError(error) && (
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-left border border-amber-200 dark:border-amber-800">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">
                      Setup Instructions:
                    </p>
                    <ol className="text-xs text-amber-700 dark:text-amber-300 list-decimal list-inside space-y-1">
                      <li>Create a <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">.env.local</code> file in your project root</li>
                      <li>Add: <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec</code></li>
                      <li>Replace with your actual Google Apps Script URL</li>
                      <li>Restart the development server</li>
                    </ol>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <GlassButton onClick={refetch}>Try Again</GlassButton>
                {process.env.NODE_ENV === 'development' && (
                  <GlassButton 
                    onClick={() => window.location.reload()} 
                    variant="outline"
                  >
                    Reload Page
                  </GlassButton>
                )}
              </div>
            </div>
          )}


          {/* Empty State */}
          {!loading && !error && filteredVehicles.length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-8 w-8 text-gray-400"
                >
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No vehicles found
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {vehicles.length === 0
                  ? "Get started by adding your first vehicle."
                  : "Try adjusting your filters to see more results."}
              </p>
            </div>
          )}

          {/* Data Display */}
          {!loading && !error && filteredVehicles.length > 0 && (
            <>
              {/* Desktop Table */}
              {!isIOSSafari ? (
                <VehicleTable
                  vehicles={paginatedVehicles}
                  isAdmin={isAdmin}
                  disableImages={false}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              ) : null}


              {/* Mobile Cards */}
              <div className={isIOSSafari ? "space-y-3 p-4" : "lg:hidden space-y-3 p-4"}>
                {paginatedVehicles.map((vehicle, index) => (
                  <VehicleCardMobile
                    key={vehicle.VehicleId || `mobile-${index}`}
                    vehicle={vehicle}
                    index={index}
                    isAdmin={isAdmin}
                    disableImages={isIOSSafari}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>


              {/* Pagination - Fixed to show correct totals */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredVehicles.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />

            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <VehicleModal
        isOpen={isAddEditModalOpen}
        vehicle={selectedVehicle}
        onClose={() => setIsAddEditModalOpen(false)}
        onSave={handleSaveVehicle}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        vehicle={selectedVehicle}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

    </div>
  );
}
