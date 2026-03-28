/**
 * Unified User Service
 * 
 * Single source of truth for all users across the application.
 * Settings users, LMS staff, and Admin users are all the same entity.
 * 
 * @module services/UnifiedUserService
 */

import { lmsService } from "./LmsService";
import type { CreateLmsStaffInput, UpdateLmsStaffInput, LmsStaff } from "@/lib/lms-schema";
import type { Role } from "@/lib/types";

// ============================================================================
// Types - Single Unified User Model
// ============================================================================

export type UserRole = Role;

export interface UnifiedUser {
  // Core Identity (same across all modules)
  id: string;                    // Auth system ID (username)
  full_name: string;
  email: string | null;
  role: UserRole;
  
  // Profile Data
  phone: string | null;
  branch_location: string | null;
  avatar_url: string | null;
  
  // Status
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  
  // LMS Specific (null if not enrolled in LMS)
  lms_staff_id?: number;
  lms_enrolled_at?: string;
  lms_completion_rate?: number;
}

export interface CreateUserInput {
  id: string;                    // Username
  password: string;
  full_name: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  branch_location?: string;
  enroll_in_lms?: boolean;       // Auto-enroll as staff
}

export interface UpdateUserInput {
  id: string;
  full_name?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  branch_location?: string;
  is_active?: boolean;
  avatar_url?: string;
  lms_staff_id?: number;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Unified User Service
// ============================================================================

export class UnifiedUserService {
  private static instance: UnifiedUserService;

  public static getInstance(): UnifiedUserService {
    if (!UnifiedUserService.instance) {
      UnifiedUserService.instance = new UnifiedUserService();
    }
    return UnifiedUserService.instance;
  }

  // ============================================================================
  // CREATE - Single User Creation Flow
  // ============================================================================

