"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/app/components/AuthContext";
import TopBar from "@/app/components/TopBar";
import Sidebar from "@/app/components/Sidebar";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import ImageModal from "@/app/components/ImageModal";
import { GlassToast, useToast } from "@/app/components/ui/GlassToast";
import { driveThumbnailUrl } from "@/lib/drive";

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

export default function CleanedVehiclesPage() {
  const user = useAuthUser();
  const router = useRouter();
  const { toasts, removeToast, error: showErrorToast } = useToast();
  
  const [vehicles, setVehicles] = useState<CleanedVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filter, setFilter] = useState({ category: "", brand: "" });

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const params = new URLSearchParams();
      if (filter.category) params.set("category", filter.category);
      if (filter.brand) params.set("brand", filter.brand);
      params.set("limit", "100"); // Reduced from 1000 for better performance
      
      const res = await fetch(`/api/cleaned-vehicles?${params.toString()}`, {
        cache: "default", // Use cache instead of no-store for better performance
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
  }, [filter, showErrorToast]);

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

  // Check if image_id is a Cloudinary URL (guard against "undefined" string)
  const isCloudinaryUrl = (imageId: string | null): boolean => {
    if (!imageId) return false;
    if (imageId === 'undefined' || imageId === 'null') return false;
    return imageId.includes('res.cloudinary.com');
  };

  // Get thumbnail URL for table display (small size)
  const getThumbnailUrl = (imageId: string | null) => {
    if (!imageId) return null;
    // If it's a Cloudinary URL, return as-is (Cloudinary handles resizing via URL params if needed)
    if (isCloudinaryUrl(imageId)) return imageId;
    // Otherwise treat as Google Drive file ID
    return driveThumbnailUrl(imageId, "w200-h150");
  };

  // Get full-size URL for modal display
  const getFullImageUrl = (imageId: string | null) => {
    if (!imageId) return null;
    // If it's a Cloudinary URL, return as-is
    if (isCloudinaryUrl(imageId)) return imageId;
    // Otherwise treat as Google Drive file ID
    return driveThumbnailUrl(imageId, "w1200-h900");
  };

  const formatPrice = (price: string | number | null) => {
    if (!price) return "—";
    const num = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(num)) return "—";
    return `$${num.toLocaleString()}`;
  };

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
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              Cleaned Vehicles (Google Sheets)
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Total: <span className="font-semibold text-emerald-600">{total.toLocaleString()}</span> vehicles from Google Sheets
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-3">
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">All Categories</option>
              <option value="Car">Car</option>
              <option value="Motorcycle">Motorcycle</option>
              <option value="Tuk Tuk">Tuk Tuk</option>
              <option value="Truck">Truck</option>
              <option value="SUV">SUV</option>
            </select>
            
            <input
              type="text"
              placeholder="Filter by brand..."
              value={filter.brand}
              onChange={(e) => setFilter({ ...filter, brand: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
            />
            
            <button
              onClick={fetchVehicles}
              disabled={isLoading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Image</th>
                    <th className="px-4 py-3 text-left font-semibold">Category</th>
                    <th className="px-4 py-3 text-left font-semibold">Brand</th>
                    <th className="px-4 py-3 text-left font-semibold">Model</th>
                    <th className="px-4 py-3 text-left font-semibold">Year</th>
                    <th className="px-4 py-3 text-left font-semibold">Plate</th>
                    <th className="px-4 py-3 text-left font-semibold">Price</th>
                    <th className="px-4 py-3 text-left font-semibold">Condition</th>
                    <th className="px-4 py-3 text-left font-semibold">Color</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-4 py-3"><div className="h-12 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Vehicles Table */}
          {!isLoading && vehicles.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Image</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Category</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Brand</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Model</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Year</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Plate</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Price</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Condition</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Color</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {vehicles.map((vehicle) => (
                    <tr 
                      key={vehicle.id} 
                      onClick={() => vehicle.image_id && setSelectedImage(getFullImageUrl(vehicle.image_id))}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${vehicle.image_id ? "cursor-pointer" : ""}`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {vehicle.image_id ? (
                          <button
                            onClick={() => setSelectedImage(getFullImageUrl(vehicle.image_id))}
                            className="w-16 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 hover:opacity-80 transition-opacity"
                          >
                            <img
                              src={getThumbnailUrl(vehicle.image_id) || ""}
                              alt={`${vehicle.brand} ${vehicle.model}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 75'%3E%3Crect width='100' height='75' fill='%23e2e8f0'/%3E%3Ctext x='50' y='40' text-anchor='middle' font-size='10' fill='%2364748b' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";
                              }}
                            />
                          </button>
                        ) : (
                          <div className="w-16 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-400">
                            No Image
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {vehicle.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {vehicle.brand}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {vehicle.model}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {vehicle.year}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {vehicle.plate}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(vehicle.market_price)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          vehicle.condition === "New" 
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                          {vehicle.condition}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {vehicle.color || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && vehicles.length === 0 && !error && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No vehicles found.
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
