"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Download,
  Plus,
  BarChart2,
  X,
  Loader2,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import EditUserModal from "@/components/EditUserModal";
import AddEmployeeModal from "@/components/AddEmployeeModal";
import { BranchQuarterUserExportModal } from "@/components/userManagement/BranchQuarterUserExportModal";
import { toastMessages } from "@/lib/toastMessages";
import apiService from "@/lib/apiService";
import { dedupeUsersById } from "@/lib/sortUsersByName";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";
import EvaluationsPagination from "@/components/paginationComponent";
import ViewEmployeeModal from "@/components/ViewEmployeeModal";
import { User } from "@/contexts/UserContext";
import {
  getEmployeeBranchCodeDisplay,
  getEmployeeBranchLabel,
} from "@/components/evaluation/employeeBranchLabel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Employee {
  id: number;
  fname: string;
  lname: string;
  emp_id: number;
  email: string;
  positions: any;
  departments: any;
  branches: any;
  hireDate: Date;
  roles: any;
  username: string;
  password: string;
  is_active: string;
  avatar?: string | null;
  bio?: string | null;
  contact?: string;
  created_at: string;
  updated_at?: string;
}

interface RoleType {
  id: string;
  name: string;
}

/** Same 0–5 rating scale as HR user management (employee average chart). */
const PERFORMANCE_RATING_MAX = 5;

function performanceScorePercent(rating: number): string {
  if (rating <= 0 || Number.isNaN(rating)) return "—";
  return `${((rating / PERFORMANCE_RATING_MAX) * 100).toFixed(1)}%`;
}

