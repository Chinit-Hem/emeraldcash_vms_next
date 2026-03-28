"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthUser } from "@/app/components/AuthContext";
import TopBar from "@/app/components/TopBar";
import Sidebar from "@/app/components/Sidebar";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import { GlassToast, useToast } from "@/components/ui/glass/GlassToast";
import { formatPrice, getVehicleFullImageUrl } from "@/lib/vehicle-helpers";
import { 
  Car, 
  Calendar, 
  DollarSign, 
  Palette, 
  FileText, 
  CheckCircle2, 
  ArrowLeft,
  Tag,
  Hash,
  Info
} from "lucide-react";

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

// Color name to hex mapping
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
  };
  
  const normalized = colorName?.toLowerCase().trim() || "";
  return colorMap[normalized] || "#718096";
};

export default function CleanedVehicleViewPage() {
  const user = useAuthUser();
  const router = useRouter();
  const params = useParams();
  const { toasts, removeToast, error: showError } = useToast();
  
  const [vehicle, setVehicle] = useState<CleanedVehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const vehicleId = params?.id as string;

  const fetchVehicle = useCallback(async () => {
    if (!vehicleId) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      // Fetch from the cleaned-vehicles API
      const res = await fetch(`/api/cleaned-vehicles?id=${vehicleId}`, {
        cache: "no-store",
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Vehicle not found");
        }
        throw new Error("Failed to fetch vehicle details");
      }
      
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setVehicle(data.data[0]);
      } else {
        throw new Error("Vehicle not found");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error loading vehicle";
      setError(message);
      showError(message, 3000);
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId, showError]);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
      return;
    }
    if (user && user.role && vehicleId) {
      fetchVehicle();
    }
  }, [user, router, vehicleId, fetchVehicle]);

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
          
          {/* Back Button */}
          <button
            onClick={() => router.push("/cleaned-vehicles")}
            className="mb-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e0e5ec] shadow-[4px_4px_8px_#a3b1c6,-4px_-4px_8px_#ffffff] text-[#4a4a5a] font-medium text-sm transition-all duration-250 hover:shadow-[2px_2px_4px_#a3b1c6,-2px_-2px_4px_#ffffff] active:shadow-[inset_2px_2px_4px_#a3b1c6,inset_-2px_-2px_4px_#ffffff]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>

          {/* Loading State */}
          {isLoading && (
            <div className="p-8 rounded-[24px] bg-[#e0e5ec] shadow-[12px_12px_24px_#a3b1c6,-12px_-12px_24px_#ffffff]">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-[20px]"></div>
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="p-8 rounded-[24px] bg-[#e0e5ec] shadow-[12px_12px_24px_#a3b1c6,-12px_-12px_24px_#ffffff] text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-2xl bg-red-100 text-red-600">
                  <Info className="w-8 h-8" />
                </div>
                <p className="text-lg font-bold text-[#2d3748]">{error}</p>
                <button
                  onClick={fetchVehicle}
                  className="px-6 py-2.5 rounded-xl bg-[#e0e5ec] shadow-[4px_4px_8px_#a3b1c6,-4px_-4px_8px_#ffffff] text-[#10b981] font-semibold text-sm transition-all"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Vehicle Details */}
          {!isLoading && !error && vehicle && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="p-6 rounded-[24px] bg-[#e0e5ec] shadow-[12px_12px_24px_#a3b1c6,-12px_-12px_24px_#ffffff]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-[#2d3748]">
                      {vehicle.brand} {vehicle.model}
                    </h1>
                    <p className="text-[#718096] mt-1">
                      {vehicle.category} • {vehicle.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      vehicle.condition === "New" 
                        ? "bg-blue-100 text-blue-700 shadow-[2px_2px_4px_#a3b1c6,-2px_-2px_4px_#ffffff]"
                        : "bg-amber-100 text-amber-700 shadow-[2px_2px_4px_#a3b1c6,-2px_-2px_4px_#ffffff]"
                    }`}>
                      {vehicle.condition}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image Section */}
                <div className="p-6 rounded-[24px] bg-[#e0e5ec] shadow-[12px_12px_24px_#a3b1c6,-12px_-12px_24px_#ffffff]">
                  <h2 className="text-lg font-bold text-[#2d3748] mb-4 flex items-center gap-2">
                    <Car className="w-5 h-5 text-[#10b981]" />
                    Vehicle Image
                  </h2>
                  {vehicle.image_id ? (
                    <div className="rounded-[20px] overflow-hidden bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff] p-4">
                      <img
                        src={getVehicleFullImageUrl(vehicle.image_id) || ""}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-auto max-h-[400px] object-contain rounded-[16px]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 75'%3E%3Crect width='100' height='75' fill='%23e2e8f0'/%3E%3Ctext x='50' y='40' text-anchor='middle' font-size='10' fill='%2364748b' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-64 rounded-[20px] bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff] flex items-center justify-center">
                      <div className="text-center">
                        <Car className="w-16 h-16 text-[#718096] mx-auto mb-2" />
                        <p className="text-[#718096]">No image available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="p-6 rounded-[24px] bg-[#e0e5ec] shadow-[12px_12px_24px_#a3b1c6,-12px_-12px_24px_#ffffff]">
                    <h2 className="text-lg font-bold text-[#2d3748] mb-4 flex items-center gap-2">
                      <Info className="w-5 h-5 text-[#10b981]" />
                      Basic Information
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailItem 
                        icon={<Tag className="w-4 h-4" />} 
                        label="Brand" 
                        value={vehicle.brand} 
                      />
                      <DetailItem 
                        icon={<Tag className="w-4 h-4" />} 
                        label="Model" 
                        value={vehicle.model} 
                      />
                      <DetailItem 
                        icon={<Calendar className="w-4 h-4" />} 
                        label="Year" 
                        value={vehicle.year.toString()} 
                      />
                      <DetailItem 
                        icon={<Hash className="w-4 h-4" />} 
                        label="Plate" 
                        value={vehicle.plate || "—"} 
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="p-6 rounded-[24px] bg-[#e0e5ec] shadow-[12px_12px_24px_#a3b1c6,-12px_-12px_24px_#ffffff]">
                    <h2 className="text-lg font-bold text-[#2d3748] mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-[#10b981]" />
                      Pricing
                    </h2>
                    <div className="p-4 rounded-[16px] bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff]">
                      <p className="text-sm text-[#718096] mb-1">Market Price</p>
                      <p className="text-3xl font-bold text-[#2ecc71]">
                        {formatPrice(vehicle.market_price)}
                      </p>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="p-6 rounded-[24px] bg-[#e0e5ec] shadow-[12px_12px_24px_#a3b1c6,-12px_-12px_24px_#ffffff]">
                    <h2 className="text-lg font-bold text-[#2d3748] mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
                      Additional Details
                    </h2>
                    <div className="space-y-3">
                      <DetailItem 
                        icon={<FileText className="w-4 h-4" />} 
                        label="Tax Type" 
                        value={vehicle.tax_type || "—"} 
                      />
                      <DetailItem 
                        icon={<Tag className="w-4 h-4" />} 
                        label="Body Type" 
                        value={vehicle.body_type || "—"} 
                      />
                      <DetailItem 
                        icon={<Palette className="w-4 h-4" />} 
                        label="Color" 
                        value={
                          vehicle.color ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: getColorHex(vehicle.color) }}
                              />
                              {vehicle.color}
                            </div>
                          ) : "—"
                        } 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

// Helper component for detail items
interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function DetailItem({ icon, label, value }: DetailItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-[12px] bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#a3b1c6,inset_-2px_-2px_4px_#ffffff]">
      <div className="p-2 rounded-lg bg-[#e0e5ec] shadow-[2px_2px_4px_#a3b1c6,-2px_-2px_4px_#ffffff] text-[#10b981]">
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#718096] uppercase tracking-wider">{label}</p>
        <p className="font-semibold text-[#2d3748]">{value}</p>
      </div>
    </div>
  );
}
