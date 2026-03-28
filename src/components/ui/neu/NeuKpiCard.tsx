/**
 * NeuKpiCard Component - Premium Professional Neumorphism Design
 * 
 * A stunning, professional Neumorphism (Soft UI) statistics card component.
 * Features refined soft shadows, category-specific icons, smooth interactions,
 * advanced visual effects, and premium aesthetics for an exceptional user experience.
 * 
 * @module ui/neu/NeuKpiCard
 */

"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/ui";

// ============================================================================
// Types & Interfaces
// ============================================================================

type CategoryType = "total" | "cars" | "motorcycles" | "tuktuks" | "price";

interface NeuKpiCardProps {
  /** Card category determining icon and color scheme */
  category: CategoryType;
  /** Label text displayed above value */
  label: string;
  /** Main value to display (formatted string) */
  value: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether the card is in an active/selected state */
  isActive?: boolean;
  /** Optional trend indicator (positive/negative) */
  trend?: "up" | "down" | "neutral";
  /** Optional trend value */
  trendValue?: string;
}

// ============================================================================
// Icon Components - Enhanced with refined strokes
// ============================================================================

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const TotalIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

const CarIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
    <circle cx="6.5" cy="16.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
);

const MotorcycleIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="18.5" cy="17.5" r="3.5" />
    <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 2h2" />
    <path d="M8 14v4" />
    <path d="M16 14h.01" />
  </svg>
);

const TukTukIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 16v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
    <circle cx="6.5" cy="18.5" r="2.5" />
    <circle cx="17.5" cy="18.5" r="2.5" />
    <path d="M4 14h2a2 2 0 0 1 2 2v2" />
    <path d="M16 14h2a2 2 0 0 1 2 2v2" />
    <path d="M12 14v-4" />
    <path d="M8 10h8" />
    <path d="M12 6v4" />
  </svg>
);

const PriceIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    <path d="M12 18V6" />
  </svg>
);

const TrendUpIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17l5-5 5 5M12 12V3" />
  </svg>
);

const TrendDownIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7l5 5 5-5M12 12v9" />
  </svg>
);

// ============================================================================
// Category Configuration - Premium Color Palette
// ============================================================================

const categoryConfig: Record<CategoryType, {
  icon: React.FC<IconProps>;
  color: string;
  colorLight: string;
  colorDark: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  label: string;
}> = {
  total: {
    icon: TotalIcon,
    color: "#10b981",
    colorLight: "#34d399",
    colorDark: "#059669",
    gradientFrom: "#34d399",
    gradientTo: "#059669",
    glowColor: "rgba(16, 185, 129, 0.3)",
    label: "Total Vehicles",
  },
  cars: {
    icon: CarIcon,
    color: "#3b82f6",
    colorLight: "#60a5fa",
    colorDark: "#2563eb",
    gradientFrom: "#60a5fa",
    gradientTo: "#2563eb",
    glowColor: "rgba(59, 130, 246, 0.3)",
    label: "Cars",
  },
  motorcycles: {
    icon: MotorcycleIcon,
    color: "#8b5cf6",
    colorLight: "#a78bfa",
    colorDark: "#7c3aed",
    gradientFrom: "#a78bfa",
    gradientTo: "#7c3aed",
    glowColor: "rgba(139, 92, 246, 0.3)",
    label: "Motorcycles",
  },
  tuktuks: {
    icon: TukTukIcon,
    color: "#f59e0b",
    colorLight: "#fbbf24",
    colorDark: "#d97706",
    gradientFrom: "#fbbf24",
    gradientTo: "#d97706",
    glowColor: "rgba(245, 158, 11, 0.3)",
    label: "Tuk Tuks",
  },
  price: {
    icon: PriceIcon,
    color: "#06b6d4",
    colorLight: "#22d3ee",
    colorDark: "#0891b2",
    gradientFrom: "#22d3ee",
    gradientTo: "#0891b2",
    glowColor: "rgba(6, 182, 212, 0.3)",
    label: "Avg Price",
  },
};

// ============================================================================
// Main Component - Premium Professional Design
// ============================================================================

