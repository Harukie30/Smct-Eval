"use client";

import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import DashboardShell, { SidebarItem } from "@/components/DashboardShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ViewEmployeeModal from "@/components/ViewEmployeeModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import EvaluationForm from "@/components/evaluation";
import ManagerEvaluationForm from "@/components/evaluation-2";
import ViewResultsModal from "@/components/evaluation/ViewResultsModal";
import EvaluationTypeModal from "@/components/EvaluationTypeModal";
import mockData from "@/data/dashboard.json";
import accountsData from "@/data/accounts.json";
import { UserProfile } from "@/components/ProfileCard";
import { apiService } from "@/lib/apiService";
import { withAuth } from "@/hoc";
import PageTransition from "@/components/PageTransition";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/useToast";
import { Skeleton } from "@/components/ui/skeleton";
// Removed notification imports - backend handles notification creation automatically
import { useProfilePictureUpdates } from "@/hooks/useProfileUpdates";

// Lazy load tab components for better performance
const OverviewTab = lazy(() =>
  import("./OverviewTab").then((m) => ({ default: m.OverviewTab }))
);
const EmployeesTab = lazy(() =>
  import("./EmployeesTab").then((m) => ({ default: m.EmployeesTab }))
);
const EvaluationRecordsTab = lazy(() =>
  import("./EvaluationRecordsTab").then((m) => ({
    default: m.EvaluationRecordsTab,
  }))
);
const PerformanceReviewsTab = lazy(() =>
  import("./PerformanceReviewsTab").then((m) => ({
    default: m.PerformanceReviewsTab,
  }))
);
const EvaluationHistoryTab = lazy(() =>
  import("./EvaluationHistoryTab").then((m) => ({
    default: m.EvaluationHistoryTab,
  }))
);

type Feedback = {
  id: number;
  reviewer: string;
  role: string;
  rating: number;
  date: string;
  comment: string;
  category: string;
  supervisor?: string;
};

type Submission = {
  id: number;
  employeeName: string;
  category?: string;
  rating?: number;
  submittedAt: string;
  status: string;
  evaluator?: string;
  evaluationData?: any; // Full evaluation data from the form
  employeeId?: number;
  employeeEmail?: string;
  evaluatorId?: number;
  evaluatorName?: string;
  period?: string;
  overallRating?: string;

  // Approval-related properties
  approvalStatus?: string;
  employeeSignature?: string | null;
  employeeApprovedAt?: string | null;
  evaluatorSignature?: string | null;
  evaluatorApprovedAt?: string | null;
  fullyApprovedNotified?: boolean;
};

type PerformanceData = {
  overallRating: string;
  totalReviews: number;
  goalsCompleted: number;
  totalGoals: number;
  performanceTrend: string;
  recentFeedback: Feedback[];
  metrics: Record<string, number>;
};

type Employee = {
  id: number;
  name?: string;
  email?: string;
  position?: string;
  department?: string;
  branch?: string;
  role?: string;
  avatar?: string;
  employeeId?: string; // Formatted employee ID from registration (e.g., "1234-567890")
};

function getRatingColor(rating: number) {
  if (rating >= 4.5) return "text-green-600 bg-green-100";
  if (rating >= 4.0) return "text-blue-600 bg-blue-100";
  if (rating >= 3.5) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
}

// Calculate overall rating using the same formula as employee dashboard
const calculateOverallRating = (evaluationData: any) => {
  if (!evaluationData) return 0;

  const calculateScore = (scores: number[]) => {
    const validScores = scores.filter(
      (score) => score !== null && score !== undefined && !isNaN(score)
    );
    if (validScores.length === 0) return 0;
    return (
      validScores.reduce((sum, score) => sum + score, 0) / validScores.length
    );
  };

  const jobKnowledgeScore = calculateScore([
    evaluationData.jobKnowledgeScore1,
    evaluationData.jobKnowledgeScore2,
    evaluationData.jobKnowledgeScore3,
  ]);
  const qualityOfWorkScore = calculateScore([
    evaluationData.qualityOfWorkScore1,
    evaluationData.qualityOfWorkScore2,
    evaluationData.qualityOfWorkScore3,
    evaluationData.qualityOfWorkScore4,
    evaluationData.qualityOfWorkScore5,
  ]);
  const adaptabilityScore = calculateScore([
    evaluationData.adaptabilityScore1,
    evaluationData.adaptabilityScore2,
    evaluationData.adaptabilityScore3,
  ]);
  const teamworkScore = calculateScore([
    evaluationData.teamworkScore1,
    evaluationData.teamworkScore2,
    evaluationData.teamworkScore3,
  ]);
  const reliabilityScore = calculateScore([
    evaluationData.reliabilityScore1,
    evaluationData.reliabilityScore2,
    evaluationData.reliabilityScore3,
    evaluationData.reliabilityScore4,
  ]);
  const ethicalScore = calculateScore([
    evaluationData.ethicalScore1,
    evaluationData.ethicalScore2,
    evaluationData.ethicalScore3,
    evaluationData.ethicalScore4,
  ]);
  const customerServiceScore = calculateScore([
    evaluationData.customerServiceScore1,
    evaluationData.customerServiceScore2,
    evaluationData.customerServiceScore3,
    evaluationData.customerServiceScore4,
    evaluationData.customerServiceScore5,
  ]);

  const overallWeightedScore =
    jobKnowledgeScore * 0.2 +
    qualityOfWorkScore * 0.2 +
    adaptabilityScore * 0.1 +
    teamworkScore * 0.1 +
    reliabilityScore * 0.05 +
    ethicalScore * 0.05 +
    customerServiceScore * 0.3;

  // Ensure the score is between 0 and 5
  const normalizedScore = Math.max(0, Math.min(5, overallWeightedScore));
  return Math.round(normalizedScore * 10) / 10;
};

// Helper functions for rating calculations
const getRatingLabel = (score: number) => {
  if (score >= 4.5) return "Outstanding";
  if (score >= 4.0) return "Exceeds Expectations";
  if (score >= 3.5) return "Meets Expectations";
  if (score >= 2.5) return "Needs Improvement";
  return "Unsatisfactory";
};

const calculateScore = (scores: string[]) => {
  const validScores = scores
    .filter((score) => score && score !== "")
    .map((score) => parseFloat(score));
  if (validScores.length === 0) return 0;
  return (
    validScores.reduce((sum, score) => sum + score, 0) / validScores.length
  );
};

