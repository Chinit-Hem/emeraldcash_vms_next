"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuthUser } from "@/app/components/AuthContext";
import { VehicleDetailsCard } from "@/app/components/vehicles/VehicleDetailsCard";
import { ConfirmDeleteModal } from "@/app/components/vehicles/ConfirmDeleteModal";
import { GlassCard } from "@/app/components/ui/GlassCard";
import { useToast } from "@/app/components/ui/GlassToast";
import { CardSkeleton } from "@/app/components/LoadingSkeleton";
import { extractDriveFileId } from "@/lib/drive";
import { refreshVehicleCache, onVehicleCacheUpdate } from "@/lib/vehicleCache";
import type { Vehicle } from "@/lib/types";
import { useMounted } from "@/lib/useMounted";

// Force text visibility in dark mode - inline styles for immediate effect
const forceTextVisibleStyles = `
  .dark .vehicle-details-container,
  .dark .vehicle-details-container *,
  [data-theme="dark"] .vehicle-details-container,
  [data-theme="dark"] .vehicle-details-container * {
    color: #f8fafc !important;
  }
  .dark .vehicle-details-container h1,
  .dark .vehicle-details-container h2,
  .dark .vehicle-details-container h3,
  .dark .vehicle-details-container p,
  .dark .vehicle-details-container span,
  .dark .vehicle-details-container div,
  .dark .vehicle-details-container label,
  .dark .vehicle-details-container button,
  [data-theme="dark"] .vehicle-details-container h1,
  [data-theme="dark"] .vehicle-details-container h2,
  [data-theme="dark"] .vehicle-details-container h3,
  [data-theme="dark"] .vehicle-details-container p,
  [data-theme="dark"] .vehicle-details-container span,
  [data-theme="dark"] .vehicle-details-container div,
  [data-theme="dark"] .vehicle-details-container label,
  [data-theme="dark"] .vehicle-details-container button {
    color: #f8fafc !important;
  }
`;

export default function ViewVehiclePage() {
  return <ViewVehicleInner />;
}

function ViewVehicleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const user = useAuthUser();
  const isMounted = useMounted();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Determine user role
  const userRole = user?.role || "Viewer";
  
  // Toast
  const { success: showSuccess, error: showError } = useToast();

  // Check for auto-print
  const shouldAutoPrint = (() => {
    const value = searchParams?.get("print") ?? "";
    return value === "1" || value.toLowerCase() === "true";
  })();

  // Load vehicle data (client-side only)
  useEffect(() => {
    if (!id || !isMounted) return;

    // Check if we should skip cache (e.g., after an edit)
    const urlParams = new URLSearchParams(window.location.search);
    const skipCache = urlParams.get('refresh') === '1';
    
    // Try to find vehicle in cache first (only if not skipping)
    if (!skipCache) {
      try {
        const cached = localStorage.getItem("vms-vehicles");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const found = (parsed as Vehicle[]).find((v) => v.VehicleId === id);
            if (found) {
              // Only use cache if it's not stale
              const cacheTime = localStorage.getItem("vms-vehicles-timestamp");
              const mutationTime = localStorage.getItem("vms-vehicles-last-mutation");
              const cacheAge = cacheTime ? Date.now() - parseInt(cacheTime, 10) : Infinity;
              const hasMutation = mutationTime && cacheTime && parseInt(mutationTime, 10) > parseInt(cacheTime, 10);
              
              // Use cache if it's less than 30 seconds old and no mutation occurred
              if (cacheAge < 30000 && !hasMutation) {
                console.log("[VIEW_VEHICLE] Using fresh cache for vehicle:", found.VehicleId);
                setVehicle(found);
                setLoading(false);
              } else {
                console.log("[VIEW_VEHICLE] Cache is stale, fetching fresh data");
              }
            }
          }
        }
      } catch {
        // Ignore cache errors
      }
    } else {
      console.log("[VIEW_VEHICLE] Skipping cache due to refresh parameter");
    }

    // Fetch fresh data in background
    let alive = true;
    let authFailed = false; // Prevent infinite loops on 401
    setError("");

    async function fetchVehicle() {
      try {
        console.log(`[VIEW_VEHICLE] Fetching vehicle ${id} with credentials`);
        const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
          cache: "no-store",
          credentials: "include", // CRITICAL: Required for session cookie
        });
        
        console.log(`[VIEW_VEHICLE] Response status: ${res.status}`);
        
        if (res.status === 401) {
          if (!authFailed) {
            authFailed = true;
            console.log("[VIEW_VEHICLE] 401 received, redirecting to login");
            router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
          }
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch vehicle");
        const data = await res.json();
        if (!alive) return;
        const fetchedVehicle = data.data || data.vehicle;
        setVehicle(fetchedVehicle);
        
        // Update cache
        try {
          const cached = localStorage.getItem("vms-vehicles");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const index = parsed.findIndex((v: Vehicle) => v.VehicleId === id);
              if (index >= 0) {
                parsed[index] = fetchedVehicle;
                localStorage.setItem("vms-vehicles", JSON.stringify(parsed));
              }
            }
          }
        } catch {
          // Ignore cache update errors
        }
      } catch (err) {
        if (!alive) return;
        if (!vehicle) {
          setError(err instanceof Error ? err.message : "Error loading vehicle");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchVehicle();
    return () => {
      alive = false;
    };
  }, [id, router, isMounted]);

  // Auto-print effect
  useEffect(() => {
    if (!shouldAutoPrint || !vehicle) return;
    const timeout = window.setTimeout(() => window.print(), 150);
    return () => window.clearTimeout(timeout);
  }, [shouldAutoPrint, vehicle]);

  // Listen for cache updates to refresh vehicle data when it changes
  useEffect(() => {
    return onVehicleCacheUpdate((vehicles) => {
      const updatedVehicle = vehicles.find((v) => v.VehicleId === id);
      if (updatedVehicle) {
        console.log("[VIEW_VEHICLE] Cache updated, refreshing vehicle:", updatedVehicle.VehicleId);
        console.log("[VIEW_VEHICLE] New image URL:", updatedVehicle.Image?.substring(0, 100));
        setVehicle(updatedVehicle);
      }
    });
  }, [id]);

  // Debug: Log vehicle image changes
  useEffect(() => {
    if (vehicle) {
      console.log("[VIEW_VEHICLE] Vehicle updated:", {
        id: vehicle.VehicleId,
        hasImage: !!vehicle.Image,
        imageUrl: vehicle.Image?.substring(0, 100)
      });
    }
  }, [vehicle?.Image, vehicle?.VehicleId]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!vehicle) return;
    
    setIsDeleting(true);
    try {
      const imageFileId = extractDriveFileId(vehicle.Image);
      const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.VehicleId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // CRITICAL: Required for session cookie
        body: JSON.stringify({ imageFileId, imageUrl: vehicle.Image }),
      });

      if (res.status === 401) {
        router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
        return;
      }

      if (res.status === 403) {
        throw new Error("You don't have permission to delete this vehicle");
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Failed to delete vehicle");
      }

      await refreshVehicleCache();
      showSuccess("Vehicle deleted successfully");
      setIsDeleteModalOpen(false);
      router.push("/vehicles");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      showError(message);
    } finally {
      setIsDeleting(false);
    }
  }, [vehicle, router, showSuccess, showError]);

  // Loading state
  if (loading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: forceTextVisibleStyles }} />
        <div className="p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 dark:text-white">
          <div className="max-w-6xl mx-auto space-y-6">
            <CardSkeleton className="h-96" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CardSkeleton className="h-64" />
              <CardSkeleton className="h-64" />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: forceTextVisibleStyles }} />
        <div className="p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 dark:text-white">
          <div className="max-w-3xl mx-auto">
            <GlassCard variant="elevated" className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8 text-red-600"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6" />
                  <path d="m9 9 6 6" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Error Loading Vehicle
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Retry
                </button>
                <button
                  onClick={() => router.push("/vehicles")}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Back to List
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      </>
    );
  }

  // Not found state
  if (!vehicle) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: forceTextVisibleStyles }} />
        <div className="p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 dark:text-white">
          <div className="max-w-3xl mx-auto">
            <GlassCard variant="elevated" className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8 text-gray-400"
                >
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Vehicle Not Found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The vehicle you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
              <button
                onClick={() => router.push("/vehicles")}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Back to Vehicles
              </button>
            </GlassCard>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Inject emergency text visibility styles */}
      <style dangerouslySetInnerHTML={{ __html: forceTextVisibleStyles }} />
      
      <div className="p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 dark:text-white" style={{ color: 'inherit' }}>
        <div className="max-w-6xl mx-auto" style={{ color: '#f8fafc' }}>
          <div className="vehicle-details-container" style={{ color: '#f8fafc' }}>
            <VehicleDetailsCard
              vehicle={vehicle}
              userRole={userRole}
              onDelete={async () => { setIsDeleteModalOpen(true); }}
              isDeleting={isDeleting}
            />
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          vehicle={vehicle}
          isOpen={isDeleteModalOpen}
          isDeleting={isDeleting}
          userRole={userRole}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      </div>
    </>
  );
}
