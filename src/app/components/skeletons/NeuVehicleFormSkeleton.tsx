/**
 * Neumorphic Vehicle Form Skeleton
 * Mimics the exact layout of the Vehicle Form with neumorphic shadows
 */

"use client";

import React from "react";

export function NeuVehicleFormSkeleton() {
  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-[#e0e5ec] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff]" />
          <div className="h-8 w-64 bg-[#d1d5db] rounded-xl shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]" />
        </div>

        {/* Form Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <div className="bg-[#e0e5ec] rounded-[24px] p-6 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff]">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                <div className="h-6 w-40 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Input fields */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-[#d1d5db] rounded-md shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                    <div className="h-14 bg-[#e0e5ec] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-[#e0e5ec] rounded-[24px] p-6 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff]">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                <div className="h-6 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-[#d1d5db] rounded-md shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                    <div className="h-14 bg-[#e0e5ec] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-[#e0e5ec] rounded-[24px] p-6 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff]">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                <div className="h-6 w-36 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
              </div>
              <div className="h-32 bg-[#e0e5ec] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] animate-pulse" />
            </div>
          </div>

          {/* Right Column - Image & Actions */}
          <div className="space-y-6">
            {/* Image Upload Card */}
            <div className="bg-[#e0e5ec] rounded-[24px] p-6 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff]">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                <div className="h-6 w-32 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
              </div>
              
              {/* Image placeholder */}
              <div className="aspect-square bg-[#e0e5ec] rounded-[20px] shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff] animate-pulse flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-[#d1d5db] shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]" />
              </div>
              
              <div className="mt-4 h-12 bg-[#d1d5db] rounded-[16px] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] animate-pulse" />
            </div>

            {/* Status Card */}
            <div className="bg-[#e0e5ec] rounded-[24px] p-6 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff]">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-[#d1d5db] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
                <div className="h-6 w-28 bg-[#d1d5db] rounded-lg shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] animate-pulse" />
              </div>

              <div className="space-y-4">
                <div className="h-14 bg-[#e0e5ec] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] animate-pulse" />
                <div className="h-14 bg-[#e0e5ec] rounded-[16px] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] animate-pulse" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="h-14 bg-[#d1d5db] rounded-[16px] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] animate-pulse" />
              <div className="h-14 bg-[#e0e5ec] rounded-[16px] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NeuVehicleFormSkeleton;
