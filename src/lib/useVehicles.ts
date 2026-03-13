

import { useCallback, useEffect, useState, useRef } from "react";
import { vehicleApi, isApiError, isConfigError, isNetworkError, getErrorDetails, NetworkError, type VehicleFilters } from "./api";
import { onVehicleCacheUpdate, shouldUseCache, isCacheStale, getCacheAge, clearAllVehicleCache } from "./vehicleCache";
import type { Vehicle, VehicleMeta } from "./types";
import { isIOSSafariBrowser } from "./platform";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 5000; // 5 seconds

// Debounce delay for search queries (ms) - wait 500ms before fetching
const SEARCH_DEBOUNCE_MS = 500;
// Debounce delay for other filter changes (ms)
const FILTER_DEBOUNCE_MS = 150;

interface UseVehiclesReturn {
  vehicles: Vehicle[];
  meta: VehicleMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastSyncTime: Date | null;
  isFiltering: boolean;
}

// Helper function to delay with exponential backoff
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface UseVehiclesOptions {
  noCache?: boolean;
  filters?: VehicleFilters;
  /** Maximum number of vehicles to fetch (default: 100, use 0 or high number for all) */
  limit?: number;
}

export function useVehicles(options: UseVehiclesOptions = {}): UseVehiclesReturn {
  // Default to using cache (noCache = false) - only fetch fresh data when explicitly requested
  const { noCache = false, filters, limit: customLimit } = options;
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [meta, setMeta] = useState<VehicleMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  
  // Use ref to track retry attempts without triggering re-renders
  const retryCountRef = useRef(0);
  
  // Use ref for debounce timeout
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchVehicles = useCallback(async (currentFilters?: VehicleFilters) => {
    setLoading(true);
    setError(null);
    
    // Set filtering state if filters are active
    const hasActiveFilters = currentFilters && Object.keys(currentFilters).length > 0;
    setIsFiltering(!!hasActiveFilters);
    
    // Reset retry count on new fetch attempt
    retryCountRef.current = 0;
    
    const attemptFetch = async (): Promise<{ data: Vehicle[]; meta?: VehicleMeta | null }> => {
      try {
        // Check if cache is stale - if so, force noCache to true
        const cacheIsStale = isCacheStale();
        const effectiveNoCache = noCache || cacheIsStale;
        
        if (cacheIsStale && process.env.NODE_ENV === 'development') {
          console.log('[useVehicles] Cache is stale, forcing fresh data fetch');
        }
        
        const useLiteMode = isIOSSafariBrowser();
        // Use custom limit if provided, otherwise use default/lite mode limits
        const maxRows = customLimit || (useLiteMode ? 250 : undefined);
        const result = await vehicleApi.getVehicles(
          effectiveNoCache,
          {
            lite: useLiteMode,
            maxRows: maxRows,
            filters: currentFilters,
          }
        );
        
        // Validate that we actually got data
        if (!result.data || !Array.isArray(result.data)) {
          throw new Error("Invalid response: expected array of vehicles");
        }
        
        return result;
        
      } catch (err) {
        // Check if we should retry
        const isRetryable = isNetworkError(err) || 
          (err instanceof Error && err.name === 'AbortError') ||
          (isApiError(err) && err.status >= 500);
        
        const isLastAttempt = retryCountRef.current >= MAX_RETRIES;
        
        if (isRetryable && !isLastAttempt) {
          retryCountRef.current++;
          
          // Calculate delay with exponential backoff
          const backoffDelay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current - 1),
            MAX_RETRY_DELAY
          );
          
          console.log(`[useVehicles] Retry ${retryCountRef.current}/${MAX_RETRIES} after ${backoffDelay}ms`);
          await delay(backoffDelay);
          
          // Retry
          return attemptFetch();
        }
        
        // Not retryable or max retries reached - throw the error
        throw err;
      }
    };
    
    try {
      const result = await attemptFetch();
      
      setVehicles(result.data);
      // Ensure meta.total represents the FULL dataset count, not max ID
      setMeta(result.meta || null);
      setLastSyncTime(new Date());
      
      // Clear any previous error on success
      setError(null);
      
      // Reset retry count on success
      retryCountRef.current = 0;
      
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
      
      // Add retry context for timeout errors
      if (isNetworkError(err) && retryCountRef.current > 0) {
        errorMessage = `${errorMessage}\n\n(Tried ${retryCountRef.current} times)`;
      }
      
      setError(errorMessage);

      // In development, log the full error details
      if (process.env.NODE_ENV === 'development') {
        console.error('[useVehicles] Error fetching vehicles after retries:', err);
        
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
      setIsFiltering(false);
    }
  }, [noCache, customLimit]);

  // Check cache on mount - only clear if truly expired (5+ minutes old)
  // This prevents the cache-invalidation-storm while ensuring data freshness
  useEffect(() => {
    console.log('[useVehicles] Component mounted, checking cache...');
    const cacheAge = getCacheAge();
    if (cacheAge !== null) {
      console.log(`[useVehicles] Current cache age: ${cacheAge}ms`);
      
      // Only clear cache if it's truly expired (older than 5 minutes)
      // This prevents aggressive cache clearing on every mount
      const FIVE_MINUTES = 5 * 60 * 1000;
      if (cacheAge > FIVE_MINUTES) {
        console.log(`[useVehicles] Cache is ${Math.round(cacheAge / 1000)}s old (expired), clearing...`);
        clearAllVehicleCache();
      } else {
        console.log(`[useVehicles] Cache is fresh (${Math.round(cacheAge / 1000)}s), keeping...`);
      }
    }
  }, []);

  // Initial fetch and refetch when filters change (with debounce)
  useEffect(() => {
    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Determine debounce delay based on filter type
    // Search queries get longer debounce (500ms) to avoid excessive API calls while typing
    // Other filter changes get shorter debounce (150ms) for responsiveness
    const hasSearchQuery = filters?.search && filters.search.trim().length > 0;
    const debounceMs = hasSearchQuery ? SEARCH_DEBOUNCE_MS : FILTER_DEBOUNCE_MS;
    
    debounceTimeoutRef.current = setTimeout(() => {
      fetchVehicles(filters);
    }, debounceMs);
    
    // Cleanup timeout on unmount or filter change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [fetchVehicles, filters]);

  // Listen for cache updates from other components (e.g., after adding a vehicle)
  useEffect(() => {
    const unsubscribe = onVehicleCacheUpdate(() => {
      // Refetch when cache is updated by another component
      fetchVehicles(filters);
    });
    return unsubscribe;
  }, [fetchVehicles, filters]);

  return {
    vehicles,
    meta,
    loading,
    error,
    refetch: () => fetchVehicles(filters),
    lastSyncTime,
    isFiltering,
  };
}
