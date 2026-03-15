"use client";

import React, { useState, useCallback, useEffect } from "react";
import { GlassField } from "../ui/GlassField";
import { SectionCard } from "../ui/SectionCard";
import { GlassButton } from "../ui/GlassButton";
import { ImageInput } from "../ui/ImageInput";
import { formatCurrency } from "@/lib/format";
import { derivePrices } from "@/lib/pricing";
import { formatFileSize as formatImageSize } from "@/lib/compressImage";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
// Note: processImageForUpload and compressImage available if needed for advanced compression
// import { processImageForUpload, compressImage } from "@/lib/clientImageCompression";
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
  /** When true, renders as a modal with overlay and close button */
  isModal?: boolean;
  /** Modal title (only used when isModal is true) */
  modalTitle?: string;
}

interface FormErrors {
  [key: string]: string;
}

/**
 * Helper function to sanitize numeric input values
 * Converts empty strings, undefined, NaN to null
 * Returns a valid number or null
 */
function sanitizeNumericInput(value: unknown): number | null {
  // Handle null, undefined, empty string
  if (value === null || value === undefined || value === "") {
    return null;
  }
  
  // Handle number type
  if (typeof value === "number") {
    // Check for NaN
    if (Number.isNaN(value)) {
      return null;
    }
    return value;
  }
  
  // Handle string type
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "undefined" || trimmed === "NaN") {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return parsed;
  }
  
  return null;
}

/**
 * Helper function to sanitize vehicle data before submission
 * Ensures all numeric fields are strictly numbers or null
 */
function sanitizeVehicleDataForSubmit(data: Partial<Vehicle>): Partial<Vehicle> {
  const sanitized = { ...data };
  
  // Sanitize Year
  sanitized.Year = sanitizeNumericInput(data.Year);
  
  // Sanitize PriceNew
  sanitized.PriceNew = sanitizeNumericInput(data.PriceNew);
  
  // Sanitize derived prices
  sanitized.Price40 = sanitizeNumericInput(data.Price40);
  sanitized.Price70 = sanitizeNumericInput(data.Price70);
  
  // Remove any remaining undefined values from the object
  Object.keys(sanitized).forEach((key) => {
    const k = key as keyof Vehicle;
    if (sanitized[k] === undefined) {
      delete sanitized[k];
    }
  });
  
  return sanitized;
}

