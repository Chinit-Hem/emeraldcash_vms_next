/**
 * Neumorphic Settings Skeleton
 * Mimics the exact layout of the Settings page with neumorphic shadows
 */

"use client";

import React from "react";

export function NeuSettingsSkeleton() {
  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-[#e0e5ec] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff]" />
          <div className="h-8 w-48 bg-[#d1d5db] rounded-xl shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]" />
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-[#e0e5ec] rounded-[24px] p-6 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff]">
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-[#e0e5ec] shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff] animate-pulse mb-4" />
                
                {/* Name */}
                <div className="h-6 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse mb-2" />
                
                {/* Role */}
                <div className="h-4 w-20 bg-[#d1d5db] rounded-md shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse mb-4" />
                
                {/* Edit Button */}
                <div className="h-10 w-full bg-[#d1d5db] rounded-[16px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] animate-pulse" />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-[#e0e5ec] rounded-[24px] p-6 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff]">
              <div className="h-5 w-24 bg-[#d1d5db] rounded-md shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse mb-4" />
              
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-20 bg-[#d1d5db] rounded-md shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                    <div className="h-4 w-12 bg-[#d1d5db] rounded-md shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Settings Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Settings */}
            <div className="bg-[#e0e5ec] rounded-[24px] p-6 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff]">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                <div className="h-6 w-40 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
              </div>

              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-[#d1d5db] rounded-md shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                    <div className="h-14 bg-[#e0e5ec] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] animate-pulse" />
                  </div>
                ))}
              </div>

              <div className="mt-6 h-12 w-32 bg-[#d1d5db] rounded-[16px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] animate-pulse" />
            </div>

            {/* Preferences */}
            <div className="bg-[#e0e5ec] rounded-[24px] p-6 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff]">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                <div className="h-6 w-36 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
              </div>

              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]">
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-[#d1d5db] rounded-md shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                      <div className="h-3 w-48 bg-[#d1d5db] rounded-md shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                    </div>
                    <div className="h-6 w-12 bg-[#d1d5db] rounded-full shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="bg-[#e0e5ec] rounded-[24px] p-6 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff]">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                <div className="h-6 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
              </div>

              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-12 bg-[#e0e5ec] rounded-[12px] shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff] animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NeuSettingsSkeleton;
