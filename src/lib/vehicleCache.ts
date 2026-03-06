import type { Vehicle, VehicleMeta } from "@/lib/types";

const CACHE_KEY = "vms-vehicles";
const META_KEY = "vms-vehicles-meta";
const CACHE_VERSION_KEY = "vms-vehicles-version";
const CURRENT_CACHE_VERSION = "2"; // Increment when cache format changes
const UPDATE_EVENT = "vms-vehicles-updated";

export function readVehicleCache(): Vehicle[] | null {
  if (typeof window === "undefined") return null;
  try {
    // Check cache version first
    const cacheVersion = localStorage.getItem(CACHE_VERSION_KEY);
    if (cacheVersion !== CURRENT_CACHE_VERSION) {
      // Clear old cache
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(META_KEY);
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
      console.log("[vehicleCache] Cache version mismatch, cleared old cache");
      return null;
    }
    
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? (parsed as Vehicle[]) : null;
  } catch {
    return null;
  }
}

export function readVehicleMetaCache(): VehicleMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(META_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed as VehicleMeta;
  } catch {
    return null;
  }
}

export function writeVehicleCache(vehicles: Vehicle[], meta?: VehicleMeta) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(vehicles));
    if (meta) {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    }
    localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
  } catch {
    // ignore cache write errors
  }
  try {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: vehicles }));
  } catch {
    // ignore event errors
  }
}

export function onVehicleCacheUpdate(handler: (vehicles: Vehicle[]) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<Vehicle[]>;
    if (Array.isArray(customEvent.detail)) {
      handler(customEvent.detail);
    }
  };
  window.addEventListener(UPDATE_EVENT, listener as EventListener);
  return () => window.removeEventListener(UPDATE_EVENT, listener as EventListener);
}

export async function refreshVehicleCache(): Promise<Vehicle[] | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/vehicles?noCache=1", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    if (!data?.ok || !Array.isArray(data?.data)) return null;
    const vehicles = data.data as Vehicle[];
    writeVehicleCache(vehicles);
    return vehicles;
  } catch {
    return null;
  }
}