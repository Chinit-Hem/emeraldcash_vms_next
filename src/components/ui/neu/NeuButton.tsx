/**
 * Neumorphism Button Component
 * 
 * Button component following Neumorphism (Soft UI) design principles:
 * - Soft convex shadows for default state
 * - Inset shadows for pressed/hover state
 * - Consistent color schemes
 * 
 * @module ui/NeuButton
 */

"use client";

import React from "react";
import { cn } from "@/lib/ui";

// ============================================================================
// Types & Interfaces (OOAD: Abstraction)
// ============================================================================

interface NeuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

// ============================================================================
// Base Button Component (OOAD: Encapsulation)
// ============================================================================

export function NeuButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...props
}: NeuButtonProps) {
  // Size definitions
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-sm",
    lg: "h-12 px-8 text-base",
  };

  // Neumorphism shadow styles for each variant
  const variants = {
    primary: cn(
      "bg-[#e0e5ec] text-slate-600",
      "shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff]",
      "hover:text-emerald-600",
      "hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]",
      "active:shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]"
    ),
    secondary: cn(
      "bg-[#e0e5ec] text-slate-600",
      "shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff]",
      "hover:text-slate-800",
      "hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]",
      "active:shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]"
    ),
    danger: cn(
      "bg-[#e0e5ec] text-slate-600",
      "shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff]",
      "hover:text-red-500",
      "hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]",
      "active:shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]"
    ),
    ghost: cn(
      "bg-[#e0e5ec] text-slate-600",
      "shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]",
      "hover:text-slate-800",
      "hover:shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]",
      "w-11 h-11 p-0 rounded-full"
    ),
    outline: cn(
      "bg-[#e0e5ec] text-slate-600",
      "shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff]",
      "hover:text-slate-800",
      "hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]",
      "active:shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]"
    ),
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none",
        "hover:scale-[0.98] active:scale-95",
        sizes[size],
        variants[variant],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ============================================================================
// Icon Button Variant (OOAD: Polymorphism)
// ============================================================================

export function NeuIconButton({
  icon,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  icon: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeClasses = {
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-12 h-12",
  };

  return (
    <NeuButton
      variant={variant}
      size={size}
      className={cn(sizeClasses[size], "p-0 rounded-full", className)}
      {...props}
    >
      {icon}
    </NeuButton>
  );
}
