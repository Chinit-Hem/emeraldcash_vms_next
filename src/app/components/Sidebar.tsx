"use client";

import type { User } from "@/lib/types";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { OptimizedLink } from "./OptimizedLink";
import { useVehicleStats } from "@/lib/useVehiclesNeon";

function normalizeCategory(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

// Helper to check if category is TukTuk (handles "Tuk Tuk", "TukTuk", "tuktuk", etc.)
function isTukTukCategory(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "tuk tuk" || normalized === "tuktuk" || normalized === "tuk-tuk" || normalized.includes("tuk");
}

// Icon Components
function IconDashboard() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconLms() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

function IconVehicles() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconCar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconMotorcycle() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16v-3a2 2 0 0 1 2-2h8l3 3v3" />
      <path d="M14 13V9a2 2 0 0 1 2-2h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconAdd() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  );
}

function IconFleet({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

interface SidebarProps {
  user: User;
  onNavigate?: () => void;
}

// NavItem component with clean Neumorphism and instant navigation
interface NavItemProps {
  icon: React.ComponentType<{className?: string}>;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  href: string;
}

function NavItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  count,
  href
}: NavItemProps) {
  return (
    <OptimizedLink
      href={href}
      onClick={onClick}
      className="flex items-center gap-4 w-full group"
      priority={active ? "high" : "normal"}
    >
      <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 ease-out ${
        active 
          ? "shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] text-[#2ecc71] scale-[0.98]" 
          : "shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] text-[#4a5568] hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] hover:text-[#2ecc71] hover:scale-[0.98] active:scale-95"
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 text-left">
        <span className={`text-sm font-medium transition-colors duration-200 ${active ? "text-[#2ecc71]" : "text-[#4a5568] group-hover:text-[#2ecc71]"}`}>
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="ml-2 text-xs bg-[#2ecc71] text-white px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
    </OptimizedLink>
  );
}

// SubNavItem for filters
interface SubNavItemProps {
  icon: React.ComponentType<{className?: string}>;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

function SubNavItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  count 
}: SubNavItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full pl-4 group"
      aria-current={active ? "page" : undefined}
    >
      <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
        active 
          ? "shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff] text-[#2ecc71]" 
          : "shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] text-[#4a5568] hover:text-[#2d3748]"
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 text-left">
        <span className={`text-sm ${active ? "text-[#2ecc71] font-medium" : "text-[#4a5568]"}`}>
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="ml-2 text-xs bg-[#2ecc71] text-white px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
    </button>
  );
}

// Quick Filter Button Component - Advanced Professional Neumorphism with instant navigation
interface QuickFilterButtonProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  color: "emerald" | "blue" | "purple" | "orange" | "slate";
  isAddButton?: boolean;
}

function QuickFilterButton({ 
  icon: Icon, 
  label, 
  count, 
  isActive, 
  onClick, 
  color,
  isAddButton,
  href
}: QuickFilterButtonProps) {
  const colorStyles = {
    emerald: {
      active: "text-emerald-600",
      inactive: "text-slate-700",
      iconBg: "from-emerald-500/20 to-emerald-600/10",
      iconBorder: "border-emerald-200/50",
      countBg: "bg-emerald-500",
    },
    blue: {
      active: "text-blue-600",
      inactive: "text-slate-700",
      iconBg: "from-blue-500/20 to-blue-600/10",
      iconBorder: "border-blue-200/50",
      countBg: "bg-blue-500",
    },
    purple: {
      active: "text-purple-600",
      inactive: "text-slate-700",
      iconBg: "from-purple-500/20 to-purple-600/10",
      iconBorder: "border-purple-200/50",
      countBg: "bg-purple-500",
    },
    orange: {
      active: "text-orange-600",
      inactive: "text-slate-700",
      iconBg: "from-orange-500/20 to-orange-600/10",
      iconBorder: "border-orange-200/50",
      countBg: "bg-orange-500",
    },
    slate: {
      active: "text-slate-600",
      inactive: "text-slate-500",
      iconBg: "from-slate-500/20 to-slate-600/10",
      iconBorder: "border-slate-200/50",
      countBg: "bg-slate-500",
    },
  };

  const styles = colorStyles[color];

  return (
    <OptimizedLink
      href={href}
      onClick={onClick}
      className={`group relative flex items-center justify-between w-full p-3 rounded-2xl transition-all duration-300 ease-out overflow-hidden ${
        isActive
          ? "shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] scale-[0.98]"
          : "shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] hover:scale-[0.98] active:scale-95"
      }`}
      priority={isActive ? "high" : "normal"}
    >
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.iconBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      <div className="relative z-10 flex items-center gap-3">
        {/* Icon container with neumorphism */}
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
          isActive
            ? "shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]"
            : "shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] group-hover:shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]"
        }`}>
          {isAddButton ? (
            <span className={`text-lg font-bold ${isActive ? styles.active : styles.inactive}`}>+</span>
          ) : (
            <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? styles.active : styles.inactive}`} />
          )}
        </div>
        
        {/* Label */}
        <span className={`text-sm font-medium transition-colors duration-300 ${isActive ? styles.active : styles.inactive}`}>
          {label}
        </span>
      </div>

      {/* Count badge */}
      {count !== undefined && count > 0 && (
        <span className={`relative z-10 ${styles.countBg} text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm`}>
          {count.toLocaleString()}
        </span>
      )}
    </OptimizedLink>
  );
}

