/**
 * useHydrationSafe Hook
 * 
 * Prevents hydration mismatches by ensuring client-side only code runs after mount.
 * Essential for localStorage, window, and other browser-only APIs.
 * 
 * Features:
 * - Safe localStorage access with SSR compatibility
 * - Window/document access guards
 * - iPhone Safari crash prevention
 * - Mounted state tracking
 * 
 * @module useHydrationSafe
 */

import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Options for useHydrationSafe hook
 */
interface UseHydrationSafeOptions {
  /** Delay in ms before marking as mounted (useful for iOS Safari) */
  delayMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Return type for useHydrationSafe hook
 */
interface UseHydrationSafeReturn {
  /** True if component is mounted (safe to access browser APIs) */
  isMounted: boolean;
  /** True if running in browser environment */
  isBrowser: boolean;
  /** Safe localStorage getter */
  getItem: (key: string, defaultValue?: string) => string | null;
  /** Safe localStorage setter */
  setItem: (key: string, value: string) => boolean;
  /** Safe localStorage remover */
  removeItem: (key: string) => boolean;
  /** Safe window access */
  getWindow: () => Window | null;
  /** Safe document access */
  getDocument: () => Document | null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if running in browser environment
 */
function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Check if running on iOS Safari
 */
function isIOSSafari(): boolean {
  if (!isBrowserEnvironment()) return false;
  
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome|crios/.test(ua);
  
  return isIOS && isSafari;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * useHydrationSafe - Prevents hydration mismatches
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { isMounted, getItem, setItem } = useHydrationSafe();
 *   
 *   // Safe to use localStorage after mount
 *   useEffect(() => {
 *     if (isMounted) {
 *       const data = getItem("myKey");
 *       // ...
 *     }
 *   }, [isMounted]);
 *   
 *   // Or use directly with guard
 *   const data = isMounted ? getItem("myKey") : null;
 *   
 *   return <div>{data}</div>;
 * }
 * ```
 */
export function useHydrationSafe(options: UseHydrationSafeOptions = {}): UseHydrationSafeReturn {
  const { delayMs: _delayMs = 0, debug = false } = options;
  
  const [isMounted, setIsMounted] = useState(false);
  const [isBrowser] = useState(() => isBrowserEnvironment());

  // Set mounted state immediately - no delay
  useEffect(() => {
    if (!isBrowser) return;

    // Defer state update to avoid cascading render warning
    Promise.resolve().then(() => {
      setIsMounted(true);
      if (debug) {
        console.log("[useHydrationSafe] Component mounted, browser APIs now safe");
      }
    });

    return () => {
      setIsMounted(false);
    };
  }, [isBrowser, debug]);

  // Safe localStorage getter
  const getItem = useCallback((key: string, defaultValue?: string): string | null => {
    if (!isBrowser || !isMounted) {
      return defaultValue ?? null;
    }

    try {
      const item = localStorage.getItem(key);
      return item ?? defaultValue ?? null;
    } catch (error) {
      if (debug) {
        console.error(`[useHydrationSafe] Error getting item "${key}":`, error);
      }
      return defaultValue ?? null;
    }
  }, [isBrowser, isMounted, debug]);

  // Safe localStorage setter
  const setItem = useCallback((key: string, value: string): boolean => {
    if (!isBrowser || !isMounted) {
      return false;
    }

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (debug) {
        console.error(`[useHydrationSafe] Error setting item "${key}":`, error);
      }
      return false;
    }
  }, [isBrowser, isMounted, debug]);

  // Safe localStorage remover
  const removeItem = useCallback((key: string): boolean => {
    if (!isBrowser || !isMounted) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      if (debug) {
        console.error(`[useHydrationSafe] Error removing item "${key}":`, error);
      }
      return false;
    }
  }, [isBrowser, isMounted, debug]);

  // Safe window access
  const getWindow = useCallback((): Window | null => {
    return isBrowser && isMounted ? window : null;
  }, [isBrowser, isMounted]);

  // Safe document access
  const getDocument = useCallback((): Document | null => {
    return isBrowser && isMounted ? document : null;
  }, [isBrowser, isMounted]);

  return {
    isMounted,
    isBrowser,
    getItem,
    setItem,
    removeItem,
    getWindow,
    getDocument,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * useLocalStorage - Typed localStorage hook with hydration safety
 * 
 * Usage:
 * ```tsx
 * const [value, setValue, remove] = useLocalStorage("myKey", "defaultValue");
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseHydrationSafeOptions = {}
): [T, (value: T) => void, () => void] {
  const { isMounted, getItem, setItem, removeItem } = useHydrationSafe(options);
  
  // Parse stored value or use initial
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Update localStorage when value changes
  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      if (isMounted) {
        setItem(key, JSON.stringify(value));
      }
    } catch {
      // Error handling removed for production
    }
  }, [key, isMounted, setItem]);

  // Remove from localStorage
  const remove = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (isMounted) {
        removeItem(key);
      }
    } catch {
      // Error handling removed for production
    }
  }, [key, initialValue, isMounted, removeItem]);

  // Sync with localStorage on mount
  useEffect(() => {
    if (!isMounted) return;
    
    // Defer state update to avoid cascading render warning
    Promise.resolve().then(() => {
      try {
        const item = getItem(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item) as T);
        }
      } catch {
        // Ignore parse errors
      }
    });
  }, [isMounted, key, getItem]);

  return [storedValue, setValue, remove];
}

/**
 * useMounted - Simple mounted state hook
 * 
 * Usage:
 * ```tsx
 * const isMounted = useMounted();
 * if (!isMounted) return null; // or loading state
 * ```
 */
export function useMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Defer state update to avoid cascading render warning
    Promise.resolve().then(() => {
      setIsMounted(true);
    });
    return () => {
      setIsMounted(false);
    };
  }, []);

  return isMounted;
}

/**
 * useIsIOSSafari - Detect iOS Safari for performance optimizations
 */
export function useIsIOSSafari(): boolean {
  const [isIOSSafariState, setIsIOSSafariState] = useState(false);
  const isMounted = useMounted();

  useEffect(() => {
    if (!isMounted) return;
    
    // Defer state update to avoid cascading render warning
    Promise.resolve().then(() => {
      setIsIOSSafariState(isIOSSafari());
    });
  }, [isMounted]);

  return isIOSSafariState;
}

// ============================================================================
// Default Export
// ============================================================================

export default useHydrationSafe;
