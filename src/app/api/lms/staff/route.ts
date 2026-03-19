/**
 * LMS Staff API Route
 * 
 * GET /api/lms/staff - List all staff members (Admin only)
 * POST /api/lms/staff - Create new staff member (Admin only)
 * 
 * @module api/lms/staff
 */

import { NextRequest, NextResponse } from "next/server";
import { lmsService } from "@/services/LmsService";
import { canManageLMS, getSession } from "@/lib/auth-helpers";

// ============================================================================
// GET /api/lms/staff - Admin only
// ============================================================================

export async function GET(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can view staff list
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to view staff" },
      { status: 403 }
    );
  }

  const result = await lmsService.getStaff();

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
// POST /api/lms/staff - Admin only
// ============================================================================

export async function POST(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can create staff
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to create staff" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.full_name || typeof body.full_name !== "string") {
      return NextResponse.json(
        { success: false, error: "full_name is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await lmsService.createStaff({
      full_name: body.full_name,
      email: body.email,
      branch_location: body.branch_location,
      role: body.role,
      phone: body.phone,
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

// ============================================================================
// PUT /api/lms/staff?id=1 - Admin only
// ============================================================================

export async function PUT(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can update staff
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to update staff" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const result = await lmsService.updateStaff(parseInt(id), {
      full_name: body.full_name,
      email: body.email,
      branch_location: body.branch_location,
      role: body.role,
      phone: body.phone,
      is_active: body.is_active,
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
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// ============================================================================
// DELETE /api/lms/staff?id=1 - Admin only
// ============================================================================

export async function DELETE(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can delete staff
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to delete staff" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const result = await lmsService.deleteStaff(parseInt(id));

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
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete staff" },
      { status: 500 }
    );
  }
}
