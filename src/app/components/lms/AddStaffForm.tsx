/**
 * Add Staff Form Component - Advanced Neumorphism Style
 * 
 * Form for creating new staff members with:
 * - Full name and email
 * - Branch location
 * - Role selection (Admin, Staff)
 * - Phone number
 * 
 * @module AddStaffForm
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  User,
  Mail,
  MapPin,
  Phone,
  AlertCircle,
  X,
  Briefcase,
} from "lucide-react";
import { LMS_ROLES, type LmsRole } from "@/lib/lms-schema";
import { NeuInput, NeuSelect } from "@/components/ui/neu/NeuInput";

// ============================================================================
// Types
// ============================================================================

interface AddStaffFormProps {
  onSubmit: (staffData: StaffFormData) => Promise<void>;
  onCancel: () => void;
}

export interface StaffFormData {
  fullName: string;
  email: string;
  branchLocation: string;
  role: LmsRole;
  phone: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function AddStaffForm({
  onSubmit,
  onCancel,
}: AddStaffFormProps) {
  const [formData, setFormData] = useState<StaffFormData>({
    fullName: "",
    email: "",
    branchLocation: "",
    role: "Staff",
    phone: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof StaffFormData, string>> & { submit?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear fullName error when user types
  useEffect(() => {
    if (formData.fullName.trim()) {
      setErrors((prev) => {
        if (prev.fullName) {
          return { ...prev, fullName: undefined };
        }
        return prev;
      });
    }
  }, [formData.fullName]);

  // Validate form
  const validateForm = (data: StaffFormData = formData): boolean => {
    const newErrors: Partial<Record<keyof StaffFormData, string>> = {};

    if (!data.fullName || !data.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous submit errors
    setErrors((prev) => ({ ...prev, submit: undefined }));

    // Validate with current form data
    if (!validateForm(formData)) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: "Failed to create staff member. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role options for select
  const roleOptions = LMS_ROLES.map((role) => ({
    value: role,
    label: role,
  }));

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={(e) => {
      // Close when clicking outside the modal
      if (e.target === e.currentTarget) {
        onCancel();
      }
    }}>
      <div className="min-h-screen px-4 py-4 md:py-8 pb-24 md:pb-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 my-4">
          {/* Neumorphism Card Container */}
          <div className="rounded-[24px] bg-[#e0e5ec] shadow-[12px_12px_24px_#a3b1c6,-12px_-12px_24px_#ffffff] overflow-visible">
            {/* Header - Neumorphism */}
            <div className="sticky top-0 z-10 p-4 md:p-6 rounded-t-[24px] bg-[#e0e5ec] shadow-[0_4px_12px_#a3b1c6]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon Container - Neumorphism */}
                  <div className="p-3 rounded-[12px] bg-[#e0e5ec] shadow-[4px_4px_8px_#a3b1c6,-4px_-4px_8px_#ffffff]">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-[#1a1a2e]">
                      Add New Staff
                    </h2>
                    <p className="text-sm text-[#4a4a5a]">
                      Create a staff member for training tracking
                    </p>
                  </div>
                </div>
                {/* Close Button - Neumorphism */}
                <button
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="p-2 rounded-[10px] bg-[#e0e5ec] shadow-[2px_2px_4px_#a3b1c6,-2px_-2px_4px_#ffffff] hover:shadow-[inset_2px_2px_4px_#a3b1c6,inset_-2px_-2px_4px_#ffffff] transition-all disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-[#4a4a5a]" />
                </button>
              </div>
            </div>

            {/* Form - Neumorphism */}
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6">
              {/* Error Summary - Neumorphism */}
              {errors.submit && (
                <div className="p-4 rounded-[16px] bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff] flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 font-medium">{errors.submit}</p>
                </div>
              )}

              {/* Full Name - NeuInput */}
              <NeuInput
                label="Full Name"
                required
                icon={<User className="w-5 h-5" />}
                value={formData.fullName}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, fullName: e.target.value }));
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                placeholder="hem chinit"
                error={errors.fullName}
                helperText="Enter the staff member's full name"
              />

              {/* Email - NeuInput */}
              <NeuInput
                label="Email"
                type="email"
                icon={<Mail className="w-5 h-5" />}
                value={formData.email}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value }));
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="hem.chinit@example.com"
                error={errors.email}
                helperText="Optional: Staff member's email address"
              />

              {/* Branch Location - NeuInput */}
              <NeuInput
                label="Branch Location"
                icon={<MapPin className="w-5 h-5" />}
                value={formData.branchLocation}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, branchLocation: e.target.value }))
                }
                placeholder="Phnom Penh"
                helperText="Optional: Which branch they work at"
              />

              {/* Role - NeuSelect */}
              <NeuSelect
                label="Role"
                required
                options={roleOptions}
                value={formData.role}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, role: e.target.value as LmsRole }))
                }
                helperText="Select the staff member's role"
              />

              {/* Phone - NeuInput */}
              <NeuInput
                label="Phone Number"
                type="tel"
                icon={<Phone className="w-5 h-5" />}
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+855 12 345 678"
                helperText="Optional: Contact phone number"
              />

              {/* Actions - Neumorphism Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#a3b1c6]/30 relative z-50">
                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="sm:flex-1 px-4 py-3 rounded-[12px] bg-[#e0e5ec] text-[#4a4a5a] font-semibold shadow-[4px_4px_8px_#a3b1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_3px_3px_6px_#a3b1c6,inset_-3px_-3px_6px_#ffffff] active:shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff] transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                {/* Create Staff Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="sm:flex-1 px-4 py-3 rounded-[12px] bg-[#e0e5ec] text-emerald-600 font-semibold shadow-[4px_4px_8px_#a3b1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_3px_3px_6px_#a3b1c6,inset_-3px_-3px_6px_#ffffff] active:shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Staff
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddStaffForm;
