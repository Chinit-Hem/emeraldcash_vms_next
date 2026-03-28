"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { ImageInput } from "@/components/ui/ImageInput";
import { derivePrices } from "@/lib/pricing";
import { formatFileSize as formatImageSize } from "@/lib/compressImage";
import { base64ToBlob } from "@/lib/base64ToBlob";
import type { Vehicle } from "@/lib/types";
import {
  COLOR_OPTIONS,
  PLATE_NUMBER_MAX_LENGTH,
} from "@/lib/types";
import { useVehicleFormNeon } from "./useVehicleFormNeon";
import { useToast } from "@/components/ui/glass/GlassToast";
import { cn } from "@/lib/ui";
import {
  Car,
  Bike,
  X,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  DollarSign,
  Wrench,
  Tag,
  Calendar,
  Palette,
  FileText,
  Sparkles,
} from "lucide-react";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  [key: string]: string;
}

type CategoryOption = "Cars" | "Motorcycles" | "Tuk Tuk";

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_OPTIONS: { value: CategoryOption; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "Cars",
    label: "Cars",
    icon: <Car className="w-6 h-6" />,
    color: "#3b82f6",
  },
  {
    value: "Motorcycles",
    label: "Motorcycles",
    icon: <Bike className="w-6 h-6" />,
    color: "#8b5cf6",
  },
  {
    value: "Tuk Tuk",
    label: "TukTuks",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M6 18h12" />
        <path d="M3 12h18v6H3z" />
        <path d="M12 12V8" />
        <path d="M8 8h8" />
        <path d="M10 8V4h4v4" />
      </svg>
    ),
    color: "#f97316",
  },
];

const INITIAL_FORM_DATA: Partial<Vehicle> = {
  Category: "Cars",
  Brand: "",
  Model: "",
  Year: null,
  Plate: "",
  PriceNew: null,
  Price40: null,
  Price70: null,
  TaxType: "",
  Condition: "",
  BodyType: "",
  Color: "",
  Image: "",
  Description: "",
};

// ============================================================================
// UI Components
// ============================================================================

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function ModalContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          {title}
        </h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        className="w-10 h-10 rounded-xl bg-white shadow-md hover:shadow-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all duration-200 hover:rotate-90"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function FormSection({ title, icon: Icon, children, className }: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-emerald-600" />
        </div>
        <h3 className="font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, icon: Icon, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          {label}
          {props.required && <span className="text-red-500">*</span>}
        </label>
        <div className={cn(
          "relative flex items-center",
          "bg-white rounded-xl",
          "shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
          isFocused 
            ? "shadow-[0_4px_16px_rgba(16,185,129,0.15)] ring-2 ring-emerald-100"
            : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
          "transition-all duration-200",
          error && "ring-2 ring-red-100 shadow-[0_4px_16px_rgba(239,68,68,0.1)]"
        )}>
          <input
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "w-full px-3 py-2.5 bg-transparent border-none outline-none rounded-xl",
              "text-slate-800 placeholder-slate-400",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  options: { value: string; label: string }[];
}

const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, icon: Icon, options, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          {label}
          {props.required && <span className="text-red-500">*</span>}
        </label>
        <div className={cn(
          "relative",
          "bg-white rounded-xl",
          "shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
          isFocused 
            ? "shadow-[0_4px_16px_rgba(16,185,129,0.15)] ring-2 ring-emerald-100"
            : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
          "transition-all duration-200",
          error && "ring-2 ring-red-100 shadow-[0_4px_16px_rgba(239,68,68,0.1)]"
        )}>
          <select
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "w-full px-3 py-2.5 bg-transparent border-none outline-none appearance-none rounded-xl",
              "text-slate-800",
              "cursor-pointer",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormSelect.displayName = "FormSelect";

interface FormComboboxProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  icon?: React.ComponentType<{ className?: string }>;
  error?: string;
}

