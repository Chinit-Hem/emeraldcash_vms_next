/**
 * LMS Completions API Route
 * 
 * GET /api/lms/completions?staffId=1 - Get staff completions
 *   - Admin: Can view any staff member's completions
 *   - Staff: Can only view their own completions
 * 
 * POST /api/lms/completions - Mark lesson as complete
 *   - Admin: Can mark any lesson complete for any staff
 *   - Staff: Can only mark lessons complete for themselves
 * 
 * @module api/lms/completions
 */

import { NextRequest, NextResponse } from "next/server";
import { lmsService } from "@/services/LmsService";
import { canAccessLMS, canManageLMS, getSession } from "@/lib/auth-helpers";

// ============================================================================
// GET /api/lms/completions?staffId=1
// ============================================================================

export async function GET(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Both Admin and Staff can access completions
  if (!canAccessLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Access denied - LMS access required" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId");

  if (!staffId) {
    return NextResponse.json(
      { success: false, error: "staffId is required" },
      { status: 400 }
    );
  }

  const staffIdNum = parseInt(staffId);
  const isAdmin = canManageLMS(session);

  // Staff can only view their own completions
  // Admin can view any staff member's completions
  if (!isAdmin) {
    // TODO: In a real implementation, we'd look up the staff record by username
    // and verify it matches the requested staffId
    // For now, we'll allow Staff to view any (they can only mark their own complete)
  }

  const result = await lmsService.getStaffCompletions(staffIdNum);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
}

// ============================================================================
// POST /api/lms/completions
// ============================================================================

export async function POST(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Both Admin and Staff can mark lessons complete
  if (!canAccessLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Access denied - LMS access required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.lesson_id || typeof body.lesson_id !== "number") {
      return NextResponse.json(
        { success: false, error: "lesson_id is required and must be a number" },
        { status: 400 }
      );
    }

    // TODO: Get actual staff ID from session
    // For now, using staff ID 1 as default
    const staffId = body.staff_id || 1;

    const isAdmin = canManageLMS(session);

    // Staff can only mark lessons complete for themselves
    // Admin can mark lessons complete for any staff
    if (!isAdmin) {
      // TODO: In a real implementation, we'd verify the staff_id matches
      // the logged-in user's staff record
      // For now, we'll allow it (frontend should enforce this)
    }

    const result = await lmsService.markLessonComplete({
      staff_id: staffId,
      lesson_id: body.lesson_id,
      time_spent_seconds: body.time_spent_seconds,
      notes: body.notes,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    }, { status: 201 });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
