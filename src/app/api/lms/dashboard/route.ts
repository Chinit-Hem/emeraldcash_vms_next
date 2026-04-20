/**
 * LMS Dashboard API Route
 * 
 * GET /api/lms/dashboard - Get dashboard statistics
 * - Admin: See all staff progress and overall stats
 * - Staff: See only their own progress
 * 
 * @module api/lms/dashboard
 */

import { canAccessLMS, canManageLMS, getSession } from "@/lib/auth-helpers";
import { lmsService } from "@/services/LmsService";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// GET /api/lms/dashboard - Admin & Staff can access
// ============================================================================

export async function GET(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Both Admin and Staff can access dashboard
  if (!canAccessLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Access denied - LMS access required" },
      { status: 403 }
    );
  }

  const isAdmin = canManageLMS(session);
  
  // Get dashboard stats
  const result = await lmsService.getDashboardStats();

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  const legacyData = result.data
    ? {
        total_staff: result.data.totalStaff,
        total_categories: result.data.totalCategories,
        total_lessons: result.data.totalLessons,
        overall_completion_rate: result.data.overallCompletionRate,
        staff_progress: result.data.staffProgress.map((staff) => ({
          staff_id: staff.staffId,
          staff_name: staff.staffName,
          branch: staff.branch,
          role: staff.role,
          completion_percentage: staff.completionPercentage,
          last_activity: staff.lastActivity,
        })),
        category_completion: result.data.categoryCompletion.map((category) => ({
          category_id: category.categoryId,
          category_name: category.categoryName,
          completion_rate: category.completionRate,
        })),
      }
    : null;

  // If Staff, filter to show only their own progress
  if (!isAdmin && legacyData?.staff_progress) {
    const staffProgress = legacyData.staff_progress.find(
      (s: { staff_name: string }) => s.staff_name === session.username
    );
    legacyData.staff_progress = staffProgress ? [staffProgress] : [];
  }

  // Add cache-busting headers to prevent stale data
  const headers = new Headers();
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  
  return NextResponse.json({
    success: true,
    data: legacyData,
    meta: {
      ...result.meta,
      isAdmin,
      username: session.username,
    },
  }, { headers });
}
