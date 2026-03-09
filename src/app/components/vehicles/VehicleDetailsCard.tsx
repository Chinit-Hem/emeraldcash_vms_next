"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GlassCard } from "../ui/GlassCard";
import { GlassButton } from "../ui/GlassButton";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import ImageModal from "../ImageModal";
import { formatCurrency, formatVehicleTime, formatVehicleId } from "@/lib/format";
import { normalizeCambodiaTimeString } from "@/lib/cambodiaTime";
import { driveThumbnailUrl, extractDriveFileId } from "@/lib/drive";
import type { Vehicle } from "@/lib/types";
import { TAX_TYPE_METADATA } from "@/lib/types";


interface VehicleDetailsCardProps {
  vehicle: Vehicle;
  userRole: "Admin" | "Staff" | "Viewer";
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  isDeleting?: boolean;
}



export function VehicleDetailsCard({
  vehicle,
  userRole,
  onEdit,
  onDelete,
  isDeleting = false,
}: VehicleDetailsCardProps) {

  const router = useRouter();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isAdmin = userRole === "Admin";
  const canEdit = userRole === "Admin" || userRole === "Staff";
  const canDelete = isAdmin;

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      router.push(`/vehicles/${vehicle.VehicleId}/edit`);
    }
  };


  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
    }
    setIsDeleteDialogOpen(false);
  };

