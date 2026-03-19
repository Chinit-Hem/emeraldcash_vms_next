/**
 * LMS Dashboard Component
 * 
 * Main training portal interface showing:
 * - Overall progress statistics
 * - Category cards with completion status
 * - Staff progress overview (for admins)
 * - Quick access to lessons
 * 
 * @module LmsDashboard
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  Trophy,
  Clock,
  PlayCircle,
  CheckCircle2,
  Circle,
  ChevronRight,
  BarChart3,
  GraduationCap,
  Building2,
  Shield,
  Lock,
} from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { GlassButton } from "../ui/GlassButton";
import { useAuthUser } from "../AuthContext";
import { safeToLocaleDateString } from "@/lib/safeDate";
import LmsErrorBoundary from "./LmsErrorBoundary";

// ============================================================================
// Types
// ============================================================================

interface LmsCategory {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  lesson_count: number;
}

interface LessonWithStatus {
  id: number;
  category_id: number;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_video_id: string;
  duration_minutes: number | null;
  order_index: number;
  is_completed: boolean;
  is_unlocked: boolean;
  completed_at: string | null;
  category_name?: string;
  category_color?: string;
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
  category_completion: {
    category_id: number;
    category_name: string;
    completion_rate: number;
  }[];
}

// ============================================================================
// API Integration
// ============================================================================

async function fetchDashboardData(): Promise<LmsDashboardStats | null> {
  try {
    const response = await fetch("/api/lms/dashboard");
    if (!response.ok) throw new Error("Failed to fetch dashboard");
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return null;
  }
}

async function fetchCategories(): Promise<LmsCategory[]> {
  try {
    const response = await fetch("/api/lms/categories");
    if (!response.ok) throw new Error("Failed to fetch categories");
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

async function fetchAllLessonsWithStatus(): Promise<LessonWithStatus[]> {
  try {
    // Fetch all categories first
    const catResponse = await fetch("/api/lms/categories");
    if (!catResponse.ok) throw new Error("Failed to fetch categories");
    const catData = await catResponse.json();
    const categories: LmsCategory[] = catData.success ? catData.data : [];
    
    // Fetch lessons for each category with sequential status
    const allLessons: LessonWithStatus[] = [];
    
    for (const category of categories) {
      const response = await fetch(`/api/lms/lessons?categoryId=${category.id}&sequential=true`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const lessonsWithCat = data.data.map((lesson: LessonWithStatus) => ({
            ...lesson,
            category_name: category.name,
            category_color: category.color,
          }));
          allLessons.push(...lessonsWithCat);
        }
      }
    }
    
    // Sort by category and order_index
    return allLessons.sort((a, b) => {
      if (a.category_id !== b.category_id) {
        return a.category_id - b.category_id;
      }
      return a.order_index - b.order_index;
    });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return [];
  }
}

// ============================================================================
// Helper Components
// ============================================================================

const IconComponent: React.FC<{ name: string | null; className?: string }> = ({ name, className }) => {
  const icons: Record<string, React.ReactNode> = {
    Calculator: <GraduationCap className={className} />,
    Monitor: <BookOpen className={className} />,
    Users: <Users className={className} />,
    Shield: <Trophy className={className} />,
  };
  
  return <>{icons[name || ""] || <BookOpen className={className} />}</>;
};

const ProgressBar: React.FC<{ percentage: number; color?: string }> = ({ percentage, color = "emerald" }) => {
  const colorClasses: Record<string, string> = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };
  
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full transition-all duration-500 ${colorClasses[color] || colorClasses.emerald}`}
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "purple" | "orange";
}> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  };
  
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </GlassCard>
  );
};

const CategoryCard: React.FC<{
  category: LmsCategory;
  completionRate: number;
  onClick: () => void;
}> = ({ category, completionRate, onClick }) => {
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
    blue: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
    purple: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
    orange: { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800" },
  };
  
  const colors = colorClasses[category.color || "emerald"];
  const isComplete = completionRate === 100;
  
  return (
    <GlassCard 
      className={`p-6 cursor-pointer hover:shadow-lg transition-all duration-200 group ${isComplete ? 'ring-2 ring-emerald-500/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <IconComponent name={category.icon} className={`w-6 h-6 ${colors.text}`} />
        </div>
        {isComplete ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        ) : (
          <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600" />
        )}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {category.name}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
        {category.description}
      </p>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">{category.lesson_count} lessons</span>
          <span className={`font-medium ${completionRate >= 50 ? colors.text : 'text-gray-500'}`}>
            {completionRate}%
          </span>
        </div>
        <ProgressBar percentage={completionRate} color={category.color || "emerald"} />
      </div>
      
      <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
        <span>Start Learning</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </GlassCard>
  );
};

const StaffProgressTable: React.FC<{
  staffProgress: LmsDashboardStats["staff_progress"];
  currentUserName: string;
  isManagerOrAdmin: boolean;
}> = ({ staffProgress, currentUserName, isManagerOrAdmin }) => {
  // Filter to show only own progress unless Manager/Admin
  const visibleStaff = isManagerOrAdmin 
    ? staffProgress 
    : staffProgress.filter(s => s.staff_name === currentUserName);

  // Debug logging for role filtering
  console.log("[StaffProgressTable] Role filtering applied:", {
    currentUserName,
    isManagerOrAdmin,
    totalStaff: staffProgress.length,
    visibleCount: visibleStaff.length,
    visibleStaffNames: visibleStaff.map(s => s.staff_name),
    allStaffNames: staffProgress.map(s => s.staff_name)
  });

  return (
    <GlassCard className="overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-500" />
          {isManagerOrAdmin ? "Staff Progress" : "My Progress"}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Staff</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Activity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {visibleStaff.map((staff) => (
              <tr key={staff.staff_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                      {staff.staff_name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{staff.staff_name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Building2 className="w-4 h-4 mr-1" />
                    {staff.branch || "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-[100px]">
                      <ProgressBar percentage={staff.completion_percentage} />
                    </div>
                    <span className={`text-sm font-medium ${
                      staff.completion_percentage === 100 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {staff.completion_percentage}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {safeToLocaleDateString(staff.last_activity, "Never")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {staff.completion_percentage === 100 ? (
                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        console.log("[Certificate] Button clicked:", {
                          staffId: staff.staff_id,
                          staffName: staff.staff_name,
                          progress: staff.completion_percentage,
                          url: `/lms/certificate/${staff.staff_id}`
                        });
                        // Navigate to certificate page or download certificate
                        window.open(`/lms/certificate/${staff.staff_id}`, '_blank');
                      }}
                      className="flex items-center gap-1"
                    >
                      <Trophy className="w-4 h-4" />
                      Certificate
                    </GlassButton>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function LmsDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<LmsDashboardStats | null>(null);
  const [categories, setCategories] = useState<LmsCategory[]>([]);
  const [lessons, setLessons] = useState<LessonWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"learning" | "admin">("learning");
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  
  // Fetch real data from APIs
  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, categoriesData, lessonsData] = await Promise.all([
          fetchDashboardData(),
          fetchCategories(),
          fetchAllLessonsWithStatus(),
        ]);
        setStats(statsData);
        setCategories(categoriesData);
        setLessons(lessonsData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  const handleCategoryClick = (categoryId: number) => {
    // Navigate to course overview page for this category
    router.push(`/lms/course/${categoryId}`);
  };
  
  const handleResumeLesson = (lessonId: number) => {
    router.push(`/lms/lesson/${lessonId}`);
  };
  
  // Find the current active lesson (first unlocked but not completed)
  const getCurrentLesson = () => {
    return lessons.find(l => l.is_unlocked && !l.is_completed);
  };
  
  // Find the next locked lesson (for "Start" button)
  const getNextLockedLesson = () => {
    return lessons.find(l => !l.is_unlocked);
  };
  
  const currentLesson = getCurrentLesson();
  const nextLockedLesson = getNextLockedLesson();
  
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Failed to load dashboard data</p>
          <GlassButton 
            variant="primary" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </GlassButton>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto lms-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-emerald-500" />
            Training Portal
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Master vehicle valuation and system skills
          </p>
        </div>
        
      </div>
      
          {/* Category Cards */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              Training Categories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((category) => {
                const completion = stats.category_completion.find(
                  (c) => c.category_id === category.id
                );
                return (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    completionRate={completion?.completion_rate || 0}
                    onClick={() => handleCategoryClick(category.id)}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Continue Learning Section */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              Continue Learning
            </h3>
            <div className="space-y-3">
              {/* Current Active Lesson - Resume Button */}
              {currentLesson ? (
                <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <PlayCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{currentLesson.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {currentLesson.category_name} • {currentLesson.duration_minutes || 0} min
                        <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">• In Progress</span>
                      </p>
                    </div>
                  </div>
                  <GlassButton 
                    variant="primary" 
                    size="sm"
                    onClick={() => handleResumeLesson(currentLesson.id)}
                  >
                    Resume
                  </GlassButton>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
                  <p className="text-gray-500 dark:text-gray-400">All lessons completed! 🎉</p>
                </div>
              )}
              
              {/* Next Locked Lesson - Start Button (Disabled if locked) */}
              {nextLockedLesson && (
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg opacity-75">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <Lock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{nextLockedLesson.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {nextLockedLesson.category_name} • {nextLockedLesson.duration_minutes || 0} min
                        <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">• Locked</span>
                      </p>
                    </div>
                  </div>
                  <GlassButton 
                    variant="secondary" 
                    size="sm"
                    disabled={true}
                    className="opacity-50 cursor-not-allowed"
                  >
                    Start
                  </GlassButton>
                </div>
              )}
            </div>
          </GlassCard>
          
          {/* Staff Progress - Show for all users but filtered by role */}
          {stats.staff_progress.length > 0 && (
            <StaffProgressTable 
              staffProgress={stats.staff_progress} 
              currentUserName={user.username}
              isManagerOrAdmin={isAdmin}
            />
          )}
    </div>
  );
}

// Wrap with Error Boundary for Safari crash debugging
function LmsDashboardWithErrorBoundary() {
  return (
    <LmsErrorBoundary>
      <LmsDashboard />
    </LmsErrorBoundary>
  );
}

export default LmsDashboardWithErrorBoundary;