function EvaluatorDashboard() {
  const { user } = useUser();
  const { success, error } = useToast();
  const { getUpdatedAvatar, hasAvatarUpdate } = useProfilePictureUpdates();

  // Function to get time ago display
  const getTimeAgo = (submittedAt: string) => {
    const submissionDate = new Date(submittedAt);
    const now = new Date();
    const diffInMs = now.getTime() - submissionDate.getTime();

    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return new Date(submittedAt).toLocaleDateString();
    }
  };

  // Track seen submissions in localStorage
  const [seenSubmissions, setSeenSubmissions] = useState<Set<number>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("seenEvaluationSubmissions");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  // Save seen submissions when they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "seenEvaluationSubmissions",
        JSON.stringify(Array.from(seenSubmissions))
      );
    }
  }, [seenSubmissions]);

  // Mark submission as seen
  const markSubmissionAsSeen = (submissionId: number) => {
    setSeenSubmissions((prev) => {
      const newSet = new Set(prev);
      newSet.add(submissionId);
      return newSet;
    });
  };

  // Enhanced time-based highlighting system with seen tracking and approval status
  const getSubmissionHighlight = (
    submittedAt: string,
    submissionId: number,
    approvalStatus?: string
  ) => {
    const submissionTime = new Date(submittedAt).getTime();
    const now = new Date().getTime();
    const hoursDiff = (now - submissionTime) / (1000 * 60 * 60);
    const isSeen = seenSubmissions.has(submissionId);
    const isPending =
      !approvalStatus ||
      approvalStatus === "pending" ||
      approvalStatus === "employee_approved";

    // Priority 1: Fully approved - ALWAYS GREEN (highest priority)
    if (approvalStatus === "fully_approved") {
      // Show additional badge if it's new/recent
      if (hoursDiff <= 24 && !isSeen) {
        return {
          className:
            "bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100",
          badge: { text: "✓ Approved", className: "bg-green-500 text-white" },
          secondaryBadge: {
            text: "New",
            className: "bg-yellow-500 text-white",
          },
          priority: "approved-new",
        };
      } else if (hoursDiff <= 48 && !isSeen) {
        return {
          className:
            "bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100",
          badge: { text: "✓ Approved", className: "bg-green-500 text-white" },
          secondaryBadge: {
            text: "Recent",
            className: "bg-blue-500 text-white",
          },
          priority: "approved-recent",
        };
      }
      return {
        className:
          "bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100",
        badge: { text: "✓ Approved", className: "bg-green-500 text-white" },
        priority: "approved",
      };
    }

    // Priority 2: New (within 24 hours) AND Pending - YELLOW "New" highlight
    if (isPending && hoursDiff <= 24 && !isSeen) {
      return {
        className:
          "bg-yellow-100 border-l-4 border-l-yellow-500 hover:bg-yellow-200",
        badge: { text: "New", className: "bg-yellow-500 text-white" },
        priority: "new-pending",
      };
    }

    // Priority 3: Pending and within 24 hours (even if seen) - still show yellow
    if (isPending && hoursDiff <= 24) {
      return {
        className:
          "bg-yellow-100 border-l-4 border-l-yellow-500 hover:bg-yellow-200",
        badge: { text: "Pending", className: "bg-yellow-500 text-white" },
        priority: "pending-new",
      };
    }

    // Priority 3: Within 48 hours and not seen - BLUE "Recent"
    if (hoursDiff <= 48 && !isSeen) {
      return {
        className: "bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100",
        badge: { text: "Recent", className: "bg-blue-500 text-white" },
        priority: "recent",
      };
    }

    // Default: Older or already seen - No special highlighting
    return {
      className: "hover:bg-gray-50",
      badge: null,
      priority: "old",
    };
  };

  // Add custom CSS for container popup animation
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes containerPopup {
        0% {
          transform: scale(0.8) translateY(20px);
          opacity: 0;
        }
        50% {
          transform: scale(1.05) translateY(-5px);
          opacity: 0.8;
        }
        100% {
          transform: scale(1) translateY(0);
          opacity: 1;
        }
      }
      .evaluation-container {
        animation: containerPopup 0.4s ease-out !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Helper function to map user data to currentUser format
  const getCurrentUserData = () => {
    if (user) {
      // AuthenticatedUser type - handle optional properties
      return {
        id: Number(user.id) || 0,
        name: `${user.fname} ${user.lname}`.trim(),
        email: user.email || "",
        position: (user as any).position || "Evaluator",
        department: (user as any).department || "Evaluation",
        role: user.roles?.[0]?.name || "",
        signature: user.signature, // Include signature from user
      };
    }
    return undefined;
  };

  // Add custom styles for better table scrolling
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .scrollable-table::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .scrollable-table::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 4px;
      }
      .scrollable-table::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
      .scrollable-table::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const [active, setActive] = useState("overview");

  // Custom tab change handler with auto-refresh functionality
  const handleTabChange = (tabId: string) => {
    setActive(tabId);

    // Auto-refresh data when switching to specific tabs (only refresh submissions, not whole page)
    if (tabId === "feedback") {
      // Refresh evaluation records data
      setIsFeedbackRefreshing(true);

      // Add a 1-second delay to make skeleton visible
      setTimeout(() => {
        refreshSubmissionsOnly().finally(() => {
          setIsFeedbackRefreshing(false);
        });
      }, 1000); // 1-second delay to see skeleton properly
    } else if (tabId === "employees") {
      // Refresh employees data
      setIsEmployeesRefreshing(true);

      // Add a 1-second delay to make skeleton visible
      setTimeout(() => {
        refreshSubmissionsOnly().finally(() => {
          setIsEmployeesRefreshing(false);
        });
      }, 1000); // 1-second delay to see skeleton properly
    } else if (tabId === "overview") {
      // Refresh overview data when switching to overview tab
      setIsRefreshing(true);

      // Add a 1-second delay to make skeleton visible
      setTimeout(() => {
        refreshSubmissionsOnly().finally(() => {
          setIsRefreshing(false);
        });
      }, 1000); // 1-second delay to see skeleton properly
    } else if (tabId === "reviews") {
      // Refresh reviews data when switching to reviews tab
      setIsReviewsRefreshing(true);

      // Add a 1-second delay to make skeleton visible
      setTimeout(() => {
        refreshSubmissionsOnly().finally(() => {
          setIsReviewsRefreshing(false);
        });
      }, 1000); // 1-second delay to see skeleton properly
    } else if (tabId === "history") {
      setIsHistoryRefreshing(true);
      setIsQuarterlyRefreshing(true);
      // Add a 2-second delay to make skeleton visible
      setTimeout(() => {
        refreshSubmissionsOnly().finally(() => {
          setIsHistoryRefreshing(false);
          setIsQuarterlyRefreshing(false);
        });
      }, 2000); // 2-second delay to see skeleton properly
    }
  };

  // Helper function for Evaluation History
  const isNewSubmission = (submittedAt: string) => {
    const submissionTime = new Date(submittedAt).getTime();
    const now = new Date().getTime();
    const hoursDiff = (now - submissionTime) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  // Refresh function for Quarterly Performance table
  const handleRefreshQuarterly = async () => {
    setIsQuarterlyRefreshing(true);
    try {
      // Add a small delay to simulate loading
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // Refresh data (only submissions, not whole page)
      await refreshSubmissionsOnly();
      // Show success toast
      success(
        "Quarterly performance refreshed successfully",
        "All quarterly data has been updated"
      );
    } catch (error) {
      console.error("Error refreshing quarterly performance:", error);
    } finally {
      setIsQuarterlyRefreshing(false);
    }
  };

  // Refresh function for Evaluation History table
  const handleRefreshHistory = async () => {
    setIsHistoryRefreshing(true);
    try {
      // Add a small delay to simulate loading
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // Refresh data (only submissions, not whole page)
      await refreshSubmissionsOnly();
      // Show success toast
      success(
        "Evaluation history refreshed successfully",
        "All evaluation records have been updated"
      );
    } catch (error) {
      console.error("Error refreshing evaluation history:", error);
    } finally {
      setIsHistoryRefreshing(false);
    }
  };

  const [currentPeriod, setCurrentPeriod] = useState("");
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  // Note: employeeSearch, selectedDepartment, and employeeSort are now managed inside EmployeesTab component
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [isEvaluationTypeModalOpen, setIsEvaluationTypeModalOpen] =
    useState(false);
  const [evaluationType, setEvaluationType] = useState<
    "employee" | "manager" | null
  >(null);

  // Debug: Log when evaluation modal opens
  useEffect(() => {
    if (isEvaluationModalOpen) {
      console.log("Evaluation modal opened", {
        selectedEmployee: selectedEmployee?.name,
        evaluationType,
        employeeId: selectedEmployee?.id,
      });
    }
  }, [isEvaluationModalOpen, selectedEmployee, evaluationType]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [isViewSubmissionModalOpen, setIsViewSubmissionModalOpen] =
    useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [selectedEmployeeForView, setSelectedEmployeeForView] =
    useState<Employee | null>(null);
  const [isViewEmployeeModalOpen, setIsViewEmployeeModalOpen] = useState(false);
  const [viewEmployeeId, setViewEmployeeId] = useState<number | undefined>(undefined);

  // ViewResultsModal state
  const [isViewResultsModalOpen, setIsViewResultsModalOpen] = useState(false);
  const [selectedEvaluationSubmission, setSelectedEvaluationSubmission] =
    useState<Submission | null>(null);

  // Print Preview Modal state
  const [isPrintPreviewModalOpen, setIsPrintPreviewModalOpen] = useState(false);
  const [printPreviewContent, setPrintPreviewContent] = useState<string>("");
  const [printPreviewData, setPrintPreviewData] = useState<any>(null);

  // Cancel Evaluation Alert Dialog state
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);

  // Profile is now managed by UserContext

  // Function to refresh dashboard data (used by shared hook)
  // Lightweight refresh function that only updates submissions (for tab-specific refreshes)
  const refreshSubmissionsOnly = async () => {
    try {
      // Use role-specific endpoint (replaces getSubmissions + filter)
      const evaluations = await apiService.getEvalAuthEvaluator();

      if (Array.isArray(evaluations)) {
        // Ensure data is valid and has unique IDs
        const validData = evaluations.filter(
          (item: any) =>
            item &&
            typeof item === "object" &&
            item.id !== undefined &&
            item.employeeName
        );

        // Remove duplicates based on ID
        const uniqueData = validData.filter(
          (item: any, index: number, self: any[]) =>
            index === self.findIndex((t) => t.id === item.id)
        );

        setRecentSubmissions(uniqueData);
      } else {
        console.warn("Invalid data structure received from API");
        setRecentSubmissions([]);
      }
    } catch (error) {
      console.warn("getEvalAuthEvaluator failed, falling back to getSubmissions:", error);
      // Fallback to old method if new endpoint fails
      try {
        const submissions = await apiService.getSubmissions();
        
        if (Array.isArray(submissions)) {
          const validData = submissions.filter(
            (item: any) =>
              item &&
              typeof item === "object" &&
              item.id !== undefined &&
              item.employeeName &&
              item.evaluatorId === user?.id
          );

          const uniqueData = validData.filter(
            (item: any, index: number, self: any[]) =>
              index === self.findIndex((t) => t.id === item.id)
          );

          setRecentSubmissions(uniqueData);
        } else {
          setRecentSubmissions([]);
        }
      } catch (fallbackError) {
        console.error("Error refreshing submissions:", fallbackError);
        setRecentSubmissions([]);
      }
    }
  };

  const refreshEvaluatorData = async () => {
    try {
      setLoading(true);

      // Load dashboard data from API
      try {
        const dashboardData = await apiService.evaluatorDashboard();
        const data = dashboardData?.data || dashboardData;
        
        if (data) {
          // Update dashboard metrics if provided
          // Note: You may need to adjust this based on your backend response format
        }
      } catch (dashboardError) {
        console.warn("Dashboard API not available, using fallback:", dashboardError);
        // Fallback to mock data
        setCurrentPeriod(mockData.dashboard.currentPeriod);
        setData(mockData.dashboard.performanceData as unknown as PerformanceData);
      }

      // Fetch evaluations using role-specific endpoint (replaces getSubmissions + filter)
      try {
        const evaluations = await apiService.getEvalAuthEvaluator();

        if (Array.isArray(evaluations)) {
          // Ensure data is valid and has unique IDs
          const validData = evaluations.filter(
            (item: any) =>
              item &&
              typeof item === "object" &&
              item.id !== undefined &&
              item.employeeName
          );

          // Remove duplicates based on ID
          const uniqueData = validData.filter(
            (item: any, index: number, self: any[]) =>
              index === self.findIndex((t) => t.id === item.id)
          );

          setRecentSubmissions(uniqueData);
        } else {
          console.warn("Invalid data structure received from API");
          setRecentSubmissions([]);
        }
      } catch (evalError) {
        console.warn("getEvalAuthEvaluator failed, falling back to getSubmissions:", evalError);
        // Fallback to old method if new endpoint fails
        const submissions = await apiService.getSubmissions();
        
        if (Array.isArray(submissions)) {
          const validData = submissions.filter(
            (item: any) =>
              item &&
              typeof item === "object" &&
              item.id !== undefined &&
              item.employeeName &&
              item.evaluatorId === user?.id
          );

          const uniqueData = validData.filter(
            (item: any, index: number, self: any[]) =>
              index === self.findIndex((t) => t.id === item.id)
          );

          setRecentSubmissions(uniqueData);
        } else {
          setRecentSubmissions([]);
        }
      }
    } catch (error) {
      console.error("Error refreshing evaluator data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh functionality using shared hook
  const {
    showRefreshModal,
    refreshModalMessage,
    handleRefreshModalComplete,
    refreshDashboardData,
  } = useAutoRefresh({
    refreshFunction: refreshEvaluatorData,
    dashboardName: "Evaluator Dashboard",
    customMessage: "Welcome back! Refreshing your evaluator dashboard data...",
  });

  // Load employees and positions on mount
  useEffect(() => {
    if (user) {
      loadEmployeesAndPositions();
    }
  }, [user]);

  // Fetch Employee ID when modal opens (same as admin/HR)
  useEffect(() => {
    const fetchEmployeeId = async () => {
      if (selectedEmployeeForView && isViewEmployeeModalOpen && !viewEmployeeId) {
        try {
          // First check if it's already in the employee object
          const existingId = (selectedEmployeeForView as any).employeeId || (selectedEmployeeForView as any).employee_id;
          if (existingId) {
            // Convert string employeeId to number if it's a formatted string like "1234-567890"
            if (typeof existingId === 'string') {
              const idStr = existingId.replace(/-/g, '');
              const numId = parseInt(idStr, 10);
              if (!isNaN(numId)) {
                setViewEmployeeId(numId);
                return;
              }
            } else if (typeof existingId === 'number') {
              setViewEmployeeId(existingId);
              return;
            }
          }

          // Otherwise fetch from accounts API
          const accounts = await apiService.getAllUsers();
          const account = accounts.find(
            (acc: any) =>
              acc.id === selectedEmployeeForView.id ||
              acc.employeeId === selectedEmployeeForView.id ||
              acc.employee_id === selectedEmployeeForView.id ||
              acc.user_id === selectedEmployeeForView.id
          );

          const foundEmployeeId =
            account?.employeeId ||
            account?.employee_id ||
            account?.emp_id ||
            undefined;

          if (foundEmployeeId) {
            // Convert string employeeId to number if it's a formatted string
            if (typeof foundEmployeeId === 'string') {
              const idStr = foundEmployeeId.replace(/-/g, '');
              const numId = parseInt(idStr, 10);
              if (!isNaN(numId)) {
                setViewEmployeeId(numId);
              }
            } else if (typeof foundEmployeeId === 'number') {
              setViewEmployeeId(foundEmployeeId);
            }
          }
        } catch (error) {
          console.error('Error fetching employeeId:', error);
        }
      }
    };

    fetchEmployeeId();
  }, [selectedEmployeeForView, isViewEmployeeModalOpen, viewEmployeeId]);

  // Real-time data updates via localStorage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only refresh if the change is from another tab/window
      if (e.key === "submissions" && e.newValue !== e.oldValue) {
        refreshSubmissions();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Note: overviewSearch is now managed inside OverviewTab component

  // Note: feedbackSearch, feedbackDepartmentFilter, feedbackDateFilter, feedbackDateRange,
  // feedbackQuarterFilter, feedbackApprovalStatusFilter, and feedbackSort are now managed
  // inside EvaluationRecordsTab component

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEmployeesRefreshing, setIsEmployeesRefreshing] = useState(false);
  const [isFeedbackRefreshing, setIsFeedbackRefreshing] = useState(false);
  const [isReviewsRefreshing, setIsReviewsRefreshing] = useState(false);
  const [isHistoryRefreshing, setIsHistoryRefreshing] = useState(false);
  const [isQuarterlyRefreshing, setIsQuarterlyRefreshing] = useState(false);
  const [employeeDataRefresh, setEmployeeDataRefresh] = useState(0);
  const [employees, setEmployees] = useState<any[]>([]);
  const [positions, setPositions] = useState<string[]>([]);

  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [showDeleteSuccessDialog, setShowDeleteSuccessDialog] = useState(false);
  const [showIncorrectPasswordDialog, setShowIncorrectPasswordDialog] =
    useState(false);
  const [isDialogClosing, setIsDialogClosing] = useState(false);
  const [isSuccessDialogClosing, setIsSuccessDialogClosing] = useState(false);
  const [isDeleteDialogClosing, setIsDeleteDialogClosing] = useState(false);

  // Function to load employees and positions from API
  const loadEmployeesAndPositions = async () => {
    try {
      // Load employees
      const employeesData = await apiService.getAllUsers();
      const employeeUsers = employeesData.filter((user: any) => 
        user.role?.name === 'employee' || 
        user.roles?.[0]?.name === 'employee' ||
        (typeof user.role === 'string' && user.role.toLowerCase() === 'employee')
      );
      setEmployees(employeeUsers);

      // Load positions
      const positionsData = await apiService.getPositions();
      const positionNames = positionsData
        .map((pos: any) => {
          const name = pos?.name || pos;
          return typeof name === 'string' ? name : String(name || '');
        })
        .filter((name: string) => name.trim() !== '');
      setPositions(positionNames);
    } catch (err) {
      console.error("Error loading employees and positions:", err);
    }
  };

  // Function to refresh employee data
  const refreshEmployeeData = async () => {
    try {
      setIsRefreshing(true);

      // Load fresh employee and position data
      await loadEmployeesAndPositions();

      // Force re-render by updating the refresh counter
      setEmployeeDataRefresh((prev) => prev + 1);

      // Get updated count after loading
      const updatedEmployees = await apiService.getAllUsers();
      const employeeCount = updatedEmployees.filter((user: any) => 
        user.role?.name === 'employee' || 
        user.roles?.[0]?.name === 'employee' ||
        (typeof user.role === 'string' && user.role.toLowerCase() === 'employee')
      ).length;

      // Show success feedback
      success(
        "Employee Data Refreshed",
        `Successfully loaded ${employeeCount} employee records`
      );
    } catch (err) {
      console.error("Error refreshing employee data:", err);
      setEmployeeDataRefresh((prev) => prev + 1);
      error(
        "Refresh Failed",
        "Failed to refresh employee data. Please try again."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshSubmissions = async () => {
    try {
      // Don't set isRefreshing here - let the calling function handle it
      // Use role-specific endpoint (replaces getSubmissions + filter)
      const evaluations = await apiService.getEvalAuthEvaluator();

      if (Array.isArray(evaluations)) {
        // Ensure data is valid and has unique IDs
        const validData = evaluations.filter(
          (item: any) =>
            item &&
            typeof item === "object" &&
            item.id !== undefined &&
            item.employeeName
        );

        // Remove duplicates based on ID
        const uniqueData = validData.filter(
          (item: any, index: number, self: any[]) =>
            index === self.findIndex((t) => t.id === item.id)
        );

        setRecentSubmissions(uniqueData);

        // Show success feedback
        success(
          "Evaluation Records Refreshed",
          `Successfully loaded ${uniqueData.length} evaluation records`
        );
      } else {
        setRecentSubmissions([]);
        error(
          "Invalid Data",
          "Received invalid data structure from the server"
        );
      }
    } catch (err) {
      console.warn("getEvalAuthEvaluator failed, falling back to getSubmissions:", err);
      // Fallback to old method if new endpoint fails
      try {
        const submissions = await apiService.getSubmissions();
        
        if (Array.isArray(submissions)) {
          const validData = submissions.filter(
            (item: any) =>
              item &&
              typeof item === "object" &&
              item.id !== undefined &&
              item.employeeName &&
              (item.evaluatorId === user?.id ||
               item.employeeId === user?.id ||
               item.evaluationData?.employeeId === user?.id?.toString())
          );

          const uniqueData = validData.filter(
            (item: any, index: number, self: any[]) =>
              index === self.findIndex((t) => t.id === item.id)
          );

          setRecentSubmissions(uniqueData);
          success(
            "Evaluation Records Refreshed",
            `Successfully loaded ${uniqueData.length} evaluation records`
          );
        } else {
          setRecentSubmissions([]);
          error(
            "Invalid Data",
            "Received invalid data structure from the server"
          );
        }
      } catch (fallbackError) {
        console.error("Error fetching submissions:", fallbackError);
        setRecentSubmissions([]);
        error(
          "Refresh Failed",
          "Failed to refresh evaluation records. Please try again."
        );
      }
    }
  };

  // Function to handle refresh with modal
  const handleEvaluationRecordsRefresh = async () => {
    try {
      setIsFeedbackRefreshing(true);

      // Add a 1-second delay to make skeleton visible
      setTimeout(async () => {
        await refreshSubmissions();
        success(
          "Evaluation Records Refreshed",
          "Feedback data has been updated"
        );
        setIsFeedbackRefreshing(false);
      }, 1000); // 1-second delay to see skeleton properly
    } catch (error) {
      console.error("Error during evaluation records refresh:", error);
      setIsFeedbackRefreshing(false);
    }
  };

  // Function to handle refresh completion (no modal)
  const handleEvaluationRecordsRefreshComplete = () => {
    handleEvaluationRecordsRefresh();
  };

  // Function to load account history (all employees' violations/suspensions)

  // Function to handle employees refresh with modal
  const handleEmployeesRefresh = async () => {
    try {
      setIsEmployeesRefreshing(true);

      // Add a 1-second delay to make skeleton visible
      setTimeout(async () => {
        await refreshEmployeeData();
        setIsEmployeesRefreshing(false);
      }, 1000); // 1-second delay to see skeleton properly
    } catch (error) {
      console.error("Error during employees refresh:", error);
      setIsEmployeesRefreshing(false);
    }
  };

  // Function to handle employees refresh completion (no modal)
  const handleEmployeesRefreshComplete = () => {
    handleEmployeesRefresh();
  };

  // Function to handle delete confirmation
  const handleDeleteClick = (feedback: any) => {
    setRecordToDelete(feedback);
    setIsDeleteModalOpen(true);
  };

  // Function to confirm delete
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;

    // Validate password
    if (!deletePassword.trim()) {
      setDeletePasswordError("Password is required to delete records");
      return;
    }

    // Get current user data to verify password
    const currentUser = getCurrentUserData();
    if (!currentUser) {
      setDeletePasswordError("User not found. Please refresh and try again.");
      return;
    }

    // Password verification using the current user's password from accounts.json
    // Get the user's password from the accounts data
    const userAccount = (accountsData as any).accounts.find(
      (account: any) =>
        account.email === currentUser.email ||
        account.username === currentUser.email
    );

    if (!userAccount) {
      setDeletePasswordError(
        "User account not found. Please refresh and try again."
      );
      return;
    }

    // Compare the entered password with the user's actual password
    if (deletePassword !== userAccount.password) {
      setDeletePasswordError("Incorrect password. Please try again.");
      setShowIncorrectPasswordDialog(true);

      // Start pop-down animation after 1 second, then close after 1.3 seconds
      setTimeout(() => {
        setIsDialogClosing(true);
      }, 1000);

      setTimeout(() => {
        setShowIncorrectPasswordDialog(false);
        setDeletePassword("");
        setDeletePasswordError("");
        setIsDialogClosing(false);
      }, 1300);

      return;
    }

    try {
      // Get all submissions from localStorage
      const allSubmissions = await apiService.getSubmissions();

      // Filter out the record to delete
      const updatedSubmissions = allSubmissions.filter(
        (sub: any) => sub.id !== recordToDelete.id
      );

      // Update localStorage
      localStorage.setItem("submissions", JSON.stringify(updatedSubmissions));

      // Update the state to reflect the deletion
      setRecentSubmissions((prev) =>
        prev.filter((sub) => sub.id !== recordToDelete.id)
      );

      // Show success message
      success(
        "Record Deleted",
        `Evaluation record for ${recordToDelete.employeeName} has been deleted successfully`
      );

      // Trigger pop-down animation before closing
      setIsDeleteDialogClosing(true);

      // Close modal and reset state after animation
      setTimeout(() => {
        setIsDeleteModalOpen(false);
        setRecordToDelete(null);
        setDeletePassword("");
        setDeletePasswordError("");
        setIsDeleteDialogClosing(false);

        // Show success dialog with animated check
        setShowDeleteSuccessDialog(true);

        // Start pop-down animation after 1 second, then close after 1.3 seconds
        setTimeout(() => {
          setIsSuccessDialogClosing(true);
        }, 1000);

        setTimeout(() => {
          setShowDeleteSuccessDialog(false);
          setIsSuccessDialogClosing(false);
        }, 1300);
      }, 300); // Match animation duration
    } catch (err) {
      console.error("Error deleting record:", err);
      error(
        "Delete Failed",
        "Failed to delete the evaluation record. Please try again."
      );
    }
  };

  // Function to cancel delete
  const handleCancelDelete = () => {
    // Trigger pop-down animation
    setIsDeleteDialogClosing(true);

    // Wait for animation to complete before closing
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
      setDeletePassword("");
      setDeletePasswordError("");
      setIsDeleteDialogClosing(false);
    }, 300); // Match animation duration
  };

  const handleProfileSave = (updatedProfile: UserProfile) => {
    // Profile is now managed by UserContext
    // Optionally refresh data or show success message
  };

  // Note: sortFeedback and getSortIcon are now managed inside EvaluationRecordsTab component

  const viewEvaluationForm = (feedback: any) => {
    // Find the original submission data for this feedback
    const originalSubmission = recentSubmissions.find(
      (submission) => submission.id === feedback.id
    );

    if (originalSubmission) {
      setSelectedEvaluationSubmission(originalSubmission);
      setIsViewResultsModalOpen(true);
    } else {
      // Fallback: create a submission object from feedback data
      const submissionData = {
        id: feedback.id,
        employeeName: feedback.employeeName,
        category: feedback.category,
        rating: feedback.rating,
        submittedAt: feedback.date,
        status: "completed",
        evaluator: feedback.reviewer,
        evaluationData: {
          overallComments: feedback.comment,
          employeeEmail: feedback.employeeEmail,
          department: feedback.department,
          position: feedback.position,
        },
      };
      setSelectedEvaluationSubmission(submissionData);
      setIsViewResultsModalOpen(true);
    }
  };

  const printFeedback = (feedback: any) => {
    // Find the original submission data for this feedback
    const originalSubmission = recentSubmissions.find(
      (submission) => submission.id === feedback.id
    );

    if (!originalSubmission || !originalSubmission.evaluationData) {
      alert("No evaluation data available for printing");
      return;
    }

    const data = originalSubmission.evaluationData;

    // Calculate scores from individual evaluations
    const jobKnowledgeScore = calculateScore([
      data.jobKnowledgeScore1,
      data.jobKnowledgeScore2,
      data.jobKnowledgeScore3,
    ]);
    const qualityOfWorkScore = calculateScore([
      data.qualityOfWorkScore1,
      data.qualityOfWorkScore2,
      data.qualityOfWorkScore3,
      data.qualityOfWorkScore4,
      data.qualityOfWorkScore5,
    ]);
    const adaptabilityScore = calculateScore([
      data.adaptabilityScore1,
      data.adaptabilityScore2,
      data.adaptabilityScore3,
    ]);
    const teamworkScore = calculateScore([
      data.teamworkScore1,
      data.teamworkScore2,
      data.teamworkScore3,
    ]);
    const reliabilityScore = calculateScore([
      data.reliabilityScore1,
      data.reliabilityScore2,
      data.reliabilityScore3,
      data.reliabilityScore4,
    ]);
    const ethicalScore = calculateScore([
      data.ethicalScore1,
      data.ethicalScore2,
      data.ethicalScore3,
      data.ethicalScore4,
    ]);
    const customerServiceScore = calculateScore([
      data.customerServiceScore1,
      data.customerServiceScore2,
      data.customerServiceScore3,
      data.customerServiceScore4,
      data.customerServiceScore5,
    ]);

    // Calculate weighted scores
    const jobKnowledgeWeighted = (jobKnowledgeScore * 0.2).toFixed(2);
    const qualityOfWorkWeighted = (qualityOfWorkScore * 0.2).toFixed(2);
    const adaptabilityWeighted = (adaptabilityScore * 0.1).toFixed(2);
    const teamworkWeighted = (teamworkScore * 0.1).toFixed(2);
    const reliabilityWeighted = (reliabilityScore * 0.05).toFixed(2);
    const ethicalWeighted = (ethicalScore * 0.05).toFixed(2);
    const customerServiceWeighted = (customerServiceScore * 0.3).toFixed(2);

    // Calculate overall weighted score
    const overallWeightedScore = (
      parseFloat(jobKnowledgeWeighted) +
      parseFloat(qualityOfWorkWeighted) +
      parseFloat(adaptabilityWeighted) +
      parseFloat(teamworkWeighted) +
      parseFloat(reliabilityWeighted) +
      parseFloat(ethicalWeighted) +
      parseFloat(customerServiceWeighted)
    ).toFixed(2);

    const overallPercentage = (
      (parseFloat(overallWeightedScore) / 5) *
      100
    ).toFixed(2);
    const isPass = parseFloat(overallWeightedScore) >= 3.0;

    const printContent = document.createElement("div");
    printContent.innerHTML = `
      <style>
        @media print {
          body { margin: 0; padding: 10px; font-family: Arial, sans-serif; font-size: 10px; }
          .print-header { text-align: center; margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 10px; }
          .print-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .print-subtitle { font-size: 12px; color: #666; }
          .print-section { margin-bottom: 12px; page-break-inside: avoid; }
          .print-section-title { font-size: 14px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
          .print-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-bottom: 8px; }
          .print-field { margin-bottom: 5px; }
          .print-label { font-weight: bold; color: #666; font-size: 9px; }
          .print-value { font-size: 10px; margin-top: 1px; }
          .print-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; page-break-inside: avoid; }
          .print-table th, .print-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 9px; }
          .print-table th { background-color: #f0f0f0; font-weight: bold; }
          .print-results { text-align: center; margin: 8px 0; }
          .print-percentage { font-size: 20px; font-weight: bold; }
          .print-status { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; font-size: 12px; }
          .print-status.pass { background-color: #16a34a; }
          .print-status.fail { background-color: #dc2626; }
          .print-priority { background-color: #fefce8; border: 1px solid #e5e7eb; padding: 5px; margin-bottom: 5px; border-radius: 3px; font-size: 9px; }
          .print-remarks { background-color: #fefce8; border: 1px solid #e5e7eb; padding: 8px; border-radius: 3px; font-size: 9px; }
          .print-signature { background-color: #fefce8; border: 1px solid #e5e7eb; padding: 5px; margin-bottom: 5px; border-radius: 3px; min-height: 25px; font-size: 9px; }
          .print-signature-label { text-align: center; font-size: 8px; color: #666; margin-top: 2px; }
          .print-signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .print-checkbox { margin-right: 4px; }
          .print-step { page-break-before: auto; margin-bottom: 8px; }
          .print-step:first-child { page-break-before: auto; }
          .print-description { font-size: 9px; margin-bottom: 8px; color: #666; }
          .print-compact-table { font-size: 8px; }
          .print-compact-table th, .print-compact-table td { padding: 2px 4px; }
          .print-summary { margin-top: 10px; }
          .no-print { display: none !important; }
        }
      </style>
      
      <div class="print-header">
        <div class="print-title">COMPLETE PERFORMANCE EVALUATION REPORT</div>
        <div class="print-subtitle">Employee Performance Evaluation - All Steps (1-7)</div>
      </div>

      <!-- STEP 1 & 2: Review Type & Employee Information -->
      <div class="print-section">
        <div class="print-section-title">STEP 1: REVIEW TYPE & STEP 2: EMPLOYEE INFORMATION</div>
        <div class="print-grid">
          <div class="print-field">
            <div class="print-label">Review Type:</div>
            <div class="print-value">
              ${data.reviewTypeProbationary3 ? "✓ 3m" : "☐ 3m"} | ${
      data.reviewTypeProbationary5 ? "✓ 5m" : "☐ 5m"
    } | 
              ${data.reviewTypeRegularQ1 ? "✓ Q1" : "☐ Q1"} | ${
      data.reviewTypeRegularQ2 ? "✓ Q2" : "☐ Q2"
    } | 
              ${data.reviewTypeRegularQ3 ? "✓ Q3" : "☐ Q3"} | ${
      data.reviewTypeRegularQ4 ? "✓ Q4" : "☐ Q4"
    }
              ${data.reviewTypeOthersImprovement ? " | ✓ PI" : ""}
              ${
                data.reviewTypeOthersCustom
                  ? ` | ${data.reviewTypeOthersCustom}`
                  : ""
              }
            </div>
          </div>
          <div class="print-field">
            <div class="print-label">Employee:</div>
            <div class="print-value">${data.employeeName || "Not specified"} (${
      data.employeeId || "ID: N/A"
    })</div>
          </div>
          <div class="print-field">
            <div class="print-label">Position:</div>
            <div class="print-value">${data.position || "Not specified"} - ${
      data.department || "Dept: N/A"
    }</div>
          </div>
          <div class="print-field">
            <div class="print-label">Branch & Supervisor:</div>
            <div class="print-value">${data.branch || "Branch: N/A"} | ${
      data.supervisor || "Sup: N/A"
    }</div>
          </div>
          <div class="print-field">
            <div class="print-label">Coverage:</div>
            <div class="print-value">${
      data.coverageFrom && data.coverageTo
        ? `${new Date(data.coverageFrom).toLocaleDateString()} - ${new Date(
            data.coverageTo
          ).toLocaleDateString()}`
        : "Coverage: N/A"
    }</div>
          </div>
        </div>
      </div>

      <!-- STEP 3: Job Knowledge -->
      <div class="print-section">
        <div class="print-section-title">STEP 3: JOB KNOWLEDGE</div>
        <p class="print-description">Demonstrates understanding of job responsibilities. Applies knowledge to tasks and projects.</p>
        <table class="print-table print-compact-table">
          <thead>
            <tr>
              <th style="width: 35%;">Behavioral Indicators</th>
              <th style="width: 35%;">Example</th>
              <th style="width: 8%;">Score</th>
              <th style="width: 12%;">Rating</th>
              <th style="width: 10%;">Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mastery in Core Competencies (L.E.A.D.E.R.)</td>
              <td>Demonstrates comprehensive understanding of job requirements</td>
              <td>${data.jobKnowledgeScore1 || ""}</td>
              <td>${
                data.jobKnowledgeScore1
                  ? getRatingLabel(parseFloat(data.jobKnowledgeScore1))
                  : "N/A"
              }</td>
              <td>${data.jobKnowledgeComments1 || ""}</td>
            </tr>
            <tr>
              <td>Keeps Documentation Updated</td>
              <td>Maintains current and accurate documentation</td>
              <td>${data.jobKnowledgeScore2 || ""}</td>
              <td>${
                data.jobKnowledgeScore2
                  ? getRatingLabel(parseFloat(data.jobKnowledgeScore2))
                  : "N/A"
              }</td>
              <td>${data.jobKnowledgeComments2 || ""}</td>
            </tr>
            <tr>
              <td>Problem Solving</td>
              <td>Effectively identifies and resolves work challenges</td>
              <td>${data.jobKnowledgeScore3 || ""}</td>
              <td>${
                data.jobKnowledgeScore3
                  ? getRatingLabel(parseFloat(data.jobKnowledgeScore3))
                  : "N/A"
              }</td>
              <td>${data.jobKnowledgeComments3 || ""}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Avg: ${jobKnowledgeScore.toFixed(2)} | ${getRatingLabel(
      jobKnowledgeScore
    )}</strong>
        </div>
      </div>

      <!-- STEP 4: Quality of Work -->
      <div class="print-section">
        <div class="print-section-title">STEP 4: QUALITY OF WORK</div>
        <p class="print-description">Accuracy and precision in completing tasks. Attention to detail. Consistency in delivering high-quality results.</p>
        <table class="print-table print-compact-table">
          <thead>
            <tr>
              <th style="width: 35%;">Behavioral Indicators</th>
              <th style="width: 35%;">Example</th>
              <th style="width: 8%;">Score</th>
              <th style="width: 12%;">Rating</th>
              <th style="width: 10%;">Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Meets Standards and Requirements</td>
              <td>Consistently delivers work that meets standards</td>
              <td>${data.qualityOfWorkScore1 || ""}</td>
              <td>${
                data.qualityOfWorkScore1
                  ? getRatingLabel(parseFloat(data.qualityOfWorkScore1))
                  : "N/A"
              }</td>
              <td>${data.qualityOfWorkComments1 || ""}</td>
            </tr>
            <tr>
              <td>Timeliness (L.E.A.D.E.R.)</td>
              <td>Completes tasks within established deadlines</td>
              <td>${data.qualityOfWorkScore2 || ""}</td>
              <td>${
                data.qualityOfWorkScore2
                  ? getRatingLabel(parseFloat(data.qualityOfWorkScore2))
                  : "N/A"
              }</td>
              <td>${data.qualityOfWorkComments2 || ""}</td>
            </tr>
            <tr>
              <td>Work Output Volume (L.E.A.D.E.R.)</td>
              <td>Produces appropriate volume of work output</td>
              <td>${data.qualityOfWorkScore3 || ""}</td>
              <td>${
                data.qualityOfWorkScore3
                  ? getRatingLabel(parseFloat(data.qualityOfWorkScore3))
                  : "N/A"
              }</td>
              <td>${data.qualityOfWorkComments3 || ""}</td>
            </tr>
            <tr>
              <td>Consistency in Performance (L.E.A.D.E.R.)</td>
              <td>Maintains consistent quality standards</td>
              <td>${data.qualityOfWorkScore4 || ""}</td>
              <td>${
                data.qualityOfWorkScore4
                  ? getRatingLabel(parseFloat(data.qualityOfWorkScore4))
                  : "N/A"
              }</td>
              <td>${data.qualityOfWorkComments4 || ""}</td>
            </tr>
            <tr>
              <td>Attention to Detail</td>
              <td>Demonstrates thoroughness and accuracy</td>
              <td>${data.qualityOfWorkScore5 || ""}</td>
              <td>${
                data.qualityOfWorkScore5
                  ? getRatingLabel(parseFloat(data.qualityOfWorkScore5))
                  : "N/A"
              }</td>
              <td>${data.qualityOfWorkComments5 || ""}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Avg: ${qualityOfWorkScore.toFixed(2)} | ${getRatingLabel(
      qualityOfWorkScore
    )}</strong>
        </div>
      </div>

      <!-- STEP 5: Adaptability -->
      <div class="print-section print-step">
        <div class="print-section-title">STEP 5: ADAPTABILITY</div>
        <p style="margin-bottom: 15px; font-size: 14px;">
          Flexibility in handling change. Ability to work effectively in diverse situations. Resilience in the face of challenges.
        </p>
        <table class="print-table">
          <thead>
            <tr>
              <th>Behavioral Indicators</th>
              <th>Example</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Openness to Change (attitude towards change)</td>
              <td>Demonstrates a positive attitude and openness to new ideas and major changes at work</td>
              <td>${data.adaptabilityScore1 || ""}</td>
              <td>${
                data.adaptabilityScore1
                  ? getRatingLabel(parseFloat(data.adaptabilityScore1))
                  : "Not Rated"
              }</td>
              <td>${data.adaptabilityComments1 || ""}</td>
            </tr>
            <tr>
              <td>Flexibility in Job Role (ability to adapt to changes)</td>
              <td>Adapts to changes in job responsibilities and willingly takes on new tasks</td>
              <td>${data.adaptabilityScore2 || ""}</td>
              <td>${
                data.adaptabilityScore2
                  ? getRatingLabel(parseFloat(data.adaptabilityScore2))
                  : "Not Rated"
              }</td>
              <td>${data.adaptabilityComments2 || ""}</td>
            </tr>
            <tr>
              <td>Resilience in the Face of Challenges</td>
              <td>Maintains a positive attitude and performance under challenging or difficult conditions</td>
              <td>${data.adaptabilityScore3 || ""}</td>
              <td>${
                data.adaptabilityScore3
                  ? getRatingLabel(parseFloat(data.adaptabilityScore3))
                  : "Not Rated"
              }</td>
              <td>${data.adaptabilityComments3 || ""}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${adaptabilityScore.toFixed(
            2
          )} | Rating: ${getRatingLabel(adaptabilityScore)}</strong>
        </div>
      </div>

      <!-- STEP 6: Teamwork -->
      <div class="print-section print-step">
        <div class="print-section-title">STEP 6: TEAMWORK</div>
        <p style="margin-bottom: 15px; font-size: 14px;">
          Ability to work well with others. Contribution to team goals and projects. Supportiveness of team members.
        </p>
        <table class="print-table">
          <thead>
            <tr>
              <th>Behavioral Indicators</th>
              <th>Example</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Active Participation in Team Activities</td>
              <td>Actively participates in team meetings and projects. Contributes ideas and feedback during discussions.</td>
              <td>${data.teamworkScore1 || ""}</td>
              <td>${
                data.teamworkScore1
                  ? getRatingLabel(parseFloat(data.teamworkScore1))
                  : "Not Rated"
              }</td>
              <td>${data.teamworkComments1 || ""}</td>
            </tr>
            <tr>
              <td>Promotion of a Positive Team Culture</td>
              <td>Interacts positively with coworkers. Fosters inclusive team culture. Provides support and constructive feedback.</td>
              <td>${data.teamworkScore2 || ""}</td>
              <td>${
                data.teamworkScore2
                  ? getRatingLabel(parseFloat(data.teamworkScore2))
                  : "Not Rated"
              }</td>
              <td>${data.teamworkComments2 || ""}</td>
            </tr>
            <tr>
              <td>Effective Communication</td>
              <td>Communicates openly and clearly with team members. Shares information and updates in a timely manner.</td>
              <td>${data.teamworkScore3 || ""}</td>
              <td>${
                data.teamworkScore3
                  ? getRatingLabel(parseFloat(data.teamworkScore3))
                  : "Not Rated"
              }</td>
              <td>${data.teamworkComments3 || ""}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${teamworkScore.toFixed(
            2
          )} | Rating: ${getRatingLabel(teamworkScore)}</strong>
        </div>
      </div>

      <!-- STEP 7: Reliability -->
      <div class="print-section print-step">
        <div class="print-section-title">STEP 7: RELIABILITY</div>
        <p style="margin-bottom: 15px; font-size: 14px;">
          Consistency in attendance and punctuality. Meeting commitments and fulfilling responsibilities.
        </p>
        <table class="print-table">
          <thead>
            <tr>
              <th>Behavioral Indicators</th>
              <th>Example</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Consistent Attendance</td>
              <td>Demonstrates regular attendance by being present at work as scheduled</td>
              <td>${data.reliabilityScore1 || ""}</td>
              <td>${
                data.reliabilityScore1
                  ? getRatingLabel(parseFloat(data.reliabilityScore1))
                  : "Not Rated"
              }</td>
              <td>${data.reliabilityComments1 || ""}</td>
            </tr>
            <tr>
              <td>Punctuality</td>
              <td>Arrives at work and meetings on time or before the scheduled time</td>
              <td>${data.reliabilityScore2 || ""}</td>
              <td>${
                data.reliabilityScore2
                  ? getRatingLabel(parseFloat(data.reliabilityScore2))
                  : "Not Rated"
              }</td>
              <td>${data.reliabilityComments2 || ""}</td>
            </tr>
            <tr>
              <td>Follows Through on Commitments</td>
              <td>Follows through on assignments from and commitments made to coworkers or superiors</td>
              <td>${data.reliabilityScore3 || ""}</td>
              <td>${
                data.reliabilityScore3
                  ? getRatingLabel(parseFloat(data.reliabilityScore3))
                  : "Not Rated"
              }</td>
              <td>${data.reliabilityComments3 || ""}</td>
            </tr>
            <tr>
              <td>Reliable Handling of Routine Tasks</td>
              <td>Demonstrates reliability in completing routine tasks without oversight</td>
              <td>${data.reliabilityScore4 || ""}</td>
              <td>${
                data.reliabilityScore4
                  ? getRatingLabel(parseFloat(data.reliabilityScore4))
                  : "Not Rated"
              }</td>
              <td>${data.reliabilityComments4 || ""}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${reliabilityScore.toFixed(
            2
          )} | Rating: ${getRatingLabel(reliabilityScore)}</strong>
        </div>
      </div>

      <!-- STEP 8: Ethical & Professional Behavior -->
      <div class="print-section print-step">
        <div class="print-section-title">STEP 8: ETHICAL & PROFESSIONAL BEHAVIOR</div>
        <p style="margin-bottom: 15px; font-size: 14px;">
          Complies with company policies and ethical standards. Accountability for one's actions. Professionalism in interactions.
        </p>
        <table class="print-table">
          <thead>
            <tr>
              <th>Behavioral Indicators</th>
              <th>Example</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Follows Company Policies</td>
              <td>Complies with company rules, regulations, and memorandums</td>
              <td>${data.ethicalScore1 || ""}</td>
              <td>${
                data.ethicalScore1
                  ? getRatingLabel(parseFloat(data.ethicalScore1))
                  : "Not Rated"
              }</td>
              <td>${data.ethicalExplanation1 || ""}</td>
            </tr>
            <tr>
              <td>Professionalism (L.E.A.D.E.R.)</td>
              <td>Maintains a high level of professionalism in all work interactions</td>
              <td>${data.ethicalScore2 || ""}</td>
              <td>${
                data.ethicalScore2
                  ? getRatingLabel(parseFloat(data.ethicalScore2))
                  : "Not Rated"
              }</td>
              <td>${data.ethicalExplanation2 || ""}</td>
            </tr>
            <tr>
              <td>Accountability for Mistakes (L.E.A.D.E.R.)</td>
              <td>Takes responsibility for errors and actively works to correct mistakes</td>
              <td>${data.ethicalScore3 || ""}</td>
              <td>${
                data.ethicalScore3
                  ? getRatingLabel(parseFloat(data.ethicalScore3))
                  : "Not Rated"
              }</td>
              <td>${data.ethicalExplanation3 || ""}</td>
            </tr>
            <tr>
              <td>Respect for Others (L.E.A.D.E.R.)</td>
              <td>Treats all individuals fairly and with respect, regardless of background or position</td>
              <td>${data.ethicalScore4 || ""}</td>
              <td>${
                data.ethicalScore4
                  ? getRatingLabel(parseFloat(data.ethicalScore4))
                  : "Not Rated"
              }</td>
              <td>${data.ethicalExplanation4 || ""}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${ethicalScore.toFixed(
            2
          )} | Rating: ${getRatingLabel(ethicalScore)}</strong>
        </div>
      </div>

      <!-- STEP 9: Customer Service -->
      <div class="print-section print-step">
        <div class="print-section-title">STEP 9: CUSTOMER SERVICE</div>
        <p style="margin-bottom: 15px; font-size: 14px;">
          Customer satisfaction. Responsiveness to customer needs. Professional and positive interactions with customers.
        </p>
        <table class="print-table">
          <thead>
            <tr>
              <th>Behavioral Indicators</th>
              <th>Example</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Listening & Understanding</td>
              <td>Listens to customers and displays understanding of customer needs and concerns</td>
              <td>${data.customerServiceScore1 || ""}</td>
              <td>${
                data.customerServiceScore1
                  ? getRatingLabel(parseFloat(data.customerServiceScore1))
                  : "Not Rated"
              }</td>
              <td>${data.customerServiceExplanation1 || ""}</td>
            </tr>
            <tr>
              <td>Problem-Solving for Customer Satisfaction</td>
              <td>Proactively identifies and solves customer problems to ensure satisfaction</td>
              <td>${data.customerServiceScore2 || ""}</td>
              <td>${
                data.customerServiceScore2
                  ? getRatingLabel(parseFloat(data.customerServiceScore2))
                  : "Not Rated"
              }</td>
              <td>${data.customerServiceExplanation2 || ""}</td>
            </tr>
            <tr>
              <td>Product Knowledge for Customer Support (L.E.A.D.E.R.)</td>
              <td>Possesses comprehensive product knowledge to assist customers effectively</td>
              <td>${data.customerServiceScore3 || ""}</td>
              <td>${
                data.customerServiceScore3
                  ? getRatingLabel(parseFloat(data.customerServiceScore3))
                  : "Not Rated"
              }</td>
              <td>${data.customerServiceExplanation3 || ""}</td>
            </tr>
            <tr>
              <td>Positive and Professional Attitude (L.E.A.D.E.R.)</td>
              <td>Maintains a positive and professional demeanor, particularly during customer interactions</td>
              <td>${data.customerServiceScore4 || ""}</td>
              <td>${
                data.customerServiceScore4
                  ? getRatingLabel(parseFloat(data.customerServiceScore4))
                  : "Not Rated"
              }</td>
              <td>${data.customerServiceExplanation4 || ""}</td>
            </tr>
            <tr>
              <td>Timely Resolution of Customer Issues (L.E.A.D.E.R.)</td>
              <td>Resolves customer issues promptly and efficiently</td>
              <td>${data.customerServiceScore5 || ""}</td>
              <td>${
                data.customerServiceScore5
                  ? getRatingLabel(parseFloat(data.customerServiceScore5))
                  : "Not Rated"
              }</td>
              <td>${data.customerServiceExplanation5 || ""}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${customerServiceScore.toFixed(
            2
          )} | Rating: ${getRatingLabel(customerServiceScore)}</strong>
        </div>
      </div>

      <!-- COMPACT EVALUATION SUMMARY -->
      <div class="print-section print-summary">
        <div class="print-section-title">EVALUATION SUMMARY</div>
        <div class="print-grid">
          <div class="print-field">
            <div class="print-label">Job Knowledge:</div>
            <div class="print-value">${jobKnowledgeScore.toFixed(
              2
            )} (${getRatingLabel(jobKnowledgeScore)}) - 20%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Quality of Work:</div>
            <div class="print-value">${qualityOfWorkScore.toFixed(
              2
            )} (${getRatingLabel(qualityOfWorkScore)}) - 20%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Adaptability:</div>
            <div class="print-value">${adaptabilityScore.toFixed(
              2
            )} (${getRatingLabel(adaptabilityScore)}) - 10%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Teamwork:</div>
            <div class="print-value">${teamworkScore.toFixed(
              2
            )} (${getRatingLabel(teamworkScore)}) - 10%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Reliability:</div>
            <div class="print-value">${reliabilityScore.toFixed(
              2
            )} (${getRatingLabel(reliabilityScore)}) - 5%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Ethical Behavior:</div>
            <div class="print-value">${ethicalScore.toFixed(
              2
            )} (${getRatingLabel(ethicalScore)}) - 5%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Customer Service:</div>
            <div class="print-value">${customerServiceScore.toFixed(
              2
            )} (${getRatingLabel(customerServiceScore)}) - 30%</div>
          </div>
        </div>
        
        <div class="print-results">
          <div class="print-percentage">${overallPercentage}%</div>
          <div style="margin-bottom: 8px;">Performance Score</div>
          <div class="print-status ${isPass ? "pass" : "fail"}">${
      isPass ? "PASS" : "FAIL"
    }</div>
        </div>
      </div>

      <!-- FINAL SECTIONS -->
      <div class="print-section">
        <div class="print-section-title">PRIORITY AREAS, REMARKS & ACKNOWLEDGEMENT</div>
        
        ${
          data.priorityArea1 || data.priorityArea2 || data.priorityArea3
            ? `
        <div style="margin-bottom: 8px;">
          <strong>Priority Areas:</strong><br>
          ${data.priorityArea1 ? `1. ${data.priorityArea1}<br>` : ""}
          ${data.priorityArea2 ? `2. ${data.priorityArea2}<br>` : ""}
          ${data.priorityArea3 ? `3. ${data.priorityArea3}` : ""}
        </div>
        `
            : ""
        }
        
        ${
          data.remarks
            ? `
        <div style="margin-bottom: 8px;">
          <strong>Remarks:</strong> ${data.remarks}
        </div>
        `
            : ""
        }
        
        <div style="margin-bottom: 8px;">
          <strong>Acknowledgement:</strong> I hereby acknowledge that the Evaluator has explained to me, to the best of their ability, 
          and in a manner I fully understand, my performance and respective rating on this performance evaluation.
        </div>
        
        <div class="print-signature-grid">
          <div>
            <div class="print-signature">${
              data.employeeSignature || "Employee signature not provided"
            }</div>
            <div class="print-signature-label">Employee's Name & Signature</div>
            <div style="margin-top: 5px; font-size: 8px;">
              <strong>Date:</strong> ${
                data.employeeSignatureDate || "Not specified"
              }
            </div>
          </div>
          <div>
            <div class="print-signature">${
              data.evaluatorSignature || "Evaluator signature not provided"
            }</div>
            <div class="print-signature-label">Evaluator's Name & Signature</div>
            <div style="margin-top: 5px; font-size: 8px;">
              <strong>Date:</strong> ${
                data.evaluatorSignatureDate || "Not specified"
              }
            </div>
          </div>
        </div>
      </div>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } else {
      alert("Please allow popups to print the evaluation.");
    }
  };

  // Evaluator approval function
  const handleEvaluatorApproval = async (feedback: any) => {
    const currentUser = getCurrentUserData();

    if (!currentUser?.signature) {
      alert(
        "Please add a signature to your profile before approving evaluations."
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to approve this evaluation for ${feedback.employeeName}?`
      )
    ) {
      return;
    }

    try {
      // Find the original submission
      const originalSubmission = recentSubmissions.find(
        (submission) => submission.id === feedback.id
      );

      if (!originalSubmission) {
        alert("Evaluation not found");
        return;
      }

      // Update the submission with evaluator approval
      const updatedSubmission = {
        ...originalSubmission,
        evaluatorSignature: currentUser.signature,
        evaluatorApprovedAt: new Date().toISOString(),
        // Don't set approvalStatus here - let getCorrectApprovalStatus determine it
      };

      // Update the submissions array
      setRecentSubmissions((prev) => {
        const updated = prev.map((sub) =>
          sub.id === feedback.id ? updatedSubmission : sub
        );
        return updated;
      });

      // Save to localStorage using the proper service method
      const allSubmissions = await apiService.getSubmissions();
      const updatedSubmissions = allSubmissions.map((sub: any) =>
        sub.id === feedback.id ? updatedSubmission : sub
      );

      // Update localStorage using the same key as the service
      localStorage.setItem("submissions", JSON.stringify(updatedSubmissions));

      // Refresh the submissions data to ensure UI updates
      await refreshSubmissions();

      alert(
        `Evaluation for ${feedback.employeeName} has been approved successfully!`
      );

      // Backend automatically creates notification for evaluator approval
    } catch (error) {
      console.error("Error approving evaluation:", error);
      alert("Failed to approve evaluation. Please try again.");
    }
  };

  // Note: exportEvaluationRecordsToCSV is now managed inside EvaluationRecordsTab component

  // Function to determine correct approval status based on signatures
  // Following the same logic as HR Dashboard for consistency
  const getCorrectApprovalStatus = (submission: any) => {
    // Check if both parties have signed (handle empty strings too)
    // Employee signature should be an actual signature image (base64 data URL)
    const hasEmployeeSignature = !!(
      (submission.employeeSignature &&
        submission.employeeSignature.trim() &&
        submission.employeeSignature.startsWith("data:image")) ||
      (submission.evaluationData?.employeeSignature &&
        submission.evaluationData.employeeSignature.trim() &&
        submission.evaluationData.employeeSignature.startsWith("data:image"))
    );

    // Evaluator signature - check for actual signature image, not just the name
    const hasEvaluatorSignature = !!(
      (submission.evaluatorSignatureImage &&
        submission.evaluatorSignatureImage.trim() &&
        submission.evaluatorSignatureImage.startsWith("data:image")) ||
      (submission.evaluationData?.evaluatorSignatureImage &&
        submission.evaluationData.evaluatorSignatureImage.trim() &&
        submission.evaluationData.evaluatorSignatureImage.startsWith(
          "data:image"
        ))
    );

    // Determine approval status - SIGNATURES HAVE PRIORITY over stored status
    if (hasEmployeeSignature && hasEvaluatorSignature) {
      // Both signed = fully approved (regardless of stored status)
      return "fully_approved";
    } else if (hasEmployeeSignature) {
      // Only employee signed
      return "employee_approved";
    } else if (
      submission.approvalStatus &&
      submission.approvalStatus !== "pending"
    ) {
      // No signatures detected, use stored status
      return submission.approvalStatus;
    } else {
      return "pending";
    }
  };

  // Backend automatically creates notifications when evaluations are fully approved
  // No need to monitor or manually create notifications - they're handled by the backend

  // Function to merge employee approval data from localStorage
  const mergeEmployeeApprovalData = (submissions: any[]) => {
    return submissions.map((submission) => {
      // Try to get employee approval data from localStorage
      // We need to check all possible employee emails that might have approved this evaluation
      let employeeApprovalData = null;

      // Check if submission has employee email
      if (submission.employeeEmail) {
        const approvalKey = `approvalData_${submission.employeeEmail}`;
        const approvalData = JSON.parse(
          localStorage.getItem(approvalKey) || "{}"
        );
        employeeApprovalData = approvalData[submission.id?.toString()] || null;
      }

      // If not found, try to find approval data by checking all localStorage keys
      if (!employeeApprovalData) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("approvalData_")) {
            const approvalData = JSON.parse(localStorage.getItem(key) || "{}");
            const foundApproval = approvalData[submission.id?.toString()];
            if (foundApproval) {
              employeeApprovalData = foundApproval;
              break;
            }
          }
        }
      }

      // Merge approval data if found
      if (employeeApprovalData) {
        return {
          ...submission,
          employeeSignature: employeeApprovalData.employeeSignature,
          employeeApprovedAt: employeeApprovalData.approvedAt,
          employeeName:
            employeeApprovalData.employeeName || submission.employeeName,
          employeeEmail:
            employeeApprovalData.employeeEmail || submission.employeeEmail,
        };
      }

      return submission;
    });
  };

  // Note: filteredFeedbackData is now computed inside EvaluationRecordsTab component

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCurrentPeriod(mockData.dashboard.currentPeriod);
        setData(
          mockData.dashboard.performanceData as unknown as PerformanceData
        );

        // Fetch evaluations using role-specific endpoint (replaces getSubmissions + filter)
        try {
          const evaluations = await apiService.getEvalAuthEvaluator();

          if (Array.isArray(evaluations)) {
            // Ensure data is valid and has unique IDs
            const validData = evaluations.filter(
              (item: any) =>
                item &&
                typeof item === "object" &&
                item.id !== undefined &&
                item.employeeName
            );

            // Remove duplicates based on ID
            const uniqueData = validData.filter(
              (item: any, index: number, self: any[]) =>
                index === self.findIndex((t) => t.id === item.id)
            );

            setRecentSubmissions(uniqueData);
          } else {
            console.warn("Invalid data structure received from API");
            setRecentSubmissions([]);
          }
        } catch (evalError) {
          console.warn("getEvalAuthEvaluator failed, falling back to getSubmissions:", evalError);
          // Fallback to old method if new endpoint fails
          const submissions = await apiService.getSubmissions();
          
          if (Array.isArray(submissions)) {
            const validData = submissions.filter(
              (item: any) =>
                item &&
                typeof item === "object" &&
                item.id !== undefined &&
                item.employeeName &&
                item.evaluatorId === user?.id
            );

            const uniqueData = validData.filter(
              (item: any, index: number, self: any[]) =>
                index === self.findIndex((t) => t.id === item.id)
            );

            setRecentSubmissions(uniqueData);
          } else {
            setRecentSubmissions([]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sidebarItems: SidebarItem[] = [
    { id: "overview", label: "Overview", icon: "📊", path: "/evaluator?tab=overview" },
    { id: "employees", label: "Employees", icon: "👥", path: "/evaluator?tab=employees" },
    { id: "feedback", label: "Evaluation Records", icon: "🗂️", path: "/evaluator?tab=feedback" },
    { id: "reviews", label: "Performance Reviews", icon: "📝", path: "/evaluator?tab=reviews" },
    { id: "history", label: "Evaluation History", icon: "📈", path: "/evaluator?tab=history" },
  ];

  // Loading state is now handled in the main return statement

  // Calculate statistics from actual submission data
  const stats = useMemo(() => {
    const evaluatorSubmissions = recentSubmissions.filter(
      (sub) =>
        sub.evaluatorId === user?.id ||
        sub.employeeId === user?.id ||
        sub.evaluationData?.employeeId === user?.id?.toString()
    );

    // Count pending approvals (not fully approved)
    const pendingCount = evaluatorSubmissions.filter((sub) => {
      const status = getCorrectApprovalStatus(sub);
      return status !== "fully_approved";
    }).length;

    // Count fully approved
    const approvedCount = evaluatorSubmissions.filter((sub) => {
      const status = getCorrectApprovalStatus(sub);
      return status === "fully_approved";
    }).length;

    return {
      totalEvaluations: evaluatorSubmissions.length,
      pendingApprovals: pendingCount,
      completedApprovals: approvedCount,
    };
  }, [recentSubmissions, user?.id]);

  const topSummary = (
    <>
      {isRefreshing ? (
        // Skeleton cards for overview
        <>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-20" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-3 w-6" />
              </div>
              <Skeleton className="h-5 w-16 mt-2 rounded-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-22" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-16 mt-1" />
              <Skeleton className="h-1.5 w-full mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-3 w-20 mt-1" />
            </CardContent>
          </Card>
        </>
      ) : (
        // Actual cards with real data
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Evaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-bold text-gray-900">
                  {stats.totalEvaluations}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Conducted by you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {stats.pendingApprovals}
              </div>
              <p className="text-sm text-gray-500 mt-1">Awaiting approval</p>
              <Progress
                value={
                  stats.totalEvaluations > 0
                    ? (stats.pendingApprovals / stats.totalEvaluations) * 100
                    : 0
                }
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Fully Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.completedApprovals}
              </div>
              <p className="text-sm text-gray-500 mt-1">Completed & signed</p>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );

  // Filter submissions - used by employees tab (overview tab handles its own filtering)
  const filteredSubmissions = recentSubmissions.filter((submission) => {
    // Ensure submission is valid
    if (!submission || !submission.employeeName) {
      return false;
    }
    return true;
  });

  const renderContent = () => {
    switch (active) {
      case "overview":
        return (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <OverviewTab
              recentSubmissions={recentSubmissions}
              seenSubmissions={seenSubmissions}
              isRefreshing={isRefreshing}
              isFeedbackRefreshing={isFeedbackRefreshing}
              onRefresh={handleEvaluationRecordsRefresh}
              onViewEvaluation={(submission) => {
                setSelectedEvaluationSubmission(submission);
                setIsViewResultsModalOpen(true);
              }}
              onMarkAsSeen={markSubmissionAsSeen}
              getSubmissionHighlight={getSubmissionHighlight}
              getTimeAgo={getTimeAgo}
              calculateOverallRating={calculateOverallRating}
              isActive={active === "overview"}
            />
          </Suspense>
        );
      case "employees":
        return (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <EmployeesTab
              filteredSubmissions={filteredSubmissions}
              isEmployeesRefreshing={isEmployeesRefreshing}
              employeeDataRefresh={employeeDataRefresh}
              onRefresh={handleEmployeesRefresh}
              employees={employees}
              positions={positions}
              onViewEmployee={(employee) => {
                setSelectedEmployeeForView(employee);
                setIsViewEmployeeModalOpen(true);
              }}
              onEvaluateEmployee={async (employee) => {
                // Fetch fresh employee data from API to ensure we have latest updates (position, department, role)
                try {
                  // Fetch latest employee data from API
                  const freshEmployeeData = await apiService.getEmployee(employee.id);
                  
                  // If API returns fresh data, use it; otherwise fall back to cached employee data
                  const updatedEmployee: Employee = freshEmployeeData ? {
                    id: freshEmployeeData.id || employee.id,
                    name: freshEmployeeData.name || freshEmployeeData.fname + ' ' + freshEmployeeData.lname || employee.name,
                    email: freshEmployeeData.email || employee.email,
                    position: freshEmployeeData.position || employee.position,
                    department: freshEmployeeData.department || employee.department,
                    branch: freshEmployeeData.branch || employee.branch,
                    role: freshEmployeeData.role || freshEmployeeData.roles?.[0]?.name || freshEmployeeData.roles?.[0] || employee.role,
                    ...(freshEmployeeData.avatar || (employee as any).avatar ? { avatar: freshEmployeeData.avatar || (employee as any).avatar } : {}),
                  } as Employee : employee;
                  
                  // Fetch formatted employee ID from accounts
                  try {
                    const accounts = await apiService.getAccounts();
                    const account = accounts.find((acc: any) => 
                      acc.employeeId === updatedEmployee.id || 
                      acc.id === updatedEmployee.id ||
                      acc.email === updatedEmployee.email
                    );
                    
                    // Get formatted employee_id from account (stored as employee_id in registration)
                    const formattedEmployeeId = (account as any)?.employee_id || account?.employeeId;
                    
                    setSelectedEmployee({
                      ...updatedEmployee,
                      employeeId: formattedEmployeeId ? String(formattedEmployeeId) : undefined,
                    });
                  } catch (error) {
                    console.error('Error fetching employee ID:', error);
                    setSelectedEmployee(updatedEmployee);
                  }
                } catch (error) {
                  console.error('Error fetching fresh employee data:', error);
                  // Fallback to cached employee data if API call fails
                  setSelectedEmployee(employee);
                }
                setIsEvaluationTypeModalOpen(true);
              }}
              getUpdatedAvatar={getUpdatedAvatar}
              hasAvatarUpdate={hasAvatarUpdate}
              currentUser={user}
              isActive={active === "employees"}
            />
          </Suspense>
        );
      case "feedback":
        return (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <EvaluationRecordsTab
              recentSubmissions={recentSubmissions}
              seenSubmissions={seenSubmissions}
              isFeedbackRefreshing={isFeedbackRefreshing}
              onRefresh={handleEvaluationRecordsRefresh}
              onViewEvaluation={(feedback) => {
                viewEvaluationForm(feedback);
              }}
              onPrintFeedback={(feedback) => {
                printFeedback(feedback);
              }}
              onDeleteClick={(feedback) => {
                handleDeleteClick(feedback);
              }}
              onMarkAsSeen={markSubmissionAsSeen}
              getSubmissionHighlight={getSubmissionHighlight}
              isActive={active === "feedback"}
            />
          </Suspense>
        );
      case "reviews":
        return (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <PerformanceReviewsTab
              recentSubmissions={recentSubmissions}
              user={user}
              isReviewsRefreshing={isReviewsRefreshing}
              loading={loading}
              calculateOverallRating={calculateOverallRating}
              getSubmissionHighlight={getSubmissionHighlight}
              getTimeAgo={getTimeAgo}
              onViewEvaluation={(submission) => {
                viewEvaluationForm(submission);
              }}
              isActive={active === "reviews"}
            />
          </Suspense>
        );
      case "history":
        return (
          <Suspense
            fallback={
              <div className="relative min-h-[500px]">
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img
                          src="/smct.png"
                          alt="SMCT Logo"
                          className="h-10 w-10 object-contain"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                      Loading evaluation history...
                    </p>
                  </div>
                </div>
              </div>
            }
          >
            <EvaluationHistoryTab
              recentSubmissions={recentSubmissions}
              user={user}
              loading={loading}
              isHistoryRefreshing={isHistoryRefreshing}
              isQuarterlyRefreshing={isQuarterlyRefreshing}
              onRefreshQuarterly={handleRefreshQuarterly}
              onRefreshHistory={handleRefreshHistory}
              onViewEvaluation={viewEvaluationForm}
              calculateOverallRating={calculateOverallRating}
              getSubmissionHighlight={getSubmissionHighlight}
              getTimeAgo={getTimeAgo}
              getCorrectApprovalStatus={getCorrectApprovalStatus}
              isNewSubmission={isNewSubmission}
              isActive={active === "history"}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Loading Screen - Shows during initial load */}
      {(loading || !data) && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-800">
              Loading Dashboard...
            </p>
          </div>
        </div>
      )}

      <PageTransition>
        <DashboardShell
          title="Evaluator Dashboard"
          currentPeriod="Q4 2024"
          sidebarItems={sidebarItems}
          activeItemId={active}
          onChangeActive={handleTabChange}
          topSummary={topSummary}
          onSaveProfile={handleProfileSave}
        >
          {renderContent()}
        </DashboardShell>

        {/* Evaluation Type Selection Modal */}
        <EvaluationTypeModal
          isOpen={isEvaluationTypeModalOpen}
          onCloseAction={() => {
            setIsEvaluationTypeModalOpen(false);
            if (!evaluationType) {
              setSelectedEmployee(null);
            }
          }}
          onSelectEmployeeAction={() => {
            const employee = selectedEmployee;
            console.log("Selecting employee evaluation", employee);
            if (!employee) {
              console.error("No employee selected!");
              return;
            }
            setEvaluationType("employee");
            setIsEvaluationTypeModalOpen(false);
            // Use setTimeout to ensure state is set before opening modal
            setTimeout(() => {
              console.log(
                "Opening employee evaluation modal",
                employee,
                "employee"
              );
              // Ensure employee is still set
              if (employee) {
                setSelectedEmployee(employee);
              }
              setIsEvaluationModalOpen(true);
            }, 50);
          }}
          onSelectManagerAction={() => {
            const employee = selectedEmployee;
            console.log("Selecting manager evaluation", employee);
            if (!employee) {
              console.error("No employee selected!");
              return;
            }
            setEvaluationType("manager");
            setIsEvaluationTypeModalOpen(false);
            // Use setTimeout to ensure state is set before opening modal
            setTimeout(() => {
              console.log(
                "Opening manager evaluation modal",
                employee,
                "manager"
              );
              // Ensure employee is still set
              if (employee) {
                setSelectedEmployee(employee);
              }
              setIsEvaluationModalOpen(true);
            }, 50);
          }}
          employeeName={selectedEmployee?.name}
        />

        {/* Evaluation Modal */}
        <Dialog
          open={isEvaluationModalOpen}
          onOpenChangeAction={(open) => {
            console.log(
              "Evaluation modal onOpenChangeAction",
              open,
              "selectedEmployee:",
              selectedEmployee,
              "evaluationType:",
              evaluationType
            );
            if (!open) {
              setIsEvaluationModalOpen(false);
              setSelectedEmployee(null);
              setEvaluationType(null);
            }
          }}
        >
          <DialogContent className="max-w-7xl max-h-[101vh] overflow-hidden p-0 evaluation-container">
            {selectedEmployee && evaluationType === "employee" && (
              <EvaluationForm
                key={`employee-eval-${selectedEmployee.id}-${evaluationType}`}
                employee={{
                  ...selectedEmployee,
                  name: selectedEmployee.name || '',
                  email: selectedEmployee.email || '',
                  position: selectedEmployee.position || '',
                  department: selectedEmployee.department || '',
                  role: selectedEmployee.role || '',
                }}
                currentUser={getCurrentUserData()}
                onCloseAction={() => {
                  setIsEvaluationModalOpen(false);
                  setSelectedEmployee(null);
                  setEvaluationType(null);
                }}
              />
            )}
            {selectedEmployee && evaluationType === "manager" && (
              <ManagerEvaluationForm
                key={`manager-eval-${selectedEmployee.id}-${evaluationType}`}
                employee={{
                  ...selectedEmployee,
                  name: selectedEmployee.name || '',
                  email: selectedEmployee.email || '',
                  position: selectedEmployee.position || '',
                  department: selectedEmployee.department || '',
                  role: selectedEmployee.role || '',
                }}
                currentUser={getCurrentUserData()}
                onCloseAction={() => {
                  setIsEvaluationModalOpen(false);
                  setSelectedEmployee(null);
                  setEvaluationType(null);
                }}
              />
            )}
            {selectedEmployee && !evaluationType && (
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  Please select an evaluation type... (Debug: employee=
                  {selectedEmployee?.name}, type={evaluationType})
                </p>
              </div>
            )}
            {!selectedEmployee && (
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  No employee selected (Debug: evaluationType={evaluationType})
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Success Dialog */}
        <Dialog
          open={showDeleteSuccessDialog}
          onOpenChangeAction={setShowDeleteSuccessDialog}
        >
          <DialogContent
            className={`max-w-sm w-[90vw] sm:w-full px-6 py-6 ${
              isSuccessDialogClosing ? "animate-popdown" : "animate-popup"
            }`}
          >
            <div className="space-y-4 fade-in-scale">
              <div className="flex justify-center mt-2">
                <div className="w-16 h-16 flex items-center justify-center p-1">
                  <svg
                    viewBox="0 0 52 52"
                    className="w-12 h-12 overflow-visible"
                  >
                    <circle
                      className="check-circle"
                      cx="26"
                      cy="26"
                      r="24"
                      fill="none"
                    />
                    <path
                      className="check-path"
                      fill="none"
                      d="M14 27 l8 8 l16 -16"
                    />
                  </svg>
                </div>
              </div>
              <style jsx>{`
                .check-circle {
                  stroke: #22c55e;
                  stroke-width: 3;
                  stroke-linecap: round;
                  stroke-dasharray: 160;
                  stroke-dashoffset: 160;
                  animation: draw-circle 0.6s ease-out forwards;
                }
                .check-path {
                  stroke: #16a34a;
                  stroke-width: 4;
                  stroke-linecap: round;
                  stroke-linejoin: round;
                  stroke-dasharray: 50;
                  stroke-dashoffset: 50;
                  animation: draw-check 0.4s ease-out 0.4s forwards;
                }
                @keyframes draw-circle {
                  to {
                    stroke-dashoffset: 0;
                  }
                }
                @keyframes draw-check {
                  to {
                    stroke-dashoffset: 0;
                  }
                }
                .fade-in-scale {
                  animation: fadeInScale 220ms ease-out both;
                }
                @keyframes fadeInScale {
                  from {
                    opacity: 0;
                    transform: scale(0.98);
                  }
                  to {
                    opacity: 1;
                    transform: scale(1);
                  }
                }
              `}</style>
              <p className="text-lg font-medium text-gray-900 text-center">
                Record Deleted
              </p>
              <p className="text-sm text-gray-600 text-center">
                The evaluation record has been removed.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Incorrect Password Dialog */}
        <Dialog
          open={showIncorrectPasswordDialog}
          onOpenChangeAction={setShowIncorrectPasswordDialog}
        >
          <DialogContent
            className={`max-w-sm w-[90vw] sm:w-full px-6 py-6 ${
              isDialogClosing ? "animate-popdown" : "animate-popup"
            }`}
          >
            <div className="space-y-3 fade-in-scale">
              <div className="flex justify-center mt-1">
                <div className="w-16 h-16 flex items-center justify-center p-1">
                  <svg
                    viewBox="0 0 52 52"
                    className="w-12 h-12 overflow-visible"
                  >
                    <circle
                      className="error-circle"
                      cx="26"
                      cy="26"
                      r="24"
                      fill="none"
                    />
                    <path
                      className="error-x-line1"
                      fill="none"
                      d="M16 16 l20 20"
                    />
                    <path
                      className="error-x-line2"
                      fill="none"
                      d="M36 16 l-20 20"
                    />
                  </svg>
                </div>
              </div>
              <style jsx>{`
                .fade-in-scale {
                  animation: fadeInScale 200ms ease-out both;
                }
                @keyframes fadeInScale {
                  from {
                    opacity: 0;
                    transform: scale(0.98);
                  }
                  to {
                    opacity: 1;
                    transform: scale(1);
                  }
                }
                .error-circle {
                  stroke: #dc2626;
                  stroke-width: 3;
                  stroke-linecap: round;
                  stroke-dasharray: 160;
                  stroke-dashoffset: 160;
                  animation: draw-error-circle 0.6s ease-out forwards;
                }
                .error-x-line1 {
                  stroke: #dc2626;
                  stroke-width: 4;
                  stroke-linecap: round;
                  stroke-linejoin: round;
                  stroke-dasharray: 30;
                  stroke-dashoffset: 30;
                  animation: draw-x-line1 0.4s ease-out 0.3s forwards;
                }
                .error-x-line2 {
                  stroke: #dc2626;
                  stroke-width: 4;
                  stroke-linecap: round;
                  stroke-linejoin: round;
                  stroke-dasharray: 30;
                  stroke-dashoffset: 30;
                  animation: draw-x-line2 0.4s ease-out 0.5s forwards;
                }
                @keyframes draw-error-circle {
                  to {
                    stroke-dashoffset: 0;
                  }
                }
                @keyframes draw-x-line1 {
                  to {
                    stroke-dashoffset: 0;
                  }
                }
                @keyframes draw-x-line2 {
                  to {
                    stroke-dashoffset: 0;
                  }
                }
              `}</style>
              <p className="text-lg font-medium text-gray-900 text-center">
                Incorrect Password
              </p>
              <p className="text-sm text-gray-600 text-center">
                Please try again with the correct password.
              </p>
            </div>
          </DialogContent>
        </Dialog>
        {/* View Results Modal */}
        <ViewResultsModal
          isOpen={isViewResultsModalOpen}
          onCloseAction={() => setIsViewResultsModalOpen(false)}
          submission={selectedEvaluationSubmission as any}
          currentUserName={getCurrentUserData()?.name}
          currentUserSignature={getCurrentUserData()?.signature}
          isEvaluatorView={true}
        />

        {/* Cancel Evaluation Alert Dialog */}
        <AlertDialog
          open={isCancelAlertOpen}
          onOpenChangeAction={setIsCancelAlertOpen}
          title="Cancel Evaluation"
          description="Are you sure you want to cancel this evaluation? All progress will be lost and cannot be recovered."
          type="warning"
          confirmText="Yes, Cancel"
          cancelText="Continue Evaluation"
          showCancel={true}
          onConfirm={() => {
            setIsEvaluationModalOpen(false);
            setSelectedEmployee(null);
            setIsCancelAlertOpen(false);
          }}
          onCancel={() => setIsCancelAlertOpen(false)}
        />

        {/* Delete Confirmation Modal with Password */}
        <Dialog
          open={isDeleteModalOpen}
          onOpenChangeAction={setIsDeleteModalOpen}
        >
          <DialogContent
            className={`sm:max-w-md mx-4 my-8 bg-white ${
              isDeleteDialogClosing ? "animate-popdown" : "animate-popup"
            }`}
          >
            <div className="space-y-6 p-2">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4 animate-pulse">
                  <svg
                    className="h-6 w-6 text-red-600 animate-bounce"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Delete Evaluation Record
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  Are you sure you want to delete the evaluation record for{" "}
                  <strong>{recordToDelete?.employeeName}</strong>? This action
                  cannot be undone and all data will be permanently removed.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="delete-password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Enter your account password to confirm deletion:
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      setDeletePasswordError("");
                    }}
                    placeholder="Enter your account password"
                    className={`mt-2 ${
                      deletePasswordError
                        ? "border-red-500 bg-gray-50 focus:border-red-500 focus:ring-red-500"
                        : "bg-white"
                    }`}
                  />
                  {deletePasswordError && (
                    <p className="text-sm text-red-600 mt-2">
                      {deletePasswordError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleCancelDelete}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 hover:text-white text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white"
                  disabled={!deletePassword.trim()}
                >
                  Delete Record
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Employee Modal Component */}
        <ViewEmployeeModal
          isOpen={isViewEmployeeModalOpen}
          onCloseAction={() => {
            setIsViewEmployeeModalOpen(false);
            setSelectedEmployeeForView(null);
            setViewEmployeeId(undefined);
          }}
          employee={selectedEmployeeForView ? {
            id: selectedEmployeeForView.id,
            fname: (() => {
              const empAny = selectedEmployeeForView as any;
              if (empAny.fname) return empAny.fname;
              if (selectedEmployeeForView.name) {
                const nameParts = selectedEmployeeForView.name.split(' ');
                return nameParts[0] || '';
              }
              return '';
            })(),
            lname: (() => {
              const empAny = selectedEmployeeForView as any;
              if (empAny.lname) return empAny.lname;
              if (selectedEmployeeForView.name) {
                const nameParts = selectedEmployeeForView.name.split(' ');
                return nameParts.slice(1).join(' ') || '';
              }
              return '';
            })(),
            emp_id: viewEmployeeId || (selectedEmployeeForView as any).employeeId || (selectedEmployeeForView as any).employee_id || (selectedEmployeeForView as any).emp_id || 0,
            email: selectedEmployeeForView.email || '',
            username: (selectedEmployeeForView as any).username || '',
            password: '',
            contact: (selectedEmployeeForView as any).contact || undefined,
            positions: (() => {
              const empAny = selectedEmployeeForView as any;
              const pos = selectedEmployeeForView.position || empAny.positions;
              if (!pos) return null;
              if (typeof pos === 'string') return { name: pos, label: pos };
              if (typeof pos === 'object') return pos;
              return null;
            })(),
            departments: (() => {
              const empAny = selectedEmployeeForView as any;
              const dept = selectedEmployeeForView.department || empAny.departments;
              if (!dept) return null;
              if (typeof dept === 'string') return { name: dept, department_name: dept };
              if (Array.isArray(dept) && dept.length > 0) return dept[0];
              if (typeof dept === 'object') return dept;
              return null;
            })(),
            branches: (() => {
              const empAny = selectedEmployeeForView as any;
              const branch = selectedEmployeeForView.branch || empAny.branches;
              if (!branch) return null;
              if (typeof branch === 'string') return [{ branch_name: branch, name: branch }];
              if (Array.isArray(branch) && branch.length > 0) return branch;
              if (typeof branch === 'object') return [branch];
              return null;
            })(),
            hireDate: (selectedEmployeeForView as any).hireDate || new Date(),
            roles: (() => {
              const empAny = selectedEmployeeForView as any;
              const role = selectedEmployeeForView.role || empAny.roles;
              if (!role) return null;
              if (typeof role === 'string') return [{ name: role }];
              if (Array.isArray(role) && role.length > 0) return role;
              if (typeof role === 'object') return [role];
              return null;
            })(),
            avatar: (selectedEmployeeForView as any).avatar || null,
            bio: (selectedEmployeeForView as any).bio || null,
            is_active: (() => {
              const empAny = selectedEmployeeForView as any;
              const isActive = empAny.is_active || empAny.isActive;
              if (typeof isActive === 'string') return isActive;
              if (typeof isActive === 'boolean') return isActive ? 'active' : 'inactive';
              return 'active';
            })(),
            created_at: (selectedEmployeeForView as any).created_at || new Date().toISOString(),
            updated_at: (selectedEmployeeForView as any).updated_at || undefined,
          } : null}
          designVariant="admin"
          onStartEvaluationAction={(employee: any) => {
            setIsViewEmployeeModalOpen(false);
            
            // Fetch fresh employee data from API to ensure we have latest updates (position, department, role)
            // Handle async operation without making the function async
            apiService.getEmployee(employee.id)
              .then((freshEmployeeData) => {
                // If API returns fresh data, use it; otherwise fall back to cached employee data
                const updatedEmployee: Employee = freshEmployeeData ? {
                  id: freshEmployeeData.id || employee.id,
                  name: freshEmployeeData.name || (freshEmployeeData.fname && freshEmployeeData.lname ? `${freshEmployeeData.fname} ${freshEmployeeData.lname}` : '') || employee.name || '',
                  email: freshEmployeeData.email || employee.email,
                  position: freshEmployeeData.position || employee.position,
                  department: freshEmployeeData.department || employee.department,
                  branch: freshEmployeeData.branch || employee.branch,
                  role: freshEmployeeData.role || freshEmployeeData.roles?.[0]?.name || freshEmployeeData.roles?.[0] || employee.role,
                  ...(freshEmployeeData.avatar || (employee as any).avatar ? { avatar: freshEmployeeData.avatar || (employee as any).avatar } : {}),
                } as Employee : employee;
                
                setSelectedEmployee(updatedEmployee);
                setIsEvaluationTypeModalOpen(true);
              })
              .catch((error) => {
                console.error('Error fetching fresh employee data:', error);
                // Fallback to cached employee data if API call fails
                setSelectedEmployee(employee);
                setIsEvaluationTypeModalOpen(true);
              });
          }}
          onViewSubmissionAction={(submission: any) => {
            setSelectedSubmission(submission);
            setIsViewSubmissionModalOpen(true);
          }}
        />

        {/* Guide modal is now handled in DashboardShell */}
      </PageTransition>
    </>
  );
}

// Wrap with HOC for authentication (evaluator or manager role)
export default withAuth(EvaluatorDashboard, {
  requiredRole: ["evaluator", "manager"],
});
