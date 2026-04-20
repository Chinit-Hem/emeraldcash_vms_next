/**
 * useVehicleForm - Custom Hook for Vehicle Form State Management
 * 
 * Extracts all shared form logic (state management, validation, handlers)
 * into a single reusable hook. Implements performance optimizations to
 * prevent unnecessary re-renders.
 * 
 * @module useVehicleForm
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";

// ============================================================================
// Debounce Hook
// ============================================================================

/**
 * useDebounce - Debounce hook for form field validation
 * Prevents excessive validation during rapid typing
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
import type { Vehicle } from "@/lib/types";
import { derivePrices } from "@/lib/pricing";
import { fileToDataUrl } from "@/lib/fileToDataUrl";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Form field validation error
 */
export interface FormErrors {
  [key: string]: string;
}

/**
 * Touched fields tracking
 */
export interface TouchedFields {
  [key: string]: boolean;
}

/**
 * Return type for useVehicleForm hook
 */
export interface UseVehicleFormReturn {
  // State
  formData: Partial<Vehicle>;
  errors: FormErrors;
  touched: TouchedFields;
  uploadedImage: File | string | null;
  imageLoading: boolean;
  isSubmitting: boolean;
  hasChanges: boolean;
  derivedPrices: { Price40: number | null; Price70: number | null };
  
  // Actions
  setFormData: React.Dispatch<React.SetStateAction<Partial<Vehicle>>>;
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
  setTouched: React.Dispatch<React.SetStateAction<TouchedFields>>;
  handleChange: (field: keyof Vehicle, value: string | number | null) => void;
  handleBlur: (field: keyof Vehicle) => void;
  handleImageChange: (image: File | string | null) => Promise<void>;
  handleRemoveImage: () => void;
  validateField: (field: keyof Vehicle, value: unknown) => boolean;
  validateForm: () => boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  clearError: (field: keyof Vehicle) => void;
  
  // Metadata
  categoryOptions: string[];
  isValid: boolean;
}

/**
 * Options for useVehicleForm hook
 */
export interface UseVehicleFormOptions {
  initialVehicle: Vehicle;
  onSubmit: (data: Partial<Vehicle>, imageFile: File | null) => Promise<void>;
  onError?: (error: Error) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_OPTIONS = ["Cars", "Motorcycles", "Tuk Tuk"] as const;
const REQUIRED_FIELDS: (keyof Vehicle)[] = ["Brand", "Model", "Category"];

// ============================================================================
// Custom Hook Implementation
// ============================================================================

/**
 * useVehicleForm - Manages all vehicle form state and logic
 * 
 * Performance optimizations:
 * - useCallback for all handlers to prevent child re-renders
 * - useMemo for computed values
 * - useRef for tracking previous values without causing re-renders
 */
export function useVehicleForm(options: UseVehicleFormOptions): UseVehicleFormReturn {
  const { initialVehicle, onSubmit, onError, validateOnChange = false, validateOnBlur = true } = options;
  
  // Form state
  const [formData, setFormData] = useState<Partial<Vehicle>>(initialVehicle);
  const [uploadedImage, setUploadedImage] = useState<File | string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  
  // Refs for tracking without causing re-renders
  const initialVehicleRef = useRef(initialVehicle);
  const submitAttemptedRef = useRef(false);
  
  // Update form when initial vehicle changes (but not on every render)
  // We intentionally only check VehicleId to avoid unnecessary resets
  useEffect(() => {
    if (initialVehicle.VehicleId !== initialVehicleRef.current.VehicleId) {
      setFormData(initialVehicle);
      setUploadedImage(null);
      setErrors({});
      setTouched({});
      initialVehicleRef.current = initialVehicle;
      submitAttemptedRef.current = false;
    }
    // Only depend on VehicleId, not the entire initialVehicle object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVehicle.VehicleId]);
  
  // Compute derived prices
  const derivedPrices = useMemo(() => {
    return derivePrices(formData.PriceNew);
  }, [formData.PriceNew]);
  
  // Check if form has changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialVehicleRef.current) || 
           uploadedImage !== null;
  }, [formData, uploadedImage]);
  
  // Check overall form validity
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);
  
  // Category options with current value if not in standard list
  const categoryOptions = useMemo(() => {
    const currentCategory = formData.Category || "";
    const isStandard = CATEGORY_OPTIONS.includes(currentCategory as typeof CATEGORY_OPTIONS[number]);
    return isStandard ? [...CATEGORY_OPTIONS] : [currentCategory, ...CATEGORY_OPTIONS];
  }, [formData.Category]);
  
