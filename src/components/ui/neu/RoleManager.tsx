/**
 * RoleManager Component
 * 
 * A comprehensive role management interface with Neumorphism (Soft UI) design.
 * Allows creating, editing, and managing custom roles with granular permissions.
 * 
 * @module ui/neu/RoleManager
 */

"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/ui";
import type { RoleDefinition, Permission } from "@/lib/types";
import { 
  PERMISSION_LABELS, 
  PERMISSION_CATEGORIES,
  DEFAULT_ROLE_PERMISSIONS 
} from "@/lib/types";
import { 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  Users,
  Settings,
  Car,
  BookOpen,
  BarChart3,
  Lock
} from "lucide-react";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface RoleManagerProps {
  /** Current user role to check permissions */
  currentUserRole: string;
  /** List of existing roles */
  roles: RoleDefinition[];
  /** Callback when a role is created */
  onCreateRole: (role: Omit<RoleDefinition, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  /** Callback when a role is updated */
  onUpdateRole: (id: string, role: Partial<RoleDefinition>) => Promise<void>;
  /** Callback when a role is deleted */
  onDeleteRole: (id: string) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

interface RoleFormData {
  name: string;
  description: string;
  color: string;
  permissions: Permission[];
}

// ============================================================================
// Constants
// ============================================================================

const ROLE_COLORS = [
  { name: "Emerald", value: "#10b981", class: "text-emerald-600" },
  { name: "Blue", value: "#3b82f6", class: "text-blue-600" },
  { name: "Purple", value: "#8b5cf6", class: "text-purple-600" },
  { name: "Orange", value: "#f97316", class: "text-orange-600" },
  { name: "Pink", value: "#ec4899", class: "text-pink-600" },
  { name: "Cyan", value: "#06b6d4", class: "text-cyan-600" },
  { name: "Red", value: "#ef4444", class: "text-red-600" },
  { name: "Amber", value: "#f59e0b", class: "text-amber-600" },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Vehicles": <Car className="w-4 h-4" />,
  "Users": <Users className="w-4 h-4" />,
  "LMS": <BookOpen className="w-4 h-4" />,
  "Settings": <Settings className="w-4 h-4" />,
  "Reports": <BarChart3 className="w-4 h-4" />,
  "System": <Lock className="w-4 h-4" />,
};

// ============================================================================
// Component
// ============================================================================

export function RoleManager({
  currentUserRole,
  roles,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  className,
}: RoleManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    description: "",
    color: ROLE_COLORS[0].value,
    permissions: [],
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const isAdmin = currentUserRole === "Admin";

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      description: "",
      color: ROLE_COLORS[0].value,
      permissions: [],
    });
    setError("");
    setSuccess("");
  }, []);

  const handleCreateClick = useCallback(() => {
    setIsCreating(true);
    resetForm();
  }, [resetForm]);

  const handleEditClick = useCallback((role: RoleDefinition) => {
    setIsEditing(role.id);
    setFormData({
      name: role.name,
      description: role.description,
      color: role.color,
      permissions: [...role.permissions],
    });
    setError("");
    setSuccess("");
  }, []);

  const handleCancel = useCallback(() => {
    setIsCreating(false);
    setIsEditing(null);
    resetForm();
  }, [resetForm]);

  const handlePermissionToggle = useCallback((permission: Permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  }, []);

  const handleCategoryToggle = useCallback((categoryPermissions: Permission[]) => {
    setFormData((prev) => {
      const allSelected = categoryPermissions.every((p) => prev.permissions.includes(p));
      if (allSelected) {
        // Remove all permissions in this category
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => !categoryPermissions.includes(p)),
        };
      } else {
        // Add all permissions in this category
        const newPermissions = [...prev.permissions];
        categoryPermissions.forEach((p) => {
          if (!newPermissions.includes(p)) {
            newPermissions.push(p);
          }
        });
        return { ...prev, permissions: newPermissions };
      }
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      setError("Role name is required");
      return;
    }

    if (formData.permissions.length === 0) {
      setError("At least one permission is required");
      return;
    }

    try {
      if (isEditing) {
        await onUpdateRole(isEditing, {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          permissions: formData.permissions,
        });
        setSuccess("Role updated successfully");
      } else {
        await onCreateRole({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          permissions: formData.permissions,
          isSystem: false,
        });
        setSuccess("Role created successfully");
      }
      
      setTimeout(() => {
        handleCancel();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role");
    }
  }, [formData, isEditing, onCreateRole, onUpdateRole, handleCancel]);

  const handleDelete = useCallback(async (roleId: string) => {
    // Find the role being deleted
    const roleToDelete = roles.find((r) => r.id === roleId);
    
    // Prevent deleting your own role
    if (roleToDelete && roleToDelete.name === currentUserRole) {
      setError("You cannot delete your own role. Please ask another administrator to do this.");
      setTimeout(() => setError(""), 5000);
      return;
    }

    // Prevent deleting system roles
    if (roleToDelete?.isSystem) {
      setError("System roles cannot be deleted.");
      setTimeout(() => setError(""), 5000);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the "${roleToDelete?.name}" role? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(roleId);
    try {
      await onDeleteRole(roleId);
      setSuccess("Role deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setIsDeleting(null);
    }
  }, [onDeleteRole, roles, currentUserRole]);

  const getRoleColorClass = (colorValue: string) => {
    const color = ROLE_COLORS.find((c) => c.value === colorValue);
    return color?.class || "text-gray-600";
  };

  const getRoleColorBg = (colorValue: string) => {
    return { backgroundColor: colorValue + "20" }; // 20 = 12% opacity in hex
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderPermissionCategory = (category: string, permissions: Permission[]) => {
    const selectedCount = permissions.filter((p) => formData.permissions.includes(p)).length;
    const allSelected = selectedCount === permissions.length;
    const someSelected = selectedCount > 0 && !allSelected;

    return (
      <div key={category} className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => handleCategoryToggle(permissions)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all",
              "bg-[#e0e5ec] shadow-[2px_2px_4px_#a3b1c6,-2px_-2px_4px_#ffffff]",
              allSelected && "text-emerald-600 shadow-[inset_2px_2px_4px_#a3b1c6,inset_-2px_-2px_4px_#ffffff]",
              someSelected && "text-amber-600",
              !selectedCount && "text-[#4a4a5a]"
            )}
          >
            {CATEGORY_ICONS[category]}
            {category}
            {selectedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#e0e5ec] shadow-[1px_1px_2px_#a3b1c6,-1px_-1px_2px_#ffffff] text-[10px]">
                {selectedCount}/{permissions.length}
              </span>
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-4">
          {permissions.map((permission) => (
            <button
              key={permission}
              type="button"
              onClick={() => handlePermissionToggle(permission)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all text-left",
                "bg-[#e0e5ec] shadow-[2px_2px_4px_#a3b1c6,-2px_-2px_4px_#ffffff]",
                formData.permissions.includes(permission)
                  ? "shadow-[inset_2px_2px_4px_#a3b1c6,inset_-2px_-2px_4px_#ffffff] text-emerald-600"
                  : "text-[#4a4a5a] hover:shadow-[3px_3px_6px_#a3b1c6,-3px_-3px_6px_#ffffff]"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center transition-all",
                  formData.permissions.includes(permission)
                    ? "bg-emerald-500 text-white"
                    : "bg-[#e0e5ec] shadow-[1px_1px_2px_#a3b1c6,-1px_-1px_2px_#ffffff]"
                )}
              >
                {formData.permissions.includes(permission) && <Check className="w-3 h-3" />}
              </div>
              {PERMISSION_LABELS[permission]}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  if (!isAdmin) {
    return (
      <div className="p-6 rounded-[20px] bg-[#e0e5ec] shadow-[8px_8px_16px_#a3b1c6,-8px_-8px_16px_#ffffff]">
        <div className="flex items-center gap-3 text-[#e74c3c]">
          <Shield className="w-5 h-5" />
          <p className="text-sm font-medium">Only administrators can manage roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1a1a2e]">Role Management</h2>
          <p className="text-sm text-[#4a4a5a] mt-1">
            Create and manage custom roles with granular permissions
          </p>
        </div>
        {!isCreating && !isEditing && (
          <button
            onClick={handleCreateClick}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl",
              "bg-[#e0e5ec] text-emerald-600",
              "shadow-[4px_4px_8px_#a3b1c6,-4px_-4px_8px_#ffffff]",
              "hover:shadow-[6px_6px_12px_#a3b1c6,-6px_-6px_12px_#ffffff]",
              "active:shadow-[inset_3px_3px_6px_#a3b1c6,inset_-3px_-3px_6px_#ffffff]",
              "transition-all duration-200 font-semibold text-sm"
            )}
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-[16px] bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff] text-[#e74c3c] text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-[16px] bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff] text-emerald-600 text-sm">
          {success}
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || isEditing) && (
        <div className="p-6 rounded-[24px] bg-[#e0e5ec] shadow-[12px_12px_24px_#a3b1c6,-12px_-12px_24px_#ffffff]">
          <h3 className="text-lg font-bold text-[#1a1a2e] mb-4">
            {isEditing ? "Edit Role" : "Create New Role"}
          </h3>

          <div className="space-y-4">
            {/* Role Name */}
            <div>
              <label className="block text-xs font-bold text-[#1a1a2e] uppercase tracking-wide mb-2">
                Role Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Manager, Supervisor, Viewer"
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-sm text-[#1a1a2e]",
                  "bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff]",
                  "outline-none transition-all placeholder:text-[#4a4a5a]",
                  "focus:shadow-[inset_6px_6px_12px_#a3b1c6,inset_-6px_-6px_12px_#ffffff]"
                )}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[#1a1a2e] uppercase tracking-wide mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this role's responsibilities"
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-sm text-[#1a1a2e]",
                  "bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff]",
                  "outline-none transition-all placeholder:text-[#4a4a5a]",
                  "focus:shadow-[inset_6px_6px_12px_#a3b1c6,inset_-6px_-6px_12px_#ffffff]"
                )}
              />
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-xs font-bold text-[#1a1a2e] uppercase tracking-wide mb-2">
                Role Color
              </label>
              <div className="flex flex-wrap gap-3">
                {ROLE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color: color.value }))}
                    className={cn(
                      "w-10 h-10 rounded-xl transition-all",
                      "shadow-[3px_3px_6px_#a3b1c6,-3px_-3px_6px_#ffffff]",
                      formData.color === color.value
                        ? "shadow-[inset_3px_3px_6px_#a3b1c6,inset_-3px_-3px_6px_#ffffff] ring-2 ring-offset-2 ring-offset-[#e0e5ec] ring-emerald-500"
                        : "hover:shadow-[4px_4px_8px_#a3b1c6,-4px_-4px_8px_#ffffff]"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-xs font-bold text-[#1a1a2e] uppercase tracking-wide mb-3">
                Permissions *
              </label>
              <div className="p-4 rounded-[16px] bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff]">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) =>
                  renderPermissionCategory(category, permissions)
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleSubmit}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl",
                  "bg-[#e0e5ec] text-emerald-600",
                  "shadow-[4px_4px_8px_#a3b1c6,-4px_-4px_8px_#ffffff]",
                  "hover:shadow-[6px_6px_12px_#a3b1c6,-6px_-6px_12px_#ffffff]",
                  "active:shadow-[inset_3px_3px_6px_#a3b1c6,inset_-3px_-3px_6px_#ffffff]",
                  "transition-all duration-200 font-semibold text-sm"
                )}
              >
                <Check className="w-4 h-4" />
                {isEditing ? "Update Role" : "Create Role"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl",
                  "bg-[#e0e5ec] text-[#4a4a5a]",
                  "shadow-[4px_4px_8px_#a3b1c6,-4px_-4px_8px_#ffffff]",
                  "hover:shadow-[6px_6px_12px_#a3b1c6,-6px_-6px_12px_#ffffff]",
                  "active:shadow-[inset_3px_3px_6px_#a3b1c6,inset_-3px_-3px_6px_#ffffff]",
                  "transition-all duration-200 font-semibold text-sm"
                )}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roles List */}
      {!isCreating && !isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* System Roles */}
          {roles
            .filter((role) => role.isSystem)
            .map((role) => (
              <div
                key={role.id}
                className={cn(
                  "p-5 rounded-[20px] bg-[#e0e5ec]",
                  "shadow-[8px_8px_16px_#a3b1c6,-8px_-8px_16px_#ffffff]",
                  "transition-all duration-200"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        "shadow-[3px_3px_6px_#a3b1c6,-3px_-3px_6px_#ffffff]"
                      )}
                      style={getRoleColorBg(role.color)}
                    >
                      <Shield className={cn("w-6 h-6", getRoleColorClass(role.color))} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1a1a2e]">{role.name}</h4>
                      <p className="text-xs text-[#4a4a5a]">{role.description}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#e0e5ec] shadow-[1px_1px_2px_#a3b1c6,-1px_-1px_2px_#ffffff] text-[10px] text-[#4a4a5a]">
                        System Role
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#a3b1c6]/30">
                  <p className="text-xs text-[#4a4a5a]">
                    {role.permissions.length} permissions
                  </p>
                </div>
              </div>
            ))}

          {/* Custom Roles */}
          {roles
            .filter((role) => !role.isSystem)
            .map((role) => (
              <div
                key={role.id}
                className={cn(
                  "p-5 rounded-[20px] bg-[#e0e5ec]",
                  "shadow-[8px_8px_16px_#a3b1c6,-8px_-8px_16px_#ffffff]",
                  "transition-all duration-200"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        "shadow-[3px_3px_6px_#a3b1c6,-3px_-3px_6px_#ffffff]"
                      )}
                      style={getRoleColorBg(role.color)}
                    >
                      <Shield className={cn("w-6 h-6", getRoleColorClass(role.color))} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1a1a2e]">{role.name}</h4>
                      <p className="text-xs text-[#4a4a5a]">{role.description}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#e0e5ec] shadow-[1px_1px_2px_#a3b1c6,-1px_-1px_2px_#ffffff] text-[10px] text-emerald-600">
                        Custom Role
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(role)}
                      className={cn(
                        "p-2 rounded-lg",
                        "bg-[#e0e5ec] text-[#4a4a5a]",
                        "shadow-[2px_2px_4px_#a3b1c6,-2px_-2px_4px_#ffffff]",
                        "hover:shadow-[inset_2px_2px_4px_#a3b1c6,inset_-2px_-2px_4px_#ffffff]",
                        "transition-all duration-200"
                      )}
                      title="Edit role"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      disabled={isDeleting === role.id}
                      className={cn(
                        "p-2 rounded-lg",
                        "bg-[#e0e5ec] text-[#e74c3c]",
                        "shadow-[2px_2px_4px_#a3b1c6,-2px_-2px_4px_#ffffff]",
                        "hover:shadow-[inset_2px_2px_4px_#a3b1c6,inset_-2px_-2px_4px_#ffffff]",
                        "transition-all duration-200",
                        "disabled:opacity-50"
                      )}
                      title="Delete role"
                    >
                      {isDeleting === role.id ? (
                        <div className="w-4 h-4 border-2 border-[#e74c3c] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#a3b1c6]/30">
                  <p className="text-xs text-[#4a4a5a]">
                    {role.permissions.length} permissions
                  </p>
                </div>
              </div>
            ))}

          {/* Empty State */}
          {roles.filter((r) => !r.isSystem).length === 0 && (
            <div className="col-span-full p-8 rounded-[20px] bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff] text-center">
              <p className="text-sm text-[#4a4a5a]">
                No custom roles yet. Click "Create Role" to add one.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Export default roles for initialization
// ============================================================================

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full system access with all permissions",
    color: "#ef4444",
    permissions: DEFAULT_ROLE_PERMISSIONS.Admin,
    isSystem: true,
  },
  {
    id: "staff",
    name: "Staff",
    description: "Standard staff member with limited access",
    color: "#3b82f6",
    permissions: DEFAULT_ROLE_PERMISSIONS.Staff,
    isSystem: true,
  },
];