export function VehicleForm({
  vehicle,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
  onClearError,
  isModal = false,
  modalTitle = "Edit Vehicle",
}: VehicleFormProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<Vehicle>>(vehicle);
  const [uploadedImage, setUploadedImage] = useState<File | string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  // OPTIMISTIC UI: State for compressed image preview
  const [compressedPreview, setCompressedPreview] = useState<{
    url: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: string;
  } | null>(null);
  
  // Mark isCompressing as used to prevent ESLint warning
  // This will be used when image compression is implemented
  void setIsCompressing;

  // Track changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(vehicle) || uploadedImage !== null;

  // Update form when vehicle changes
  useEffect(() => {
    setFormData(vehicle);
    setUploadedImage(null);
    setErrors({});
    setTouched({});
    // Clear compressed preview when vehicle changes
    setCompressedPreview(null);
  }, [vehicle]); // Re-initialize when vehicle changes

  // Effect to handle image URL updates from server after save
  useEffect(() => {
    // If we have a vehicle.Image from server (Cloudinary URL) and it's different from current preview
    if (vehicle.Image && typeof vehicle.Image === 'string' && vehicle.Image.startsWith('http')) {
      // Check if current formData.Image is a local blob/data URL that needs updating
      const currentImage = formData.Image;
      if (currentImage && (currentImage.startsWith('blob:') || currentImage.startsWith('data:'))) {
        console.log('[VehicleForm] Updating image from local preview to server URL:', vehicle.Image);
        setFormData(prev => ({ ...prev, Image: vehicle.Image }));
      }
    }
  }, [vehicle.Image, formData.Image]);


  // Clear submit error when form changes
  useEffect(() => {
    if (submitError) {
      onClearError();
    }
  }, [formData, uploadedImage, onClearError, submitError]);

  // Handle field changes
  const handleChange = useCallback((field: keyof Vehicle, value: string | number | null) => {
    // Sanitize numeric fields immediately on change
    let sanitizedValue: string | number | null = value;
    if (field === "Year" || field === "PriceNew") {
      sanitizedValue = sanitizeNumericInput(value);
    }
    
    setFormData((prev) => {
      const next = { ...prev, [field]: sanitizedValue };
      
      // Auto-calculate derived prices when PriceNew changes
      if (field === "PriceNew") {
        const priceNew = sanitizedValue as number | null;
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

  // Validate a single field - defined first to avoid hoisting issues
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

  // Handle field blur for validation
  const handleBlur = useCallback((field: keyof Vehicle) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  }, [formData, validateField]);

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

  // Handle image file upload - ONLY method now
  // Note: This function is kept for future use but currently handled by ImageInput component
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleImageFile = useCallback(async (file: File | null) => {
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
      setUploadedImage(file);
    } catch (err) {
      setErrors((prev) => ({ 
        ...prev, 
        Image: err instanceof Error ? err.message : "Failed to load image" 
      }));
    } finally {
      setImageLoading(false);
    }
  }, []);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup any object URLs when component unmounts
      const currentImage = formData.Image;
      if (currentImage && currentImage.startsWith("blob:")) {
        URL.revokeObjectURL(currentImage);
      }
    };
  }, [formData.Image]);

  // Helper to convert data URL to File
  const dataUrlToFile = useCallback((dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }, []);

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

    // Handle both File and URL image updates
    let imageFile: File | null = null;
    let imageUrl: string | null = null;
    
    if (uploadedImage instanceof File) {
      // File upload case - use the file directly
      console.log(`[VehicleForm] Using File object for upload: ${uploadedImage.name} (${formatImageSize(uploadedImage.size)})`);
      imageFile = uploadedImage;
    } else if (typeof uploadedImage === "string" && uploadedImage.startsWith("data:image/")) {
      // Data URL case - convert back to File for Cloudinary upload
      console.log(`[VehicleForm] Converting data URL to File for upload...`);
      try {
        const fileFromDataUrl = dataUrlToFile(uploadedImage, `vehicle_image_${Date.now()}.jpg`);
        console.log(`[VehicleForm] Data URL converted to File:`, {
          size: formatImageSize(fileFromDataUrl.size),
          type: fileFromDataUrl.type
        });
        imageFile = fileFromDataUrl;
      } catch (conversionError) {
        console.error(`[VehicleForm] Failed to convert data URL to File:`, conversionError);
        // Fall back to passing the data URL (though this won't work for Cloudinary)
        imageUrl = uploadedImage;
      }
    } else if (typeof uploadedImage === "string" && uploadedImage.trim() && (uploadedImage.startsWith("http://") || uploadedImage.startsWith("https://"))) {
      // HTTP URL case - pass URL in formData.Image
      console.log(`[VehicleForm] Using existing URL: ${uploadedImage.substring(0, 100)}...`);
      imageUrl = uploadedImage.trim();
    }
    
    // IMPORTANT: When we have a file upload, exclude the Image field from formData
    // to prevent data URLs from being sent to the API. The image will be handled
    // separately via the imageFile parameter.
    let submitData: Partial<Vehicle>;
    if (imageFile) {
      // File upload case - exclude Image field entirely
      const { Image, ...formDataWithoutImage } = formData;
      submitData = formDataWithoutImage;
      console.log("[VehicleForm] Excluding Image field for file upload");
    } else if (imageUrl) {
      // URL paste case - include the URL
      submitData = { ...formData, Image: imageUrl };
    } else {
      // No image change - use formData as-is
      submitData = formData;
    }
    
    // Sanitize the data before submission to ensure no undefined/NaN values
    const sanitizedSubmitData = sanitizeVehicleDataForSubmit(submitData);
    
    console.log("[VehicleForm] Submitting sanitized data:", {
      hasImageFile: !!imageFile,
      hasImageUrl: !!imageUrl,
      excludedImageField: imageFile ? "data URL excluded" : "N/A",
      year: sanitizedSubmitData.Year,
      priceNew: sanitizedSubmitData.PriceNew
    });
    
    await onSubmit(sanitizedSubmitData, imageFile);
  }, [formData, uploadedImage, onSubmit, validateForm]);

  // Handle remove image
  const handleRemoveImage = useCallback(() => {
    setFormData((prev) => ({ ...prev, Image: "" }));
    setUploadedImage(null);
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

  // Form content
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Section - Full Featured with ImageInput */}
      <SectionCard title="Vehicle Image" icon={icons.image}>
        <ImageInput
          value={formData.Image?.trim() || null}
          onChange={async (value) => {
            if (!value) {
              handleRemoveImage();
              return;
            }
            // Handle URL or data URL
            if (value.startsWith("http") || value.startsWith("data:")) {
              setFormData((prev) => ({ ...prev, Image: value }));
              setUploadedImage(value);
              setErrors((prev) => ({ ...prev, Image: "" }));
            }
          }}
          label="Vehicle Image"
          helperText="Drag & drop, click to upload, paste URL, or Ctrl+V to paste image"
          disabled={imageLoading || isSubmitting}
          maxSizeMB={5}
        />
        {imageLoading && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing image...
          </p>
        )}
        {uploadedImage instanceof File && (
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
            Ready: {formatImageSize(uploadedImage.size)}
          </p>
        )}
        
        {/* OPTIMISTIC UI: Compressed Image Preview */}
        {compressedPreview && isCompressing && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-700 flex-shrink-0">
                <img 
                  src={compressedPreview.url} 
                  alt="Compressed preview" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-emerald-500/20 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Optimizing image...
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatImageSize(compressedPreview.originalSize)} → {formatImageSize(compressedPreview.compressedSize)} 
                  <span className="font-medium ml-1">(-{compressedPreview.compressionRatio})</span>
                </p>
              </div>
            </div>
          </div>
        )}
        
        {errors.Image && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.Image}</p>
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
            isLoading={isSubmitting || isCompressing}
            disabled={!hasChanges || isSubmitting || isCompressing}
            className="order-1 sm:order-2"
          >
            {isCompressing ? "Processing Image..." : isSubmitting ? "Saving Changes..." : "Save Changes"}
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
            {isModal ? "Cancel" : "Back"}
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

  // Render with modal wrapper if isModal is true
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
        <div className="min-h-screen px-4 py-4 md:py-8">
          <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 bg-gradient-to-br from-white/70 via-emerald-100/20 via-red-50/10 via-emerald-50/15 to-white/70 dark:from-white/8 dark:via-emerald-500/15 dark:via-red-900/8 dark:via-emerald-900/12 dark:to-white/8 rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4 md:p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {modalTitle}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {vehicle.Brand} {vehicle.Model} • {vehicle.Plate}
                  </p>
                </div>
                <button
                  onClick={onCancel}
                  disabled={isSubmitting}
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
            <div className="p-4 md:p-6">
              {formContent}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular inline form
  return formContent;
}
