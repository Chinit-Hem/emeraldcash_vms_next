"use client";

import type { User, VehicleMeta } from "@/lib/types";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMounted } from "@/lib/useMounted";

function normalizeCategory(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

// Icon Components with consistent styling
function IconVehicles() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ec-sidebar-icon"
      aria-hidden="true"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ec-sidebar-icon"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function IconCar() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ec-sidebar-icon"
      aria-hidden="true"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconMotorcycle() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ec-sidebar-icon"
      aria-hidden="true"
    >
      <circle cx="5.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <path d="M7 17h7l3-6H8.5" />
      <path d="M14 11l2 6" />
      <path d="M10 11l2-3h3" />
    </svg>
  );
}

function IconTukTuk() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ec-sidebar-icon"
      aria-hidden="true"
    >
      <path d="M4 16v-3a2 2 0 0 1 2-2h8l3 3v3" />
      <path d="M14 13V9a2 2 0 0 1 2-2h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconAdd() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ec-sidebar-icon"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ec-sidebar-icon"
      aria-hidden="true"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconLms() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ec-sidebar-icon"
      aria-hidden="true"
    >
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
      <path d="M8 4v16" />
      <path d="M12 8h6" />
      <path d="M12 12h6" />
      <path d="M12 16h4" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ec-sidebar-chevron ${open ? "ec-sidebar-chevron-open" : ""}`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface SidebarProps {
  user: User;
  onNavigate?: () => void;
}

const SIDEBAR_LABELS = {
  brand: "Emerald Cash",
  badge: "VMS PRO",
  sectionOverview: "OVERVIEW",
  dashboard: "Dashboard",
  sectionFilters: "QUICK FILTERS",
  vehicleFilters: "Vehicle Filters",
  allVehicles: "All Vehicles",
  cars: "Cars",
  motorcycles: "Motorcycles",
  tukTuks: "TukTuks",
  addVehicle: "Add Vehicle",
  lms: "LMS",
  adminLms: "Admin LMS",
  settings: "Settings",
} as const;

// Navigation Item Component - Premium glass pill
function NavItem({
  href,
  icon: Icon,
  label,
  active,
  onClick,
  subItem = false,
  count,
}: {
  href: string;
  icon: () => React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  subItem?: boolean;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`ec-sidebar-item ${active ? "ec-sidebar-item-active" : ""} ${
        subItem ? "ec-sidebar-sub-item" : ""
      }`}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <Icon />
      <span className="truncate flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto rounded-full border border-[var(--glass-border-strong)] bg-[var(--accent-green-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent-green)]">
          {count}
        </span>
      )}
    </button>
  );
}

// Section Header Component - Clean uppercase labels
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="ec-sidebar-section">
      <span>{title}</span>
    </div>
  );
}

// Collapsible Section Component - Instant accordion (no transition delay)
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  active = false,
}: {
  title: string;
  icon: () => React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  active?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`ec-sidebar-item ${active ? "ec-sidebar-item-active" : ""}`}
        aria-expanded={isOpen}
        aria-controls={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <Icon />
        <span className="truncate flex-1 text-left">{title}</span>
        <IconChevron open={isOpen} />
      </button>
      <div
        id={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
        className={`mt-1 space-y-1 overflow-hidden ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 hidden"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// Main routes to prefetch for instant navigation
const MAIN_ROUTES = [
  "/",
  "/lms",
  "/vehicles",
  "/vehicles?category=Cars",
  "/vehicles?category=Motorcycles",
  "/vehicles?category=Tuk+Tuk",
  "/settings",
  "/admin/lms",
  "/vehicles/add",
];

