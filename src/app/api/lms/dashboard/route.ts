/**
 * LMS Dashboard API Route
 * 
 * GET /api/lms/dashboard - Get dashboard statistics
 * - Admin: See all staff progress and overall stats
 * - Staff: See only their own progress
 * 
 * @module api/lms/dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { lmsService } from "@/services/LmsService";
import { canAccessLMS, canManageLMS, getSession } from "@/lib/auth-helpers";

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

  // If Staff, filter to show only their own progress
  if (!isAdmin && result.data?.staff_progress) {
    const staffProgress = result.data.staff_progress.find(
      (s: { staff_name: string }) => s.staff_name === session.username
    );
    
    result.data.staff_progress = staffProgress ? [staffProgress] : [];
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    meta: {
      ...result.meta,
      isAdmin,
      username: session.username,
    },
  });
}
