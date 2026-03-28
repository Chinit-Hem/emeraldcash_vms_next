"use client";

import React from "react";
import { cn, ui } from "@/lib/ui";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "outlined";
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className = "",
  variant = "default",
  hover = false,
  onClick,
}: GlassCardProps) {
  const baseStyles = "relative overflow-hidden transition-all duration-300 ease-out";

  const variants: Record<NonNullable<GlassCardProps["variant"]>, string> = {
    default: ui.surface.card,
    elevated: cn(ui.surface.card, "shadow-[var(--ec-shadow-strong)]"),
    outlined: cn(ui.surface.cardSoft, "border-[var(--ec-glass-stroke-strong)]"),
  };

  const hoverStyles = hover
    ? "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--ec-glass-stroke-strong)]"
    : "";

  return (
    <div
      className={cn(baseStyles, variants[variant], hoverStyles, className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Compact card for mobile lists
export function GlassCardCompact({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl transition-all duration-200",
        ui.surface.cardSoft,
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
      onClick={onClick}
    >
      <div className="relative z-10 p-4">{children}</div>
    </div>
  );
}
