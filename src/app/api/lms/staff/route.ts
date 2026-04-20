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

type StaffEntityLike = {
  id: string | number;
  fullName: string;
  email: string | null;
  branchLocation: string | null;
  role: string;
  phone: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function toLegacyStaff(staff: StaffEntityLike) {
  return {
    id: Number(staff.id),
    full_name: staff.fullName,
    email: staff.email,
    branch_location: staff.branchLocation,
    role: staff.role,
    phone: staff.phone,
    is_active: staff.isActive,
    created_at: staff.createdAt ?? null,
    updated_at: staff.updatedAt ?? null,
  };
}

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
    data: (result.data ?? []).map((staff) => toLegacyStaff(staff as StaffEntityLike)),
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
    const fullName = body.fullName ?? body.full_name;
    const branchLocation = body.branchLocation ?? body.branch_location;

    // Validate required fields
    if (!fullName || typeof fullName !== "string") {
      return NextResponse.json(
        { success: false, error: "full_name/fullName is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await lmsService.createStaff({
      fullName,
      email: body.email,
      branchLocation: typeof branchLocation === "string" ? branchLocation : null,
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
      data: result.data ? toLegacyStaff(result.data as StaffEntityLike) : null,
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
    const fullName = body.fullName ?? body.full_name;
    const branchLocation = body.branchLocation ?? body.branch_location;
    const isActive = body.isActive ?? body.is_active;

    const result = await lmsService.updateStaff(parseInt(id), {
      fullName: typeof fullName === "string" ? fullName : undefined,
      email: body.email,
      branchLocation: typeof branchLocation === "string" ? branchLocation : undefined,
      role: body.role,
      phone: body.phone,
      isActive: typeof isActive === "boolean" ? isActive : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data ? toLegacyStaff(result.data as StaffEntityLike) : null,
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
