/**
 * LMS Service - Learning Management System Operations
 * 
 * Provides CRUD operations for:
 * - Categories (training pillars)
 * - Lessons (video content with instructions)
 * - Staff (trainees and managers)
 * - Completions (progress tracking)
 * 
 * @module LmsService
 */

import { dbManager } from "@/lib/db-singleton";
import {
  type CreateLmsCategoryInput,
  type CreateLmsLessonInput,
  type CreateLmsStaffInput,
  type LmsCategory,
  type LmsCategoryWithLessons,
  type LmsDashboardStats,
  type LmsLesson,
  type LmsLessonCompletion,
  type LmsStaff,
  type LmsStaffWithStats,
  type MarkLessonCompleteInput,
  type UpdateLmsCategoryInput,
  type UpdateLmsLessonInput,
  type UpdateLmsStaffInput,
  calculateCompletionPercentage,
  extractYoutubeVideoId,
} from "@/lib/lms-schema";

// ============================================================================
// Types
// ============================================================================

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    durationMs: number;
    queryCount: number;
  };
}

// Helper to extract rows from database result
// The Neon SDK returns results directly as an array of objects
function extractRows<T>(result: unknown): T[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    // The result is already an array of rows from Neon SDK
    return result as T[];
  }
  return [];
}

// ============================================================================
// LMS Service Class
// ============================================================================

export class LmsService {
  private static instance: LmsService | null = null;

  private constructor() {}

  public static getInstance(): LmsService {
    if (!LmsService.instance) {
      LmsService.instance = new LmsService();
    }
    return LmsService.instance;
  }

  // ============================================================================
  // Categories
  // ============================================================================