  /**
   * Validate a single field
   */
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
      case "Plate":
        if (value && String(value).trim()) {
          // Validate plate format (e.g., 1A-1234)
          const platePattern = /^[0-9]{1,2}[A-Z]-[0-9]{4}$/;
          if (!platePattern.test(String(value).trim())) {
            error = "Format: 1A-1234";
          }
        }
        break;
    }
    
    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  }, []);
  
  /**
   * Clear error for a specific field
   */
  const clearError = useCallback((field: keyof Vehicle) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);
  
  /**
   * Handle field changes with price auto-calculation
   */
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
    
    // Clear error when user types
    if (errors[field]) {
      clearError(field);
    }
    
    // Validate on change if enabled
    if (validateOnChange) {
      validateField(field, value);
    }
  }, [errors, clearError, validateField, validateOnChange]);
  
  /**
   * Handle field blur for validation
   */
  const handleBlur = useCallback((field: keyof Vehicle) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    
    if (validateOnBlur) {
      validateField(field, formData[field]);
    }
  }, [formData, validateField, validateOnBlur]);
  
  /**
   * Handle image change - supports both File and URL string
   */
  const handleImageChange = useCallback(async (image: File | string | null) => {
    if (!image) return;
    
    // Handle URL string
    if (typeof image === "string") {
      setImageLoading(true);
      clearError("Image");
      
      try {
        // Test if image loads
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("Failed to load image from URL"));
          img.src = image;
        });
        
        setFormData((prev) => ({ ...prev, Image: image }));
        setUploadedImage(image);
      } catch (err) {
        setErrors((prev) => ({ 
          ...prev, 
          Image: err instanceof Error ? err.message : "Invalid image URL" 
        }));
      } finally {
        setImageLoading(false);
      }
      return;
    }
    
    // Handle File
    if (!image.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, Image: "Please select an image file" }));
      return;
    }
    
    if (image.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, Image: "Image too large (max 5MB)" }));
      return;
    }
    
    setImageLoading(true);
    clearError("Image");
    
    try {
      // For large files (>1MB), use object URL to avoid memory issues
      // For smaller files, use data URL for preview
      let previewUrl: string;
      if (image.size > 1024 * 1024) {
        previewUrl = URL.createObjectURL(image);
      } else {
        previewUrl = await fileToDataUrl(image);
      }
      
      setFormData((prev) => ({ ...prev, Image: previewUrl }));
      setUploadedImage(image);
    } catch (err) {
      setErrors((prev) => ({ 
        ...prev, 
        Image: err instanceof Error ? err.message : "Failed to load image" 
      }));
    } finally {
      setImageLoading(false);
    }
  }, [clearError]);
  
  /**
   * Handle remove image
   */
  const handleRemoveImage = useCallback(() => {
    setFormData((prev) => ({ ...prev, Image: "" }));
    setUploadedImage(null);
    clearError("Image");
  }, [clearError]);
  
  /**
   * Validate all required fields
   */
  const validateForm = useCallback((): boolean => {
    let isValid = true;
    
    // Validate required fields
    REQUIRED_FIELDS.forEach((field) => {
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
    
    // Validate plate if provided
    if (formData.Plate) {
      if (!validateField("Plate", formData.Plate)) {
        isValid = false;
      }
    }
    
    // Mark all fields as touched
    const allTouched: TouchedFields = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);
    
    return isValid;
  }, [formData, validateField]);
  
  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    submitAttemptedRef.current = true;
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Extract File from uploadedImage if it's a File, otherwise null
      const imageFile = uploadedImage instanceof File ? uploadedImage : null;
      await onSubmit(formData, imageFile);
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
      // Error logging removed for production
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, uploadedImage, onSubmit, onError, validateForm]);
  
  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData(initialVehicleRef.current);
    setUploadedImage(null);
    setErrors({});
    setTouched({});
    submitAttemptedRef.current = false;
  }, []);
  
  return {
    // State
    formData,
    errors,
    touched,
    uploadedImage,
    imageLoading,
    isSubmitting,
    hasChanges,
    derivedPrices,
    
    // Actions
    setFormData,
    setErrors,
    setTouched,
    handleChange,
    handleBlur,
    handleImageChange,
    handleRemoveImage,
    validateField,
    validateForm,
    handleSubmit,
    resetForm,
    clearError,
    
    // Metadata
    categoryOptions,
    isValid,
  };
}

// ============================================================================
// Export Types
// ============================================================================

export { CATEGORY_OPTIONS, REQUIRED_FIELDS };

// Re-export Vehicle type for convenience
export type { Vehicle } from "@/lib/types";
