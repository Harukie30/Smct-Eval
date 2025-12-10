'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardShell, { SidebarItem } from '@/components/DashboardShell';
import { withAuth } from '@/hoc';
import { Card, CardContent,  CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ViewResultsModal from '@/components/evaluation/ViewResultsModal';
import EvaluationForm from '@/components/evaluation';
import ManagerEvaluationForm from '@/components/evaluation-2';
import EvaluationTypeModal from '@/components/EvaluationTypeModal';
import { useTabLoading } from '@/hooks/useTabLoading';
import { apiService } from '@/lib/apiService';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUser } from '@/contexts/UserContext';
import { toastMessages } from '@/lib/toastMessages';
import EditUserModal from '@/components/EditUserModal';
import AddEmployeeModal from '@/components/AddEmployeeModal';
import { useDialogAnimation } from '@/hooks/useDialogAnimation';

// Removed static JSON imports - using API only

// Lazy load tab components for better performance
const OverviewTab = lazy(() => import('./OverviewTab').then(m => ({ default: m.OverviewTab })));
const EvaluationRecordsTab = lazy(() => import('./EvaluationRecordsTab').then(m => ({ default: m.EvaluationRecordsTab })));
const EmployeesTab = lazy(() => import('./EmployeesTab').then(m => ({ default: m.EmployeesTab })));
const DepartmentsTab = lazy(() => import('./DepartmentsTab').then(m => ({ default: m.DepartmentsTab })));
const BranchesTab = lazy(() => import('./BranchesTab').then(m => ({ default: m.BranchesTab })));
const BranchHeadsTab = lazy(() => import('../admin/branchHeads/page'));
const AreaManagersTab = lazy(() => import('../admin/areaManagers/page'));
const PerformanceReviewsTab = lazy(() => import('./PerformanceReviewsTab').then(m => ({ default: m.PerformanceReviewsTab })));
const EvaluationHistoryTab = lazy(() => import('./EvaluationHistoryTab').then(m => ({ default: m.EvaluationHistoryTab })));
const SignatureResetRequestsTab = lazy(() => import('../admin/signatureResetRequests/page'));

// TypeScript interfaces
interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch: string;
  role: string;
  hireDate?: string; // Optional - hire date removed from forms
  employeeId?: string; // Formatted employee ID from registration (e.g., "1234-567890")
}

interface Department {
  id: number;
  name: string;
  manager: string;
  employeeCount: number;
  performance: number;
}

interface Branch {
  id: number;
  name: string;
  location: string;
  manager: string;
  employeeCount: number;
  performance: number;
}

interface HRMetrics {
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
  turnoverRate: number;
  averageTenure: number;
  departmentsCount: number;
  branchesCount: number;
  genderDistribution: {
    male: number;
    female: number;
  };
  ageDistribution: {
    '18-25': number;
    '26-35': number;
    '36-45': number;
    '46+': number;
  };
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
}

const getQuarterColor = (quarter: string) => {
  if (quarter.includes('Q1')) return 'bg-blue-100 text-blue-800';
  if (quarter.includes('Q2')) return 'bg-green-100 text-green-800';
  if (quarter.includes('Q3')) return 'bg-yellow-100 text-yellow-800';
  if (quarter.includes('Q4')) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
};

// Utility functions for Performance Reviews
const calculateOverallRating = (evaluationData: any) => {
  if (!evaluationData) return 0;

  const calculateScore = (scores: number[]) => {
    const validScores = scores.filter(score => score !== null && score !== undefined && !isNaN(score));
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  };

  const jobKnowledgeScore = calculateScore([evaluationData.jobKnowledgeScore1, evaluationData.jobKnowledgeScore2, evaluationData.jobKnowledgeScore3]);
  const qualityOfWorkScore = calculateScore([evaluationData.qualityOfWorkScore1, evaluationData.qualityOfWorkScore2, evaluationData.qualityOfWorkScore3, evaluationData.qualityOfWorkScore4, evaluationData.qualityOfWorkScore5]);
  const adaptabilityScore = calculateScore([evaluationData.adaptabilityScore1, evaluationData.adaptabilityScore2, evaluationData.adaptabilityScore3]);
  const teamworkScore = calculateScore([evaluationData.teamworkScore1, evaluationData.teamworkScore2, evaluationData.teamworkScore3]);
  const reliabilityScore = calculateScore([evaluationData.reliabilityScore1, evaluationData.reliabilityScore2, evaluationData.reliabilityScore3, evaluationData.reliabilityScore4]);
  const ethicalScore = calculateScore([evaluationData.ethicalScore1, evaluationData.ethicalScore2, evaluationData.ethicalScore3, evaluationData.ethicalScore4]);
  const customerServiceScore = calculateScore([evaluationData.customerServiceScore1, evaluationData.customerServiceScore2, evaluationData.customerServiceScore3, evaluationData.customerServiceScore4, evaluationData.customerServiceScore5]);

  const overallWeightedScore = (
    (jobKnowledgeScore * 0.20) +
    (qualityOfWorkScore * 0.20) +
    (adaptabilityScore * 0.10) +
    (teamworkScore * 0.10) +
    (reliabilityScore * 0.05) +
    (ethicalScore * 0.05) +
    (customerServiceScore * 0.30)
  );

  // Ensure the score is between 0 and 5
  const normalizedScore = Math.max(0, Math.min(5, overallWeightedScore));
  return Math.round(normalizedScore * 10) / 10;
};


