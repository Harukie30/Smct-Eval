"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Eye,
  FileText,
  Pencil,
  Plus,
  Trash2,
  BarChart2,
  X,
  Download,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EditUserModal from "@/components/EditUserModal";
import AddEmployeeModal from "@/components/AddEmployeeModal";
import { toastMessages } from "@/lib/toastMessages";
import apiService from "@/lib/apiService";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";
import EvaluationsPagination from "@/components/paginationComponent";
import ViewEmployeeModal from "@/components/ViewEmployeeModal";
import { User, useAuth } from "@/contexts/UserContext";
import { Combobox } from "@/components/ui/combobox";
import EvaluationForm from "@/components/evaluation";
import EvaluationTypeModal from "@/components/EvaluationTypeModal";
import BranchEvaluationForm from "@/components/evaluation/BranchEvaluationForm";
import BranchRankNfileEvaluationForm from "@/components/evaluation/BranchRankNfileEvaluationForm";
import BranchManagerEvaluationForm from "@/components/evaluation/BranchManagerEvaluationForm";
import AreaManagerEvaluationForm from "@/components/evaluation/AreaManagerEvaluationForm";
import RankNfileHo from "@/components/evaluation/RankNfileHo";
import BasicHo from "@/components/evaluation/BasicHo";

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

