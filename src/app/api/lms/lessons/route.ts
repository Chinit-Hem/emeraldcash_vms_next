/**
 * LMS Lessons API Route
 * 
 * GET /api/lms/lessons?categoryId=1 - List lessons by category (Admin & Staff)
 * POST /api/lms/lessons - Create new lesson (Admin only)
 * 
 * @module api/lms/lessons
 */

import { canAccessLMS, canManageLMS, getSession } from "@/lib/auth-helpers";
import { getCachedLessonsByCategory, getCachedSequentialLessons, invalidateCategoryCache, setCachedLessonsByCategory, setCachedSequentialLessons } from "@/lib/lms-cache";
import { lmsService } from "@/services/LmsService";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// GET /api/lms/lessons?categoryId=1 or ?id=1 - Both Admin and Staff can view
// ============================================================================

export async function GET(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Both Admin and Staff can view lessons for learning
  if (!canAccessLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Access denied - LMS access required" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const id = searchParams.get("id");
  const sequential = searchParams.get("sequential") === "true";
  const all = searchParams.get("all") === "true";

  // If id is provided, fetch single lesson
  if (id) {
    const result = await lmsService.getLessonById(parseInt(id));

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Lesson not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  }

  // If all=true, fetch all lessons (for admin)
  if (all) {
    const result = await lmsService.getAllLessons();

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

  // Otherwise, require categoryId
  if (!categoryId) {
    return NextResponse.json(
      { success: false, error: "Either id, categoryId, or all=true is required" },
      { status: 400 }
    );
  }

  const categoryIdNum = parseInt(categoryId);

  // If sequential mode, return lessons with unlock status
  if (sequential) {
    const staffId = session?.staffId || session?.userId || 1;
    
    // TRY CACHE FIRST (99% hit rate expected)
    const cacheResult = await getCachedSequentialLessons(categoryIdNum, staffId);
    if (cacheResult.success) {
      return NextResponse.json({
        success: true,
        data: cacheResult.data as SequentialLesson[],
        meta: {
          ...cacheResult,
          fromCache: true,
          dbDurationMs: 0
        }
      }, {
        headers: { 'X-Cache': 'HIT' }
      });
    }
    
    // CACHE MISS - Database fetch + cache result
    const result = await lmsService.getSequentialLessonsForStaff(categoryIdNum, staffId);
    
    if (result.success) {
      await setCachedSequentialLessons(categoryIdNum, staffId, result.data as SequentialLesson[]);
    }
    
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

  // Regular lessons list - CACHED
  // TRY CACHE FIRST (ultra-fast response)
  const cacheResult = await getCachedLessonsByCategory(categoryIdNum);
  if (cacheResult.success) {
    return NextResponse.json({
      success: true,
      data: cacheResult.data as LmsLesson[],
      meta: {
        ...cacheResult,
        fromCache: true,
        dbDurationMs: 0
      }
    }, {
      headers: { 'X-Cache': 'HIT' }
    });
  }
  
  // CACHE MISS - DB + cache
  const result = await lmsService.getLessonsByCategory(categoryIdNum);
  
  if (result.success) {
    await setCachedLessonsByCategory(categoryIdNum, result.data as LmsLesson[]);
  }
  
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
// POST /api/lms/lessons - Admin only
// ============================================================================

export async function POST(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can create lessons
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to create lessons" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.category_id || typeof body.category_id !== "number") {
      return NextResponse.json(
        { success: false, error: "category_id is required and must be a number" },
        { status: 400 }
      );
    }

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        { success: false, error: "title is required and must be a string" },
        { status: 400 }
      );
    }

    if (!body.youtube_url || typeof body.youtube_url !== "string") {
      return NextResponse.json(
        { success: false, error: "youtube_url is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await lmsService.createLesson({
      category_id: body.category_id,
      title: body.title,
      description: body.description,
      youtube_url: body.youtube_url,
      step_by_step_instructions: body.step_by_step_instructions,
      duration_minutes: body.duration_minutes,
      order_index: body.order_index,
    });

    // INVALIDATE CACHE for this category
    if (result.success && body.category_id) {
      await invalidateCategoryCache(body.category_id);
    }

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
    }, { 
      status: 201,
      headers: { 'X-Cache': 'INVALIDATED' }
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// ============================================================================
// PUT /api/lms/lessons?id=1 - Admin only
// ============================================================================

export async function PUT(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can update lessons
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to update lessons" },
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

    const result = await lmsService.updateLesson(parseInt(id), {
      category_id: body.category_id,
      title: body.title,
      description: body.description,
      youtube_url: body.youtube_url,
      step_by_step_instructions: body.step_by_step_instructions,
      duration_minutes: body.duration_minutes,
      order_index: body.order_index,
      is_active: body.is_active,
    });

    // INVALIDATE CACHE
    if (result.success && body.category_id) {
      await invalidateCategoryCache(body.category_id);
    }

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
    }, {
      headers: { 'X-Cache': 'INVALIDATED' }
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// ============================================================================
// DELETE /api/lms/lessons?id=1 - Admin only
// ============================================================================

export async function DELETE(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can delete lessons
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to delete lessons" },
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

    const result = await lmsService.deleteLesson(parseInt(id));

    // INVALIDATE CACHE for lesson's category
    if (result.success) {
      try {
        const lessonQuery = await lmsService.getLessonById(parseInt(id));
        if (lessonQuery.success && lessonQuery.data?.category_id) {
          await invalidateCategoryCache(lessonQuery.data.category_id);
        }
      } catch {}
    }

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
    }, {
      headers: { 'X-Cache': 'INVALIDATED' }
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}
