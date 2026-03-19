/**
 * Admin LMS Page - Complete Management Interface
 * 
 * Full-featured admin panel for managing:
 * - Training categories
 * - Lessons with YouTube videos
 * - Staff members and progress
 * - Analytics and reports
 * 
 * @module admin/lms/page
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Users,
  BookOpen,
  BarChart3,
  PlayCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { GlassCard } from "@/app/components/ui/GlassCard";
import { GlassButton } from "@/app/components/ui/GlassButton";
import { AddLessonForm } from "@/app/components/lms/AddLessonForm";
import { AddCategoryForm } from "@/app/components/lms/AddCategoryForm";
import { EditCategoryForm } from "@/app/components/lms/EditCategoryForm";
import { EditLessonForm } from "@/app/components/lms/EditLessonForm";
import { AddStaffForm } from "@/app/components/lms/AddStaffForm";
import { EditStaffForm } from "@/app/components/lms/EditStaffForm";
import { ConfirmDeleteDialog } from "@/app/components/lms/ConfirmDeleteDialog";
import { useOptionalAuthUser } from "@/app/components/AuthContext";

// ============================================================================
// Types
// ============================================================================

interface LmsCategory {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order_index: number;
  lesson_count: number;
  is_active: boolean;
}

interface LmsLesson {
  id: number;
  category_id: number;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_video_id: string;
  step_by_step_instructions: string | null;
  duration_minutes: number | null;
  order_index: number;
  is_active: boolean;
}

interface LmsStaff {
  id: number;
  full_name: string;
  email: string | null;
  branch_location: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
}

interface LmsDashboardStats {
  total_staff: number;
  total_categories: number;
  total_lessons: number;
  overall_completion_rate: number;
  staff_progress: {
    staff_id: number;
    staff_name: string;
    branch: string | null;
    completion_percentage: number;
    last_activity: string | null;
  }[];
}

// ============================================================================
// Admin LMS Page Component
// ============================================================================

export default function AdminLMSPage() {
  // Get user from context - use optional hook to detect loading state
  const user = useOptionalAuthUser();
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Check if user is admin once auth is ready
  const isAdmin = user?.role === "Admin";
  
  // State - MUST be declared before any early returns (React hooks rule)
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "categories" | "lessons" | "staff">("overview");
  const [stats, setStats] = useState<LmsDashboardStats | null>(null);
  const [categories, setCategories] = useState<LmsCategory[]>([]);
  const [lessons, setLessons] = useState<LmsLesson[]>([]);
  const [staff, setStaff] = useState<LmsStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LmsCategory | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showEditStaff, setShowEditStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<LmsStaff | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // Edit lesson state
  const [showEditLesson, setShowEditLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LmsLesson | null>(null);
  
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: "category" | "lesson" | "staff";
    id: number | null;
    name: string;
  }>({
    isOpen: false,
    type: "category",
    id: null,
    name: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    console.log("[AdminLMS] fetchData() called - refreshing data...");
    setLoading(true);
    setError(null);
    
    try {
      // Fetch dashboard stats
      const statsRes = await fetch("/api/lms/dashboard");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      }

      // Fetch categories
      const catRes = await fetch("/api/lms/categories");
      console.log("[AdminLMS] fetchData() - categories response status:", catRes.status);
      if (catRes.ok) {
        const catData = await catRes.json();
        console.log("[AdminLMS] fetchData() - categories data:", JSON.stringify(catData.data?.map((c: LmsCategory) => ({ id: c.id, name: c.name })), null, 2));
        if (catData.success) {
          console.log("[AdminLMS] fetchData() - setting categories state with", catData.data?.length, "categories");
          setCategories(catData.data || []);
        }
      }

      // Fetch staff
      const staffRes = await fetch("/api/lms/staff");
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        if (staffData.success) {
          setStaff(staffData.data || []);
        }
      }
    } catch (err) {
      setError("Failed to load data. Please try again.");
      console.error("Error fetching LMS data:", err);
    } finally {
      setLoading(false);
      console.log("[AdminLMS] fetchData() completed");
    }
  };

  // Mark auth as ready after initial load
  useEffect(() => {
    // Small delay to ensure auth context has loaded
    const timer = setTimeout(() => {
      setIsAuthReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Redirect non-admin users (only after auth is ready)
  useEffect(() => {
    if (isAuthReady && !isAdmin && !isRedirecting) {
      setIsRedirecting(true);
      window.location.href = "/lms";
    }
  }, [isAuthReady, isAdmin, isRedirecting]);

  // Load data on mount
  useEffect(() => {
    // Initialize LMS tables if needed, then fetch data
    initializeAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize LMS tables and fetch data
  const initializeAndFetchData = async () => {
    try {
      // Try to initialize tables (idempotent - safe to call multiple times)
      const initRes = await fetch("/api/lms/init", { method: "POST" });
      if (!initRes.ok) {
        console.warn("[AdminLMS] Failed to initialize LMS tables:", await initRes.text());
      } else {
        console.log("[AdminLMS] LMS tables initialized successfully");
      }
    } catch (err) {
      console.error("[AdminLMS] Error initializing LMS tables:", err);
    } finally {
      // Always try to fetch data regardless of init result
      fetchData();
    }
  };

  // Fetch lessons when category selected
  useEffect(() => {
    if (selectedCategory) {
      fetchLessons(selectedCategory);
    }
  }, [selectedCategory]);

  const fetchLessons = async (categoryId: number) => {
    try {
      const res = await fetch(`/api/lms/lessons?categoryId=${categoryId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLessons(data.data || []);
        }
      }
    } catch (err) {
      console.error("Error fetching lessons:", err);
    }
  };

  // Delete handlers
  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    
    setIsDeleting(true);
    try {
      let endpoint = "";
      switch (deleteDialog.type) {
        case "category":
          endpoint = `/api/lms/categories?id=${deleteDialog.id}`;
          break;
        case "lesson":
          endpoint = `/api/lms/lessons?id=${deleteDialog.id}`;
          break;
        case "staff":
          endpoint = `/api/lms/staff?id=${deleteDialog.id}`;
          break;
      }

      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      // Refresh data
      await fetchData();
      if (selectedCategory) {
        await fetchLessons(selectedCategory);
      }

      setDeleteDialog({ isOpen: false, type: "category", id: null, name: "" });
    } catch (err) {
      console.error("Error deleting:", err);
      setError("Failed to delete. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (type: "category" | "lesson" | "staff", id: number, name: string) => {
    setDeleteDialog({ isOpen: true, type, id, name });
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Staff"
          value={stats?.total_staff || 0}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Categories"
          value={stats?.total_categories || 0}
          icon={<BookOpen className="w-6 h-6" />}
          color="emerald"
        />
        <StatCard
          title="Total Lessons"
          value={stats?.total_lessons || 0}
          icon={<PlayCircle className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats?.overall_completion_rate || 0}%`}
          icon={<BarChart3 className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Staff Progress */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Staff Progress
          </h3>
        </div>
        
        {stats?.staff_progress && stats.staff_progress.length > 0 ? (
          <div className="space-y-3">
            {stats.staff_progress.map((staff) => (
              <div key={staff.staff_id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{staff.staff_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{staff.branch || "No branch"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${staff.completion_percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                    {staff.completion_percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No staff progress data available
          </p>
        )}
      </GlassCard>
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Training Categories</h2>
        <GlassButton variant="primary" onClick={() => setShowAddCategory(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <GlassCard
            key={category.id}
            className={`p-6 cursor-pointer transition-all ${
              selectedCategory === category.id ? "ring-2 ring-emerald-500" : ""
            }`}
            onClick={() => setSelectedCategory(category.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{category.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {category.description || "No description"}
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                  {category.lesson_count} lessons
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("[AdminLMS] ==========================================");
                    console.log("[AdminLMS] EDIT BUTTON CLICKED");
                    console.log("[AdminLMS] Category ID:", category.id);
                    console.log("[AdminLMS] Category name:", category.name);
                    console.log("[AdminLMS] Full category object:", JSON.stringify(category, null, 2));
                    console.log("[AdminLMS] Setting editingCategory state...");
                    setEditingCategory(category);
                    console.log("[AdminLMS] Setting showEditCategory to true...");
                    setShowEditCategory(true);
                    console.log("[AdminLMS] ==========================================");
                  }}
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
                <button 
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteDialog("category", category.id, category.name);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Lessons for selected category */}
      {selectedCategory && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Lessons in {categories.find(c => c.id === selectedCategory)?.name}
            </h3>
            <GlassButton variant="primary" size="sm" onClick={() => setShowAddLesson(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Lesson
            </GlassButton>
          </div>

          {lessons.length > 0 ? (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PlayCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{lesson.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lesson.duration_minutes ? `${lesson.duration_minutes} min` : "No duration"} • 
                <a 
                  href={lesson.youtube_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline ml-1 inline-flex items-center"
                >
                  YouTube <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setEditingLesson(lesson);
                        setShowEditLesson(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button 
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                      onClick={() => openDeleteDialog("lesson", lesson.id, lesson.title)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No lessons in this category yet. Click "Add Lesson" to create one.
            </p>
          )}
        </GlassCard>
      )}
    </div>
  );

  const renderLessons = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Lessons</h2>
        <GlassButton variant="primary" onClick={() => setShowAddLesson(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Lesson
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map((lesson) => (
          <GlassCard key={lesson.id} className="p-0 overflow-hidden hover:shadow-lg transition-shadow">
            {/* Video Thumbnail */}
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${lesson.youtube_video_id}/mqdefault.jpg`}
                alt={lesson.title}
                className="w-full h-full object-cover"
              />
              {/* Duration Badge */}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                {lesson.duration_minutes ? `${lesson.duration_minutes} min` : "—"}
              </div>
              {/* Play Icon Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                <div className="w-12 h-12 bg-white/90 dark:bg-gray-900/90 rounded-full flex items-center justify-center shadow-lg opacity-0 hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
                {lesson.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {categories.find(c => c.id === lesson.category_id)?.name || "Uncategorized"}
              </p>
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  ID: {lesson.id}
                </span>
                <div className="flex gap-1">
                  <button 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => {
                      setEditingLesson(lesson);
                      setShowEditLesson(true);
                    }}
                    title="Edit lesson"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button 
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    onClick={() => openDeleteDialog("lesson", lesson.id, lesson.title)}
                    title="Delete lesson"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const renderStaff = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Staff Members</h2>
        <GlassButton variant="primary" onClick={() => setShowAddStaff(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </GlassButton>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Branch</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Role</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {staff.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{member.full_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{member.email || "-"}</td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{member.branch_location || "-"}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                    {member.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg mr-1"
                    onClick={() => {
                      setEditingStaff(member);
                      setShowEditStaff(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button 
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    onClick={() => openDeleteDialog("staff", member.id, member.full_name)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  if (loading || isRedirecting || !isAuthReady) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin LMS</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage training content and track staff progress
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <GlassButton variant="secondary" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </GlassButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "categories", label: "Categories", icon: BookOpen },
          { id: "lessons", label: "Lessons", icon: PlayCircle },
          { id: "staff", label: "Staff", icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "overview" | "categories" | "lessons" | "staff")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "overview" && renderOverview()}
      {activeTab === "categories" && renderCategories()}
      {activeTab === "lessons" && renderLessons()}
      {activeTab === "staff" && renderStaff()}

      {/* Add Lesson Modal */}
      {showAddLesson && (
        <AddLessonForm
          categories={categories}
          onCancel={() => setShowAddLesson(false)}
          onSubmit={async (lessonData) => {
            console.log("[AdminLMS] Creating lesson with data:", lessonData);
            try {
              const requestBody = {
                category_id: lessonData.categoryId,
                title: lessonData.title,
                description: lessonData.description,
                youtube_url: lessonData.youtubeUrl,
                step_by_step_instructions: lessonData.stepByStepInstructions,
                duration_minutes: lessonData.durationMinutes,
                order_index: lessonData.orderIndex,
              };
              console.log("[AdminLMS] Request body:", requestBody);

              const response = await fetch("/api/lms/lessons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
              });

              console.log("[AdminLMS] Response status:", response.status);
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                console.error("[AdminLMS] Error response:", errorData);
                throw new Error(errorData.error || `Failed to create lesson (${response.status})`);
              }

              const data = await response.json();
              console.log("[AdminLMS] Success response:", data);

              setShowAddLesson(false);
              if (selectedCategory) {
                fetchLessons(selectedCategory);
              }
              fetchData();
            } catch (err) {
              console.error("[AdminLMS] Error creating lesson:", err);
              throw err;
            }
          }}
        />
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <AddCategoryForm
          onCancel={() => setShowAddCategory(false)}
          onSubmit={async (categoryData) => {
            try {
              const response = await fetch("/api/lms/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: categoryData.name,
                  description: categoryData.description,
                  icon: categoryData.icon,
                  color: categoryData.color,
                  order_index: categoryData.orderIndex,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                throw new Error(errorData.error || "Failed to create category");
              }

              setShowAddCategory(false);
              fetchData();
            } catch (err) {
              console.error("Error creating category:", err);
              throw err;
            }
          }}
        />
      )}

      {/* Edit Category Modal */}
      {showEditCategory && editingCategory && (
        <EditCategoryForm
          key={editingCategory.id}
          category={editingCategory}
          onCancel={() => {
            setShowEditCategory(false);
            setEditingCategory(null);
          }}
          onSubmit={async (categoryData) => {
            console.log("[AdminLMS] EditCategory onSubmit called with:", JSON.stringify(categoryData, null, 2));
            try {
              const requestBody = {
                name: categoryData.name,
                description: categoryData.description,
                icon: categoryData.icon,
                color: categoryData.color,
                order_index: categoryData.orderIndex,
              };
              console.log("[AdminLMS] PUT request body:", JSON.stringify(requestBody, null, 2));
              
              const response = await fetch(`/api/lms/categories?id=${categoryData.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
              });

              console.log("[AdminLMS] PUT response status:", response.status);
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                console.error("[AdminLMS] PUT error response:", errorData);
                throw new Error(errorData.error || "Failed to update category");
              }

              const responseData = await response.json();
              console.log("[AdminLMS] PUT success response:", responseData);

              // Close modal immediately
              setShowEditCategory(false);
              setEditingCategory(null);
              
              // Show success message
              alert("Category updated successfully!");
              
              // Refresh data to show updated category
              await fetchData();
            } catch (err) {
              console.error("[AdminLMS] Error updating category:", err);
              throw err;
            }
          }}
        />
      )}

      {/* Add Staff Modal */}
      {showAddStaff && (
        <AddStaffForm
          onCancel={() => setShowAddStaff(false)}
          onSubmit={async (staffData) => {
            try {
              const response = await fetch("/api/lms/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  full_name: staffData.fullName,
                  email: staffData.email,
                  branch_location: staffData.branchLocation,
                  role: staffData.role,
                  phone: staffData.phone,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                throw new Error(errorData.error || "Failed to create staff");
              }

              setShowAddStaff(false);
              fetchData();
            } catch (err) {
              console.error("Error creating staff:", err);
              throw err;
            }
          }}
        />
      )}

      {/* Edit Staff Modal */}
      {showEditStaff && editingStaff && (
        <EditStaffForm
          key={editingStaff.id}
          staff={editingStaff}
          onCancel={() => {
            setShowEditStaff(false);
            setEditingStaff(null);
          }}
          onSubmit={async (staffData) => {
            try {
              const response = await fetch(`/api/lms/staff?id=${staffData.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  full_name: staffData.fullName,
                  email: staffData.email,
                  branch_location: staffData.branchLocation,
                  role: staffData.role,
                  phone: staffData.phone,
                  is_active: staffData.isActive,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                throw new Error(errorData.error || "Failed to update staff");
              }

              setShowEditStaff(false);
              setEditingStaff(null);
              fetchData();
            } catch (err) {
              console.error("Error updating staff:", err);
              throw err;
            }
          }}
        />
      )}

      {/* Edit Lesson Modal */}
      {showEditLesson && editingLesson && (
        <EditLessonForm
          key={editingLesson.id}
          lesson={editingLesson}
          categories={categories}
          onCancel={() => {
            setShowEditLesson(false);
            setEditingLesson(null);
          }}
          onSubmit={async (lessonData) => {
            try {
              const response = await fetch(`/api/lms/lessons?id=${lessonData.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  category_id: lessonData.categoryId,
                  title: lessonData.title,
                  description: lessonData.description,
                  youtube_url: lessonData.youtubeUrl,
                  step_by_step_instructions: lessonData.stepByStepInstructions,
                  duration_minutes: lessonData.durationMinutes,
                  order_index: lessonData.orderIndex,
                  is_active: lessonData.isActive,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                throw new Error(errorData.error || "Failed to update lesson");
              }

              setShowEditLesson(false);
              setEditingLesson(null);
              if (selectedCategory) {
                fetchLessons(selectedCategory);
              }
              fetchData();
            } catch (err) {
              console.error("Error updating lesson:", err);
              throw err;
            }
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={deleteDialog.isOpen}
        onCancel={() => setDeleteDialog({ isOpen: false, type: "category", id: null, name: "" })}
        onConfirm={handleDelete}
        title={`Delete ${deleteDialog.type === "category" ? "Category" : deleteDialog.type === "lesson" ? "Lesson" : "Staff Member"}`}
        itemName={deleteDialog.name}
        itemType={deleteDialog.type}
        isDeleting={isDeleting}
      />
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatCard({
  title,
  value,
  icon,
  color = "emerald",
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "emerald" | "blue" | "purple" | "orange";
}) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  };

  return (
    <GlassCard className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>{icon}</div>
      </div>
    </GlassCard>
  );
}
