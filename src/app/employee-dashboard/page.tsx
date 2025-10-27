"use client";

import { useState, useEffect } from "react";
import { Eye, Trash, Calendar, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardShell from "@/components/DashboardShell";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/UserContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  getQuarterFromEvaluationData,
  getQuarterColor,
} from "@/lib/quarterUtils";
import ViewResultsModal from "@/components/evaluation/ViewResultsModal";
import EvaluationDetailsModal from "@/components/EvaluationDetailsModal";
// CommentDetailModal import removed
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import clientDataService from "@/lib/clientDataService";
import {
  getEmployeeResults,
  initializeMockData,
} from "@/lib/evaluationStorage";
// commentsService import removed
import accountsData from "@/data/accounts.json";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/useToast";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { success, error } = useToast();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize activeTab from URL parameter or default to 'overview'
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "overview");

  // Individual loading states for each tab content
  const [isRefreshingReviews, setIsRefreshingReviews] = useState(false);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);
  const [isRefreshingAccountHistory, setIsRefreshingAccountHistory] =
    useState(false);
  const [isRefreshingQuarterly, setIsRefreshingQuarterly] = useState(false);
  const [isRefreshingOverview, setIsRefreshingOverview] = useState(false);

  // Refreshing dialog state
  const [showRefreshingDialog, setShowRefreshingDialog] = useState(false);
  const [refreshingMessage, setRefreshingMessage] = useState("");

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<any[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [isViewResultsModalOpen, setIsViewResultsModalOpen] = useState(false);
  const [isEvaluationDetailsModalOpen, setIsEvaluationDetailsModalOpen] =
    useState(false);
  const [modalOpenedFromTab, setModalOpenedFromTab] = useState<string>("");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [quarterlySearchTerm, setQuarterlySearchTerm] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("");
  const [accountHistory, setAccountHistory] = useState<any[]>([]);
  const [accountHistorySearchTerm, setAccountHistorySearchTerm] = useState("");
  const [overviewSearchTerm, setOverviewSearchTerm] = useState("");
  // Comments & feedback functionality removed

  // Date filtering states for quarterly performance
  const [dateFilter, setDateFilter] = useState<{ from?: Date; to?: Date }>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Logout confirmation states
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

  // Success animation states for various actions
  const [showViewSuccess, setShowViewSuccess] = useState(false);

  // Delete evaluation states
  const [isDeleteEvaluationDialogOpen, setIsDeleteEvaluationDialogOpen] =
    useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<any>(null);
  const [isDeletingEvaluation, setIsDeletingEvaluation] = useState(false);
  const [
    showDeleteEvaluationSuccessDialog,
    setShowDeleteEvaluationSuccessDialog,
  ] = useState(false);

  // Password validation for deletion
  const [deletePassword, setDeletePassword] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showIncorrectPasswordDialog, setShowIncorrectPasswordDialog] =
    useState(false);
  const [isDialogClosing, setIsDialogClosing] = useState(false);

  // Approval states
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [evaluationToApprove, setEvaluationToApprove] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(false);
  const [approvedEvaluations, setApprovedEvaluations] = useState<Set<string>>(
    new Set()
  );
  const [employeeApprovalName, setEmployeeApprovalName] = useState("");

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "reviews", label: "Performance Reviews", icon: "📝" },
    { id: "history", label: "Evaluation History", icon: "📈" },
    { id: "account-history", label: "Account History", icon: "📋" },
  ];

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

  // Enhanced highlighting system with approval status
  const getSubmissionHighlight = (
    submittedAt: string,
    allSubmissions: any[] = [],
    submissionId?: string
  ) => {
    // Check if this submission is approved first
    if (submissionId && isEvaluationApproved(submissionId)) {
      return {
        className:
          "bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100",
        badge: { text: "Approved", className: "bg-green-200 text-green-800" },
        priority: "approved",
      };
    }

    // Sort all submissions by date (most recent first)
    const sortedSubmissions = [...allSubmissions].sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    // Find the position of current submission in the sorted list
    const currentIndex = sortedSubmissions.findIndex(
      (sub) => sub.submittedAt === submittedAt
    );

    if (currentIndex === 0) {
      // Most recent submission - YELLOW "New"
      return {
        className:
          "bg-yellow-100 border-l-4 border-l-yellow-500 hover:bg-yellow-200",
        badge: { text: "New", className: "bg-yellow-200 text-yellow-800" },
        priority: "new",
      };
    } else if (currentIndex === 1) {
      // Second most recent - BLUE "Recent"
      return {
        className: "bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100",
        badge: { text: "Recent", className: "bg-blue-100 text-blue-800" },
        priority: "recent",
      };
    } else {
      // Older submissions - No special highlighting
      return {
        className: "hover:bg-gray-50",
        badge: null,
        priority: "old",
      };
    }
  };

  // Legacy function for backward compatibility
  const isNewSubmission = (submittedAt: string) => {
    const highlight = getSubmissionHighlight(submittedAt, submissions);
    return highlight.priority === "new" || highlight.priority === "recent";
  };

  // Function to load account history (suspension records only)
  const loadAccountHistory = (email: string) => {
    try {
      // Load only suspended employees data (violations/suspensions)
      const suspendedEmployees = JSON.parse(
        localStorage.getItem("suspendedEmployees") || "[]"
      );
      const employeeViolations = suspendedEmployees.filter(
        (emp: any) => emp.email === email
      );

      // Format only suspension/violation records
      const history = employeeViolations.map((violation: any) => ({
        id: `violation-${violation.id}`,
        type: "violation",
        title: "Policy Violation",
        description: violation.suspensionReason,
        date: violation.suspensionDate,
        status: violation.status,
        severity: "high",
        actionBy: violation.suspendedBy,
        details: {
          duration: violation.suspensionDuration,
          reinstatedDate: violation.reinstatedDate,
          reinstatedBy: violation.reinstatedBy,
        },
      }));

      // Sort by date (newest first)
      return history.sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error("Error loading account history:", error);
      return [];
    }
  };

  // Function to determine highlighting for account history items
  const getAccountHistoryHighlight = (item: any) => {
    if (item.type === "violation") {
      return "bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100";
    }
    return "hover:bg-gray-50"; // Default or no highlight
  };

  // Comments & feedback functionality removed

  // Function to validate password for deletion
  const validateDeletePassword = (password: string) => {
    // Validate against the current user's actual password from accounts.json
    if (!user || !user.email) {
      setIsPasswordValid(false);
      setPasswordError("User not found. Please try again.");
      setShowIncorrectPasswordDialog(true);

      // Start pop-down animation after 1 second, then close after 1.3 seconds
      setTimeout(() => {
        setIsDialogClosing(true);
      }, 1000);

      setTimeout(() => {
        setShowIncorrectPasswordDialog(false);
        setDeletePassword("");
        setPasswordError("");
        setIsDialogClosing(false);
      }, 1300);

      return false;
    }

    // Find user account in accounts data
    const userAccount = accountsData.accounts.find(
      (account: any) => account.email === user.email
    );

    if (!userAccount) {
      setIsPasswordValid(false);
      setPasswordError("User account not found. Please try again.");
      setShowIncorrectPasswordDialog(true);

      setTimeout(() => {
        setIsDialogClosing(true);
      }, 1000);

      setTimeout(() => {
        setShowIncorrectPasswordDialog(false);
        setDeletePassword("");
        setPasswordError("");
        setIsDialogClosing(false);
      }, 1300);

      return false;
    }

    if (password === userAccount.password) {
      setIsPasswordValid(true);
      setPasswordError("");
      return true;
    } else {
      setIsPasswordValid(false);
      setPasswordError("Incorrect password. Please try again.");
      setShowIncorrectPasswordDialog(true);

      // Start pop-down animation after 1 second, then close after 1.3 seconds
      setTimeout(() => {
        setIsDialogClosing(true);
      }, 1000);

      setTimeout(() => {
        setShowIncorrectPasswordDialog(false);
        setDeletePassword("");
        setPasswordError("");
        setIsDialogClosing(false);
      }, 1300);

      return false;
    }
  };

  // Delete evaluation function
  const handleDeleteEvaluation = async () => {
    if (!evaluationToDelete) return;

    // Validate password before proceeding
    if (!validateDeletePassword(deletePassword)) {
      return;
    }

    setIsDeletingEvaluation(true);

    // Simulate a small delay for the loading animation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      // Remove the evaluation from submissions
      const updatedSubmissions = submissions.filter(
        (submission) => submission.id !== evaluationToDelete.id
      );
      setSubmissions(updatedSubmissions);

      // Also remove from evaluation results if it exists there
      const updatedResults = evaluationResults.filter(
        (result) => result.id !== evaluationToDelete.id
      );
      setEvaluationResults(updatedResults);

      // Reset password validation states
      setDeletePassword("");
      setIsPasswordValid(false);
      setPasswordError("");

      // Finish and close confirm dialog, then show success dialog
      setIsDeletingEvaluation(false);
      setIsDeleteEvaluationDialogOpen(false);
      setEvaluationToDelete(null);
      setShowDeleteEvaluationSuccessDialog(true);

      // Auto-close success dialog after a short delay
      setTimeout(() => {
        setShowDeleteEvaluationSuccessDialog(false);
      }, 1400);
    } catch (error) {
      console.error("Error deleting evaluation:", error);
      setIsDeletingEvaluation(false);
    }
  };

  // Helper functions for account history
  const getFilteredAccountHistory = () => {
    if (!accountHistorySearchTerm) return accountHistory;

    return accountHistory.filter(
      (item) =>
        item.title
          .toLowerCase()
          .includes(accountHistorySearchTerm.toLowerCase()) ||
        item.description
          .toLowerCase()
          .includes(accountHistorySearchTerm.toLowerCase()) ||
        item.actionBy
          .toLowerCase()
          .includes(accountHistorySearchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(accountHistorySearchTerm.toLowerCase())
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "violation":
        return "⚠️";
      case "feedback":
        return "💬";
      default:
        return "📝";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "suspended":
        return "bg-red-100 text-red-800";
      case "reinstated":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    const loadEmployeeData = async () => {
      try {
        // Initialize mock data on first load (now empty)
        initializeMockData();

        // Migrate old notification URLs from reviews tab to overview tab
        await clientDataService.migrateNotificationUrls();

        // Use the comprehensive refresh function to load all data with modal
        await refreshDashboardData(false, true, true);

        // Load approved evaluations
        if (user?.email) {
          const approvedData = localStorage.getItem(
            `approvedEvaluations_${user.email}`
          );
          if (approvedData) {
            setApprovedEvaluations(new Set(JSON.parse(approvedData)));
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading employee data:", error);
        setLoading(false);
      }
    };

    // Always try to load data, let ProtectedRoute handle authentication
    if (user) {
      loadEmployeeData();
    } else {
      // If no user, still stop loading to prevent infinite loading
      setLoading(false);
    }
  }, [user]);

  // Handle URL parameter changes for tab navigation
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Loading timeout reached, forcing loading to false");
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);

    // Auto-refresh data when switching to specific tabs with targeted loading states
    if (tabId === "history") {
      setIsRefreshingHistory(true);
      await handleRefreshHistory();
      // Keep skeleton visible for a bit longer when switching tabs
      setTimeout(() => {
        setIsRefreshingHistory(false);
      }, 1000);
    } else if (tabId === "reviews") {
      setIsRefreshingReviews(true);
      await handleRefreshSubmissions();
      // Keep skeleton visible for a bit longer when switching tabs
      setTimeout(() => {
        setIsRefreshingReviews(false);
      }, 1000);
    } else if (tabId === "account-history") {
      await handleRefreshAccountHistory();
    } else if (tabId === "overview") {
      // For overview tab, show skeleton loading
      setIsRefreshingOverview(true);
      setTimeout(() => {
        setIsRefreshingOverview(false);
      }, 1000);
    }
  };

  // Handle refresh modal completion

  // Comprehensive refresh function for all dashboard data
  const refreshDashboardData = async (
    showToast = true,
    showModal = false,
    isInitialLoad = false
  ) => {
    try {
      if (user?.email) {
        // Fetch fresh submissions data
        const allSubmissions = await clientDataService.getSubmissions();
        const userSubmissions = allSubmissions.filter(
          (submission: any) =>
            submission.employeeName === user.full_name ||
            submission.evaluationData?.employeeEmail === user.email
        );
        const finalSubmissions =
          userSubmissions.length > 0 ? userSubmissions : allSubmissions;
        setSubmissions(finalSubmissions);

        // Refresh evaluation results
        const results = getEmployeeResults(user.email);
        setEvaluationResults(results);

        // Refresh account history
        const history = loadAccountHistory(user.email);
        setAccountHistory(history);

        // Comments functionality removed
      }
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
    } finally {
      // Show appropriate success message
      if (showToast) {
        const message = isInitialLoad
          ? "Dashboard loaded successfully!"
          : "Dashboard refreshed successfully!";
        success(message, "All your data has been updated");
      }
    }
  };

  // Auto-refresh functionality using shared hook
  const {
    showRefreshModal,
    refreshModalMessage,
    handleRefreshModalComplete,
    refreshDashboardData: autoRefreshDashboardData,
  } = useAutoRefresh({
    refreshFunction: refreshDashboardData,
    dashboardName: "Employee Dashboard",
    customMessage: "Welcome back! Refreshing your employee dashboard data...",
  });

  // Real-time data updates via localStorage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only refresh if the change is from another tab/window
      if (e.key === "submissions" && e.newValue !== e.oldValue) {
        handleRefreshSubmissions();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Refresh function for Account History table only
  const handleRefreshAccountHistory = async () => {
    setIsRefreshing(true);
    setIsRefreshingAccountHistory(true);
    setRefreshingMessage("Refreshing account history...");
    setShowRefreshingDialog(true);
    try {
      if (user?.email) {
        // Add a small delay to simulate loading
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Load only account history data
        const history = loadAccountHistory(user.email);
        setAccountHistory(history);

        // Show success toast
        success(
          "Account history refreshed successfully",
          "All account records have been updated"
        );
      }
    } catch (error) {
      console.error("Error refreshing account history:", error);
    } finally {
      setIsRefreshing(false);
      setIsRefreshingAccountHistory(false);
      setShowRefreshingDialog(false);
    }
  };

  // Comments refresh functionality removed

  // Refresh function for Performance Reviews (submissions) only
  const handleRefreshSubmissions = async () => {
    setIsRefreshing(true);
    setIsRefreshingReviews(true);
    setIsRefreshingOverview(true);
    setRefreshingMessage("Refreshing performance reviews...");
    setShowRefreshingDialog(true);
    try {
      // Add a small delay to simulate loading
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Fetch submissions data using client data service
      try {
        const allSubmissions = await clientDataService.getSubmissions();
        // Filter submissions to only show current user's data
        const userSubmissions = user?.email
          ? allSubmissions.filter(
              (submission: any) =>
                submission.employeeName === user.full_name ||
                submission.evaluationData?.employeeEmail === user.email
            )
          : [];

        // If no user-specific submissions found, show all submissions for testing
        const finalSubmissions =
          userSubmissions.length > 0 ? userSubmissions : allSubmissions;
        setSubmissions(finalSubmissions);

        // Show success toast
        success(
          "Performance reviews refreshed successfully",
          "All performance data has been updated"
        );
      } catch (error) {}
    } catch (error) {
      console.error("Error refreshing submissions:", error);
    } finally {
      setIsRefreshing(false);
      setIsRefreshingReviews(false);
      setIsRefreshingOverview(false);
      setShowRefreshingDialog(false);
    }
  };

  // Clear date filter function
  const clearDateFilter = () => {
    setDateFilter({});
  };

  // Refresh function for Quarterly Performance table
  const handleRefreshQuarterly = async () => {
    setIsRefreshing(true);
    setIsRefreshingQuarterly(true);
    setRefreshingMessage("Refreshing quarterly performance...");
    setShowRefreshingDialog(true);
    try {
      if (user?.email) {
        // Add a small delay to simulate loading
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Reload evaluation results which are used for quarterly performance
        const results = getEmployeeResults(user.email);
        setEvaluationResults(results);

        // Show success toast
        success(
          "Quarterly performance refreshed successfully",
          "All quarterly data has been updated"
        );
      }
    } catch (error) {
      console.error("Error refreshing quarterly performance:", error);
    } finally {
      setIsRefreshing(false);
      setIsRefreshingQuarterly(false);
      setShowRefreshingDialog(false);
    }
  };

  // Refresh function for Evaluation History table
  const handleRefreshHistory = async () => {
    setIsRefreshing(true);
    setIsRefreshingHistory(true);
    setRefreshingMessage("Refreshing evaluation history...");
    setShowRefreshingDialog(true);

    try {
      if (user?.email) {
        // Add a small delay to simulate loading
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Reload evaluation results which are used for evaluation history
        const results = getEmployeeResults(user.email);
        setEvaluationResults(results);

        // Show success toast
        success(
          "Evaluation history refreshed successfully",
          "All evaluation records have been updated"
        );
      }
    } catch (error) {
      console.error("Error refreshing evaluation history:", error);
    } finally {
      setIsRefreshing(false);
      setIsRefreshingHistory(false);
      setShowRefreshingDialog(false);
    }
  };

  const handleViewDetails = (id: string | number) => {
    const evaluation = evaluationResults.find((result) => result.id === id);
    if (evaluation) {
      // Get approval data for this evaluation
      const approvalData = getApprovalData(evaluation.id);

      // Convert evaluation result to submission format for ViewResultsModal
      const submission = {
        id: evaluation.id,
        employeeName: evaluation.employeeName,
        category: "Performance Review",
        rating: evaluation.overallRating,
        submittedAt: evaluation.submittedAt,
        status: evaluation.status,
        evaluator: evaluation.evaluatorName,
        evaluationData: evaluation.evaluationData,
        // Include approval data in the submission object
        employeeSignature: approvalData?.employeeSignature || null,
        employeeApprovedAt: approvalData?.approvedAt || null,
      };
      setSelectedEvaluation(submission);
      setIsViewResultsModalOpen(true);
    }
  };

  // Approval functions
  const handleApproveEvaluation = (submissionOrId: any) => {
    let submission;

    if (typeof submissionOrId === "string") {
      // If it's a string ID, find the submission from the submissions array
      submission = submissions.find(
        (sub) => sub.id.toString() === submissionOrId
      );
      if (!submission) {
        // Fallback to selectedEvaluation if not found in submissions
        submission = selectedEvaluation;
      }
    } else {
      // If it's an object, use it directly
      submission = submissionOrId;
    }

    if (!submission) {
      console.error("❌ Cannot approve: no submission found");
      return;
    }

    if (!submission.id) {
      console.error("❌ Cannot approve: submission has no id property");
      return;
    }

    setEvaluationToApprove(submission);
    setEmployeeApprovalName(user?.full_name || user?.full_name || "");
    setIsApprovalDialogOpen(true);
  };

  // Function to update the submissions data with employee signature
  const updateSubmissionWithEmployeeSignature = async (
    evaluationId: number,
    employeeSignature: string
  ) => {
    try {
      // Get current submissions from localStorage
      const currentSubmissions = JSON.parse(
        localStorage.getItem("submissions") || "[]"
      );

      // Find and update the specific submission
      const updatedSubmissions = currentSubmissions.map((submission: any) => {
        if (submission.id === evaluationId) {
          return {
            ...submission,
            employeeSignature: employeeSignature,
            employeeApprovedAt: new Date().toISOString(),
            approvalStatus: "employee_approved",
          };
        }
        return submission;
      });

      // Save back to localStorage
      localStorage.setItem("submissions", JSON.stringify(updatedSubmissions));
    } catch (error) {
      console.error(
        "Error updating submission with employee signature:",
        error
      );
    }
  };

  const confirmApproval = async () => {
    if (!evaluationToApprove || !user?.email) return;

    // Check if user has a signature
    const employeeSignature = user.signature || user?.signature || "";

    if (!employeeSignature) {
      error(
        "No Signature Found",
        "Please add a signature to your user before approving evaluations. Go to your user settings to add a signature."
      );
      return;
    }

    setIsApproving(true);

    try {
      const approvalData = {
        id: evaluationToApprove.id,
        approvedAt: new Date().toISOString(),
        employeeSignature: employeeSignature,
        employeeName:
          employeeApprovalName || user.full_name || user?.full_name || "",
        employeeEmail: user.email || user?.email || "",
      };

      // Add to approved evaluations with full approval data
      const newApproved = new Set(approvedEvaluations);
      newApproved.add(evaluationToApprove.id);
      setApprovedEvaluations(newApproved);

      // Save approval data to localStorage
      const existingApprovals = JSON.parse(
        localStorage.getItem(`approvalData_${user.email}`) || "{}"
      );
      // Ensure we use the correct submission ID as the key
      const submissionId = evaluationToApprove.id?.toString() || "";
      if (!submissionId) {
        console.error(
          "❌ Cannot save approval: evaluationToApprove.id is undefined"
        );
        return;
      }
      existingApprovals[submissionId] = approvalData;
      localStorage.setItem(
        `approvalData_${user.email}`,
        JSON.stringify(existingApprovals)
      );

      // Also save the approved IDs list
      localStorage.setItem(
        `approvedEvaluations_${user.email}`,
        JSON.stringify([...newApproved])
      );

      // CRITICAL: Update the main submissions data so evaluator can see the signature
      await updateSubmissionWithEmployeeSignature(
        evaluationToApprove.id,
        employeeSignature
      );

      // Show success animation
      setIsApproving(false);
      setShowApprovalSuccess(true);

      // Close dialog after success animation
      setTimeout(() => {
        setIsApprovalDialogOpen(false);
        setShowApprovalSuccess(false);
        setEvaluationToApprove(null);
        success(
          "Evaluation Approved!",
          "You have successfully acknowledged this evaluation with your signature."
        );

        // Refresh the evaluation history to show the signature
        handleRefreshHistory();
      }, 1500);
    } catch (error) {
      console.error("Error approving evaluation:", error);
      setIsApproving(false);
    }
  };

  const isEvaluationApproved = (submissionId: string) => {
    return approvedEvaluations.has(submissionId);
  };

  const getApprovalData = (submissionId: string) => {
    if (!user?.email) return null;
    const approvalData = JSON.parse(
      localStorage.getItem(`approvalData_${user.email}`) || "{}"
    );
    // Ensure we use the correct submission ID format (convert to string)
    const key = submissionId.toString();
    const data = approvalData[key] || null;

    return data;
  };

  const handleLogout = () => {
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);

    // Simulate a small delay for the loading animation
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Show success animation
    setIsLoggingOut(false);
    setShowLogoutSuccess(true);

    // Close dialog and logout after success animation
    setTimeout(() => {
      setIsLogoutDialogOpen(false);
      setShowLogoutSuccess(false);
      // Use the UserContext logout which includes loading screen
      logout();
    }, 1500);
  };

  // Calculate overall rating using the same formula as ViewResultsModal
  const calculateOverallRating = (evaluationData: any) => {
    if (!evaluationData) return 0;

    const calculateScore = (scores: string[]) => {
      const validScores = scores
        .filter((score) => score && score !== "")
        .map((score) => parseFloat(score));
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

    return Math.round(overallWeightedScore * 10) / 10;
  };

  // Loading state is now handled in the main return statement

  const topSummary = (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Overall Rating
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || isRefreshingOverview ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-bold text-gray-900">4.2</span>
                <span className="text-sm text-gray-500">/ 5.0</span>
              </div>
              <Badge className="mt-2 text-green-600 bg-green-100">Good</Badge>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Reviews Received
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || isRefreshingOverview ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-20" />
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-gray-900">3</div>
              <p className="text-sm text-gray-500 mt-1">This quarter</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Evaluation Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || isRefreshingOverview ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-blue-600">
                {submissions.length > 0
                  ? submissions[0].evaluationData
                    ? calculateOverallRating(
                        submissions[0].evaluationData
                      ).toFixed(1)
                    : submissions[0].rating?.toFixed(1) || "0.0"
                  : "0.0"}
                /5.0
              </div>
              <p className="text-sm text-gray-500 mt-1">Latest evaluation</p>
              <div className="mt-2">
                <Badge
                  className={`text-xs ${
                    submissions.length > 0
                      ? (() => {
                          const score = submissions[0].evaluationData
                            ? calculateOverallRating(
                                submissions[0].evaluationData
                              )
                            : submissions[0].rating || 0;
                          if (score >= 4.5)
                            return "bg-green-100 text-green-800";
                          if (score >= 4.0) return "bg-blue-100 text-blue-800";
                          if (score >= 3.5)
                            return "bg-yellow-100 text-yellow-800";
                          return "bg-red-100 text-red-800";
                        })()
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {submissions.length > 0
                    ? (() => {
                        const score = submissions[0].evaluationData
                          ? calculateOverallRating(
                              submissions[0].evaluationData
                            )
                          : submissions[0].rating || 0;
                        if (score >= 4.5) return "Outstanding";
                        if (score >= 4.0) return "Exceeds Expectations";
                        if (score >= 3.5) return "Meets Expectations";
                        return "Needs Improvement";
                      })()
                    : "No Data"}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Performance Rating
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || isRefreshingOverview ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center space-x-1">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20 ml-1" />
              </div>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-orange-600">
                {(() => {
                  if (submissions.length === 0) return "0.0";

                  const totalScore = submissions.reduce((sum, submission) => {
                    const score = submission.evaluationData
                      ? calculateOverallRating(submission.evaluationData)
                      : submission.rating || 0;
                    return sum + score;
                  }, 0);

                  return (totalScore / submissions.length).toFixed(1);
                })()}
                /5.0
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Average across all evaluations
              </p>
              <div className="mt-2 flex items-center space-x-1">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${(() => {
                        const avgRating =
                          submissions.length > 0
                            ? submissions.reduce((sum, submission) => {
                                const score = submission.evaluationData
                                  ? calculateOverallRating(
                                      submission.evaluationData
                                    )
                                  : submission.rating || 0;
                                return sum + score;
                              }, 0) / submissions.length
                            : 0;
                        return star <= avgRating
                          ? "text-yellow-400"
                          : "text-gray-300";
                      })()}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-gray-600 ml-1">
                  {submissions.length > 0
                    ? `${submissions.length} review${
                        submissions.length !== 1 ? "s" : ""
                      }`
                    : "No reviews"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <>
            {/* Performance Reviews */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Recent Performance Reviews</CardTitle>
                    <CardDescription>
                      Your latest performance evaluations
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshSubmissions}
                    disabled={isRefreshingOverview}
                    className="flex items-center space-x-2 bg-blue-500 text-white hover:bg-green-700 hover:text-white"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Refresh</span>
                  </Button>
                </div>

                {/* Search Bar */}
                <div className="mt-4 relative w-1/5">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <Input
                    type="text"
                    placeholder="Search by supervisor, rating, date, quarter..."
                    value={overviewSearchTerm}
                    onChange={(e) => setOverviewSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {overviewSearchTerm && (
                    <button
                      onClick={() => setOverviewSearchTerm("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5 text-lg" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Refreshing Dialog for Performance Reviews */}
                {showRefreshingDialog && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">
                          Refreshing...
                        </h4>
                        <p className="text-xs text-blue-700">
                          {refreshingMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isRefreshingOverview || loading ? (
                  <div className="space-y-2">
                    {/* Table Header Skeleton */}
                    <div className="flex space-x-3 py-2 border-b">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-10" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>

                    {/* Table Rows Skeleton */}
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center space-x-3 py-2 border-b"
                      >
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-8" />
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-12" />
                      </div>
                    ))}
                  </div>
                ) : (
                  (() => {
                    // Filter submissions based on search term
                    const filteredSubmissions = submissions.filter(
                      (submission) => {
                        if (!overviewSearchTerm) return true;

                        const searchLower = overviewSearchTerm.toLowerCase();
                        const supervisor = (
                          submission.evaluationData?.supervisor ||
                          "not specified"
                        ).toLowerCase();
                        const rating = submission.evaluationData
                          ? calculateOverallRating(
                              submission.evaluationData
                            ).toString()
                          : submission.rating.toString();
                        const date = new Date(submission.submittedAt)
                          .toLocaleDateString()
                          .toLowerCase();
                        const quarter = getQuarterFromEvaluationData(
                          submission.evaluationData || submission
                        ).toLowerCase();
                        const acknowledgement = isEvaluationApproved(
                          submission.id
                        )
                          ? "approved"
                          : "pending";

                        return (
                          supervisor.includes(searchLower) ||
                          rating.includes(searchLower) ||
                          date.includes(searchLower) ||
                          quarter.includes(searchLower) ||
                          acknowledgement.includes(searchLower)
                        );
                      }
                    );

                    // Check if we have any submissions and filtered results
                    if (submissions.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <div className="text-gray-500 text-lg mb-2">
                            No performance reviews yet
                          </div>
                          <div className="text-gray-400 text-sm">
                            Your evaluations will appear here once they are
                            completed by your manager.
                          </div>
                        </div>
                      );
                    }

                    if (filteredSubmissions.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <div className="text-gray-500 text-lg mb-2">
                            No results found
                          </div>
                          <div className="text-gray-400 text-sm mb-4">
                            No performance reviews match "{overviewSearchTerm}"
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOverviewSearchTerm("")}
                            className="text-white hover:text-white bg-blue-500 hover:bg-blue-600"
                          >
                            Clear search
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Search Results Count */}
                        {overviewSearchTerm && (
                          <div className="mb-3 mx-4 text-sm text-gray-600">
                            Found{" "}
                            <span className="font-semibold text-blue-600">
                              {filteredSubmissions.length}
                            </span>{" "}
                            result{filteredSubmissions.length !== 1 ? "s" : ""}{" "}
                            for "{overviewSearchTerm}"
                          </div>
                        )}

                        {/* Simple Legend */}
                        <div className="mb-3 mx-4 flex flex-wrap gap-4 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
                            <Badge className="bg-green-200 text-green-800 text-xs">
                              Approved
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-yellow-100 border-l-2 border-l-yellow-500 rounded"></div>
                            <Badge className="bg-yellow-200 text-yellow-800 text-xs">
                              New
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-50 border-l-2 border-l-blue-500 rounded"></div>
                            <Badge className="bg-blue-300 text-blue-800 text-xs">
                              Recent
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge className="text-white bg-orange-500 text-xs">
                              Pending
                            </Badge>
                          </div>
                        </div>

                        <div className="max-h-[350px] md:max-h-[500px] lg:max-h-[700px] xl:max-h-[750px] overflow-y-auto overflow-x-auto scrollable-table mx-4">
                          <Table>
                            <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
                              <TableRow>
                                <TableHead>Immediate Supervisor</TableHead>
                                <TableHead className="text-right">
                                  Rating
                                </TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Quarter</TableHead>
                                <TableHead>Acknowledgement</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredSubmissions
                                .sort(
                                  (a, b) =>
                                    new Date(b.submittedAt).getTime() -
                                    new Date(a.submittedAt).getTime()
                                )
                                .map((submission) => {
                                  const highlight = getSubmissionHighlight(
                                    submission.submittedAt,
                                    submissions,
                                    submission.id
                                  );
                                  return (
                                    <TableRow
                                      key={submission.id}
                                      className={highlight.className}
                                    >
                                      <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                          {submission.evaluationData
                                            ?.supervisor || "Not specified"}
                                          {highlight.badge && (
                                            <Badge
                                              variant="secondary"
                                              className={`${highlight.badge.className} text-xs`}
                                            >
                                              {highlight.badge.text}
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right font-semibold">
                                        {submission.evaluationData
                                          ? calculateOverallRating(
                                              submission.evaluationData
                                            )
                                          : submission.rating}
                                        /5
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {new Date(
                                              submission.submittedAt
                                            ).toLocaleDateString()}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {getTimeAgo(submission.submittedAt)}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          className={getQuarterColor(
                                            getQuarterFromEvaluationData(
                                              submission.evaluationData ||
                                                submission
                                            )
                                          )}
                                        >
                                          {getQuarterFromEvaluationData(
                                            submission.evaluationData ||
                                              submission
                                          )}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {isEvaluationApproved(submission.id) ? (
                                          <div className="flex items-center space-x-3">
                                            <Badge className="bg-green-100 text-green-800">
                                              ✓ Approved
                                            </Badge>
                                            {(() => {
                                              const approvalData =
                                                getApprovalData(submission.id);
                                              return approvalData?.employeeSignature ? (
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-xs text-gray-500">
                                                    Signature:
                                                  </span>
                                                  <div className="text-center">
                                                    {/* Signature area */}
                                                    <div className="h-6 border-b border-gray-300 flex items-center justify-center">
                                                      <img
                                                        src={
                                                          approvalData.employeeSignature
                                                        }
                                                        alt="Employee Signature"
                                                        className="h-4 max-w-full object-contain"
                                                      />
                                                    </div>
                                                    {/* Printed Name */}
                                                    <p className="text-xs font-medium text-gray-900 mt-1">
                                                      {approvalData.employeeName ||
                                                        "Employee"}
                                                    </p>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="text-xs text-gray-400">
                                                  {approvalData
                                                    ? "No signature"
                                                    : "No approval data"}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        ) : (
                                          <Badge className="text-white bg-orange-500 border-orange-300">
                                            Pending
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right bg-">
                                        <Button
                                          className="bg-blue-500 text-white hover:bg-green-700 hover:text-white"
                                          size="sm"
                                          onClick={() => {
                                            // Get approval data for this submission
                                            const approvalData =
                                              getApprovalData(submission.id);

                                            // Include approval data in the submission object
                                            const submissionWithApproval = {
                                              ...submission,
                                              employeeSignature:
                                                approvalData?.employeeSignature ||
                                                null,
                                              employeeApprovedAt:
                                                approvalData?.approvedAt ||
                                                null,
                                            };

                                            setSelectedEvaluation(
                                              submissionWithApproval
                                            );
                                            setModalOpenedFromTab("overview");
                                            setIsViewResultsModalOpen(true);
                                            // Show success animation
                                            setShowViewSuccess(true);
                                            setTimeout(
                                              () => setShowViewSuccess(false),
                                              2000
                                            );
                                          }}
                                        >
                                          <Eye className="w-4 h-4" />
                                          View
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </>
        );

      case "reviews":
        return (
          <div className="relative h-[calc(100vh-200px)] overflow-y-auto">
            {isRefreshingReviews || loading ? (
              <div className="space-y-6">
                {/* Performance Analytics Skeleton */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                  <Card className="h-fit">
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-64 w-full" />
                    </CardContent>
                  </Card>
                  <Card className="h-fit">
                    <CardHeader>
                      <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Reviews Table Skeleton */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Performance Analytics Section */}
                {submissions.length > 0 && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Performance Trend Chart */}
                    <Card className="h-fit">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          📈 Performance Trend
                        </CardTitle>
                        <CardDescription>
                          Your rating progression over time
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          // Prepare chart data from submissions
                          const chartData = submissions
                            .filter(
                              (s) =>
                                (s.evaluationData
                                  ? calculateOverallRating(s.evaluationData)
                                  : s.rating) > 0
                            )
                            .map((submission, index) => ({
                              review: `Review ${submissions.length - index}`,
                              rating: submission.evaluationData
                                ? calculateOverallRating(
                                    submission.evaluationData
                                  )
                                : submission.rating,
                              date: new Date(
                                submission.submittedAt
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              }),
                              fullDate: new Date(
                                submission.submittedAt
                              ).toLocaleDateString(),
                            }))
                            .reverse(); // Show oldest to newest

                          const chartConfig = {
                            rating: {
                              label: "Rating",
                              color: "hsl(var(--chart-1))",
                            },
                          };

                          if (chartData.length === 0) {
                            return (
                              <div className="h-64 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-4xl mb-2">📊</div>
                                  <div className="text-sm text-gray-500">
                                    No data available
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    Complete your first evaluation to see trends
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="h-80">
                              <ChartContainer config={chartConfig}>
                                <LineChart
                                  data={chartData}
                                  margin={{
                                    left: 20,
                                    right: 20,
                                    top: 20,
                                    bottom: 60,
                                  }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="2 2"
                                    stroke="#e5e7eb"
                                    opacity={0.3}
                                  />
                                  <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={16}
                                    tick={{ fontSize: 11, fill: "#6b7280" }}
                                    tickFormatter={(value) => value}
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                  />
                                  <YAxis
                                    domain={[0, 5]}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={12}
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                    tickFormatter={(value) => `${value}.0`}
                                    ticks={[0, 1, 2, 3, 4, 5]}
                                  />
                                  <ChartTooltip
                                    cursor={{
                                      stroke: "#3b82f6",
                                      strokeWidth: 1,
                                      strokeDasharray: "3 3",
                                    }}
                                    content={
                                      <ChartTooltipContent
                                        formatter={(value, name) => [
                                          `${value}/5.0`,
                                          "Rating",
                                        ]}
                                        labelFormatter={(label, payload) => {
                                          if (payload && payload[0]) {
                                            return payload[0].payload.review;
                                          }
                                          return label;
                                        }}
                                        className="bg-white border border-gray-200 shadow-lg rounded-lg"
                                      />
                                    }
                                  />
                                  <Line
                                    dataKey="rating"
                                    type="monotone"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{
                                      fill: "#3b82f6",
                                      stroke: "#ffffff",
                                      strokeWidth: 2,
                                      r: 5,
                                    }}
                                    activeDot={{
                                      r: 7,
                                      stroke: "#3b82f6",
                                      strokeWidth: 2,
                                      fill: "#ffffff",
                                    }}
                                  />
                                </LineChart>
                              </ChartContainer>
                            </div>
                          );
                        })()}

                        {/* Chart Legend and Info */}
                        <div className="mt-6 px-4 py-3 bg-gray-50 rounded-lg border">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0"></div>
                              <span className="text-sm font-medium text-gray-700">
                                Performance Rating Trend
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-md border">
                              <span className="font-medium">
                                {
                                  submissions.filter(
                                    (s) =>
                                      (s.evaluationData
                                        ? calculateOverallRating(
                                            s.evaluationData
                                          )
                                        : s.rating) > 0
                                  ).length
                                }
                              </span>{" "}
                              evaluation
                              {submissions.filter(
                                (s) =>
                                  (s.evaluationData
                                    ? calculateOverallRating(s.evaluationData)
                                    : s.rating) > 0
                              ).length !== 1
                                ? "s"
                                : ""}{" "}
                              tracked
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Performance Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          📊 Performance Summary
                        </CardTitle>
                        <CardDescription>
                          Your overall performance insights
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(() => {
                          const ratings = submissions
                            .map((s) =>
                              s.evaluationData
                                ? calculateOverallRating(s.evaluationData)
                                : s.rating
                            )
                            .filter((r) => r > 0);
                          const averageRating =
                            ratings.length > 0
                              ? (
                                  ratings.reduce((sum, r) => sum + r, 0) /
                                  ratings.length
                                ).toFixed(1)
                              : "0.0";
                          const latestRating =
                            ratings.length > 0 ? ratings[0] : 0;
                          const trend =
                            ratings.length > 1 ? latestRating - ratings[1] : 0;

                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  Average Rating
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold">
                                    {averageRating}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    /5.0
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  Latest Rating
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-semibold">
                                    {latestRating}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    /5.0
                                  </span>
                                  {trend !== 0 && (
                                    <Badge
                                      className={
                                        trend > 0
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                      }
                                    >
                                      {trend > 0 ? "↗" : "↘"}{" "}
                                      {Math.abs(trend).toFixed(1)}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  Total Reviews
                                </span>
                                <Badge variant="outline">
                                  {submissions.length}
                                </Badge>
                              </div>

                              <div className="pt-2 border-t">
                                <div className="text-sm font-medium mb-2">
                                  Performance Level
                                </div>
                                <Badge
                                  className={
                                    parseFloat(averageRating) >= 4.5
                                      ? "bg-green-100 text-green-800"
                                      : parseFloat(averageRating) >= 4.0
                                      ? "bg-blue-100 text-blue-800"
                                      : parseFloat(averageRating) >= 3.5
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }
                                >
                                  {parseFloat(averageRating) >= 4.5
                                    ? "Outstanding"
                                    : parseFloat(averageRating) >= 4.0
                                    ? "Exceeds Expectations"
                                    : parseFloat(averageRating) >= 3.5
                                    ? "Meets Expectations"
                                    : "Needs Improvement"}
                                </Badge>
                              </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Performance Insights */}
                {submissions.length > 0 && (
                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        💡 Performance Insights
                      </CardTitle>
                      <CardDescription>
                        Actionable insights based on your performance history
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(() => {
                          const ratings = submissions
                            .map((s) =>
                              s.evaluationData
                                ? calculateOverallRating(s.evaluationData)
                                : s.rating
                            )
                            .filter((r) => r > 0);
                          const averageRating =
                            ratings.length > 0
                              ? ratings.reduce((sum, r) => sum + r, 0) /
                                ratings.length
                              : 0;
                          const latestRating =
                            ratings.length > 0 ? ratings[0] : 0;
                          const trend =
                            ratings.length > 1 ? latestRating - ratings[1] : 0;

                          const insights = [];

                          if (averageRating >= 4.5) {
                            insights.push({
                              type: "excellent",
                              icon: "🏆",
                              title: "Outstanding Performance",
                              message:
                                "You're performing exceptionally well! Consider mentoring others or taking on leadership opportunities.",
                            });
                          } else if (averageRating >= 4.0) {
                            insights.push({
                              type: "good",
                              icon: "⭐",
                              title: "Strong Performance",
                              message:
                                "You're exceeding expectations. Focus on maintaining this level and identifying areas for continued growth.",
                            });
                          } else if (averageRating >= 3.5) {
                            insights.push({
                              type: "average",
                              icon: "📈",
                              title: "Solid Performance",
                              message:
                                "You're meeting expectations. Consider setting specific goals to push beyond your current level.",
                            });
                          } else {
                            insights.push({
                              type: "improvement",
                              icon: "🎯",
                              title: "Growth Opportunity",
                              message:
                                "There's room for improvement. Focus on one key area at a time and seek feedback regularly.",
                            });
                          }

                          if (trend > 0.2) {
                            insights.push({
                              type: "improving",
                              icon: "🚀",
                              title: "Improving Trend",
                              message:
                                "Great job! Your performance is trending upward. Keep up the momentum!",
                            });
                          } else if (trend < -0.2) {
                            insights.push({
                              type: "declining",
                              icon: "⚠️",
                              title: "Performance Dip",
                              message:
                                "Your recent performance has declined. Consider discussing challenges with your manager.",
                            });
                          }

                          if (submissions.length >= 3) {
                            insights.push({
                              type: "consistency",
                              icon: "📊",
                              title: "Consistent Reviews",
                              message:
                                "You have a solid review history. This shows reliability and commitment to performance.",
                            });
                          }

                          return insights.map((insight, index) => (
                            <div
                              key={index}
                              className={`p-4 rounded-lg border ${
                                insight.type === "excellent"
                                  ? "bg-green-50 border-green-200"
                                  : insight.type === "good"
                                  ? "bg-blue-50 border-blue-200"
                                  : insight.type === "improving"
                                  ? "bg-emerald-50 border-emerald-200"
                                  : insight.type === "declining"
                                  ? "bg-red-50 border-red-200"
                                  : "bg-yellow-50 border-yellow-200"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">{insight.icon}</span>
                                <div>
                                  <h4 className="font-semibold text-sm mb-1">
                                    {insight.title}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {insight.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* All Performance Reviews Table */}
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>All Performance Reviews</CardTitle>
                    <CardDescription>
                      Complete history of your performance evaluations
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                          <span className="text-red-700">Poor (&lt;2.5)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
                          <span className="text-orange-700">Low (&lt;3.0)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                          <span className="text-blue-700">Good (3.0-3.9)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                          <span className="text-green-700">
                            Excellent (≥4.0)
                          </span>
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {submissions.length > 0 ? (
                      <div className="max-h-[500px] overflow-y-auto overflow-x-hidden rounded-lg border mx-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <Table>
                          <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
                            <TableRow>
                              <TableHead className="px-6 py-4">
                                Immediate Supervisor
                              </TableHead>
                              <TableHead className="px-6 py-4 text-right">
                                Rating
                              </TableHead>
                              <TableHead className="px-6 py-4">Date</TableHead>
                              <TableHead className="px-6 py-4">
                                Quarter
                              </TableHead>
                              <TableHead className="px-6 py-4 text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {submissions
                              .sort(
                                (a, b) =>
                                  new Date(b.submittedAt).getTime() -
                                  new Date(a.submittedAt).getTime()
                              )
                              .map((submission) => {
                                const highlight = getSubmissionHighlight(
                                  submission.submittedAt,
                                  submissions
                                );
                                const rating = submission.evaluationData
                                  ? calculateOverallRating(
                                      submission.evaluationData
                                    )
                                  : submission.rating;
                                const isLowPerformance = rating < 3.0;
                                const isPoorPerformance = rating < 2.5;

                                return (
                                  <TableRow
                                    key={submission.id}
                                    className={`${highlight.className} ${
                                      isPoorPerformance
                                        ? "bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100"
                                        : isLowPerformance
                                        ? "bg-orange-50 border-l-4 border-l-orange-400 hover:bg-orange-100"
                                        : ""
                                    }`}
                                  >
                                    <TableCell className="px-6 py-4 font-medium">
                                      <div className="flex items-center gap-2">
                                        {submission.evaluationData
                                          ?.supervisor || "Not specified"}
                                        {highlight.badge && (
                                          <Badge
                                            variant="secondary"
                                            className={`${highlight.badge.className} text-xs`}
                                          >
                                            {highlight.badge.text}
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-right font-semibold">
                                      {(() => {
                                        const rating = submission.evaluationData
                                          ? calculateOverallRating(
                                              submission.evaluationData
                                            )
                                          : submission.rating;
                                        const isLowPerformance = rating < 3.0;
                                        const isPoorPerformance = rating < 2.5;

                                        return (
                                          <div
                                            className={`flex items-center justify-end gap-2 ${
                                              isPoorPerformance
                                                ? "text-red-700"
                                                : isLowPerformance
                                                ? "text-orange-600"
                                                : "text-gray-900"
                                            }`}
                                          >
                                            <span
                                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                isPoorPerformance
                                                  ? "bg-red-100 text-red-800"
                                                  : isLowPerformance
                                                  ? "bg-orange-100 text-orange-800"
                                                  : rating >= 4.0
                                                  ? "bg-green-100 text-green-800"
                                                  : rating >= 3.5
                                                  ? "bg-blue-100 text-blue-800"
                                                  : "bg-blue-100 text-blue-800"
                                              }`}
                                            >
                                              {isPoorPerformance
                                                ? "POOR"
                                                : isLowPerformance
                                                ? "LOW"
                                                : rating >= 4.0
                                                ? "EXCELLENT"
                                                : rating >= 3.5
                                                ? "GOOD"
                                                : "FAIR"}
                                            </span>
                                            <span className="font-bold">
                                              {rating}/5
                                            </span>
                                          </div>
                                        );
                                      })()}
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {new Date(
                                            submission.submittedAt
                                          ).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {getTimeAgo(submission.submittedAt)}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                      <Badge
                                        className={getQuarterColor(
                                          getQuarterFromEvaluationData(
                                            submission.evaluationData ||
                                              submission
                                          )
                                        )}
                                      >
                                        {getQuarterFromEvaluationData(
                                          submission.evaluationData ||
                                            submission
                                        )}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          // Get approval data for this submission
                                          const approvalData = getApprovalData(
                                            submission.id
                                          );

                                          // Include approval data in the submission object
                                          const submissionWithApproval = {
                                            ...submission,
                                            employeeSignature:
                                              approvalData?.employeeSignature ||
                                              null,
                                            employeeApprovedAt:
                                              approvalData?.approvedAt || null,
                                          };

                                          setSelectedEvaluation(
                                            submissionWithApproval
                                          );
                                          setModalOpenedFromTab("reviews");
                                          setIsViewResultsModalOpen(true);
                                          // Show success animation
                                          setShowViewSuccess(true);
                                          setTimeout(
                                            () => setShowViewSuccess(false),
                                            2000
                                          );
                                        }}
                                        className="text-white bg-blue-500 hover:text-white hover:bg-blue-600"
                                      >
                                        <Eye className="w-4 h-4" />
                                        View
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 px-6">
                        <div className="text-gray-500 text-lg mb-2">
                          No performance reviews yet
                        </div>
                        <div className="text-gray-400 text-sm">
                          Your evaluation history will appear here once reviews
                          are completed.
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      case "history":
        // Filter submissions based on search term only
        const filteredHistorySubmissions = submissions.filter((submission) => {
          if (!historySearchTerm) return true;

          const searchLower = historySearchTerm.toLowerCase();
          return (
            submission.employeeName?.toLowerCase().includes(searchLower) ||
            submission.evaluator?.toLowerCase().includes(searchLower) ||
            submission.evaluationData?.supervisor
              ?.toLowerCase()
              .includes(searchLower) ||
            submission.rating?.toString().includes(searchLower) ||
            getQuarterFromEvaluationData(
              submission.evaluationData || submission
            )
              ?.toLowerCase()
              .includes(searchLower)
          );
        });

        return (
          <div className="relative">
            {isRefreshingHistory || loading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Table Header Skeleton */}
                    <div className="flex space-x-4">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-8 w-28" />
                    </div>

                    {/* Table Rows Skeleton */}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center space-x-4 py-3 border-b"
                      >
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Evaluation History</CardTitle>
                  <CardDescription>
                    Complete timeline of your performance evaluations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Tabbed Interface for Tables */}
                  <Tabs defaultValue="quarterly" className="w-full">
                    <TabsList className="grid w-1/2 bg-gray-200 grid-cols-2">
                      <TabsTrigger value="quarterly">
                        📊 Quarterly Performance
                      </TabsTrigger>
                      <TabsTrigger value="history">
                        📈 Evaluation History
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="quarterly" className="mt-6">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>
                                Quarterly Performance Summary
                              </CardTitle>
                              <CardDescription>
                                Performance overview grouped by quarter
                              </CardDescription>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRefreshQuarterly}
                              disabled={isRefreshingQuarterly}
                              className="flex items-center bg-blue-500 text-white hover:bg-green-700 hover:text-white space-x-2"
                            >
                              <svg
                                className="h-4 w-4 "
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              <span>Refresh</span>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Refreshing Dialog for Quarterly Performance */}
                          {showRefreshingDialog && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                <div>
                                  <h4 className="text-sm font-medium text-blue-900">
                                    Refreshing...
                                  </h4>
                                  <p className="text-xs text-blue-700">
                                    {refreshingMessage}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Search Bar */}
                          <div className="mb-6 w-1/2">
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg
                                  className="h-5 w-5 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                  />
                                </svg>
                              </div>
                              <input
                                type="text"
                                placeholder="Search quarterly data..."
                                value={quarterlySearchTerm}
                                onChange={(e) =>
                                  setQuarterlySearchTerm(e.target.value)
                                }
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                              {quarterlySearchTerm && (
                                <button
                                  onClick={() => setQuarterlySearchTerm("")}
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                  <svg
                                    className="h-5 w-5 text-red-400 hover:text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={6}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                            {quarterlySearchTerm && (
                              <div className="mt-2 text-sm text-gray-600">
                                Searching quarterly data...
                              </div>
                            )}
                          </div>

                          {/* Date Range Filter */}
                          <div className="mb-6">
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-gray-700">
                                Filter by Date Range:
                              </span>
                              <Popover
                                open={isDatePickerOpen}
                                onOpenChange={setIsDatePickerOpen}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-[280px] justify-start text-left font-normal",
                                      !dateFilter.from &&
                                        "text-muted-foreground"
                                    )}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {dateFilter.from ? (
                                      dateFilter.to ? (
                                        <>
                                          {dateFilter.from.toLocaleDateString()}{" "}
                                          - {dateFilter.to.toLocaleDateString()}
                                        </>
                                      ) : (
                                        dateFilter.from.toLocaleDateString()
                                      )
                                    ) : (
                                      "Pick a date range"
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <CalendarComponent
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateFilter.from}
                                    selected={
                                      dateFilter.from
                                        ? {
                                            from: dateFilter.from,
                                            to: dateFilter.to,
                                          }
                                        : undefined
                                    }
                                    onSelect={(range) =>
                                      setDateFilter(range || {})
                                    }
                                    numberOfMonths={1}
                                  />
                                </PopoverContent>
                              </Popover>
                              {(dateFilter.from || dateFilter.to) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={clearDateFilter}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Clear
                                </Button>
                              )}
                            </div>
                            {(dateFilter.from || dateFilter.to) && (
                              <div className="mt-2 text-sm text-gray-600">
                                Filtering by date range:{" "}
                                {dateFilter.from?.toLocaleDateString()} -{" "}
                                {dateFilter.to?.toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          {/* Quarter Filter Buttons */}
                          <div className="mb-6">
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-sm font-medium text-gray-700 mr-2">
                                Filter by Quarter:
                              </span>
                              <Button
                                variant={
                                  selectedQuarter === "" ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setSelectedQuarter("")}
                                className={`text-xs ${
                                  selectedQuarter === ""
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                All Quarters
                              </Button>
                              {["Q1", "Q2", "Q3", "Q4"].map((quarter) => (
                                <Button
                                  key={quarter}
                                  variant={
                                    selectedQuarter === quarter
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setSelectedQuarter(quarter)}
                                  className={`text-xs font-medium transition-all duration-200 ${
                                    selectedQuarter === quarter
                                      ? `${getQuarterColor(
                                          quarter
                                        )} border-2 shadow-md transform scale-105`
                                      : `${getQuarterColor(
                                          quarter
                                        )} border border-gray-300 hover:shadow-sm hover:scale-102`
                                  }`}
                                >
                                  {quarter}
                                </Button>
                              ))}
                              {selectedQuarter && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedQuarter("")}
                                  className="text-xs text-white bg-red-500 hover:text-white hover:bg-red-600 border border-red-500 shadow-sm transition-all duration-200 hover:shadow-md"
                                >
                                  Clear Filter
                                </Button>
                              )}
                            </div>
                            {selectedQuarter && (
                              <div className="mt-2 text-sm text-gray-600">
                                Showing data for {selectedQuarter} only
                              </div>
                            )}
                          </div>
                          <div className="max-h-[300px] md:max-h-[450px] lg:max-h-[650px] xl:max-h-[700px] overflow-y-auto overflow-x-auto scrollable-table">
                            {isRefreshingQuarterly || loading ? (
                              <div className="space-y-2 p-4">
                                {/* Table Header Skeleton */}
                                <div className="flex space-x-3 py-2 border-b">
                                  <Skeleton className="h-3 w-12" />
                                  <Skeleton className="h-3 w-18" />
                                  <Skeleton className="h-3 w-14" />
                                  <Skeleton className="h-3 w-12" />
                                  <Skeleton className="h-3 w-16" />
                                  <Skeleton className="h-3 w-10" />
                                  <Skeleton className="h-3 w-12" />
                                </div>

                                {/* Table Rows Skeleton */}
                                {Array.from({ length: 3 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center space-x-3 py-2 border-b"
                                  >
                                    <Skeleton className="h-4 w-8" />
                                    <Skeleton className="h-3 w-6" />
                                    <Skeleton className="h-3 w-12" />
                                    <Skeleton className="h-3 w-10" />
                                    <Skeleton className="h-3 w-14" />
                                    <Skeleton className="h-3 w-12" />
                                    <Skeleton className="h-6 w-14" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <Table>
                                <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
                                  <TableRow>
                                    <TableHead>Quarter</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Total Evaluations</TableHead>
                                    <TableHead>Average Rating</TableHead>
                                    <TableHead>Latest Rating</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(() => {
                                    // Group submissions by quarter
                                    const quarterlyData = submissions.reduce(
                                      (acc, submission) => {
                                        const quarter =
                                          getQuarterFromEvaluationData(
                                            submission.evaluationData ||
                                              submission
                                          );
                                        if (!acc[quarter]) {
                                          acc[quarter] = {
                                            quarter,
                                            submissions: [],
                                            averageRating: 0,
                                            totalEvaluations: 0,
                                            latestRating: 0,
                                            dateRange: "",
                                          };
                                        }
                                        acc[quarter].submissions.push(
                                          submission
                                        );
                                        return acc;
                                      },
                                      {} as any
                                    );

                                    // Calculate statistics for each quarter
                                    Object.keys(quarterlyData).forEach(
                                      (quarter) => {
                                        const data = quarterlyData[quarter];
                                        const ratings = data.submissions
                                          .map((s: any) =>
                                            s.evaluationData
                                              ? calculateOverallRating(
                                                  s.evaluationData
                                                )
                                              : s.rating
                                          )
                                          .filter((r: any) => r > 0);
                                        data.totalEvaluations = ratings.length;
                                        data.averageRating =
                                          ratings.length > 0
                                            ? (
                                                ratings.reduce(
                                                  (a: any, b: any) => a + b,
                                                  0
                                                ) / ratings.length
                                              ).toFixed(1)
                                            : 0;
                                        data.latestRating =
                                          ratings.length > 0
                                            ? ratings[ratings.length - 1]
                                            : 0;

                                        // Calculate date range for this quarter
                                        if (data.submissions.length > 0) {
                                          const dates = data.submissions
                                            .map(
                                              (s: any) =>
                                                new Date(s.submittedAt)
                                            )
                                            .sort((a: any, b: any) => a - b);
                                          const startDate = dates[0];
                                          const endDate =
                                            dates[dates.length - 1];

                                          if (
                                            startDate.getTime() ===
                                            endDate.getTime()
                                          ) {
                                            // Same date
                                            data.dateRange =
                                              startDate.toLocaleDateString();
                                          } else {
                                            // Date range
                                            data.dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
                                          }
                                        }
                                      }
                                    );

                                    // Sort quarters chronologically
                                    const sortedQuarters = Object.values(
                                      quarterlyData
                                    ).sort((a: any, b: any) => {
                                      const quarterOrder: {
                                        [key: string]: number;
                                      } = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
                                      const aQuarter = a.quarter.split(" ")[0]; // Extract just Q1, Q2, etc.
                                      const bQuarter = b.quarter.split(" ")[0];
                                      return (
                                        (quarterOrder[aQuarter] || 0) -
                                        (quarterOrder[bQuarter] || 0)
                                      );
                                    });

                                    // Filter quarters based on selected quarter and date range
                                    let filteredQuarters = selectedQuarter
                                      ? sortedQuarters.filter((q: any) =>
                                          q.quarter.startsWith(selectedQuarter)
                                        )
                                      : sortedQuarters;

                                    // Apply date range filter
                                    if (dateFilter.from || dateFilter.to) {
                                      filteredQuarters =
                                        filteredQuarters.filter(
                                          (quarterData: any) => {
                                            // Check if any submission in this quarter falls within the date range
                                            return quarterData.submissions.some(
                                              (submission: any) => {
                                                const submissionDate = new Date(
                                                  submission.submittedAt
                                                );

                                                // Normalize dates to compare only the date part (remove time)
                                                const submissionDateOnly =
                                                  new Date(
                                                    submissionDate.getFullYear(),
                                                    submissionDate.getMonth(),
                                                    submissionDate.getDate()
                                                  );
                                                const fromDateOnly =
                                                  dateFilter.from
                                                    ? new Date(
                                                        dateFilter.from.getFullYear(),
                                                        dateFilter.from.getMonth(),
                                                        dateFilter.from.getDate()
                                                      )
                                                    : null;
                                                const toDateOnly = dateFilter.to
                                                  ? new Date(
                                                      dateFilter.to.getFullYear(),
                                                      dateFilter.to.getMonth(),
                                                      dateFilter.to.getDate()
                                                    )
                                                  : null;

                                                const isAfterFrom =
                                                  !fromDateOnly ||
                                                  submissionDateOnly >=
                                                    fromDateOnly;
                                                const isBeforeTo =
                                                  !toDateOnly ||
                                                  submissionDateOnly <=
                                                    toDateOnly;

                                                return (
                                                  isAfterFrom && isBeforeTo
                                                );
                                              }
                                            );
                                          }
                                        );
                                    }

                                    return filteredQuarters.length > 0 ? (
                                      filteredQuarters.map(
                                        (quarterData: any) => {
                                          // Check if any submission in this quarter is new
                                          const hasNewSubmission =
                                            quarterData.submissions.some(
                                              (submission: any) =>
                                                isNewSubmission(
                                                  submission.submittedAt
                                                )
                                            );

                                          return (
                                            <TableRow
                                              key={quarterData.quarter}
                                              className={
                                                hasNewSubmission
                                                  ? "bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100"
                                                  : ""
                                              }
                                            >
                                              <TableCell>
                                                <div className="flex items-center gap-2">
                                                  <Badge
                                                    className={getQuarterColor(
                                                      quarterData.quarter
                                                    )}
                                                  >
                                                    {quarterData.quarter}
                                                  </Badge>
                                                  {hasNewSubmission && (
                                                    <Badge
                                                      variant="secondary"
                                                      className="bg-blue-100 text-blue-800 text-xs"
                                                    >
                                                      NEW
                                                    </Badge>
                                                  )}
                                                </div>
                                              </TableCell>
                                              <TableCell>
                                                <div className="text-sm text-gray-600">
                                                  {quarterData.dateRange ||
                                                    "No dates available"}
                                                </div>
                                              </TableCell>
                                              <TableCell className="font-medium">
                                                {quarterData.totalEvaluations}
                                              </TableCell>
                                              <TableCell>
                                                <div className="flex items-center space-x-1">
                                                  <span className="font-semibold">
                                                    {quarterData.averageRating}
                                                  </span>
                                                  <span className="text-gray-500">
                                                    /5.0
                                                  </span>
                                                </div>
                                              </TableCell>
                                              <TableCell>
                                                <div className="flex items-center space-x-1">
                                                  <span className="font-medium">
                                                    {quarterData.latestRating}
                                                  </span>
                                                  <span className="text-gray-500">
                                                    /5.0
                                                  </span>
                                                </div>
                                              </TableCell>
                                              <TableCell>
                                                <Badge
                                                  className={
                                                    parseFloat(
                                                      quarterData.averageRating
                                                    ) >= 4.5
                                                      ? "bg-green-100 text-green-800"
                                                      : parseFloat(
                                                          quarterData.averageRating
                                                        ) >= 4.0
                                                      ? "bg-blue-100 text-blue-800"
                                                      : parseFloat(
                                                          quarterData.averageRating
                                                        ) >= 3.5
                                                      ? "bg-yellow-100 text-yellow-800"
                                                      : "bg-red-100 text-red-800"
                                                  }
                                                >
                                                  {parseFloat(
                                                    quarterData.averageRating
                                                  ) >= 4.5
                                                    ? "Outstanding"
                                                    : parseFloat(
                                                        quarterData.averageRating
                                                      ) >= 4.0
                                                    ? "Exceeds Expectations"
                                                    : parseFloat(
                                                        quarterData.averageRating
                                                      ) >= 3.5
                                                    ? "Meets Expectations"
                                                    : "Needs Improvement"}
                                                </Badge>
                                              </TableCell>
                                              <TableCell>
                                                <Button
                                                  size="sm"
                                                  onClick={() => {
                                                    // Filter submissions for this quarter and show the first one
                                                    const quarterSubmissions =
                                                      submissions.filter(
                                                        (submission) =>
                                                          getQuarterFromEvaluationData(
                                                            submission.evaluationData ||
                                                              submission
                                                          ) ===
                                                          quarterData.quarter
                                                      );
                                                    if (
                                                      quarterSubmissions.length >
                                                      0
                                                    ) {
                                                      // Get approval data for this submission
                                                      const approvalData =
                                                        getApprovalData(
                                                          quarterSubmissions[0]
                                                            .id
                                                        );

                                                      // Include approval data in the submission object
                                                      const submissionWithApproval =
                                                        {
                                                          ...quarterSubmissions[0],
                                                          employeeSignature:
                                                            approvalData?.employeeSignature ||
                                                            null,
                                                          employeeApprovedAt:
                                                            approvalData?.approvedAt ||
                                                            null,
                                                        };

                                                      setSelectedEvaluation(
                                                        submissionWithApproval
                                                      );
                                                      setModalOpenedFromTab(
                                                        "quarterly"
                                                      );
                                                      setIsViewResultsModalOpen(
                                                        true
                                                      );
                                                      // Show success animation
                                                      setShowViewSuccess(true);
                                                      setTimeout(
                                                        () =>
                                                          setShowViewSuccess(
                                                            false
                                                          ),
                                                        2000
                                                      );
                                                    }
                                                  }}
                                                  className="bg-blue-500 text-white hover:bg-green-700 hover:text-white"
                                                >
                                                  <Eye className="w-4 h-4" />
                                                  View
                                                </Button>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        }
                                      )
                                    ) : (
                                      <TableRow>
                                        <TableCell
                                          colSpan={7}
                                          className="text-center py-8 text-gray-500"
                                        >
                                          <p>No quarterly data available</p>
                                          <p className="text-sm">
                                            Evaluations will be grouped by
                                            quarter once available
                                          </p>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })()}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="history" className="mt-6">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>Evaluation History</CardTitle>
                              <CardDescription>
                                Complete timeline of your performance
                                evaluations
                              </CardDescription>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRefreshHistory}
                              disabled={isRefreshingHistory}
                              className="flex items-center bg-blue-500 text-white hover:bg-green-700 hover:text-white space-x-2"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              <span>Refresh</span>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Refreshing Dialog for History Table */}
                          {showRefreshingDialog && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                <div>
                                  <h4 className="text-sm font-medium text-blue-900">
                                    Refreshing table...
                                  </h4>
                                  <p className="text-xs text-blue-700">
                                    {refreshingMessage}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Search Bar */}
                          <div className="mb-6 w-1/2">
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg
                                  className="h-5 w-5 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                  />
                                </svg>
                              </div>
                              <input
                                type="text"
                                placeholder="Search by employee, evaluator, supervisor, rating, or quarter..."
                                value={historySearchTerm}
                                onChange={(e) =>
                                  setHistorySearchTerm(e.target.value)
                                }
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                              {historySearchTerm && (
                                <button
                                  onClick={() => setHistorySearchTerm("")}
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                  <svg
                                    className="h-5 w-5 text-red-400 hover:text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={6}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                            {historySearchTerm && (
                              <div className="mt-2 text-sm text-gray-600">
                                Showing {filteredHistorySubmissions.length} of{" "}
                                {submissions.length} evaluations
                              </div>
                            )}
                          </div>
                          <div className="max-h-[350px] md:max-h-[500px] lg:max-h-[700px] xl:max-h-[750px] overflow-y-auto overflow-x-auto scrollable-table">
                            {isRefreshingHistory || loading ? (
                              <div className="space-y-2 p-4">
                                {/* Table Header Skeleton */}
                                <div className="flex space-x-3 py-2 border-b">
                                  <Skeleton className="h-3 w-12" />
                                  <Skeleton className="h-3 w-14" />
                                  <Skeleton className="h-3 w-12" />
                                  <Skeleton className="h-3 w-12" />
                                  <Skeleton className="h-3 w-10" />
                                  <Skeleton className="h-3 w-18" />
                                  <Skeleton className="h-3 w-12" />
                                </div>

                                {/* Table Rows Skeleton */}
                                {Array.from({ length: 4 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center space-x-3 py-2 border-b"
                                  >
                                    <Skeleton className="h-3 w-14" />
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-12" />
                                    <Skeleton className="h-3 w-8" />
                                    <Skeleton className="h-3 w-10" />
                                    <Skeleton className="h-3 w-14" />
                                    <Skeleton className="h-6 w-12" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <Table>
                                <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead className="text-right">
                                      Rating
                                    </TableHead>
                                    <TableHead>Quarter</TableHead>
                                    <TableHead>Immediate Supervisor</TableHead>
                                    <TableHead className="text-right">
                                      Actions
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {filteredHistorySubmissions.length > 0 ? (
                                    filteredHistorySubmissions
                                      .sort(
                                        (a, b) =>
                                          new Date(b.submittedAt).getTime() -
                                          new Date(a.submittedAt).getTime()
                                      )
                                      .map((submission) => {
                                        const highlight =
                                          getSubmissionHighlight(
                                            submission.submittedAt,
                                            filteredHistorySubmissions
                                          );
                                        return (
                                          <TableRow
                                            key={submission.id}
                                            className={highlight.className}
                                          >
                                            <TableCell>
                                              <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium">
                                                    {new Date(
                                                      submission.submittedAt
                                                    ).toLocaleDateString()}
                                                  </span>
                                                  {highlight.badge && (
                                                    <Badge
                                                      variant="secondary"
                                                      className={`${highlight.badge.className} text-xs`}
                                                    >
                                                      {highlight.badge.text}
                                                    </Badge>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs text-gray-500">
                                                    {new Date(
                                                      submission.submittedAt
                                                    ).toLocaleTimeString()}
                                                  </span>
                                                  <span className="text-xs text-blue-600 font-medium">
                                                    {getTimeAgo(
                                                      submission.submittedAt
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                              {submission.employeeName}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div className="flex items-center justify-end space-x-1">
                                                <span className="font-semibold">
                                                  {submission.evaluationData
                                                    ? calculateOverallRating(
                                                        submission.evaluationData
                                                      )
                                                    : submission.rating}
                                                </span>
                                                <span className="text-gray-500">
                                                  /5
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <Badge
                                                className={getQuarterColor(
                                                  getQuarterFromEvaluationData(
                                                    submission.evaluationData ||
                                                      submission
                                                  )
                                                )}
                                              >
                                                {getQuarterFromEvaluationData(
                                                  submission.evaluationData ||
                                                    submission
                                                )}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                              {submission.evaluationData
                                                ?.supervisor || "Not specified"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div className="flex items-center justify-end space-x-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    // Get approval data for this submission
                                                    const approvalData =
                                                      getApprovalData(
                                                        submission.id
                                                      );

                                                    // Include approval data in the submission object
                                                    const submissionWithApproval =
                                                      {
                                                        ...submission,
                                                        employeeSignature:
                                                          approvalData?.employeeSignature ||
                                                          null,
                                                        employeeApprovedAt:
                                                          approvalData?.approvedAt ||
                                                          null,
                                                      };

                                                    setSelectedEvaluation(
                                                      submissionWithApproval
                                                    );
                                                    setModalOpenedFromTab(
                                                      "history"
                                                    );
                                                    setIsViewResultsModalOpen(
                                                      true
                                                    );
                                                    // Show success animation
                                                    setShowViewSuccess(true);
                                                    setTimeout(
                                                      () =>
                                                        setShowViewSuccess(
                                                          false
                                                        ),
                                                      2000
                                                    );
                                                  }}
                                                  className="text-white bg-blue-500 hover:text-blue-800 border-blue-200 hover:border-blue-300"
                                                >
                                                  <Eye className="w-4 h-4" />
                                                  View
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  onClick={() => {
                                                    setEvaluationToDelete(
                                                      submission
                                                    );
                                                    setIsDeleteEvaluationDialogOpen(
                                                      true
                                                    );
                                                  }}
                                                  className="text-white bg-red-500 hover:bg-red-600 hover:text-white border-red-200 hover:border-red-300"
                                                >
                                                  <Trash className="w-4 h-4" />
                                                  Delete
                                                </Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })
                                  ) : (
                                    <TableRow>
                                      <TableCell
                                        colSpan={8}
                                        className="text-center py-8 text-gray-500"
                                      >
                                        {historySearchTerm ? (
                                          <>
                                            <p>
                                              No evaluations found matching "
                                              {historySearchTerm}"
                                            </p>
                                            <p className="text-sm">
                                              Try adjusting your search terms
                                            </p>
                                          </>
                                        ) : (
                                          <>
                                            <p>No evaluation history found</p>
                                            <p className="text-sm">
                                              Completed evaluations will appear
                                              here
                                            </p>
                                          </>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "account-history":
        return (
          <div className="relative">
            {isRefreshingAccountHistory || loading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-60" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* Tabs Skeleton */}
                    <div className="flex space-x-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>

                    {/* Table Content Skeleton */}
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-3 py-2 border-b"
                        >
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-3 w-14" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Account History</CardTitle>
                  <CardDescription>
                    Track suspension records and account activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Account History Section */}
                  <div className="mt-6">
                    {/* Refreshing Dialog for Account History Table */}
                    {showRefreshingDialog && (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          <div>
                            <h4 className="text-sm font-medium text-blue-900">
                              Refreshing...
                            </h4>
                            <p className="text-xs text-blue-700">
                              {refreshingMessage}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Search Bar */}
                    <div className="mb-6 w-1/3">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="h-5 w-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Search account history..."
                          value={accountHistorySearchTerm}
                          onChange={(e) =>
                            setAccountHistorySearchTerm(e.target.value)
                          }
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {accountHistorySearchTerm && (
                          <button
                            onClick={() => setAccountHistorySearchTerm("")}
                            className="absolute inset-y-0 font-medium  px-2 right-0 pr-3 flex items-center"
                          >
                            <svg
                              className="h-5 w-5 text-red-400 hover:text-red-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={6}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Account History Actions */}
                    <div className="mb-4 flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Showing {getFilteredAccountHistory().length} of{" "}
                        {accountHistory.length} records
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshAccountHistory}
                        disabled={isRefreshing}
                        className="flex items-center space-x-2 bg-blue-500 text-white hover:bg-green-700 hover:text-white"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span>Refresh</span>
                      </Button>
                    </div>

                    {/* Account History Table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>

                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredAccountHistory().map((item, index) => (
                            <TableRow key={`account-${item.id}-${index}`}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">
                                    {getTypeIcon(item.type)}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="capitalize"
                                  >
                                    {item.type}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {item.title}
                              </TableCell>
                              <TableCell
                                className="max-w-xs truncate"
                                title={item.description}
                              >
                                {item.description}
                              </TableCell>
                              <TableCell>
                                {new Date(item.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getSeverityColor(item.severity)}
                                >
                                  {item.severity?.toUpperCase() || "UNKNOWN"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(item.status)}>
                                  {item.status?.toUpperCase() || "UNKNOWN"}
                                </Badge>
                              </TableCell>

                              <TableCell>
                                <div className="space-y-1 text-sm">
                                  {item.type === "violation" && (
                                    <>
                                      {item.details.duration && (
                                        <div>
                                          Duration: {item.details.duration}
                                        </div>
                                      )}
                                      {item.details.reinstatedDate && (
                                        <div className="text-green-600">
                                          Reinstated:{" "}
                                          {new Date(
                                            item.details.reinstatedDate
                                          ).toLocaleDateString()}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {item.type === "feedback" && (
                                    <>
                                      {item.details.rating && (
                                        <div>
                                          Rating: {item.details.rating}%
                                        </div>
                                      )}
                                      {item.details.period && (
                                        <div>Period: {item.details.period}</div>
                                      )}
                                      {item.details.category && (
                                        <div>
                                          Category: {item.details.category}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Empty State */}
                    {getFilteredAccountHistory().length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-4">📋</div>
                        <p className="text-lg font-medium">
                          {accountHistorySearchTerm
                            ? "No matching records found"
                            : "No account history found"}
                        </p>
                        <p className="text-sm">
                          {accountHistorySearchTerm
                            ? "Try adjusting your search terms"
                            : "Your account history will appear here when violations or feedback are recorded"}
                        </p>
                      </div>
                    )}

                    {/* Summary Statistics */}
                    {accountHistory.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t mt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {accountHistory?.filter(
                              (item) => item.type === "violation"
                            ).length || 0}
                          </div>
                          <div className="text-sm text-gray-600">
                            Violations
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {accountHistory?.filter(
                              (item) => item.type === "feedback"
                            ).length || 0}
                          </div>
                          <div className="text-sm text-gray-600">Feedback</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {accountHistory?.filter(
                              (item) => item.severity === "high"
                            ).length || 0}
                          </div>
                          <div className="text-sm text-gray-600">
                            High Severity
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {accountHistory?.filter(
                              (item) =>
                                item.status === "completed" ||
                                item.status === "reinstated"
                            ).length || 0}
                          </div>
                          <div className="text-sm text-gray-600">Resolved</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      {/* Loading Screen - Shows during initial load, authentication, and auto-refresh */}
      {(loading || authLoading || !user) && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-800">
              {authLoading
                ? "Authenticating..."
                : !user
                ? "Loading user user..."
                : "Loading Employee Dashboard..."}
            </p>
          </div>
        </div>
      )}

      <PageTransition>
        <DashboardShell
          title="Employee Dashboard"
          currentPeriod="Q4 2024"
          sidebarItems={sidebarItems}
          activeItemId={activeTab}
          onChangeActive={handleTabChange}
          topSummary={topSummary}
        >
          {renderContent()}
        </DashboardShell>
      </PageTransition>

      {/* View Results Modal */}
      <ViewResultsModal
        isOpen={isViewResultsModalOpen}
        onCloseAction={() => setIsViewResultsModalOpen(false)}
        submission={selectedEvaluation}
        onApprove={handleApproveEvaluation}
        isApproved={
          selectedEvaluation
            ? isEvaluationApproved(selectedEvaluation.id)
            : false
        }
        approvalData={
          selectedEvaluation ? getApprovalData(selectedEvaluation.id) : null
        }
        currentUserName={user?.full_name || user?.full_name}
        currentUserSignature={(() => {
          const signature =
            selectedEvaluation?.evaluationData?.evaluatorSignatureImage ||
            selectedEvaluation?.evaluationData?.evaluatorSignature ||
            null;
          return signature;
        })()}
        showApprovalButton={modalOpenedFromTab === "overview"} // Only show approval button in Overview tab
      />

      {/* Evaluation Details Modal */}
      <EvaluationDetailsModal
        isOpen={isEvaluationDetailsModalOpen}
        onCloseAction={() => setIsEvaluationDetailsModalOpen(false)}
        evaluationData={
          selectedEvaluation
            ? {
                evaluationData: selectedEvaluation.evaluationData,
                evaluatorName: selectedEvaluation.evaluatorName,
                submittedAt: selectedEvaluation.submittedAt,
                period: selectedEvaluation.period,
                overallRating: selectedEvaluation.overallRating,
              }
            : null
        }
        approvalData={
          selectedEvaluation ? getApprovalData(selectedEvaluation.id) : null
        }
        isApproved={
          selectedEvaluation
            ? isEvaluationApproved(selectedEvaluation.id)
            : false
        }
      />

      {/* Comments & feedback modals removed */}

      {/* Logout Confirmation Alert Dialog */}
      <AlertDialog
        open={isLogoutDialogOpen}
        onOpenChangeAction={setIsLogoutDialogOpen}
        title={showLogoutSuccess ? "Logging Out..." : "Logout"}
        description={
          showLogoutSuccess
            ? "You have been successfully logged out. Redirecting to login page..."
            : "Are you sure you want to logout? You will need to sign in again to access your dashboard."
        }
        type={showLogoutSuccess ? "success" : "info"}
        confirmText={showLogoutSuccess ? "Goodbye!" : "Yes, Logout"}
        cancelText="Cancel"
        showCancel={!showLogoutSuccess}
        isLoading={isLoggingOut}
        showSuccessAnimation={showLogoutSuccess}
        // Pulse animation from AnimationExamples
        loadingAnimation={{
          variant: "wave",
          color: "purple",
          size: "lg",
        }}
        onConfirm={confirmLogout}
        onCancel={() => setIsLogoutDialogOpen(false)}
      />

      {/* Delete Evaluation Dialog */}
      <Dialog
        open={isDeleteEvaluationDialogOpen}
        onOpenChangeAction={setIsDeleteEvaluationDialogOpen}
      >
        <DialogContent className="max-w-md w-[90vw] sm:w-full px-6 py-6 animate-popup">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-600 animate-fadeInOut"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              Delete Evaluation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 fade-in-scale">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this evaluation from{" "}
              {evaluationToDelete?.employeeName}? This action cannot be undone
              and will permanently remove the evaluation from your history.
            </p>

            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="deletePassword"
                  className="text-sm font-medium text-gray-700"
                >
                  Enter your password to confirm deletion:
                </Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="Enter password"
                  className={`mt-1 ${
                    passwordError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }`}
                  disabled={isDeletingEvaluation}
                />
                {passwordError && (
                  <p className="text-sm text-red-600 mt-1">{passwordError}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteEvaluationDialogOpen(false);
                  setEvaluationToDelete(null);
                  setDeletePassword("");
                  setIsPasswordValid(false);
                  setPasswordError("");
                }}
                disabled={isDeletingEvaluation}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteEvaluation}
                disabled={isDeletingEvaluation || !deletePassword.trim()}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isDeletingEvaluation ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Evaluation Success Dialog */}
      <Dialog
        open={showDeleteEvaluationSuccessDialog}
        onOpenChangeAction={setShowDeleteEvaluationSuccessDialog}
      >
        <DialogContent className="max-w-sm w-[90vw] sm:w-full px-6 py-6 animate-popup">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 mt-4 font-bold flex items-center justify-center p-1">
                <svg viewBox="0 0 52 52" className="w-16 h-16 overflow-visible">
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
                stroke: #22c55e; /* green-500 */
                stroke-width: 3;
                stroke-linecap: round;
                stroke-dasharray: 160;
                stroke-dashoffset: 160;
                animation: draw-circle 0.6s ease-out forwards;
              }
              .check-path {
                stroke: #16a34a; /* green-600 */
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
              Evaluation Deleted
            </p>
            <p className="text-sm text-gray-600 text-center">
              The evaluation has been removed from your history.
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
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 mt-4 font-bold flex items-center justify-center p-1">
                <svg
                  viewBox="0 0 52 52"
                  className="w-16 h-16 overflow-visible animate-x"
                >
                  <circle
                    className="error-circle"
                    cx="26"
                    cy="26"
                    r="24"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                  />
                  <path
                    className="error-path"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3"
                    d="M16 16 l20 20 M36 16 l-20 20"
                  />
                </svg>
              </div>
            </div>
            <style jsx>{`
              .error-circle {
                stroke: #ef4444; /* red-500 */
                stroke-width: 3;
                stroke-linecap: round;
                stroke-dasharray: 160;
                stroke-dashoffset: 160;
                animation: draw-circle 0.6s ease-out forwards;
              }
              .error-path {
                stroke: #dc2626; /* red-600 */
                stroke-width: 4;
                stroke-linecap: round;
                stroke-linejoin: round;
                stroke-dasharray: 50;
                stroke-dashoffset: 50;
                animation: draw-x 0.4s ease-out 0.4s forwards;
              }
              @keyframes draw-circle {
                to {
                  stroke-dashoffset: 0;
                }
              }
              @keyframes draw-x {
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
            <p className="text-lg font-medium text-red-600 text-center">
              Incorrect Password
            </p>
            <p className="text-sm text-gray-600 text-center">
              The password you entered is incorrect. Please try again.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <Dialog
        open={isApprovalDialogOpen}
        onOpenChangeAction={setIsApprovalDialogOpen}
      >
        <DialogContent className="max-w-md w-[90vw] bg-blue-50 sm:w-full px-6 py-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {showApprovalSuccess
                ? "Evaluation Approved!"
                : "Approve Evaluation"}
            </DialogTitle>
          </DialogHeader>

          {!showApprovalSuccess ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to approve this evaluation? By approving,
                you acknowledge that you have reviewed and understood your
                performance assessment.
              </p>

              {/* Signature Status Check */}
              {(() => {
                const hasSignature = user?.signature || user?.signature;
                return hasSignature ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-green-800 font-medium">
                        Signature Available
                      </span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Your signature will be used for approval.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-red-200 border border-red-200 rounded-lg">
                    <div className="flex items-center  space-x-2">
                      <svg
                        className="w-5 h-5 text-red-600 animate-fadeInOut"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      <span className="text-sm text-red-800 font-medium">
                        No Signature Found
                      </span>
                    </div>
                    <p className="text-xs text-red-700 mt-1">
                      Please add a signature to your user before approving
                      evaluations.
                    </p>
                  </div>
                );
              })()}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsApprovalDialogOpen(false);
                    setEvaluationToApprove(null);
                    setEmployeeApprovalName("");
                  }}
                  disabled={isApproving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmApproval}
                  disabled={
                    isApproving ||
                    !employeeApprovalName.trim() ||
                    !(user?.signature || user?.signature)
                  }
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isApproving ? "Approving..." : "Approve"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center mt-4">
                <div className="w-16 h-16 ">
                  <svg viewBox="0 0 52 52" className="w-16 h-16">
                    <circle
                      className="check-circle"
                      cx="26"
                      cy="26"
                      r="25"
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
                  stroke: #22c55e; /* green-500 */
                  stroke-width: 3;
                  stroke-linecap: round;
                  stroke-dasharray: 160;
                  stroke-dashoffset: 160;
                  animation: draw-circle 0.6s ease-out forwards;
                }
                .check-path {
                  stroke: #16a34a; /* green-600 */
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
              `}</style>
              <p className="text-lg font-medium text-gray-900 text-center">
                Evaluation Approved Successfully!
              </p>
              <p className="text-sm text-gray-600 text-center">
                Your signature has been recorded and the evaluation is now
                complete.
              </p>

              <Button
                onClick={() => {
                  setIsApprovalDialogOpen(false);
                  setShowApprovalSuccess(false);
                  setEmployeeApprovalName("");
                  setEvaluationToApprove(null);
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