export default function UserManagementTab() {
  const { user } = useAuth();
  
  // Hide admin users in HR dashboard (only show in admin dashboard)
  const shouldHideAdminUsers = true; // Set to true for HR dashboard
  
  // Helper function to check if employee is HO (Head Office)
  // This determines the evaluationType based on the employee being evaluated, not the evaluator
  const isEmployeeHO = (employee: User | null): boolean => {
    if (!employee?.branches) return false;
    
    // Handle branches as array
    if (Array.isArray(employee.branches)) {
      const branch = employee.branches[0];
      if (branch) {
        const branchName = branch.branch_name?.toUpperCase() || "";
        const branchCode = branch.branch_code?.toUpperCase() || "";
        return (
          branchName === "HO" || 
          branchCode === "HO" || 
          branchName.includes("HEAD OFFICE") ||
          branchCode.includes("HEAD OFFICE") ||
          branchName === "HEAD OFFICE" ||
          branchCode === "HEAD OFFICE"
        );
      }
    }
    
    // Handle branches as object
    if (typeof employee.branches === 'object') {
      const branchName = (employee.branches as any)?.branch_name?.toUpperCase() || "";
      const branchCode = (employee.branches as any)?.branch_code?.toUpperCase() || "";
      return (
        branchName === "HO" || 
        branchCode === "HO" || 
        branchName.includes("HEAD OFFICE") ||
        branchCode.includes("HEAD OFFICE") ||
        branchName === "HEAD OFFICE" ||
        branchCode === "HEAD OFFICE"
      );
    }
    
    // Fallback: check if branch field exists directly
    if ((employee as any).branch) {
      const branchName = String((employee as any).branch).toUpperCase();
      return (
      branchName === "HO" || 
      branchName === "HEAD OFFICE" ||
      branchName.includes("HEAD OFFICE") ||
        branchName.includes("/HO")
      );
    }
    
    return false;
  };
  
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

  // Helper function to get branch code from branch data
  const getBranchCode = (branch: any): string => {
    if (!branch) return "N/A";
    
    // If branch has branch_code directly
    if (branch.branch_code) {
      return branch.branch_code;
    }
    
    // If branch has branch_name, try to find matching branch in branchesData
    if (branch.branch_name && branchesData.length > 0) {
      // branchesData comes from getBranches which returns { label: "branch_name / branch_code", value: "id" }
      const foundBranch = branchesData.find((b: any) => {
        if (b.label) {
          const labelParts = b.label.split(" /");
          return labelParts[0] === branch.branch_name;
        }
        return false;
      });
      
      if (foundBranch?.label) {
        const labelParts = foundBranch.label.split(" /");
        return labelParts[1] || labelParts[0] || branch.branch_name;
      }
    }
    
    // If branch is an ID, find branch in branchesData
    const branchId = Number(branch);
    if (!Number.isNaN(branchId) && branchesData.length > 0) {
      const foundBranch = branchesData.find(
        (b: any) => Number(b?.value) === branchId
      );
      if (foundBranch?.label) {
        const labelParts = String(foundBranch.label).split(" /");
        return (labelParts[1] || labelParts[0] || "N/A").trim();
      }
    }

    // Fallback to branch_name if code not found
    return branch.branch_name || "N/A";
  };

  const getUserBranchCode = (employee: User | null): string => {
    if (!employee) return "N/A";

    if (employee.branches) {
      const branchData = Array.isArray(employee.branches)
        ? employee.branches[0]
        : employee.branches;
      const codeFromBranches = getBranchCode(branchData);
      if (codeFromBranches !== "N/A") return codeFromBranches;
    }

    const employeeAny = employee as any;
    const branchIdOrValue = employeeAny.branch_id ?? employeeAny.branch;
    if (branchIdOrValue !== undefined && branchIdOrValue !== null && branchIdOrValue !== "") {
      return getBranchCode(branchIdOrValue);
    }

    return "N/A";
  };

  const getEmployeeBranchDisplay = (emp: User | null): string => {
    if (!emp?.branches) return "N/A";
    const b = Array.isArray(emp.branches) ? emp.branches[0] : (emp.branches as any);
    if (!b) return "N/A";
    const name = b.branch_name || b.name || "";
    const code = b.branch_code || b.code || getBranchCode(b);
    return code ? `${name || code} (${code})` : name || "N/A";
  };

  const isHOBranchSelected = (branchId: string): boolean => {
    if (!branchId) return false;
    const label =
      branchesData?.find((b: any) => String(b.value) === String(branchId))
        ?.label || "";
    const upper = String(label).toUpperCase();
    const parts = upper.split(" /");
    const name = (parts[0] || "").trim();
    const code = (parts[1] || "").trim();
    return (
      name === "HO" ||
      code === "HO" ||
      name === "HEAD OFFICE" ||
      code === "HEAD OFFICE" ||
      name.includes("HEAD OFFICE") ||
      code.includes("HEAD OFFICE")
    );
  };

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEvaluationTypeModalOpen, setIsEvaluationTypeModalOpen] =
    useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [evaluationType, setEvaluationType] = useState<
    "employee" | "manager" | "areaManager" | null
  >(null);

  // Use dialog animation hook (0.4s to match EditUserModal speed)
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<User | null>(null);
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
  //data to view
  const [employeeToView, setEmployeeToView] = useState<User | null>(null);
  const [isViewEmployeeModalOpen, setIsViewEmployeeModalOpen] = useState(false);
  const [employeeForAverage, setEmployeeForAverage] = useState<User | null>(null);
  const [isAverageModalOpen, setIsAverageModalOpen] = useState(false);
  const [showNoDataAlert, setShowNoDataAlert] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportError, setShowExportError] = useState(false);
  const [recordedYearsForAverage, setRecordedYearsForAverage] = useState<{ year: number }[]>([]);
  const [loadingRecordedYears, setLoadingRecordedYears] = useState(false);
  const [averageModalYear, setAverageModalYear] = useState<string>("");
  const [averageTableData, setAverageTableData] = useState<{ rows: { quarter: string; rating: number }[]; average: number } | null>(null);
  const [loadingAverageTable, setLoadingAverageTable] = useState(false);
  const [isBranchQuarterModalOpen, setIsBranchQuarterModalOpen] = useState(false);
  const [recordedYearsForBranchQuarter, setRecordedYearsForBranchQuarter] = useState<{ year: number }[]>([]);
  const [loadingRecordedYearsForBranchQuarter, setLoadingRecordedYearsForBranchQuarter] = useState(false);
  const [branchQuarterYear, setBranchQuarterYear] = useState<string>("");
  const [branchQuarterBranchId, setBranchQuarterBranchId] = useState<string>("");
  const [branchQuarterDepartmentId, setBranchQuarterDepartmentId] = useState<string>("");
  const [showExportMissingDataWarning, setShowExportMissingDataWarning] = useState(false);
  const [loadingBranchQuarterTable, setLoadingBranchQuarterTable] = useState(false);
  const [branchQuarterTableRows, setBranchQuarterTableRows] = useState<
    | {
        employeeId: number;
        name: string;
        branch: string;
        position: string;
        department: string;
        q1: number | null;
        q2: number | null;
        q3: number | null;
        q4: number | null;
        average: number | null;
      }[]
    | null
  >(null);
  const [selectedEmployeeForEvaluation, setSelectedEmployeeForEvaluation] =
    useState<User | null>(null);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);

  // Track when page change started for pending users
  const pendingPageChangeStartTimeRef = useRef<number | null>(null);

  const loadPendingUsers = async (
    searchValue: string,
    statusFilter: string
  ) => {
    try {
      const response = await apiService.getPendingRegistrations(
        searchValue,
        statusFilter,
        currentPagePending,
        itemsPerPage
      );

      setPendingRegistrations(response.data);
      setPendingTotalItems(response.total);
      setTotalPendingPages(response.last_page);
      setPerPage(response.per_page);
    } catch (error) {
      console.error("Error loading pending users:", error);
    } finally {
      // If this was a page change, ensure minimum display time (2 seconds)
      if (pendingPageChangeStartTimeRef.current !== null) {
        const elapsed = Date.now() - pendingPageChangeStartTimeRef.current;
        const minDisplayTime = 2000; // 2 seconds
        const remainingTime = Math.max(0, minDisplayTime - elapsed);

        setTimeout(() => {
          setIsPageLoading(false);
          pendingPageChangeStartTimeRef.current = null;
        }, remainingTime);
      }
    }
  };

  // Track when page change started for active users
  const activePageChangeStartTimeRef = useRef<number | null>(null);

  const loadActiveUsers = async (searchValue: string, roleFilter: string) => {
    try {
      const response = await apiService.getActiveRegistrations(
        searchValue,
        roleFilter,
        currentPageActive,
        itemsPerPage
      );

      setActiveRegistrations(response.data);
      setActiveTotalItems(response.total);
      setTotalActivePages(response.last_page);
      setPerPage(response.per_page);
    } catch (error) {
      console.error("Error loading active users:", error);
    } finally {
      // If this was a page change, ensure minimum display time (2 seconds)
      if (activePageChangeStartTimeRef.current !== null) {
        const elapsed = Date.now() - activePageChangeStartTimeRef.current;
        const minDisplayTime = 2000; // 2 seconds
        const remainingTime = Math.max(0, minDisplayTime - elapsed);

        setTimeout(() => {
          setIsPageLoading(false);
          activePageChangeStartTimeRef.current = null;
        }, remainingTime);
      }
    }
  };

  //render when page reload not loading not everySearch or Filters
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
        await loadActiveUsers(activeSearchTerm, roleFilter);
        await loadPendingUsers(pendingSearchTerm, statusFilter);
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
    const load = async () => {
      if (tab === "active") {
        await loadActiveUsers(activeSearchTerm, roleFilter);
      }
      if (tab === "new") {
        await loadPendingUsers(pendingSearchTerm, statusFilter);
      }
    };

    load();
  }, [tab]);

  //mount every activeSearchTerm changes and RoleFilter
  useEffect(() => {
    const handler = setTimeout(() => {
      if (tab === "active") {
        activeSearchTerm === "" ? currentPageActive : setCurrentPageActive(1);
        setDebouncedActiveSearchTerm(activeSearchTerm);
        setDebouncedRoleFilter(roleFilter);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [activeSearchTerm, roleFilter]);

  // Fetch API whenever debounced active search term changes
  useEffect(() => {
    const fetchData = async () => {
      if (tab === "active") {
        await loadActiveUsers(debouncedActiveSearchTerm, debouncedRoleFilter);
      }
    };

    fetchData();
  }, [debouncedActiveSearchTerm, debouncedRoleFilter, currentPageActive]);

  //mount every pendingSearchTerm changes and statusFilter
  useEffect(() => {
    const handler = setTimeout(() => {
      if (tab === "new") {
        pendingSearchTerm === ""
          ? currentPagePending
          : setCurrentPagePending(1);
        setDebouncedPendingSearchTerm(pendingSearchTerm);
        setDebouncedStatusFilter(statusFilter);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [pendingSearchTerm, statusFilter]);

  // Fetch API whenever debounced pending search term changes
  useEffect(() => {
    const fetchData = async () => {
      if (tab === "new") {
        await loadPendingUsers(
          debouncedPendingSearchTerm,
          debouncedStatusFilter
        );
      }
    };

    fetchData();
  }, [debouncedPendingSearchTerm, debouncedStatusFilter, currentPagePending]);

  // Function to refresh user data
  const refreshUserData = async (showLoading = false) => {
    try {
      setRefresh(true);
      if (tab === "new") {
        await loadPendingUsers(pendingSearchTerm, statusFilter);
      }
      if (tab === "active") {
        await loadActiveUsers(activeSearchTerm, roleFilter);
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

  const loadAverageTableForYear = async (year?: string) => {
    const targetYear = year || averageModalYear;
    if (!employeeForAverage?.id || !targetYear) return;
    setLoadingAverageTable(true);
    setAverageTableData(null);
    try {
      const employeeName = `${employeeForAverage.fname || ""} ${employeeForAverage.lname || ""}`.trim();
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
        const evEmpId = ev.employee?.id != null ? Number(ev.employee.id) : null;
        return evEmpId === employeeId || (ev.employee?.fname && ev.employee?.lname && `${ev.employee.fname} ${ev.employee.lname}`.trim() === employeeName);
      });
      const getQuarter = (ev: any): string => {
        if (ev.reviewTypeOthersImprovement || (ev.reviewTypeOthersCustom && String(ev.reviewTypeOthersCustom).trim())) return "Others";
        if (ev.reviewTypeProbationary != null && ev.reviewTypeProbationary !== "" && ev.reviewTypeProbationary !== "null") return `M${ev.reviewTypeProbationary}`;
        if (ev.reviewTypeRegular) return String(ev.reviewTypeRegular);
        const d = new Date(ev.created_at || ev.submittedAt);
        const m = d.getMonth() + 1;
        return `Q${Math.ceil(m / 3)}`;
      };
      const rows = forEmployee.map((ev: any) => ({
        quarter: getQuarter(ev),
        rating: Number(ev.rating) || 0,
      }));
      const sum = rows.reduce((acc: number, r: { quarter: string; rating: number }) => acc + r.rating, 0);
      const average = rows.length > 0 ? sum / rows.length : 0;
      setAverageTableData({ rows, average });
    } catch {
      setAverageTableData({ rows: [], average: 0 });
    } finally {
      setLoadingAverageTable(false);
    }
  };

  const showDepartmentInBranchQuarter = isHOBranchSelected(branchQuarterBranchId);

  // Load branch quarterly data for all employees in that branch+year.
  // Table shows Q1-Q4 and an average over only the quarters that exist.
  const loadBranchQuarterTable = async () => {
    const targetYear = branchQuarterYear;
    const targetBranchId = branchQuarterBranchId;
    const targetDepartmentId = branchQuarterDepartmentId;

    if (!targetYear || !targetBranchId) return;

    setLoadingBranchQuarterTable(true);
    setBranchQuarterTableRows(null);

    try {
      // Fetch all active users in this branch, then keep only HR/Evaluator/Employee roles.
      const userResp = await apiService.getActiveRegistrations(
        "",
        "0",
        1,
        2000,
        targetBranchId,
        // Department filter should only apply for HO; otherwise ignore.
        showDepartmentInBranchQuarter ? targetDepartmentId : ""
      );

      const usersList: any[] = Array.isArray(userResp)
        ? userResp
        : userResp?.data || userResp?.users || [];

      const allowedRoleNames = new Set(["employee", "hr", "evaluator"]);
      const employeesList = usersList.filter((u: any) => {
        const roleName =
          u?.roles && Array.isArray(u.roles) ? u.roles[0]?.name : "";
        const normalized = String(roleName || "").toLowerCase();
        // Exclude Admin (and anything else we don't explicitly want)
        if (!allowedRoleNames.has(normalized)) return false;
        return true;
      });

      // 2) Fetch all evaluations for this branch+year.
      const evalResp = await apiService.getSubmissions(
        "",
        1,
        5000,
        "",
        "",
        targetYear,
        "",
        targetBranchId
      );

      const evaluationsList: any[] = Array.isArray(evalResp)
        ? evalResp
        : evalResp?.data || [];

      const quarterMap: Record<
        number,
        { q1: number | null; q2: number | null; q3: number | null; q4: number | null }
      > = {};

      const getQuarter = (ev: any): "Q1" | "Q2" | "Q3" | "Q4" | null => {
        const regular = ev?.reviewTypeRegular;
        if (typeof regular === "string") {
          if (regular.includes("Q1")) return "Q1";
          if (regular.includes("Q2")) return "Q2";
          if (regular.includes("Q3")) return "Q3";
          if (regular.includes("Q4")) return "Q4";
        }

        const dt = ev?.created_at || ev?.submittedAt || ev?.createdAt;
        if (!dt) return null;
        const d = new Date(dt);
        if (isNaN(d.getTime())) return null;
        const month = d.getMonth() + 1;

        if (month >= 1 && month <= 3) return "Q1";
        if (month >= 4 && month <= 6) return "Q2";
        if (month >= 7 && month <= 9) return "Q3";
        return "Q4";
      };

      const ensureBucket = (employeeId: number) => {
        if (!quarterMap[employeeId]) {
          quarterMap[employeeId] = { q1: null, q2: null, q3: null, q4: null };
        }
        return quarterMap[employeeId];
      };

      const allowedEmployeeIds = new Set(
        employeesList
          .map((u: any) => (u?.id != null ? Number(u.id) : NaN))
          .filter((id: number) => Number.isFinite(id))
      );

      evaluationsList.forEach((ev: any) => {
        const emp = ev?.employee || {};
        const idRaw =
          emp?.id ?? ev?.employee_id ?? ev?.employeeId ?? ev?.emp_id;
        const employeeId = idRaw != null ? Number(idRaw) : NaN;
        if (!Number.isFinite(employeeId)) return;
        if (!allowedEmployeeIds.has(employeeId)) return;

        const quarter = getQuarter(ev);
        if (!quarter) return;

        const ratingVal = Number(ev?.rating);
        // Treat missing/0 as no rating => render as "-"
        if (!Number.isFinite(ratingVal) || ratingVal <= 0) return;

        const bucket = ensureBucket(employeeId);
        if (quarter === "Q1") bucket.q1 = ratingVal;
        if (quarter === "Q2") bucket.q2 = ratingVal;
        if (quarter === "Q3") bucket.q3 = ratingVal;
        if (quarter === "Q4") bucket.q4 = ratingVal;
      });

      const rows = employeesList.map((emp: any) => {
        const employeeId = emp?.id != null ? Number(emp.id) : NaN;
        const bucket =
          quarterMap[Number.isFinite(employeeId) ? employeeId : -1] || {
            q1: null,
            q2: null,
            q3: null,
            q4: null,
          };

        const ratings = [bucket.q1, bucket.q2, bucket.q3, bucket.q4].filter(
          (v): v is number => typeof v === "number" && !isNaN(v)
        );
        const averageVal =
          ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

        return {
          employeeId,
          name: `${emp?.fname || ""} ${emp?.lname || ""}`.trim(),
          branch: getEmployeeBranchDisplay(emp as any),
          position:
            emp?.positions?.label ||
            emp?.position ||
            emp?.positions?.name ||
            "N/A",
          department:
            emp?.departments?.department_name ||
            emp?.departments?.label ||
            emp?.department ||
            "N/A",
          q1: bucket.q1,
          q2: bucket.q2,
          q3: bucket.q3,
          q4: bucket.q4,
          average:
            averageVal != null ? Number(averageVal.toFixed(2)) : null,
        };
      });

      setBranchQuarterTableRows(rows);
    } catch (error) {
      console.error("Error loading branch quarter table:", error);
      setBranchQuarterTableRows([]);
    } finally {
      setLoadingBranchQuarterTable(false);
    }
  };

  // Load recorded years for the branch quarterly report modal.
  useEffect(() => {
    if (!isBranchQuarterModalOpen) {
      setRecordedYearsForBranchQuarter([]);
      setBranchQuarterYear("");
      setBranchQuarterBranchId("");
      setBranchQuarterDepartmentId("");
      setBranchQuarterTableRows(null);
      return;
    }

    let cancelled = false;
    setLoadingRecordedYearsForBranchQuarter(true);
    apiService
      .getAllYears()
      .then((years: { year: number }[]) => {
        if (cancelled || !Array.isArray(years)) return;
        const sorted = [...years].sort((a, b) => b.year - a.year);
        setRecordedYearsForBranchQuarter(sorted);

        const currentYear = new Date().getFullYear();
        const match = sorted.find((y) => Number(y.year) === currentYear);
        setBranchQuarterYear(match ? String(match.year) : "");
      })
      .catch(() => {
        if (!cancelled) setRecordedYearsForBranchQuarter([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecordedYearsForBranchQuarter(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBranchQuarterModalOpen]);

  // If user switches away from HO branch, clear Department filter.
  useEffect(() => {
    if (!showDepartmentInBranchQuarter && branchQuarterDepartmentId) {
      setBranchQuarterDepartmentId("");
    }
  }, [showDepartmentInBranchQuarter, branchQuarterDepartmentId]);

  // Load the quarterly table when Year+Branch are selected.
  useEffect(() => {
    if (!isBranchQuarterModalOpen) return;
    if (!branchQuarterYear || !branchQuarterBranchId) return;
    void loadBranchQuarterTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isBranchQuarterModalOpen,
    branchQuarterYear,
    branchQuarterBranchId,
    branchQuarterDepartmentId,
    showDepartmentInBranchQuarter,
  ]);

  const performBranchQuarterExport = async () => {
    if (!branchQuarterTableRows || branchQuarterTableRows.length === 0) return;
    setShowExportMissingDataWarning(false);
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const branchLabel =
        branchesData?.find(
          (b: any) => String(b.value) === String(branchQuarterBranchId)
        )?.label || branchQuarterBranchId || "Branch";
      const safeYear = branchQuarterYear || "Year";
      const csvRows: string[][] = [
        showDepartmentInBranchQuarter
          ? ["Name", "Branch", "Department", "Position", "Q1", "Q2", "Q3", "Q4", "Average"]
          : ["Name", "Branch", "Position", "Q1", "Q2", "Q3", "Q4", "Average"],
        ...branchQuarterTableRows.map((row) =>
          showDepartmentInBranchQuarter
            ? [
                row.name,
                row.branch,
                row.department,
                row.position,
                row.q1 != null ? row.q1.toFixed(2) : "-",
                row.q2 != null ? row.q2.toFixed(2) : "-",
                row.q3 != null ? row.q3.toFixed(2) : "-",
                row.q4 != null ? row.q4.toFixed(2) : "-",
                row.average != null ? row.average.toFixed(2) : "-",
              ]
            : [
                row.name,
                row.branch,
                row.position,
                row.q1 != null ? row.q1.toFixed(2) : "-",
                row.q2 != null ? row.q2.toFixed(2) : "-",
                row.q3 != null ? row.q3.toFixed(2) : "-",
                row.q4 != null ? row.q4.toFixed(2) : "-",
                row.average != null ? row.average.toFixed(2) : "-",
              ]
        ),
      ];
      const escapeCell = (cell: string) => {
        const str = String(cell ?? "");
        return `"${str.replace(/"/g, '""')}"`;
      };
      const csvContent = csvRows
        .map((row) => row.map(escapeCell).join(","))
        .join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filenameSafe = `${branchLabel.replace(/\s+/g, "_")}_QuarterSummary_${safeYear}`.replace(
        /[<>:"/\\|?*]+/g,
        ""
      );
      link.download = `${filenameSafe}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting branch quarter CSV:", error);
      setShowExportError(true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBranchQuarterCSV = () => {
    if (!branchQuarterTableRows || branchQuarterTableRows.length === 0) {
      setShowNoDataAlert(true);
      return;
    }
    const hasEmployeesWithMissingData = branchQuarterTableRows.some(
      (row) =>
        row.q1 == null || row.q2 == null || row.q3 == null || row.q4 == null
    );
    if (hasEmployeesWithMissingData) {
      setShowExportMissingDataWarning(true);
      return;
    }
    performBranchQuarterExport();
  };

  // Load recorded years when Average modal opens (years that have evaluation data)
  useEffect(() => {
    if (!isAverageModalOpen) {
      setRecordedYearsForAverage([]);
      setAverageModalYear("");
      setAverageTableData(null);
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
            key === "department"
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
    try {
      // Set deleting state to show skeleton animation
      setDeletingUserId(employee.id);

      // Close modal immediately
      setIsDeleteModalOpen(false);

      // Wait 2 seconds to show skeleton animation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Actually delete the user
      await apiService.deleteUser(employee.id);

      // Refresh data first, then reset deleting state after data loads
      await loadActiveUsers(activeSearchTerm, roleFilter);
      setDeletingUserId(null);

      toastMessages.user.deleted(employee.fname);
    } catch (error) {
      console.error("Error deleting user:", error);
      setDeletingUserId(null);
      toastMessages.generic.error(
        "Error",
        "Failed to delete user. Please try again."
      );
    } finally {
      setEmployeeToDelete(null);
    }
  };

  const handleApproveRegistration = async (
    registrationId: number,
    registrationName: string
  ) => {
    try {
      await apiService.approveRegistration(registrationId);
      await loadPendingUsers(pendingSearchTerm, statusFilter);
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
      await loadPendingUsers(pendingSearchTerm, statusFilter);
      
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
      // Remove dash from employee_id before sending (keep only numbers)
      formDataToUpload.append(
        "employee_id",
        newUser.employee_id.replace(/-/g, "")
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

  // Handle tab change with refresh
  const handleTabChange = async (tab: "active" | "new") => {
    try {
      setTab(tab);
      await refreshUserData(true);
    } catch (error) {
      console.log(error);
    } finally {
      setRefresh(false);
    }
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-4 flex-1 min-w-0">
                  <div className="relative flex-1">
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
                      className=" pl-10"
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
                  <div>
                    <Select
                      value={roleFilter}
                      onValueChange={(value) => {
                        setRoleFilter(value);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">All Roles</SelectItem>
                        {roles
                          .filter((role) => {
                            // Hide admin role in HR dashboard
                            if (shouldHideAdminUsers) {
                              return role.name !== "admin";
                            }
                            return true;
                          })
                          .map((role) => (
                          <SelectItem key={role.id} value={String(role.id)}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {roleFilter !== "0" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRoleFilter("0");
                        }}
                        className="text-red-500 bg-amber-50"
                      >
                        Clear Filter
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 flex-nowrap">
                    <Button
                      variant="outline"
                      onClick={() => refreshUserData(true)}
                      disabled={refresh}
                      className="flex items-center bg-blue-500 text-white hover:bg-blue-700 hover:text-white gap-2 cursor-pointer hover:scale-105 transition-transform duration-200 whitespace-nowrap"
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
                              className="opacity-75"
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
                      className="flex items-center bg-blue-600 text-white hover:bg-green-700 hover:text-white gap-2 cursor-pointer hover:scale-105 transition-transform duration-200 whitespace-nowrap"
                    >
                      <Plus className="h-5 w-5 font-bold " />
                      Add User
                    </Button>
                    <Button
                      onClick={() => {
                        setIsBranchQuarterModalOpen(true);
                        setBranchQuarterTableRows(null);
                        setBranchQuarterYear("");
                        setBranchQuarterBranchId(
                          branchesData && branchesData.length > 0
                            ? String(branchesData[0].value)
                            : ""
                        );
                      }}
                      className="flex items-center bg-green-600 text-white hover:bg-green-700 hover:text-white gap-2 cursor-pointer hover:scale-105 transition-transform duration-200 whitespace-nowrap"
                    >
                      <Download className="h-5 w-5 font-bold" />
                      Export Users
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
                      className="bg-blue-700 text-white hover:bg-blue-700 border-blue-300"
                    >
                      HR
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-green-700 text-white hover:bg-green-700 border-green-300"
                    >
                      Evaluator
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-gray-700 text-gray-100 hover:bg-gray-700 border-gray-300"
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
                      className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300"
                    >
                      🔄 Recently Updated
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-green-700 text-white hover:bg-green-700 border-green-300"
                      >
                      ✨ New Added 
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-blue-700 text-white hover:bg-blue-700 border-blue-300"
                    >
                      🕐 Recently Added
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
                      activeRegistrations
                        ?.filter((employee) => {
                          // Hide admin users in HR dashboard
                          if (shouldHideAdminUsers) {
                            const roleName = employee.roles &&
                              Array.isArray(employee.roles) &&
                              employee.roles[0]?.name;
                            return roleName !== "admin";
                          }
                          return true;
                        })
                        .map((employee) => {
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

                       // Check if user is in the recently updated set (explicit front-end edit)
                       // This is only set when saving from the Edit User modal, so approving
                       // a new registration will not mistakenly show as "Updated".
                       const isJustUpdated = employee.id
                         ? recentlyUpdatedIds.has(Number(employee.id))
                         : false;
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
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-16" />
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
                                <TableCell>{getUserBranchCode(employee)}</TableCell>
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
                                      className="text-green-600 hover:text-green-700 hover:bg-green-200 cursor-pointer hover:scale-110 transition-transform duration-200"
                                      onClick={() => {
                                        setEmployeeToView(employee);
                                        setIsViewEmployeeModalOpen(true);
                                      }}
                                      disabled={deletingUserId !== null}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-200 cursor-pointer hover:scale-110 transition-transform duration-200"
                                      onClick={() => {
                                        setIsEvaluationTypeModalOpen(true);
                                        setSelectedEmployeeForEvaluation(
                                          employee
                                        );
                                      }}
                                      title="Evaluate employee performance"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-200 cursor-pointer hover:scale-110 transition-transform duration-200"
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
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-200 cursor-pointer hover:scale-120 transition-transform duration-200"
                                      onClick={() => openEditModal(employee)}
                                      disabled={deletingUserId !== null}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-200 cursor-pointer hover:scale-120 transition-transform duration-200"
                                      onClick={() => openDeleteModal(employee)}
                                      disabled={deletingUserId !== null}
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
                        <SelectItem value="declined">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => refreshUserData(true)}
                      disabled={refresh}
                      className="flex items-center gap-2 cursor-pointer bg-blue-500 text-white hover:bg-blue-700 hover:text-white hover:scale-105 transition-transform duration-200"
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
                              className="opacity-75"
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
                      ⚡ New (≤24h)
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300"
                    >
                      🕐 Recent (24-48h)
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-red-100 text-red-800 hover:bg-red-200 border-red-300"
                    >
                      ✗ Rejected
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
                        <TableHead className="px-6 py-3">
                          Registration Date
                        </TableHead>
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
                        pendingRegistrations
                          .filter((account) => {
                            // Hide admin users in HR dashboard
                            if (shouldHideAdminUsers) {
                              const roleName = account.roles &&
                                Array.isArray(account.roles) &&
                                account.roles[0]?.name;
                              return roleName !== "admin";
                            }
                            return true;
                          })
                          .map((account) => {
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
                    {getUserBranchCode(employeeToDelete)}
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
                className="text-white bg-red-600 hover:text-white hover:bg-red-500 cursor-pointer hover:scale-110 transition-transform duration-200"
              >
                Cancel
              </Button>
              <Button
                disabled={isDeletingEmployee}
                className={`bg-blue-600 hover:bg-red-700 text-white cursor-pointer
    hover:scale-110 transition-transform duration-200
    ${isDeletingEmployee ? "opacity-70 cursor-not-allowed hover:scale-100" : ""}
  `}
                onClick={async () => {
                  if (!employeeToDelete) return;

                  setIsDeletingEmployee(true);

                  try {
                    await handleDeleteEmployee(employeeToDelete);
                  } finally {
                    setIsDeletingEmployee(false);
                  }
                }}
              >
                {isDeletingEmployee ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>❌ Delete Permanently</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Average Modal */}
      <Dialog
        open={isAverageModalOpen}
        onOpenChangeAction={(open) => {
          if (!open) {
            setIsAverageModalOpen(false);
            setEmployeeForAverage(null);
          }
        }}
      >
        <DialogContent className={`p-0 ${dialogAnimationClass} ${averageTableData ? "max-w-2xl" : "max-w-md"} relative overflow-hidden`}>
          {/* Header — same pattern as notification modal (DashboardShell) */}
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
                <p className="mt-2 text-sm text-white/90 leading-snug">
                  {employeeForAverage
                    ? `${employeeForAverage.fname || ""} ${employeeForAverage.lname || ""}`.trim()
                    : "Select a year to view averages"}
                </p>
              </DialogHeader>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6 space-y-4">
            {/* Year Selector */}
            <div className="flex items-center gap-4">
              <Label htmlFor="average-year" className="text-sm font-medium text-gray-700 whitespace-nowrap">
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
                    loadAverageTableForYear(val);
                  }}
                >
                  <SelectTrigger id="average-year" className="w-32 cursor-pointer border-gray-300 focus:ring-blue-500">
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
                  onClick={async () => {
                    if (!averageTableData || !employeeForAverage) return;
                    if (averageTableData.rows.length === 0) {
                      setShowNoDataAlert(true);
                      return;
                    }
                    setIsExporting(true);
                    try {
                      await new Promise((resolve) => setTimeout(resolve, 1000));
                      const employeeName = `${employeeForAverage.fname || ""} ${employeeForAverage.lname || ""}`.trim();
                      const branch = getEmployeeBranchDisplay(employeeForAverage);
                      const csvRows = [
                        ["Name", "Branch", "Quarters", "Rating"],
                        ...averageTableData.rows.map((row) => [
                          employeeName,
                          branch,
                          row.quarter,
                          row.rating > 0 ? row.rating.toString() : "—",
                        ]),
                        ["", "", "Average", averageTableData.average.toFixed(2)],
                      ];
                      const csvContent = csvRows.map((row) => row.join(",")).join("\n");
                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `${employeeName.replace(/\s+/g, "_")}_Average_${averageModalYear}.csv`;
                      link.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      setShowExportError(true);
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  disabled={isExporting}
                  className="cursor-pointer bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}

            {/* Empty State */}
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
                {/* Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
                        <TableHead className="font-semibold text-blue-800">Name</TableHead>
                        <TableHead className="font-semibold text-blue-800">Branch</TableHead>
                        <TableHead className="font-semibold text-blue-800">Quarter</TableHead>
                        <TableHead className="font-semibold text-blue-800">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {averageTableData.rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            <p className="font-medium">No evaluations recorded</p>
                            <p className="text-xs mt-1">No data available for {averageModalYear}</p>
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
                              <TableCell className="text-gray-600">{employeeForAverage ? getEmployeeBranchDisplay(employeeForAverage) : "—"}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {row.quarter}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  row.rating >= 4 ? "bg-green-100 text-green-800" :
                                  row.rating >= 3 ? "bg-blue-100 text-blue-800" :
                                  row.rating >= 2.5 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                                }`}>
                                  {row.rating > 0 ? row.rating.toFixed(2) : "—"}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold">
                            <TableCell colSpan={3} className="text-right">Overall Average</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-white/20">
                                {averageTableData.average.toFixed(2)}
                              </span>
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Rating Chart - Below Table */}
                {averageTableData.rows.length > 0 && (
                  <div className="border rounded-lg p-4 bg-white">
                    <h4 className="text-sm font-semibold mb-2 text-gray-700">Rating by Quarter</h4>
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
                          formatter={(value: number) => [`${value.toFixed(2)}`, "Rating"]}
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
                                row.rating >= 4 ? "#22c55e" :
                                row.rating >= 3 ? "#3b82f6" :
                                row.rating >= 2.5 ? "#f59e0b" : "#ef4444"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-2 px-3 py-2 bg-gray-50 rounded-md border">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-500"></span><span className="text-xs text-gray-600">≥4</span></span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500"></span><span className="text-xs text-gray-600">3-3.9</span></span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span><span className="text-xs text-gray-600">2.5-2.9</span></span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500"></span><span className="text-xs text-gray-600">&lt;2.5</span></span>
                        </div>
                        <div className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded border">
                          <span className="font-semibold">{averageTableData.rows.length}</span> eval{averageTableData.rows.length !== 1 ? "s" : ""}
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

      {/* Branch Quarterly Report Modal */}
      <Dialog
        open={isBranchQuarterModalOpen}
        onOpenChangeAction={(open) => {
          if (!open) {
            setIsBranchQuarterModalOpen(false);
            setBranchQuarterTableRows(null);
            setBranchQuarterYear("");
            setBranchQuarterBranchId("");
          }
        }}
      >
        <DialogContent className={`p-0 ${dialogAnimationClass} max-w-5xl max-h-[85vh] overflow-hidden relative`}>
          {/* Header — same pattern as notification modal (DashboardShell) */}
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
                onClick={() => {
                  setIsBranchQuarterModalOpen(false);
                  setBranchQuarterTableRows(null);
                  setBranchQuarterYear("");
                  setBranchQuarterBranchId("");
                }}
                className="cursor-pointer hover:bg-white/20 text-white h-8 w-8 rounded-full shrink-0"
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
                  <span>Branch Quarterly Report</span>
                </DialogTitle>
                <p className="mt-2 text-sm text-white/90 leading-snug">
                  Select Year and Branch to export
                </p>
              </DialogHeader>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto p-6 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4">
                <Label
                  htmlFor="branch-quarter-year"
                  className="text-sm font-medium cursor-pointer text-gray-700 whitespace-nowrap"
                >
                  Year:
                </Label>
                {loadingRecordedYearsForBranchQuarter ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <Combobox
                    options={recordedYearsForBranchQuarter.map((y) => ({
                      value: String(y.year),
                      label: String(y.year),
                    }))}
                    value={branchQuarterYear}
                    onValueChangeAction={(value) => {
                      setBranchQuarterYear(String(value));
                    }}
                    placeholder="Select year"
                    searchPlaceholder="Search years..."
                    emptyText="No years found."
                    className="w-32"
                  />
                )}
              </div>

              <div className="flex items-center gap-4">
                <Label
                  htmlFor="branch-quarter-branch"
                  className="text-sm font-medium text-gray-700 whitespace-nowrap"
                >
                  Branch:
                </Label>
                <Combobox
                  options={branchesData.map((b: any) => ({
                    value: String(b.value),
                    label: b.label,
                  }))}
                  value={branchQuarterBranchId}
                  onValueChangeAction={(value) => {
                    setBranchQuarterBranchId(String(value));
                  }}
                  placeholder="Select branch"
                  searchPlaceholder="Search branches..."
                  emptyText="No branches found."
                  className="w-64"
                />
              </div>

              {showDepartmentInBranchQuarter && (
                <div className="flex items-center gap-4">
                  <Label
                    htmlFor="branch-quarter-department"
                    className="text-sm font-medium text-gray-700 whitespace-nowrap"
                  >
                    Department:
                  </Label>
                  <Combobox
                    options={departmentData.map((d: any) => ({
                      value: String(d.value),
                      label: d.label,
                    }))}
                    value={branchQuarterDepartmentId}
                    onValueChangeAction={(value) => {
                      setBranchQuarterDepartmentId(String(value));
                    }}
                    placeholder="All departments"
                    searchPlaceholder="Search departments..."
                    emptyText="No departments found."
                    className="w-64"
                  />
                </div>
              )}
            </div>

            {/* Indicators */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-wrap">
              <span className="text-sm font-medium text-gray-700">
                Indicators:
              </span>
              <div className="flex items-center gap-3 flex-wrap text-sm text-gray-600">
                <span className="inline-flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white border border-gray-200 font-mono text-gray-800">
                    —
                  </span>
                  No evaluation for that quarter
                </span>
                <span className="text-gray-300">|</span>
                <span>Average is computed from available quarters only</span>
              </div>
            </div>

            {branchQuarterTableRows && !loadingBranchQuarterTable && (
              <div className="flex justify-end">
                <Button
                  onClick={handleExportBranchQuarterCSV}
                  disabled={isExporting}
                  className="cursor-pointer bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}

            {/* Empty state */}
            {!branchQuarterYear || !branchQuarterBranchId ? (
              <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Select a year and branch</p>
                <p className="text-xs mt-1">Then the table will load automatically</p>
              </div>
            ) : null}

            {/* Loading */}
            {loadingBranchQuarterTable ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium">Loading quarterly data...</p>
              </div>
            ) : null}

            {/* Table */}
            {branchQuarterTableRows && !loadingBranchQuarterTable ? (
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
                        <TableHead className="font-semibold text-blue-800">
                          Name
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Position
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Branch
                        </TableHead>
                        {showDepartmentInBranchQuarter && (
                          <TableHead className="font-semibold text-blue-800">
                            Department
                          </TableHead>
                        )}
                        <TableHead className="font-semibold text-blue-800">
                          Q1
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Q2
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Q3
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Q4
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Average
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {branchQuarterTableRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={showDepartmentInBranchQuarter ? 9 : 8}
                            className="text-center text-gray-500 py-8"
                          >
                            No employees found for this branch/year.
                          </TableCell>
                        </TableRow>
                      ) : (
                        branchQuarterTableRows.map((row) => (
                          <TableRow
                            key={row.employeeId}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <TableCell className="font-medium text-gray-800">
                              {row.name}
                            </TableCell>
                            <TableCell className="text-gray-700">
                              {row.position}
                            </TableCell>
                            <TableCell className="text-gray-700">
                              {row.branch}
                            </TableCell>
                            {showDepartmentInBranchQuarter && (
                              <TableCell className="text-gray-700">
                                {row.department}
                              </TableCell>
                            )}
                            <TableCell>
                              {row.q1 != null ? row.q1.toFixed(2) : "—"}
                            </TableCell>
                            <TableCell>
                              {row.q2 != null ? row.q2.toFixed(2) : "—"}
                            </TableCell>
                            <TableCell>
                              {row.q3 != null ? row.q3.toFixed(2) : "—"}
                            </TableCell>
                            <TableCell>
                              {row.q4 != null ? row.q4.toFixed(2) : "—"}
                            </TableCell>
                            <TableCell>
                              {row.average != null ? row.average.toFixed(2) : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export warning: some employees have no quarter data */}
      <Dialog
        open={showExportMissingDataWarning}
        onOpenChangeAction={(open) => {
          if (!open) setShowExportMissingDataWarning(false);
        }}
      >
        <DialogContent className="max-w-md p-8 text-center">
          <div className="flex flex-col  items-center space-y-4">
            <div className="mb-2">
              <img src="/no%20expo.gif" alt="Missing data" className="w-40 h-40 object-contain" />
            </div>
            <h2 className="text-lg font-bold text-red-800">
              Missing data
            </h2>
            <p className="text-gray-600 text-sm">
              Will you wish to proceed with export? Some of your employees are
              missing their data or evaluations.
            </p>
            <div className="flex gap-3 w-full justify-center">
              <Button
                variant="outline"
                onClick={() => setShowExportMissingDataWarning(false)}
                className="cursor-pointer bg-red-600 hover:bg-red-700 hover:text-white text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => performBranchQuarterExport()}
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
              >
                Proceed
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* No Data Alert Dialog */}
      <Dialog
        open={showNoDataAlert}
        onOpenChangeAction={(open) => {
          if (!open) setShowNoDataAlert(false);
        }}
      >
        <DialogContent className="max-w-md p-8 text-center">
          <div className="flex flex-col items-center">
            {/* GIF */}
            <div className="mb-4">
              <img
                src="/no-data.gif"
                alt="No data"
                className="w-40 h-40 object-contain"
              />
            </div>
            
            {/* Title */}
            <h2 className="text-xl font-bold text-red-600 mb-2">
              No Data to Export
            </h2>
            
            {/* Description */}
            <p className="text-gray-600 text-sm mb-6 max-w-xs">
              There are no evaluations recorded for the selected year and branch. Please select a different year/branch with available data.
            </p>
            
            {/* Button */}
            <Button
              onClick={() => setShowNoDataAlert(false)}
              className="px-8 py-2 cursor-pointer bg-blue-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exporting Dialog */}
      <Dialog open={isExporting} onOpenChangeAction={() => {}}>
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

      {/* Export Error Dialog */}
      <Dialog
        open={showExportError}
        onOpenChangeAction={(open) => {
          if (!open) setShowExportError(false);
        }}
      >
        <DialogContent className="max-w-sm p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <img
                src="/no-data2.gif"
                alt="Error"
                className="w-32 h-32 object-contain"
              />
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">
              Something Went Wrong
            </h2>
            <p className="text-gray-600 text-sm mb-6 max-w-xs">
              We encountered an error while exporting your data. Please try again later.
            </p>
            <Button
              onClick={() => setShowExportError(false)}
              className="px-8 py-2 cursor-pointer bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </Button>
          </div>
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
            // Not used in admin, but required by component
            setIsViewEmployeeModalOpen(false);
            setEmployeeToView(null);
          }}
          onViewSubmissionAction={() => {
            // Not used in admin, but required by component
          }}
          designVariant="admin"
        />
      )}
      <EvaluationTypeModal
        isOpen={isEvaluationTypeModalOpen}
        onCloseAction={() => {
          setIsEvaluationTypeModalOpen(false);
          if (!evaluationType) {
            setSelectedEmployee(null);
          }
        }}
        onSelectEmployeeAction={() => {
          const employee = selectedEmployeeForEvaluation;
          if (!employee) {
            console.error("No employee selected!");
            return;
          }
          setEvaluationType("employee");
          setIsEvaluationTypeModalOpen(false);

          setIsEvaluationModalOpen(true);
        }}
        onSelectManagerAction={() => {
          const employee = selectedEmployeeForEvaluation;
          if (!employee) {
            console.error("No employee selected!");
            return;
          }
          setEvaluationType("manager");
          setIsEvaluationTypeModalOpen(false);

          setIsEvaluationModalOpen(true);
        }}
        onSelectAreaManagerAction={() => {
          const employee = selectedEmployeeForEvaluation;
          if (!employee) {
            console.error("No employee selected!");
            return;
          }
          setEvaluationType("areaManager");
          setIsEvaluationTypeModalOpen(false);

          setIsEvaluationModalOpen(true);
        }}
        employeeName={
          selectedEmployeeForEvaluation
            ? `${selectedEmployeeForEvaluation?.fname || ""} ${selectedEmployeeForEvaluation?.lname || ""}`.trim()
            : ""
        }
        employee={selectedEmployeeForEvaluation}
      />

      <Dialog
        open={isEvaluationModalOpen}
        onOpenChangeAction={(open) => {
          if (!open) {
            setIsEvaluationModalOpen(false);
            setSelectedEmployee(null);
            setEvaluationType(null);
          }
        }}
      >
        <DialogContent className="max-w-7xl max-h-[101vh] overflow-hidden p-0 evaluation-container">
          {selectedEmployeeForEvaluation && evaluationType === "employee" && (
            <>
              {/* If employee is HO, use HO evaluation forms (RankNfileHo) */}
              {/* If employee is NOT HO, use BranchEvaluationForm which routes correctly */}
              {isEmployeeHO(selectedEmployeeForEvaluation) ? (
                <RankNfileHo
                  employee={selectedEmployeeForEvaluation}
                  onCloseAction={() => {
                    setIsEvaluationModalOpen(false);
                    setSelectedEmployee(null);
                    setEvaluationType(null);
                  }}
                />
              ) : (
                <BranchEvaluationForm
                  employee={selectedEmployeeForEvaluation}
                  onCloseAction={() => {
                    setIsEvaluationModalOpen(false);
                    setSelectedEmployee(null);
                    setEvaluationType(null);
                  }}
                  evaluationType="rankNfile"
                />
              )}
            </>
          )}
          {selectedEmployeeForEvaluation && evaluationType === "manager" && (
            <>
              {/* If employee is HO, use HO evaluation forms (BasicHo) */}
              {/* If employee is NOT HO (Branch), use BranchManagerEvaluationForm directly */}
              {isEmployeeHO(selectedEmployeeForEvaluation) ? (
                <BasicHo
                  employee={selectedEmployeeForEvaluation}
                  onCloseAction={() => {
                    setIsEvaluationModalOpen(false);
                    setSelectedEmployee(null);
                    setEvaluationType(null);
                  }}
                />
              ) : (
                <BranchManagerEvaluationForm
                  employee={selectedEmployeeForEvaluation}
                  onCloseAction={() => {
                    setIsEvaluationModalOpen(false);
                    setSelectedEmployee(null);
                    setEvaluationType(null);
                  }}
                  evaluationType="basic"
                />
              )}
            </>
          )}
          {selectedEmployeeForEvaluation && evaluationType === "areaManager" && (
            <AreaManagerEvaluationForm
              employee={selectedEmployeeForEvaluation}
              onCloseAction={() => {
                setIsEvaluationModalOpen(false);
                setSelectedEmployee(null);
                setEvaluationType(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
