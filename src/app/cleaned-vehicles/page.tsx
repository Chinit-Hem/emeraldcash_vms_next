"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import FiltersBar from "@/app/components/dashboard/FiltersBar";
import ImageModal from "@/app/components/ImageModal";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import Sidebar from "@/app/components/Sidebar";
import TopBar from "@/app/components/TopBar";
import { GlassToast, useToast } from "@/components/ui/glass/GlassToast";
import type { Vehicle } from "@/lib/types";
import {
  formatPrice,
  getVehicleFullImageUrl,
  getVehicleThumbnailUrl,
  type VehicleFilterState,
} from "@/lib/vehicle-helpers";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

// Color name to hex mapping for visual indicators
const getColorHex = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    "red": "#ef4444", "blue": "#3b82f6", "green": "#10b981", "yellow": "#f59e0b",
    "orange": "#f97316", "purple": "#8b5cf6", "pink": "#ec4899", "black": "#1a1a2e",
    "white": "#f8fafc", "gray": "#6b7280", "grey": "#6b7280", "silver": "#9ca3af",
    "gold": "#fbbf24", "brown": "#92400e", "beige": "#d4c5b0", "navy": "#1e3a8a",
    "teal": "#14b8a6", "cyan": "#06b6d4", "lime": "#84cc16", "maroon": "#991b1b",
    "olive": "#65a30d", "coral": "#f87171", "ivory": "#fffff0", "khaki": "#c3b091",
    "lavender": "#c4b5fd", "magenta": "#d946ef", "mint": "#6ee7b7", "peach": "#fdba74",
    "plum": "#a855f7", "tan": "#d2b48c", "turquoise": "#40e0d0", "violet": "#8b5cf6",
    "indigo": "#6366f1", "charcoal": "#374151", "cream": "#fffdd0", "burgundy": "#9f1239",
    "champagne": "#f7e7ce", "bronze": "#cd7f32", "copper": "#b87333", "rose": "#fb7185",
    "slate": "#475569", "emerald": "#10b981", "ruby": "#e11d48", "sapphire": "#1d4ed8",
    "amber": "#f59e0b", "jade": "#00a86b", "pearl": "#f0e6d2", "graphite": "#4b5563",
    "midnight": "#191970", "shadow": "#2d3748", "storm": "#4a5568", "frost": "#e2e8f0",
    "mist": "#cbd5e1", "cloud": "#94a3b8", "smoke": "#64748b", "ash": "#475569",
  };
  
  const normalized = colorName.toLowerCase().trim();
  if (colorMap[normalized]) return colorMap[normalized];
  
  // Try partial match
  for (const [name, hex] of Object.entries(colorMap)) {
    if (normalized.includes(name) || name.includes(normalized)) return hex;
  }
  
  // Generate consistent color from string
  let hash = 0;
  for (let i = 0; i < colorName.length; i++) {
    hash = colorName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash % 360)}, 70%, 50%)`;
};

interface CleanedVehicle {
  id: number;
  category: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  market_price: string | number;
  tax_type: string | null;
  condition: string;
  body_type: string | null;
  color: string | null;
  image_id: string | null;
  created_at: string;
  updated_at: string;
}

// Use centralized filter state type
type FilterState = VehicleFilterState;

export default function CleanedVehiclesPage() {
  const user = useAuthUser();
  const router = useRouter();
  const { toasts, removeToast, error: showErrorToast } = useToast();
  
  const [vehicles, setVehicles] = useState<CleanedVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Professional filter state
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

  // Group by state
  const [groupBy, setGroupBy] = useState<"none" | "category" | "brand" | "year" | "condition" | "color" | "tax_type">("none");

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const params = new URLSearchParams();
      
      // Apply filters to API call
      if (filters.category && filters.category !== "All") {
        params.set("category", filters.category);
      }
      if (filters.brand && filters.brand !== "All") {
        params.set("brand", filters.brand);
      }
      
params.set("limit", "500"); // Increased for pagination fix
      
      const res = await fetch(`/api/cleaned-vehicles?${params.toString()}`, {
        cache: "default",
      });
      
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
        setTotal(data.meta?.total || 0);
      } else {
        throw new Error(data.error || "Failed to load vehicles");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error loading vehicles";
      setError(message);
      showErrorToast(message, 3000);
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.brand, showErrorToast]);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
      return;
    }
    if (user && user.role) {
      fetchVehicles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  // Client-side filtering for advanced filters
  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];

    // Global Search - Search across ALL vehicle fields
    if (filters.search) {
      const searchLower = filters.search.toLowerCase().trim();
      const searchNumber = parseFloat(searchLower);
      const searchYear = parseInt(searchLower);
      
      result = result.filter((v) => {
        // Text fields - partial match
        const textMatch = 
          v.brand?.toLowerCase().includes(searchLower) ||
          v.model?.toLowerCase().includes(searchLower) ||
          v.category?.toLowerCase().includes(searchLower) ||
          v.plate?.toLowerCase().includes(searchLower) ||
          v.color?.toLowerCase().includes(searchLower) ||
          v.condition?.toLowerCase().includes(searchLower) ||
          v.body_type?.toLowerCase().includes(searchLower) ||
          v.tax_type?.toLowerCase().includes(searchLower);
        
        // Numeric fields - exact or partial match
        const numberMatch = !isNaN(searchNumber) && (
          // Search by price (exact match or contains)
          (typeof v.market_price === "string" && v.market_price.includes(searchLower)) ||
          (typeof v.market_price === "number" && v.market_price === searchNumber) ||
          // Search by year (exact match)
          (!isNaN(searchYear) && v.year === searchYear) ||
          // Search by ID
          v.id === searchNumber
        );
        
        // Date fields - partial match on date string
        const dateMatch = 
          v.created_at?.toLowerCase().includes(searchLower) ||
          v.updated_at?.toLowerCase().includes(searchLower);
        
        return textMatch || numberMatch || dateMatch;
      });
    }

    // Condition filter
    if (filters.condition && filters.condition !== "All") {
      result = result.filter((v) => 
        v.condition?.toLowerCase() === filters.condition.toLowerCase()
      );
    }

    // Color filter
    if (filters.color && filters.color !== "All") {
      result = result.filter((v) => 
        v.color?.toLowerCase() === filters.color.toLowerCase()
      );
    }

    // Year range filter
    if (filters.yearMin) {
      result = result.filter((v) => v.year >= parseInt(filters.yearMin));
    }
    if (filters.yearMax) {
      result = result.filter((v) => v.year <= parseInt(filters.yearMax));
    }

    // Price range filter
    if (filters.priceMin) {
      const minPrice = parseFloat(filters.priceMin);
      result = result.filter((v) => {
        const price = typeof v.market_price === "string" 
          ? parseFloat(v.market_price) 
          : v.market_price;
        return price >= minPrice;
      });
    }
    if (filters.priceMax) {
      const maxPrice = parseFloat(filters.priceMax);
      result = result.filter((v) => {
        const price = typeof v.market_price === "string" 
          ? parseFloat(v.market_price) 
          : v.market_price;
        return price <= maxPrice;
      });
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter((v) => new Date(v.created_at) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((v) => new Date(v.created_at) <= toDate);
    }

    // Without image filter
    if (filters.withoutImage) {
      result = result.filter((v) => !v.image_id);
    }

    return result;
  }, [vehicles, filters]);

  // Convert CleanedVehicle to Vehicle format for FiltersBar
  const vehiclesForFilters = useMemo((): Vehicle[] => {
    return vehicles.map(v => ({
      VehicleId: String(v.id),
      Category: v.category,
      Brand: v.brand,
      Model: v.model,
      Year: v.year,
      Plate: v.plate,
      PriceNew: typeof v.market_price === "string" ? parseFloat(v.market_price) : v.market_price,
      Price40: null,
      Price70: null,
      TaxType: v.tax_type || "",
      Condition: v.condition,
      BodyType: v.body_type || "",
      Color: v.color || "",
      Image: v.image_id || "",
      Time: v.created_at,
    }));
  }, [vehicles]);

  // Group vehicles by selected field
  const groupedVehicles = useMemo(() => {
    if (groupBy === "none") {
      return { "All Vehicles": filteredVehicles };
    }

    const groups: Record<string, CleanedVehicle[]> = {};
    
    filteredVehicles.forEach((vehicle) => {
      let key: string;
      
      switch (groupBy) {
        case "category":
          key = vehicle.category || "Uncategorized";
          break;
        case "brand":
          key = vehicle.brand || "Unknown Brand";
          break;
        case "year":
          key = String(vehicle.year) || "Unknown Year";
          break;
        case "condition":
          key = vehicle.condition || "Unknown Condition";
          break;
        case "color":
          key = vehicle.color || "Unknown Color";
          break;
        case "tax_type":
          key = vehicle.tax_type || "No Tax Type";
          break;
        default:
          key = "All Vehicles";
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(vehicle);
    });

    // Sort groups alphabetically (except year which should be numeric descending)
    const sortedEntries = Object.entries(groups).sort((a, b) => {
      if (groupBy === "year") {
        return parseInt(b[0]) - parseInt(a[0]); // Descending for years
      }
      return a[0].localeCompare(b[0]); // Alphabetical for others
    });

    return Object.fromEntries(sortedEntries);
  }, [filteredVehicles, groupBy]);

  // Get group statistics
  const groupStats = useMemo(() => {
    return Object.entries(groupedVehicles).map(([groupName, groupVehicles]) => ({
      name: groupName,
      count: groupVehicles.length,
      avgPrice: groupVehicles.reduce((acc, v) => acc + (typeof v.market_price === "string" ? parseFloat(v.market_price) : v.market_price || 0), 0) / (groupVehicles.length || 1),
    }));
  }, [groupedVehicles]);

  if (!user || !user.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TopBar user={user} onMenuClick={() => {}} />
      <Sidebar user={user} onNavigate={() => {}} />
      
      <main className="lg:pl-64 pt-16 pb-20 lg:pb-8">
        <div className="p-4 sm:p-6 lg:p-8">
          <GlassToast toasts={toasts} onRemove={removeToast} />
          
          {/* Header */}
          <div className="mb-6 p-6 rounded-2xl bg-white shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                  Cleaned Vehicles
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Total: <span className="font-semibold text-emerald-600">{total.toLocaleString()}</span> vehicles from Google Sheets
                  {selectedIds.size > 0 && (
                    <span className="ml-2 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-sm font-semibold">
                      {selectedIds.size} {selectedIds.size === 1 ? 'selected' : 'selected'}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {/* Add Vehicle Button */}
                <button
                onClick={() => window.dispatchEvent(new CustomEvent('openAddVehicleModal'))}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-50 text-emerald-600 font-semibold text-sm transition-all duration-200 hover:bg-emerald-100 active:bg-emerald-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
                </svg>
                Add Vehicle
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
            {/* All Vehicles */}
            <div className="p-3 rounded-xl bg-white shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">All Vehicles</span>
              </div>
              <p className="text-xl font-bold text-slate-800">{total.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Total inventory</p>
            </div>

            {/* Cars */}
            <div className="p-3 rounded-xl bg-white shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-blue-100 text-blue-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cars</span>
              </div>
              <p className="text-xl font-bold text-slate-800">
                {vehicles.filter(v => v.category?.toLowerCase().includes('car')).length.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500">Sedans & SUVs</p>
            </div>

            {/* Motorcycles */}
            <div className="p-3 rounded-xl bg-white shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-purple-100 text-purple-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Motorcycles</span>
              </div>
              <p className="text-xl font-bold text-slate-800">
                {vehicles.filter(v => v.category?.toLowerCase().includes('motorcycle')).length.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500">2-wheelers</p>
            </div>

            {/* TukTuks */}
            <div className="p-3 rounded-xl bg-white shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-amber-100 text-amber-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TukTuks</span>
              </div>
              <p className="text-xl font-bold text-slate-800">
                {vehicles.filter(v => v.category?.toLowerCase().includes('tuktuk')).length.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500">3-wheelers</p>
            </div>

            {/* Avg Price */}
            <div className="p-3 rounded-xl bg-white shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Price</span>
              </div>
              <p className="text-xl font-bold text-slate-800">
                {formatPrice(vehicles.reduce((acc, v) => acc + (typeof v.market_price === "string" ? parseFloat(v.market_price) : v.market_price || 0), 0) / (vehicles.length || 1))}
              </p>
              <p className="text-[10px] text-slate-500">Market average</p>
            </div>
          </div>

          {/* Professional Filters Bar */}
          <FiltersBar
            filters={filters}
            onFilterChange={setFilters}
            vehicles={vehiclesForFilters}
            resultCount={filteredVehicles.length}
            totalCount={total}
            isFiltered={filteredVehicles.length !== vehicles.length}
            onClearFilters={() => setFilters({
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
            })}
          />

          {/* Group By Control */}
          <div className="mb-4 p-4 rounded-xl bg-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span className="text-sm font-semibold text-slate-800">Group by:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "none", label: "None" },
                  { value: "category", label: "Category" },
                  { value: "brand", label: "Brand" },
                  { value: "year", label: "Year" },
                  { value: "condition", label: "Condition" },
                  { value: "color", label: "Color" },
                  { value: "tax_type", label: "Tax Type" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setGroupBy(option.value as typeof groupBy)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      groupBy === option.value
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Group Stats Summary */}
            {groupBy !== "none" && groupStats.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex flex-wrap gap-2">
                  {groupStats.map((stat) => (
                    <div
                      key={stat.name}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs"
                    >
                      <span className="font-semibold text-slate-800">{stat.name}:</span>
                      <span className="ml-1 text-emerald-600 font-bold">{stat.count}</span>
                      <span className="ml-1 text-slate-500">({formatPrice(stat.avgPrice)} avg)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="overflow-x-auto pb-4 custom-scrollbar">
                <div className="min-w-[1400px]">
                  {/* Table Header */}
                  <div className="flex items-center gap-4 px-4 py-3 mb-3 bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    <div className="w-16 shrink-0 text-center">Image</div>
                    <div className="w-56 shrink-0">Brand / Model</div>
                    <div className="w-24 shrink-0 text-center">Year</div>
                    <div className="w-32 shrink-0 text-center">Category</div>
                    <div className="w-32 shrink-0 text-center">Plate</div>
                    <div className="w-32 shrink-0 text-center">Price</div>
                    <div className="w-28 shrink-0 text-center">Condition</div>
                    <div className="w-28 shrink-0 text-center">Color</div>
                    <div className="w-24 shrink-0 text-center">Tax Type</div>
                  </div>
                  
                  {/* Loading Skeleton Rows */}
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="bg-white mx-4 my-2 p-4 rounded-xl shadow-sm flex flex-row items-center gap-4 min-w-[1100px]">
                        <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
                        <div className="w-56 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse shrink-0" />
                        <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse shrink-0" />
                        <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse shrink-0" />
                        <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse shrink-0" />
                        <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse shrink-0" />
                        <div className="w-28 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse shrink-0" />
                        <div className="w-28 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse shrink-0" />
                        <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vehicles Table - Horizontal & Vertical Scroll */}
          {!isLoading && filteredVehicles.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div 
                className="overflow-auto max-h-[65vh] custom-scrollbar"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#cbd5e1 #f1f5f9'
                }}
              >
                <div className="min-w-[1600px]">
                  {/* Table Header */}
                  <div className="flex items-center gap-4 px-4 py-3 mb-3 bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    <div className="w-16 shrink-0 text-center">Image</div>
                    <div className="w-56 shrink-0">Brand / Model</div>
                    <div className="w-24 shrink-0 text-center">Year</div>
                    <div className="w-32 shrink-0 text-center">Category</div>
                    <div className="w-32 shrink-0 text-center">Plate</div>
                    <div className="w-32 shrink-0 text-center">Price</div>
                    <div className="w-28 shrink-0 text-center">Condition</div>
                    <div className="w-28 shrink-0 text-center">Color</div>
                    <div className="w-24 shrink-0 text-center">Tax Type</div>
                  </div>
                  
                  {/* Grouped Table Rows */}
                  <div className="space-y-6">
                    {Object.entries(groupedVehicles).map(([groupName, groupVehicles]) => (
                      <div key={groupName} className="space-y-3">
                        {/* Group Header */}
                        {groupBy !== "none" && (
                          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              <span className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                                {groupBy === "color" && groupName !== "Unknown Color" ? (
                                  <span className="flex items-center gap-2">
                                    <div 
                                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                      style={{ backgroundColor: getColorHex(groupName) }}
                                    />
                                    {groupName}
                                  </span>
                                ) : (
                                  groupName
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 ml-auto">
                              <span className="text-xs text-slate-500">
                                {groupVehicles.length} vehicle{groupVehicles.length !== 1 ? 's' : ''}
                              </span>
                              <span className="text-xs font-semibold text-emerald-600">
                                Avg: {formatPrice(groupVehicles.reduce((acc, v) => acc + (typeof v.market_price === "string" ? parseFloat(v.market_price) : v.market_price || 0), 0) / (groupVehicles.length || 1))}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Vehicle Rows in Group */}
                        <div className="space-y-3">
                          {groupVehicles.map((vehicle) => (
                            <div 
                              key={vehicle.id} 
                              onClick={() => router.push(`/cleaned-vehicles/${vehicle.id}/view`)}
                              className="bg-white mx-4 my-2 p-4 rounded-xl shadow-sm flex flex-row items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 min-w-[1100px] whitespace-nowrap"
                            >
                              {/* Image */}
                              <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 bg-slate-100" onClick={(e) => e.stopPropagation()}>
                                {vehicle.image_id ? (
                                  <button
                                    onClick={() => setSelectedImage(getVehicleFullImageUrl(vehicle.image_id))}
                                    className="w-16 h-16 rounded-xl overflow-hidden hover:opacity-80 transition-opacity"
                                  >
                                    <img
                                      src={getVehicleThumbnailUrl(vehicle.image_id) || ""}
                                      alt={`${vehicle.brand} ${vehicle.model}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 75'%3E%3Crect width='100' height='75' fill='%23e2e8f0'/%3E%3Ctext x='50' y='40' text-anchor='middle' font-size='10' fill='%2364748b' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";
                                      }}
                                    />
                                  </button>
                                ) : (
                                  <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center text-xs text-slate-500">
                                    No Image
                                  </div>
                                )}
                              </div>
                              
                              {/* Brand & Model */}
                              <div className="w-56 shrink-0">
                                <p className="font-bold text-slate-800 text-base truncate">{vehicle.brand} {vehicle.model}</p>
                              </div>
                              
                              {/* Year */}
                              <div className="w-24 shrink-0 text-center">
                                <p className="text-sm text-slate-500">{vehicle.year}</p>
                              </div>
                              
                              {/* Category */}
                              <div className="w-32 shrink-0 text-center">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                  {vehicle.category}
                                </span>
                              </div>
                              
                              {/* Plate */}
                              <div className="w-32 shrink-0 text-center">
                                <p className="text-sm font-mono text-slate-600">{vehicle.plate}</p>
                              </div>
                              
                              {/* Price */}
                              <div className="w-32 shrink-0 text-center">
                                <p className="font-bold text-emerald-600 text-base">{formatPrice(vehicle.market_price)}</p>
                              </div>
                              
                              {/* Condition */}
                              <div className="w-28 shrink-0 text-center">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  vehicle.condition === "New" 
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                }`}>
                                  {vehicle.condition}
                                </span>
                              </div>
                              
                              {/* Color with Visual Indicator */}
                              <div className="w-28 shrink-0 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {vehicle.color ? (
                                    <>
                                      <div 
                                        className="w-4 h-4 rounded-full shadow-sm border-2 border-white"
                                        style={{ 
                                          backgroundColor: getColorHex(vehicle.color),
                                        }}
                                        title={vehicle.color}
                                      />
                                      <span className="text-sm text-slate-600 font-medium">
                                        {vehicle.color}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-sm text-slate-600">—</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Tax Type */}
                              <div className="w-24 shrink-0 text-center">
                                <p className="text-sm text-slate-500">{vehicle.tax_type || "—"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredVehicles.length === 0 && !error && (
            <div className="p-8 rounded-2xl bg-white shadow-lg text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-2xl bg-slate-100 text-slate-500">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {vehicles.length === 0 ? (
                  <div>
                    <p className="text-lg font-bold text-slate-800 mb-1">No vehicles found</p>
                    <p className="text-sm text-slate-500">The inventory is currently empty</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-bold text-slate-800 mb-1">No vehicles match your filters</p>
                    <p className="text-sm text-slate-500 mb-4">Try adjusting your search criteria</p>
                    <button
                      onClick={() => setFilters({
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
                      })}
                      className="px-6 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-semibold text-sm transition-all duration-200 hover:bg-emerald-100"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
      
      {/* Image Modal */}
      <ImageModal
        isOpen={!!selectedImage}
        imageUrl={selectedImage || ""}
        alt="Vehicle Image"
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