// Helper to get proper image URL (handle Google Drive and Cloudinary URLs)
  const getImageUrl = (imageUrl: string | undefined): string | null => {
    if (!imageUrl || !imageUrl.trim()) return null;
    
    // Check if it's a Cloudinary URL
    if (imageUrl.includes('res.cloudinary.com')) {
      // Return Cloudinary URL as-is for Next.js Image component
      return imageUrl;
    }
    
    // Check if it's a Google Drive URL
    const fileId = extractDriveFileId(imageUrl);
    if (fileId) {
      // Use larger thumbnail for detail view
      return driveThumbnailUrl(fileId, "w800-h600");
    }
    
    // Return as-is for other URLs
    return imageUrl;
  };

  const displayImageUrl = getImageUrl(vehicle.Image);
  const isCloudinaryImage = displayImageUrl?.includes('res.cloudinary.com') || false;

  const taxTypeMeta = TAX_TYPE_METADATA.find((tt) => tt.value === vehicle.TaxType);


  // Information grid items
  const infoItems = [
    { label: "Category", value: vehicle.Category },
    { label: "Plate Number", value: vehicle.Plate, isMono: true },
    { label: "Year", value: vehicle.Year?.toString() || "—" },
    { label: "Color", value: vehicle.Color },
    { label: "Condition", value: vehicle.Condition },
    { label: "Body Type", value: vehicle.BodyType },
    {
      label: "Tax Type",
      value: vehicle.TaxType,
      description: taxTypeMeta?.description,
    },
  ];

  return (
    <>
      <div className="min-h-screen pb-[11rem] md:pb-8" style={{ color: '#f8fafc' }}>
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Back
              </GlassButton>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  Vehicle Details
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ID: {formatVehicleId(vehicle.VehicleId)}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 w-fit">
              {vehicle.Category}
            </span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Image */}
          <div>
            <GlassCard variant="elevated" className="overflow-hidden">
            {displayImageUrl ? (
                <div
                  className="relative aspect-[4/3] cursor-pointer group"
                  onClick={() => setIsImageModalOpen(true)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={displayImageUrl || "no-image"}
                    src={displayImageUrl}
                    alt={`${vehicle.Brand} ${vehicle.Model}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />


                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                      Click to enlarge
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center p-8">
                  <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-10 w-10 text-gray-400"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    No image available
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    Upload an image to showcase this vehicle
                  </p>
                </div>
              )}
            </GlassCard>

            {/* Thumbnail Gallery - Show main image thumbnail if available */}
            {displayImageUrl && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                <GlassCard
                  variant="outlined"
                  className="aspect-square cursor-pointer overflow-hidden"
                  onClick={() => setIsImageModalOpen(true)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={displayImageUrl || "thumb-no-image"}
                    src={displayImageUrl}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                </GlassCard>

              </div>
            )}


          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Main Identity */}
            <GlassCard variant="elevated" className="p-6">
              <div className="space-y-2">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  {vehicle.Brand} {vehicle.Model}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-lg">
                  <span className="font-mono text-gray-600 dark:text-white uppercase">
                    {vehicle.Plate || "No Plate"}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500 dark:text-white text-sm">
                    {vehicle.Year || "N/A"}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Information Grid */}
            <GlassCard variant="default" className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {infoItems.map((item) => (
                  <div
                    key={item.label}
                    className="p-3 rounded-xl bg-gray-50/50 dark:bg-slate-900/85 border border-gray-100 dark:border-white/15"
                  >
                    <p className="text-xs text-gray-500 dark:text-white uppercase tracking-wide">
                      {item.label}
                    </p>
                    <p
                      className={`text-sm font-semibold text-gray-900 dark:text-white mt-1 ${
                        item.isMono ? "font-mono uppercase" : ""
                      }`}
                    >
                      {item.value || "—"}
                    </p>
                    {item.description && (
                      <p className="text-xs text-gray-400 dark:text-white mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Price Cards */}
            <div className="grid grid-cols-3 gap-3">
              <GlassCard
                variant="elevated"
                className="p-4 text-center bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/20"
              >
                <p className="text-xs text-gray-500 dark:text-white uppercase tracking-wide">
                  Market Price
                </p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(vehicle.PriceNew)}
                </p>
              </GlassCard>

              <GlassCard
                variant="elevated"
                className="p-4 text-center bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/20"
              >
                <p className="text-xs text-gray-500 dark:text-white uppercase tracking-wide">
                  DOC 40%
                </p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {formatCurrency(vehicle.Price40)}
                </p>
              </GlassCard>

              <GlassCard
                variant="elevated"
                className="p-4 text-center bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/20"
              >
                <p className="text-xs text-gray-500 dark:text-white uppercase tracking-wide">
                  Vehicles 70%
                </p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {formatCurrency(vehicle.Price70)}
                </p>
              </GlassCard>
            </div>

            {/* Added Time */}
            <GlassCard
              variant="outlined"
              className="p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-gray-500 dark:text-white"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-white uppercase tracking-wide">
                    Added Time
                  </p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {formatVehicleTime(vehicle.Time)}
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex gap-3 mt-8">
          {canEdit && (
            <GlassButton variant="primary" size="lg" onClick={handleEdit}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 mr-2"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Edit Vehicle
            </GlassButton>
          )}
          {canDelete && (
            <GlassButton
              variant="danger"
              size="lg"
              onClick={() => setIsDeleteDialogOpen(true)}
              isLoading={isDeleting}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 mr-2"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Delete
            </GlassButton>
          )}
          <GlassButton variant="secondary" size="lg" onClick={() => router.push("/vehicles")}>
            Back to List
          </GlassButton>

        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="md:hidden fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 border-t border-gray-200 bg-white/90 p-4 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/90">
        <div className="flex gap-2">
          {canEdit && (
            <GlassButton
              variant="primary"
              fullWidth
              onClick={handleEdit}
              className="flex-1"
            >
              Edit
            </GlassButton>
          )}
          {canDelete && (
            <GlassButton
              variant="danger"
              fullWidth
              onClick={() => setIsDeleteDialogOpen(true)}
              isLoading={isDeleting}
              className="flex-1"
            >
              Delete
            </GlassButton>
          )}
          <GlassButton
            variant="secondary"
            fullWidth
            onClick={() => router.push("/vehicles")}
            className="flex-1"
          >
            Back to List
          </GlassButton>

        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        imageUrl={displayImageUrl || vehicle.Image}
        alt={`${vehicle.Brand} ${vehicle.Model}`}
        onClose={() => setIsImageModalOpen(false)}
      />


      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Vehicle"
        message={`Are you sure you want to delete ${vehicle.Brand} ${vehicle.Model} (${vehicle.Plate})? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </>
  );
}
