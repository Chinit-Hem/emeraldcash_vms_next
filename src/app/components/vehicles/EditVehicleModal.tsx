"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { GlassCard } from "../ui/GlassCard";
import { GlassButton } from "../ui/GlassButton";
import { GlassInput } from "../ui/GlassInput";
import ImageModal from "../ImageModal";
import { formatCurrency, formatVehicleTime } from "@/lib/format";
import { derivePrices } from "@/lib/pricing";
import { compressImage, formatFileSize } from "@/lib/compressImage";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
import type { Vehicle } from "@/lib/types";
import {
  COLOR_OPTIONS,
  TAX_TYPE_METADATA,
  PLATE_NUMBER_MAX_LENGTH,
  PLATE_NUMBER_HINTS,
} from "@/lib/types";

// Validation schema
const vehicleSchema = z.object({
  Brand: z.string().min(1, "Brand is required"),
  Model: z.string().min(1, "Model is required"),
  Category: z.string().min(1, "Category is required"),
  Plate: z.string().max(PLATE_NUMBER_MAX_LENGTH, "Plate number too long"),
  Year: z.number().nullable().optional(),
  Color: z.string().optional(),
  Condition: z.string().optional(),
  BodyType: z.string().optional(),
  TaxType: z.string().optional(),
  PriceNew: z.number().nullable().optional(),
  Image: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

const CATEGORY_OPTIONS = ["Cars", "Motorcycles", "Tuk Tuk"] as const;

interface EditVehicleModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: VehicleFormData & { imageFile?: File | null }) => Promise<void>;
  isSaving?: boolean;
}

