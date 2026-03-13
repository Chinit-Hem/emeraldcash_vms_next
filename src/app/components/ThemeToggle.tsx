"use client";

import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useTheme } from "@/lib/theme-provider";
import { cn, ui } from "@/lib/ui";

const themeOptions = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

/**
 * ThemeToggle Component
 * 
 * A dropdown theme selector that allows users to switch between
 * light, dark, and system theme modes.
 * 
 * Features:
 * - Accessible dropdown with keyboard navigation
 * - Visual indicators for active theme
 * - Smooth animations and transitions
 * - Responsive design (hides label on mobile)
 * 
 * @example
 * ```tsx
 * <ThemeToggle className="ml-auto" />
 * ```
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, resolvedTheme, setThemeMode } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const ActiveIcon = mode === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  const activeLabel = mode[0].toUpperCase() + mode.slice(1);

  return (
    <div ref={containerRef} className={cn("relative ec-theme-toggle", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(ui.button.base, ui.button.size.sm, ui.button.secondary, "h-10 min-w-[104px] px-3")}
        aria-label="Select theme"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ActiveIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{activeLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-[var(--text-secondary)] transition-transform duration-300", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme mode"
          className="absolute right-0 z-[9999] mt-2 w-44 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] p-1.5 shadow-[var(--shadow-elevated)] backdrop-blur-xl"
        >
          {themeOptions.map(({ value, label, Icon }) => {
            const selected = mode === value;

            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setThemeMode(value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-300 ease-in-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-green)]",
                  selected
                    ? "bg-[var(--accent-green-soft)] text-[var(--accent-green)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--glass-bg-soft)]"
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </span>
                {selected && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