export default function Sidebar({ user, onNavigate }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [meta, setMeta] = useState<VehicleMeta | null>(null);
  const isMounted = useMounted();

  // Prefetch all main routes on mount for instant navigation
  useEffect(() => {
    if (!isMounted) return;
    
    // Prefetch routes in the background
    MAIN_ROUTES.forEach((route) => {
      router.prefetch(route);
    });
  }, [router, isMounted]);

  // Fetch meta data for category counts (client-side only)
  useEffect(() => {
    if (!isMounted) return;
    
    async function fetchMeta() {
      try {
        // Check cache version first
        const cacheVersion = localStorage.getItem("vms-vehicles-version");
        if (cacheVersion === "3") {
          const cachedMeta = localStorage.getItem("vms-vehicles-meta");
          if (cachedMeta) {
            setMeta(JSON.parse(cachedMeta));
            return;
          }
        }
        
        // Fetch fresh data if no valid cache
        const res = await fetch("/api/vehicles?noCache=1", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.meta) {
            setMeta(data.meta);
            // Save to localStorage
            localStorage.setItem("vms-vehicles-meta", JSON.stringify(data.meta));
            localStorage.setItem("vms-vehicles-version", "2");
          }
        }
      } catch (err) {
        console.error("[Sidebar] Failed to fetch meta:", err);
      }
    }
    
    fetchMeta();
    
    // Listen for storage changes (when Dashboard updates cache)
    const handleStorageChange = () => {
      const cachedMeta = localStorage.getItem("vms-vehicles-meta");
      if (cachedMeta) {
        setMeta(JSON.parse(cachedMeta));
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isMounted]);

  const isAdmin = user.role === "Admin";

  const activeCategory = pathname === "/vehicles" ? searchParams?.get("category") || "" : "";

  // Route active states
  const isDashboardActive = pathname === "/" || pathname === "/dashboard";
  const isVehiclesSectionActive = pathname.startsWith("/vehicles");
  const isAllVehiclesActive = pathname === "/vehicles" && !activeCategory;
  const isCarsActive = pathname === "/vehicles" && normalizeCategory(activeCategory) === "cars";
  const isMotorcyclesActive = pathname === "/vehicles" && normalizeCategory(activeCategory) === "motorcycles";
  const isTukTuksActive = pathname === "/vehicles" && normalizeCategory(activeCategory) === "tuk tuk";
  const isAddActive = pathname === "/vehicles/add";
  const isLmsActive = pathname.startsWith("/lms");
  const isAdminLmsActive = pathname.startsWith("/admin/lms");
  const isSettingsActive = pathname === "/settings";

  // Optimized navigation handler - immediate execution
  const handleNavigate = (href: string) => {
    // Close sidebar immediately if callback provided
    onNavigate?.();
    // Navigate immediately without deferral
    router.push(href);
  };

  // Get counts from meta
  const allVehiclesCount = meta?.total ?? 0;
  const carsCount = meta?.countsByCategory?.Cars ?? 0;
  const motorcyclesCount = meta?.countsByCategory?.Motorcycles ?? 0;
  const tukTuksCount = meta?.countsByCategory?.TukTuks ?? 0;

  return (
    <aside className="ec-sidebar w-[280px] h-screen overflow-y-auto flex flex-col print:hidden relative z-[50]">
      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" />

      {/* Header - Premium brand lockup */}
      <div className="relative border-b border-[var(--glass-border)] p-6">
        <div className="flex items-center gap-4">
          <div
            className="relative w-12 h-12 flex items-center justify-center flex-shrink-0 overflow-hidden"
          >
            <Image
              src="/logo.png"
              alt="Emerald Cash"
              width={44}
              height={44}
              className="w-11 h-11 object-contain"
              priority
            />
          </div>
          <div className="min-w-0 flex flex-col">
            <h1 className="text-lg font-bold tracking-tight leading-tight text-[var(--text-primary)]">
              {SIDEBAR_LABELS.brand}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="ec-sidebar-badge">{SIDEBAR_LABELS.badge}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 p-4 space-y-1" aria-label="Main navigation">
        {/* Main */}
        <SectionHeader title={SIDEBAR_LABELS.sectionOverview} />
        <NavItem
          href="/"
          icon={IconDashboard}
          label={SIDEBAR_LABELS.dashboard}
          active={isDashboardActive}
          onClick={() => handleNavigate("/")}
        />
        <NavItem
          href="/lms"
          icon={IconLms}
          label={SIDEBAR_LABELS.lms}
          active={isLmsActive}
          onClick={() => handleNavigate("/lms")}
        />
        {isAdmin && (
          <NavItem
            href="/admin/lms"
            icon={IconLms}
            label={SIDEBAR_LABELS.adminLms}
            active={isAdminLmsActive}
            onClick={() => handleNavigate("/admin/lms")}
          />
        )}

        {/* Quick filters and deep links */}
        <SectionHeader title={SIDEBAR_LABELS.sectionFilters} />
        <CollapsibleSection
          title={SIDEBAR_LABELS.vehicleFilters}
          icon={IconVehicles}
          defaultOpen={isVehiclesSectionActive}
          active={isAllVehiclesActive}
        >
          <NavItem
            href="/vehicles"
            icon={IconVehicles}
            label={SIDEBAR_LABELS.allVehicles}
            active={isAllVehiclesActive}
            onClick={() => handleNavigate("/vehicles")}
            subItem
            count={allVehiclesCount}
          />
          <NavItem
            href="/vehicles?category=Cars"
            icon={IconCar}
            label={SIDEBAR_LABELS.cars}
            active={isCarsActive}
            onClick={() => handleNavigate("/vehicles?category=Cars")}
            subItem
            count={carsCount}
          />
          <NavItem
            href="/vehicles?category=Motorcycles"
            icon={IconMotorcycle}
            label={SIDEBAR_LABELS.motorcycles}
            active={isMotorcyclesActive}
            onClick={() => handleNavigate("/vehicles?category=Motorcycles")}
            subItem
            count={motorcyclesCount}
          />
          <NavItem
            href="/vehicles?category=Tuk+Tuk"
            icon={IconTukTuk}
            label={SIDEBAR_LABELS.tukTuks}
            active={isTukTuksActive}
            onClick={() => handleNavigate("/vehicles?category=Tuk+Tuk")}
            subItem
            count={tukTuksCount}
          />
          {isAdmin && (
            <NavItem
              href="/vehicles/add"
              icon={IconAdd}
              label={SIDEBAR_LABELS.addVehicle}
              active={isAddActive}
              onClick={() => handleNavigate("/vehicles/add")}
              subItem
            />
          )}
        </CollapsibleSection>

        <NavItem
          href="/settings"
          icon={IconSettings}
          label={SIDEBAR_LABELS.settings}
          active={isSettingsActive}
          onClick={() => handleNavigate("/settings")}
        />
      </nav>

      {/* Footer - Subtle copyright */}
      <div className="relative border-t border-[var(--glass-border)] p-4">
        <p className="text-center text-xs font-medium text-[var(--text-secondary)]">
          © 2025 Emerald Cash
        </p>
      </div>

    </aside>
  );
}