export function EditVehicleModal({
  vehicle,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}: EditVehicleModalProps) {
  const router = useRouter();
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      Brand: vehicle.Brand,
      Model: vehicle.Model,
      Category: vehicle.Category,
      Plate: vehicle.Plate,
      Year: vehicle.Year,
      Color: vehicle.Color,
      Condition: vehicle.Condition,
      BodyType: vehicle.BodyType,
      TaxType: vehicle.TaxType,
      PriceNew: vehicle.PriceNew,
      Image: vehicle.Image,
    },
  });

  // Watch for changes
  const formValues = watch();
  const priceNew = watch("PriceNew");

  // Calculate derived prices
  const derivedPrices = React.useMemo(() => {
    if (!priceNew || priceNew <= 0) return { Price40: null, Price70: null };
    return derivePrices(priceNew);
  }, [priceNew]);

  // Handle unsaved changes warning
  useEffect(() => {
    const isDirty = Object.keys(dirtyFields).length > 0 || uploadedImageFile !== null;
    setHasChanges(isDirty);
  }, [dirtyFields, uploadedImageFile]);

  // Prevent closing if unsaved changes
  const handleClose = useCallback(() => {
    if (hasChanges && !isSaving) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (!confirmed) return;
    }
    onClose();
  }, [hasChanges, isSaving, onClose]);

  // Handle image file upload
  const handleImageFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5MB)");
      return;
    }

    setImageLoading(true);
    try {
      // For large files (>1MB), use object URL to avoid memory issues
      // For smaller files, use data URL for preview
      let previewUrl: string;
      if (file.size > 1024 * 1024) {
        previewUrl = URL.createObjectURL(file);
      } else {
        previewUrl = await fileToDataUrl(file);
      }
      setValue("Image", previewUrl, { shouldDirty: true });
      setUploadedImageFile(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load image");
    } finally {
      setImageLoading(false);
    }
  };

  // Handle paste from clipboard
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageFile(file);
        }
        break;
      }
    }
  };

  // Handle form submission
  const onSubmit = async (data: VehicleFormData) => {
    await onSave({ ...data, imageFile: uploadedImageFile });
    setHasChanges(false);
    setUploadedImageFile(null);
  };

  // Handle price change with auto-calculation
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === "" ? null : parseFloat(e.target.value);
    setValue("PriceNew", value, { shouldDirty: true });
  };

  if (!isOpen) return null;

  const categoryValue = formValues.Category || "";
  const categoryOptions =
    categoryValue && !CATEGORY_OPTIONS.includes(categoryValue as (typeof CATEGORY_OPTIONS)[number])
      ? [categoryValue, ...CATEGORY_OPTIONS]
      : [...CATEGORY_OPTIONS];

  const imageUrl = formValues.Image || vehicle.Image;

  return (
    <>
      {/* Mobile: Full screen overlay */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
        <div className="min-h-screen px-4 py-4 md:py-8">
          <GlassCard
            variant="elevated"
            className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 bg-gradient-to-br from-white/70 via-emerald-100/20 via-red-50/10 via-emerald-50/15 to-white/70 dark:from-white/8 dark:via-emerald-500/15 dark:via-red-900/8 dark:via-emerald-900/12 dark:to-white/8"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4 md:p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    Edit Vehicle
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {vehicle.Brand} {vehicle.Model} • {vehicle.Plate}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSaving}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-gray-500"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit(onSubmit)} onPaste={handlePaste} className="p-4 md:p-6 space-y-6">
              {/* Image Section */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-emerald-500"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  Vehicle Image
                </h3>

                {imageUrl ? (
                  <div className="space-y-4">
                    <div
                      className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => setIsImageModalOpen(true)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Vehicle"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white font-medium">
                          Click to preview
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                    <input
                      id="edit-vehicle-image-replace"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-vehicle-image-replace"
                      className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium pointer-events-auto"
                    >
                      Replace Image
                    </label>


                      <button
                        type="button"
                        onClick={() => {
                          setValue("Image", "", { shouldDirty: true });
                          setUploadedImageFile(null);
                        }}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                    {imageLoading && (
                      <p className="text-sm text-gray-500">Compressing image...</p>
                    )}
                    {uploadedImageFile && (
                      <p className="text-sm text-emerald-600">
                        Ready: {formatFileSize(uploadedImageFile.size)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-8 w-8 text-gray-400"
                      >
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      No image uploaded
                    </p>
                    <input
                      id="edit-vehicle-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-vehicle-image-upload"
                      className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white rounded-lg cursor-pointer hover:bg-emerald-700 transition-colors font-medium pointer-events-auto"
                    >
                      Upload Image
                    </label>


                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-2">Or paste image URL</p>
                      <input
                        type="url"
                        {...register("Image")}
                        placeholder="https://..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-emerald-500"
                  >
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <path d="M9 17h6" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Brand */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Brand *
                    </label>
                    <input
                      type="text"
                      {...register("Brand")}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    {errors.Brand && (
                      <p className="mt-1 text-sm text-red-600">{errors.Brand.message}</p>
                    )}
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Model *
                    </label>
                    <input
                      type="text"
                      {...register("Model")}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    {errors.Model && (
                      <p className="mt-1 text-sm text-red-600">{errors.Model.message}</p>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category *
                    </label>
                    <select
                      {...register("Category")}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">Select category</option>
                      {categoryOptions.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {categoryValue && !CATEGORY_OPTIONS.includes(categoryValue as (typeof CATEGORY_OPTIONS)[number]) && (
                      <p className="mt-1 text-xs text-amber-600">
                        Unknown category. Choose Cars, Motorcycles, or Tuk Tuk for Drive upload.
                      </p>
                    )}
                  </div>

                  {/* Plate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Plate Number
                    </label>
                    <input
                      type="text"
                      {...register("Plate")}
                      maxLength={PLATE_NUMBER_MAX_LENGTH}
                      placeholder={`e.g. ${PLATE_NUMBER_HINTS[0]}`}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono uppercase"
                    />
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      {...register("Year", { valueAsNumber: true })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      list="colorsList"
                      {...register("Color")}
                      placeholder="Type color"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <datalist id="colorsList">
                      {COLOR_OPTIONS.map((color) => (
                        <option key={color.value} value={color.value} />
                      ))}
                    </datalist>
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Condition
                    </label>
                    <input
                      type="text"
                      {...register("Condition")}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Body Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Body Type
                    </label>
                    <input
                      type="text"
                      {...register("BodyType")}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Tax Type */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tax Type
                    </label>
                    <input
                      type="text"
                      list="taxTypesList"
                      {...register("TaxType")}
                      placeholder="Type tax type"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <datalist id="taxTypesList">
                      {TAX_TYPE_METADATA.map((tt) => (
                        <option key={tt.value} value={tt.label} />
                      ))}
                    </datalist>
                    {formValues.TaxType && (
                      <p className="mt-1 text-xs text-gray-500">
                        {TAX_TYPE_METADATA.find((tt) => tt.value === formValues.TaxType)?.description ||
                          "Custom tax type"}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Pricing Section */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-emerald-500"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2v20M2 12h20" />
                  </svg>
                  Pricing
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Market Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Market Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceNew || ""}
                      onChange={handlePriceChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* DOC 40% - Auto calculated */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      DOC 40% (Auto)
                    </label>
                    <div className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium">
                      {formatCurrency(derivedPrices.Price40)}
                    </div>
                  </div>

                  {/* Vehicles 70% - Auto calculated */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Vehicles 70% (Auto)
                    </label>
                    <div className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium">
                      {formatCurrency(derivedPrices.Price70)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Meta Info */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-emerald-500"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Meta Information
                </h3>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Vehicle ID:</span>
                      <span className="ml-2 font-mono text-gray-900 dark:text-white">
                        {vehicle.VehicleId}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Created:</span>
                      <span className="ml-2 font-mono text-gray-900 dark:text-white">
                        {formatVehicleTime(vehicle.Time)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Sticky Footer Actions */}
              <div className="sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:-mb-6 mt-8 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 p-4 md:p-6 rounded-b-2xl">
                <div className="flex flex-col sm:flex-row gap-3">
                  <GlassButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isSaving}
                    disabled={!hasChanges}
                    className="order-1 sm:order-2"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </GlassButton>
                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={handleClose}
                    disabled={isSaving}
                    className="order-2 sm:order-1"
                  >
                    Cancel
                  </GlassButton>
                </div>
                {hasChanges && (
                  <p className="text-center text-sm text-amber-600 mt-2">
                    You have unsaved changes
                  </p>
                )}
              </div>
            </form>
          </GlassCard>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        imageUrl={imageUrl || ""}
        alt={`${vehicle.Brand} ${vehicle.Model}`}
        onClose={() => setIsImageModalOpen(false)}
      />
    </>
  );
}
