"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ResolvedTheme = "light" | "dark";
export type ThemeMode = ResolvedTheme | "system";

const THEME_MODE_KEY = "vms.theme-mode";
const LEGACY_THEME_KEYS = ["theme", "vms.theme"] as const;
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function isResolvedTheme(value: unknown): value is ResolvedTheme {
  return value === "light" || value === "dark";
}

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.(SYSTEM_THEME_QUERY).matches ?? false;
}

function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return mode;
}

function readStoredThemeMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(THEME_MODE_KEY);
    if (isThemeMode(stored)) {
      return stored;
    }

    for (const legacyKey of LEGACY_THEME_KEYS) {
      const legacy = localStorage.getItem(legacyKey);
      if (isResolvedTheme(legacy)) {
        return legacy;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function persistThemeMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(THEME_MODE_KEY, mode);

    if (mode === "system") {
      for (const legacyKey of LEGACY_THEME_KEYS) {
        localStorage.removeItem(legacyKey);
      }
      return;
    }

    for (const legacyKey of LEGACY_THEME_KEYS) {
      localStorage.setItem(legacyKey, mode);
    }
  } catch {
    // Ignore storage exceptions (private mode / storage quotas).
  }
}

function applyTheme(resolvedTheme: ResolvedTheme, mode: ThemeMode): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.dataset.theme = resolvedTheme;
  root.dataset.themeMode = mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof document !== "undefined") {
      const modeFromDataset = document.documentElement.dataset.themeMode;
      if (isThemeMode(modeFromDataset)) {
        return modeFromDataset;
      }
    }

    if (typeof window === "undefined") {
      return "system";
    }

    return readStoredThemeMode() ?? "system";
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => getSystemPrefersDark());

  const resolvedTheme = useMemo(
    () => resolveTheme(mode, systemPrefersDark),
    [mode, systemPrefersDark]
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(SYSTEM_THEME_QUERY);
    if (!mediaQuery) return;

    const onMediaQueryChange = () => {
      setSystemPrefersDark(mediaQuery.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onMediaQueryChange);
      return () => mediaQuery.removeEventListener("change", onMediaQueryChange);
    }

    mediaQuery.addListener(onMediaQueryChange);
    return () => mediaQuery.removeListener(onMediaQueryChange);
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme, mode);
  }, [resolvedTheme, mode]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      const key = event.key;
      if (!key) return;

      if (key !== THEME_MODE_KEY && !LEGACY_THEME_KEYS.includes(key as (typeof LEGACY_THEME_KEYS)[number])) {
        return;
      }

      setMode(readStoredThemeMode() ?? "system");
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode);
    persistThemeMode(nextMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setThemeMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setThemeMode,
      setTheme: setThemeMode,
      toggleTheme,
    }),
    [mode, resolvedTheme, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