  /**
   * Create a unified user that works across all modules
   * Used by: Settings, Admin LMS, LMS
   */
  async createUser(input: CreateUserInput): Promise<ServiceResponse<UnifiedUser>> {
    try {
      // Step 1: Create auth user (settings system)
      const authResult = await this.createAuthUser({
        username: input.id,
        password: input.password,
        role: input.role || "Staff",
      });

      if (!authResult.success) {
        return { success: false, error: authResult.error };
      }

      // Step 2: Create LMS staff if requested or if role requires it
      let lmsData: { staff_id?: number; enrolled_at?: string } = {};
      
      if (input.enroll_in_lms !== false) {
        // All users get LMS access with unified role system
        const lmsResult = await this.enrollInLMS({
          full_name: input.full_name,
          email: input.email || null,
          role: (input.role || "Staff") as Role,
          branch_location: input.branch_location || null,
          phone: input.phone || null,
        });

        if (lmsResult.success && lmsResult.data) {
          lmsData = {
            staff_id: lmsResult.data.id,
            enrolled_at: new Date().toISOString(),
          };
        }
      }

      const user: UnifiedUser = {
        id: input.id,
        full_name: input.full_name,
        email: input.email || null,
        role: input.role || "Staff",
        phone: input.phone || null,
        branch_location: input.branch_location || null,
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: null,
        ...lmsData,
      };

      return { success: true, data: user };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // READ - Get Users (Unified View)
  // ============================================================================

  /**
   * Get all users with unified data from all systems
   */
  async getAllUsers(): Promise<ServiceResponse<UnifiedUser[]>> {
    try {
      // Get auth users from settings API
      const authUsersRes = await fetch("/api/auth/users", { cache: "no-store" });
      const authData = await authUsersRes.json().catch(() => ({}));
      
      if (!authUsersRes.ok || !authData.users) {
        throw new Error(authData.error || "Failed to fetch users");
      }

      // Get LMS staff data
      const lmsResult = await lmsService.getStaff();
      const lmsStaff = lmsResult.success ? lmsResult.data || [] : [];

      // Merge into unified view
      const users: UnifiedUser[] = authData.users.map((authUser: { 
        username: string; 
        role: string; 
        createdAt: number; 
        updatedAt: number;
      }) => {
        // Find matching LMS staff by name or email
        const staff = lmsStaff.find((s: LmsStaff) => 
          s.full_name.toLowerCase() === authUser.username.toLowerCase() ||
          s.email?.toLowerCase() === authUser.username.toLowerCase()
        );

        return this.mergeUserData(authUser, staff);
      });

      return { success: true, data: users };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch users";
      return { success: false, error: message };
    }
  }

  /**
   * Get single user by ID
   */
  async getUserById(id: string): Promise<ServiceResponse<UnifiedUser>> {
    try {
      // Get from auth system
      const usersResult = await this.getAllUsers();
      if (!usersResult.success) {
        return { success: false, error: usersResult.error };
      }

      const user = usersResult.data?.find(u => u.id === id);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      return { success: true, data: user };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // UPDATE - Modify User Across All Systems
  // ============================================================================

  /**
   * Update user in all systems
   */
  async updateUser(input: UpdateUserInput): Promise<ServiceResponse<UnifiedUser>> {
    try {
      // Update LMS staff if exists
      if (input.lms_staff_id) {
        const lmsUpdate: UpdateLmsStaffInput = {
          full_name: input.full_name,
          email: input.email,
          branch_location: input.branch_location,
          role: input.role ? this.mapToLmsRole(input.role) : undefined,
          phone: input.phone,
          is_active: input.is_active,
        };

        const lmsResult = await lmsService.updateStaff(input.lms_staff_id, lmsUpdate);
        if (!lmsResult.success) {
          console.warn("[UnifiedUserService] LMS update failed:", lmsResult.error);
        }
      }

      // Note: Auth system updates would go here if supported

      // Return updated user
      const userResult = await this.getUserById(input.id);
      return userResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // DELETE - Remove User From All Systems
  // ============================================================================

  /**
   * Delete user from auth system (LMS staff handled separately)
   */
  async deleteUser(id: string): Promise<ServiceResponse<boolean>> {
    try {
      // Delete from auth system
      const res = await fetch("/api/auth/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: id }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete user");
      }

      // LMS staff record remains for historical data
      // Can be deactivated via separate call if needed

      return { success: true, data: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // LMS Enrollment
  // ============================================================================

  /**
   * Enroll existing user in LMS
   */
  async enrollUserInLMS(userId: string, lmsData: CreateLmsStaffInput): Promise<ServiceResponse<UnifiedUser>> {
    try {
      // Get current user
      const userResult = await this.getUserById(userId);
      if (!userResult.success || !userResult.data) {
        return { success: false, error: "User not found" };
      }

      // Create LMS staff record
      const lmsResult = await lmsService.createStaff(lmsData);
      if (!lmsResult.success) {
        return { success: false, error: lmsResult.error || "Failed to enroll in LMS" };
      }

      // Return updated user
      const updatedUser: UnifiedUser = {
        ...userResult.data,
        lms_staff_id: lmsResult.data?.id,
        lms_enrolled_at: new Date().toISOString(),
      };

      return { success: true, data: updatedUser };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to enroll user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async createAuthUser(data: { username: string; password: string; role: string }): Promise<ServiceResponse<void>> {
    const res = await fetch("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return { success: false, error: error.error || "Failed to create auth user" };
    }

    return { success: true };
  }

  private async enrollInLMS(data: CreateLmsStaffInput): Promise<ServiceResponse<LmsStaff>> {
    return await lmsService.createStaff(data);
  }

  private mergeUserData(
    authUser: { username: string; role: string; createdAt: number; updatedAt: number },
    staff: LmsStaff | undefined
  ): UnifiedUser {
    return {
      id: authUser.username,
      full_name: staff?.full_name || authUser.username,
      email: staff?.email || null,
      role: this.mapFromLmsRole(staff?.role || authUser.role),
      phone: staff?.phone || null,
      branch_location: staff?.branch_location || null,
      avatar_url: null,
      is_active: staff?.is_active ?? true,
      created_at: new Date(authUser.createdAt).toISOString(),
      updated_at: new Date(authUser.updatedAt).toISOString(),
      last_login_at: null,
      lms_staff_id: staff?.id,
      lms_enrolled_at: staff ? new Date().toISOString() : undefined,
    };
  }

  private mapToLmsRole(role: UserRole): Role {
    // Unified role system - same roles everywhere
    return role;
  }

  private mapFromLmsRole(role: string): UserRole {
    // Unified role system - only Admin and Staff are valid
    if (role === "Admin") return "Admin";
    return "Staff";
  }
}

// Export singleton
export const unifiedUserService = UnifiedUserService.getInstance();
