"use client";

import React from "react";

/**
 * Neumorphic Dashboard Skeleton
 * Mimics the exact layout of the Vehicles Dashboard with neumorphic shadows
 * for seamless loading transitions
 */

// KPI Card Skeleton with neumorphic styling
function KpiCardSkeleton() {
  return (
    <div className="bg-[#e0e5ec] rounded-[20px] p-5 shadow-[8px_8px_16px_#a3b1c6,-8px_-8px_16px_#ffffff] animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-20 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
        <div className="h-10 w-10 rounded-xl bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
      </div>
      <div className="h-8 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-2" />
      <div className="h-3 w-24 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
    </div>
  );
}

// Filter Bar Skeleton
function FilterBarSkeleton() {
  return (
    <div className="bg-[#e0e5ec] rounded-[20px] p-4 shadow-[8px_8px_16px_#a3b1c6,-8px_-8px_16px_#ffffff] mb-6 animate-pulse">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search input skeleton */}
        <div className="flex-1 min-w-[200px] h-12 bg-[#e0e5ec] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]" />
        
        {/* Filter dropdowns */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="w-32 h-12 bg-[#e0e5ec] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]" 
          />
        ))}
        
        {/* Action buttons */}
        <div className="w-24 h-12 bg-[#d1d5db] rounded-[16px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]" />
        <div className="w-24 h-12 bg-[#d1d5db] rounded-[16px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]" />
      </div>
    </div>
  );
}

// Table Header Skeleton
function TableHeaderSkeleton() {
  return (
    <div className="flex items-center gap-2 mb-3 animate-pulse">
      <div className="h-10 w-32 bg-[#e0e5ec] rounded-[12px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]" />
      <div className="h-10 w-10 bg-[#e0e5ec] rounded-[12px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] ml-auto" />
    </div>
  );
}

// Table Row Skeleton
function TableRowSkeleton({ index }: { index: number }) {
  return (
    <tr className={`${index % 2 === 0 ? "bg-[#e6e9ef]/50" : ""}`}>
      {/* ID */}
      <td className="px-4 py-3">
        <div className="h-4 w-12 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
      </td>
      
      {/* Image */}
      <td className="px-4 py-3">
        <div className="h-12 w-12 rounded-lg bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff] animate-pulse" />
      </td>
      
      {/* Category */}
      <td className="px-4 py-3">
        <div className="h-4 w-20 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
      </td>
      
      {/* Brand */}
      <td className="px-4 py-3">
        <div className="h-4 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
      </td>
      
      {/* Model */}
      <td className="px-4 py-3">
        <div className="h-4 w-24 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
      </td>
      
      {/* Year */}
      <td className="px-4 py-3">
        <div className="h-4 w-12 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
      </td>
      
      {/* Plate */}
      <td className="px-4 py-3">
        <div className="h-4 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
      </td>
      
      {/* Price */}
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-20 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse ml-auto" />
      </td>
      
      {/* Price 40% */}
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse ml-auto" />
      </td>
      
      {/* Price 70% */}
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse ml-auto" />
      </td>
      
      {/* Tax Type */}
      <td className="px-4 py-3">
        <div className="h-4 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
      </td>
      
      {/* Condition */}
      <td className="px-4 py-3">
        <div className="h-6 w-16 bg-[#e0e5ec] rounded-full shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
      </td>
      
      {/* Body Type */}
      <td className="px-4 py-3">
        <div className="h-4 w-20 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
      </td>
      
      {/* Color */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-[#d1d5db] shadow-[inset_1px_1px_2px_#bebebe,inset_-1px_-1px_2px_#ffffff] animate-pulse" />
          <div className="h-4 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
        </div>
      </td>
      
      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          <div className="h-8 w-8 rounded-lg bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
          <div className="h-8 w-8 rounded-lg bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
          <div className="h-8 w-8 rounded-lg bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
        </div>
      </td>
    </tr>
  );
}

// Table Skeleton
function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-2xl bg-[#e6e9ef] shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff] overflow-hidden">
      <div className="overflow-auto max-h-[65vh] custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#e6e9ef] shadow-[0_2px_4px_#bebebe]">
              {['ID', 'Image', 'Category', 'Brand', 'Model', 'Year', 'Plate', 'Market Price', 'D.O.C. 40%', 'Vehicles 70%', 'Tax Type', 'Condition', 'Body Type', 'Color', 'Actions'].map((header) => (
                <th key={header} className="px-4 py-3 text-left">
                  <div className="h-3 w-full bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#bebebe]/20">
            {Array.from({ length: rows }).map((_, index) => (
              <TableRowSkeleton key={index} index={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pagination Skeleton
function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between mt-4 p-3 bg-[#e0e5ec] rounded-[16px] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] animate-pulse">
      <div className="h-8 w-24 bg-[#d1d5db] rounded-[12px] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-8 bg-[#d1d5db] rounded-[10px] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
        ))}
      </div>
      <div className="h-8 w-24 bg-[#d1d5db] rounded-[12px] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
    </div>
  );
}

// Main Dashboard Skeleton
export function NeuDashboardSkeleton() {
  return (
    <div className="min-h-screen pb-20 lg:pb-0 bg-[#e0e5ec]">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between animate-pulse">
          <div className="h-8 w-48 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
          <div className="h-10 w-32 bg-[#d1d5db] rounded-[16px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]" />
        </div>

        {/* Status Bar Skeleton */}
        <div className="flex items-center justify-between p-5 bg-[#e0e5ec] rounded-[20px] shadow-[8px_8px_16px_#a3b1c6,-8px_-8px_16px_#ffffff] animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-4 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-8 w-24 bg-[#d1d5db] rounded-lg shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-32 bg-[#d1d5db] rounded-lg shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]" />
            <div className="h-10 w-24 bg-[#d1d5db] rounded-lg shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>

        {/* Add Button */}
        <div className="animate-pulse">
          <div className="h-12 w-40 bg-[#d1d5db] rounded-[16px] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff]" />
        </div>

        {/* Filter Bar */}
        <FilterBarSkeleton />

        {/* Table */}
        <div className="space-y-3">
          <TableHeaderSkeleton />
          <TableSkeleton rows={8} />
          <PaginationSkeleton />
        </div>
      </div>
    </div>
  );
}

export default NeuDashboardSkeleton;
