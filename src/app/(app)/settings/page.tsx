"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { clearCachedUser } from "@/app/components/authCache";
import { useAuthUser } from "@/app/components/AuthContext";
import ThemeToggle from "@/app/components/ThemeToggle";
import type { Role } from "@/lib/types";

type ManagedUser = {
  username: string;
  role: Role;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null);
  const [userActionError, setUserActionError] = useState("");
  const [userActionSuccess, setUserActionSuccess] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("Staff");

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;

    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearCachedUser();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      window.alert("Logout failed. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;

    setIsUsersLoading(true);
    setUserActionError("");
    try {
      const res = await fetch("/api/auth/users", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        users?: ManagedUser[];
      };

      if (!res.ok || data.ok === false || !Array.isArray(data.users)) {
        throw new Error(data.error || "Failed to load users");
      }

      setUsers(data.users);
    } catch (error) {
      setUserActionError(error instanceof Error ? error.message : "Failed to load users");
    } finally {
      setIsUsersLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadUsers();
  }, [isAdmin, loadUsers]);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserActionError("");
    setUserActionSuccess("");

    const username = newUsername.trim().toLowerCase();
    if (!username) {
      setUserActionError("Username is required");
      return;
    }

    if (!newPassword) {
      setUserActionError("Password is required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setUserActionError("Password confirmation does not match");
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Failed to create user");
      }

      setUserActionSuccess(`User "${username}" created successfully`);
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
      setNewRole("Staff");
      await loadUsers();
    } catch (error) {
      setUserActionError(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (targetUsername: string) => {
    const normalized = targetUsername.trim().toLowerCase();
    if (!normalized) return;

    setUserActionError("");
    setUserActionSuccess("");

    const confirmed = window.confirm(`Delete user "${normalized}"?`);
    if (!confirmed) return;

    setDeletingUsername(normalized);
    try {
      const res = await fetch("/api/auth/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalized }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Failed to delete user");
      }

      setUserActionSuccess(`User "${normalized}" deleted successfully`);
      await loadUsers();
    } catch (error) {
      setUserActionError(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setDeletingUsername(null);
    }
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-24 dark:bg-slate-950/40">
      <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-950/95 dark:text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Settings
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-100">
                Manage account preferences and security options.
              </p>
            </div>
            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {isAdmin ? (
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-4 dark:border-emerald-500/45 dark:bg-slate-900/95">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  User Management
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-100">
                  Admin can create employee accounts and assign roles.
                </p>

                <form onSubmit={handleCreateUser} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-white">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(event) => setNewUsername(event.target.value)}
                      placeholder="e.g. employee01"
                      autoComplete="username"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-400"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-white">
                      Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(event) => setNewRole(event.target.value === "Admin" ? "Admin" : "Staff")}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="Staff">Staff</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-white">
                      Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Minimum 4 characters"
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-400"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-white">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-400"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreatingUser ? "Creating..." : "Create User"}
                    </button>
                    {userActionSuccess ? (
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        {userActionSuccess}
                      </span>
                    ) : null}
                  </div>
                </form>

                {userActionError ? (
                  <div className="mt-3 rounded-lg border border-red-300/70 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-200">
                    {userActionError}
                  </div>
                ) : null}

                <div className="mt-4 rounded-lg border border-slate-200/80 bg-white/80 p-3 dark:border-slate-600 dark:bg-slate-950/90">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white">
                    Existing Users
                  </p>
                  {isUsersLoading ? (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-200">Loading users...</p>
                  ) : users.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-200">No users found.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {users.map((managedUser) => (
                        <div
                          key={managedUser.username}
                          className="flex items-center justify-between rounded-md border border-slate-200/80 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800 dark:text-white">
                              {managedUser.username}
                            </p>
                            <p className="truncate text-slate-500 dark:text-slate-200">
                              Created by {managedUser.createdBy}
                            </p>
                          </div>
                          <div className="ml-3 flex items-center gap-2">
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              {managedUser.role}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleDeleteUser(managedUser.username)}
                              disabled={deletingUsername === managedUser.username || managedUser.username === user.username}
                              className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                              title={managedUser.username === user.username ? "You cannot delete your own account" : "Delete user"}
                            >
                              {deletingUsername === managedUser.username ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-rose-200/80 bg-rose-50/70 p-4 dark:border-rose-500/40 dark:bg-slate-900/95">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Account
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-100">
                Signed in as {user.username} ({user.role})
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/vehicles"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              Open Vehicles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
