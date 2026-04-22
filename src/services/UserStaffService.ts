/**
 * Unified User/Staff Service
 * 
 * Integrates the Settings user management with LMS staff management.
 * When a user is created, they automatically become LMS staff.
 * 
 * @module services/UserStaffService
 */

import { lmsService } from "./LmsService";
import type { CreateLmsStaffInput, UpdateLmsStaffInput } from "@/lib/lms-entities";
import type { Role } from "@/lib/types";

// ============================================================================
// Types
// ============================================================================

export interface UnifiedUser {
  username: string;
  full_name: string;
  email: string | null;
  role: Role;
  branch_location: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // LMS specific
  staff_id?: number;
  lms_role?: string;
}

export interface CreateUnifiedUserDTO {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  role: Role;
  branch_location?: string;
  phone?: string;
}

export interface UpdateUnifiedUserDTO {
  username: string;
  staff_id?: number;
  full_name?: string;
  email?: string;
  role?: Role;
  branch_location?: string;
  phone?: string;
  is_active?: boolean;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Unified Service Class
// ============================================================================

export class UserStaffService {
  private static instance: UserStaffService;

  public static getInstance(): UserStaffService {
    if (!UserStaffService.instance) {
      UserStaffService.instance = new UserStaffService();
    }
    return UserStaffService.instance;
  }

  // ============================================================================
  // Create User + Staff Together
  // ============================================================================

  async createUserAndStaff(data: CreateUnifiedUserDTO): Promise<ServiceResponse<UnifiedUser>> {
    try {
      // Step 1: Create auth user via settings API
      const userResponse = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
          role: data.role === "Admin" ? "Admin" : "Staff",
        }),
      });

      if (!userResponse.ok) {
        const error = await userResponse.json();
        throw new Error(error.error || "Failed to create user");
      }

      // Step 2: Create LMS staff with unified role
      const staffData: CreateLmsStaffInput = {
        fullName: data.full_name || data.username,
        email: data.email || null,
        branchLocation: data.branch_location || null,
        role: data.role,
        phone: data.phone || null,
      };

      const staffResult = await lmsService.createStaff(staffData);
      
      if (!staffResult.success) {
        // Rollback: Try to delete the created user
        console.error("[UserStaffService] Staff creation failed, attempting rollback");
        await this.deleteUser(data.username).catch(console.error);
        throw new Error(staffResult.error || "Failed to create staff");
      }

      const unifiedUser: UnifiedUser = {
        username: data.username,
        full_name: staffData.fullName,
        email: staffData.email,
        role: data.role,
        branch_location: staffData.branchLocation,
        phone: staffData.phone,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        staff_id: staffResult.data?.id ? Number(staffResult.data.id) : undefined,
        lms_role: staffData.role,
      };

      return { success: true, data: unifiedUser };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user and staff";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Get All Unified Users
  // ============================================================================

  async getAllUsers(): Promise<ServiceResponse<UnifiedUser[]>> {
    try {
      // Get auth users
      const usersRes = await fetch("/api/auth/users", { cache: "no-store" });
      const usersData = await usersRes.json();
      
      if (!usersRes.ok || !usersData.users) {
        throw new Error(usersData.error || "Failed to fetch users");
      }

      // Get LMS staff
      const staffResult = await lmsService.getStaff();
      
      if (!staffResult.success) {
        throw new Error(staffResult.error || "Failed to fetch staff");
      }

      // Merge data
      const unifiedUsers: UnifiedUser[] = usersData.users.map((user: { username: string; role: string; createdAt: number; updatedAt: number }) => {
        const staffMember = staffResult.data?.find(
          (s) => s.fullName.toLowerCase() === user.username.toLowerCase() ||
                s.email?.toLowerCase() === user.username.toLowerCase()
        );

        return {
          username: user.username,
          full_name: staffMember?.fullName || user.username,
          email: staffMember?.email || null,
          role: this.mapLmsRoleToAppRole(staffMember?.role || user.role),
          branch_location: staffMember?.branchLocation || null,
          phone: staffMember?.phone || null,
          is_active: staffMember?.isActive ?? true,
          created_at: new Date(user.createdAt).toISOString(),
          updated_at: new Date(user.updatedAt).toISOString(),
          staff_id: staffMember?.id ? Number(staffMember.id) : undefined,
          lms_role: staffMember?.role,
        };
      });

      return { success: true, data: unifiedUsers };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch users";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Update User + Staff
  // ============================================================================

  async updateUserAndStaff(data: UpdateUnifiedUserDTO): Promise<ServiceResponse<UnifiedUser>> {
    try {
      // Update LMS staff if staff_id exists
      if (data.staff_id) {
        const staffUpdateInput: UpdateLmsStaffInput = {
          fullName: data.full_name,
          email: data.email,
          branchLocation: data.branch_location,
          role: data.role,
          phone: data.phone,
          isActive: data.is_active,
        };
        const staffUpdate = await lmsService.updateStaff(data.staff_id, staffUpdateInput);

        if (!staffUpdate.success) {
          throw new Error(staffUpdate.error || "Failed to update staff");
        }
      }

      // Note: Auth user update would go here if the API supports it

      const unifiedUser: UnifiedUser = {
        username: data.username,
        full_name: data.full_name || data.username,
        email: data.email || null,
        role: data.role || "Staff",
        branch_location: data.branch_location || null,
        phone: data.phone || null,
        is_active: data.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return { success: true, data: unifiedUser };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Delete User + Staff
  // ============================================================================

  async deleteUser(username: string): Promise<ServiceResponse<boolean>> {
    try {
      // Delete auth user
      const userRes = await fetch("/api/auth/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!userRes.ok) {
        const error = await userRes.json();
        throw new Error(error.error || "Failed to delete user");
      }

      return { success: true, data: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapRoleToLmsRole(role: Role): Role {
    // Unified role system - same roles everywhere
    return role;
  }

  private mapLmsRoleToAppRole(role: string): Role {
    // Unified role system - only Admin and Staff are valid
    if (role === "Admin") return "Admin";
    return "Staff";
  }
}

// Export singleton
export const userStaffService = UserStaffService.getInstance();