export default function Sidebar({ user, onNavigate }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { stats } = useVehicleStats();
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  const isAdmin = user.role === "Admin";
  const activeCategory = pathname === "/vehicles" ? searchParams?.get("category") || "" : "";

  // Route active states
  const isDashboardActive = pathname === "/" || pathname === "/dashboard";
  const isLmsActive = pathname.startsWith("/lms");
  const isAdminLmsActive = pathname.startsWith("/admin/lms");
  const isVehiclesActive = pathname === "/vehicles" && !activeCategory;
  const isCarsActive = pathname === "/vehicles" && normalizeCategory(activeCategory) === "cars";
  const isMotorcyclesActive = pathname === "/vehicles" && normalizeCategory(activeCategory) === "motorcycles";
  const isTukTuksActive = pathname === "/vehicles" && (normalizeCategory(activeCategory) === "tuktuks" || isTukTukCategory(activeCategory));
  const isAddActive = false; // Modal-based, no route
  const isSettingsActive = pathname === "/settings";

  const handleNavigate = (href: string) => {
    onNavigate?.();
    router.push(href);
  };

  // Get counts
  const allVehiclesCount = stats?.total ?? 0;
  const carsCount = stats?.byCategory?.Cars ?? 0;
  const motorcyclesCount = stats?.byCategory?.Motorcycles ?? 0;
  const tukTuksCount = stats?.byCategory?.TukTuks ?? 0;


  return (
    <aside className="w-[280px] h-screen overflow-y-auto flex flex-col bg-[#e0e5ec] shadow-[9px_9px_16px_#bebebe,-9px_-9px_16px_#ffffff] print:hidden relative z-[50]">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 flex items-center justify-center rounded-2xl shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] bg-[#e0e5ec]">
            <Image
              src="/logo.png"
              alt="Emerald Cash"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#2d3748]">Emerald Cash</h1>
            <span className="text-xs bg-[#2ecc71] text-white px-2 py-0.5 rounded-full">VMS PRO</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 py-4 flex flex-col gap-6" aria-label="Main navigation">
        {/* Main Section */}
        <div className="flex flex-col gap-4">
          <NavItem
            href="/"
            icon={IconDashboard}
            label={t.dashboard}
            active={isDashboardActive}
            onClick={() => handleNavigate("/")}
          />
          <NavItem
            href="/lms"
            icon={IconLms}
            label={language === 'km' ? 'ការបណ្តុះបណ្តាល' : 'LMS'}
            active={isLmsActive || isAdminLmsActive}
            onClick={() => handleNavigate("/lms")}
          />
        </div>

        {/* Quick Filters Section - Advanced Professional Neumorphism */}
        <div className="px-4 py-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
            {language === 'km' ? 'តម្រងរហ័ស' : 'Quick Filters'}
          </h2>
          
          <div className="flex flex-col gap-3">
            {/* All Vehicles */}
            <QuickFilterButton
              href="/vehicles"
              icon={IconFleet}
              label={t.vehicles}
              count={allVehiclesCount}
              isActive={isVehiclesActive}
              onClick={() => handleNavigate("/vehicles")}
              color="emerald"
            />

            {/* Cars */}
            <QuickFilterButton
              href="/vehicles?category=cars"
              icon={IconCar}
              label={language === 'km' ? 'រថយន្ត' : 'Cars'}
              count={carsCount}
              isActive={isCarsActive}
              onClick={() => handleNavigate("/vehicles?category=cars")}
              color="blue"
            />

            {/* Motorcycles */}
            <QuickFilterButton
              href="/vehicles?category=motorcycles"
              icon={IconMotorcycle}
              label={language === 'km' ? 'ម៉ូតូ' : 'Motorcycles'}
              count={motorcyclesCount}
              isActive={isMotorcyclesActive}
              onClick={() => handleNavigate("/vehicles?category=motorcycles")}
              color="purple"
            />

            {/* TukTuks */}
            <QuickFilterButton
              href="/vehicles?category=tuktuks"
              icon={IconTukTuk}
              label={language === 'km' ? 'ទុកទុក' : 'TukTuks'}
              count={tukTuksCount}
              isActive={isTukTuksActive}
              onClick={() => handleNavigate("/vehicles?category=tuktuks")}
              color="orange"
            />

            {/* Add Vehicle - Admin only */}
            {isAdmin && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openAddVehicleModal'));
                  onNavigate?.();
                }}
                className="group relative flex items-center justify-between w-full p-3 rounded-2xl transition-all duration-300 ease-out overflow-hidden shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] hover:scale-[0.98] active:scale-95"
              >
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] group-hover:shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]">
                    <span className="text-lg font-bold text-slate-700">+</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {language === 'km' ? 'បន្ថែមយានយន្ត' : 'Add Vehicle'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="mt-auto">
          <NavItem
            href="/settings"
            icon={IconSettings}
            label={t.settings}
            active={isSettingsActive}
            onClick={() => handleNavigate("/settings")}
          />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-6 pt-4">
        <div className="text-center text-xs text-[#718096]">
          {language === 'km' ? '© ២០២៥ អេមរ៉ាល់ខាស' : '© 2025 Emerald Cash'}
        </div>
      </div>
    </aside>
  );
}
