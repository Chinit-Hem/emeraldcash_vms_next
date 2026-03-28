/**
 * Neumorphism Card Component
 * 
 * Base card component following Neumorphism (Soft UI) design principles:
 * - Soft shadows (both light and dark)
 * - Subtle gradients
 * - Inset/pressed states
 * 
 * @module ui/NeuCard
 */

"use client";

import React from "react";
import { cn } from "@/lib/ui";

// ============================================================================
// Types & Interfaces (OOAD: Abstraction)
// ============================================================================

interface NeuCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "flat" | "pressed" | "convex";
  size?: "sm" | "md" | "lg";
  hover?: boolean;
  onClick?: () => void;
}

interface NeuCardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

interface NeuCardSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  divider?: boolean;
}

// ============================================================================
// Base Card Component (OOAD: Encapsulation)
// ============================================================================

export function NeuCard({
  children,
  className = "",
  variant = "flat",
  size = "md",
  hover = false,
  onClick,
}: NeuCardProps) {
  // Neumorphism shadow definitions
  const shadows = {
    flat: "bg-[#e0e5ec] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff]",
    pressed: "bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]",
    convex: "bg-[#e0e5ec] shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]",
  };

  const sizes = {
    sm: "p-4 rounded-xl",
    md: "p-6 rounded-2xl",
    lg: "p-8 rounded-3xl",
  };

  const hoverStyles = hover
    ? "cursor-pointer hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] hover:scale-[0.99] active:scale-95 transition-all duration-200"
    : "";

  return (
    <div
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        shadows[variant],
        sizes[size],
        hoverStyles,
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ============================================================================
// Card Header Component (OOAD: Composition)
// ============================================================================

export function NeuCardHeader({
  title,
  subtitle,
  icon,
  action,
  className = "",
}: NeuCardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-6", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] flex items-center justify-center text-slate-600">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ============================================================================
// Card Section Component (OOAD: Composition)
// ============================================================================

export function NeuCardSection({
  children,
  className = "",
  title,
  divider = false,
}: NeuCardSectionProps) {
  return (
    <div className={cn("space-y-4", divider && "pt-4 border-t border-slate-200/50", className)}>
      {title && (
        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// Specialized Card Variants (OOAD: Inheritance/Polymorphism)
// ============================================================================

export function NeuStatCard({
  title,
  value,
  subtitle,
  icon,
  color = "emerald",
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "emerald" | "blue" | "purple" | "orange" | "red";
  className?: string;
}) {
  const colorStyles = {
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    red: "text-red-600",
  };

  return (
    <NeuCard className={className} hover>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={cn("w-12 h-12 rounded-xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] flex items-center justify-center", colorStyles[color])}>
          {icon}
        </div>
      </div>
    </NeuCard>
  );
}

export function NeuCategoryCard({
  name,
  description,
  icon,
  count,
  completionRate,
  color = "emerald",
  onClick,
  isComplete,
}: {
  name: string;
  description?: string;
  icon: React.ReactNode;
  count: number;
  completionRate: number;
  color?: "emerald" | "blue" | "purple" | "orange";
  onClick: () => void;
  isComplete?: boolean;
}) {
  const colorStyles = {
    emerald: "text-emerald-600 bg-emerald-50",
    blue: "text-blue-600 bg-blue-50",
    purple: "text-purple-600 bg-purple-50",
    orange: "text-orange-600 bg-orange-50",
  };

  return (
    <NeuCard hover onClick={onClick} className={isComplete ? "ring-2 ring-emerald-500/50" : ""}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorStyles[color])}>
          {icon}
        </div>
        {isComplete ? (
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-slate-300" />
          </div>
        )}
      </div>
      
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{name}</h3>
      <p className="text-sm text-slate-500 mb-4 line-clamp-2">{description}</p>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{count} lessons</span>
          <span className={cn("font-medium", completionRate >= 50 ? colorStyles[color].split(" ")[0] : "text-slate-500")}>
            {completionRate}%
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", colorStyles[color].split(" ")[0].replace("text-", "bg-"))}
            style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
          />
        </div>
      </div>
    </NeuCard>
  );
}

// ============================================================================
// NeuButton Component (OOAD: Reusable Action Component)
// ============================================================================

interface NeuButtonProps {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function NeuButton({
  children,
  type = "button",
  variant = "primary",
  onClick,
  disabled = false,
  isLoading = false,
  className = "",
}: NeuButtonProps) {
  const baseStyles = "px-6 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center";
  
  const variants = {
    primary: cn(
      baseStyles,
      "bg-[#e0e5ec] text-emerald-600",
      "shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]",
      "hover:shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]",
      "active:scale-95",
      disabled && "opacity-50 cursor-not-allowed shadow-none"
    ),
    secondary: cn(
      baseStyles,
      "bg-[#e0e5ec] text-slate-600",
      "shadow-[3px_3px_6px_#bebebe,-3px_-3px_6px_#ffffff]",
      "hover:shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]",
      "active:scale-95",
      disabled && "opacity-50 cursor-not-allowed shadow-none"
    ),
    danger: cn(
      baseStyles,
      "bg-[#e0e5ec] text-red-600",
      "shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]",
      "hover:shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]",
      "active:scale-95",
      disabled && "opacity-50 cursor-not-allowed shadow-none"
    ),
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(variants[variant], className)}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
