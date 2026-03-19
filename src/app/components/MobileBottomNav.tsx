"use client";

import { BookOpen, Car, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { isIOSSafariBrowser } from "@/lib/platform";
import { useMounted } from "@/lib/useMounted";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "LMS", href: "/lms", icon: BookOpen },
  { label: "Vehicles", href: "/vehicles", icon: Car },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const isIOSSafari = useMounted() && isIOSSafariBrowser();

  // Prefetch all navigation routes on mount for instant navigation
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // iOS-safe nav class
  const navClass = isIOSSafari
    ? "fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-lg"
    : "ec-mobileNav fixed inset-x-0 bottom-0 z-50";

  return (
    <nav
      className={navClass}
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around px-2 sm:h-[70px]">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch={true}
              className={`flex min-w-[84px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 ${
                active
                  ? "border border-[var(--glass-border-strong)] bg-[var(--accent-green-soft)] text-[var(--accent-green)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--accent-green)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.35 : 1.9} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
