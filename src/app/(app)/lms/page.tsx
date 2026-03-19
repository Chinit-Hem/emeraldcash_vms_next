/**
 * LMS (Learning Management System) Page
 * 
 * Main training portal for staff to:
 * - View training categories and lessons
 * - Watch YouTube training videos
 * - Track completion progress
 * - Access step-by-step instructions
 * 
 * @module lms/page
 */

import { Metadata } from "next";
import { LmsDashboard } from "@/app/components/lms/LmsDashboard";

export const metadata: Metadata = {
  title: "Training Portal | Emerald Cash VMS",
  description: "Staff training and certification portal",
};

export default function LmsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <LmsDashboard />
    </div>
  );
}