export function NeuKpiCard({
  category,
  label,
  value,
  subtitle,
  onClick,
  className,
  isActive = false,
  trend,
  trendValue,
}: NeuKpiCardProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseDown = useCallback(() => setIsPressed(true), []);
  const handleMouseUp = useCallback(() => setIsPressed(false), []);
  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
    setIsHovered(false);
  }, []);
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);

  return (
    <div
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        // Base styles - Premium foundation
        "relative overflow-hidden",
        "p-5 sm:p-6 rounded-[20px]",
        "bg-[#e8ecf1]",
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        
        // Advanced Neumorphism shadows - Multi-layer depth
        !isActive && !isPressed && "shadow-[8px_8px_16px_#a3b1c6,-8px_-8px_16px_#ffffff] hover:shadow-[12px_12px_24px_#a3b1c6,-12px_-12px_24px_#ffffff]",
        
        // Active/pressed state - Inset depth
        (isActive || isPressed) && "shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff] translate-y-[1px]",
        
        // Hover lift effect
        onClick && !isActive && !isPressed && "hover:-translate-y-[2px]",
        
        // Cursor
        onClick ? "cursor-pointer" : "cursor-default",
        
        // Focus ring for accessibility
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2",
        
        className
      )}
    >
      {/* Premium gradient background - Animated on hover */}
      <div 
        className={cn(
          "absolute inset-0 rounded-[20px] transition-all duration-500",
          isHovered && onClick ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: `radial-gradient(circle at 30% 30%, ${config.glowColor} 0%, transparent 70%)`
        }}
      />
      
      {/* Subtle ambient glow */}
      <div 
        className="absolute inset-0 rounded-[20px] pointer-events-none transition-opacity duration-300"
        style={{
          background: `linear-gradient(145deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 50%, rgba(163,177,198,0.05) 100%)`,
          opacity: isActive ? 0.6 : 0.4
        }}
      />
      
      {/* Top accent line - Premium gradient */}
      <div 
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full transition-all duration-300"
        style={{ 
          background: `linear-gradient(90deg, transparent 0%, ${config.color} 20%, ${config.colorLight} 50%, ${config.color} 80%, transparent 100%)`,
          opacity: isActive ? 1 : 0.6,
          boxShadow: isActive ? `0 0 8px ${config.glowColor}` : 'none'
        }}
      />
      
      {/* Content container - Premium spacing */}
      <div className="relative z-10">
        {/* Header row - Icon, Label, and Trend */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon container - Premium neumorphism */}
          <div
            className={cn(
              "flex items-center justify-center",
              "w-11 h-11 rounded-[14px]",
              "bg-[#e8ecf1]",
              "transition-all duration-300 ease-out",
              (isActive || isPressed)
                ? "shadow-[inset_3px_3px_6px_#a3b1c6,inset_-3px_-3px_6px_#ffffff] scale-[0.96]" 
                : "shadow-[3px_3px_6px_#a3b1c6,-3px_-3px_6px_#ffffff]"
            )}
          >
            <Icon 
              className="w-5 h-5 transition-all duration-300"
              style={{ 
                color: config.color,
                filter: isActive ? `drop-shadow(0 0 4px ${config.glowColor})` : 'none'
              }}
            />
          </div>
          
          {/* Trend indicator */}
          {trend && trend !== "neutral" && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold",
              "transition-all duration-300",
              trend === "up" 
                ? "text-emerald-600 bg-emerald-50 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]" 
                : "text-red-600 bg-red-50 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]"
            )}>
              {trend === "up" ? (
                <TrendUpIcon className="w-3 h-3" />
              ) : (
                <TrendDownIcon className="w-3 h-3" />
              )}
              {trendValue}
            </div>
          )}
        </div>
        
        {/* Label - Premium typography */}
        <div className="mb-2">
          <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.12em]">
            {label}
          </span>
        </div>
        
        {/* Value - Premium display typography */}
        <div className="flex items-baseline gap-1">
          <span 
            className={cn(
              "text-2xl sm:text-3xl font-bold tabular-nums tracking-tight",
              "transition-all duration-300"
            )}
            style={{
              color: isActive ? config.colorDark : '#1e293b',
              textShadow: isActive ? `0 0 20px ${config.glowColor}` : 'none'
            }}
          >
            {value}
          </span>
        </div>
        
        {/* Subtitle with premium styling */}
        {subtitle && (
          <div className="mt-2 flex items-center gap-1.5">
            <div 
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: config.colorLight }}
            />
            <span className="text-[10px] text-[#94a3b8] font-medium tracking-wide">
              {subtitle}
            </span>
          </div>
        )}
      </div>
      
      {/* Bottom glow effect for active state */}
      {(isActive || isPressed) && (
        <div 
          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full blur-md transition-all duration-300"
          style={{ 
            backgroundColor: config.color,
            opacity: 0.5
          }}
        />
      )}
      
      {/* Corner accent - Premium detail */}
      <div 
        className="absolute top-4 right-4 w-2 h-2 rounded-full transition-all duration-300"
        style={{ 
          backgroundColor: isActive ? config.color : 'transparent',
          opacity: isActive ? 1 : 0,
          boxShadow: isActive ? `0 0 6px ${config.glowColor}` : 'none'
        }}
      />
    </div>
  );
}

// ============================================================================
// Export variants for convenience
// ============================================================================

export function NeuTotalCard(props: Omit<NeuKpiCardProps, "category">) {
  return <NeuKpiCard category="total" {...props} />;
}

export function NeuCarsCard(props: Omit<NeuKpiCardProps, "category">) {
  return <NeuKpiCard category="cars" {...props} />;
}

export function NeuMotorcyclesCard(props: Omit<NeuKpiCardProps, "category">) {
  return <NeuKpiCard category="motorcycles" {...props} />;
}

export function NeuTukTuksCard(props: Omit<NeuKpiCardProps, "category">) {
  return <NeuKpiCard category="tuktuks" {...props} />;
}

export function NeuPriceCard(props: Omit<NeuKpiCardProps, "category">) {
  return <NeuKpiCard category="price" {...props} />;
}
