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
  hireDate: string;
  role: string;
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
        newHires: employees.filter((emp: any) => {
          if (!emp.hireDate) return false;
          const hireDate = new Date(emp.hireDate);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return hireDate > sixMonthsAgo;
        }).length,
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
          position: user.position,
          department: user.department,
          branch: user.branch,
          hireDate: user.hireDate,
          role: user.role,
          isActive: user.isActive
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
            position: user.position,
            department: user.department,
            branch: user.branch,
            hireDate: user.hireDate,
            role: user.role,
            isActive: user.isActive
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



  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee({
      ...employee,
      username: (employee as any).username || '',
      password: (employee as any).password || '',
      contact: (employee as any).contact || '',
      isActive: (employee as any).isActive !== undefined ? (employee as any).isActive : true,
      signature: (employee as any).signature || ''
    } as any);
    setIsEditModalOpen(true);
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
      if (newUser.hireDate) formData.append('hireDate', newUser.hireDate);
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
      // Update existing employee using API service
      const formData = new FormData();
      Object.keys(updatedUser).forEach((key) => {
        const value = updatedUser[key as keyof typeof updatedUser];
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
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
      
      // Fetch fresh employee data from API to ensure we have latest updates (position, department, role, hireDate)
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
          hireDate: freshEmployeeData.hireDate || employee.hireDate,
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
        .map((user: any) => ({
          id: user.employeeId || user.id,
          name: user.name || `${user.fname || ''} ${user.lname || ''}`.trim(),
          fname: user.fname,
          lname: user.lname,
          email: user.email,
          position: user.position,
          department: user.department,
          branch: user.branch,
          hireDate: user.hireDate,
          role: user.role,
          isActive: user.isActive
        }));
      setEmployees(employeesList);
      
      // Recalculate HR metrics
      const metrics: HRMetrics = {
        totalEmployees: employeesList.length,
        activeEmployees: employeesList.length,
        newHires: employeesList.filter((emp: any) => {
          const hireDate = new Date(emp.hireDate);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return hireDate > sixMonthsAgo;
        }).length,
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
            onViewEmployee={(employee) => {
                                  setSelectedEmployee(employee);
                                  setIsEmployeeModalOpen(true);
                                }}
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
        <DialogContent className={`max-w-4xl max-h-[95vh] overflow-y-auto ${dialogAnimationClass}`} key={isEmployeeModalOpen ? 'open' : 'closed'}>
          {selectedEmployee && (
            <>
              <DialogHeader className="pb-6">
                <DialogTitle className="text-2xl font-bold text-gray-900">Employee Details</DialogTitle>
                <DialogDescription className="text-base text-gray-600 mt-2">
                  Complete employee information and profile
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 text-sm font-bold">👤</span>
                    </span>
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Full Name</Label>
                      <p className="text-lg text-gray-900 font-medium">{selectedEmployee.name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Email Address</Label>
                      <p className="text-lg text-gray-900 font-medium">{selectedEmployee.email}</p>
                    </div>
                  </div>
                </div>

                {/* Job Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-green-600 text-sm font-bold">💼</span>
                    </span>
                    Job Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Position</Label>
                      <p className="text-lg text-gray-900 font-medium">{selectedEmployee.position}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Role</Label>
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {selectedEmployee.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Organization Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-purple-600 text-sm font-bold">🏢</span>
                    </span>
                    Organization
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Department</Label>
                      <Badge variant="outline" className="text-base px-3 py-1">
                        {selectedEmployee.department}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Branch</Label>
                      <p className="text-lg text-gray-900 font-medium">{selectedEmployee.branch}</p>
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-orange-600 text-sm font-bold">📅</span>
                    </span>
                    Employment Details
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Hire Date</Label>
                      <p className="text-lg text-gray-900 font-medium">
                        {new Date(selectedEmployee.hireDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Employee ID</Label>
                      <p className="text-lg text-gray-900 font-medium">#{selectedEmployee.id}</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-gray-200 mt-4">
                <div className="flex justify-end space-x-4 w-full">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEmployeeModalOpen(false)}
                    className="px-8 py-3 text-white font-medium bg-blue-600 hover:bg-blue-700 hover:text-black hover:bg-yellow-500"
                  >
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
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
          user={{
            id: selectedEmployee.id,
            name: selectedEmployee.name,
            email: selectedEmployee.email,
            position: selectedEmployee.position,
            department: selectedEmployee.department,
            branch: selectedEmployee.branch,
            role: selectedEmployee.role,
            username: (selectedEmployee as any).username || '',
            password: (selectedEmployee as any).password || '',
            contact: (selectedEmployee as any).contact || '',
            hireDate: selectedEmployee.hireDate || '',
            isActive: (selectedEmployee as any).isActive !== undefined ? (selectedEmployee as any).isActive : true,
            signature: (selectedEmployee as any).signature || ''
            // Note: employeeId is fetched by EditUserModal from accounts, not passed here
          }}
          onSave={handleSaveEmployee}
          departments={departments.map(dept => dept.name)}
          branches={branches}
          positions={positionsData}
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
                     <span className="text-gray-600">
                       Hired: {new Date(employee.hireDate).toLocaleDateString()}
                     </span>
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
                  hireDate: employeeToEvaluate.hireDate,
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
                  hireDate: employeeToEvaluate.hireDate,
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