const FormCombobox = React.forwardRef<HTMLInputElement, FormComboboxProps>(
  ({ label, placeholder, value, onChange, options, icon: Icon, error }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const id = React.useId();
    
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          {label}
        </label>
        <div className={cn(
          "relative flex items-center",
          "bg-white rounded-xl",
          "shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
          isFocused 
            ? "shadow-[0_4px_16px_rgba(16,185,129,0.15)] ring-2 ring-emerald-100"
            : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
          "transition-all duration-200",
          error && "ring-2 ring-red-100 shadow-[0_4px_16px_rgba(239,68,68,0.1)]"
        )}>
          <input
            ref={ref}
            list={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={cn(
              "w-full px-3 py-2.5 bg-transparent border-none outline-none rounded-xl",
              "text-slate-800 placeholder-slate-400"
            )}
          />
          <datalist id={id}>
            {options.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormCombobox.displayName = "FormCombobox";

function CategorySelector({
  value, 
  onChange, 
  error 
}: { 
  value: string; 
  onChange: (value: CategoryOption) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">Category</label>
      <div className="grid grid-cols-3 gap-3">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
              value === cat.value
                ? "border-emerald-500 bg-emerald-50/50 shadow-md"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            )}
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
              style={{ 
                backgroundColor: value === cat.value ? `${cat.color}20` : '#f1f5f9',
                color: cat.color 
              }}
            >
              {cat.icon}
            </div>
            <span className={cn(
              "text-sm font-medium",
              value === cat.value ? "text-slate-800" : "text-slate-600"
            )}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AddVehicleModal({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  
  const [formData, setFormData] = useState<Partial<Vehicle>>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const { submitVehicle, isSubmitting, error: submitError, reset, clearError } = useVehicleFormNeon();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
      setImagePreview(null);
      setImageFile(null);
      setSubmitSuccess(false);
      reset();
    }
  }, [isOpen, reset]);

  // Use refs for toast functions to prevent infinite loops
  const toastSuccessRef = useRef(toastSuccess);
  const toastErrorRef = useRef(toastError);
  const onSuccessRef = useRef(onSuccess);
  const onCloseRef = useRef(onClose);
  
  // Keep refs updated
  useEffect(() => {
    toastSuccessRef.current = toastSuccess;
    toastErrorRef.current = toastError;
    onSuccessRef.current = onSuccess;
    onCloseRef.current = onClose;
  });

  // Handle success
  useEffect(() => {
    if (submitSuccess) {
      toastSuccessRef.current("Vehicle added successfully");
      onSuccessRef.current();
      onCloseRef.current();
    }
  }, [submitSuccess]);

  // Handle error - use ref to prevent infinite loop
  const hasShownErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (submitError && submitError !== hasShownErrorRef.current) {
      toastErrorRef.current(submitError);
      hasShownErrorRef.current = submitError;
    }
  }, [submitError]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.Brand?.trim()) {
      newErrors.Brand = "Brand is required";
    }
    if (!formData.Model?.trim()) {
      newErrors.Model = "Model is required";
    }
    if (!formData.Year || formData.Year < 1900 || formData.Year > new Date().getFullYear() + 1) {
      newErrors.Year = "Valid year is required";
    }
    if (!formData.Plate?.trim()) {
      newErrors.Plate = "Plate number is required";
    }
    if (!formData.PriceNew || formData.PriceNew <= 0) {
      newErrors.PriceNew = "Valid price is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof Vehicle, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const handlePriceChange = useCallback((value: string) => {
    const numValue = value ? parseFloat(value) : null;
    setFormData(prev => {
      const newData = { ...prev, PriceNew: numValue };
      if (numValue && numValue > 0) {
        const prices = derivePrices(numValue);
        newData.Price40 = prices.Price40;
        newData.Price70 = prices.Price70;
      }
      return newData;
    });
    if (errors.PriceNew) {
      setErrors(prev => ({ ...prev, PriceNew: undefined }));
    }
  }, [errors]);

  const handleImageChange = useCallback((value: string | null) => {
    if (value) {
      setImagePreview(value);
      // Convert base64 to File if needed using CSP-compliant method
      if (value.startsWith('data:')) {
        try {
          const blob = base64ToBlob(value);
          const file = new File([blob], 'vehicle-image.jpg', { type: blob.type });
          setImageFile(file);
        } catch (err) {
          console.error('[AddVehicleModal] Failed to convert base64 to file:', err);
          setImageFile(null);
        }
      } else {
        setImageFile(null);
      }
    } else {
      setImagePreview(null);
      setImageFile(null);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toastError("Please fix the errors in the form");
      return;
    }

    // Pass imageFile for uploaded images, or imagePreview for external URLs
    const imageToSubmit = imageFile || imagePreview || undefined;
    const result = await submitVehicle(formData as Vehicle, imageToSubmit, 'create');
    if (result.success) {
      setSubmitSuccess(true);
    }
  }, [validateForm, formData, imageFile, imagePreview, submitVehicle, toastError]);

  if (!isOpen) return null;

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalContainer>
        <form onSubmit={handleSubmit}>
          <ModalHeader 
            title="Add New Vehicle" 
            subtitle="Fill in the details below to add a new vehicle to your inventory"
            onClose={onClose}
          />
          
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Category Selection */}
            <CategorySelector
              value={formData.Category || "Cars"}
              onChange={(value) => handleInputChange("Category", value)}
              error={errors.Category}
            />

            {/* Basic Information */}
            <FormSection title="Basic Information" icon={Tag}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Brand"
                  placeholder="e.g., Toyota"
                  value={formData.Brand || ""}
                  onChange={(e) => handleInputChange("Brand", e.target.value)}
                  error={errors.Brand}
                  icon={Tag}
                  required
                />
                <FormInput
                  label="Model"
                  placeholder="e.g., Camry"
                  value={formData.Model || ""}
                  onChange={(e) => handleInputChange("Model", e.target.value)}
                  error={errors.Model}
                  required
                />
                <FormInput
                  label="Year"
                  type="number"
                  placeholder="e.g., 2023"
                  value={formData.Year || ""}
                  onChange={(e) => handleInputChange("Year", e.target.value ? parseInt(e.target.value) : null)}
                  error={errors.Year}
                  icon={Calendar}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  required
                />
                <FormInput
                  label="Plate Number"
                  placeholder="e.g., ABC-123"
                  value={formData.Plate || ""}
                  onChange={(e) => handleInputChange("Plate", e.target.value.toUpperCase())}
                  error={errors.Plate}
                  maxLength={PLATE_NUMBER_MAX_LENGTH}
                  required
                />
              </div>
            </FormSection>

            {/* Pricing */}
            <FormSection title="Pricing" icon={DollarSign}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                  label="New Price"
                  type="number"
                  placeholder="0.00"
                  value={formData.PriceNew || ""}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  error={errors.PriceNew}
                  icon={DollarSign}
                  required
                />
                <FormInput
                  label="40% Price"
                  type="number"
                  placeholder="Auto-calculated"
                  value={formData.Price40 || ""}
                  onChange={(e) => handleInputChange("Price40", e.target.value ? parseFloat(e.target.value) : null)}
                  disabled
                  className="bg-slate-50"
                />
                <FormInput
                  label="70% Price"
                  type="number"
                  placeholder="Auto-calculated"
                  value={formData.Price70 || ""}
                  onChange={(e) => handleInputChange("Price70", e.target.value ? parseFloat(e.target.value) : null)}
                  disabled
                  className="bg-slate-50"
                />
              </div>
            </FormSection>

            {/* Vehicle Details */}
            <FormSection title="Vehicle Details" icon={Wrench}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormCombobox
                  label="Condition"
                  placeholder="Select or type condition"
                  value={formData.Condition || ""}
                  onChange={(value) => handleInputChange("Condition", value)}
                  options={["New", "Used", "Certified Pre-Owned", "Other"]}
                  icon={CheckCircle2}
                />
                <FormCombobox
                  label="Tax Type"
                  placeholder="Select or type tax type"
                  value={formData.TaxType || ""}
                  onChange={(value) => handleInputChange("TaxType", value)}
                  options={["VAT", "Non-VAT", "Exempt", "Tax Paper", "Plate Number", "Other"]}
                  icon={FileText}
                />
                <FormCombobox
                  label="Body Type"
                  placeholder="Select or type body type"
                  value={formData.BodyType || ""}
                  onChange={(value) => handleInputChange("BodyType", value)}
                  options={["Sedan", "SUV", "Truck", "Van", "Coupe", "Hatchback", "Convertible", "Wagon", "Pickup", "Other"]}
                  icon={Car}
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-400" />
                    Color
                  </label>
                  <div className={cn(
                    "relative",
                    "bg-white rounded-xl",
                    "shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
                    "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
                    "focus-within:shadow-[0_4px_16px_rgba(16,185,129,0.15)] focus-within:ring-2 focus-within:ring-emerald-100",
                    "transition-all duration-200"
                  )}>
                    <select
                      value={formData.Color || ""}
                      onChange={(e) => handleInputChange("Color", e.target.value)}
                      className="w-full px-3 py-2.5 bg-transparent border-none outline-none appearance-none rounded-xl text-slate-800 cursor-pointer"
                    >
                      <option value="">Select color</option>
                      {COLOR_OPTIONS.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.value}
                        </option>
                      ))}
                    </select>
                    {/* Color indicator and dropdown arrow */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                      {formData.Color && (
                        <span 
                          className="w-4 h-4 rounded-full border border-slate-200 shadow-sm"
                          style={{ 
                            backgroundColor: COLOR_OPTIONS.find(c => c.value === formData.Color)?.hex || '#808080',
                            display: 'block'
                          }}
                        />
                      )}
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {/* Color swatches for quick selection */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {COLOR_OPTIONS.slice(0, 8).map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleInputChange("Color", color.value)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all duration-200",
                          formData.Color === color.value 
                            ? "border-emerald-500 scale-110 shadow-md" 
                            : "border-slate-200 hover:border-slate-300 hover:scale-105"
                        )}
                        style={{ backgroundColor: color.hex }}
                        title={color.value}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => handleInputChange("Color", "Other")}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-200",
                        formData.Color === "Other" 
                          ? "border-emerald-500 scale-110 shadow-md bg-slate-100 text-slate-700" 
                          : "border-slate-200 hover:border-slate-300 hover:scale-105 bg-slate-50 text-slate-500"
                      )}
                      title="Other"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Image Upload */}
            <FormSection title="Vehicle Image" icon={ImageIcon}>
              <div className={cn(
                "p-4 rounded-xl bg-white",
                "shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
                "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
                "transition-all duration-200"
              )}>
                <ImageInput
                  value={imagePreview || formData.Image || ""}
                  onChange={(value) => {
                    handleImageChange(value);
                    if (!value) {
                      handleInputChange("Image", "");
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-full"
                />
                {imageFile && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-3">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Image ready for upload ({formatImageSize(imageFile.size)})
                  </p>
                )}
              </div>
            </FormSection>

            {/* Additional Notes */}
            <FormSection title="Additional Information" icon={FileText}>
              <div className={cn(
                "relative",
                "bg-white rounded-xl",
                "shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
                "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
                "focus-within:shadow-[0_4px_16px_rgba(16,185,129,0.15)] focus-within:ring-2 focus-within:ring-emerald-100",
                "transition-all duration-200"
              )}>
                <textarea
                  value={formData.Description || ""}
                  onChange={(e) => handleInputChange("Description", e.target.value)}
                  placeholder="Enter any additional notes, description, or special features about the vehicle..."
                  rows={4}
                  className={cn(
                    "w-full px-4 py-3 bg-transparent border-none outline-none rounded-xl",
                    "text-slate-800 placeholder-slate-400",
                    "resize-none"
                  )}
                />
              </div>
              <p className="text-xs text-slate-500">
                Optional: Add any extra details about the vehicle condition, features, or history.
              </p>
            </FormSection>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={cn(
                "px-4 py-2 rounded-xl font-medium text-slate-600",
                "bg-white",
                "shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
                "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
                "hover:text-slate-800 hover:bg-slate-50",
                "active:shadow-[0_1px_4px_rgba(0,0,0,0.04)]",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "px-6 py-2 rounded-xl font-medium text-white transition-all duration-200",
                "bg-emerald-500 hover:bg-emerald-600 shadow-md hover:shadow-lg",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-2"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Vehicle
                </>
              )}
            </button>
          </div>
        </form>
      </ModalContainer>
    </ModalBackdrop>
  );
}
