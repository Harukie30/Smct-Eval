"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import DashboardShell, { SidebarItem } from "@/components/DashboardShell";
import { withAuth } from "@/hoc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import EditUserModal from "@/components/EditUserModal";
import { toastMessages } from "@/lib/toastMessages";
import { apiService } from "@/lib/apiService";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

// Lazy load tab components for better performance
const OverviewTab = lazy(() =>
  import("./OverviewTab").then((m) => ({ default: m.OverviewTab }))
);
const UserManagementTab = lazy(() =>
  import("./UserManagementTab").then((m) => ({ default: m.UserManagementTab }))
);
const EvaluatedReviewsTab = lazy(() =>
  import("./EvaluatedReviewsTab").then((m) => ({
    default: m.EvaluatedReviewsTab,
  }))
);
const DepartmentsTab = lazy(() =>
  import("./DepartmentsTab").then((m) => ({ default: m.DepartmentsTab }))
);
const BranchHeadsTab = lazy(() =>
  import("./BranchHeadsTab").then((m) => ({ default: m.BranchHeadsTab }))
);
const BranchesTab = lazy(() =>
  import("./BranchesTab").then((m) => ({ default: m.BranchesTab }))
);
const AreaManagersTab = lazy(() =>
  import("./AreaManagersTab").then((m) => ({ default: m.AreaManagersTab }))
);

// Import data
import accountsDataRaw from "@/data/accounts.json";
import departmentsData from "@/data/departments.json";
// branchData now comes from clientDataService
// positionsData now comes from clientDataService
import branchCodesData from "@/data/branch-code.json";

// Extract accounts array from the new structure
const accountsData = accountsDataRaw.accounts || [];

// TypeScript interfaces
interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch?: string;
  hireDate: string;
  role: string;
  username?: string;
  password?: string;
  isActive?: boolean;
  avatar?: string | null;
  bio?: string | null;
  contact?: string;
  updatedAt?: string;
  approvedDate?: string; // Date when the user was approved
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalEvaluations: number;
  pendingEvaluations: number;
}

interface DashboardStats {
  employeeDashboard: {
    activeUsers: number;
    totalViews: number;
    lastActivity: string;
  };
  hrDashboard: {
    activeUsers: number;
    totalViews: number;
    lastActivity: string;
  };
  evaluatorDashboard: {
    activeUsers: number;
    totalViews: number;
    lastActivity: string;
  };
}

interface Review {
  id: number;
  employeeName: string;
  evaluatorName: string;
  department: string;
  position: string;
  evaluationDate: string;
  overallScore: number;
  status: "completed" | "pending" | "in_progress";
  lastUpdated: string;
  totalCriteria: number;
  completedCriteria: number;
}

interface Department {
  id: number;
  name: string;
  manager: string;
  employeeCount: number;
  performance: number;
}

function AdminDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positionsData, setPositionsData] = useState<
    { value: string; label: string }[]
  >([]);
  const [branchesData, setBranchesData] = useState<
    { value: string; label: string }[]
  >([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(
    null
  );
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  );
  const [reviews, setReviews] = useState<Review[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  // Initialize active tab from URL parameter or default to 'overview'
  const tabParam = searchParams.get("tab");
  const [active, setActiveState] = useState(tabParam || "overview");

  // Function to update both state and URL
  const setActive = useCallback(
    async (tab: string) => {
      const previousTab = active;
      // Only show spinner if switching to a different tab
      if (tab !== previousTab) {
        setIsTabSwitching(true);
      }
      setActiveState(tab);
      // Update URL without page reload
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });

      // Small delay to ensure smooth transition
      setTimeout(() => {
        setIsTabSwitching(false);
      }, 300);
    },
    [searchParams, router, pathname, active]
  );

  // Function to refresh user data (used by shared hook)
  const refreshUserData = async () => {
    console.log("🔄 Starting user data refresh...");
    setIsRefreshing(true);

    try {
      // Load accounts data directly (no merging needed)
      const employees = await loadAccountsData();
      console.log("📊 Loaded employees:", employees.length);

      const filteredEmployees = filterDeletedEmployees(employees);
      console.log("✅ Filtered employees:", filteredEmployees.length);

      setEmployees(filteredEmployees);

      // Update system metrics with actual data (will be updated by updateSystemMetrics)
      setSystemMetrics((prev) =>
        prev
          ? {
              ...prev,
              totalUsers: filteredEmployees.length,
              activeUsers: filteredEmployees.length,
            }
          : null
      );

      // Update dashboard stats with actual data
      setDashboardStats((prev) =>
        prev
          ? {
              ...prev,
              employeeDashboard: {
                ...prev.employeeDashboard,
                activeUsers: filteredEmployees.filter((emp: any) => {
                  const role = emp.role?.toLowerCase() || "";
                  return (
                    role === "employee" ||
                    role.includes("representative") ||
                    role.includes("designer") ||
                    role.includes("developer") ||
                    role.includes("specialist") ||
                    role.includes("analyst") ||
                    role.includes("coordinator") ||
                    role.includes("assistant")
                  );
                }).length,
              },
              hrDashboard: {
                ...prev.hrDashboard,
                activeUsers: filteredEmployees.filter((emp: any) => {
                  const role = emp.role?.toLowerCase() || "";
                  return (
                    role === "hr" ||
                    role === "hr-manager" ||
                    role.includes("hr") ||
                    role.includes("human resources")
                  );
                }).length,
              },
              evaluatorDashboard: {
                ...prev.evaluatorDashboard,
                activeUsers: filteredEmployees.filter((emp: any) => {
                  const role = emp.role?.toLowerCase() || "";
                  return (
                    role === "evaluator" ||
                    role.includes("manager") ||
                    role.includes("supervisor") ||
                    role.includes("director") ||
                    role.includes("lead")
                  );
                }).length,
              },
            }
          : null
      );

      // Also refresh pending registrations and evaluated reviews
      await loadPendingRegistrations();
      await loadEvaluatedReviews();

      // Load dashboard data from API (replaces manual calculation)
      await loadDashboardData();

      // Fallback: Update system metrics to reflect current state if API didn't provide all data
      updateSystemMetrics();

      console.log("✅ User data refresh completed successfully");
    } catch (error) {
      console.error("❌ Error refreshing user data:", error);

      // Show error message to user
      toastMessages.generic.error(
        "Refresh Failed",
        "Failed to refresh user data. Please try again."
      );

      // Fallback: load accounts data directly
      try {
        const employees = await loadAccountsData();
        const filteredEmployees = filterDeletedEmployees(employees);
        setEmployees(filteredEmployees);
        console.log("🔄 Fallback refresh completed");
      } catch (fallbackError) {
        console.error("❌ Fallback refresh also failed:", fallbackError);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Ref to store refresh function to avoid dependency issues
  const refreshUserDataRef = useRef(refreshUserData);

  // Update ref when function changes
  useEffect(() => {
    refreshUserDataRef.current = refreshUserData;
  }, [refreshUserData]);

  // Update setActive to refresh data when switching tabs
  const setActiveWithRefresh = useCallback(
    async (tab: string) => {
      const previousTab = active;
      setActiveState(tab);
      // Update URL without page reload
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });

      // Only refresh data for tabs that need employee data (not overview)
      // Don't show spinner for overview tab
      if (tab !== "overview" && tab !== previousTab) {
        setIsTabSwitching(true);
        try {
          await refreshUserDataRef.current();
          // Keep spinner visible for at least 800ms for better UX
          await new Promise((resolve) => setTimeout(resolve, 800));
        } catch (error) {
          console.error("Error refreshing data on tab switch:", error);
          // Even on error, show spinner for minimum duration
          await new Promise((resolve) => setTimeout(resolve, 800));
        } finally {
          // Hide spinner after refresh completes
          setIsTabSwitching(false);
        }
      }
    },
    [searchParams, router, pathname, active]
  );

  // Auto-refresh functionality using shared hook
  const {
    showRefreshModal,
    refreshModalMessage,
    handleRefreshModalComplete,
    refreshDashboardData,
  } = useAutoRefresh({
    refreshFunction: refreshUserData,
    dashboardName: "Admin Dashboard",
    customMessage: "Welcome back! Refreshing your admin dashboard data...",
  });

  // Handle URL parameter changes for tab navigation
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== active) {
      setActiveState(tab);
    }
  }, [searchParams, active]);

  // Real-time data updates via localStorage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only refresh if the change is from another tab/window
      if (e.key === "submissions" && e.newValue !== e.oldValue) {
        console.log(
          "📊 Submissions data updated, refreshing admin dashboard..."
        );
        loadEvaluatedReviews();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Function to refresh evaluated reviews only
  const handleRefreshEvaluatedReviews = async () => {
    console.log("🔄 Starting evaluated reviews refresh...");
    setIsRefreshing(true);

    try {
      await loadEvaluatedReviews();
      console.log("✅ Evaluated reviews refresh completed successfully");
    } catch (error) {
      console.error("❌ Error refreshing evaluated reviews:", error);
      toastMessages.generic.error(
        "Refresh Failed",
        "Failed to refresh evaluated reviews. Please try again."
      );
    } finally {
      setIsRefreshing(false);
    }
  };
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [approvedRegistrations, setApprovedRegistrations] = useState<number[]>(
    []
  );
  const [rejectedRegistrations, setRejectedRegistrations] = useState<number[]>(
    []
  );
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [evaluatedReviews, setEvaluatedReviews] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    position: "",
    department: "",
    branchCode: "",
    branch: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  // Function to filter out deleted employees
  const filterDeletedEmployees = (employeeList: Employee[]) => {
    const deletedEmployees = JSON.parse(
      localStorage.getItem("deletedEmployees") || "[]"
    );
    return employeeList.filter((emp) => !deletedEmployees.includes(emp.id));
  };

  // Function to load pending registrations
  const loadPendingRegistrations = async () => {
    try {
      const pendingRegistrations = await apiService.getPendingRegistrations();
      setPendingRegistrations(pendingRegistrations);
    } catch (error) {
      console.error("Error loading pending registrations:", error);
      setPendingRegistrations([]);
    }
  };

  // Function to load evaluated reviews from client data service
  const loadEvaluatedReviews = async () => {
    try {
      // const submissions = await apiService.getSubmissions();
      // Transform submissions data to match the Review interface expected by the table
      // const evaluationResults = submissions.map((submission: any) => ({
      //   id: submission.id,
      //   employeeName: submission.employeeName,
      //   evaluatorName: submission.evaluator,
      //   department: submission.evaluationData?.department || "N/A",
      //   position: submission.evaluationData?.position || "N/A",
      //   evaluationDate: submission.submittedAt,
      //   overallScore: Math.round((submission.rating / 5) * 100), // Convert 5-point scale to percentage
      //   status: submission.status || "completed",
      //   lastUpdated: submission.submittedAt,
      //   totalCriteria: 7, // Default total criteria count
      //   completedCriteria: 7, // Assume all criteria are completed for submitted reviews
      //   // Keep original data for other uses
      //   employeeId: submission.evaluationData?.employeeId || submission.id,
      //   employeeEmail: submission.evaluationData?.employeeEmail || "",
      //   overallRating: submission.rating,
      //   period:
      //     submission.evaluationData?.period ||
      //     new Date().toISOString().slice(0, 7),
      //   submittedAt: submission.submittedAt,
      //   evaluationData: submission.evaluationData,
      // }));
      // Sort by submission date (newest first)
      // evaluationResults.sort(
      //   (a: any, b: any) =>
      //     new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      // );
      //   setEvaluatedReviews(evaluationResults);
    } catch (error) {
      console.error("Error loading evaluated reviews:", error);
      setEvaluatedReviews([]);
    }
  };

  // Function to load accounts data directly (no merging needed since accounts.json is now the single source)
  const loadAccountsData = async () => {
    try {
      // Load from localStorage first (for any runtime updates)
      const localStorageAccounts = JSON.parse(
        localStorage.getItem("accounts") || "[]"
      );

      // If localStorage has data, use it; otherwise use the imported data
      const accounts =
        localStorageAccounts.length > 0 ? localStorageAccounts : accountsData;

      // Filter out admin accounts and convert to Employee format
      const employees = accounts
        .filter((account: any) => account.role !== "admin") // Exclude admin accounts from employee list
        .map((account: any) => ({
          id: account.employeeId || account.id,
          name: account.name,
          email: account.email,
          position: account.position,
          department: account.department,
          branch: account.branch,
          hireDate: account.hireDate,
          role: account.role,
          username: account.username,
          password: account.password,
          isActive: account.isActive,
          avatar: account.avatar,
          bio: account.bio,
          contact: account.contact,
          updatedAt: account.updatedAt,
          approvedDate: account.approvedDate,
        }));

      return employees;
    } catch (error) {
      console.error("Error loading accounts data:", error);
      return [];
    }
  };

  // Function to open delete modal
  const openDeleteModal = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setUserToEdit(user);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (updatedUser: any) => {
    try {
      // Update user using API service
      // Convert user object to FormData as required by apiService
      const formData = new FormData();
      Object.keys(updatedUser).forEach((key) => {
        const value = updatedUser[key as keyof typeof updatedUser];
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      await apiService.updateEmployee(formData, updatedUser.id);

      // Also update accounts storage to persist changes
      const accounts = JSON.parse(localStorage.getItem("accounts") || "[]");
      const accountIndex = accounts.findIndex(
        (acc: any) =>
          acc.id === updatedUser.id || acc.employeeId === updatedUser.id
      );

      if (accountIndex !== -1) {
        // Update the account with the new user data
        accounts[accountIndex] = {
          ...accounts[accountIndex],
          name: updatedUser.name,
          email: updatedUser.email,
          position: updatedUser.position,
          department: updatedUser.department,
          branch: updatedUser.branch,
          role: updatedUser.role,
          username: updatedUser.username || accounts[accountIndex].username,
          password: updatedUser.password || accounts[accountIndex].password,
          contact: updatedUser.contact || accounts[accountIndex].contact,
          hireDate: updatedUser.hireDate || accounts[accountIndex].hireDate,
          isActive:
            updatedUser.isActive !== undefined
              ? updatedUser.isActive
              : accounts[accountIndex].isActive,
          employeeId:
            updatedUser.employeeId !== undefined
              ? updatedUser.employeeId
              : accounts[accountIndex].employeeId,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem("accounts", JSON.stringify(accounts));
      }

      // Show success toast
      toastMessages.user.updated(updatedUser.name);

      // Note: Refresh will be handled by onRefresh callback in EditUserModal
    } catch (error) {
      console.error("Error updating user:", error);
      toastMessages.generic.error(
        "Update Failed",
        "Failed to update user information. Please try again."
      );
      throw error; // Re-throw to let EditUserModal handle it
    }
  };

  // Function to handle delete employee
  const handleDeleteEmployee = () => {
    if (!employeeToDelete) return;

    // Store deleted employee ID in localStorage for persistence
    const deletedEmployees = JSON.parse(
      localStorage.getItem("deletedEmployees") || "[]"
    );
    deletedEmployees.push(employeeToDelete.id);
    localStorage.setItem("deletedEmployees", JSON.stringify(deletedEmployees));

    // Remove employee from the list
    setEmployees((prev) =>
      prev.filter((emp) => emp.id !== employeeToDelete.id)
    );

    // Show success toast
    toastMessages.user.deleted(employeeToDelete.name);

    // Close modal
    setIsDeleteModalOpen(false);
    setEmployeeToDelete(null);
  };

  // Function to handle approve registration
  const handleApproveRegistration = async (
    registrationId: number,
    registrationName: string
  ) => {
    try {
      const result = await apiService.approveRegistration(registrationId);

      if (result.success) {
        // Add to approved list
        const newApproved = [...approvedRegistrations, registrationId];
        setApprovedRegistrations(newApproved);

        // Store in localStorage for persistence
        localStorage.setItem(
          "approvedRegistrations",
          JSON.stringify(newApproved)
        );

        // Remove from rejected list if it was there
        const newRejected = rejectedRegistrations.filter(
          (id) => id !== registrationId
        );
        setRejectedRegistrations(newRejected);
        localStorage.setItem(
          "rejectedRegistrations",
          JSON.stringify(newRejected)
        );

        // Reload pending registrations to get updated data
        await loadPendingRegistrations();

        // Refresh active users data to show the newly approved user
        await refreshDashboardData(false, false);

        // Show success toast
        toastMessages.user.approved(registrationName);
      } else {
        toastMessages.generic.error(
          "Approval Failed",
          result.message || "Failed to approve registration. Please try again."
        );
      }
    } catch (error) {
      console.error("Error approving registration:", error);
      toastMessages.generic.error(
        "Approval Error",
        "An error occurred while approving the registration. Please try again."
      );
    }
  };

  // Function to handle reject registration
  const handleRejectRegistration = async (
    registrationId: number,
    registrationName: string
  ) => {
    try {
      const result = await apiService.rejectRegistration(registrationId);

      if (result.success) {
        // Add to rejected list
        const newRejected = [...rejectedRegistrations, registrationId];
        setRejectedRegistrations(newRejected);

        // Store in localStorage for persistence
        localStorage.setItem(
          "rejectedRegistrations",
          JSON.stringify(newRejected)
        );

        // Remove from approved list if it was there
        const newApproved = approvedRegistrations.filter(
          (id) => id !== registrationId
        );
        setApprovedRegistrations(newApproved);
        localStorage.setItem(
          "approvedRegistrations",
          JSON.stringify(newApproved)
        );

        // Reload pending registrations to get updated data
        await loadPendingRegistrations();

        // Show success toast
        toastMessages.user.rejected(registrationName);
      } else {
        toastMessages.generic.error(
          "Rejection Failed",
          result.message || "Failed to reject registration. Please try again."
        );
      }
    } catch (error) {
      console.error("Error rejecting registration:", error);
      toastMessages.generic.error(
        "Rejection Error",
        "An error occurred while rejecting the registration. Please try again."
      );
    }
  };

  // Memoized active employees
  const activeEmployees = useMemo(() => {
    return employees.filter((emp) => emp.isActive !== false);
  }, [employees]);

  // Function to get active employees
  const getActiveEmployees = () => activeEmployees;

  // Helper functions for departments and branches
  const getDepartmentStats = (deptName: string) => {
    const deptEmployees = employees.filter(
      (emp) => emp.department === deptName
    );
    return {
      count: deptEmployees.length,
      managers: deptEmployees.filter(
        (emp) =>
          emp.role === "Manager" || emp.role?.toLowerCase().includes("manager")
      ).length,
      averageTenure: 2.5, // Mock data
    };
  };

  // Function to load dashboard data from API
  const loadDashboardData = async () => {
    try {
      const dashboardData = await apiService.adminDashboard();

      // Handle different response formats
      const data = dashboardData?.data || dashboardData;

      if (data) {
        // Update system metrics from API response
        if (
          data.totalUsers !== undefined ||
          data.totalEvaluations !== undefined
        ) {
          setSystemMetrics((prev) => {
            const defaultMetrics: SystemMetrics = {
              totalUsers: 0,
              activeUsers: 0,
              totalEvaluations: 0,
              pendingEvaluations: 0,
            };
            return {
              ...defaultMetrics,
              ...prev,
              totalUsers:
                data.totalUsers ??
                prev?.totalUsers ??
                defaultMetrics.totalUsers,
              activeUsers:
                data.activeUsers ??
                prev?.activeUsers ??
                defaultMetrics.activeUsers,
              totalEvaluations:
                data.totalEvaluations ??
                prev?.totalEvaluations ??
                defaultMetrics.totalEvaluations,
              pendingEvaluations:
                data.pendingEvaluations ??
                prev?.pendingEvaluations ??
                defaultMetrics.pendingEvaluations,
            };
          });
        }

        // Update dashboard stats from API response
        if (
          data.employeeDashboard ||
          data.hrDashboard ||
          data.evaluatorDashboard
        ) {
          setDashboardStats((prev) => {
            const defaultStats: DashboardStats = {
              employeeDashboard: {
                activeUsers: 0,
                totalViews: 0,
                lastActivity: new Date().toISOString(),
              },
              hrDashboard: {
                activeUsers: 0,
                totalViews: 0,
                lastActivity: new Date().toISOString(),
              },
              evaluatorDashboard: {
                activeUsers: 0,
                totalViews: 0,
                lastActivity: new Date().toISOString(),
              },
            };
            return {
              ...defaultStats,
              ...prev,
              employeeDashboard:
                data.employeeDashboard ??
                prev?.employeeDashboard ??
                defaultStats.employeeDashboard,
              hrDashboard:
                data.hrDashboard ??
                prev?.hrDashboard ??
                defaultStats.hrDashboard,
              evaluatorDashboard:
                data.evaluatorDashboard ??
                prev?.evaluatorDashboard ??
                defaultStats.evaluatorDashboard,
            };
          });
        }
      }
    } catch (error) {
      console.error("Error loading dashboard data from API:", error);
      // Fallback to manual calculation if API fails
      updateSystemMetrics();
    }
  };

  // Function to update system metrics with correct active user count (fallback)
  const updateSystemMetrics = () => {
    setSystemMetrics((prev) =>
      prev
        ? {
            ...prev,
            totalUsers: employees.length, // Total users in system
            activeUsers: activeEmployees.length, // Active users
          }
        : null
    );

    // Update dashboard stats with correct active user counts
    setDashboardStats((prev) =>
      prev
        ? {
            ...prev,
            employeeDashboard: {
              ...prev.employeeDashboard,
              activeUsers: activeEmployees.filter((emp: any) => {
                const role = emp.role?.toLowerCase() || "";
                return (
                  role === "employee" ||
                  role.includes("representative") ||
                  role.includes("designer") ||
                  role.includes("developer") ||
                  role.includes("analyst") ||
                  role.includes("coordinator")
                );
              }).length,
            },
            hrDashboard: {
              ...prev.hrDashboard,
              activeUsers: activeEmployees.filter((emp: any) => {
                const role = emp.role?.toLowerCase() || "";
                return (
                  role === "hr" ||
                  role === "hr-manager" ||
                  role.includes("hr") ||
                  role.includes("human resources")
                );
              }).length,
            },
            evaluatorDashboard: {
              ...prev.evaluatorDashboard,
              activeUsers: activeEmployees.filter((emp: any) => {
                const role = emp.role?.toLowerCase() || "";
                return (
                  role === "evaluator" ||
                  role.includes("manager") ||
                  role.includes("supervisor") ||
                  role.includes("director") ||
                  role.includes("lead")
                );
              }).length,
            },
          }
        : null
    );
  };

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        // Load positions data
        const positions = await apiService.getPositions();
        // Convert from {id, name} to {value, label} format
        setPositionsData(positions);

        // Load branches data
        const branches = await apiService.getBranches();
        // Convert from {id, name} to {value, label} format
        setBranchesData(branches);

        // Load persisted registration data
        const savedApproved = JSON.parse(
          localStorage.getItem("approvedRegistrations") || "[]"
        );
        const savedRejected = JSON.parse(
          localStorage.getItem("rejectedRegistrations") || "[]"
        );
        setApprovedRegistrations(savedApproved);
        setRejectedRegistrations(savedRejected);

        // Load fresh data from accounts.json
        await refreshDashboardData(false, false);

        // Real system metrics based on actual data (will be updated after refreshUserData)
        const metrics: SystemMetrics = {
          totalUsers: 0, // Will be updated after data loads
          activeUsers: 0, // Will be updated after data loads
          totalEvaluations: 0, // Will be updated when real evaluations are available
          pendingEvaluations: 0, // Will be updated when real evaluations are available
        };

        // Real dashboard stats based on actual data (will be updated after data loads)
        const stats: DashboardStats = {
          employeeDashboard: {
            activeUsers: 0, // Will be updated after data loads
            totalViews: 0, // Will be updated when real analytics are available
            lastActivity: new Date().toISOString(),
          },
          hrDashboard: {
            activeUsers: 0, // Will be updated after data loads
            totalViews: 0, // Will be updated when real analytics are available
            lastActivity: new Date().toISOString(),
          },
          evaluatorDashboard: {
            activeUsers: 0, // Will be updated after data loads
            totalViews: 0, // Will be updated when real analytics are available
            lastActivity: new Date().toISOString(),
          },
        };

        // Initialize empty reviews array - will be populated from real evaluation data
        const reviewsData: Review[] = [];

        setSystemMetrics(metrics);
        setDashboardStats(stats);
        setReviews(reviewsData);

        // Load pending registrations
        await loadPendingRegistrations();

        // Load evaluated reviews
        await loadEvaluatedReviews();

        // Load dashboard data from API (replaces manual calculation)
        await loadDashboardData();

        // Fallback: Update system metrics with correct active user counts if API didn't provide all data
        updateSystemMetrics();

        setLoading(false);
      } catch (error) {
        console.error("Error loading admin data:", error);
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const getReviewStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "in_progress":
        return "text-yellow-600 bg-yellow-100";
      case "pending":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const handleAddUser = () => {
    // Validate passwords match
    if (newUser.password !== newUser.confirmPassword) {
      toastMessages.generic.error(
        "Password Mismatch",
        "Passwords do not match! Please try again."
      );
      return;
    }

    // Validate required fields
    if (!newUser.name || !newUser.email || !newUser.password) {
      toastMessages.generic.warning(
        "Missing Information",
        "Please fill in all required fields."
      );
      return;
    }

    // In a real app, you would make an API call here

    toastMessages.user.created(newUser.name);
    // Reset form and close modal
    setNewUser({
      name: "",
      email: "",
      position: "",
      department: "",
      branchCode: "",
      branch: "",
      role: "",
      password: "",
      confirmPassword: "",
    });
    setIsAddUserModalOpen(false);
  };

  const resetUserForm = () => {
    setNewUser({
      name: "",
      email: "",
      position: "",
      department: "",
      branchCode: "",
      branch: "",
      role: "",
      password: "",
      confirmPassword: "",
    });
  };

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: "📊" },
      { id: "users", label: "User Management", icon: "👥" },
      { id: "evaluated-reviews", label: "Evaluation Records", icon: "📋" },
      { id: "departments", label: "Departments", icon: "🏢" },
      { id: "branches", label: "Branches", icon: "📍" },
      { id: "branch-heads", label: "Branch Heads", icon: "👔" },
      { id: "area-managers", label: "Area Managers", icon: "🎯" },
    ],
    []
  );

  if (loading || !systemMetrics || !dashboardStats) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-800">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  const topSummary = <></>;

  return (
    <DashboardShell
      title="Admin Dashboard"
      currentPeriod={new Date().toLocaleDateString()}
      sidebarItems={sidebarItems}
      activeItemId={active}
      onChangeActive={setActiveWithRefresh}
      topSummary={topSummary}
    >
      <div className="relative min-h-[400px]">
        {/* Tab Switching Spinner Overlay - Only shows for content area, not full page */}
        {isTabSwitching && (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none bg-white/60 rounded-lg">
            <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
              <div className="relative">
                {/* Spinning ring */}
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                {/* Logo in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src="/smct.png"
                    alt="SMCT Logo"
                    className="h-8 w-8 object-contain"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600 font-medium">Refreshing...</p>
            </div>
          </div>
        )}
        {active === "overview" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <OverviewTab key={active} />
          </Suspense>
        )}

        {active === "users" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <UserManagementTab
              key={active}
              branchesData={branchesData}
              positionsData={positionsData}
              refreshDashboardDataAction={refreshDashboardData}
            />
          </Suspense>
        )}

        {active === "evaluated-reviews" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <EvaluatedReviewsTab key={active} />
          </Suspense>
        )}

        {active === "departments" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <DepartmentsTab />
          </Suspense>
        )}

        {active === "branches" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <BranchesTab employees={employees} />
          </Suspense>
        )}

        {active === "branch-heads" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <BranchHeadsTab
              employees={employees}
              onRefresh={refreshDashboardData}
            />
          </Suspense>
        )}

        {active === "area-managers" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <AreaManagersTab
              employees={employees}
              onRefresh={refreshDashboardData}
            />
          </Suspense>
        )}

        {/* Add User Modal */}
        <Dialog
          open={isAddUserModalOpen}
          onOpenChangeAction={setIsAddUserModalOpen}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="pb-4">
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with appropriate permissions
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 px-2">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter full name"
                      value={newUser.name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Job Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Job Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-sm font-medium">
                      Position
                    </Label>
                    <Select
                      value={newUser.position}
                      onValueChange={(value) =>
                        setNewUser({ ...newUser, position: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {positionsData.map((position) => (
                          <SelectItem
                            key={position.value}
                            value={position.value}
                          >
                            {position.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium">
                      Role
                    </Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) =>
                        setNewUser({ ...newUser, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="hr">HR Manager</SelectItem>
                        <SelectItem value="evaluator">Evaluator</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Organization Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Organization
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium">
                      Department
                    </Label>
                    <Select
                      value={newUser.department}
                      onValueChange={(value) =>
                        setNewUser({ ...newUser, department: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentsData.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branchCode" className="text-sm font-medium">
                      Branch Code
                    </Label>
                    <Select
                      value={newUser.branchCode}
                      onValueChange={(value) =>
                        setNewUser({ ...newUser, branchCode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch code" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchCodesData.map((code) => (
                          <SelectItem key={code} value={code}>
                            {code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch" className="text-sm font-medium">
                      Branch
                    </Label>
                    <Select
                      value={newUser.branch}
                      onValueChange={(value) =>
                        setNewUser({ ...newUser, branch: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchesData.map((branch) => (
                          <SelectItem key={branch.value} value={branch.value}>
                            {branch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Security Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Security
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium"
                    >
                      Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm password"
                      value={newUser.confirmPassword}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          confirmPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                {newUser.password &&
                  newUser.confirmPassword &&
                  newUser.password !== newUser.confirmPassword && (
                    <p className="text-sm text-red-600">
                      Passwords do not match
                    </p>
                  )}
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Permissions
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="dashboard-access"
                      defaultChecked
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="dashboard-access" className="text-sm">
                      Dashboard Access
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="user-management"
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="user-management" className="text-sm">
                      User Management
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="evaluation-access"
                      defaultChecked
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="evaluation-access" className="text-sm">
                      Evaluation Access
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="reports-access"
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="reports-access" className="text-sm">
                      Reports Access
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 px-2">
              <div className="flex justify-end space-x-4 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetUserForm();
                    setIsAddUserModalOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddUser}
                  className="bg-green-500 text-white hover:bg-green-600 hover:text-white"
                >
                  Add User
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog
          open={isDeleteModalOpen}
          onOpenChangeAction={(open) => {
            setIsDeleteModalOpen(open);
            if (!open) {
              setEmployeeToDelete(null);
            }
          }}
        >
          <DialogContent className="max-w-md p-6">
            <DialogHeader className="pb-4 bg-red-50 rounded-lg">
              <DialogTitle className="text-red-800 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Delete Employee
              </DialogTitle>
              <DialogDescription className="text-red-700">
                This action cannot be undone. Are you sure you want to
                permanently delete {employeeToDelete?.name}?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-2 mt-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="text-sm text-red-700">
                    <p className="font-medium">
                      Warning: This will permanently delete:
                    </p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Employee profile and data</li>
                      <li>All evaluation records</li>
                      <li>Access permissions</li>
                      <li>Associated files and documents</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-sm text-gray-700">
                  <p className="font-medium">Employee Details:</p>
                  <div className="mt-2 space-y-1">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {employeeToDelete?.name}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {employeeToDelete?.email}
                    </p>
                    <p>
                      <span className="font-medium">Position:</span>{" "}
                      {employeeToDelete?.position}
                    </p>
                    <p>
                      <span className="font-medium">Department:</span>{" "}
                      {employeeToDelete?.department}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 px-2">
              <div className="flex justify-end space-x-4 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setEmployeeToDelete(null);
                  }}
                  className="text-white bg-blue-600 hover:text-white hover:bg-green-500"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDeleteEmployee}
                >
                  🗑️ Delete Permanently
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={userToEdit}
          onSave={handleSaveUser}
          departments={departmentsData.map((dept: any) => dept.name)}
          branches={branchesData.map(
            (branch: { value: string; label: string }) => ({
              id: branch.value,
              name: branch.label,
            })
          )}
          positions={positionsData.map(
            (pos: { value: string; label: string }) => ({
              id: pos.value,
              name: pos.label,
            })
          )}
          onRefresh={async () => {
            // Directly refresh user data to update the table immediately
            await refreshUserData();
          }}
        />
      </div>
    </DashboardShell>
  );
}

// Wrap with HOC for authentication
export default withAuth(AdminDashboard, { requiredRole: "admin" });
