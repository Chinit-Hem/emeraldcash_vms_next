/**
 * GlassCard Component - Glassmorphism Card
 * 
 * A reusable card component with glassmorphism effect
 * 
 * @module components/ui/GlassCard
 */

import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassCard({ children, className = "", onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white/80 dark:bg-gray-800/80 
        backdrop-blur-xl 
        border border-white/40 dark:border-gray-700/40 
        shadow-[0_8px_32px_rgba(0,0,0,0.08)] 
        rounded-2xl 
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
