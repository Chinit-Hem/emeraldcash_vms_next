/**
 * GlassButton Component - Glassmorphism Button
 * 
 * A reusable button component with glassmorphism effect
 * 
 * @module components/ui/GlassButton
 */

import React from "react";

interface GlassButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

export function GlassButton({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  type = "button",
  className = "",
}: GlassButtonProps) {
  const variantStyles = {
    primary: `
      bg-emerald-500/90 dark:bg-emerald-600/90
      text-white
      hover:bg-emerald-600/90 dark:hover:bg-emerald-700/90
      shadow-[0_4px_16px_rgba(16,185,129,0.3)]
    `,
    secondary: `
      bg-white/80 dark:bg-gray-700/80
      text-gray-700 dark:text-gray-200
      hover:bg-white/90 dark:hover:bg-gray-600/90
      border border-gray-200/50 dark:border-gray-600/50
      shadow-[0_4px_16px_rgba(0,0,0,0.05)]
    `,
    danger: `
      bg-red-500/90 dark:bg-red-600/90
      text-white
      hover:bg-red-600/90 dark:hover:bg-red-700/90
      shadow-[0_4px_16px_rgba(239,68,68,0.3)]
    `,
    outline: `
      bg-transparent
      text-gray-700 dark:text-gray-200
      hover:bg-gray-100/50 dark:hover:bg-gray-700/50
      border border-gray-300 dark:border-gray-600
    `,
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        font-medium
        rounded-xl
        backdrop-blur-sm
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.98]
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