  /**
   * Get all categories with lesson counts
   */
  async getCategories(): Promise<ServiceResult<(LmsCategory & { lesson_count: number })[]>> {
    const startTime = Date.now();
    
    try {
      const query = `
        SELECT 
          c.*,
          COUNT(l.id) as lesson_count
        FROM lms_categories c
        LEFT JOIN lms_lessons l ON l.category_id = c.id AND l.is_active = true
        WHERE c.is_active = true
        GROUP BY c.id
        ORDER BY c.order_index, c.name
      `;
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsCategory & { lesson_count: number }>(result);
      
      return {
        success: true,
        data: rows,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch categories";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get single category by ID
   */
  async getCategoryById(id: number): Promise<ServiceResult<LmsCategory>> {
    const startTime = Date.now();
    
    try {
      const query = `SELECT * FROM lms_categories WHERE id = ${id}`;
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsCategory>(result);
      
      if (rows.length === 0) {
        return {
          success: false,
          error: "Category not found",
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      return {
        success: true,
        data: rows[0],
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch category";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Create new category
   */
  async createCategory(input: CreateLmsCategoryInput): Promise<ServiceResult<LmsCategory>> {
    const startTime = Date.now();
    
    try {
      // Check if category with same name already exists
      const checkQuery = `SELECT id FROM lms_categories WHERE LOWER(name) = LOWER('${input.name.replace(/'/g, "''")}') AND is_active = true`;
      const checkResult = await dbManager.executeUnsafe(checkQuery);
      const existingRows = extractRows<{ id: number }>(checkResult);
      
      if (existingRows.length > 0) {
        return {
          success: false,
          error: `A category with name "${input.name}" already exists`,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      const query = `
        INSERT INTO lms_categories (name, description, icon, color, order_index)
        VALUES (
          '${input.name.replace(/'/g, "''")}',
          ${input.description ? `'${input.description.replace(/'/g, "''")}'` : 'NULL'},
          ${input.icon ? `'${input.icon}'` : 'NULL'},
          ${input.color ? `'${input.color}'` : 'NULL'},
          ${input.order_index ?? 0}
        )
        RETURNING *
      `;
      
      console.log("[LmsService.createCategory] Executing query:", query);
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsCategory>(result);
      
      console.log("[LmsService.createCategory] Success, created category:", rows[0]?.id);
      
      return {
        success: true,
        data: rows[0],
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create category";
      console.error("[LmsService.createCategory] Error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Update category
   */
  async updateCategory(id: number, input: UpdateLmsCategoryInput): Promise<ServiceResult<LmsCategory>> {
    const startTime = Date.now();
    
    try {
      const updates: string[] = [];
      
      if (input.name !== undefined) {
        updates.push(`name = '${input.name.replace(/'/g, "''")}'`);
      }
      if (input.description !== undefined) {
        updates.push(`description = ${input.description ? `'${input.description.replace(/'/g, "''")}'` : 'NULL'}`);
      }
      if (input.icon !== undefined) {
        updates.push(`icon = ${input.icon ? `'${input.icon}'` : 'NULL'}`);
      }
      if (input.color !== undefined) {
        updates.push(`color = ${input.color ? `'${input.color}'` : 'NULL'}`);
      }
      if (input.order_index !== undefined) {
        updates.push(`order_index = ${input.order_index}`);
      }
      if (input.is_active !== undefined) {
        updates.push(`is_active = ${input.is_active}`);
      }
      
      if (updates.length === 0) {
        return {
          success: false,
          error: "No fields to update",
          meta: { durationMs: Date.now() - startTime, queryCount: 0 },
        };
      }
      
      const query = `
        UPDATE lms_categories
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsCategory>(result);
      
      if (rows.length === 0) {
        return {
          success: false,
          error: "Category not found",
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      return {
        success: true,
        data: rows[0],
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update category";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Delete category (soft delete by setting is_active = false)
   */
  async deleteCategory(id: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    
    try {
      const query = `
        UPDATE lms_categories
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      
      await dbManager.executeUnsafe(query);
      
      return {
        success: true,
        data: true,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete category";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  // ============================================================================
  // Lessons
  // ============================================================================

  /**
   * Get all lessons for a category
   */
async getLessonsByCategory(categoryId: number): Promise<ServiceResult<LmsLesson[]>> {
    const startTime = Date.now();
    
    try {
      const result = await dbManager.execute`SELECT * FROM lms_lessons 
        WHERE category_id = $1 AND is_active = true
        ORDER BY order_index, id`(categoryId);
      
      const rows = extractRows<LmsLesson>(result);
      
      const duration = Date.now() - startTime;
      console.log(`[LMS-PERF] getLessonsByCategory(${categoryId}): ${duration}ms, ${rows.length} lessons`);
      
      return {
        success: true,
        data: rows,
        meta: { durationMs: duration, queryCount: 1, optimized: true },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch lessons";
      console.error(`[LMS-PERF] getLessonsByCategory(${categoryId}) ERROR: ${duration}ms`, errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: duration, queryCount: 1 },
      };
    }
  }

  /**
   * Get all lessons across all categories (for admin)
   */
  async getAllLessons(): Promise<ServiceResult<LmsLesson[]>> {
    const startTime = Date.now();
    
    try {
      const query = `
        SELECT * FROM lms_lessons 
        WHERE is_active = true
        ORDER BY category_id, order_index, id
      `;
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsLesson>(result);
      
      return {
        success: true,
        data: rows,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch all lessons";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get single lesson by ID
   */
async getLessonById(id: number): Promise<ServiceResult<LmsLesson>> {
    const startTime = Date.now();
    
    try {
      const query = `SELECT * FROM lms_lessons WHERE id = ${id}`;
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsLesson>(result);
      
      if (rows.length === 0) {
        return {
          success: false,
          error: "Lesson not found",
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      return {
        success: true,
        data: rows[0],
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch lesson";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Create new lesson
   */
  async createLesson(input: CreateLmsLessonInput): Promise<ServiceResult<LmsLesson>> {
    const startTime = Date.now();
    
    try {
      // Validate category exists
      const categoryCheck = await this.getCategoryById(input.category_id);
      if (!categoryCheck.success) {
        return {
          success: false,
          error: `Category not found: ${input.category_id}`,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      const videoId = extractYoutubeVideoId(input.youtube_url);
      if (!videoId) {
        return {
          success: false,
          error: "Invalid YouTube URL - Could not extract video ID",
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      // Validate title
      if (!input.title || input.title.trim().length === 0) {
        return {
          success: false,
          error: "Title is required",
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      const query = `
        INSERT INTO lms_lessons (
          category_id, title, description, youtube_url, youtube_video_id,
          step_by_step_instructions, duration_minutes, order_index
        ) VALUES (
          ${input.category_id},
          '${input.title.replace(/'/g, "''")}',
          ${input.description ? `'${input.description.replace(/'/g, "''")}'` : 'NULL'},
          '${input.youtube_url}',
          '${videoId}',
          ${input.step_by_step_instructions ? `'${input.step_by_step_instructions.replace(/'/g, "''")}'` : 'NULL'},
          ${input.duration_minutes ?? 'NULL'},
          ${input.order_index ?? 0}
        )
        RETURNING *
      `;
      
      console.log("[LmsService.createLesson] Executing query for lesson:", input.title);
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsLesson>(result);
      
      console.log("[LmsService.createLesson] Success, created lesson:", rows[0]?.id);
      
      return {
        success: true,
        data: rows[0],
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create lesson";
      console.error("[LmsService.createLesson] Error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Update lesson
   */
  async updateLesson(id: number, input: UpdateLmsLessonInput): Promise<ServiceResult<LmsLesson>> {
    const startTime = Date.now();
    
    try {
      const updates: string[] = [];
      
      if (input.category_id !== undefined) {
        updates.push(`category_id = ${input.category_id}`);
      }
      if (input.title !== undefined) {
        updates.push(`title = '${input.title.replace(/'/g, "''")}'`);
      }
      if (input.description !== undefined) {
        updates.push(`description = ${input.description ? `'${input.description.replace(/'/g, "''")}'` : 'NULL'}`);
      }
      if (input.youtube_url !== undefined) {
        const videoId = extractYoutubeVideoId(input.youtube_url);
        if (!videoId) {
          return {
            success: false,
            error: "Invalid YouTube URL",
            meta: { durationMs: Date.now() - startTime, queryCount: 0 },
          };
        }
        updates.push(`youtube_url = '${input.youtube_url}'`);
        updates.push(`youtube_video_id = '${videoId}'`);
      }
      if (input.step_by_step_instructions !== undefined) {
        updates.push(`step_by_step_instructions = ${input.step_by_step_instructions ? `'${input.step_by_step_instructions.replace(/'/g, "''")}'` : 'NULL'}`);
      }
      if (input.duration_minutes !== undefined) {
        updates.push(`duration_minutes = ${input.duration_minutes ?? 'NULL'}`);
      }
      if (input.order_index !== undefined) {
        updates.push(`order_index = ${input.order_index}`);
      }
      if (input.is_active !== undefined) {
        updates.push(`is_active = ${input.is_active}`);
      }
      
      if (updates.length === 0) {
        return {
          success: false,
          error: "No fields to update",
          meta: { durationMs: Date.now() - startTime, queryCount: 0 },
        };
      }
      
      const query = `
        UPDATE lms_lessons
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsLesson>(result);
      
      if (rows.length === 0) {
        return {
          success: false,
          error: "Lesson not found",
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      return {
        success: true,
        data: rows[0],
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update lesson";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Delete lesson (soft delete)
   */
  async deleteLesson(id: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    
    try {
      const query = `
        UPDATE lms_lessons
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      
      await dbManager.executeUnsafe(query);
      
      return {
        success: true,
        data: true,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete lesson";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  // ============================================================================
  // Staff
  // ============================================================================

  /**
   * Get all staff members
   */
  async getStaff(): Promise<ServiceResult<LmsStaff[]>> {
    const startTime = Date.now();
    
    try {
      const query = `
        SELECT * FROM lms_staff 
        WHERE is_active = true
        ORDER BY full_name
      `;
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsStaff>(result);
      
      return {
        success: true,
        data: rows,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch staff";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get staff by ID with completion stats
   */
  async getStaffById(id: number): Promise<ServiceResult<LmsStaffWithStats>> {
    const startTime = Date.now();
    
    try {
      // Get staff info
      const staffQuery = `SELECT * FROM lms_staff WHERE id = ${id}`;
      const staffResult = await dbManager.executeUnsafe(staffQuery);
      const staffRows = extractRows<LmsStaff>(staffResult);
      
      if (staffRows.length === 0) {
        return {
          success: false,
          error: "Staff not found",
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      const staff = staffRows[0];
      
      // Get completion stats
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT lc.lesson_id) as completed_lessons
        FROM lms_lessons l
        LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id AND lc.staff_id = ${id}
        WHERE l.is_active = true
      `;
      
      const statsResult = await dbManager.executeUnsafe(statsQuery);
      const statsRows = extractRows<{ total_lessons: number; completed_lessons: number }>(statsResult);
      const stats = statsRows[0];
      
      // Get category progress
      const categoryQuery = `
        SELECT 
          c.id as category_id,
          c.name as category_name,
          COUNT(l.id) as total_lessons,
          COUNT(lc.lesson_id) as completed_lessons
        FROM lms_categories c
        LEFT JOIN lms_lessons l ON l.category_id = c.id AND l.is_active = true
        LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id AND lc.staff_id = ${id}
        WHERE c.is_active = true
        GROUP BY c.id, c.name
        ORDER BY c.order_index
      `;
      
      const categoryResult = await dbManager.executeUnsafe(categoryQuery);
      const categoryRows = extractRows<{ category_id: number; category_name: string; total_lessons: number; completed_lessons: number }>(categoryResult);
      
      const categoriesProgress = categoryRows.map((cat) => ({
        category_id: cat.category_id,
        category_name: cat.category_name,
        total_lessons: parseInt(String(cat.total_lessons)),
        completed_lessons: parseInt(String(cat.completed_lessons)),
        is_complete: parseInt(String(cat.total_lessons)) > 0 && 
          parseInt(String(cat.completed_lessons)) === parseInt(String(cat.total_lessons)),
      }));
      
      const staffWithStats: LmsStaffWithStats = {
        ...staff,
        total_lessons: parseInt(String(stats.total_lessons)),
        completed_lessons: parseInt(String(stats.completed_lessons)),
        completion_percentage: calculateCompletionPercentage(
          parseInt(String(stats.completed_lessons)),
          parseInt(String(stats.total_lessons))
        ),
        categories_progress: categoriesProgress,
      };
      
      return {
        success: true,
        data: staffWithStats,
        meta: { durationMs: Date.now() - startTime, queryCount: 3 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch staff";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Create new staff member
   */
  async createStaff(input: CreateLmsStaffInput): Promise<ServiceResult<LmsStaff>> {
    const startTime = Date.now();
    
    try {
      // Validate role
      const validRoles = ["Appraiser", "Manager", "Admin", "Trainee"];
      const role = input.role && validRoles.includes(input.role) ? input.role : "Trainee";
      
      console.log("[LmsService.createStaff] Creating staff:", {
        full_name: input.full_name,
        email: input.email,
        branch_location: input.branch_location,
        role: role,
        phone: input.phone
      });
      
      const query = `
        INSERT INTO lms_staff (full_name, email, branch_location, role, phone)
        VALUES (
          '${input.full_name.replace(/'/g, "''")}',
          ${input.email ? `'${input.email.replace(/'/g, "''")}'` : 'NULL'},
          ${input.branch_location ? `'${input.branch_location.replace(/'/g, "''")}'` : 'NULL'},
          '${role}',
          ${input.phone ? `'${input.phone.replace(/'/g, "''")}'` : 'NULL'}
        )
        RETURNING *
      `;
      
      console.log("[LmsService.createStaff] Executing query...");
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsStaff>(result);
      
      console.log("[LmsService.createStaff] Success, created staff:", rows[0]?.id);
      
      return {
        success: true,
        data: rows[0],
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create staff";
      console.error("[LmsService.createStaff] Error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Update staff member
   */
  async updateStaff(id: number, input: UpdateLmsStaffInput): Promise<ServiceResult<LmsStaff>> {
    const startTime = Date.now();
    
    try {
      const updates: string[] = [];
      
      if (input.full_name !== undefined) {
        updates.push(`full_name = '${input.full_name.replace(/'/g, "''")}'`);
      }
      if (input.email !== undefined) {
        updates.push(`email = ${input.email ? `'${input.email}'` : 'NULL'}`);
      }
      if (input.branch_location !== undefined) {
        updates.push(`branch_location = ${input.branch_location ? `'${input.branch_location.replace(/'/g, "''")}'` : 'NULL'}`);
      }
      if (input.role !== undefined) {
        updates.push(`role = '${input.role}'`);
      }
      if (input.phone !== undefined) {
        updates.push(`phone = ${input.phone ? `'${input.phone}'` : 'NULL'}`);
      }
      if (input.is_active !== undefined) {
        updates.push(`is_active = ${input.is_active}`);
      }
      
      if (updates.length === 0) {
        return {
          success: false,
          error: "No fields to update",
          meta: { durationMs: Date.now() - startTime, queryCount: 0 },
        };
      }
      
      const query = `
        UPDATE lms_staff
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsStaff>(result);
      
      if (rows.length === 0) {
        return {
          success: false,
          error: "Staff not found",
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      return {
        success: true,
        data: rows[0],
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update staff";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Delete staff member (soft delete)
   */
  async deleteStaff(id: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    
    try {
      const query = `
        UPDATE lms_staff
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      
      await dbManager.executeUnsafe(query);
      
      return {
        success: true,
        data: true,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete staff";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  // ============================================================================
  // Completions
  // ============================================================================

  /**
   * Mark lesson as complete
   */
  async markLessonComplete(input: MarkLessonCompleteInput): Promise<ServiceResult<LmsLessonCompletion>> {
    const startTime = Date.now();
    
    try {
      const query = `
        INSERT INTO lms_lesson_completions (staff_id, lesson_id, time_spent_seconds, notes)
        VALUES (
          ${input.staff_id},
          ${input.lesson_id},
          ${input.time_spent_seconds ?? 'NULL'},
          ${input.notes ? `'${input.notes.replace(/'/g, "''")}'` : 'NULL'}
        )
        ON CONFLICT (staff_id, lesson_id) 
        DO UPDATE SET 
          completed_at = CURRENT_TIMESTAMP,
          time_spent_seconds = EXCLUDED.time_spent_seconds,
          notes = EXCLUDED.notes
        RETURNING *
      `;
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<LmsLessonCompletion>(result);
      
      return {
        success: true,
        data: rows[0],
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to mark lesson complete";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get completed lessons for staff member
   */
  async getStaffCompletions(staffId: number): Promise<ServiceResult<number[]>> {
    const startTime = Date.now();
    
    try {
      const query = `
        SELECT lesson_id FROM lms_lesson_completions
        WHERE staff_id = ${staffId}
      `;
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<{ lesson_id: number }>(result);
      
      return {
        success: true,
        data: rows.map((r) => r.lesson_id),
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch completions";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Check if lesson is completed
   */
  async isLessonCompleted(staffId: number, lessonId: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    
    try {
      const query = `
        SELECT 1 FROM lms_lesson_completions
        WHERE staff_id = ${staffId} AND lesson_id = ${lessonId}
        LIMIT 1
      `;
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<unknown>(result);
      
      return {
        success: true,
        data: rows.length > 0,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to check completion";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  // ============================================================================
  // Dashboard & Analytics
  // ============================================================================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<ServiceResult<LmsDashboardStats>> {
    const startTime = Date.now();
    
    try {
      // Get basic counts
      const countsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM lms_staff WHERE is_active = true) as total_staff,
          (SELECT COUNT(*) FROM lms_categories WHERE is_active = true) as total_categories,
          (SELECT COUNT(*) FROM lms_lessons WHERE is_active = true) as total_lessons
      `;
      
      const countsResult = await dbManager.executeUnsafe(countsQuery);
      const countsRows = extractRows<{ total_staff: number; total_categories: number; total_lessons: number }>(countsResult);
      const counts = countsRows[0];
      
      // Get overall completion rate
      const completionQuery = `
        SELECT 
          COUNT(DISTINCT lc.staff_id) as staff_with_completions,
          COUNT(DISTINCT lc.lesson_id) as completed_lessons_total
        FROM lms_lesson_completions lc
        JOIN lms_staff s ON s.id = lc.staff_id AND s.is_active = true
        JOIN lms_lessons l ON l.id = lc.lesson_id AND l.is_active = true
      `;
      
      const completionResult = await dbManager.executeUnsafe(completionQuery);
      const completionRows = extractRows<{ staff_with_completions: number; completed_lessons_total: number }>(completionResult);
      const completions = completionRows[0];
      
      const totalPossibleCompletions = parseInt(String(counts.total_staff)) * parseInt(String(counts.total_lessons));
      const overallCompletionRate = totalPossibleCompletions > 0
        ? Math.round((parseInt(String(completions.completed_lessons_total)) / totalPossibleCompletions) * 100)
        : 0;
      
      // Get staff progress
      const staffProgressQuery = `
        SELECT 
          s.id as staff_id,
          s.full_name as staff_name,
          s.branch_location as branch,
          s.role,
          COUNT(lc.lesson_id) as completed_count,
          MAX(lc.completed_at) as last_activity
        FROM lms_staff s
        LEFT JOIN lms_lesson_completions lc ON lc.staff_id = s.id
        WHERE s.is_active = true
        GROUP BY s.id, s.full_name, s.branch_location, s.role
        ORDER BY completed_count DESC
      `;
      
      const staffProgressResult = await dbManager.executeUnsafe(staffProgressQuery);
      const staffProgressRows = extractRows<{ staff_id: number; staff_name: string; branch: string | null; role: string; completed_count: number; last_activity: string | null }>(staffProgressResult);
      
      const staffProgress = staffProgressRows.map((s) => ({
        staff_id: s.staff_id,
        staff_name: s.staff_name,
        branch: s.branch,
        role: s.role,
        completion_percentage: calculateCompletionPercentage(
          parseInt(String(s.completed_count)),
          parseInt(String(counts.total_lessons))
        ),
        last_activity: s.last_activity,
      }));
      
      // Get category completion rates
      const categoryQuery = `
        SELECT 
          c.id as category_id,
          c.name as category_name,
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(lc.lesson_id) as completed_lessons
        FROM lms_categories c
        LEFT JOIN lms_lessons l ON l.category_id = c.id AND l.is_active = true
        LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id
        WHERE c.is_active = true
        GROUP BY c.id, c.name
        ORDER BY c.order_index
      `;
      
      const categoryResult = await dbManager.executeUnsafe(categoryQuery);
      const categoryRows = extractRows<{ category_id: number; category_name: string; total_lessons: number; completed_lessons: number }>(categoryResult);
      
      const categoryCompletion = categoryRows.map((c) => ({
        category_id: c.category_id,
        category_name: c.category_name,
        completion_rate: calculateCompletionPercentage(
          parseInt(String(c.completed_lessons)),
          parseInt(String(c.total_lessons)) * parseInt(String(counts.total_staff))
        ),
      }));
      
      const stats: LmsDashboardStats = {
        total_staff: parseInt(String(counts.total_staff)),
        total_categories: parseInt(String(counts.total_categories)),
        total_lessons: parseInt(String(counts.total_lessons)),
        overall_completion_rate: overallCompletionRate,
        staff_progress: staffProgress,
        category_completion: categoryCompletion,
      };
      
      return {
        success: true,
        data: stats,
        meta: { durationMs: Date.now() - startTime, queryCount: 4 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch dashboard stats";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get category with lessons and completion status for a staff member
   */
  async getCategoryWithLessonsForStaff(
    categoryId: number,
    staffId: number
  ): Promise<ServiceResult<LmsCategoryWithLessons>> {
    const startTime = Date.now();
    
    try {
      // Get category
      const categoryQuery = `SELECT * FROM lms_categories WHERE id = ${categoryId}`;
      const categoryResult = await dbManager.executeUnsafe(categoryQuery);
      const categoryRows = extractRows<LmsCategory>(categoryResult);
      
      if (categoryRows.length === 0) {
        return {
          success: false,
          error: "Category not found",
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      const category = categoryRows[0];
      
      // Get lessons with completion status
      const lessonsQuery = `
        SELECT 
          l.*,
          lc.completed_at IS NOT NULL as is_completed,
          lc.completed_at
        FROM lms_lessons l
        LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id AND lc.staff_id = ${staffId}
        WHERE l.category_id = ${categoryId} AND l.is_active = true
        ORDER BY l.order_index, l.id
      `;
      
      const lessonsResult = await dbManager.executeUnsafe(lessonsQuery);
      const lessonsRows = extractRows<LmsLesson & { is_completed: boolean; completed_at: string | null }>(lessonsResult);
      
      const totalLessons = lessonsRows.length;
      const completedLessons = lessonsRows.filter((l) => l.is_completed).length;
      
      const categoryWithLessons: LmsCategoryWithLessons = {
        ...category,
        lessons: lessonsRows,
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        is_complete: totalLessons > 0 && completedLessons === totalLessons,
      };
      
      return {
        success: true,
        data: categoryWithLessons,
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch category lessons";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get sequential lesson status for a staff member
   * Returns lessons with is_unlocked flag based on completion of previous lessons
   */
  async getSequentialLessonsForStaff(
    categoryId: number,
    staffId: number
  ): Promise<ServiceResult<(LmsLesson & { is_completed: boolean; is_unlocked: boolean; completed_at: string | null })[]>> {
    const startTime = Date.now();
    
    try {
      // Get all lessons with completion status
      const lessonsQuery = `
        SELECT 
          l.*,
          lc.completed_at IS NOT NULL as is_completed,
          lc.completed_at
        FROM lms_lessons l
        LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id AND lc.staff_id = ${staffId}
        WHERE l.category_id = ${categoryId} AND l.is_active = true
        ORDER BY l.order_index, l.id
      `;
      
      const lessonsResult = await dbManager.executeUnsafe(lessonsQuery);
      const lessons = extractRows<LmsLesson & { is_completed: boolean; completed_at: string | null }>(lessonsResult);
      
      // Calculate unlocked status based on sequential completion
      let previousCompleted = true; // First lesson is always unlocked
      
      const lessonsWithUnlockStatus = lessons.map((lesson) => {
        const isUnlocked = previousCompleted;
        // Update previousCompleted for next iteration
        previousCompleted = previousCompleted && lesson.is_completed;
        
        return {
          ...lesson,
          is_unlocked: isUnlocked,
        };
      });
      
      return {
        success: true,
        data: lessonsWithUnlockStatus,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch sequential lessons";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Check if a lesson is unlocked for a staff member (sequential learning)
   */
  async isLessonUnlocked(
    staffId: number,
    lessonId: number
  ): Promise<ServiceResult<{ is_unlocked: boolean; message?: string }>> {
    const startTime = Date.now();
    
    try {
      // Get the lesson details
      const lessonQuery = `SELECT * FROM lms_lessons WHERE id = ${lessonId} AND is_active = true`;
      const lessonResult = await dbManager.executeUnsafe(lessonQuery);
      const lessonRows = extractRows<LmsLesson>(lessonResult);
      
      if (lessonRows.length === 0) {
        return {
          success: false,
          error: "Lesson not found",
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      const lesson = lessonRows[0];
      
      // Get all previous lessons in the same category
      const previousLessonsQuery = `
        SELECT l.id, lc.completed_at IS NOT NULL as is_completed
        FROM lms_lessons l
        LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id AND lc.staff_id = ${staffId}
        WHERE l.category_id = ${lesson.category_id} 
          AND l.is_active = true
          AND (l.order_index < ${lesson.order_index} 
               OR (l.order_index = ${lesson.order_index} AND l.id < ${lesson.id}))
        ORDER BY l.order_index DESC, l.id DESC
      `;
      
      const previousResult = await dbManager.executeUnsafe(previousLessonsQuery);
      const previousLessons = extractRows<{ id: number; is_completed: boolean }>(previousResult);
      
      // If no previous lessons, it's unlocked (first lesson)
      if (previousLessons.length === 0) {
        return {
          success: true,
          data: { is_unlocked: true },
          meta: { durationMs: Date.now() - startTime, queryCount: 2 },
        };
      }
      
      // Check if the immediate previous lesson is completed
      const immediatePrevious = previousLessons[0];
      
      if (!immediatePrevious.is_completed) {
        // Find the first incomplete lesson to show in message
        const firstIncomplete = previousLessons.find(l => !l.is_completed);
        return {
          success: true,
          data: { 
            is_unlocked: false, 
            message: `Please complete previous lessons first. Lesson #${firstIncomplete?.id} is not completed.` 
          },
          meta: { durationMs: Date.now() - startTime, queryCount: 2 },
        };
      }
      
      return {
        success: true,
        data: { is_unlocked: true },
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to check lesson unlock status";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get next available lesson for a staff member in a category
   */
  async getNextAvailableLesson(
    staffId: number,
    categoryId: number
  ): Promise<ServiceResult<{ next_lesson_id: number | null; all_completed: boolean }>> {
    const startTime = Date.now();
    
    try {
      // Get sequential lessons
      const seqResult = await this.getSequentialLessonsForStaff(categoryId, staffId);
      
      if (!seqResult.success || !seqResult.data) {
        return {
          success: false,
          error: seqResult.error || "Failed to get lessons",
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      const lessons = seqResult.data;
      
      // Find first unlocked but not completed lesson
      const nextLesson = lessons.find(l => l.is_unlocked && !l.is_completed);
      
      if (nextLesson) {
        return {
          success: true,
          data: { next_lesson_id: nextLesson.id, all_completed: false },
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }
      
      // Check if all completed
      const allCompleted = lessons.every(l => l.is_completed);
      
      return {
        success: true,
        data: { 
          next_lesson_id: allCompleted ? null : lessons.find(l => !l.is_unlocked)?.id || null,
          all_completed: allCompleted 
        },
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get next lesson";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get detailed staff progress with current lesson info
   */
  async getStaffProgressWithCurrentLesson(): Promise<ServiceResult<{
    staff_id: number;
    staff_name: string;
    branch: string | null;
    role: string;
    total_lessons: number;
    completed_lessons: number;
    completion_percentage: number;
    current_lesson_id: number | null;
    current_lesson_title: string | null;
    last_activity: string | null;
  }[]>> {
    const startTime = Date.now();
    
    try {
      // Get all staff with their progress
      const query = `
        WITH staff_stats AS (
          SELECT 
            s.id as staff_id,
            s.full_name as staff_name,
            s.branch_location as branch,
            s.role,
            COUNT(DISTINCT l.id) as total_lessons,
            COUNT(DISTINCT lc.lesson_id) as completed_lessons,
            MAX(lc.completed_at) as last_activity
          FROM lms_staff s
          CROSS JOIN lms_lessons l
          LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id AND lc.staff_id = s.id
          WHERE s.is_active = true AND l.is_active = true
          GROUP BY s.id, s.full_name, s.branch_location, s.role
        ),
        current_lessons AS (
          SELECT DISTINCT ON (s.id)
            s.id as staff_id,
            l.id as lesson_id,
            l.title as lesson_title
          FROM lms_staff s
          CROSS JOIN LATERAL (
            SELECT l.*
            FROM lms_lessons l
            LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id AND lc.staff_id = s.id
            WHERE l.is_active = true
              AND (lc.completed_at IS NULL OR lc.completed_at IS NOT NULL)
            ORDER BY l.order_index, l.id
          ) l
          WHERE s.is_active = true
            AND NOT EXISTS (
              SELECT 1 FROM lms_lesson_completions lc2 
              WHERE lc2.lesson_id = l.id AND lc2.staff_id = s.id
            )
          ORDER BY s.id, l.order_index, l.id
        )
        SELECT 
          ss.*,
          COALESCE(cl.lesson_id, 
            (SELECT l2.id FROM lms_lessons l2 
             LEFT JOIN lms_lesson_completions lc2 ON lc2.lesson_id = l2.id AND lc2.staff_id = ss.staff_id
             WHERE l2.is_active = true AND lc2.completed_at IS NULL
             ORDER BY l2.order_index, l2.id 
             LIMIT 1)
          ) as current_lesson_id,
          COALESCE(cl.lesson_title,
            (SELECT l2.title FROM lms_lessons l2 
             LEFT JOIN lms_lesson_completions lc2 ON lc2.lesson_id = l2.id AND lc2.staff_id = ss.staff_id
             WHERE l2.is_active = true AND lc2.completed_at IS NULL
             ORDER BY l2.order_index, l2.id 
             LIMIT 1)
          ) as current_lesson_title
        FROM staff_stats ss
        LEFT JOIN current_lessons cl ON cl.staff_id = ss.staff_id
        ORDER BY ss.staff_name
      `;
      
      const result = await dbManager.executeUnsafe(query);
      const rows = extractRows<{
        staff_id: number;
        staff_name: string;
        branch: string | null;
        role: string;
        total_lessons: number;
        completed_lessons: number;
        last_activity: string | null;
        current_lesson_id: number | null;
        current_lesson_title: string | null;
      }>(result);
      
      const progress = rows.map((row) => ({
        ...row,
        completion_percentage: calculateCompletionPercentage(
          parseInt(String(row.completed_lessons)),
          parseInt(String(row.total_lessons))
        ),
      }));
      
      return {
        success: true,
        data: progress,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch staff progress";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const lmsService = LmsService.getInstance();
export default lmsService;
