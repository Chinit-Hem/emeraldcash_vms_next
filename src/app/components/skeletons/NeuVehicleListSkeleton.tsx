"use client";

import React from "react";

/**
 * Neumorphic Vehicle List Skeleton
 * Mimics the mobile vehicle card layout with neumorphic shadows
 * for seamless loading transitions on mobile devices
 */

// Mobile Vehicle Card Skeleton
function MobileVehicleCardSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="rounded-xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] animate-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Main Card Content */}
      <div className="flex gap-3">
        {/* Vehicle Image Skeleton */}
        <div className="flex-shrink-0">
          <div className="h-16 w-16 rounded-xl bg-gray-200 shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-2 flex-1">
              <div className="h-5 w-3/4 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
              <div className="h-3 w-1/2 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            </div>
            <div className="h-6 w-16 rounded-full bg-gray-200 shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] flex-shrink-0" />
          </div>

          <div className="flex items-center justify-between">
            <div className="h-6 w-20 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-4 w-12 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// iOS Vehicle Card Skeleton with expanded details
function IOSVehicleCardSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="rounded-xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] animate-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Main Card Content */}
      <div className="flex gap-3">
        {/* Vehicle Image Skeleton */}
        <div className="flex-shrink-0">
          <div className="h-16 w-16 rounded-xl bg-gray-200 ring-1 ring-black/10 shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-2 flex-1">
              <div className="h-5 w-3/4 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
              <div className="h-3 w-1/2 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            </div>
            <div className="h-6 w-16 rounded-full bg-gray-200 shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] flex-shrink-0" />
          </div>

          <div className="flex items-center justify-between">
            <div className="h-6 w-20 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="flex items-center gap-1">
              <div className="h-4 w-8 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
              <div className="h-4 w-4 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details Skeleton */}
      <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
              <div className="h-4 w-20 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div 
              key={i} 
              className="flex-1 h-10 bg-gray-200 rounded-xl shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Search Bar Skeleton
function SearchBarSkeleton() {
  return (
    <div className="mb-4 rounded-xl bg-white p-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)] animate-pulse">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-5 w-5 bg-gray-200 rounded-full shadow-[inset_1px_1px_2px_#bebebe,inset_-1px_-1px_2px_#ffffff]" />
        <div className="flex-1 h-8 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
      </div>
    </div>
  );
}

// iOS Status Bar Skeleton
function IOSStatusBarSkeleton() {
  return (
    <div className="mb-4 rounded-lg bg-emerald-600 px-4 py-3 shadow-md animate-pulse">
      <div className="h-3 w-48 bg-white/30 rounded-lg" />
    </div>
  );
}

// Pagination Skeleton for Mobile
function MobilePaginationSkeleton() {
  return (
    <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)] animate-pulse">
      <div className="h-10 w-20 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
      
      <div className="flex items-center gap-1">
        <div className="h-8 w-8 bg-emerald-600 rounded-lg shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]" />
        <div className="h-4 w-4 bg-gray-200 rounded-lg shadow-[inset_1px_1px_2px_#bebebe,inset_-1px_-1px_2px_#ffffff]" />
        <div className="h-4 w-4 bg-gray-200 rounded-lg shadow-[inset_1px_1px_2px_#bebebe,inset_-1px_-1px_2px_#ffffff]" />
      </div>
      
      <div className="h-10 w-20 bg-gray-200 rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
    </div>
  );
}

// Main Vehicle List Skeleton - Updated to match Dashboard/LMS white style
export function NeuVehicleListSkeleton({ 
  count = 6, 
  variant = "mobile",
  showIOSStatus = false 
}: { 
  count?: number;
  variant?: "mobile" | "ios";
  showIOSStatus?: boolean;
}) {
  return (
    <div className="min-h-screen pb-20 lg:pb-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-white rounded-xl shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff] animate-pulse" />
          <div className="h-10 w-32 bg-white rounded-xl shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff] animate-pulse" />
        </div>

        {/* Quick Filters Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="h-24 bg-white rounded-3xl shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff] animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-3xl p-4 shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] animate-pulse">
          <div className="h-12 bg-slate-100 rounded-xl shadow-[inset_2px_2px_8px_#e2e8f0,inset_-2px_-2px_8px_#ffffff]" />
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] overflow-hidden animate-pulse">
          <div className="h-16 bg-slate-50 border-b border-slate-100" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 border-b border-slate-100 last:border-0" />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-white rounded-lg shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff] animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-10 w-20 bg-white rounded-xl shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff] animate-pulse" />
            <div className="h-10 w-16 bg-white rounded-xl shadow-[inset_2px_2px_8px_#e2e8f0,inset_-2px_-2px_8px_#ffffff] animate-pulse" />
            <div className="h-10 w-20 bg-white rounded-xl shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Desktop Vehicle Card Skeleton
function DesktopVehicleCardSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="bg-[#e6e9ef] rounded-[16px] p-4 shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] animate-pulse"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-4">
        {/* Image */}
        <div className="h-20 w-20 rounded-xl bg-[#d1d5db] shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff] flex-shrink-0" />
        
        {/* Content */}
        <div className="flex-1 grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-3 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-3 w-12 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-3 w-20 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <div className="h-10 w-10 rounded-lg bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-10 w-10 rounded-lg bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-10 w-10 rounded-lg bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Desktop Vehicle List Skeleton
export function NeuVehicleListSkeletonDesktop({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <DesktopVehicleCardSkeleton key={index} index={index} />
      ))}
    </div>
  );
}

export default NeuVehicleListSkeleton;
