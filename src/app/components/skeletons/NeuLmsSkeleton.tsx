"use client";

import React from "react";

/**
 * Neumorphic LMS Dashboard Skeleton
 * Mimics the exact layout of the LMS Dashboard with neumorphic shadows
 * for seamless loading transitions
 */

// Stat Card Skeleton
function StatCardSkeleton() {
  return (
    <div className="bg-[#e6e9ef] rounded-[20px] p-5 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-24 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
        <div className="h-10 w-10 rounded-xl bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
      </div>
      <div className="h-8 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-2" />
      <div className="h-3 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
    </div>
  );
}

// Tab Navigation Skeleton
function TabNavigationSkeleton() {
  return (
    <div className="flex gap-2 p-1 bg-[#e6e9ef] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div 
          key={i} 
          className={`flex-1 h-10 rounded-[12px] ${i === 0 ? 'bg-[#d1d5db] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]' : 'bg-transparent'}`}
        />
      ))}
    </div>
  );
}

// Search Bar Skeleton
function SearchBarSkeleton() {
  return (
    <div className="relative animate-pulse">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#d1d5db] rounded-full shadow-[inset_1px_1px_2px_#bebebe,inset_-1px_-1px_2px_#ffffff] z-10" />
      <div className="w-full h-14 bg-[#e6e9ef] rounded-[20px] shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]" />
    </div>
  );
}

// Category Card Skeleton
function CategoryCardSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="bg-[#e6e9ef] rounded-[20px] p-5 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] animate-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="h-12 w-12 rounded-xl bg-[#d1d5db] shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]" />
        <div className="h-6 w-16 bg-[#d1d5db] rounded-full shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
      </div>
      <div className="h-5 w-3/4 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-2" />
      <div className="h-3 w-full bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-4" />
      <div className="h-2 w-full bg-[#d1d5db] rounded-full shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-2" />
      <div className="flex justify-between">
        <div className="h-3 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
        <div className="h-3 w-12 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
      </div>
    </div>
  );
}

// Continue Learning Card Skeleton
function ContinueLearningSkeleton() {
  return (
    <div className="p-6 bg-[#e6e9ef] rounded-[24px] shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff] animate-pulse">
      <div className="h-6 w-40 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-4" />
      <div className="space-y-4">
        {/* Current Lesson */}
        <div className="flex items-center justify-between p-4 bg-[#e6e9ef] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-[12px] bg-[#d1d5db] shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]" />
            <div className="space-y-2">
              <div className="h-4 w-48 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
              <div className="h-3 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            </div>
          </div>
          <div className="h-10 w-24 bg-[#d1d5db] rounded-[12px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]" />
        </div>
        
        {/* Locked Lesson */}
        <div className="flex items-center justify-between p-4 bg-[#e6e9ef] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] opacity-75">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-[12px] bg-[#d1d5db] shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]" />
            <div className="space-y-2">
              <div className="h-4 w-48 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
              <div className="h-3 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            </div>
          </div>
          <div className="h-10 w-24 bg-[#d1d5db] rounded-[12px] shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]" />
        </div>
      </div>
    </div>
  );
}

// Progress Section Skeleton
function ProgressSectionSkeleton() {
  return (
    <div className="p-6 bg-[#e6e9ef] rounded-[24px] shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff] animate-pulse">
      <div className="h-6 w-40 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-4" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
          <div className="h-4 w-24 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
        </div>
        <div className="h-4 w-full bg-[#d1d5db] rounded-full shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]" />
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center p-4 bg-[#e6e9ef] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]">
              <div className="h-8 w-12 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mx-auto mb-2" />
              <div className="h-3 w-20 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Staff Progress Table Skeleton
function StaffProgressTableSkeleton() {
  return (
    <div className="p-6 bg-[#e6e9ef] rounded-[24px] shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff] animate-pulse">
      <div className="h-6 w-48 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-4" />
      <div className="space-y-3">
        {/* Table Header */}
        <div className="flex gap-4 p-3 bg-[#e6e9ef] rounded-[12px] shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 flex-1 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
          ))}
        </div>
        
        {/* Table Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 bg-[#e6e9ef] rounded-[12px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]">
            <div className="h-4 flex-1 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-4 flex-1 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-4 flex-1 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-8 w-24 bg-[#d1d5db] rounded-lg shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Achievement Card Skeleton
function AchievementCardSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="p-6 bg-[#e6e9ef] rounded-[24px] shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff] text-center animate-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-[#d1d5db] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]" />
      <div className="h-5 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mx-auto mb-2" />
      <div className="h-3 w-48 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mx-auto mb-4" />
      <div className="flex items-center justify-center gap-2">
        <div className="h-5 w-5 rounded-full bg-[#d1d5db] shadow-[inset_1px_1px_2px_#bebebe,inset_-1px_-1px_2px_#ffffff]" />
        <div className="h-4 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
      </div>
    </div>
  );
}

// My Process Section Skeleton
function MyProcessSectionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Card */}
      <div className="p-6 bg-[#e6e9ef] rounded-[24px] shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff]">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-[#d1d5db] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-3 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center p-4 bg-[#e6e9ef] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]">
              <div className="h-8 w-12 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mx-auto mb-2" />
              <div className="h-3 w-20 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mx-auto" />
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-[#e6e9ef] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]">
          <div className="h-4 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-3" />
          <div className="h-12 w-full bg-[#d1d5db] rounded-[12px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]" />
        </div>
      </div>
      
      {/* Category Progress */}
      <div className="p-6 bg-[#e6e9ef] rounded-[24px] shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff]">
        <div className="h-6 w-40 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 bg-[#e6e9ef] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
                <div className="h-4 w-16 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
              </div>
              <div className="h-2 w-full bg-[#d1d5db] rounded-full shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-1" />
              <div className="h-3 w-24 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main LMS Skeleton
export function NeuLmsSkeleton({ activeTab = "learning" }: { activeTab?: "learning" | "progress" | "achievements" | "my-process" }) {
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-[#d1d5db] shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
            <div className="h-3 w-64 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]" />
          </div>
        </div>
        <div className="h-10 w-32 bg-[#d1d5db] rounded-[16px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff]" />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Tab Navigation */}
      <TabNavigationSkeleton />

      {/* Tab Content */}
      {activeTab === "learning" && (
        <div className="space-y-6 animate-pulse">
          <SearchBarSkeleton />
          
          <div>
            <div className="h-6 w-48 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <CategoryCardSkeleton key={i} index={i} />
              ))}
            </div>
          </div>
          
          <ContinueLearningSkeleton />
        </div>
      )}

      {activeTab === "progress" && (
        <div className="space-y-6 animate-pulse">
          <ProgressSectionSkeleton />
          <StaffProgressTableSkeleton />
        </div>
      )}

      {activeTab === "achievements" && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <AchievementCardSkeleton key={i} index={i} />
            ))}
          </div>
        </div>
      )}

      {activeTab === "my-process" && (
        <MyProcessSectionSkeleton />
      )}
    </div>
  );
}

export default NeuLmsSkeleton;
