/**
 * Auth Helpers - Simplified authentication utilities for API routes
 * 
 * @module auth-helpers
 */

import { NextRequest } from "next/server";
import { requireSession, type SessionPayload } from "./auth";

import type { Role } from "./types";

/**
 * Auth result type
 */
export interface AuthResult {
  success: boolean;
  user?: {
    username: string;
    role: Role;
  };
  error?: string;
}

/**
 * Require authentication for API routes
 * Returns user info if authenticated, error message if not
 */
export async function requireAuth(req?: NextRequest): Promise<AuthResult> {
  // If no request provided, return mock auth for testing
  if (!req) {
    return {
      success: true,
      user: {
        username: "admin",
        role: "Admin",
      },
    };
  }

  // Get session from request cookies
  const session = requireSession({
    headers: req.headers,
    cookies: {
      get: (name: string) => {
        const cookie = req.cookies.get(name);
        return cookie ? { value: cookie.value } : undefined;
      },
    },
  });

  if (!session) {
    return {
      success: false,
      error: "Unauthorized - Please log in",
    };
  }

  return {
    success: true,
    user: {
      username: session.username,
      role: session.role,
    },
  };
}

/**
 * Require specific role for API routes
 */
export async function requireRole(
  allowedRoles: Role[],
  req?: NextRequest
): Promise<AuthResult> {
  const auth = await requireAuth(req);
  
  if (!auth.success) {
    return auth;
  }
  
  if (!auth.user || !allowedRoles.includes(auth.user.role)) {
    return {
      success: false,
      error: "Insufficient permissions",
    };
  }
  
  return auth;
}

/**
 * Get session from NextRequest
 */
export function getSession(req: NextRequest): SessionPayload | null {
  return requireSession({
    headers: req.headers,
    cookies: {
      get: (name: string) => {
        const cookie = req.cookies.get(name);
        return cookie ? { value: cookie.value } : undefined;
      },
    },
  });
}

/**
 * Check if user is admin
 */
export function isAdmin(session: SessionPayload | null): boolean {
  return session?.role === "Admin";
}

/**
 * Check if user can manage LMS content (Admin only)
 */
export function canManageLMS(session: SessionPayload | null): boolean {
  // Only Admin can manage LMS content (create, edit, delete)
  return session?.role === "Admin";
}

/**
 * Check if user can access LMS (Admin or Staff)
 */
export function canAccessLMS(session: SessionPayload | null): boolean {
  // Both Admin and Staff can access LMS for learning
  return session?.role === "Admin" || session?.role === "Staff";
}

/**
 * Check if user is Staff (not Admin)
 */
export function isStaff(session: SessionPayload | null): boolean {
  return session?.role === "Staff";
}

/**
 * Check if user can view LMS admin panel
 */
export function canViewLMSAdmin(session: SessionPayload | null): boolean {
  // Only Admin can view the admin panel
  return session?.role === "Admin";
}
