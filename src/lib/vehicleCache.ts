import type { Vehicle, VehicleMeta } from "@/lib/types";

const CACHE_KEY = "vms-vehicles";
const META_KEY = "vms-vehicles-meta";
const CACHE_VERSION_KEY = "vms-vehicles-version";
const CACHE_TIMESTAMP_KEY = "vms-vehicles-timestamp";
const LAST_MUTATION_KEY = "vms-vehicles-last-mutation";
const CURRENT_CACHE_VERSION = "4"; // Increment when cache format changes
const UPDATE_EVENT = "vms-vehicles-updated";
const CACHE_STALE_MS = 5 * 60 * 1000; // 5 minutes default stale time

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
    const meta = data.meta as VehicleMeta | undefined;
    writeVehicleCache(vehicles, meta);
    // Update cache timestamp
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    return vehicles;
  } catch {
    return null;
  }
}

/**
 * Get the timestamp of the last mutation (create, update, delete)
 */
export function getLastMutationTime(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LAST_MUTATION_KEY);
    if (!stored) return null;
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Record a mutation to invalidate cache
 */
export function recordMutation(): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    localStorage.setItem(LAST_MUTATION_KEY, now.toString());
    console.log("[vehicleCache] Mutation recorded at", new Date(now).toISOString());
  } catch {
    // ignore errors
  }
}

/**
 * Get the timestamp of when cache was last updated
 */
export function getCacheTimestamp(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!stored) return null;
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Check if the cache is stale based on:
 * 1. Time since last cache update
 * 2. Whether a mutation occurred after the cache was written
 */
export function isCacheStale(): boolean {
  if (typeof window === "undefined") return true;
  
  const cacheTime = getCacheTimestamp();
  const mutationTime = getLastMutationTime();
  
  // If no cache timestamp, it's stale
  if (!cacheTime) return true;
  
  // If mutation occurred after cache was written, it's stale
  if (mutationTime && mutationTime > cacheTime) {
    console.log("[vehicleCache] Cache is stale: mutation occurred after cache");
    return true;
  }
  
  // Check if cache is older than stale threshold
  const age = Date.now() - cacheTime;
  if (age > CACHE_STALE_MS) {
    console.log("[vehicleCache] Cache is stale: age", age, "ms exceeds threshold", CACHE_STALE_MS, "ms");
    return true;
  }
  
  return false;
}

/**
 * Determine if cache should be used based on staleness and noCache flag
 * @param noCache - If true, always fetch fresh data
 * @returns true if cache is usable, false if fresh data should be fetched
 */
export function shouldUseCache(noCache = false): boolean {
  // If explicitly requesting no cache, don't use it
  if (noCache) return false;
  
  // If cache is stale, don't use it
  if (isCacheStale()) return false;
  
  // Otherwise, cache is usable
  return true;
}

/**
 * Clear all vehicle cache data including mutation tracking
 */
export function clearAllVehicleCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    localStorage.removeItem(LAST_MUTATION_KEY);
    console.log("[vehicleCache] All cache cleared");
  } catch {
    // ignore errors
  }
}