export default function UserManagementTab() {
  const [pendingRegistrations, setPendingRegistrations] = useState<User[]>([]);

  const [activeRegistrations, setActiveRegistrations] = useState<User[]>([]);
  const [tab, setTab] = useState<"active" | "new">("active");
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [activeTotalItems, setActiveTotalItems] = useState(0);
  const [pendingTotalItems, setPendingTotalItems] = useState(0);

  //data
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [positionsData, setPositionData] = useState<any[]>([]);
  const [branchesData, setBranchesData] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Use dialog animation hook (0.4s to match EditUserModal speed)
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<number | null>(null);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Set<number>>(new Set());

  //filters for active users
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [debouncedActiveSearchTerm, setDebouncedActiveSearchTerm] =
    useState(activeSearchTerm);
  const [roleFilter, setRoleFilter] = useState("0"); // Default to "All Roles"
  const [debouncedRoleFilter, setDebouncedRoleFilter] = useState(roleFilter);
  //filters for pending users
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [debouncedPendingSearchTerm, setDebouncedPendingSearchTerm] =
    useState(pendingSearchTerm);
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedStatusFilter, setDebouncedStatusFilter] =
    useState(statusFilter);
  //pagination
  const [currentPageActive, setCurrentPageActive] = useState(1);
  const [currentPagePending, setCurrentPagePending] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [totalItems, setTotalItems] = useState(0);
  const [totalActivePages, setTotalActivePages] = useState(1);
  const [totalPendingPages, setTotalPendingPages] = useState(1);
  const [perPage, setPerPage] = useState(0);

  const [employeeToView, setEmployeeToView] = useState<User | null>(null);
  const [isViewEmployeeModalOpen, setIsViewEmployeeModalOpen] = useState(false);
  const [isBranchQuarterExportModalOpen, setIsBranchQuarterExportModalOpen] =
    useState(false);

  const [employeeForAverage, setEmployeeForAverage] = useState<User | null>(null);
  const [isAverageModalOpen, setIsAverageModalOpen] = useState(false);
  const [recordedYearsForAverage, setRecordedYearsForAverage] = useState<
    { year: number }[]
  >([]);
  const [loadingRecordedYears, setLoadingRecordedYears] = useState(false);
  const [averageModalYear, setAverageModalYear] = useState<string>("");
  const [averageTableData, setAverageTableData] = useState<{
    rows: { quarter: string; rating: number }[];
    average: number;
  } | null>(null);
  const [loadingAverageTable, setLoadingAverageTable] = useState(false);
  const [showAverageExportSuccess, setShowAverageExportSuccess] = useState(false);
  const [showAverageExportNoData, setShowAverageExportNoData] = useState(false);
  const [showAverageExportError, setShowAverageExportError] = useState(false);
  const [isAverageExporting, setIsAverageExporting] = useState(false);

  // Track when page change started for pending users
  const pendingPageChangeStartTimeRef = useRef<number | null>(null);
  const pendingUsersInFlightKeyRef = useRef<string | null>(null);
  const pendingUsersInFlightPromiseRef = useRef<Promise<void> | null>(null);

  const loadPendingUsers = async (
    searchValue: string,
    statusFilterValue: string
  ) => {
    const normalizedStatus = statusFilterValue === "0" ? "" : statusFilterValue;

    const requestKey = JSON.stringify({
      searchValue,
      normalizedStatus,
      currentPagePending,
      itemsPerPage,
    });

    if (
      pendingUsersInFlightKeyRef.current === requestKey &&
      pendingUsersInFlightPromiseRef.current
    ) {
      await pendingUsersInFlightPromiseRef.current;
      return;
    }

    const requestPromise = (async () => {
      try {
        const response = await apiService.getPendingRegistrations(
          searchValue,
          normalizedStatus,
          currentPagePending,
          itemsPerPage
        );

        setPendingRegistrations(
          dedupeUsersById(Array.isArray(response.data) ? response.data : [])
        );
        setPendingTotalItems(response.total);
        setTotalPendingPages(response.last_page);
        setPerPage(response.per_page);
      } catch (error) {
        console.error("Error loading pending users:", error);
      } finally {
        if (pendingPageChangeStartTimeRef.current !== null) {
          const elapsed = Date.now() - pendingPageChangeStartTimeRef.current;
          const minDisplayTime = 2000;
          const remainingTime = Math.max(0, minDisplayTime - elapsed);

          setTimeout(() => {
            setIsPageLoading(false);
            pendingPageChangeStartTimeRef.current = null;
          }, remainingTime);
        }

        if (pendingUsersInFlightKeyRef.current === requestKey) {
          pendingUsersInFlightKeyRef.current = null;
          pendingUsersInFlightPromiseRef.current = null;
        }
      }
    })();

    pendingUsersInFlightKeyRef.current = requestKey;
    pendingUsersInFlightPromiseRef.current = requestPromise;
    await requestPromise;
  };

  // Track when page change started for active users
  const activePageChangeStartTimeRef = useRef<number | null>(null);
  const activeUsersInFlightKeyRef = useRef<string | null>(null);
  const activeUsersInFlightPromiseRef = useRef<Promise<void> | null>(null);

  const loadActiveUsers = async (searchValue: string, roleFilterValue: string) => {
    const normalizedRole = roleFilterValue === "0" ? "" : roleFilterValue;

    const requestKey = JSON.stringify({
      searchValue,
      normalizedRole,
      currentPageActive,
      itemsPerPage,
    });

    if (
      activeUsersInFlightKeyRef.current === requestKey &&
      activeUsersInFlightPromiseRef.current
    ) {
      await activeUsersInFlightPromiseRef.current;
      return;
    }

    const requestPromise = (async () => {
      try {
        const response = await apiService.getActiveRegistrations(
          searchValue,
          normalizedRole,
          currentPageActive,
          itemsPerPage
        );

        setActiveRegistrations(
          dedupeUsersById(Array.isArray(response.data) ? response.data : [])
        );
        setActiveTotalItems(response.total);
        setTotalActivePages(response.last_page);
        setPerPage(response.per_page);
      } catch (error) {
        console.error("Error loading active users:", error);
      } finally {
        if (activePageChangeStartTimeRef.current !== null) {
          const elapsed = Date.now() - activePageChangeStartTimeRef.current;
          const minDisplayTime = 2000;
          const remainingTime = Math.max(0, minDisplayTime - elapsed);

          setTimeout(() => {
            setIsPageLoading(false);
            activePageChangeStartTimeRef.current = null;
          }, remainingTime);
        }

        if (activeUsersInFlightKeyRef.current === requestKey) {
          activeUsersInFlightKeyRef.current = null;
          activeUsersInFlightPromiseRef.current = null;
        }
      }
    })();

    activeUsersInFlightKeyRef.current = requestKey;
    activeUsersInFlightPromiseRef.current = requestPromise;
    await requestPromise;
  };

  const prevActiveFiltersFingerprintRef = useRef<string | null>(null);
  const prevPendingFiltersFingerprintRef = useRef<string | null>(null);

  // Mount: metadata only (list loads from debounced effects — avoids duplicate API calls)
  useEffect(() => {
    const mountData = async () => {
      setRefresh(true);
      try {
        const [positions, branches, departments] = await Promise.all([
          apiService.getPositions(),
          apiService.getBranches(),
          apiService.getDepartments(),
        ]);
        setPositionData(positions);
        setBranchesData(branches);
        setDepartmentData(departments);
        const roles = await apiService.getAllRoles();
        setRoles(roles);
      } catch (error) {
        console.error("Error refreshing data:", error);
        setRefresh(false);
      } finally {
        setRefresh(false);
      }
    };
    mountData();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      const fingerprint = `${activeSearchTerm}|${roleFilter}`;
      if (
        prevActiveFiltersFingerprintRef.current !== null &&
        prevActiveFiltersFingerprintRef.current !== fingerprint
      ) {
        setCurrentPageActive(1);
      }
      prevActiveFiltersFingerprintRef.current = fingerprint;
      setDebouncedActiveSearchTerm(activeSearchTerm);
      setDebouncedRoleFilter(roleFilter);
    }, 500);

    return () => clearTimeout(handler);
  }, [activeSearchTerm, roleFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const fingerprint = `${pendingSearchTerm}|${statusFilter}`;
      if (
        prevPendingFiltersFingerprintRef.current !== null &&
        prevPendingFiltersFingerprintRef.current !== fingerprint
      ) {
        setCurrentPagePending(1);
      }
      prevPendingFiltersFingerprintRef.current = fingerprint;
      setDebouncedPendingSearchTerm(pendingSearchTerm);
      setDebouncedStatusFilter(statusFilter);
    }, 500);

    return () => clearTimeout(handler);
  }, [pendingSearchTerm, statusFilter]);

  useEffect(() => {
    if (tab !== "active") return;
    const run = async () => {
      await loadActiveUsers(debouncedActiveSearchTerm, debouncedRoleFilter);
    };
    void run();
  }, [tab, debouncedActiveSearchTerm, debouncedRoleFilter, currentPageActive]);

  useEffect(() => {
    if (tab !== "new") return;
    const run = async () => {
      await loadPendingUsers(
        debouncedPendingSearchTerm,
        debouncedStatusFilter
      );
    };
    void run();
  }, [tab, debouncedPendingSearchTerm, debouncedStatusFilter, currentPagePending]);

  const refreshUserData = async (showLoading = false) => {
    try {
      setRefresh(true);
      if (tab === "new") {
        await loadPendingUsers(
          debouncedPendingSearchTerm,
          debouncedStatusFilter
        );
      } else if (tab === "active") {
        await loadActiveUsers(debouncedActiveSearchTerm, debouncedRoleFilter);
      }

      if (showLoading) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } catch (error) {
      console.error("❌ Error refreshing user data:", error);
      toastMessages.generic.error(
        "Refresh Failed",
        "Failed to refresh user data. Please try again."
      );
    } finally {
      setRefresh(false);
    }
  };

  // Handlers
  const openEditModal = async (user: any) => {
    try {
      setUserToEdit(user);
      setIsEditModalOpen(true);
    } catch (error) {
      console.log(error);
    }
  };

  const openDeleteModal = (employee: User) => {
    setEmployeeToDelete(employee);
    setIsDeleteModalOpen(true);
  };

  const loadAverageTableForYear = useCallback(
    async (year?: string) => {
      const targetYear = year ?? averageModalYear;
      if (!employeeForAverage?.id || !targetYear) return;
      setLoadingAverageTable(true);
      setAverageTableData(null);
      try {
        const employeeName =
          `${employeeForAverage.fname || ""} ${employeeForAverage.lname || ""}`.trim();
        const response = await apiService.getSubmissions(
          employeeName,
          1,
          100,
          "",
          "",
          targetYear,
          "",
          ""
        );
        const list: any[] = response?.data || [];
        const employeeId = Number(employeeForAverage.id);
        const forEmployee = list.filter((ev: any) => {
          const evEmpId =
            ev.employee?.id != null ? Number(ev.employee.id) : null;
          return (
            evEmpId === employeeId ||
            (ev.employee?.fname &&
              ev.employee?.lname &&
              `${ev.employee.fname} ${ev.employee.lname}`.trim() === employeeName)
          );
        });
        const getQuarter = (ev: any): string => {
          if (
            ev.reviewTypeOthersImprovement ||
            (ev.reviewTypeOthersCustom &&
              String(ev.reviewTypeOthersCustom).trim())
          )
            return "Others";
          if (
            ev.reviewTypeProbationary != null &&
            ev.reviewTypeProbationary !== "" &&
            ev.reviewTypeProbationary !== "null"
          )
            return `M${ev.reviewTypeProbationary}`;
          if (ev.reviewTypeRegular) return String(ev.reviewTypeRegular);
          const d = new Date(ev.created_at || ev.submittedAt);
          const m = d.getMonth() + 1;
          return `Q${Math.ceil(m / 3)}`;
        };
        const rows = forEmployee.map((ev: any) => ({
          quarter: getQuarter(ev),
          rating: Number(ev.rating) || 0,
        }));
        const sum = rows.reduce(
          (acc: number, r: { quarter: string; rating: number }) =>
            acc + r.rating,
          0
        );
        const average = rows.length > 0 ? sum / rows.length : 0;
        setAverageTableData({ rows, average });
      } catch {
        setAverageTableData({ rows: [], average: 0 });
      } finally {
        setLoadingAverageTable(false);
      }
    },
    [employeeForAverage, averageModalYear]
  );

  useEffect(() => {
    if (!isAverageModalOpen) {
      setRecordedYearsForAverage([]);
      setAverageModalYear("");
      setAverageTableData(null);
      setShowAverageExportSuccess(false);
      return;
    }
    let cancelled = false;
    setLoadingRecordedYears(true);
    apiService
      .getAllYears()
      .then((years: { year: number }[]) => {
        if (cancelled || !Array.isArray(years)) return;
        const sorted = [...years].sort((a, b) => b.year - a.year);
        setRecordedYearsForAverage(sorted);
        setAverageModalYear("");
      })
      .catch(() => {
        if (!cancelled) setRecordedYearsForAverage([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecordedYears(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAverageModalOpen]);

  useEffect(() => {
    if (!showAverageExportSuccess) return;
    const id = window.setTimeout(() => setShowAverageExportSuccess(false), 3000);
    return () => window.clearTimeout(id);
  }, [showAverageExportSuccess]);

  const handleSaveUser = async (updatedUser: any) => {
    try {
      // Convert user object to FormData for API
      const formData = new FormData();
      Object.keys(updatedUser).forEach((key) => {
        if (updatedUser[key] !== undefined && updatedUser[key] !== null) {
          // Skip these keys - we'll append them with _id suffix separately
          if (
            key === "position" ||
            key === "branch" ||
            key === "role" ||
            key === "department" ||
            key === "employeeId"
          ) {
            return;
          }
          if (key === "avatar" && updatedUser[key] instanceof File) {
            formData.append(key, updatedUser[key]);
          } else {
            formData.append(key, String(updatedUser[key]));
          }
        }
      });

      // Append position as position_id if it exists
      if (updatedUser.position !== undefined && updatedUser.position !== null) {
        formData.append("position_id", String(updatedUser.position));
      }

      // Append branch as branch_id if it exists
      if (updatedUser.branch !== undefined && updatedUser.branch !== null) {
        formData.append("branch_id", String(updatedUser.branch));
      }

      // Append role as roles if it exists
      if (updatedUser.role !== undefined && updatedUser.role !== null) {
        formData.append("roles", String(updatedUser.role));
      }

      // Append department as department_id if it exists
      if (
        updatedUser.department !== undefined &&
        updatedUser.department !== null
      ) {
        formData.append("department_id", String(updatedUser.department));
      }

      if (
        updatedUser.employeeId !== undefined &&
        updatedUser.employeeId !== null &&
        String(updatedUser.employeeId).trim() !== ""
      ) {
        formData.append("employee_id", String(updatedUser.employeeId).trim());
      }

      await apiService.updateEmployee(formData, updatedUser.id);

      // Add user to recently updated list for 10 second highlight
      const userId = Number(updatedUser.id);
      setRecentlyUpdatedIds(prev => new Set(prev).add(userId));
      
      // Remove highlight after 10 seconds with fade out
      setTimeout(() => {
        setRecentlyUpdatedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }, 10000);

      // Refresh user data to update the table immediately
      await refreshUserData(false);

      // Refresh dashboard data to get updated information

      // Show success toast
      toastMessages.user.updated(updatedUser.name);
    } catch (error: any) {
      if (error.response?.data?.errors) {
        Object.keys(error.response.data.errors).forEach((field) => {
          toastMessages.generic.error(
            "Update Failed",
            error.response.data.errors[field][0]
          );
        });
      }
    }
  };

  const handleDeleteEmployee = async (employee: any) => {
    setIsDeleting(true);
    try {
      // Actually delete the user (show loading spinner in button while this happens)
      await apiService.deleteUser(employee.id);

      // Set deleting state to show skeleton animation
      setDeletingUserId(employee.id);

      // Close modal after deletion API call completes
      setIsDeleteModalOpen(false);

      // Wait 2 seconds to show skeleton animation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Refresh data first, then reset deleting state after data loads
      await loadActiveUsers(debouncedActiveSearchTerm, debouncedRoleFilter);
      setDeletingUserId(null);

      toastMessages.user.deleted(employee.fname);
    } catch (error) {
      console.error("Error deleting user:", error);
      setDeletingUserId(null);
      setIsDeleteModalOpen(false);
      toastMessages.generic.error(
        "Error",
        "Failed to delete user. Please try again."
      );
    } finally {
      setIsDeleting(false);
      setEmployeeToDelete(null);
    }
  };

  const handleApproveRegistration = async (
    registrationId: number,
    registrationName: string
  ) => {
    try {
      await apiService.approveRegistration(registrationId);
      await loadPendingUsers(debouncedPendingSearchTerm, debouncedStatusFilter);
      toastMessages.user.approved(registrationName);
    } catch (error) {
      console.error("Error approving registration:", error);
      toastMessages.generic.error(
        "Approval Error",
        "An error occurred while approving the registration. Please try again."
      );
    }
  };

  const handleRejectRegistration = async (
    registrationId: number,
    registrationName: string
  ) => {
    try {
      // Set rejecting state to show red highlight
      setRejectingUserId(registrationId);
      
      // Wait for visual feedback (500ms delay)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Delete the account when rejected
      await apiService.deleteUser(registrationId);
      
      // Remove from list after deletion
      await loadPendingUsers(debouncedPendingSearchTerm, debouncedStatusFilter);
      
      // Clear rejecting state
      setRejectingUserId(null);
      
      toastMessages.user.rejected(registrationName);
    } catch (error) {
      console.error("Error rejecting registration:", error);
      setRejectingUserId(null);
      toastMessages.generic.error(
        "Rejection Error",
        "An error occurred while rejecting the registration. Please try again."
      );
    }
  };

  const handleAddUser = async (newUser: any) => {
    try {
      // Convert plain object to FormData - matching register page pattern
      const formDataToUpload = new FormData();
      formDataToUpload.append("fname", newUser.fname);
      formDataToUpload.append("lname", newUser.lname);
      formDataToUpload.append("username", newUser.username);
      formDataToUpload.append(
        "employee_id",
        String(newUser.employee_id ?? "").trim()
      );
      formDataToUpload.append("email", newUser.email);
      formDataToUpload.append("contact", newUser.contact);
      if (newUser.date_hired) {
        formDataToUpload.append("date_hired", newUser.date_hired);
      }
      formDataToUpload.append("position_id", String(newUser.position_id));
      formDataToUpload.append("branch_id", String(newUser.branch_id));
      formDataToUpload.append("department_id", String(newUser.department_id));
      formDataToUpload.append("password", newUser.password);
      // role_id is only for admin/HR adding users (not in register)
      formDataToUpload.append("role_id", String(newUser.role_id));

      const addUser = await apiService.addUser(formDataToUpload);

      await refreshUserData();

      toastMessages.user.created(newUser.fname);
      setIsAddUserModalOpen(false);
    } catch (error: any) {
      console.error("Error adding user:", error);
      console.error("Error response:", error.response?.data);
      toastMessages.generic.error(
        "Add Failed",
        error.response?.data?.message || "Failed to add user. Please try again."
      );
      throw error;
    }
  };

  // Handle page change for active users
  const handleActivePageChange = (page: number) => {
    setIsPageLoading(true);
    activePageChangeStartTimeRef.current = Date.now();
    setCurrentPageActive(page);
  };

  // Handle page change for pending users
  const handlePendingPageChange = (page: number) => {
    setIsPageLoading(true);
    pendingPageChangeStartTimeRef.current = Date.now();
    setCurrentPagePending(page);
  };

  // Get role color based on role name
  const getRoleColor = (roleName: string | undefined): string => {
    if (!roleName)
      return "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300";

    const role = roleName.toLowerCase();
    if (role === "admin") {
      return "bg-red-100 text-red-800 hover:bg-red-200 border-red-300";
    } else if (role === "hr") {
      return "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300";
    } else if (role === "evaluator") {
      return "bg-green-100 text-green-800 hover:bg-green-200 border-green-300";
    } else {
      return "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300";
    }
  };

  const handleTabChange = (nextTab: "active" | "new") => {
    setTab(nextTab);
  };

  return (
    <div className="relative overflow-y-auto pr-2 min-h-[400px]">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage system users and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6">
            <Button
              variant={tab === "active" ? "default" : "outline"}
              onClick={() => handleTabChange("active")}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span>👥</span>
              Active Users ({activeTotalItems})
            </Button>
            <Button
              variant={tab === "new" ? "default" : "outline"}
              onClick={() => handleTabChange("new")}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span>🆕</span>
              New Registrations ({pendingTotalItems})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Users Tab */}
      {tab === "active" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Approved Registrations</CardTitle>
            <CardDescription>List of Active Users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </span>
                    <Input
                      placeholder="Search users..."
                      className="w-64 pl-10"
                      value={activeSearchTerm}
                      onChange={(e) => setActiveSearchTerm(e.target.value)}
                    />
                    {activeSearchTerm && (
                      <button
                        onClick={() => setActiveSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors"
                        aria-label="Clear search"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <Select
                    value={roleFilter}
                    onValueChange={(value) => setRoleFilter(value)}
                  >
                    <SelectTrigger className="w-48 cursor-pointer">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All Roles</SelectItem>
                      {roles &&
                        Array.isArray(roles) &&
                        roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => refreshUserData(true)}
                    disabled={refresh}
                    className="flex items-center bg-blue-500 text-white hover:bg-blue-700 hover:text-white gap-2 cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {refresh ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75 hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-5 w-5 font-bold"
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
                        Refresh
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setIsAddUserModalOpen(true)}
                    className="flex items-center bg-blue-600 text-white hover:bg-green-700 hover:text-white gap-2 cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Plus className="h-5 w-5 font-bold " />
                    Add User
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBranchQuarterExportModalOpen(true)}
                    className="flex items-center gap-2 border-green-600 cursor-pointer bg-green-600 text-white hover:bg-green-700 hover:text-white"
                    title="Branch quarterly report — same flow as HR User Management"
                  >
                    <Download className="h-5 w-5 shrink-0" aria-hidden />
                    Export users
                  </Button>
                </div>
              </div>

              {/* Role and Status Color Indicators */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    Role Indicators:
                  </span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge
                      variant="outline"
                      className="bg-red-100 text-red-800 hover:bg-red-200 border-red-300"
                    >
                      Admin
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300"
                    >
                      HR
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300"
                    >
                      Evaluator
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300"
                    >
                      Employee
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    Status Indicators:
                  </span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300"
                    >
                      ✨ New Added 
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300"
                    >
                      🕐 Recently Added 
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300"
                    >
                      ✏️ Recently Updated 
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="relative overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refresh || isPageLoading ? (
                      Array.from({ length: itemsPerPage }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : activeRegistrations &&
                      Array.isArray(activeRegistrations) &&
                      activeRegistrations.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-gray-500"
                        >
                          <div className="flex flex-col items-center justify-center gap-4">
                            <img
                              src="/not-found.gif"
                              alt="No data"
                              className="w-25 h-25 object-contain"
                              style={{
                                imageRendering: "auto",
                                willChange: "auto",
                                transform: "translateZ(0)",
                                backfaceVisibility: "hidden",
                                WebkitBackfaceVisibility: "hidden",
                              }}
                            />
                            <div className="text-gray-500">
                              {activeSearchTerm ? (
                                <>
                                  <p className="text-base font-medium mb-1">
                                    No results found
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    Try adjusting your search or filters
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-base font-medium mb-1">
                                    No evaluation records to display
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    Records will appear here when evaluations
                                    are submitted
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : activeRegistrations &&
                      Array.isArray(activeRegistrations) &&
                      activeRegistrations.length > 0 ? (
                      activeRegistrations?.map((employee) => {
                        const isDeleting = deletingUserId === employee.id;
                        const createdDate = employee.created_at
                          ? new Date(employee.created_at)
                          : null;
                        let isNew = false;
                        let isRecentlyAdded = false;
                        let isRecentlyUpdated = false;

                        if (createdDate !== null) {
                          const now = new Date();
                          const minutesDiff =
                            (now.getTime() - createdDate.getTime()) /
                            (1000 * 60);
                          const hoursDiff = minutesDiff / 60;
                          isNew = hoursDiff <= 30;
                          isRecentlyAdded = hoursDiff > 30 && hoursDiff <= 40;
                        }

                        // Check if user is in the recently updated set (only set when explicitly edited via Edit modal)
                        const isJustUpdated = employee.id ? recentlyUpdatedIds.has(Number(employee.id)) : false;
                        
                        // Only show as updated if user was explicitly edited via Edit modal
                        if (isJustUpdated) {
                          isRecentlyUpdated = true;
                        }

                        return (
                          <TableRow
                            key={employee.id}
                            className={
                              isDeleting
                                ? "animate-slide-out-right bg-red-100 border-l-4 border-l-red-600"
                                : isRecentlyUpdated
                                ? "bg-yellow-100 border-l-4 border-l-yellow-600 hover:bg-yellow-200 animate-pulse transition-all duration-500 shadow-md"
                                : isNew
                                ? "bg-green-100 border-l-4 border-l-green-600 hover:bg-green-200 animate-pulse transition-all duration-300 shadow-md"
                                : isRecentlyAdded
                                ? "bg-blue-100 border-l-4 border-l-blue-600 hover:bg-blue-200 transition-all duration-300"
                                : "hover:bg-gray-50"
                            }
                          >
                            {isDeleting ? (
                              <>
                                <TableCell className="font-medium bg-red-300">
                                  <Skeleton className="h-4 w-32" />
                                </TableCell>
                                <TableCell className="bg-red-300">
                                  <Skeleton className="h-4 w-40" />
                                </TableCell>
                                <TableCell className="bg-red-300">
                                  <Skeleton className="h-4 w-24" />
                                </TableCell>
                                <TableCell className="bg-red-300">
                                  <Skeleton className="h-4 w-24" />
                                </TableCell>
                                <TableCell className="bg-red-300">
                                  <Skeleton className="h-5 w-16 rounded-full" />
                                </TableCell>
                                <TableCell className="bg-red-300">
                                  <div className="flex space-x-2">
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                  </div>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <span>
                                      {employee.fname + " " + employee.lname}
                                    </span>
                                    {isRecentlyUpdated && (
                                      <Badge className="bg-yellow-500 text-white text-xs px-2 py-0.5 font-semibold">
                                        🔄 Updated
                                      </Badge>
                                    )}
                                    {isNew && !isRecentlyUpdated && (
                                      <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 font-semibold">
                                        ✨ New
                                      </Badge>
                                    )}
                                    {isRecentlyAdded && !isNew && !isRecentlyUpdated && (
                                      <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5 font-semibold">
                                        🕐 Recent
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{employee.email}</TableCell>
                                <TableCell>
                                  {employee.positions?.label || "N/A"}
                                </TableCell>
                                <TableCell>
                                  {getEmployeeBranchCodeDisplay(
                                    employee,
                                    branchesData,
                                    refresh
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={getRoleColor(
                                      employee.roles &&
                                        Array.isArray(employee.roles) &&
                                        employee.roles[0]?.name
                                    )}
                                  >
                                    {(employee.roles &&
                                      Array.isArray(employee.roles) &&
                                      employee.roles[0]?.name) ||
                                      "N/A"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-200 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0"
                                      onClick={() => {
                                        setEmployeeToView(employee);
                                        setIsViewEmployeeModalOpen(true);
                                      }}
                                      disabled={deletingUserId !== null}
                                      title="View employee"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-200 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0"
                                      onClick={() => {
                                        setEmployeeForAverage(employee);
                                        setIsAverageModalOpen(true);
                                      }}
                                      disabled={deletingUserId !== null}
                                      title="View employee average"
                                    >
                                      <BarChart2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-200 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0"
                                      onClick={() => openEditModal(employee)}
                                      disabled={deletingUserId !== null}
                                      title="Edit employee"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-200 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0"
                                      onClick={() => openDeleteModal(employee)}
                                      disabled={deletingUserId !== null}
                                      title="Delete employee"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })
                    ) : null}
                  </TableBody>
                </Table>
              </div>
              <div>
                {tab === "active" && (
                  <div>
                    <EvaluationsPagination
                      currentPage={currentPageActive}
                      totalPages={totalActivePages}
                      total={activeTotalItems}
                      perPage={perPage}
                      onPageChange={handleActivePageChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Registrations Tab Content */}
      {tab === "new" && (
        <div className="relative mt-4">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>New Registrations</CardTitle>
              <CardDescription>
                Review and approve new user registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <div className="relative flex-1 max-w-md">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                      </span>
                      <Input
                        placeholder="Search new registrations..."
                        className="w-64 pl-10"
                        value={pendingSearchTerm}
                        onChange={(e) => setPendingSearchTerm(e.target.value)}
                      />

                      {pendingSearchTerm && (
                        <button
                          onClick={() => setPendingSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors"
                          aria-label="Clear search"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value)}
                    >
                      <SelectTrigger className="w-48 cursor-pointer">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">All Status</SelectItem>
                        <SelectItem value="pending">
                          Pending Verification
                        </SelectItem>                       
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => refreshUserData(true)}
                      disabled={refresh}
                      className="flex items-center gap-2 cursor-pointer bg-blue-500 text-white hover:bg-blue-700 hover:text-white hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {refresh ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75 "
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z "
                            ></path>
                          </svg>
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <svg
                            className="h-5 w-5 font-bold"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15 cursor-pointer"
                            />
                          </svg>
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Status Color Indicator */}
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                  <span className="text-sm font-medium text-gray-700">
                    Status Indicators:
                  </span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge
                      variant="outline"
                      className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300"
                    >
                      ⚡ New 
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300"
                    >
                      🕐 Recent 
                    </Badge>
                   
                  </div>
                </div>

                <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b border-gray-200">
                      <TableRow>
                        <TableHead className="px-6 py-3">Name</TableHead>
                        <TableHead className="px-6 py-3">Email</TableHead>
                        <TableHead className="px-6 py-3">Position</TableHead>
                        <TableHead className="px-6 py-3">Registration Date</TableHead>
                        <TableHead className="px-6 py-3">Status</TableHead>
                        <TableHead className="px-6 py-3">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-200">
                      {refresh || isPageLoading ? ( 
                        Array.from({ length: itemsPerPage }).map((_, index) => (
                          <TableRow key={`skeleton-${index}`}>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : pendingRegistrations.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-gray-500"
                          >
                            <div className="flex flex-col items-center justify-center gap-4">
                              <img
                                src="/not-found.gif"
                                alt="No data"
                                className="w-25 h-25 object-contain"
                                style={{
                                  imageRendering: "auto",
                                  willChange: "auto",
                                  transform: "translateZ(0)",
                                  backfaceVisibility: "hidden",
                                  WebkitBackfaceVisibility: "hidden",
                                }}
                              />
                              <div className="text-gray-500">
                                {pendingSearchTerm ? (
                                  <>
                                    <p className="text-base font-medium mb-1">
                                      No results found
                                    </p>
                                    <p className="text-sm text-gray-400">
                                      Try adjusting your search or filters
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-base font-medium mb-1">
                                      No new registrations
                                    </p>
                                    <p className="text-sm text-gray-400">
                                      New registrations will appear here
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : pendingRegistrations &&
                        Array.isArray(pendingRegistrations) &&
                        pendingRegistrations.length > 0 ? (
                        pendingRegistrations.map((account) => {
                          // Check if registration is new (within 24 hours) or recent (24-48 hours)
                          if (!account.created_at) return;
                          const registrationDate = new Date(account.created_at);
                          const now = new Date();
                          const hoursDiff =
                            (now.getTime() - registrationDate.getTime()) /
                            (1000 * 60 * 60);
                          const isNew = hoursDiff <= 24;
                          const isRecent = hoursDiff > 24 && hoursDiff <= 48;
                          const isRejected = account.is_active === "declined";

                          const isBeingRejected = rejectingUserId === account.id;
                          
                          return (
                            <TableRow
                              key={account.id}
                              className={
                                isBeingRejected
                                  ? "bg-red-200 border-l-4 border-l-red-600 animate-pulse transition-all duration-500"
                                  : isRejected
                                  ? "bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100"
                                  : isNew
                                  ? "bg-yellow-50 border-l-4 border-l-yellow-500 hover:bg-yellow-100"
                                  : isRecent
                                  ? "bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100"
                                  : "hover:bg-gray-50"
                              }
                            >
                              <TableCell className="px-6 py-3 font-medium">
                                <div className="flex items-center gap-2">
                                  <span>
                                    {account.fname + " " + account.lname}
                                  </span>
                                  {!isRejected && isNew && (
                                    <Badge className="bg-yellow-500 text-white text-xs px-2 py-0.5 font-semibold">
                                      ⚡ New
                                    </Badge>
                                  )}
                                  {!isRejected && isRecent && !isNew && (
                                    <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5 font-semibold">
                                      🕐 Recent
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                {account.email}
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                {account.positions?.label || "N/A"}
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                {new Date(
                                  account.created_at
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <Badge
                                  className={
                                    account.is_active === "declined"
                                      ? "bg-red-100 text-red-800 hover:bg-red-200"
                                      : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                  }
                                >
                                  {account.is_active === "declined"
                                    ? "REJECTED"
                                    : "PENDING VERIFICATION"}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="flex space-x-2">
                                  {account.is_active === "pending" && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white bg-green-500 hover:text-white hover:bg-green-600 cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
                                        onClick={() =>
                                          handleApproveRegistration(
                                            Number(account.id),
                                            account.fname
                                          )
                                        }
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white bg-red-500 hover:bg-red-600 hover:text-white cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
                                        onClick={() =>
                                          handleRejectRegistration(
                                            Number(account.id),
                                            account.fname
                                          )
                                        }
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {account.is_active === "declined" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
                                      onClick={() =>
                                        handleApproveRegistration(
                                          Number(account.id),
                                          account.fname
                                        )
                                      }
                                    >
                                      Approve
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  {tab === "new" && (
                    <div>
                      <EvaluationsPagination
                        currentPage={currentPagePending}
                        totalPages={totalPendingPages}
                        total={pendingTotalItems}
                        perPage={perPage}
                        onPageChange={handlePendingPageChange}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={userToEdit}
        onSave={handleSaveUser}
        departments={departmentData}
        branches={branchesData}
        positions={positionsData}
      />

      <BranchQuarterUserExportModal
        open={isBranchQuarterExportModalOpen}
        onOpenChange={setIsBranchQuarterExportModalOpen}
        branchesData={branchesData}
        departmentData={departmentData}
        shouldHideAdminUsers={false}
      />

      {/* Employee Average (same flow as HR user management) */}
      <Dialog
        open={isAverageModalOpen}
        onOpenChangeAction={(next) => {
          if (!next) {
            setIsAverageModalOpen(false);
            setEmployeeForAverage(null);
          }
        }}
      >
        <DialogContent
          className={`p-0 ${dialogAnimationClass} ${averageTableData ? "max-w-3xl" : "max-w-md"} relative overflow-hidden`}
        >
          <div
            className="relative overflow-hidden px-6 py-5"
            style={{
              backgroundImage: "url(/smct.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-blue-700/90 backdrop-blur-[1px]" />
            <div className="absolute top-3 right-3 z-20">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => {
                  setIsAverageModalOpen(false);
                  setEmployeeForAverage(null);
                }}
                className="cursor-pointer hover:bg-red-500 hover:text-white text-white h-8 w-8 rounded-full shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative z-10 pr-12 sm:pr-14">
              <DialogHeader className="pb-0 text-left">
                <DialogTitle className="flex items-center gap-3 text-xl text-white drop-shadow-md">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-lg">
                    <BarChart2 className="h-5 w-5 text-white" />
                  </div>
                  <span>Employee Average</span>
                </DialogTitle>
                <p className="mt-4 text-xl font-bold text-white/90 leading-snug">
                  {employeeForAverage
                    ? `${employeeForAverage.fname || ""} ${employeeForAverage.lname || ""}`.trim()
                    : "Select a year to view averages"}
                </p>
              </DialogHeader>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Label
                htmlFor="average-year"
                className="text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                Select Year:
              </Label>
              {loadingRecordedYears ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : recordedYearsForAverage.length === 0 ? (
                <p className="text-sm text-gray-500">No recorded years available.</p>
              ) : (
                <Select
                  value={averageModalYear}
                  onValueChange={(val) => {
                    setAverageModalYear(val);
                    void loadAverageTableForYear(val);
                  }}
                >
                  <SelectTrigger
                    id="average-year"
                    className="w-32 cursor-pointer border-gray-300 focus:ring-blue-500"
                  >
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {recordedYearsForAverage.map((y) => (
                      <SelectItem key={y.year} value={String(y.year)}>
                        {y.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {averageTableData && !loadingAverageTable && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={async () => {
                    if (!averageTableData || !employeeForAverage) return;
                    if (averageTableData.rows.length === 0) {
                      setShowAverageExportNoData(true);
                      return;
                    }
                    setIsAverageExporting(true);
                    try {
                      await new Promise((resolve) => setTimeout(resolve, 1000));
                      const employeeName =
                        `${employeeForAverage.fname || ""} ${employeeForAverage.lname || ""}`.trim();
                      const branch = getEmployeeBranchLabel(
                        employeeForAverage,
                        branchesData
                      );
                      const csvRows = [
                        [
                          "Name",
                          "Branch",
                          "Quarters",
                          "Rating",
                          "Performance score (%)",
                        ],
                        ...averageTableData.rows.map((row) => [
                          employeeName,
                          branch,
                          row.quarter,
                          row.rating > 0 ? row.rating.toString() : "—",
                          row.rating > 0
                            ? performanceScorePercent(row.rating)
                            : "—",
                        ]),
                        [
                          "",
                          "",
                          "Overall average",
                          averageTableData.average.toFixed(2),
                          performanceScorePercent(averageTableData.average),
                        ],
                      ];
                      const csvContent = csvRows.map((row) => row.join(",")).join("\n");
                      const blob = new Blob([csvContent], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `${employeeName.replace(/\s+/g, "_")}_Average_${averageModalYear}.csv`;
                      link.click();
                      URL.revokeObjectURL(url);
                      setShowAverageExportSuccess(true);
                    } catch {
                      setShowAverageExportError(true);
                    } finally {
                      setIsAverageExporting(false);
                    }
                  }}
                  disabled={isAverageExporting}
                  className="cursor-pointer bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}

            {!averageModalYear && !loadingAverageTable && !averageTableData && (
              <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Select a year to view averages</p>
                <p className="text-xs mt-1">Choose from the dropdown above</p>
              </div>
            )}

            {loadingAverageTable && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium">Loading evaluations...</p>
              </div>
            )}

            {averageTableData && !loadingAverageTable && (
              <div className="mt-4 space-y-3">
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
                        <TableHead className="font-semibold text-blue-800">Name</TableHead>
                        <TableHead className="font-semibold text-blue-800">Branch</TableHead>
                        <TableHead className="font-semibold text-blue-800">Quarter</TableHead>
                        <TableHead className="font-semibold text-blue-800">Rating</TableHead>
                        <TableHead
                          className="font-semibold text-blue-800 whitespace-nowrap"
                          title="Rating ÷ 5 × 100 (same scale as the chart)"
                        >
                          Performance score
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {averageTableData.rows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-gray-500 py-8"
                          >
                            <p className="font-medium">No evaluations recorded</p>
                            <p className="text-xs mt-1">
                              No data available for {averageModalYear}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {averageTableData.rows.map((row, idx) => (
                            <TableRow key={idx} className="hover:bg-gray-50 transition-colors">
                              <TableCell className="font-medium text-gray-800">
                                {employeeForAverage
                                  ? `${employeeForAverage.fname || ""} ${employeeForAverage.lname || ""}`.trim()
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {employeeForAverage
                                  ? getEmployeeBranchLabel(
                                      employeeForAverage,
                                      branchesData
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {row.quarter}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    row.rating >= 4
                                      ? "bg-green-100 text-green-800"
                                      : row.rating >= 3
                                        ? "bg-blue-100 text-blue-800"
                                        : row.rating >= 2.5
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {row.rating > 0 ? row.rating.toFixed(2) : "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    row.rating <= 0
                                      ? "bg-gray-100 text-gray-600"
                                      : row.rating >= 4
                                        ? "bg-green-100 text-green-800"
                                        : row.rating >= 3
                                          ? "bg-blue-100 text-blue-800"
                                          : row.rating >= 2.5
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {performanceScorePercent(row.rating)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold">
                            <TableCell colSpan={3} className="text-right">
                              Overall Average
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-white/20">
                                {averageTableData.average.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-white/20">
                                {performanceScorePercent(averageTableData.average)}
                              </span>
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {averageTableData.rows.length > 0 && (
                  <div className="border rounded-lg p-4 bg-white">
                    <h4 className="text-sm font-semibold mb-2 text-gray-700">
                      Rating by Quarter
                    </h4>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart
                        data={averageTableData.rows.map((row) => ({
                          quarter: row.quarter,
                          rating: row.rating,
                        }))}
                        margin={{ left: 0, right: 10, top: 10, bottom: 5 }}
                        barCategoryGap="20%"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="quarter"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                          interval={0}
                        />
                        <YAxis
                          domain={[0, 5]}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                          ticks={[0, 1, 2, 3, 4, 5]}
                          width={20}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            `${value.toFixed(2)}`,
                            "Rating",
                          ]}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }}
                          cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                        />
                        <Bar dataKey="rating" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {averageTableData.rows.map((row, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                row.rating >= 4
                                  ? "#22c55e"
                                  : row.rating >= 3
                                    ? "#3b82f6"
                                    : row.rating >= 2.5
                                      ? "#f59e0b"
                                      : "#ef4444"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-2 px-3 py-2 bg-gray-50 rounded-md border">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-green-500" />
                            <span className="text-xs text-gray-600">≥4</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-blue-500" />
                            <span className="text-xs text-gray-600">3-3.9</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                            <span className="text-xs text-gray-600">2.5-2.9</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-red-500" />
                            <span className="text-xs text-gray-600">&lt;2.5</span>
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded border">
                          <span className="font-semibold">
                            {averageTableData.rows.length}
                          </span>{" "}
                          eval{averageTableData.rows.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAverageExportNoData}
        onOpenChangeAction={(o) => {
          if (!o) setShowAverageExportNoData(false);
        }}
      >
        <DialogContent className="max-w-md p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <img
                src="/no-data.gif"
                alt="No data"
                className="w-40 h-40 object-contain"
              />
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">No Data to Export</h2>
            <p className="text-gray-600 text-sm mb-6 max-w-xs">
              There are no evaluations to export for this employee and year.
            </p>
            <Button
              type="button"
              onClick={() => setShowAverageExportNoData(false)}
              className="px-8 py-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAverageExporting} onOpenChangeAction={() => {}}>
        <DialogContent className="max-w-xs p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <img
                src="/smct.png"
                alt="SMCT Logo"
                className="w-24 h-auto object-contain"
              />
            </div>
            <div className="mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Exporting Data
            </h2>
            <p className="text-gray-500 text-sm">
              Please wait while we prepare your file...
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAverageExportSuccess}
        onOpenChangeAction={setShowAverageExportSuccess}
      >
        <DialogContent className="max-w-sm w-[90vw] px-6 py-6 text-center">
          <DialogHeader className="border-0 pb-0 text-center sm:text-center">
            <div className="relative mx-auto mb-5 flex h-[5.75rem] w-[5.75rem] items-center justify-center">
              <span
                className="absolute inset-0 rounded-full bg-emerald-400/30 motion-safe:animate-ping"
                style={{ animationDuration: "2.4s" }}
                aria-hidden
              />
              <div
                className="absolute inset-[3px] rounded-full bg-gradient-to-br from-emerald-100/90 to-green-50 blur-[1px]"
                aria-hidden
              />
              <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-700 shadow-[0_12px_40px_-8px_rgba(16,185,129,0.55)] ring-4 ring-white animate-success-badge-pop">
                <svg
                  className="h-11 w-11 text-white drop-shadow-sm"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    className="animate-success-check-draw"
                    d="M6.5 12.5l3.8 3.8L17.8 8.8"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Export Successful
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              Your average report CSV has been downloaded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center">
            <Button
              type="button"
              onClick={() => setShowAverageExportSuccess(false)}
              className="cursor-pointer rounded-lg bg-green-600 px-8 py-2 font-medium text-white transition-colors hover:bg-green-700"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAverageExportError}
        onOpenChangeAction={(o) => {
          if (!o) setShowAverageExportError(false);
        }}
      >
        <DialogContent className="max-w-sm w-[90vw] px-6 py-6 text-center">
          <DialogHeader className="border-0 pb-0 text-center sm:text-center">
            <div className="mb-4 flex justify-center">
              <img
                src="/no-data2.gif"
                alt=""
                className="h-32 w-32 object-contain"
              />
            </div>
              Something Went Wrong
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              We encountered an error while exporting your data. Please try again
              later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center">
            <Button
              type="button"
              onClick={() => setShowAverageExportError(false)}
              className="cursor-pointer rounded-lg bg-blue-600 px-8 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              OK
            </Button>
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
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <DialogHeader className="pb-4 bg-red-50 rounded-lg ">
            <DialogTitle className="text-red-800 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Delete Employee
            </DialogTitle>
            <DialogDescription className="text-red-700">
              This action cannot be undone. Are you sure you want to permanently
              delete {employeeToDelete?.fname}?
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
                    {employeeToDelete?.fname + " " + employeeToDelete?.lname}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {employeeToDelete?.email}
                  </p>
                  <p>
                    <span className="font-medium">Position:</span>{" "}
                    {employeeToDelete?.positions.label}
                  </p>
                  <p>
                    <span className="font-medium">Branch:</span>{" "}
                    {employeeToDelete
                      ? getEmployeeBranchCodeDisplay(
                          employeeToDelete as any,
                          branchesData,
                          refresh
                        )
                      : "N/A"}
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
                className="text-white bg-red-600 hover:text-white hover:bg-red-500 hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-red-700 text-white hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                onClick={() => handleDeleteEmployee(employeeToDelete)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  "❌ Delete Permanently"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddUserModalOpen}
        onClose={() => {
          setIsAddUserModalOpen(false);
        }}
        onSave={handleAddUser}
        departments={departmentData}
        branches={branchesData}
        positions={positionsData}
        roles={roles}
      />

      {employeeToView && (
        <ViewEmployeeModal
          isOpen={isViewEmployeeModalOpen}
          onCloseAction={() => {
            setIsViewEmployeeModalOpen(false);
            setEmployeeToView(null);
          }}
          employee={employeeToView}
          onStartEvaluationAction={() => {
            setIsViewEmployeeModalOpen(false);
            setEmployeeToView(null);
          }}
          onViewSubmissionAction={() => {}}
          designVariant="admin"
        />
      )}
    </div>
  );
}
