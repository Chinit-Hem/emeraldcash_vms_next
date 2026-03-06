

import { useCallback, useEffect, useState } from "react";
import { vehicleApi, isApiError, isConfigError, isNetworkError, getErrorDetails } from "./api";
import { onVehicleCacheUpdate, shouldUseCache, isCacheStale } from "./vehicleCache";
import type { Vehicle, VehicleMeta } from "./types";
import { isIOSSafariBrowser } from "./platform";




interface UseVehiclesReturn {
  vehicles: Vehicle[];
  meta: VehicleMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastSyncTime: Date | null;
}


export function useVehicles(noCache = true): UseVehiclesReturn {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [meta, setMeta] = useState<VehicleMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if cache is stale - if so, force noCache to true
      const cacheIsStale = isCacheStale();
      const effectiveNoCache = noCache || cacheIsStale;
      
      if (cacheIsStale && process.env.NODE_ENV === 'development') {
        console.log('[useVehicles] Cache is stale, forcing fresh data fetch');
      }
      
      const useLiteMode = isIOSSafariBrowser();
      const result = await vehicleApi.getVehicles(
        effectiveNoCache,
        useLiteMode
          ? {
              lite: true,
              maxRows: 250,
            }
          : undefined
      );
      
      // Validate that we actually got data
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Invalid response: expected array of vehicles");
      }
      
      setVehicles(result.data);
      // Ensure meta.total represents the FULL dataset count, not max ID
      setMeta(result.meta || null);
      setLastSyncTime(new Date());
      
      // Clear any previous error on success
      setError(null);
      
    } catch (err) {
      // Always set an error - never silently fail
      let errorMessage: string;
      
      // Use the actual error message for NetworkError/ConfigError to preserve details
      if (isNetworkError(err) || isConfigError(err)) {
        errorMessage = err.message;
      } else if (isApiError(err)) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = "Failed to fetch vehicles. Please check your connection and try again.";
      }
      
      // Add extra context for config errors
      if (isConfigError(err)) {
        errorMessage = `Configuration Error:\n\n${errorMessage}`;
      }
      
      setError(errorMessage);


      // In development, log the full error details
      if (process.env.NODE_ENV === 'development') {
        console.error('[useVehicles] Error fetching vehicles:', err);
        
        if (isApiError(err)) {
          console.error('[useVehicles] API Error:', {
            status: err.status,
            code: err.code,
            message: err.message
          });
        }
      }

      
      // Clear vehicles on error to prevent showing stale/incorrect data
      setVehicles([]);
      setMeta(null);
      
    } finally {
      setLoading(false);
    }
  }, [noCache]);


  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Listen for cache updates from other components (e.g., after adding a vehicle)
  useEffect(() => {
    const unsubscribe = onVehicleCacheUpdate(() => {
      // Refetch when cache is updated by another component
      fetchVehicles();
    });
    return unsubscribe;
  }, [fetchVehicles]);

  return {

    vehicles,
    meta,
    loading,
    error,
    refetch: fetchVehicles,
    lastSyncTime,
  };
}