const getTimeAgo = (submittedAt: string) => {
  const submissionDate = new Date(submittedAt);
  const now = new Date();
  const diffInMs = now.getTime() - submissionDate.getTime();
  
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMinutes < 1) {
    return 'Just now';
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

const getSubmissionHighlight = (submittedAt: string, submissionId: number, approvalStatus?: string) => {
  const submissionTime = new Date(submittedAt).getTime();
  const now = new Date().getTime();
  const hoursDiff = (now - submissionTime) / (1000 * 60 * 60);
  
  // Priority 1: Fully approved - ALWAYS GREEN
  if (approvalStatus === 'fully_approved') {
    if (hoursDiff <= 24) {
      return {
        className: 'bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100',
        badge: { text: '✓ Approved', className: 'bg-green-500 text-white' },
        secondaryBadge: { text: 'New', className: 'bg-yellow-500 text-white' },
      };
    }
    return {
      className: 'bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100',
      badge: { text: '✓ Approved', className: 'bg-green-500 text-white' },
    };
  }
  
  // Priority 2: New (within 24 hours) AND Pending
  if (hoursDiff <= 24) {
    return {
      className: 'bg-yellow-50 border-l-4 border-l-yellow-500 hover:bg-yellow-100',
      badge: { text: 'New', className: 'bg-yellow-500 text-white' },
    };
  }
  
  // Priority 3: Recent (within 48 hours)
  if (hoursDiff <= 48) {
    return {
      className: 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100',
      badge: { text: 'Recent', className: 'bg-blue-500 text-white' },
    };
  }
  
  return {
    className: '',
    badge: null,
  };
};

function HRDashboard() {
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [positionsData, setPositionsData] = useState<{id: string, name: string}[]>([]);
  const [hrMetrics, setHrMetrics] = useState<HRMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize active tab from URL parameter or default to 'overview'
  const tabParam = searchParams.get('tab');
  const [active, setActive] = useState(tabParam || 'overview');
  // Note: Employees tab state is now managed inside EmployeesTab component
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [selectedPerformanceLevel, setSelectedPerformanceLevel] = useState<string>('');
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [isViewResultsModalOpen, setIsViewResultsModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [deleteEmployeePassword, setDeleteEmployeePassword] = useState('');
  const [deleteEmployeePasswordError, setDeleteEmployeePasswordError] = useState('');
  // Note: employeeViewMode, searchTerm, selectedDepartment, selectedBranch are now managed inside EmployeesTab component
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isEvaluationTypeModalOpen, setIsEvaluationTypeModalOpen] = useState(false);
  const [evaluationType, setEvaluationType] = useState<'employee' | 'manager' | null>(null);
  const [employeeToEvaluate, setEmployeeToEvaluate] = useState<Employee | null>(null);
  const [employeeDetailsId, setEmployeeDetailsId] = useState<string>("");
  const [isLoadingEmployeeDetailsId, setIsLoadingEmployeeDetailsId] = useState(false);

  // Format employee ID helper function
  const formatEmployeeId = (employeeId: number | string | undefined): string => {
    if (!employeeId) return "Not Assigned";
    const idString = String(employeeId).replace(/-/g, "").padStart(10, "0");
    if (idString.length >= 10) {
      return `${idString.slice(0, 4)}-${idString.slice(4, 10)}`;
    }
    return idString;
  };

  // Helper to check if branch is HO, Head Office, or none
  const isBranchHOOrNone = (branch: string | undefined): boolean => {
    if (!branch) return false;
    const branchLower = String(branch).toLowerCase().trim();
    return branchLower === "ho" || branchLower === "head office" || branchLower === "none" || branchLower === "none ho";
  };

  // Get position label
  const getPositionLabel = (positionId: string | undefined): string => {
    if (!positionId) return "Not Assigned";
    const position = positionsData.find((p: any) => 
      p.id === positionId || p.value === positionId || p.name === positionId
    );
    return position?.name || (position as any)?.label || String(positionId);
  };

  // Get branch label
  const getBranchLabel = (branchId: string | undefined): string => {
    if (!branchId) return "Not Assigned";
    const branch = branches.find((b: any) => 
      b.id === branchId || b.name === branchId || (b as any).value === branchId
    );
    return branch?.name || (branch as any)?.label || String(branchId);
  };

  // Fetch employee ID when modal opens (same approach as EditUserModal)
  useEffect(() => {
    const fetchEmployeeDetailsId = async () => {
      if (!isEmployeeModalOpen || !selectedEmployee) {
        setEmployeeDetailsId("");
        return;
      }
      setIsLoadingEmployeeDetailsId(true);
      try {
        // First check if employeeId is already in the selectedEmployee object
        const employeeId = (selectedEmployee as any).employeeId ||
          (selectedEmployee as any).employee_id ||
          (selectedEmployee as any).emp_id;

        if (employeeId) {
          setEmployeeDetailsId(formatEmployeeId(employeeId));
          setIsLoadingEmployeeDetailsId(false);
          return;
        }

        // If not found, try to get it from getAllUsers (same as EditUserModal)
        const accounts = await apiService.getAllUsers();
        const account = accounts.find((acc: any) =>
          acc.id === selectedEmployee.id ||
          acc.employeeId === selectedEmployee.id ||
          acc.employee_id === selectedEmployee.id ||
          acc.user_id === selectedEmployee.id ||
          acc.email === selectedEmployee.email
        );

        // Try different field names for employeeId (same as EditUserModal)
        const foundEmployeeId =
          account?.employeeId ||
          account?.employee_id ||
          account?.emp_id ||
          account?.id;

        if (foundEmployeeId) {
          setEmployeeDetailsId(formatEmployeeId(foundEmployeeId));
        } else {
          setEmployeeDetailsId("Not Assigned");
        }
      } catch (error) {
        console.error("Error fetching employeeId:", error);
        setEmployeeDetailsId("Not Assigned");
      } finally {
        setIsLoadingEmployeeDetailsId(false);
      }
    };
    fetchEmployeeDetailsId();
  }, [isEmployeeModalOpen, selectedEmployee]);

  // Note: Evaluation Records tab state is now managed inside EvaluationRecordsTab component
  const [employeesRefreshing, setEmployeesRefreshing] = useState(false);
  const [departmentsRefreshing, setDepartmentsRefreshing] = useState(false);
  const [branchesRefreshing, setBranchesRefreshing] = useState(false);
  const [reviewsRefreshing, setReviewsRefreshing] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [quarterlyRefreshing, setQuarterlyRefreshing] = useState(false);
  
  // Note: Evaluation History tab state (search terms, filters, etc.) is now managed inside EvaluationHistoryTab component

  // Delete evaluation record modal state
  const [isDeleteRecordModalOpen, setIsDeleteRecordModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');

  // Get current user (HR)
  const { user: currentUser } = useUser();
  
  // Use dialog animation hook (0.4s to match EditUserModal speed)
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });

  // Tab loading hook
  const { isTabLoading, handleTabChange: handleTabChangeWithLoading } = useTabLoading();

  // Handle tab changes with loading
  const handleTabChange = async (tabId: string) => {
    setActive(tabId);
    
    // Use the new tab loading approach
    await handleTabChangeWithLoading(tabId, async () => {
      // Auto-refresh data when switching to specific tabs
      if (tabId === 'overview') {
        setSubmissionsLoading(true);
        // Add a small delay to ensure spinner is visible
        await new Promise(resolve => setTimeout(resolve, 800));
        await fetchRecentSubmissions();
      } else if (tabId === 'evaluation-records') {
        // Evaluation records refresh is handled by the component
      } else if (tabId === 'employees') {
        await refreshEmployeeData();
      } else if (tabId === 'departments') {
        setDepartmentsRefreshing(true);
        // Add a small delay to ensure spinner is visible
        await new Promise(resolve => setTimeout(resolve, 800));
        // Refresh departments data from API
        const departments = await apiService.getDepartments();
        setDepartments(departments.map((dept: any) => ({
          id: dept.id,
          name: dept.name,
          manager: dept.manager || '',
          employeeCount: dept.employeeCount || 0,
          performance: dept.performance || 0
        })));
        setDepartmentsRefreshing(false);
      } else if (tabId === 'branches') {
        setBranchesRefreshing(true);
        // Add a small delay to ensure spinner is visible
        await new Promise(resolve => setTimeout(resolve, 800));
        // Refresh branches data
        const branchesData = await apiService.getBranches();
        setBranches(branchesData.map((branch: {label: string, value: string}) => ({
          id: branch.value,
          name: branch.label
        })));
        setBranchesRefreshing(false);
      } else if (tabId === 'branch-heads' || tabId === 'area-managers') {
        // Refresh employee data for branch heads and area managers
        await refreshEmployeeData();
      } else if (tabId === 'reviews') {
        setReviewsRefreshing(true);
        // Add a 1-second delay to make skeleton visible
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Refresh evaluation data
        await refreshHRData();
        setReviewsRefreshing(false);
      } else if (tabId === 'history') {
        setHistoryRefreshing(true);
        // Add a 1-second delay to make skeleton visible
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Refresh evaluation data
        await refreshHRData();
        setHistoryRefreshing(false);
      }
    }, {
      showLoading: true,
      loadingDuration: 600,
      skipIfRecentlyLoaded: true
    });
  };
  
  // Helper functions for Evaluation History
  const isNewSubmission = (submittedAt: string) => {
    const submissionTime = new Date(submittedAt).getTime();
    const now = new Date().getTime();
    const hoursDiff = (now - submissionTime) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };
  
  // Refresh function for Quarterly Performance table
  const handleRefreshQuarterly = async () => {
    setQuarterlyRefreshing(true);
    try {
      // Add a small delay to simulate loading
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Refresh data
      await refreshHRData();
    } catch (error) {
      console.error('Error refreshing quarterly performance:', error);
    } finally {
      setQuarterlyRefreshing(false);
    }
  };
  
  // Refresh function for Evaluation History table
  const handleRefreshHistory = async () => {
    setHistoryRefreshing(true);
    try {
      // Add a small delay to simulate loading
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Refresh data
      await refreshHRData();
    } catch (error) {
      console.error('Error refreshing evaluation history:', error);
    } finally {
      setHistoryRefreshing(false);
    }
  };

  // Function to refresh HR dashboard data (used by shared hook)
  // Function to load dashboard data from API
  const loadDashboardData = async () => {
    try {
      const dashboardData = await apiService.hrDashboard();
      const data = dashboardData?.data || dashboardData;
      
      if (data) {
        // Update HR metrics from API response
        if (data.totalEmployees !== undefined || data.activeEmployees !== undefined) {
          setHrMetrics((prev) => {
            const defaultMetrics: HRMetrics = {
              totalEmployees: 0,
              activeEmployees: 0,
              newHires: 0,
              turnoverRate: 0,
              averageTenure: 0,
              departmentsCount: 0,
              branchesCount: 0,
              genderDistribution: { male: 0, female: 0 },
              ageDistribution: { '18-25': 0, '26-35': 0, '36-45': 0, '46+': 0 },
              performanceDistribution: { excellent: 0, good: 0, average: 0, needsImprovement: 0 },
            };
            return {
              ...defaultMetrics,
              ...prev,
              totalEmployees: data.totalEmployees ?? prev?.totalEmployees ?? defaultMetrics.totalEmployees,
              activeEmployees: data.activeEmployees ?? prev?.activeEmployees ?? defaultMetrics.activeEmployees,
              newHires: data.newHires ?? prev?.newHires ?? defaultMetrics.newHires,
              turnoverRate: data.turnoverRate ?? prev?.turnoverRate ?? defaultMetrics.turnoverRate,
              averageTenure: data.averageTenure ?? prev?.averageTenure ?? defaultMetrics.averageTenure,
              departmentsCount: data.departmentsCount ?? prev?.departmentsCount ?? defaultMetrics.departmentsCount,
              branchesCount: data.branchesCount ?? prev?.branchesCount ?? defaultMetrics.branchesCount,
              genderDistribution: data.genderDistribution ?? prev?.genderDistribution ?? defaultMetrics.genderDistribution,
              ageDistribution: data.ageDistribution ?? prev?.ageDistribution ?? defaultMetrics.ageDistribution,
              performanceDistribution: data.performanceDistribution ?? prev?.performanceDistribution ?? defaultMetrics.performanceDistribution,
            };
          });
        }
      }
    } catch (error) {
      console.error("Error loading dashboard data from API:", error);
      // Fallback to manual calculation if API fails (will use state for branches)
      // Note: This will be called after branches are loaded in refreshHRData/loadHRData
    }
  };

  // Function to calculate HR metrics manually (fallback)
  const calculateHRMetrics = async (branchesData?: {id: string, name: string}[]) => {
    try {
      // Load employees from API
      const allUsers = await apiService.getAllUsers();
      const employees = allUsers.filter((user: any) => user.role !== 'admin');
      
      // Load departments from API
      const departments = await apiService.getDepartments();
      
      // Use provided branchesData or fallback to state
      const branchesCount = branchesData ? branchesData.length : branches.length;
      
      const metrics: HRMetrics = {
        totalEmployees: employees.length,
        activeEmployees: employees.filter((emp: any) => emp.isActive !== false).length,
        newHires: 0, // Hire date removed, set to 0
        turnoverRate: 5.2, // Mock data
        averageTenure: 2.8, // Mock data
        departmentsCount: departments.length,
        branchesCount: branchesCount,
        genderDistribution: {
          male: Math.floor(employees.length * 0.55),
          female: Math.floor(employees.length * 0.45)
        },
        ageDistribution: {
          '18-25': Math.floor(employees.length * 0.15),
          '26-35': Math.floor(employees.length * 0.45),
          '36-45': Math.floor(employees.length * 0.30),
          '46+': Math.floor(employees.length * 0.10)
        },
        performanceDistribution: {
          excellent: Math.floor(employees.length * 0.25),
          good: Math.floor(employees.length * 0.40),
          average: Math.floor(employees.length * 0.25),
          needsImprovement: Math.floor(employees.length * 0.10)
        }
      };
      setHrMetrics(metrics);
    } catch (error) {
      console.error('Error calculating HR metrics:', error);
    }
  };

  const refreshHRData = async () => {
    try {
      setLoading(true);
      
      // Load employees from API
      const allUsers = await apiService.getAllUsers();
      const employeesList = allUsers
        .filter((user: any) => user.role !== 'admin')
        .map((user: any) => ({
          id: user.employeeId || user.id,
          name: user.name || `${user.fname || ''} ${user.lname || ''}`.trim(),
          fname: user.fname,
          lname: user.lname,
          email: user.email,
          position: user.positions?.label || user.position || 'N/A',
          department: user.departments?.department_name || user.department || 'N/A',
          branch: (user.branches && Array.isArray(user.branches) && user.branches[0]?.branch_name) || user.branch || 'N/A',
          role: (user.roles && Array.isArray(user.roles) && user.roles[0]?.name) || user.role || 'N/A',
          isActive: user.isActive,
          // Keep full nested structures for EditUserModal
          positions: user.positions,
          departments: user.departments,
          branches: user.branches,
          roles: user.roles
        }));
      setEmployees(employeesList);
      
      // Load departments from API
      const departments = await apiService.getDepartments();
      setDepartments(departments.map((dept: any) => ({
        id: dept.id,
        name: dept.name,
        manager: dept.manager || '',
        employeeCount: dept.employeeCount || 0,
        performance: dept.performance || 0
      })));
      
      // Load branches from API
      const branchesData = await apiService.getBranches();
      setBranches(branchesData.map((branch: {label: string, value: string}) => ({
        id: branch.value,
        name: branch.label
      })));
      
      // Load positions from API
      const positions = await apiService.getPositions();
      setPositionsData(positions.map((pos: {label: string, value: string}) => ({
        id: pos.value,
        name: pos.label
      })));

      // Load dashboard data from API (replaces manual calculation)
      await loadDashboardData();

      // Fallback: Calculate HR metrics manually if API didn't provide all data
      const convertedBranchesData = branchesData.map((branch: {label: string, value: string}) => ({
        id: branch.value,
        name: branch.label
      }));
      await calculateHRMetrics(convertedBranchesData);
      
      // Refresh recent submissions
      await fetchRecentSubmissions();
    } catch (error) {
      console.error('Error refreshing HR data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh functionality using shared hook
  const {
    showRefreshModal,
    refreshModalMessage,
    handleRefreshModalComplete,
    refreshDashboardData
  } = useAutoRefresh({
    refreshFunction: refreshHRData,
    dashboardName: 'HR Dashboard',
    customMessage: 'Welcome back! Refreshing your HR dashboard data...'
  });

  // Handle URL parameter changes for tab navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== active) {
      setActive(tab);
    }
  }, [searchParams]);

  // Note: Container animations are now handled by useDialogAnimation hook



  // Removed localStorage event listeners - using API only

  // Fetch recent submissions from client data service
  const fetchRecentSubmissions = async () => {
    try {
      setSubmissionsLoading(true); // Set loading to true when starting fetch
      const submissions = await apiService.getSubmissions();
      // Ensure submissions is always an array
      setRecentSubmissions(Array.isArray(submissions) ? submissions : []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setRecentSubmissions([]); // Set to empty array on error
    } finally {
      setSubmissionsLoading(false);
    }
  };


  useEffect(() => {
    const loadHRData = async () => {
      try {
        // Load employees from API
        const allUsers = await apiService.getAllUsers();
        const employeesList = allUsers
          .filter((user: any) => user.role !== 'admin')
          .map((user: any) => ({
            id: user.employeeId || user.id,
            name: user.name || `${user.fname || ''} ${user.lname || ''}`.trim(),
            fname: user.fname,
            lname: user.lname,
            email: user.email,
            position: user.positions?.label || user.position || 'N/A',
            department: user.departments?.department_name || user.department || 'N/A',
            branch: (user.branches && Array.isArray(user.branches) && user.branches[0]?.branch_name) || user.branch || 'N/A',
            role: (user.roles && Array.isArray(user.roles) && user.roles[0]?.name) || user.role || 'N/A',
            isActive: user.isActive,
            // Keep full nested structures for EditUserModal
            positions: user.positions,
            departments: user.departments,
            branches: user.branches,
            roles: user.roles
          }));
        setEmployees(employeesList);
        
        // Load departments from API
        const departments = await apiService.getDepartments();
        setDepartments(departments.map((dept: any) => ({
          id: dept.id,
          name: dept.name,
          manager: dept.manager || '',
          employeeCount: dept.employeeCount || 0,
          performance: dept.performance || 0
        })));
        
        // Load branches from API
        const branchesData = await apiService.getBranches();
        setBranches(branchesData.map((branch: {label: string, value: string}) => ({
          id: branch.value,
          name: branch.label
        })));
        
        // Load positions from API
        const positions = await apiService.getPositions();
        setPositionsData(positions.map((pos: {label: string, value: string}) => ({
          id: pos.value,
          name: pos.label
        })));

        // Load dashboard data from API (replaces manual calculation)
        await loadDashboardData();

        // Fallback: Calculate HR metrics manually if API didn't provide all data
        const convertedBranchesData = branchesData.map((branch: {label: string, value: string}) => ({
          id: branch.value,
          name: branch.label
        }));
        await calculateHRMetrics(convertedBranchesData);

        setLoading(false);
      } catch (error) {
        console.error('Error loading HR data:', error);
        setLoading(false);
      }
    };

    loadHRData();
    fetchRecentSubmissions();
  }, []);




  const handleViewEmployee = async (employee: Employee) => {
    try {
      // Fetch the full user data from API to get all nested structures (positions, departments, branches, roles, contact, etc.)
      const allUsers = await apiService.getAllUsers();
      const fullUserData = allUsers.find((user: any) => 
        user.id === employee.id || 
        user.email === employee.email ||
        (user.employeeId && user.employeeId === employee.id)
      );
      
      if (fullUserData) {
        // Use the full user data from API which has all nested structures
        setSelectedEmployee(fullUserData as any);
      } else {
        // Fallback to the employee object if not found in API
        setSelectedEmployee({
          ...employee,
          username: (employee as any).username || '',
          password: (employee as any).password || '',
          contact: (employee as any).contact || '',
          isActive: (employee as any).isActive !== undefined ? (employee as any).isActive : true,
          signature: (employee as any).signature || ''
        } as any);
      }
      setIsEmployeeModalOpen(true);
    } catch (error) {
      console.error("Error fetching full user data for view:", error);
      // Fallback to the employee object on error
      setSelectedEmployee({
        ...employee,
        username: (employee as any).username || '',
        password: (employee as any).password || '',
        contact: (employee as any).contact || '',
        isActive: (employee as any).isActive !== undefined ? (employee as any).isActive : true,
        signature: (employee as any).signature || ''
      } as any);
      setIsEmployeeModalOpen(true);
    }
  };

  const handleEditEmployee = async (employee: Employee) => {
    console.log("handleEditEmployee - Full employee object:", employee);
    
    try {
      // Fetch the full user data from API to get all nested structures (positions, departments, branches, roles, contact, etc.)
      const allUsers = await apiService.getAllUsers();
      const fullUserData = allUsers.find((user: any) => 
        user.id === employee.id || 
        user.email === employee.email ||
        (user.employeeId && user.employeeId === employee.id)
      );
      
      if (fullUserData) {
        // Use the full user data from API which has all nested structures
        setSelectedEmployee(fullUserData as any);
      } else {
        // Fallback to the employee object if not found in API
        setSelectedEmployee({
          ...employee,
          username: (employee as any).username || '',
          password: (employee as any).password || '',
          contact: (employee as any).contact || '',
          isActive: (employee as any).isActive !== undefined ? (employee as any).isActive : true,
          signature: (employee as any).signature || ''
        } as any);
      }
      setIsEditModalOpen(true);
    } catch (error) {
      console.error("Error fetching full user data:", error);
      // Fallback to the employee object on error
      setSelectedEmployee({
        ...employee,
        username: (employee as any).username || '',
        password: (employee as any).password || '',
        contact: (employee as any).contact || '',
        isActive: (employee as any).isActive !== undefined ? (employee as any).isActive : true,
        signature: (employee as any).signature || ''
      } as any);
      setIsEditModalOpen(true);
    }
  };

  const handleAddEmployee = async (newUser: any) => {
    try {
      // Create FormData for API call
      const formData = new FormData();
      formData.append('name', newUser.name || '');
      formData.append('fname', newUser.fname || newUser.name?.split(' ')[0] || '');
      formData.append('lname', newUser.lname || newUser.name?.split(' ').slice(1).join(' ') || '');
      formData.append('email', newUser.email || '');
      formData.append('password', newUser.password || '');
      formData.append('position_id', String(newUser.position_id || newUser.position || ''));
      formData.append('department_id', String(newUser.department_id || newUser.department || ''));
      formData.append('branch_id', String(newUser.branch_id || newUser.branch || ''));
      formData.append('role', newUser.role || 'employee');
      formData.append('isActive', String(newUser.isActive !== undefined ? newUser.isActive : true));
      if (newUser.contact) formData.append('contact', newUser.contact);

      // Add user via API
      await apiService.addUser(formData);

      // Refresh dashboard data to get updated information
      await refreshHRData();
      
      // Show success toast
      toastMessages.user.created(newUser.name || newUser.fname || 'Employee');
      
      // Close modal
      setIsAddEmployeeModalOpen(false);
    } catch (error) {
      console.error('Error adding employee:', error);
      toastMessages.generic.error('Add Failed', 'Failed to add employee. Please try again.');
      throw error;
    }
  };

  const handleSaveEmployee = async (updatedUser: any) => {
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


      // Append employeeId (remove dashes before sending, like in registration)
      if (updatedUser.employeeId !== undefined && updatedUser.employeeId !== null) {
        const employeeIdString = String(updatedUser.employeeId);
        // Remove dashes from employee ID before sending
        const employeeIdWithoutDashes = employeeIdString.replace(/-/g, "");
        formData.append("employee_id", employeeIdWithoutDashes);
      }

      await apiService.updateEmployee(formData, updatedUser.id);

      // Refresh employee data to update the table immediately
      await refreshEmployeeData();
      
      // Refresh dashboard data to get updated information
      await refreshDashboardData(false, false);
      
      // Show success toast
      toastMessages.user.updated(updatedUser.name);
      
      // Close modal and reset
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error saving employee:', error);
      toastMessages.generic.error('Update Failed', 'Failed to update user information. Please try again.');
    }
  };

  const handleViewPerformanceEmployees = (level: string) => {
    setSelectedPerformanceLevel(level);
    setIsPerformanceModalOpen(true);
  };

  const viewSubmissionDetails = (submission: any) => {
    setSelectedSubmission(submission);
    setIsViewResultsModalOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteModalOpen(true);
  };

  const handleEvaluateEmployee = async (employee: Employee) => {
    // Fetch formatted employee ID from accounts
    try {
      const accounts = await apiService.getAccounts();
      const account = accounts.find((acc: any) => 
        acc.employeeId === employee.id || 
        acc.id === employee.id ||
        acc.email === employee.email
      );
      
      // Get formatted employee_id from account (stored as employee_id in registration)
      const formattedEmployeeId = (account as any)?.employee_id || account?.employeeId;
      
      // Fetch fresh employee data from API to ensure we have latest updates (position, department, role)
      try {
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
        
        setEmployeeToEvaluate({
          ...updatedEmployee,
          employeeId: formattedEmployeeId ? String(formattedEmployeeId) : undefined,
        });
      } catch (freshDataError) {
        console.error('Error fetching fresh employee data:', freshDataError);
        // Fallback to cached employee data if API call fails
        setEmployeeToEvaluate({
          ...employee,
          employeeId: formattedEmployeeId ? String(formattedEmployeeId) : undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching employee ID:', error);
      setEmployeeToEvaluate(employee);
    }
    setIsEvaluationTypeModalOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    // Validate password
    if (!deleteEmployeePassword.trim()) {
      setDeleteEmployeePasswordError('Password is required to delete employees');
      return;
    }

    try {
      // Verify password using API (secure method)
      if (!currentUser?.email) {
        setDeleteEmployeePasswordError('User not found. Please refresh and try again.');
        return;
      }

      try {
        await apiService.login(currentUser.email, deleteEmployeePassword);
      } catch (error) {
        setDeleteEmployeePasswordError('Incorrect password. Please try again.');
        return;
      }

      // Password is correct, proceed with deletion via API
      try {
        await apiService.deleteUser(employeeToDelete.id);
        
        // Remove employee from local state
        const updatedEmployees = employees.filter(emp => emp.id !== employeeToDelete.id);
        setEmployees(updatedEmployees);
        
        // Close modal and reset
        setIsDeleteModalOpen(false);
        setEmployeeToDelete(null);
        setDeleteEmployeePassword('');
        setDeleteEmployeePasswordError('');
        
        // Show success message
        toastMessages.generic.success(
          'Employee Deleted',
          `${employeeToDelete.name} has been successfully deleted.`
        );
        
        // Refresh dashboard data
        await refreshDashboardData(false, false);
        
        console.log('Employee deleted:', employeeToDelete);
      } catch (deleteError) {
        console.error('Error deleting employee via API:', deleteError);
        setDeleteEmployeePasswordError('Failed to delete employee. Please try again.');
        return;
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      setDeleteEmployeePasswordError('Failed to delete employee. Please try again.');
    }
  };

  // Handle delete evaluation record click
  const handleDeleteRecordClick = (record: any) => {
    setRecordToDelete(record);
    setIsDeleteRecordModalOpen(true);
  };

  // Confirm delete evaluation record
  const handleConfirmDeleteRecord = async () => {
    if (!recordToDelete) return;

    // Validate password
    if (!deletePassword.trim()) {
      setDeletePasswordError('Password is required to delete records');
      return;
    }

    // Get current user data to verify password
    if (!currentUser) {
      setDeletePasswordError('User not found. Please refresh and try again.');
      return;
    }

    // Verify password using API (secure method)
    if (!currentUser?.email) {
      setDeletePasswordError('User not found. Please refresh and try again.');
      return;
    }

    try {
      await apiService.login(currentUser.email, deletePassword);
    } catch (error) {
      setDeletePasswordError('Incorrect password. Please try again.');
      return;
    }

    try {
      // Delete submission via API (if endpoint exists)
      // Note: Backend should handle deletion, we just update local state
      // If API endpoint exists, uncomment: await apiService.deleteSubmission(recordToDelete.id);

      // Update state
      setRecentSubmissions(prev => prev.filter(sub => sub.id !== recordToDelete.id));
      
      // Refresh submissions from API
      await fetchRecentSubmissions();

      // Close modal and reset
      setIsDeleteRecordModalOpen(false);
      setRecordToDelete(null);
      setDeletePassword('');
      setDeletePasswordError('');
    } catch (error) {
      console.error('Error deleting evaluation record:', error);
      setDeletePasswordError('Failed to delete record. Please try again.');
    }
  };

  const refreshEmployeeData = async () => {
    try {
      setEmployeesRefreshing(true);
      
      // Add a small delay to ensure spinner is visible
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Load employees from API
      const allUsers = await apiService.getAllUsers();
      const employeesList = allUsers
        .filter((user: any) => user.role !== 'admin')
        .map((user: any) => {
          return {
            id: user.employeeId || user.id,
            name: user.name || `${user.fname || ''} ${user.lname || ''}`.trim(),
            fname: user.fname,
            lname: user.lname,
            email: user.email,
            position: user.positions?.label || user.position || 'N/A',
            department: user.departments?.department_name || user.department || 'N/A',
            branch: (user.branches && Array.isArray(user.branches) && user.branches[0]?.branch_name) || user.branch || 'N/A',
            role: (user.roles && Array.isArray(user.roles) && user.roles[0]?.name) || user.role || 'N/A',
            isActive: user.isActive,
            // Keep full nested structures for EditUserModal
            positions: user.positions,
            departments: user.departments,
            branches: user.branches,
            roles: user.roles
          };
        });
      setEmployees(employeesList);
      
      // Recalculate HR metrics
      const metrics: HRMetrics = {
        totalEmployees: employeesList.length,
        activeEmployees: employeesList.length,
        newHires: 0, // Hire date removed, set to 0
        turnoverRate: 5.2, // Mock data
        averageTenure: 2.8, // Mock data
        departmentsCount: departments.length,
        branchesCount: branches.length,
        genderDistribution: {
          male: Math.floor(employeesList.length * 0.55),
          female: Math.floor(employeesList.length * 0.45)
        },
        ageDistribution: {
          '18-25': Math.floor(employeesList.length * 0.15),
          '26-35': Math.floor(employeesList.length * 0.45),
          '36-45': Math.floor(employeesList.length * 0.30),
          '46+': Math.floor(employeesList.length * 0.10)
        },
        performanceDistribution: {
          excellent: Math.floor(employeesList.length * 0.25),
          good: Math.floor(employeesList.length * 0.40),
          average: Math.floor(employeesList.length * 0.25),
          needsImprovement: Math.floor(employeesList.length * 0.10)
        }
      };
      setHrMetrics(metrics);
    } catch (error) {
      console.error('Error refreshing employee data:', error);
    } finally {
      setEmployeesRefreshing(false);
    }
  };


  const getPerformanceEmployees = (level: string) => {
    // In a real app, you would filter employees by actual performance data
    // For now, we'll simulate by taking a subset of employees
    const count = hrMetrics?.performanceDistribution[level as keyof typeof hrMetrics.performanceDistribution] || 0;
    return employees.slice(0, Math.min(count, employees.length));
  };

  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: '📊', path: '/hr-dashboard?tab=overview' },
    { id: 'evaluation-records', label: 'Evaluation Records', icon: '🗂️', path: '/hr-dashboard?tab=evaluation-records' },
    { id: 'employees', label: 'Employees', icon: '👥', path: '/hr-dashboard?tab=employees' },
    { id: 'departments', label: 'Departments', icon: '🏢', path: '/hr-dashboard?tab=departments' },
    { id: 'branches', label: 'Branches', icon: '📍', path: '/hr-dashboard?tab=branches' },
    { id: 'branch-heads', label: 'Branch Heads', icon: '👔', path: '/hr-dashboard?tab=branch-heads' },
    { id: 'area-managers', label: 'Area Managers', icon: '🎯', path: '/hr-dashboard?tab=area-managers' },
    { id: 'reviews', label: 'Performance Reviews', icon: '📝', path: '/hr-dashboard?tab=reviews' },
    { id: 'history', label: 'Evaluation History', icon: '📈', path: '/hr-dashboard?tab=history' },
    { id: 'signature-reset', label: 'Signature Reset Requests', icon: '✍️', path: '/hr-dashboard?tab=signature-reset' },
  ];

  const topSummary = (
    <>
      {/* New Submissions (Last 24 hours) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">🆕 New Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600">
            {(() => {
              const now = new Date();
              return recentSubmissions.filter(sub => {
                const hoursDiff = (now.getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60);
                return hoursDiff <= 24;
              }).length;
            })()}
          </div>
          <p className="text-sm text-gray-500 mt-1">Last 24 hours</p>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">⏳ Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">
            {recentSubmissions.filter(sub => {
              const approvalStatus = sub.approvalStatus || (sub.employeeSignature && (sub.evaluatorSignature || sub.evaluationData?.evaluatorSignature) ? 'fully_approved' : 'pending');
              return approvalStatus === 'pending';
            }).length}
          </div>
          <p className="text-sm text-gray-500 mt-1">Needs review</p>
        </CardContent>
      </Card>

      {/* Approved Evaluations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">✅ Approved</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {recentSubmissions.filter(sub => {
              const approvalStatus = sub.approvalStatus || (sub.employeeSignature && (sub.evaluatorSignature || sub.evaluationData?.evaluatorSignature) ? 'fully_approved' : 'pending');
              return approvalStatus === 'fully_approved';
            }).length}
          </div>
          <p className="text-sm text-gray-500 mt-1">Completed reviews</p>
        </CardContent>
      </Card>

      {/* Total Employees */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">👥 Total Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">
            {hrMetrics?.totalEmployees || employees.length}
          </div>
          <p className="text-sm text-gray-500 mt-1">All registered employees</p>
        </CardContent>
      </Card>
    </>
  );

  return (
    <>
      {/* Loading Screen - Shows only during initial load, not during refreshes */}
      {(loading && !hrMetrics) && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-800">Loading HR Dashboard...</p>
          </div>
        </div>
      )}

      
      <DashboardShell
        title="HR Dashboard"
        currentPeriod={new Date().toLocaleDateString()}
        sidebarItems={sidebarItems}
        activeItemId={active}
        onChangeActive={handleTabChange}
        topSummary={topSummary}
        // profile={{ name: 'HR Manager', roleOrPosition: 'Human Resources' }}
      >
             {active === 'overview' && (
        <Suspense fallback={
          <div className="relative min-h-[500px]">
                   <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                     <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                       <div className="relative">
                         <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                           <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                         </div>
                       </div>
                <p className="text-sm text-gray-600 font-medium">Loading overview...</p>
                     </div>
                   </div>
                             </div>
        }>
          <OverviewTab
            recentSubmissions={recentSubmissions}
            submissionsLoading={submissionsLoading}
            onRefresh={async () => {
              setSubmissionsLoading(true);
              await new Promise(resolve => setTimeout(resolve, 800));
              await fetchRecentSubmissions();
            }}
            onViewSubmission={viewSubmissionDetails}
            isActive={active === 'overview'}
          />
        </Suspense>
      )}

      {active === 'evaluation-records' && (
        <Suspense fallback={null}>
          <EvaluationRecordsTab
            key={active}
            recentSubmissions={recentSubmissions}
            departments={departments}
            onRefresh={async () => {
              await fetchRecentSubmissions();
            }}
            onViewSubmission={viewSubmissionDetails}
            onDeleteClick={handleDeleteRecordClick}
            isActive={active === 'evaluation-records'}
          />
        </Suspense>
      )}

      {active === 'employees' && (
        <Suspense fallback={
          <div className="relative min-h-[500px]">
                      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                          <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 font-medium">Loading employees...</p>
                        </div>
                      </div>
                                </div>
        }>
          <EmployeesTab
            employees={employees}
            departments={departments}
            branches={branches}
            hrMetrics={hrMetrics}
            employeesRefreshing={employeesRefreshing}
            onRefresh={refreshEmployeeData}
            onViewEmployee={handleViewEmployee}
            onEditEmployee={handleEditEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onEvaluateEmployee={handleEvaluateEmployee}
            onViewPerformanceEmployees={handleViewPerformanceEmployees}
            onAddEmployee={() => {
              setIsAddEmployeeModalOpen(true);
            }}
            isActive={active === 'employees'}
          />
        </Suspense>
      )}

      {active === 'departments' && (
        <Suspense fallback={
          <div className="relative min-h-[500px]">
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading departments...</p>
                </div>
              </div>
                      </div>
        }>
          <DepartmentsTab
            departments={departments}
            employees={employees}
            departmentsRefreshing={departmentsRefreshing}
            isActive={active === 'departments'}
          />
        </Suspense>
      )}

      {active === 'branches' && (
        <Suspense fallback={
          <div className="relative min-h-[500px]">
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading branches...</p>
                </div>
              </div>
                      </div>
        }>
          <BranchesTab
            branches={branches}
            employees={employees}
            branchesRefreshing={branchesRefreshing}
            isActive={active === 'branches'}
            onBranchesUpdate={async () => {
              // Refresh branches from API
              const branchesData = await apiService.getBranches();
              setBranches(branchesData.map((branch: {label: string, value: string}) => ({
                id: branch.value,
                name: branch.label
              })));
            }}
          />
        </Suspense>
      )}

      {active === 'branch-heads' && (
        <Suspense fallback={
          <div className="relative min-h-[500px]">
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading branch heads...</p>
                </div>
              </div>
                      </div>
        }>
          <BranchHeadsTab />
        </Suspense>
      )}

      {active === 'area-managers' && (
        <Suspense fallback={
          <div className="relative min-h-[500px]">
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading area managers...</p>
                </div>
              </div>
                      </div>
        }>
          <AreaManagersTab />
        </Suspense>
      )}

      {active === 'reviews' && (
        <Suspense fallback={
          <div className="relative min-h-[500px]">
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading performance reviews...</p>
                </div>
              </div>
                    </div>
        }>
          <PerformanceReviewsTab
            recentSubmissions={recentSubmissions}
            reviewsRefreshing={reviewsRefreshing}
            loading={loading}
            calculateOverallRating={calculateOverallRating}
            getSubmissionHighlight={getSubmissionHighlight}
            getTimeAgo={getTimeAgo}
            onViewSubmission={viewSubmissionDetails}
            isActive={active === 'reviews'}
          />
        </Suspense>
      )}

      {active === 'history' && (
        <Suspense fallback={
            <div className="relative min-h-[500px]">
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading evaluation history...</p>
                </div>
              </div>
                    </div>
        }>
          <EvaluationHistoryTab
            recentSubmissions={recentSubmissions}
            loading={loading}
            historyRefreshing={historyRefreshing}
            quarterlyRefreshing={quarterlyRefreshing}
            calculateOverallRating={calculateOverallRating}
            getSubmissionHighlight={getSubmissionHighlight}
            getTimeAgo={getTimeAgo}
            isNewSubmission={isNewSubmission}
            getQuarterColor={getQuarterColor}
            onRefreshQuarterly={handleRefreshQuarterly}
            onRefreshHistory={handleRefreshHistory}
            onViewSubmission={viewSubmissionDetails}
            isActive={active === 'history'}
          />
        </Suspense>
      )}

      {active === 'signature-reset' && (
        <Suspense fallback={
          <div className="relative min-h-[500px]">
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 font-medium">Loading signature reset requests...</p>
              </div>
            </div>
          </div>
        }>
          <SignatureResetRequestsTab />
        </Suspense>
      )}


      {/* Employee Details Modal */}
      <Dialog open={isEmployeeModalOpen} onOpenChangeAction={setIsEmployeeModalOpen}>
        <DialogContent className={`max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-blue-100 animate-popup ${dialogAnimationClass}`} key={isEmployeeModalOpen ? 'open' : 'closed'}>
          {selectedEmployee && (() => {
            const userAny = selectedEmployee as any;
            
            // Extract branch value - could be string, object, or array (same as EditUserModal)
            let branchValue = "";
            let branchNameOrId = "";
            if (selectedEmployee.branch && typeof selectedEmployee.branch === "string") {
              branchNameOrId = selectedEmployee.branch;
            } else if (userAny.branches && Array.isArray(userAny.branches) && userAny.branches.length > 0) {
              branchNameOrId = userAny.branches[0]?.branch_name || userAny.branches[0]?.name || userAny.branches[0]?.id || "";
            } else if (selectedEmployee.branch && typeof selectedEmployee.branch === "object") {
              branchNameOrId = (selectedEmployee.branch as any).branch_name || (selectedEmployee.branch as any).name || (selectedEmployee.branch as any).id || String(selectedEmployee.branch);
            } else if (selectedEmployee.branch) {
              branchNameOrId = String(selectedEmployee.branch);
            }
            
            // Find branch label from branches array
            if (branchNameOrId && branches && branches.length > 0) {
              const foundBranch = branches.find((b: any) => {
                const bLabel = (b as any).label || b.name || "";
                const bValue = (b as any).value || b.id || "";
                return (
                  bLabel === branchNameOrId ||
                  bValue === branchNameOrId ||
                  String(bValue) === String(branchNameOrId) ||
                  bLabel.includes(branchNameOrId) ||
                  branchNameOrId.includes(bLabel.split(" /")[0])
                );
              });
              branchValue = foundBranch?.name || (foundBranch as any)?.label || branchNameOrId;
            } else {
              branchValue = branchNameOrId;
            }

            // Extract position value - could be string, object with label/value, or nested in positions object
            let userPosition = "";
            if (selectedEmployee.position && typeof selectedEmployee.position === "string") {
              userPosition = selectedEmployee.position;
            } else if (userAny.positions) {
              if (typeof userAny.positions === "object" && !Array.isArray(userAny.positions)) {
                userPosition = userAny.positions.label || userAny.positions.name || userAny.positions.value || "";
              } else if (typeof userAny.positions === "string") {
                userPosition = userAny.positions;
              }
            }
            
            // Find position label from positionsData array
            const foundPosition = positionsData.find((p: any) => 
              (p as any).label === userPosition ||
              p.name === userPosition ||
              (p as any).value === userPosition ||
              p.id === userPosition ||
              String((p as any).value) === String(userPosition)
            );
            const positionLabel = foundPosition?.name || (foundPosition as any)?.label || userPosition || "Not Assigned";

            // Extract role value - could be string, object, or array
            let userRole = "";
            if (selectedEmployee.role && typeof selectedEmployee.role === "string") {
              userRole = selectedEmployee.role;
            } else if (userAny.roles && Array.isArray(userAny.roles) && userAny.roles.length > 0) {
              userRole = userAny.roles[0]?.name || userAny.roles[0]?.value || "";
            } else if (selectedEmployee.role && typeof selectedEmployee.role === "object") {
              userRole = (selectedEmployee.role as any).name || (selectedEmployee.role as any).value || "";
            }

            // Extract department value - could be string or nested in departments object/array
            let departmentValue = "";
            if (selectedEmployee.department && typeof selectedEmployee.department === "string") {
              departmentValue = selectedEmployee.department;
            } else if (userAny.departments && Array.isArray(userAny.departments) && userAny.departments.length > 0) {
              departmentValue = userAny.departments[0]?.name || userAny.departments[0] || "";
            } else if (userAny.departments && typeof userAny.departments === "object") {
              departmentValue = userAny.departments.name || "";
            }

            // Split name into first and last name
            const fname = userAny.fname || selectedEmployee.name?.split(/\s+/)[0] || "";
            const lname = userAny.lname || selectedEmployee.name?.split(/\s+/).slice(1).join(" ") || "";

            return (
              <>
                <DialogHeader className="pb-6">
                  <DialogTitle className="text-xl font-semibold">
                    Employee Details
                  </DialogTitle>
                  <DialogDescription className="text-gray-600">
                    View complete employee information and profile
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
                  {/* Employee ID */}
                  <div className="space-y-2">
                    <Label htmlFor="employeeId" className="text-base font-medium text-gray-900">
                      Employee ID
                    </Label>
                    {isLoadingEmployeeDetailsId ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : (
                      <Input
                        id="employeeId"
                        value={employeeDetailsId}
                        readOnly
                        disabled
                        className="bg-gray-100 border-gray-300 cursor-not-allowed"
                      />
                    )}
                  </div>

                  {/* First Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fname" className="text-base font-medium text-gray-900">
                      First Name
                    </Label>
                    <Input
                      id="fname"
                      value={fname}
                      readOnly
                      disabled
                      className="bg-gray-100 border-gray-300 cursor-not-allowed"
                    />
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <Label htmlFor="lname" className="text-base font-medium text-gray-900">
                      Last Name
                    </Label>
                    <Input
                      id="lname"
                      value={lname}
                      readOnly
                      disabled
                      className="bg-gray-100 border-gray-300 cursor-not-allowed"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-medium text-gray-900">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={selectedEmployee.email || ""}
                      readOnly
                      disabled
                      className="bg-gray-100 border-gray-300 cursor-not-allowed"
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-base font-medium text-gray-900">
                      Username
                    </Label>
                    <Input
                      id="username"
                      value={(selectedEmployee as any).username || "Not Set"}
                      readOnly
                      disabled
                      className="bg-gray-100 border-gray-300 cursor-not-allowed"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-base font-medium text-gray-900">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value="••••••••"
                      readOnly
                      disabled
                      className="bg-gray-100 border-gray-300 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">
                      Password is hidden for security
                    </p>
                  </div>

                  {/* Contact */}
                  <div className="space-y-2">
                    <Label htmlFor="contact" className="text-base font-medium text-gray-900">
                      Contact Number
                    </Label>
                    <Input
                      id="contact"
                      type="tel"
                      value={(selectedEmployee as any).contact || "Not Set"}
                      readOnly
                      disabled
                      className="bg-gray-100 border-gray-300 cursor-not-allowed"
                    />
                  </div>

                  {/* Position */}
                  <div className="space-y-2 w-2/3">
                    <Label htmlFor="position" className="text-base font-medium text-gray-900">
                      Position
                    </Label>
                    <Input
                      id="position"
                      value={positionLabel}
                      readOnly
                      disabled
                      className="bg-gray-100 border-gray-300 cursor-not-allowed"
                    />
                  </div>

                  {/* Department - Show only if branch is HO, Head Office, or none */}
                  {isBranchHOOrNone(branchValue) && (
                    <div className="space-y-2 w-1/2">
                      <Label htmlFor="department" className="text-base font-medium text-gray-900">
                        Department
                      </Label>
                      <Input
                        id="department"
                        value={departmentValue || "Not Assigned"}
                        readOnly
                        disabled
                        className="bg-gray-100 border-gray-300 cursor-not-allowed"
                      />
                    </div>
                  )}

                  {/* Branch */}
                  <div className="space-y-2 w-1/2">
                    <Label htmlFor="branch" className="text-base font-medium text-gray-900">
                      Branch
                    </Label>
                    <Input
                      id="branch"
                      value={branchValue || "Not Assigned"}
                      readOnly
                      disabled
                      className="bg-gray-100 border-gray-300 cursor-not-allowed"
                    />
                  </div>

                  {/* Role */}
                  <div className="space-y-2 w-1/2">
                    <Label htmlFor="role" className="text-base font-medium text-gray-900">
                      Role
                    </Label>
                    <Input
                      id="role"
                      value={userRole || "Not Assigned"}
                      readOnly
                      disabled
                      className="bg-gray-100 border-gray-300 cursor-not-allowed"
                    />
                  </div>

                  {/* Active Status */}
                  <div className="space-y-2 w-1/2">
                    <Label htmlFor="isActive" className="text-base font-medium text-gray-900">
                      Status
                    </Label>
                    <Input
                      id="isActive"
                      value={(selectedEmployee as any).isActive !== undefined 
                        ? ((selectedEmployee as any).isActive ? "Active" : "Inactive")
                        : "Active"}
                      readOnly
                      disabled
                      className="bg-gray-100 border-gray-300 cursor-not-allowed"
                    />
                  </div>
                </div>

                <DialogFooter className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setIsEmployeeModalOpen(false)}
                    className="px-6"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => {
          setIsAddEmployeeModalOpen(false);
        }}
        onSave={handleAddEmployee}
        departments={departments.map(dept => dept.name)}
        branches={branches}
        positions={positionsData}
        roles={[]}
      />

      {/* Edit User Modal */}
      {selectedEmployee && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEmployee(null);
          }}
          user={selectedEmployee as any}
          onSave={handleSaveEmployee}
          departments={departments.map(dept => dept.name)}
          branches={branches.map(branch => ({ value: branch.id, label: branch.name }))}
          positions={positionsData.map(pos => ({ value: pos.id, label: pos.name }))}
          onRefresh={refreshDashboardData}
        />
      )}

       {/* Performance Employees Drawer */}
       <Drawer open={isPerformanceModalOpen} onOpenChange={setIsPerformanceModalOpen}>
         <DrawerContent className="max-h-[95vh] h-[95vh] w-1/2 mx-auto">
           <DrawerHeader className="pb-4 border-b">
             <DrawerTitle className="text-2xl font-bold text-gray-900">
               {selectedPerformanceLevel.charAt(0).toUpperCase() + selectedPerformanceLevel.slice(1)} Performers
             </DrawerTitle>
             <DrawerDescription className="text-base text-gray-600 mt-2">
               Employees with {selectedPerformanceLevel} performance rating
             </DrawerDescription>
           </DrawerHeader>
           
           <div className="overflow-y-auto px-4 py-4 space-y-4">
             {getPerformanceEmployees(selectedPerformanceLevel).length === 0 ? (
               <div className="text-center py-12 text-gray-500">
                 <p>No employees found for this performance level.</p>
               </div>
             ) : (
               getPerformanceEmployees(selectedPerformanceLevel).map((employee) => (
                 <div key={employee.id} className="bg-gray-50 rounded-lg p-4">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                         <span className="text-blue-600 font-semibold text-sm">
                           {employee.name.split(' ').map(n => n[0]).join('')}
                         </span>
                       </div>
                       <div>
                         <h4 className="font-semibold text-gray-900">{employee.name}</h4>
                         <p className="text-sm text-gray-600">{employee.position}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <Badge variant="outline" className="mb-1">{employee.department}</Badge>
                       <p className="text-xs text-gray-500">{employee.branch}</p>
                     </div>
                   </div>
                   <div className="mt-3 flex items-center justify-between text-sm">
                     <span className="text-gray-600">Employee ID: #{employee.id}</span>
                   </div>
                 </div>
               ))
             )}
           </div>

           <DrawerFooter className="border-t">
             <Button 
               variant="outline" 
               onClick={() => setIsPerformanceModalOpen(false)}
               className="w-1/2 mx-auto bg-blue-600 hover:bg-blue-700 hover:text-white text-white"
             >
               Close
             </Button>
           </DrawerFooter>
         </DrawerContent>
       </Drawer>

        {/* View Results Modal */}
        <ViewResultsModal
          isOpen={isViewResultsModalOpen}
          onCloseAction={() => setIsViewResultsModalOpen(false)}
          submission={selectedSubmission}
        />

        {/* Delete Employee Confirmation Dialog */}
        <Dialog open={isDeleteModalOpen} onOpenChangeAction={setIsDeleteModalOpen}>
          <DialogContent 
            key={`delete-dialog-${isDeleteModalOpen}-${employeeToDelete?.id || ''}`}
            className={`sm:max-w-md ${dialogAnimationClass}`}
          >
            <div className="space-y-6 p-2">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4 animate-pulse">
                  <svg className="h-6 w-6 text-red-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Delete Employee</h3>
                <p className="text-sm text-gray-500 mt-2">
                  {employeeToDelete 
                    ? `Are you sure you want to delete ${employeeToDelete.name} (${employeeToDelete.position})? This action cannot be undone.`
                    : "Are you sure you want to delete this employee? This action cannot be undone."
                  }
                </p>
                <p className="text-xs text-gray-400 mt-2">Please enter your password to confirm this action.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-employee-password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="delete-employee-password"
                  type="password"
                  placeholder="Enter your password"
                  value={deleteEmployeePassword}
                  onChange={(e) => {
                    setDeleteEmployeePassword(e.target.value);
                    setDeleteEmployeePasswordError('');
                  }}
                  className={deleteEmployeePasswordError ? 'border-red-500' : ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      confirmDeleteEmployee();
                    }
                  }}
                />
                {deleteEmployeePasswordError && (
                  <p className="text-sm text-red-600">{deleteEmployeePasswordError}</p>
                )}
              </div>

              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setEmployeeToDelete(null);
                    setDeleteEmployeePassword('');
                    setDeleteEmployeePasswordError('');
                  }}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteEmployee}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Employee
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Evaluation Type Selection Modal */}
        <EvaluationTypeModal
          isOpen={isEvaluationTypeModalOpen}
          onCloseAction={() => {
            setIsEvaluationTypeModalOpen(false);
            if (!evaluationType) {
              setEmployeeToEvaluate(null);
            }
          }}
          onSelectEmployeeAction={() => {
            const employee = employeeToEvaluate;
            console.log('Selecting employee evaluation', employee);
            if (!employee) {
              console.error('No employee selected!');
              return;
            }
            setEvaluationType('employee');
            setIsEvaluationTypeModalOpen(false);
            // Use setTimeout to ensure state is set before opening modal
            setTimeout(() => {
              console.log('Opening employee evaluation modal', employee, 'employee');
              // Ensure employee is still set
              if (employee) {
                setEmployeeToEvaluate(employee);
              }
              setIsEvaluationModalOpen(true);
            }, 50);
          }}
          onSelectManagerAction={() => {
            const employee = employeeToEvaluate;
            console.log('Selecting manager evaluation', employee);
            if (!employee) {
              console.error('No employee selected!');
              return;
            }
            setEvaluationType('manager');
            setIsEvaluationTypeModalOpen(false);
            // Use setTimeout to ensure state is set before opening modal
            setTimeout(() => {
              console.log('Opening manager evaluation modal', employee, 'manager');
              // Ensure employee is still set
              if (employee) {
                setEmployeeToEvaluate(employee);
              }
              setIsEvaluationModalOpen(true);
            }, 50);
          }}
          employeeName={employeeToEvaluate?.name}
        />

        {/* Employee Evaluation Modal */}
        <Dialog open={isEvaluationModalOpen} onOpenChangeAction={(open) => {
          console.log('Evaluation modal onOpenChangeAction', open, 'employeeToEvaluate:', employeeToEvaluate, 'evaluationType:', evaluationType);
          if (!open) {
            setIsEvaluationModalOpen(false);
            setEmployeeToEvaluate(null);
            setEvaluationType(null);
          }
        }}>
          <DialogContent className={`max-w-6xl max-h-[95vh] overflow-hidden p-0 ${dialogAnimationClass}`}>
            {employeeToEvaluate && evaluationType === 'employee' && currentUser && (
              <EvaluationForm
                key={`hr-eval-${employeeToEvaluate.id}-${evaluationType}`}
                employee={{
                  id: employeeToEvaluate.id,
                  name: employeeToEvaluate.name,
                  email: employeeToEvaluate.email,
                  position: employeeToEvaluate.position,
                  department: employeeToEvaluate.department,
                  branch: employeeToEvaluate.branch,
                  role: employeeToEvaluate.role,
                  employeeId: employeeToEvaluate.employeeId || undefined,
                }}
                currentUser={{
                  id: typeof currentUser.id === 'number' ? currentUser.id : Number(currentUser.id) || 0,
                  name: currentUser.fname + ' ' + currentUser.lname,
                  email: currentUser.email || '',
                  position: 'HR Manager',
                  department: 'Human Resources',
                  role: currentUser.roles?.[0]?.name || currentUser.roles?.[0] || 'employee',
                  signature: currentUser.signature,
                }}
                onCloseAction={async () => {
                  setIsEvaluationModalOpen(false);
                  setEmployeeToEvaluate(null);
                  setEvaluationType(null);
                  // Small delay to ensure data is saved before refreshing
                  await new Promise(resolve => setTimeout(resolve, 500));
                  // Refresh submissions to show new evaluation
                  await fetchRecentSubmissions();
                }}
                onCancelAction={() => {
                  setIsEvaluationModalOpen(false);
                  setEmployeeToEvaluate(null);
                  setEvaluationType(null);
                }}
              />
            )}
            {employeeToEvaluate && evaluationType === 'manager' && currentUser && (
              <ManagerEvaluationForm
                key={`hr-manager-eval-${employeeToEvaluate.id}-${evaluationType}`}
                employee={{
                  id: employeeToEvaluate.id,
                  name: employeeToEvaluate.name,
                  email: employeeToEvaluate.email,
                  position: employeeToEvaluate.position,
                  department: employeeToEvaluate.department,
                  branch: employeeToEvaluate.branch,
                  role: employeeToEvaluate.role,
                  employeeId: employeeToEvaluate.employeeId || undefined,
                }}
                currentUser={{
                  id: typeof currentUser.id === 'number' ? currentUser.id : Number(currentUser.id) || 0,
                  name: currentUser.fname + ' ' + currentUser.lname,
                  email: currentUser.email || '',
                  position: 'HR Manager',
                  department: 'Human Resources',
                  role: currentUser.roles?.[0]?.name || currentUser.roles?.[0] || 'employee',
                  signature: currentUser.signature,
                }}
                  onCloseAction={async () => {
                    setIsEvaluationModalOpen(false);
                    setEmployeeToEvaluate(null);
                    setEvaluationType(null);
                    // Small delay to ensure data is saved before refreshing
                    await new Promise(resolve => setTimeout(resolve, 500));
                    // Refresh submissions to show new evaluation
                    await fetchRecentSubmissions();
                  }}
                  onCancelAction={() => {
                    setIsEvaluationModalOpen(false);
                    setEmployeeToEvaluate(null);
                    setEvaluationType(null);
                  }}
                />
              )}
            {employeeToEvaluate && !evaluationType && (
              <div className="p-8 text-center">
                <p className="text-gray-500">Please select an evaluation type... (Debug: employee={employeeToEvaluate?.name}, type={evaluationType})</p>
              </div>
            )}
            {!employeeToEvaluate && (
              <div className="p-8 text-center">
                <p className="text-gray-500">No employee selected (Debug: evaluationType={evaluationType})</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Evaluation Record Confirmation Modal */}
        <Dialog open={isDeleteRecordModalOpen} onOpenChangeAction={setIsDeleteRecordModalOpen}>
          <DialogContent className={`sm:max-w-md ${dialogAnimationClass}`}>
            <div className="space-y-6 p-2">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4 animate-pulse">
                  <svg className="h-6 w-6 text-red-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Delete Evaluation Record</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Are you sure you want to delete the evaluation record for <strong>{recordToDelete?.employeeName}</strong>?
                  This action cannot be undone and all data will be permanently removed.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="delete-password" className="text-sm font-medium text-gray-700">
                    Enter your account password to confirm deletion:
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      setDeletePasswordError('');
                    }}
                    placeholder="Enter your account password"
                    className={`mt-2 ${deletePasswordError ? 'border-red-500 bg-gray-50 focus:border-red-500 focus:ring-red-500' : 'bg-white'}`}
                  />
                  {deletePasswordError && (
                    <p className="text-sm text-red-600 mt-2">{deletePasswordError}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteRecordModalOpen(false);
                    setRecordToDelete(null);
                    setDeletePassword('');
                    setDeletePasswordError('');
                  }}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDeleteRecord}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Record
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Guide modal is now handled in DashboardShell */}
      </DashboardShell>
    </>
  );
}

// Wrap with HOC for authentication
export default withAuth(HRDashboard, { requiredRole: 'hr' });
