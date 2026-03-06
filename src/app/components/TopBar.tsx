"use client";

import type { User } from "@/lib/types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

import ThemeToggle from "@/app/components/ThemeToggle";
import { GlassButton } from "@/app/components/ui/GlassButton";

type TopBarProps = {
  user: User;
  onMenuClick: () => void;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
};

export default function TopBar({
  user,
  onMenuClick,
  title,
  showBack,
  onBack,
}: TopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-[200] ec-glassPanel ec-theme-overlay-host border-b border-black/5 dark:border-white/5 print:hidden">
      <div className="h-14 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {showBack ? (
            <GlassButton
              type="button"
              onClick={handleBack}
              variant="ghost"
              className="!p-2 !w-auto !h-auto"
              aria-label="Go back"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-gray-800 dark:text-gray-200"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </GlassButton>
          ) : (
            <GlassButton
              type="button"
              onClick={onMenuClick}
              variant="ghost"
              className="lg:hidden !p-2 !w-auto !h-auto"
              aria-label="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-gray-800 dark:text-gray-200"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </GlassButton>
          )}

          {title && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          {!title && (
            <>
              <div className="relative h-8 w-8 overflow-hidden flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Emerald Cash"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                  priority
                />
              </div>
              <div className="min-w-0 hidden sm:block">
                <div className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                  Emerald Cash
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">VMS</div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:block text-xs text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
            {user.role}: {user.username}
          </div>
          <ThemeToggle className="hidden sm:inline-flex p-2 touch-target" />
        </div>
      </div>
    </header>
  );
}
