"use client";

import React, { useState, useCallback, useEffect } from "react";
import { GlassField } from "../ui/GlassField";
import { SectionCard } from "../ui/SectionCard";
import { GlassButton } from "../ui/GlassButton";
import { formatCurrency, formatFileSize } from "@/lib/format";
import { derivePrices } from "@/lib/pricing";
import { compressImage, formatFileSize as formatImageSize } from "@/lib/compressImage";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
import type { Vehicle } from "@/lib/types";
import {
  COLOR_OPTIONS,
  TAX_TYPE_METADATA,
  PLATE_NUMBER_MAX_LENGTH,
  PLATE_NUMBER_HINTS,
} from "@/lib/types";

const CATEGORY_OPTIONS = ["Cars", "Motorcycles", "Tuk Tuk"] as const;

interface VehicleFormProps {
  vehicle: Vehicle;
  onSubmit: (data: Partial<Vehicle>, imageFile: File | null) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError: string | null;
  onClearError: () => void;
}

interface FormErrors {
  [key: string]: string;
}

export function VehicleForm({
  vehicle,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
  onClearError,
}: VehicleFormProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<Vehicle>>(vehicle);
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Track changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(vehicle) || uploadedImageFile !== null;

  // Update form when vehicle changes
  useEffect(() => {
    setFormData(vehicle);
    setUploadedImageFile(null);
    setErrors({});
    setTouched({});
  }, [vehicle.VehicleId, vehicle.Image]); // Re-initialize when vehicle ID or image changes


  // Clear submit error when form changes
  useEffect(() => {
    if (submitError) {
      onClearError();
    }
  }, [formData, uploadedImageFile, onClearError, submitError]);

  // Handle field changes
  const handleChange = useCallback((field: keyof Vehicle, value: string | number | null) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      
      // Auto-calculate derived prices when PriceNew changes
      if (field === "PriceNew") {
        const priceNew = typeof value === "number" && value > 0 ? value : null;
        const derived = derivePrices(priceNew);
        next.Price40 = derived.Price40;
        next.Price70 = derived.Price70;
      }
      
      return next;
    });

    // Clear error for this field when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }, [errors]);

  // Handle field blur for validation
  const handleBlur = useCallback((field: keyof Vehicle) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  }, [formData]);

  // Validate a single field
  const validateField = useCallback((field: keyof Vehicle, value: unknown): boolean => {
    let error = "";

    switch (field) {
      case "Brand":
        if (!value || String(value).trim() === "") {
          error = "Brand is required";
        }
        break;
      case "Model":
        if (!value || String(value).trim() === "") {
          error = "Model is required";
        }
        break;
      case "Category":
        if (!value || String(value).trim() === "") {
          error = "Category is required";
        }
        break;
      case "Year":
        if (value !== null && value !== undefined && value !== "") {
          const year = Number(value);
          const currentYear = new Date().getFullYear() + 2;
          if (isNaN(year) || year < 1900 || year > currentYear) {
            error = `Year must be between 1900 and ${currentYear}`;
          }
        }
        break;
      case "PriceNew":
        if (value !== null && value !== undefined && value !== "") {
          const price = Number(value);
          if (isNaN(price) || price < 0) {
            error = "Price must be a positive number";
          }
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  }, []);

  // Validate all required fields
  const validateForm = useCallback((): boolean => {
    const requiredFields: (keyof Vehicle)[] = ["Brand", "Model", "Category"];
    let isValid = true;

    requiredFields.forEach((field) => {
      if (!validateField(field, formData[field])) {
        isValid = false;
      }
    });

    // Also validate Year and Price if provided
    if (formData.Year !== null && formData.Year !== undefined) {
      if (!validateField("Year", formData.Year)) {
        isValid = false;
      }
    }

    if (formData.PriceNew !== null && formData.PriceNew !== undefined) {
      if (!validateField("PriceNew", formData.PriceNew)) {
        isValid = false;
      }
    }

    return isValid;
  }, [formData, validateField]);

  // Handle image file upload
  const handleImageFile = useCallback(async (file: File | null) => {
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, Image: "Please select an image file" }));
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, Image: "Image too large (max 5MB)" }));
      return;
    }

    setImageLoading(true);
    setErrors((prev) => ({ ...prev, Image: "" }));
    
    try {
      // For large files (>1MB), use object URL to avoid memory issues
      // For smaller files, use data URL for preview
      let previewUrl: string;
      if (file.size > 1024 * 1024) {
        previewUrl = URL.createObjectURL(file);
      } else {
        previewUrl = await fileToDataUrl(file);
      }
      
      setFormData((prev) => ({ ...prev, Image: previewUrl }));
      setUploadedImageFile(file);
    } catch (err) {
      setErrors((prev) => ({ 
        ...prev, 
        Image: err instanceof Error ? err.message : "Failed to load image" 
      }));
    } finally {
      setImageLoading(false);
    }
  }, []);

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
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
  }, [handleImageFile]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!validateForm()) {
      return;
    }

    await onSubmit(formData, uploadedImageFile);
  }, [formData, uploadedImageFile, onSubmit, validateForm]);

  // Handle remove image
  const handleRemoveImage = useCallback(() => {
    setFormData((prev) => ({ ...prev, Image: "" }));
    setUploadedImageFile(null);
  }, []);

  // Derived prices for display
  const derivedPrices = derivePrices(formData.PriceNew);

  // Category options with current value if not in standard list
  const categoryValue = formData.Category || "";
  const categoryOptions =
    categoryValue && !CATEGORY_OPTIONS.includes(categoryValue as (typeof CATEGORY_OPTIONS)[number])
      ? [categoryValue, ...CATEGORY_OPTIONS]
      : [...CATEGORY_OPTIONS];

  // Icons for sections
  const icons = {
    image: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    ),
    basic: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
    specs: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    pricing: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20M2 12h20" />
      </svg>
    ),
  };

  return (
    <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-6">
      {/* Image Section */}
      <SectionCard title="Vehicle Image" icon={icons.image}>
        {formData.Image ? (
          <div className="space-y-4">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={formData.Image}
                alt="Vehicle"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <label htmlFor="vehicle-image-replace" className="flex-1 cursor-pointer pointer-events-auto">
                <input
                  id="vehicle-image-replace"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  disabled={imageLoading || isSubmitting}
                />
                <div className="w-full px-4 py-2.5 bg-white/5 dark:bg-white/5 border border-white/20 dark:border-white/20 rounded-xl text-center cursor-pointer hover:bg-white/10 dark:hover:bg-white/10 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
                  Replace Image
                </div>
              </label>

              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={imageLoading || isSubmitting}
                className="px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-sm font-medium border border-red-200 dark:border-red-800"
              >
                Remove
              </button>
            </div>
            {imageLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Compressing image...
              </p>
            )}
            {uploadedImageFile && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Ready: {formatImageSize(uploadedImageFile.size)}
              </p>
            )}
            {errors.Image && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.Image}</p>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-white/20 dark:border-white/20 rounded-xl p-8 text-center bg-white/5 dark:bg-white/5">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 dark:bg-white/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-gray-400">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No image uploaded
            </p>
            <input
              id="vehicle-image-upload"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
              className="hidden"
              disabled={imageLoading || isSubmitting}
            />
            <label
              htmlFor="vehicle-image-upload"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_4px_14px_rgba(5,150,105,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.45)] hover:brightness-105 border border-emerald-500/30 transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer pointer-events-auto"
            >
              Upload Image
            </label>


            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Or paste image URL</p>
              <GlassField
                label=""
                type="url"
                value={formData.Image || ""}
                onChange={(e) => handleChange("Image", e.target.value)}
                onBlur={() => handleBlur("Image")}
                placeholder="https://..."
                disabled={isSubmitting}
              />
            </div>
            {uploadedImageFile && formData.Image && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                ⚠️ Both file and URL set. File upload will be used.
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Basic Information */}
      <SectionCard title="Basic Information" icon={icons.basic}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassField
            label="Brand"
            value={formData.Brand || ""}
            onChange={(e) => handleChange("Brand", e.target.value)}
            onBlur={() => handleBlur("Brand")}
            error={touched.Brand ? errors.Brand : undefined}
            required
            disabled={isSubmitting}
            placeholder="e.g. Toyota"
          />
          <GlassField
            label="Model"
            value={formData.Model || ""}
            onChange={(e) => handleChange("Model", e.target.value)}
            onBlur={() => handleBlur("Model")}
            error={touched.Model ? errors.Model : undefined}
            required
            disabled={isSubmitting}
            placeholder="e.g. Camry"
          />
          <GlassField
            label="Category"
            as="select"
            value={formData.Category || ""}
            onChange={(e) => handleChange("Category", e.target.value)}
            onBlur={() => handleBlur("Category")}
            error={touched.Category ? errors.Category : undefined}
            required
            disabled={isSubmitting}
          >
            <option value="">Select category</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </GlassField>
          <GlassField
            label="Plate Number"
            value={formData.Plate || ""}
            onChange={(e) => handleChange("Plate", e.target.value.toUpperCase())}
            maxLength={PLATE_NUMBER_MAX_LENGTH}
            placeholder={`e.g. ${PLATE_NUMBER_HINTS[0]}`}
            disabled={isSubmitting}
            className="font-mono uppercase"
          />
          <GlassField
            label="Year"
            type="number"
            value={formData.Year || ""}
            onChange={(e) => handleChange("Year", e.target.value === "" ? null : parseInt(e.target.value))}
            onBlur={() => handleBlur("Year")}
            error={touched.Year ? errors.Year : undefined}
            disabled={isSubmitting}
            placeholder="e.g. 2023"
          />
        </div>
      </SectionCard>

      {/* Specifications */}
      <SectionCard title="Specifications" icon={icons.specs}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassField
            label="Color"
            list="colorsList"
            value={formData.Color || ""}
            onChange={(e) => handleChange("Color", e.target.value)}
            disabled={isSubmitting}
            placeholder="Type or select color"
          />
          <datalist id="colorsList">
            {COLOR_OPTIONS.map((color) => (
              <option key={color.value} value={color.value} />
            ))}
          </datalist>
          <GlassField
            label="Condition"
            value={formData.Condition || ""}
            onChange={(e) => handleChange("Condition", e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g. New, Used, Excellent"
          />
          <GlassField
            label="Body Type"
            value={formData.BodyType || ""}
            onChange={(e) => handleChange("BodyType", e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g. Sedan, SUV, Truck"
          />
          <GlassField
            label="Tax Type"
            list="taxTypesList"
            value={formData.TaxType || ""}
            onChange={(e) => handleChange("TaxType", e.target.value)}
            disabled={isSubmitting}
            placeholder="Type or select tax type"
            helperText={formData.TaxType ? TAX_TYPE_METADATA.find((tt) => tt.value === formData.TaxType)?.description : undefined}
          />
          <datalist id="taxTypesList">
            {TAX_TYPE_METADATA.map((tt) => (
              <option key={tt.value} value={tt.label} />
            ))}
          </datalist>
        </div>
      </SectionCard>

      {/* Pricing */}
      <SectionCard title="Pricing" icon={icons.pricing}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassField
            label="Market Price"
            type="number"
            step="0.01"
            min="0"
            value={formData.PriceNew || ""}
            onChange={(e) => handleChange("PriceNew", e.target.value === "" ? null : parseFloat(e.target.value))}
            onBlur={() => handleBlur("PriceNew")}
            error={touched.PriceNew ? errors.PriceNew : undefined}
            disabled={isSubmitting}
            placeholder="0.00"
          />
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              DOC 40% (Auto)
            </label>
            <div className="w-full h-11 px-4 flex items-center bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 font-medium">
              {formatCurrency(derivedPrices.Price40)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Vehicles 70% (Auto)
            </label>
            <div className="w-full h-11 px-4 flex items-center bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 font-medium">
              {formatCurrency(derivedPrices.Price70)}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Submit Error */}
      {submitError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {submitError}
          </p>
        </div>
      )}

      {/* Sticky Footer */}
      <div className="sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:-mb-6 mt-8 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 p-4 md:p-6 rounded-b-2xl">
        <div className="flex flex-col sm:flex-row gap-3">
          <GlassButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            disabled={!hasChanges || isSubmitting}
            className="order-1 sm:order-2"
          >
            {isSubmitting ? "Saving Changes..." : "Save Changes"}
          </GlassButton>
          <GlassButton
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onCancel}
            disabled={isSubmitting}
            className="order-2 sm:order-1"
          >
            Back
          </GlassButton>
        </div>
        {hasChanges && !isSubmitting && (
          <p className="text-center text-sm text-amber-600 dark:text-amber-400 mt-2">
            You have unsaved changes
          </p>
        )}
      </div>
    </form>
  );
}
