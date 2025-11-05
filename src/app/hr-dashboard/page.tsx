'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardShell, { SidebarItem } from '@/components/DashboardShell';
import { withAuth } from '@/hoc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Eye, FileText, Pencil, Trash2, X } from "lucide-react";
import SearchableDropdown from "@/components/ui/searchable-dropdown";
import ViewResultsModal from '@/components/evaluation/ViewResultsModal';
import EvaluationForm from '@/components/evaluation';
import TabLoadingIndicator, { TableSkeletonLoader, PerformanceTableSkeleton } from '@/components/TabLoadingIndicator';
import { useTabLoading } from '@/hooks/useTabLoading';
import clientDataService from '@/lib/clientDataService';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUser } from '@/contexts/UserContext';
import EditUserModal from '@/components/EditUserModal';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getQuarterFromEvaluationData } from '@/lib/quarterUtils';
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, Trash, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import data
import accountsData from '@/data/accounts.json';
import departmentsData from '@/data/departments.json';
// branchData now comes from clientDataService

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

// Function to get quarter from date
const getQuarterFromDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    
    if (month >= 1 && month <= 3) return `Q1 ${year}`;
    if (month >= 4 && month <= 6) return `Q2 ${year}`;
    if (month >= 7 && month <= 9) return `Q3 ${year}`;
    if (month >= 10 && month <= 12) return `Q4 ${year}`;
    
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

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

const getRatingLabel = (score: number): string => {
  if (score >= 4.5) return 'Outstanding';
  if (score >= 4.0) return 'Exceeds Expectations';
  if (score >= 3.5) return 'Meets Expectations';
  if (score >= 2.5) return 'Needs Improvement';
  return 'Unsatisfactory';
};

const getRatingColor = (rating: number): string => {
  if (rating >= 4.5) return 'bg-green-100 text-green-800';
  if (rating >= 4.0) return 'bg-blue-100 text-blue-800';
  if (rating >= 3.5) return 'bg-yellow-100 text-yellow-800';
  if (rating >= 2.5) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
  const [employeeViewMode, setEmployeeViewMode] = useState<'directory' | 'performance'>('directory');
  const [overviewSearchTerm, setOverviewSearchTerm] = useState('');
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [employeeToEvaluate, setEmployeeToEvaluate] = useState<Employee | null>(null);

  // Evaluation Records tab filters
  const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
  const [recordsDepartmentFilter, setRecordsDepartmentFilter] = useState('');
  const [recordsApprovalFilter, setRecordsApprovalFilter] = useState('');
  const [recordsQuarterFilter, setRecordsQuarterFilter] = useState('');
  const [recordsDateRange, setRecordsDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [recordsRefreshing, setRecordsRefreshing] = useState(false);
  const [employeesRefreshing, setEmployeesRefreshing] = useState(false);
  const [departmentsRefreshing, setDepartmentsRefreshing] = useState(false);
  const [branchesRefreshing, setBranchesRefreshing] = useState(false);
  const [reviewsRefreshing, setReviewsRefreshing] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [quarterlyRefreshing, setQuarterlyRefreshing] = useState(false);
  const [recordsSort, setRecordsSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({ field: 'date', direction: 'desc' });
  
  // Evaluation History tab state
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [quarterlySearchTerm, setQuarterlySearchTerm] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<{from?: Date, to?: Date}>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showRefreshingDialog, setShowRefreshingDialog] = useState(false);
  const [refreshingMessage, setRefreshingMessage] = useState('');

  // Delete evaluation record modal state
  const [isDeleteRecordModalOpen, setIsDeleteRecordModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');

  // Get current user (HR)
  const { user: currentUser } = useUser();

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
        setRecordsRefreshing(true);
        // Add a small delay to ensure spinner is visible
        await new Promise(resolve => setTimeout(resolve, 800));
        await fetchRecentSubmissions();
        setRecordsRefreshing(false);
      } else if (tabId === 'employees') {
        await refreshEmployeeData();
      } else if (tabId === 'departments') {
        setDepartmentsRefreshing(true);
        // Add a small delay to ensure spinner is visible
        await new Promise(resolve => setTimeout(resolve, 800));
        // Refresh departments data (reload from departmentsData)
        setDepartments(departmentsData);
        setDepartmentsRefreshing(false);
      } else if (tabId === 'branches') {
        setBranchesRefreshing(true);
        // Add a small delay to ensure spinner is visible
        await new Promise(resolve => setTimeout(resolve, 800));
        // Refresh branches data
        const branchesData = await clientDataService.getBranches();
        setBranches(branchesData);
        setBranchesRefreshing(false);
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
  
  const clearDateFilter = () => {
    setDateFilter({});
  };
  
  // Refresh function for Quarterly Performance table
  const handleRefreshQuarterly = async () => {
    setQuarterlyRefreshing(true);
    setRefreshingMessage('Refreshing quarterly performance...');
    setShowRefreshingDialog(true);
    try {
      // Add a small delay to simulate loading
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Refresh data
      await refreshHRData();
      // Show success toast
      // Note: Need to import useToast if not already available
    } catch (error) {
      console.error('Error refreshing quarterly performance:', error);
    } finally {
      setQuarterlyRefreshing(false);
      setShowRefreshingDialog(false);
    }
  };
  
  // Refresh function for Evaluation History table
  const handleRefreshHistory = async () => {
    setHistoryRefreshing(true);
    setRefreshingMessage('Refreshing evaluation history...');
    setShowRefreshingDialog(true);
    try {
      // Add a small delay to simulate loading
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Refresh data
      await refreshHRData();
      // Show success toast
    } catch (error) {
      console.error('Error refreshing evaluation history:', error);
    } finally {
      setHistoryRefreshing(false);
      setShowRefreshingDialog(false);
    }
  };

  // Function to refresh HR dashboard data (used by shared hook)
  const refreshHRData = async () => {
    try {
      setLoading(true);
      
      // Load data
      // Convert accounts data to employees format (filter out admin accounts)
      const employeeAccounts = (accountsData.accounts || []).filter((account: any) => account.role !== 'admin');
      const employeesList = employeeAccounts.map((account: any) => ({
        id: account.employeeId || account.id,
        name: account.name,
        email: account.email,
        position: account.position,
        department: account.department,
        branch: account.branch,
        hireDate: account.hireDate,
        role: account.role
      }));
      setEmployees(employeesList);
      setDepartments(departmentsData);
      
      // Load branches from API
      const branchesData = await clientDataService.getBranches();
      setBranches(branchesData);
      
      // Load positions from API
      const positions = await clientDataService.getPositions();
      setPositionsData(positions);

      // Calculate HR metrics
      const employees = employeeAccounts;
      const metrics: HRMetrics = {
        totalEmployees: employees.length,
        activeEmployees: employees.length,
        newHires: employees.filter((emp: any) => {
          const hireDate = new Date(emp.hireDate);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return hireDate > sixMonthsAgo;
        }).length,
        turnoverRate: 5.2, // Mock data
        averageTenure: 2.8, // Mock data
        departmentsCount: departmentsData.length,
        branchesCount: branches.length,
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

  // Add custom CSS for container popup animation (same as evaluator dashboard)
  useEffect(() => {
    const styleId = 'hr-dashboard-animations';
    // Remove existing style if present
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = styleId;
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
      
      @keyframes deleteDialogPopup {
        0% {
          transform: scale(0.9) translateY(20px);
          opacity: 0;
        }
        50% {
          transform: scale(1.02) translateY(-5px);
          opacity: 0.9;
        }
        100% {
          transform: scale(1) translateY(0);
          opacity: 1;
        }
      }
      
      /* Override default Tailwind animations and apply custom popup */
      /* Target with highest specificity to override Tailwind defaults */
      div.delete-employee-dialog,
      .delete-employee-dialog {
        animation: deleteDialogPopup 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        transform-origin: center !important;
        will-change: transform, opacity;
      }
      
      /* Override ALL Tailwind animation utilities - use very specific selectors */
      div.delete-employee-dialog.animate-in,
      div.delete-employee-dialog.fade-in-0,
      div.delete-employee-dialog.zoom-in-95,
      div.delete-employee-dialog.animate-in.fade-in-0,
      div.delete-employee-dialog.animate-in.zoom-in-95,
      div.delete-employee-dialog.fade-in-0.zoom-in-95,
      div.delete-employee-dialog.animate-in.fade-in-0.zoom-in-95,
      .delete-employee-dialog.animate-in,
      .delete-employee-dialog.fade-in-0,
      .delete-employee-dialog.zoom-in-95,
      .delete-employee-dialog.animate-in.fade-in-0,
      .delete-employee-dialog.animate-in.zoom-in-95,
      .delete-employee-dialog.fade-in-0.zoom-in-95,
      .delete-employee-dialog.animate-in.fade-in-0.zoom-in-95 {
        animation: deleteDialogPopup 2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        animation-duration: 2s !important;
        animation-fill-mode: both !important;
      }
      
      /* Override !animate-none if present */
      .delete-employee-dialog.animate-none {
        animation: deleteDialogPopup 2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      }
      
      @keyframes employeeDetailsPopup {
        0% {
          transform: scale(0.9) translateY(20px);
          opacity: 0;
        }
        50% {
          transform: scale(1.02) translateY(-5px);
          opacity: 0.9;
        }
        100% {
          transform: scale(1) translateY(0);
          opacity: 1;
        }
      }
      
      /* Override default Tailwind animations and apply custom popup */
      div.employee-details-dialog,
      .employee-details-dialog {
        animation: employeeDetailsPopup 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        transform-origin: center !important;
        will-change: transform, opacity;
      }
      
      /* Override ALL Tailwind animation utilities - use very specific selectors */
      div.employee-details-dialog.animate-in,
      div.employee-details-dialog.fade-in-0,
      div.employee-details-dialog.zoom-in-95,
      div.employee-details-dialog.animate-in.fade-in-0,
      div.employee-details-dialog.animate-in.zoom-in-95,
      div.employee-details-dialog.fade-in-0.zoom-in-95,
      div.employee-details-dialog.animate-in.fade-in-0.zoom-in-95,
      .employee-details-dialog.animate-in,
      .employee-details-dialog.fade-in-0,
      .employee-details-dialog.zoom-in-95,
      .employee-details-dialog.animate-in.fade-in-0,
      .employee-details-dialog.animate-in.zoom-in-95,
      .employee-details-dialog.fade-in-0.zoom-in-95,
      .employee-details-dialog.animate-in.fade-in-0.zoom-in-95 {
        animation: employeeDetailsPopup 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        animation-duration: 0.5s !important;
        animation-fill-mode: both !important;
      }
      
      /* Override !animate-none if present */
      .employee-details-dialog.animate-none {
        animation: employeeDetailsPopup 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Force animation trigger when delete dialog opens
  useEffect(() => {
    if (isDeleteModalOpen) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        const dialogElement = document.querySelector('.delete-employee-dialog') as HTMLElement;
        if (dialogElement) {
          // Remove default Tailwind animation classes
          dialogElement.classList.remove('animate-in', 'fade-in-0', 'zoom-in-95');
          // Force reflow to trigger animation
          dialogElement.style.animation = 'none';
          void dialogElement.offsetWidth; // Trigger reflow
          // Apply custom animation
          dialogElement.style.animation = 'deleteDialogPopup 2s cubic-bezier(0.34, 1.56, 0.64, 1)';
          dialogElement.style.transformOrigin = 'center';
        }
      }, 50); // Increased delay to ensure DOM is ready
      return () => clearTimeout(timer);
    }
  }, [isDeleteModalOpen]);

  // Force animation trigger when employee details dialog opens
  useEffect(() => {
    if (isEmployeeModalOpen) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        const dialogElement = document.querySelector('.employee-details-dialog') as HTMLElement;
        if (dialogElement) {
          // Remove default Tailwind animation classes
          dialogElement.classList.remove('animate-in', 'fade-in-0', 'zoom-in-95');
          // Force reflow to trigger animation
          dialogElement.style.animation = 'none';
          void dialogElement.offsetWidth; // Trigger reflow
          // Apply custom animation
          dialogElement.style.animation = 'employeeDetailsPopup 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
          dialogElement.style.transformOrigin = 'center';
        }
      }, 50); // Increased delay to ensure DOM is ready
      return () => clearTimeout(timer);
    }
  }, [isEmployeeModalOpen]);

  // Real-time data updates via localStorage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only refresh if the change is from another tab/window
      if (e.key === 'submissions' && e.newValue !== e.oldValue) {
        console.log('📊 Submissions data updated, refreshing HR dashboard...');
        fetchRecentSubmissions();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch recent submissions from client data service
  const fetchRecentSubmissions = async () => {
    try {
      setSubmissionsLoading(true); // Set loading to true when starting fetch
      const submissions = await clientDataService.getSubmissions();
      setRecentSubmissions(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setSubmissionsLoading(false);
    }
  };


  useEffect(() => {
    const loadHRData = async () => {
      try {
        // Load data
        // Convert accounts data to employees format (filter out admin accounts)
        const employeeAccounts = (accountsData.accounts || []).filter((account: any) => account.role !== 'admin');
        const employeesList = employeeAccounts.map((account: any) => ({
          id: account.employeeId || account.id,
          name: account.name,
          email: account.email,
          position: account.position,
          department: account.department,
          branch: account.branch,
          hireDate: account.hireDate,
          role: account.role
        }));
        setEmployees(employeesList);
        setDepartments(departmentsData);
        
        // Load branches from API
        const branchesData = await clientDataService.getBranches();
        setBranches(branchesData);
        
        // Load positions from API
        const positions = await clientDataService.getPositions();
        setPositionsData(positions);

        // Calculate HR metrics
        const employees = employeeAccounts;
        const metrics: HRMetrics = {
          totalEmployees: employees.length,
          activeEmployees: employees.length,
          newHires: employees.filter((emp: any) => {
            const hireDate = new Date(emp.hireDate);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return hireDate > sixMonthsAgo;
          }).length,
          turnoverRate: 5.2, // Mock data
          averageTenure: 2.8, // Mock data
          departmentsCount: departmentsData.length,
          branchesCount: branches.length,
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
        setLoading(false);
      } catch (error) {
        console.error('Error loading HR data:', error);
        setLoading(false);
      }
    };

    loadHRData();
    fetchRecentSubmissions();
  }, []);


  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;
    const matchesBranch = selectedBranch === 'all' || employee.branch === selectedBranch;
    
    return matchesSearch && matchesDepartment && matchesBranch;
  });

  const getDepartmentStats = (deptName: string) => {
    const deptEmployees = employees.filter(emp => emp.department === deptName);
    return {
      count: deptEmployees.length,
      managers: deptEmployees.filter(emp => emp.role === 'Manager').length,
      averageTenure: 2.5 // Mock data
    };
  };

  const getBranchStats = (branchName: string) => {
    const branchEmployees = employees.filter(emp => emp.branch === branchName);
    return {
      count: branchEmployees.length,
      managers: branchEmployees.filter(emp => emp.role === 'Manager').length
    };
  };

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

  const handleSaveEmployee = async (updatedUser: any) => {
    try {
      if (updatedUser.id === 0) {
        // Adding new employee - generate new ID and add to storage
        const currentEmployees = await clientDataService.getEmployees();
        const newId = currentEmployees.length > 0 
          ? Math.max(...currentEmployees.map(emp => emp.id), 0) + 1
          : 1;
        updatedUser.id = newId;
        
        // Add to employees array and save to storage
        const newEmployees = [...currentEmployees, updatedUser];
        if (typeof window !== 'undefined') {
          localStorage.setItem('employees', JSON.stringify(newEmployees));
        }
      } else {
        // Update existing employee using client data service
        await clientDataService.updateEmployee(updatedUser.id, updatedUser);
      }

      // Refresh dashboard data to get updated information
      await refreshDashboardData(false, false);
      
      // Close modal and reset
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error saving employee:', error);
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

  const handleEvaluateEmployee = (employee: Employee) => {
    setEmployeeToEvaluate(employee);
    setIsEvaluationModalOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    // Validate password
    if (!deleteEmployeePassword.trim()) {
      setDeleteEmployeePasswordError('Password is required to delete employees');
      return;
    }

    try {
      // Get current user's password from accounts data
      const hrAccount = (accountsData as any).accounts?.find(
        (acc: any) => acc.email === currentUser?.email || acc.username === currentUser?.username
      );

      if (!hrAccount || hrAccount.password !== deleteEmployeePassword) {
        setDeleteEmployeePasswordError('Incorrect password. Please try again.');
        return;
      }

      // Password is correct, proceed with deletion
      // Remove employee from local state
      const updatedEmployees = employees.filter(emp => emp.id !== employeeToDelete.id);
      setEmployees(updatedEmployees);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('employees', JSON.stringify(updatedEmployees));
      }
      
      // Close modal and reset
      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
      setDeleteEmployeePassword('');
      setDeleteEmployeePasswordError('');
      
      // Refresh dashboard data
      await refreshDashboardData(false, false);
      
      console.log('Employee deleted:', employeeToDelete);
    } catch (error) {
      console.error('Error deleting employee:', error);
      setDeleteEmployeePasswordError('Failed to delete employee. Please try again.');
    }
  };

  // Helper functions for evaluation records
  const calculateScore = (scores: (string | number | undefined)[]): number => {
    const validScores = scores
      .filter((score): score is string | number => score !== undefined && score !== '')
      .map(score => typeof score === 'string' ? parseFloat(score) : score)
      .filter(score => !isNaN(score));
    
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  };

  const getRatingLabel = (score: number): string => {
    if (score >= 4.5) return 'Outstanding';
    if (score >= 3.5) return 'Exceeds Expectations';
    if (score >= 2.5) return 'Meets Expectations';
    if (score >= 1.5) return 'Needs Improvement';
    return 'Unsatisfactory';
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

    // Get the user's password from the accounts data
    const userAccount = (accountsData as any).accounts.find((account: any) =>
      account.email === currentUser.email || account.username === currentUser.email
    );

    if (!userAccount) {
      setDeletePasswordError('User account not found. Please refresh and try again.');
      return;
    }

    // Verify password
    if (deletePassword !== userAccount.password) {
      setDeletePasswordError('Incorrect password. Please try again.');
      return;
    }

    try {
      // Remove from localStorage
      const storedSubmissions = localStorage.getItem('submissions');
      if (storedSubmissions) {
        const submissions = JSON.parse(storedSubmissions);
        const updatedSubmissions = submissions.filter((sub: any) => sub.id !== recordToDelete.id);
        localStorage.setItem('submissions', JSON.stringify(updatedSubmissions));
      }

      // Update state
      setRecentSubmissions(prev => prev.filter(sub => sub.id !== recordToDelete.id));

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

  // Print evaluation record
  const printFeedback = (feedback: any) => {
    const originalSubmission = recentSubmissions.find(submission => submission.id === feedback.id);

    if (!originalSubmission || !originalSubmission.evaluationData) {
      alert('No evaluation data available for printing');
      return;
    }

    const data = originalSubmission.evaluationData;

    // Calculate scores
    const jobKnowledgeScore = calculateScore([data.jobKnowledgeScore1, data.jobKnowledgeScore2, data.jobKnowledgeScore3]);
    const qualityOfWorkScore = calculateScore([data.qualityOfWorkScore1, data.qualityOfWorkScore2, data.qualityOfWorkScore3, data.qualityOfWorkScore4, data.qualityOfWorkScore5]);
    const adaptabilityScore = calculateScore([data.adaptabilityScore1, data.adaptabilityScore2, data.adaptabilityScore3]);
    const teamworkScore = calculateScore([data.teamworkScore1, data.teamworkScore2, data.teamworkScore3]);
    const reliabilityScore = calculateScore([data.reliabilityScore1, data.reliabilityScore2, data.reliabilityScore3, data.reliabilityScore4]);
    const ethicalScore = calculateScore([data.ethicalScore1, data.ethicalScore2, data.ethicalScore3, data.ethicalScore4]);
    const customerServiceScore = calculateScore([data.customerServiceScore1, data.customerServiceScore2, data.customerServiceScore3, data.customerServiceScore4, data.customerServiceScore5]);

    // Calculate weighted scores
    const jobKnowledgeWeighted = (jobKnowledgeScore * 0.20).toFixed(2);
    const qualityOfWorkWeighted = (qualityOfWorkScore * 0.20).toFixed(2);
    const adaptabilityWeighted = (adaptabilityScore * 0.10).toFixed(2);
    const teamworkWeighted = (teamworkScore * 0.10).toFixed(2);
    const reliabilityWeighted = (reliabilityScore * 0.05).toFixed(2);
    const ethicalWeighted = (ethicalScore * 0.05).toFixed(2);
    const customerServiceWeighted = (customerServiceScore * 0.30).toFixed(2);

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

    const overallPercentage = (parseFloat(overallWeightedScore) / 5 * 100).toFixed(2);
    const isPass = parseFloat(overallWeightedScore) >= 3.0;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the evaluation');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Evaluation Report - ${data.employeeName}</title>
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
            .print-results { text-align: center; margin: 8px 0; }
            .print-percentage { font-size: 20px; font-weight: bold; }
            .print-status { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; font-size: 12px; }
            .print-status.pass { background-color: #16a34a; }
            .print-status.fail { background-color: #dc2626; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="print-title">PERFORMANCE EVALUATION REPORT</div>
          <div class="print-subtitle">Employee Performance Evaluation</div>
        </div>

        <div class="print-section">
          <div class="print-section-title">EMPLOYEE INFORMATION</div>
          <div class="print-grid">
            <div class="print-field">
              <div class="print-label">Employee:</div>
              <div class="print-value">${data.employeeName || 'N/A'}</div>
            </div>
            <div class="print-field">
              <div class="print-label">Position:</div>
              <div class="print-value">${data.position || 'N/A'}</div>
            </div>
            <div class="print-field">
              <div class="print-label">Department:</div>
              <div class="print-value">${data.department || 'N/A'}</div>
            </div>
            <div class="print-field">
              <div class="print-label">Evaluator:</div>
              <div class="print-value">${data.supervisor || feedback.evaluator || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="print-section">
          <div class="print-section-title">PERFORMANCE SCORES</div>
          <div class="print-grid">
            <div class="print-field">
              <div class="print-label">Job Knowledge:</div>
              <div class="print-value">${jobKnowledgeScore.toFixed(2)} (Weighted: ${jobKnowledgeWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Quality of Work:</div>
              <div class="print-value">${qualityOfWorkScore.toFixed(2)} (Weighted: ${qualityOfWorkWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Adaptability:</div>
              <div class="print-value">${adaptabilityScore.toFixed(2)} (Weighted: ${adaptabilityWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Teamwork:</div>
              <div class="print-value">${teamworkScore.toFixed(2)} (Weighted: ${teamworkWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Reliability:</div>
              <div class="print-value">${reliabilityScore.toFixed(2)} (Weighted: ${reliabilityWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Ethical Conduct:</div>
              <div class="print-value">${ethicalScore.toFixed(2)} (Weighted: ${ethicalWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Customer Service:</div>
              <div class="print-value">${customerServiceScore.toFixed(2)} (Weighted: ${customerServiceWeighted})</div>
            </div>
          </div>
        </div>

        <div class="print-results">
          <div class="print-percentage">${overallPercentage}%</div>
          <div class="print-status ${isPass ? 'pass' : 'fail'}">
            ${isPass ? 'PASS' : 'FAIL'}
          </div>
          <div style="margin-top: 10px;">
            <strong>Overall Score: ${overallWeightedScore} / 5.00</strong>
          </div>
          <div style="margin-top: 5px; font-size: 11px;">
            ${getRatingLabel(parseFloat(overallWeightedScore))}
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const refreshEmployeeData = async () => {
    try {
      setEmployeesRefreshing(true);
      
      // Add a small delay to ensure spinner is visible
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Reload data from accounts.json
      const employeeAccounts = (accountsData.accounts || []).filter((account: any) => account.role !== 'admin');
      const employeesList = employeeAccounts.map((account: any) => ({
        id: account.employeeId || account.id,
        name: account.name,
        email: account.email,
        position: account.position,
        department: account.department,
        branch: account.branch,
        hireDate: account.hireDate,
        role: account.role
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
        departmentsCount: departmentsData.length,
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

  // Evaluation Records: Sort handler
  const sortRecords = (field: string) => {
    setRecordsSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Evaluation Records: Get sort icon
  const getSortIcon = (field: string) => {
    if (recordsSort.field !== field) return ' ↕️';
    return recordsSort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Evaluation Records: Refresh handler
  const handleRecordsRefresh = async () => {
    setRecordsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await fetchRecentSubmissions();
    setRecordsRefreshing(false);
  };

  // Filtered evaluation records for export
  const filteredRecords = useMemo(() => {
    return recentSubmissions.filter((sub) => {
      if (recordsSearchTerm) {
        const searchLower = recordsSearchTerm.toLowerCase();
        const matches = 
          sub.employeeName?.toLowerCase().includes(searchLower) ||
          sub.evaluationData?.department?.toLowerCase().includes(searchLower) ||
          sub.evaluationData?.position?.toLowerCase().includes(searchLower) ||
          (sub.evaluationData?.supervisor || sub.evaluator || '').toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      if (recordsDepartmentFilter && sub.evaluationData?.department !== recordsDepartmentFilter) return false;
      if (recordsApprovalFilter) {
        const hasEmpSig = !!(sub.employeeSignature && sub.employeeSignature.trim() && sub.employeeSignature.startsWith('data:image'));
        const hasEvalSig = !!((sub.evaluatorSignature && sub.evaluatorSignature.trim() && sub.evaluatorSignature.startsWith('data:image')) || 
          (sub.evaluationData?.evaluatorSignature && sub.evaluationData?.evaluatorSignature.trim() && sub.evaluationData?.evaluatorSignature.startsWith('data:image')));
        let status = 'pending';
        if (hasEmpSig && hasEvalSig) {
          status = 'fully_approved';
        } else if (hasEmpSig) {
          status = 'employee_approved';
        } else if (sub.approvalStatus && sub.approvalStatus !== 'pending') {
          status = sub.approvalStatus;
        }
        if (status !== recordsApprovalFilter) return false;
      }
      if (recordsQuarterFilter && getQuarterFromDate(sub.submittedAt) !== recordsQuarterFilter) return false;
      if (recordsDateRange.from && new Date(sub.submittedAt) < new Date(recordsDateRange.from)) return false;
      if (recordsDateRange.to && new Date(sub.submittedAt) > new Date(recordsDateRange.to)) return false;
      return true;
    });
  }, [recentSubmissions, recordsSearchTerm, recordsDepartmentFilter, recordsApprovalFilter, recordsQuarterFilter, recordsDateRange]);


  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'evaluation-records', label: 'Evaluation Records', icon: '🗂️' },
    { id: 'employees', label: 'Employees', icon: '👥' },
    { id: 'departments', label: 'Departments', icon: '🏢' },
    { id: 'branches', label: 'Branches', icon: '📍' },
    { id: 'reviews', label: 'Performance Reviews', icon: '📝' },
    { id: 'history', label: 'Evaluation History', icon: '📈' },
  ];

  // Loading state is now handled in the main return statement

  // Filter and sort recent submissions - newest first
  const filteredSubmissions = recentSubmissions
    .filter((submission) => {
      if (!overviewSearchTerm) return true;
      
      const searchLower = overviewSearchTerm.toLowerCase();
      const employeeName = submission.employeeName?.toLowerCase() || '';
      const department = submission.evaluationData?.department?.toLowerCase() || '';
      const position = submission.evaluationData?.position?.toLowerCase() || '';
      const evaluator = (submission.evaluationData?.supervisor || submission.evaluator || '').toLowerCase();
      const quarter = getQuarterFromDate(submission.submittedAt).toLowerCase();
      const date = new Date(submission.submittedAt).toLocaleDateString().toLowerCase();
      const approvalStatus = submission.approvalStatus || (
        submission.employeeSignature && (submission.evaluatorSignature || submission.evaluationData?.evaluatorSignature)
          ? 'fully approved' 
          : 'pending'
      );
      const statusText = (
        approvalStatus === 'fully_approved' ? 'fully approved' :
        approvalStatus === 'rejected' ? 'rejected' :
        'pending'
      ).toLowerCase();
      
      return (
        employeeName.includes(searchLower) ||
        department.includes(searchLower) ||
        position.includes(searchLower) ||
        evaluator.includes(searchLower) ||
        quarter.includes(searchLower) ||
        date.includes(searchLower) ||
        statusText.includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Sort by date descending (newest first)
      const dateA = new Date(a.submittedAt).getTime();
      const dateB = new Date(b.submittedAt).getTime();
      return dateB - dateA;
    });

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
         <div className="relative space-y-6 h-[calc(100vh-300px)] overflow-y-auto pr-2">
           
           {/* Recent Activity - Evaluation Records Table */}
           <Card>
             <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Recent Evaluation Records
                {(() => {
                  const now = new Date();
                  const newCount = filteredSubmissions.filter(sub => {
                    const hoursDiff = (now.getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60);
                    return hoursDiff <= 24;
                  }).length;
                  return newCount > 0 ? (
                    <Badge className="bg-yellow-500 text-white animate-pulse">
                      {newCount} NEW
                    </Badge>
                  ) : null;
                })()}
                <Badge variant="outline" className="text-xs font-normal">
                  📅 Sorted: Newest First
                </Badge>
              </CardTitle>
             <CardDescription>Latest performance evaluations and reviews (most recent at the top)</CardDescription>
              {/* Search Bar and Refresh Button */}
              <div className="mt-4 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Input
                    placeholder="Search by employee, department, position, evaluator, or status..."
                    value={overviewSearchTerm}
                    onChange={(e) => setOverviewSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                  {overviewSearchTerm && (
                    <button
                      onClick={() => setOverviewSearchTerm('')}
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
                {/* Refresh Button */}
                <Button
                  onClick={async () => {
                    setSubmissionsLoading(true);
                    // Add a small delay to ensure spinner is visible
                    await new Promise(resolve => setTimeout(resolve, 800));
                    await fetchRecentSubmissions();
                  }}
                  disabled={submissionsLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                  title="Refresh evaluation records"
                >
                  {submissionsLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Refreshing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>🔄</span>
                      <span>Refresh</span>
                    </div>
                  )}
                </Button>
              </div>
              {/* Indicator Legend */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="text-sm font-medium text-gray-700 mr-2">Indicators:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-100 border-l-2 border-l-yellow-500 rounded"></div>
                    <Badge className="bg-yellow-200 text-yellow-800 text-xs">New</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-50 border-l-2 border-l-blue-500 rounded"></div>
                    <Badge className="bg-blue-300 text-blue-800 text-xs">Recent</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
                    <Badge className="bg-green-500 text-white text-xs">Approved</Badge>
                  </div>
                </div>
              </div>
             </CardHeader>
             <CardContent className="p-0">
               <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto">
                 {submissionsLoading && (
                   <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                     <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                       <div className="relative">
                         <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                           <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                         </div>
                       </div>
                       <p className="text-sm text-gray-600 font-medium">Loading evaluation records...</p>
                     </div>
                   </div>
                 )}
                 
                 <Table className="min-w-full">
                   <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                     <TableRow>
                       <TableHead className="px-6 py-3">Employee Name</TableHead>
                       <TableHead className="px-6 py-3">Department</TableHead>
                       <TableHead className="px-6 py-3">Position</TableHead>
                       <TableHead className="px-6 py-3">HR</TableHead>
                       <TableHead className="px-6 py-3">Quarter</TableHead>
                       <TableHead className="px-6 py-3">Date</TableHead>
                       <TableHead className="px-6 py-3">Approval Status</TableHead>
                       <TableHead className="px-6 py-3">Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody className="divide-y divide-gray-200">
                     {submissionsLoading ? (
                       Array.from({ length: 8 }).map((_, index) => (
                         <TableRow key={`skeleton-${index}`}>
                           <TableCell className="px-6 py-3">
                             <div className="space-y-1">
                               <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                               <div className="h-2.5 w-24 bg-gray-200 rounded animate-pulse"></div>
                             </div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="space-y-1">
                               <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                             </div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                           </TableCell>
                         </TableRow>
                       ))
                    ) : filteredSubmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="text-gray-500">
                            {overviewSearchTerm ? (
                              <>
                                <p className="text-sm font-medium">No results found for "{overviewSearchTerm}"</p>
                                <p className="text-xs mt-1">Try adjusting your search term</p>
                              
                              </>
                            ) : (
                              <>
                                <p className="text-sm">No evaluation records to display</p>
                                <p className="text-xs mt-1">Records will appear here when evaluations are submitted</p>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubmissions.slice(0, 10).map((submission) => {
                         const quarter = getQuarterFromDate(submission.submittedAt);
                         
                         // Check if both parties have signed (handle empty strings too)
                         const hasEmployeeSignature = !!(submission.employeeSignature && submission.employeeSignature.trim());
                         const hasEvaluatorSignature = !!((submission.evaluatorSignature && submission.evaluatorSignature.trim()) || 
                           (submission.evaluationData?.evaluatorSignature && submission.evaluationData?.evaluatorSignature.trim()));
                         
                         // Determine approval status - SIGNATURES HAVE PRIORITY over stored status
                         let approvalStatus = 'pending';
                         if (hasEmployeeSignature && hasEvaluatorSignature) {
                           approvalStatus = 'fully_approved';
                         } else if (hasEmployeeSignature) {
                           approvalStatus = 'employee_approved';
                         } else if (submission.approvalStatus && submission.approvalStatus !== 'pending') {
                           approvalStatus = submission.approvalStatus;
                         }
                         
                         // Calculate time difference for indicators
                         const submittedDate = new Date(submission.submittedAt);
                         const now = new Date();
                         const hoursDiff = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
                         const isNew = hoursDiff <= 24;
                         const isRecent = hoursDiff > 24 && hoursDiff <= 168; // 7 days
                         const isApproved = approvalStatus === 'fully_approved';
                         
                         // Determine row background color - APPROVAL STATUS HAS PRIORITY
                         let rowClassName = "hover:bg-gray-100 transition-colors";
                         if (isApproved) {
                           // Approved is always green (highest priority)
                           rowClassName = "bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500 transition-colors";
                         } else if (isNew) {
                           rowClassName = "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500 transition-colors";
                         } else if (isRecent) {
                           rowClassName = "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500 transition-colors";
                         }
                         
                         return (
                           <TableRow key={submission.id} className={rowClassName}>
                             <TableCell className="px-6 py-3">
                               <div>
                                 <div className="flex items-center gap-2 mb-1">
                                   <span className="font-medium text-gray-900">{submission.employeeName}</span>
                                   {isNew && (
                                     <Badge className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 font-semibold">
                                       ⚡ NEW
                                     </Badge>
                                   )}
                                   {!isNew && isRecent && (
                                     <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 font-semibold">
                                       🕐 RECENT
                                     </Badge>
                                   )}
                                   {isApproved && (
                                     <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0.5 font-semibold">
                                       ✓ APPROVED
                                     </Badge>
                                   )}
                                 </div>
                                 <div className="text-sm text-gray-500">{submission.evaluationData?.email || ''}</div>
                               </div>
                             </TableCell>
                             <TableCell className="px-6 py-3">
                               <Badge variant="outline" className="text-xs">
                                 {submission.evaluationData?.department || 'N/A'}
                               </Badge>
                             </TableCell>
                             <TableCell className="px-6 py-3 text-sm text-gray-600">
                               {submission.evaluationData?.position || 'N/A'}
                             </TableCell>
                             <TableCell className="px-6 py-3">
                               <div className="font-medium text-gray-900">
                                 {submission.evaluationData?.supervisor || submission.evaluator || 'N/A'}
                               </div>
                             </TableCell>
                             <TableCell className="px-6 py-3">
                               <Badge className={getQuarterColor(quarter)}>
                                 {quarter}
                               </Badge>
                             </TableCell>
                             <TableCell className="px-6 py-3 text-sm text-gray-600">
                               {new Date(submission.submittedAt).toLocaleDateString()}
                             </TableCell>
                             <TableCell className="px-6 py-3">
                               <Badge className={
                                 approvalStatus === 'fully_approved' ? 'bg-green-100 text-green-800' :
                                 approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                 'bg-gray-100 text-gray-800'
                               }>
                                 {approvalStatus === 'fully_approved' ? '✓ Fully Approved' :
                                  approvalStatus === 'rejected' ? '❌ Rejected' :
                                  '⏳ Pending'}
                               </Badge>
                             </TableCell>
                             <TableCell className="px-6 py-3">
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => viewSubmissionDetails(submission)}
                                 className="text-xs px-2 py-1 bg-green-600 hover:bg-green-300 text-white"
                               >
                                 ☰ View
                               </Button>
                             </TableCell>
                           </TableRow>
                         );
                       })
                     )}
                   </TableBody>
                 </Table>
               </div>
             </CardContent>
          </Card>
         </div>
       )}

      {active === 'evaluation-records' && (
        <div className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                All Evaluation Records
                {(() => {
                  const now = new Date();
                  const newCount = recentSubmissions.filter(sub => {
                    const hoursDiff = (now.getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60);
                    return hoursDiff <= 24;
                  }).length;
                  return newCount > 0 ? (
                    <Badge className="bg-yellow-500 text-white animate-pulse">
                      {newCount} NEW
                    </Badge>
                  ) : null;
                })()}
                <Badge variant="outline" className="text-xs font-normal">
                  {recentSubmissions.length} Total Records
                </Badge>
              </CardTitle>
              <CardDescription>Complete evaluation history with advanced filtering</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="flex-1">
                  <Label htmlFor="records-search" className="text-sm font-medium">Search</Label>
                  <div className="mt-1 relative">
                    <div className="relative w-full">
                      <Input
                        id="records-search"
                        placeholder="Search by employee name, evaluator, department, position..."
                        className="pr-10"
                        value={recordsSearchTerm}
                        onChange={(e) => setRecordsSearchTerm(e.target.value)}
                      />
                      {(recordsSearchTerm || recordsDepartmentFilter || recordsApprovalFilter || recordsQuarterFilter || recordsDateRange.from || recordsDateRange.to) && (
                        <button
                          onClick={() => {
                            setRecordsSearchTerm('');
                            setRecordsDepartmentFilter('');
                            setRecordsApprovalFilter('');
                            setRecordsQuarterFilter('');
                            setRecordsDateRange({ from: '', to: '' });
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600 hover:text-red-700"
                          title="Clear all filters"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Department Filter */}
                <div className="w-full md:w-48">
                  <Label htmlFor="records-department" className="text-sm font-medium">Department</Label>
                  <SearchableDropdown
                    options={['All Departments', ...departments.map((dept) => dept.name)]}
                    value={recordsDepartmentFilter || 'All Departments'}
                    onValueChangeAction={(value: string) => {
                      setRecordsDepartmentFilter(value === 'All Departments' ? '' : value);
                    }}
                    placeholder="All Departments"
                    className="mt-1"
                  />
                </div>

                {/* Approval Status Filter */}
                <div className="w-full md:w-48">
                  <Label htmlFor="records-approval-status" className="text-sm font-medium">Approval Status</Label>
                  <SearchableDropdown
                    options={['All Statuses', '⏳ Pending', '✓ Fully Approved']}
                    value={recordsApprovalFilter === '' ? 'All Statuses' : recordsApprovalFilter === 'pending' ? '⏳ Pending' : '✓ Fully Approved'}
                    onValueChangeAction={(value: string) => {
                      if (value === 'All Statuses') {
                        setRecordsApprovalFilter('');
                      } else if (value === '⏳ Pending') {
                        setRecordsApprovalFilter('pending');
                      } else {
                        setRecordsApprovalFilter('fully_approved');
                      }
                    }}
                    placeholder="All Statuses"
                    className="mt-1"
                  />
                </div>

                {/* Quarter Filter */}
                <div className="w-full md:w-48">
                  <Label htmlFor="records-quarter" className="text-sm font-medium">Quarter</Label>
                  <SearchableDropdown
                    options={['All Quarters', 'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025']}
                    value={recordsQuarterFilter || 'All Quarters'}
                    onValueChangeAction={(value: string) => {
                      const quarter = value === 'All Quarters' ? '' : value;
                      setRecordsQuarterFilter(quarter);
                      if (quarter) {
                        setRecordsDateRange({ from: '', to: '' });
                      }
                    }}
                    placeholder="All Quarters"
                    className="mt-1"
                  />
                </div>

                {/* Custom Date Range */}
                <div className="w-full md:w-64">
                  <Label className="text-sm font-medium">Custom Date Range</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={recordsDateRange.from}
                      onChange={(e) => {
                        setRecordsDateRange(prev => ({ ...prev, from: e.target.value }));
                        if (e.target.value) setRecordsQuarterFilter('');
                      }}
                      className="text-sm"
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={recordsDateRange.to}
                      onChange={(e) => {
                        setRecordsDateRange(prev => ({ ...prev, to: e.target.value }));
                        if (e.target.value) setRecordsQuarterFilter('');
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Refresh Button */}
                <div className="w-full md:w-auto flex gap-2">
                  <div className="w-full md:w-32">
                    <Label className="text-sm font-medium opacity-0">Refresh</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRecordsRefresh}
                      disabled={recordsRefreshing}
                      className="mt-1 w-full text-xs bg-blue-500 hover:bg-green-600 text-white hover:text-white disabled:cursor-not-allowed"
                      title="Refresh evaluation records data"
                    >
                      {recordsRefreshing ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          Refreshing...
                        </>
                      ) : (
                        <>
                          Refresh
                          <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Records Table */}
          <Card>
            <CardContent className="p-0">
              {/* Color Legend */}
              <div className="m-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="font-medium text-gray-700">Status Indicators:</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-yellow-100 border-l-2 border-l-yellow-500 rounded"></div>
                    <Badge className="bg-yellow-500 text-white text-xs px-2 py-0.5">NEW</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-blue-50 border-l-2 border-l-blue-500 rounded"></div>
                    <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">Recent</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
                    <Badge className="bg-green-500 text-white text-xs px-2 py-0.5">Fully Approved</Badge>
                  </div>
                </div>
              </div>

              {recordsRefreshing ? (
                <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto scrollable-table">
                  {/* Centered Loading Spinner with Logo */}
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                      <div className="relative">
                        {/* Spinning ring */}
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                        {/* Logo in center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">Refreshing evaluation records...</p>
                    </div>
                  </div>
                  
                  {/* Table structure visible in background */}
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('employeeName')}>
                        Employee{getSortIcon('employeeName')}
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('department')}>
                        Department{getSortIcon('department')}
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('evaluator')}>
                        Evaluator/HR{getSortIcon('evaluator')}
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('quarter')}>
                        Quarter{getSortIcon('quarter')}
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('date')}>
                        Date{getSortIcon('date')}
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('status')}>
                        Status{getSortIcon('status')}
                      </TableHead>
                      <TableHead>Employee Sign</TableHead>
                      <TableHead>Evaluator Sign</TableHead>
                      <TableHead>HR Sign</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Skeleton loading rows */}
                    {Array.from({ length: 8 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell className="px-6 py-3">
                          <div className="space-y-1">
                            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-2.5 w-20 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="flex gap-2">
                            <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-6 w-14 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              ) : (
                <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto scrollable-table">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                    <TableRow>
                      <TableHead className="px-6 py-3 cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('employeeName')}>
                        Employee{getSortIcon('employeeName')}
                      </TableHead>
                      <TableHead className="px-6 py-3">Department</TableHead>
                      <TableHead className="px-6 py-3">Evaluator/HR</TableHead>
                      <TableHead className="px-6 py-3">Type</TableHead>
                      <TableHead className="px-6 py-3">Quarter</TableHead>
                      <TableHead className="px-6 py-3 cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('date')}>
                        Date{getSortIcon('date')}
                      </TableHead>
                      <TableHead className="px-6 py-3">Status</TableHead>
                      <TableHead className="px-6 py-3">Employee Sign</TableHead>
                      <TableHead className="px-6 py-3">Evaluator Sign</TableHead>
                      <TableHead className="px-6 py-3">HR signature</TableHead>
                      <TableHead className="px-6 py-3">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-200">
                    {(() => {
                      // Apply all filters
                      const filtered = recentSubmissions.filter((sub) => {
                        if (recordsSearchTerm) {
                          const searchLower = recordsSearchTerm.toLowerCase();
                          const matches = 
                            sub.employeeName?.toLowerCase().includes(searchLower) ||
                            sub.evaluationData?.department?.toLowerCase().includes(searchLower) ||
                            sub.evaluationData?.position?.toLowerCase().includes(searchLower) ||
                            (sub.evaluationData?.supervisor || sub.evaluator || '').toLowerCase().includes(searchLower);
                          if (!matches) return false;
                        }
                        if (recordsDepartmentFilter && sub.evaluationData?.department !== recordsDepartmentFilter) return false;
                        if (recordsApprovalFilter) {
                          const hasEmpSig = !!(sub.employeeSignature && sub.employeeSignature.trim());
                          const hasEvalSig = !!((sub.evaluatorSignature && sub.evaluatorSignature.trim()) || 
                            (sub.evaluationData?.evaluatorSignature && sub.evaluationData?.evaluatorSignature.trim()));
                          let status = 'pending';
                          if (hasEmpSig && hasEvalSig) {
                            status = 'fully_approved';
                          } else if (hasEmpSig) {
                            status = 'employee_approved';
                          } else if (sub.approvalStatus && sub.approvalStatus !== 'pending') {
                            status = sub.approvalStatus;
                          }
                          if (status !== recordsApprovalFilter) return false;
                        }
                        if (recordsQuarterFilter && getQuarterFromDate(sub.submittedAt) !== recordsQuarterFilter) return false;
                        if (recordsDateRange.from && new Date(sub.submittedAt) < new Date(recordsDateRange.from)) return false;
                        if (recordsDateRange.to && new Date(sub.submittedAt) > new Date(recordsDateRange.to)) return false;
                        return true;
                      });

                      // Sort filtered results
                      const sorted = [...filtered].sort((a, b) => {
                        const { field, direction } = recordsSort;
                        let aVal, bVal;

                        switch (field) {
                          case 'employeeName':
                            aVal = a.employeeName?.toLowerCase() || '';
                            bVal = b.employeeName?.toLowerCase() || '';
                            break;
                          case 'date':
                            aVal = new Date(a.submittedAt).getTime();
                            bVal = new Date(b.submittedAt).getTime();
                            break;
                          default:
                            return 0;
                        }

                        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
                        return 0;
                      });

                      if (sorted.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                              No evaluation records found
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return sorted.map((submission) => {
                        const quarter = getQuarterFromDate(submission.submittedAt);
                        
                        // Check if both parties have signed (handle empty strings too)
                        const hasEmployeeSignature = !!(submission.employeeSignature && submission.employeeSignature.trim());
                        const hasEvaluatorSignature = !!((submission.evaluatorSignature && submission.evaluatorSignature.trim()) || 
                          (submission.evaluationData?.evaluatorSignature && submission.evaluationData?.evaluatorSignature.trim()));
                        
                        // Determine approval status - SIGNATURES HAVE PRIORITY over stored status
                        let approvalStatus = 'pending';
                        if (hasEmployeeSignature && hasEvaluatorSignature) {
                          // Both signed = fully approved (regardless of stored status)
                          approvalStatus = 'fully_approved';
                        } else if (hasEmployeeSignature) {
                          // Only employee signed
                          approvalStatus = 'employee_approved';
                        } else if (submission.approvalStatus && submission.approvalStatus !== 'pending') {
                          // No signatures detected, use stored status
                          approvalStatus = submission.approvalStatus;
                        }
                        
                        // Row highlighting logic - Approval status takes priority
                        const hoursDiff = (new Date().getTime() - new Date(submission.submittedAt).getTime()) / (1000 * 60 * 60);
                        let rowClassName = 'hover:bg-gray-50';
                        
                        // Priority 1: Fully approved evaluations are always green
                        if (approvalStatus === 'fully_approved') {
                          rowClassName = 'bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100';
                        }
                        // Priority 2: New evaluations (less than 24 hours, not yet approved)
                        else if (hoursDiff <= 24) {
                          rowClassName = 'bg-yellow-100 border-l-4 border-l-yellow-500 hover:bg-yellow-200';
                        }
                        // Priority 3: Recent evaluations (24-48 hours, not yet approved)
                        else if (hoursDiff <= 48) {
                          rowClassName = 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100';
                        }

                        return (
                          <TableRow key={submission.id} className={rowClassName}>
                            <TableCell className="px-6 py-3">
                              <div>
                                <div className="font-medium text-gray-900">{submission.employeeName}</div>
                                <div className="text-sm text-gray-500">{submission.evaluationData?.position || 'N/A'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Badge variant="outline" className="text-xs">
                                {submission.evaluationData?.department || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-3 text-sm">
                              {submission.evaluationData?.supervisor || submission.evaluator || 'N/A'}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {(() => {
                                // Determine if it's from Evaluator or HR by checking the evaluator's role
                                const evaluatorAccount = (accountsData as any).accounts.find((acc: any) => 
                                  acc.id === submission.evaluatorId || acc.employeeId === submission.evaluatorId
                                );
                                const isHR = evaluatorAccount?.role === 'hr';
                                return (
                                  <Badge className={isHR ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                                    {isHR ? '👔 HR' : '📋 Evaluator'}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Badge className={getQuarterColor(quarter)}>
                                {quarter}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-3 text-sm text-gray-600">
                              {new Date(submission.submittedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Badge className={
                                approvalStatus === 'fully_approved' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {approvalStatus === 'fully_approved' ? '✓ Approved' : '⏳ Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {submission.employeeSignature ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">✓ Signed</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-600 text-xs">⏳ Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {(() => {
                                // Check if evaluator is HR or Evaluator
                                const evaluatorAccount = (accountsData as any).accounts.find((acc: any) => 
                                  acc.id === submission.evaluatorId || acc.employeeId === submission.evaluatorId
                                );
                                const isHR = evaluatorAccount?.role === 'hr';
                                const hasSigned = submission.evaluatorSignature || submission.evaluationData?.evaluatorSignature;
                                
                                // Show signed status only if it's from an Evaluator
                                if (!isHR && hasSigned) {
                                  return <Badge className="bg-green-100 text-green-800 text-xs">✓ Signed</Badge>;
                                } else if (!isHR && !hasSigned) {
                                  return <Badge className="bg-gray-100 text-gray-600 text-xs">⏳ Pending</Badge>;
                                } else {
                                  return <span className="text-xs text-gray-400">—</span>;
                                }
                              })()}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {(() => {
                                // Check if evaluator is HR or Evaluator
                                const evaluatorAccount = (accountsData as any).accounts.find((acc: any) => 
                                  acc.id === submission.evaluatorId || acc.employeeId === submission.evaluatorId
                                );
                                const isHR = evaluatorAccount?.role === 'hr';
                                const hasSigned = submission.evaluatorSignature || submission.evaluationData?.evaluatorSignature;
                                
                                // Show signed status only if it's from HR
                                if (isHR && hasSigned) {
                                  return <Badge className="bg-green-100 text-green-800 text-xs">✓ Signed</Badge>;
                                } else if (isHR && !hasSigned) {
                                  return <Badge className="bg-gray-100 text-gray-600 text-xs">⏳ Pending</Badge>;
                                } else {
                                  return <span className="text-xs text-gray-400">—</span>;
                                }
                              })()}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewSubmissionDetails(submission)}
                                  className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  ☰ View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => printFeedback(submission)}
                                  className="text-xs px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white"
                                >
                                  ⎙ Print
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteRecordClick(submission)}
                                  className="text-xs px-2 py-1 bg-red-300 hover:bg-red-500 text-gray-700 hover:text-white border-red-200"
                                  title="Delete this evaluation record"
                                >
                                  ❌ Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
              )}

              {/* Results Counter */}
              {!recordsRefreshing && (
              <div className="m-4 text-center text-sm text-gray-600">
                Showing {(() => {
                  const filtered = recentSubmissions.filter((sub) => {
                    if (recordsSearchTerm) {
                      const searchLower = recordsSearchTerm.toLowerCase();
                      const matches = 
                        sub.employeeName?.toLowerCase().includes(searchLower) ||
                        sub.evaluationData?.department?.toLowerCase().includes(searchLower) ||
                        sub.evaluationData?.position?.toLowerCase().includes(searchLower) ||
                        (sub.evaluationData?.supervisor || sub.evaluator || '').toLowerCase().includes(searchLower);
                      if (!matches) return false;
                    }
                    if (recordsDepartmentFilter && sub.evaluationData?.department !== recordsDepartmentFilter) return false;
                    if (recordsApprovalFilter) {
                      const hasEmpSig = !!(sub.employeeSignature && sub.employeeSignature.trim());
                      const hasEvalSig = !!((sub.evaluatorSignature && sub.evaluatorSignature.trim()) || 
                        (sub.evaluationData?.evaluatorSignature && sub.evaluationData?.evaluatorSignature.trim()));
                      let status = 'pending';
                      if (hasEmpSig && hasEvalSig) {
                        status = 'fully_approved';
                      } else if (hasEmpSig) {
                        status = 'employee_approved';
                      } else if (sub.approvalStatus && sub.approvalStatus !== 'pending') {
                        status = sub.approvalStatus;
                      }
                      if (status !== recordsApprovalFilter) return false;
                    }
                    if (recordsQuarterFilter && getQuarterFromDate(sub.submittedAt) !== recordsQuarterFilter) return false;
                    if (recordsDateRange.from && new Date(sub.submittedAt) < new Date(recordsDateRange.from)) return false;
                    if (recordsDateRange.to && new Date(sub.submittedAt) > new Date(recordsDateRange.to)) return false;
                    return true;
                  });
                  return filtered.length;
                })()} of {recentSubmissions.length} evaluation records
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {active === 'employees' && (
        <div className="relative space-y-4">
          <>
            {/* Employee Status Cards - Separate from table */}
            {employeeViewMode === 'directory' && (
              <div className="grid grid-cols-2 gap-4">
                {/* Total Employees */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{employees.length}</p>
                  </CardContent>
                </Card>

                {/* New Hires This Month */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">New Hires This Month</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {(() => {
                        const now = new Date();
                        const currentMonth = now.getMonth();
                        const currentYear = now.getFullYear();
                        return employees.filter(emp => {
                          const hireDate = new Date(emp.hireDate);
                          return hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear;
                        }).length;
                      })()}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Employee Directory Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{employeeViewMode === 'directory' ? 'Employee Directory' : 'Performance Distribution'}</CardTitle>
                    <CardDescription>
                      {employeeViewMode === 'directory' ? 'Search and manage employees' : 'Employee performance overview'}
                    </CardDescription>
                  </div>
                  {/* Toggle Switch */}
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={employeeViewMode === 'directory' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setEmployeeViewMode('directory')}
                      className={employeeViewMode === 'directory' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}
                    >
                      👥 Directory
                    </Button>
                    <Button
                      variant={employeeViewMode === 'performance' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setEmployeeViewMode('performance')}
                      className={employeeViewMode === 'performance' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}
                    >
                      📊 Performance
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Employee Directory View */}
                {employeeViewMode === 'directory' && (
                  <>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-between">
                        {selectedDepartment === 'all' ? 'All Departments' : selectedDepartment || 'Department'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[180px]">
                      <DropdownMenuItem 
                        onClick={() => setSelectedDepartment('all')}
                        className={selectedDepartment === 'all' ? "bg-accent" : ""}
                      >
                        All Departments
                      </DropdownMenuItem>
                      {departments.map(dept => (
                        <DropdownMenuItem 
                          key={dept.id} 
                          onClick={() => setSelectedDepartment(dept.name)}
                          className={selectedDepartment === dept.name ? "bg-accent" : ""}
                        >
                          {dept.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-between">
                        {selectedBranch === 'all' ? 'All Branches' : selectedBranch || 'Branch'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[180px]">
                      <DropdownMenuItem 
                        onClick={() => setSelectedBranch('all')}
                        className={selectedBranch === 'all' ? "bg-accent" : ""}
                      >
                        All Branches
                      </DropdownMenuItem>
                      {branches.map(branch => (
                        <DropdownMenuItem 
                          key={branch.id} 
                          onClick={() => setSelectedBranch(branch.name)}
                          className={selectedBranch === branch.name ? "bg-accent" : ""}
                        >
                          {branch.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={() => refreshEmployeeData()}
                    disabled={employeesRefreshing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                    title="Refresh employee data"
                  >
                    {employeesRefreshing ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Refreshing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>🔄</span>
                        <span>Refresh</span>
                      </div>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedEmployee(null);
                      setIsEditModalOpen(true);
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white"
                    title="Add new employee"
                  >
                    <div className="flex items-center space-x-2">
                      <span>➕</span>
                      <span>Add Employee</span>
                    </div>
                  </Button>
                </div>

                {/* Employee Table */}
                <div className="relative max-h-[70vh] overflow-y-auto min-h-[400px]">
                  {employeesRefreshing ? (
                    <>
                      {/* Centered Loading Spinner with Logo */}
                      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                          <div className="relative">
                            {/* Spinning ring */}
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                            {/* Logo in center */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 font-medium">Loading employees...</p>
                        </div>
                      </div>
                      
                      {/* Table structure visible in background */}
                      <Table className="w-full">
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow>
                            <TableHead className="w-auto">Name</TableHead>
                            <TableHead className="w-auto">Email</TableHead>
                            <TableHead className="w-auto">Position</TableHead>
                            <TableHead className="w-auto">Department</TableHead>
                            <TableHead className="w-auto">Branch</TableHead>
                            <TableHead className="w-auto">Hire Date</TableHead>
                            <TableHead className="w-auto text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Skeleton loading rows */}
                          {Array.from({ length: 8 }).map((_, index) => (
                            <TableRow key={`skeleton-employee-${index}`}>
                              <TableCell className="px-6 py-3">
                                <div className="space-y-1">
                                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-6 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  ) : (
                    <Table className="w-full">
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="w-auto">Name</TableHead>
                          <TableHead className="w-auto">Email</TableHead>
                          <TableHead className="w-auto">Position</TableHead>
                          <TableHead className="w-auto">Department</TableHead>
                          <TableHead className="w-auto">Branch</TableHead>
                          <TableHead className="w-auto">Hire Date</TableHead>
                          <TableHead className="w-auto text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell className="text-sm text-gray-600">{employee.email}</TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{employee.department}</Badge>
                          </TableCell>
                          <TableCell>{employee.branch}</TableCell>
                          <TableCell>
                            {new Date(employee.hireDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setIsEmployeeModalOpen(true);
                                }}
                                title="View employee details"
                              >
                                <Eye className="h-4 w-4 text-white" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleEvaluateEmployee(employee)}
                                title="Evaluate employee performance"
                              >
                                <FileText className="h-4 w-4 text-white" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 bg-blue-800 hover:bg-blue-900"
                                onClick={() => handleEditEmployee(employee)}
                                title="Edit employee"
                              >
                                <Pencil className="h-4 w-4 text-white" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
                                onClick={() => handleDeleteEmployee(employee)}
                                title="Delete employee"
                              >
                                <Trash2 className="h-4 w-4 text-white" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  )}
                </div>
              </>
            )}

            {/* Performance Distribution View */}
            {employeeViewMode === 'performance' && (
              <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2">
                {Object.entries(hrMetrics?.performanceDistribution || {}).map(([level, count]) => {
                  // Get employees for this performance level (mock data for now)
                  const performanceEmployees = employees.slice(0, Math.min(count, 3)); // Show first 3 employees as example
                  
                  return (
                    <div key={level} className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="capitalize font-semibold text-lg">{level}</span>
                          <Badge variant="outline" className="text-xs">
                            {count} employees
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-xs h-7 px-3 hover:bg-blue-100"
                          onClick={() => handleViewPerformanceEmployees(level)}
                        >
                          View All →
                        </Button>
                      </div>
                      <Progress 
                        value={(count / (hrMetrics?.totalEmployees || 1)) * 100} 
                        className="h-3"
                      />
                      {performanceEmployees.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <p className="text-xs text-gray-600 font-medium">Sample employees:</p>
                          <div className="space-y-2">
                            {performanceEmployees.map((emp) => (
                              <div key={emp.id} className="flex items-center justify-between text-sm bg-white p-3 rounded border border-gray-200 hover:border-blue-300 transition-colors">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <span className="font-medium">{emp.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{emp.department}</Badge>
                                  <span className="text-gray-500 text-xs">{emp.position}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
              </CardContent>
            </Card>
          </>
        </div>
      )}

      {active === 'departments' && (
        <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
          {departmentsRefreshing ? (
            <>
              {/* Centered Loading Spinner with Logo */}
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    {/* Spinning ring */}
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    {/* Logo in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading departments...</p>
                </div>
              </div>
              
              {/* Grid structure visible in background */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={`skeleton-dept-${index}`} className="animate-pulse">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="h-6 w-32 bg-gray-200 rounded"></div>
                        <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="h-4 w-40 bg-gray-200 rounded mt-2"></div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-100 rounded-lg">
                          <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-2"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded mx-auto"></div>
                        </div>
                        <div className="text-center p-3 bg-gray-100 rounded-lg">
                          <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-2"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded mx-auto"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {departments.map((dept) => {
                const stats = getDepartmentStats(dept.name);
                return (
                  <Card key={dept.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        {dept.name}
                        <Badge variant="outline">{stats.count} employees</Badge>
                      </CardTitle>
                      <CardDescription>Department Manager</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">{stats.count}</div>
                          <div className="text-xs text-gray-600">Employees</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{stats.managers}</div>
                          <div className="text-xs text-gray-600">Managers</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {active === 'branches' && (
        <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
          {branchesRefreshing ? (
            <>
              {/* Centered Loading Spinner with Logo */}
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    {/* Spinning ring */}
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    {/* Logo in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading branches...</p>
                </div>
              </div>
              
              {/* Grid structure visible in background */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={`skeleton-branch-${index}`} className="animate-pulse">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="h-6 w-32 bg-gray-200 rounded"></div>
                        <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="h-4 w-40 bg-gray-200 rounded mt-2"></div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-100 rounded-lg">
                          <div className="h-7 w-16 bg-gray-200 rounded mx-auto mb-2"></div>
                          <div className="h-4 w-24 bg-gray-200 rounded mx-auto"></div>
                        </div>
                        <div className="text-center p-4 bg-gray-100 rounded-lg">
                          <div className="h-7 w-16 bg-gray-200 rounded mx-auto mb-2"></div>
                          <div className="h-4 w-16 bg-gray-200 rounded mx-auto"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {branches.map((branch) => {
                const stats = getBranchStats(branch.name);
                return (
                  <Card key={branch.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        {branch.name}
                        <Badge variant="outline">{stats.count} employees</Badge>
                      </CardTitle>
                      <CardDescription>Branch Location</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
                          <div className="text-sm text-gray-600">Total Employees</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{stats.managers}</div>
                          <div className="text-sm text-gray-600">Manager</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {active === 'reviews' && (
        <div className="relative h-[calc(100vh-200px)] overflow-y-auto">
          {reviewsRefreshing || loading ? (
            <div className="relative space-y-6 min-h-[500px]">
              {/* Centered Loading Spinner with Logo */}
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    {/* Spinning ring */}
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    {/* Logo in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading performance reviews...</p>
                </div>
              </div>

              {/* Performance Analytics Skeleton (visible in background) */}
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

              {/* Performance Reviews Table Skeleton (visible in background) */}
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
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                  {/* Performance Trend Chart */}
                  <Card className="h-fit">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        📈 Performance Trend
                      </CardTitle>
                      <CardDescription>Rating progression across all evaluations</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        // Filter and sort all submissions for HR view
                        const filteredReviews = recentSubmissions
                          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                        
                        // Prepare chart data from submissions
                        const chartData = filteredReviews
                          .filter(s => (s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating || 0) > 0)
                          .map((submission, index) => ({
                            review: `Review ${filteredReviews.length - index}`,
                            rating: submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating || 0,
                            date: new Date(submission.submittedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            }),
                            fullDate: new Date(submission.submittedAt).toLocaleDateString()
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
                                <div className="text-sm text-gray-500">No data available</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Complete evaluations to see trends
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
                                  tick={{ fontSize: 11, fill: '#6b7280' }}
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
                                  tick={{ fontSize: 12, fill: '#6b7280' }}
                                  tickFormatter={(value) => `${value}.0`}
                                  ticks={[0, 1, 2, 3, 4, 5]}
                                />
                                <ChartTooltip
                                  cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3' }}
                                  content={<ChartTooltipContent
                                    formatter={(value, name) => [
                                      `${value}/5.0`,
                                      "Rating"
                                    ]}
                                    labelFormatter={(label, payload) => {
                                      if (payload && payload[0]) {
                                        return payload[0].payload.review;
                                      }
                                      return label;
                                    }}
                                    className="bg-white border border-gray-200 shadow-lg rounded-lg"
                                  />}
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
                            <span className="text-sm font-medium text-gray-700">Performance Rating Trend</span>
                          </div>
                          <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-md border">
                            <span className="font-medium">{recentSubmissions.filter(s => (s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating || 0) > 0).length}</span> evaluation{recentSubmissions.filter(s => (s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating || 0) > 0).length !== 1 ? 's' : ''} tracked
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
                      <CardDescription>Overall performance insights across all evaluations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(() => {
                        const filteredReviews = recentSubmissions
                          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                        
                        const ratings = filteredReviews.map(s =>
                          s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating || 0
                        ).filter(r => r > 0);
                        const averageRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1) : '0.0';
                        const latestRating = ratings.length > 0 ? ratings[0] : 0;
                        const trend = ratings.length > 1 ? (latestRating - ratings[1]) : 0;

                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Average Rating</span>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold">{averageRating}</span>
                                <span className="text-sm text-gray-500">/5.0</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Latest Rating</span>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">{latestRating}</span>
                                <span className="text-sm text-gray-500">/5.0</span>
                                {trend !== 0 && (
                                  <Badge className={trend > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                    {trend > 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(1)}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Total Reviews</span>
                              <Badge variant="outline">{filteredReviews.length}</Badge>
                            </div>

                            <div className="pt-2 border-t">
                              <div className="text-sm font-medium mb-2">Overall Performance Level</div>
                              <Badge className={
                                parseFloat(averageRating) >= 4.5 ? 'bg-green-100 text-green-800' :
                                  parseFloat(averageRating) >= 4.0 ? 'bg-blue-100 text-blue-800' :
                                    parseFloat(averageRating) >= 3.5 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                              }>
                                {parseFloat(averageRating) >= 4.5 ? 'Outstanding' :
                                  parseFloat(averageRating) >= 4.0 ? 'Exceeds Expectations' :
                                    parseFloat(averageRating) >= 3.5 ? 'Meets Expectations' :
                                      'Needs Improvement'}
                              </Badge>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

              {/* Performance Insights */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    💡 Performance Insights
                  </CardTitle>
                  <CardDescription>Actionable insights based on performance evaluation history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const filteredReviews = recentSubmissions
                        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                      
                      const ratings = filteredReviews.map(s =>
                        s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating || 0
                      ).filter(r => r > 0);
                      const averageRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) : 0;
                      const latestRating = ratings.length > 0 ? ratings[0] : 0;
                      const trend = ratings.length > 1 ? (latestRating - ratings[1]) : 0;

                      const insights = [];

                      if (filteredReviews.length === 0) {
                        // Show message when no evaluations exist
                        insights.push({
                          type: 'improvement',
                          icon: '📝',
                          title: 'No Evaluations Yet',
                          message: 'Start conducting evaluations to see insights and track performance trends over time.'
                        });
                      } else {
                        if (averageRating >= 4.5) {
                          insights.push({
                            type: 'excellent',
                            icon: '🏆',
                            title: 'Outstanding Performance',
                            message: 'The organization is performing exceptionally well! Consider recognizing top performers and sharing best practices.'
                          });
                        } else if (averageRating >= 4.0) {
                          insights.push({
                            type: 'good',
                            icon: '⭐',
                            title: 'Strong Performance',
                            message: 'Performance levels are exceeding expectations. Focus on maintaining this level and identifying areas for continued growth.'
                          });
                        } else if (averageRating >= 3.5) {
                          insights.push({
                            type: 'average',
                            icon: '📈',
                            title: 'Solid Performance',
                            message: 'Performance is meeting expectations. Consider setting specific goals to push beyond current levels.'
                          });
                        } else {
                          insights.push({
                            type: 'improvement',
                            icon: '🎯',
                            title: 'Growth Opportunity',
                            message: 'There\'s room for improvement across evaluations. Focus on key areas and provide targeted support.'
                          });
                        }

                        if (trend > 0.2) {
                          insights.push({
                            type: 'improving',
                            icon: '🚀',
                            title: 'Improving Trend',
                            message: 'Great progress! Overall performance is trending upward. Keep up the momentum!'
                          });
                        } else if (trend < -0.2) {
                          insights.push({
                            type: 'declining',
                            icon: '⚠️',
                            title: 'Performance Dip',
                            message: 'Recent performance has declined. Consider reviewing processes and providing additional support.'
                          });
                        }

                        if (filteredReviews.length >= 3) {
                          insights.push({
                            type: 'consistency',
                            icon: '📊',
                            title: 'Consistent Reviews',
                            message: 'You have a solid review history. This shows reliability and commitment to performance management.'
                          });
                        }
                      }

                      // If no insights, show a default message
                      if (insights.length === 0) {
                        insights.push({
                          type: 'improvement',
                          icon: '📈',
                          title: 'Getting Started',
                          message: 'Complete more evaluations to receive personalized insights about performance patterns.'
                        });
                      }

                      return insights.map((insight, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${insight.type === 'excellent' ? 'bg-green-50 border-green-200' :
                          insight.type === 'good' ? 'bg-blue-50 border-blue-200' :
                            insight.type === 'improving' ? 'bg-emerald-50 border-emerald-200' :
                              insight.type === 'declining' ? 'bg-red-50 border-red-200' :
                                'bg-yellow-50 border-yellow-200'
                          }`}>
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{insight.icon}</span>
                            <div>
                              <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                              <p className="text-sm text-gray-600">{insight.message}</p>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* All Performance Reviews Table */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>All Performance Reviews</CardTitle>
                  <CardDescription>
                    Complete history of all performance evaluations
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
                        <span className="text-green-700">Excellent (≥4.0)</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {(() => {
                    const filteredReviews = recentSubmissions
                      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                    
                    return filteredReviews.length > 0 ? (
                      <div className="max-h-[500px] overflow-y-auto overflow-x-hidden rounded-lg border mx-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <Table>
                          <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
                            <TableRow>
                              <TableHead className="px-6 py-4">Employee</TableHead>
                              <TableHead className="px-6 py-4 text-right">Rating</TableHead>
                              <TableHead className="px-6 py-4">Date</TableHead>
                              <TableHead className="px-6 py-4">Quarter</TableHead>
                              <TableHead className="px-6 py-4 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredReviews.map((submission) => {
                              const highlight = getSubmissionHighlight(submission.submittedAt, submission.id, submission.approvalStatus);
                              const rating = submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating || 0;
                              const isLowPerformance = rating < 3.0;
                              const isPoorPerformance = rating < 2.5;
                              
                              return (
                                <TableRow 
                                  key={submission.id} 
                                  className={`${highlight.className} ${
                                    isPoorPerformance ? 'bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100' :
                                    isLowPerformance ? 'bg-orange-50 border-l-4 border-l-orange-400 hover:bg-orange-100' :
                                    ''
                                  }`}
                                >
                                  <TableCell className="px-6 py-4 font-medium">
                                    <div className="flex items-center gap-2">
                                      {submission.employeeName || 'Unknown'}
                                      {highlight.badge && (
                                        <Badge variant="secondary" className={`${highlight.badge.className} text-xs`}>
                                          {highlight.badge.text}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-6 py-4 text-right font-semibold">
                                    {(() => {
                                      const rating = submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating || 0;
                                      const isLowPerformance = rating < 3.0;
                                      const isPoorPerformance = rating < 2.5;
                                      
                                      return (
                                        <div className={`flex items-center justify-end gap-2 ${
                                          isPoorPerformance ? 'text-red-700' : 
                                          isLowPerformance ? 'text-orange-600' : 
                                          'text-gray-900'
                                        }`}>
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            isPoorPerformance ? 'bg-red-100 text-red-800' :
                                            isLowPerformance ? 'bg-orange-100 text-orange-800' :
                                            rating >= 4.0 ? 'bg-green-100 text-green-800' :
                                            rating >= 3.5 ? 'bg-blue-100 text-blue-800' :
                                            'bg-blue-100 text-blue-800'
                                          }`}>
                                            {isPoorPerformance ? 'POOR' : 
                                             isLowPerformance ? 'LOW' : 
                                             rating >= 4.0 ? 'EXCELLENT' :
                                             rating >= 3.5 ? 'GOOD' : 'FAIR'}
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
                                      <span className="font-medium">{new Date(submission.submittedAt).toLocaleDateString()}</span>
                                      <span className="text-xs text-gray-500">{getTimeAgo(submission.submittedAt)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-6 py-4">
                                    <Badge className={getQuarterColor(getQuarterFromEvaluationData(submission.evaluationData || submission))}>
                                      {getQuarterFromEvaluationData(submission.evaluationData || submission)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-6 py-4 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        viewSubmissionDetails(submission);
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
                        <div className="text-gray-500 text-lg mb-2">No performance reviews yet</div>
                        <div className="text-gray-400 text-sm">Evaluation history will appear here once reviews are completed.</div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {active === 'history' && (
        <div className="relative">
          {historyRefreshing || loading ? (
            <div className="relative min-h-[500px]">
              {/* Centered Loading Spinner with Logo */}
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    {/* Spinning ring */}
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    {/* Logo in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading evaluation history...</p>
                </div>
              </div>

              {/* Card skeleton visible in background */}
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
                      <div key={i} className="flex items-center space-x-4 py-3 border-b">
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
            <Card>
              <CardHeader>
                <CardTitle>Evaluation History</CardTitle>
                <CardDescription>Complete timeline of all performance evaluations</CardDescription>
              </CardHeader>
              <CardContent>

                {/* Tabbed Interface for Tables */}
                <Tabs defaultValue="quarterly" className="w-full">
                  <TabsList className="grid w-1/2 bg-gray-200 grid-cols-2">
                    <TabsTrigger value="quarterly">📊 Quarterly Performance</TabsTrigger>
                    <TabsTrigger value="history">📈 Evaluation History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="quarterly" className="mt-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Quarterly Performance Summary</CardTitle>
                            <CardDescription>Performance overview grouped by quarter</CardDescription>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefreshQuarterly}
                            disabled={quarterlyRefreshing}
                            className="flex items-center bg-blue-500 text-white hover:bg-green-700 hover:text-white space-x-2"
                          >
                            <RefreshCw className={`h-4 w-4 ${quarterlyRefreshing ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Search Bar */}
                        <div className="mb-6 w-1/2">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              placeholder="Search quarterly data..."
                              value={quarterlySearchTerm}
                              onChange={(e) => setQuarterlySearchTerm(e.target.value)}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {quarterlySearchTerm && (
                              <button
                                onClick={() => setQuarterlySearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                <X className="h-5 w-5 text-red-400 hover:text-red-600" />
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
                            <span className="text-sm font-medium text-gray-700">Filter by Date Range:</span>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-[280px] justify-start text-left font-normal",
                                    !dateFilter.from && "text-muted-foreground"
                                  )}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {dateFilter.from ? (
                                    dateFilter.to ? (
                                      <>
                                        {dateFilter.from.toLocaleDateString()} - {dateFilter.to.toLocaleDateString()}
                                      </>
                                    ) : (
                                      dateFilter.from.toLocaleDateString()
                                    )
                                  ) : (
                                    "Pick a date range"
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  initialFocus
                                  mode="range"
                                  defaultMonth={dateFilter.from}
                                  selected={dateFilter.from ? { from: dateFilter.from, to: dateFilter.to } : undefined}
                                  onSelect={(range) => setDateFilter(range || {})}
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
                              Filtering by date range: {dateFilter.from?.toLocaleDateString()} - {dateFilter.to?.toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Quarter Filter Buttons */}
                        <div className="mb-6">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-sm font-medium text-gray-700 mr-2">Filter by Quarter:</span>
                            <Button
                              variant={selectedQuarter === '' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSelectedQuarter('')}
                              className={`text-xs ${selectedQuarter === '' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                              All Quarters
                            </Button>
                            {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => (
                              <Button
                                key={quarter}
                                variant={selectedQuarter === quarter ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedQuarter(quarter)}
                                className={`text-xs font-medium transition-all duration-200 ${selectedQuarter === quarter ? `${getQuarterColor(quarter)} border-2 shadow-md transform scale-105` : `${getQuarterColor(quarter)} border border-gray-300 hover:shadow-sm hover:scale-102`}`}
                              >
                                {quarter}
                              </Button>
                            ))}
                            {selectedQuarter && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedQuarter('')}
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
                        <div className="relative max-h-[300px] md:max-h-[450px] lg:max-h-[650px] xl:max-h-[700px] overflow-y-auto overflow-x-auto scrollable-table">
                          {quarterlyRefreshing || loading ? (
                            <>
                              {/* Centered Loading Spinner with Logo */}
                              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                                  <div className="relative">
                                    {/* Spinning ring */}
                                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                                    {/* Logo in center */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 font-medium">Loading quarterly data...</p>
                                </div>
                              </div>

                              {/* Table skeleton visible in background */}
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
                                  <div key={i} className="flex items-center space-x-3 py-2 border-b">
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
                            </>
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
                                  // Group all submissions by quarter (HR sees all evaluations)
                                  const quarterlyData = recentSubmissions.reduce((acc, submission) => {
                                    const quarter = getQuarterFromEvaluationData(submission.evaluationData || submission);
                                    if (!acc[quarter]) {
                                      acc[quarter] = {
                                        quarter,
                                        submissions: [],
                                        averageRating: 0,
                                        totalEvaluations: 0,
                                        latestRating: 0,
                                        dateRange: ''
                                      };
                                    }
                                    acc[quarter].submissions.push(submission);
                                    return acc;
                                  }, {} as any);

                                  // Calculate statistics for each quarter
                                  Object.keys(quarterlyData).forEach(quarter => {
                                    const data = quarterlyData[quarter];
                                    const ratings = data.submissions.map((s: any) =>
                                      s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating || 0
                                    ).filter((r: any) => r > 0);
                                    data.totalEvaluations = ratings.length;
                                    data.averageRating = ratings.length > 0 ? (ratings.reduce((a: any, b: any) => a + b, 0) / ratings.length).toFixed(1) : 0;
                                    data.latestRating = ratings.length > 0 ? ratings[ratings.length - 1] : 0;
                                    
                                    // Calculate date range for this quarter
                                    if (data.submissions.length > 0) {
                                      const dates = data.submissions.map((s: any) => new Date(s.submittedAt)).sort((a: any, b: any) => a - b);
                                      const startDate = dates[0];
                                      const endDate = dates[dates.length - 1];
                                      
                                      if (startDate.getTime() === endDate.getTime()) {
                                        data.dateRange = startDate.toLocaleDateString();
                                      } else {
                                        data.dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
                                      }
                                    }
                                  });

                                  // Sort quarters chronologically
                                  const sortedQuarters = Object.values(quarterlyData).sort((a: any, b: any) => {
                                    const quarterOrder: { [key: string]: number } = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 };
                                    const aQuarter = a.quarter.split(' ')[0];
                                    const bQuarter = b.quarter.split(' ')[0];
                                    return (quarterOrder[aQuarter] || 0) - (quarterOrder[bQuarter] || 0);
                                  });

                                  // Filter quarters based on selected quarter and date range
                                  let filteredQuarters = selectedQuarter
                                    ? sortedQuarters.filter((q: any) => q.quarter.startsWith(selectedQuarter))
                                    : sortedQuarters;

                                  // Apply date range filter
                                  if (dateFilter.from || dateFilter.to) {
                                    filteredQuarters = filteredQuarters.filter((quarterData: any) => {
                                      return quarterData.submissions.some((submission: any) => {
                                        const submissionDate = new Date(submission.submittedAt);
                                        const submissionDateOnly = new Date(submissionDate.getFullYear(), submissionDate.getMonth(), submissionDate.getDate());
                                        const fromDateOnly = dateFilter.from ? new Date(dateFilter.from.getFullYear(), dateFilter.from.getMonth(), dateFilter.from.getDate()) : null;
                                        const toDateOnly = dateFilter.to ? new Date(dateFilter.to.getFullYear(), dateFilter.to.getMonth(), dateFilter.to.getDate()) : null;
                                        
                                        const isAfterFrom = !fromDateOnly || submissionDateOnly >= fromDateOnly;
                                        const isBeforeTo = !toDateOnly || submissionDateOnly <= toDateOnly;
                                        
                                        return isAfterFrom && isBeforeTo;
                                      });
                                    });
                                  }

                                  // Filter by search term
                                  if (quarterlySearchTerm) {
                                    filteredQuarters = filteredQuarters.filter((quarterData: any) => {
                                      const searchLower = quarterlySearchTerm.toLowerCase();
                                      return quarterData.quarter.toLowerCase().includes(searchLower) ||
                                        quarterData.submissions.some((s: any) =>
                                          s.employeeName?.toLowerCase().includes(searchLower) ||
                                          s.evaluatorName?.toLowerCase().includes(searchLower)
                                        );
                                    });
                                  }

                                  return filteredQuarters.length > 0 ? filteredQuarters.map((quarterData: any) => {
                                    const hasNewSubmission = quarterData.submissions.some((submission: any) => 
                                      isNewSubmission(submission.submittedAt)
                                    );
                                    
                                    return (
                                      <TableRow 
                                        key={quarterData.quarter}
                                        className={hasNewSubmission ? 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100' : ''}
                                      >
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Badge className={getQuarterColor(quarterData.quarter)}>
                                              {quarterData.quarter}
                                            </Badge>
                                            {hasNewSubmission && (
                                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                                NEW
                                              </Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="text-sm text-gray-600">
                                            {quarterData.dateRange || 'No dates available'}
                                          </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          {quarterData.totalEvaluations}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center space-x-1">
                                            <span className="font-semibold">{quarterData.averageRating}</span>
                                            <span className="text-gray-500">/5.0</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center space-x-1">
                                            <span className="font-medium">{quarterData.latestRating}</span>
                                            <span className="text-gray-500">/5.0</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <Badge className={
                                            parseFloat(quarterData.averageRating) >= 4.5 ? 'bg-green-100 text-green-800' :
                                              parseFloat(quarterData.averageRating) >= 4.0 ? 'bg-blue-100 text-blue-800' :
                                                parseFloat(quarterData.averageRating) >= 3.5 ? 'bg-yellow-100 text-yellow-800' :
                                                  'bg-red-100 text-red-800'
                                          }>
                                            {parseFloat(quarterData.averageRating) >= 4.5 ? 'Outstanding' :
                                              parseFloat(quarterData.averageRating) >= 4.0 ? 'Exceeds Expectations' :
                                                parseFloat(quarterData.averageRating) >= 3.5 ? 'Meets Expectations' :
                                                  'Needs Improvement'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              const quarterSubmissions = recentSubmissions.filter(submission =>
                                                getQuarterFromEvaluationData(submission.evaluationData || submission) === quarterData.quarter
                                              );
                                              if (quarterSubmissions.length > 0) {
                                                viewSubmissionDetails(quarterSubmissions[0]);
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
                                  }) : (
                                    <TableRow>
                                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        <p>No quarterly data available</p>
                                        <p className="text-sm">Evaluations will be grouped by quarter once available</p>
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
                            <CardDescription>Complete timeline of all performance evaluations</CardDescription>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefreshHistory}
                            disabled={historyRefreshing}
                            className="flex items-center bg-blue-500 text-white hover:bg-green-700 hover:text-white space-x-2"
                          >
                            <RefreshCw className={`h-4 w-4 ${historyRefreshing ? 'animate-spin' : ''}`} />
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
                                <h4 className="text-sm font-medium text-blue-900">Refreshing table...</h4>
                                <p className="text-xs text-blue-700">{refreshingMessage}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Search Bar */}
                        <div className="mb-6 w-1/2">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              placeholder="Search by employee, evaluator, supervisor..."
                              value={historySearchTerm}
                              onChange={(e) => setHistorySearchTerm(e.target.value)}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {historySearchTerm && (
                              <button
                                onClick={() => setHistorySearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                <X className="h-5 w-5 text-red-400 hover:text-red-600" />
                              </button>
                            )}
                          </div>
                          {historySearchTerm && (
                            <div className="mt-2 text-sm text-gray-600">
                              Showing {(() => {
                                const filtered = recentSubmissions.filter(submission => {
                                  if (!historySearchTerm) return true;
                                  const searchLower = historySearchTerm.toLowerCase();
                                  return (
                                    submission.employeeName?.toLowerCase().includes(searchLower) ||
                                    submission.evaluatorName?.toLowerCase().includes(searchLower) ||
                                    submission.evaluator?.toLowerCase().includes(searchLower) ||
                                    submission.evaluationData?.supervisor?.toLowerCase().includes(searchLower) ||
                                    (submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating || 0).toString().includes(searchLower) ||
                                    getQuarterFromEvaluationData(submission.evaluationData || submission)?.toLowerCase().includes(searchLower)
                                  );
                                });
                                return filtered.length;
                              })()} of {recentSubmissions.length} evaluations
                            </div>
                          )}
                        </div>
                        <div className="max-h-[350px] md:max-h-[500px] lg:max-h-[700px] xl:max-h-[750px] overflow-y-auto overflow-x-auto scrollable-table">
                          {historyRefreshing || loading ? (
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
                                <div key={i} className="flex items-center space-x-3 py-2 border-b">
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
                                  <TableHead className="text-right">Rating</TableHead>
                                  <TableHead>Quarter</TableHead>
                                  <TableHead>Immediate Supervisor</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(() => {
                                  // Filter submissions based on search term (HR sees all evaluations)
                                  const filteredHistorySubmissions = recentSubmissions.filter(submission => {
                                    if (!historySearchTerm) return true;

                                    const searchLower = historySearchTerm.toLowerCase();
                                    return (
                                      submission.employeeName?.toLowerCase().includes(searchLower) ||
                                      submission.evaluatorName?.toLowerCase().includes(searchLower) ||
                                      submission.evaluator?.toLowerCase().includes(searchLower) ||
                                      submission.evaluationData?.supervisor?.toLowerCase().includes(searchLower) ||
                                      (submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating || 0).toString().includes(searchLower) ||
                                      getQuarterFromEvaluationData(submission.evaluationData || submission)?.toLowerCase().includes(searchLower)
                                    );
                                  });

                                  return filteredHistorySubmissions.length > 0 ? filteredHistorySubmissions
                                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                                    .map((submission) => {
                                      const highlight = getSubmissionHighlight(submission.submittedAt, submission.id, submission.approvalStatus);
                                      return (
                                        <TableRow 
                                          key={submission.id}
                                          className={highlight.className}
                                        >
                                          <TableCell>
                                            <div className="flex flex-col">
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                  {new Date(submission.submittedAt).toLocaleDateString()}
                                                </span>
                                                {highlight.badge && (
                                                  <Badge variant="secondary" className={`${highlight.badge.className} text-xs`}>
                                                    {highlight.badge.text}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">
                                                  {new Date(submission.submittedAt).toLocaleTimeString()}
                                                </span>
                                                <span className="text-xs text-blue-600 font-medium">
                                                  {getTimeAgo(submission.submittedAt)}
                                                </span>
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="font-medium">{submission.employeeName}</TableCell>
                                          <TableCell className="text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                              <span className="font-semibold">
                                                {submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating || 0}
                                              </span>
                                              <span className="text-gray-500">/5</span>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <Badge className={getQuarterColor(getQuarterFromEvaluationData(submission.evaluationData || submission))}>
                                              {getQuarterFromEvaluationData(submission.evaluationData || submission)}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-sm text-gray-600">
                                            {submission.evaluationData?.supervisor || 'Not specified'}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  viewSubmissionDetails(submission);
                                                }}
                                                className="text-white bg-blue-500 hover:text-blue-800 border-blue-200 hover:border-blue-300"
                                              >
                                                <Eye className="w-4 h-4" />
                                                View
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    }) : (
                                      <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                          {historySearchTerm ? (
                                            <>
                                              <p>No evaluations found matching "{historySearchTerm}"</p>
                                              <p className="text-sm">Try adjusting your search terms</p>
                                            </>
                                          ) : (
                                            <>
                                              <p>No evaluation history found</p>
                                              <p className="text-sm">Completed evaluations will appear here</p>
                                            </>
                                          )}
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
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}


      {/* Employee Details Modal */}
      <Dialog open={isEmployeeModalOpen} onOpenChangeAction={setIsEmployeeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto employee-details-dialog" key={isEmployeeModalOpen ? 'open' : 'closed'}>
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

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEmployee(null);
        }}
        user={selectedEmployee ? {
          ...selectedEmployee,
          username: (selectedEmployee as any).username || '',
          password: (selectedEmployee as any).password || '',
          contact: (selectedEmployee as any).contact || '',
          hireDate: selectedEmployee.hireDate || '',
          isActive: (selectedEmployee as any).isActive !== undefined ? (selectedEmployee as any).isActive : true,
          signature: (selectedEmployee as any).signature || ''
        } : {
          id: 0,
          name: '',
          email: '',
          position: '',
          department: '',
          branch: '',
          role: '',
          username: '',
          password: '',
          contact: '',
          hireDate: '',
          isActive: true,
          signature: ''
        }}
        onSave={handleSaveEmployee}
        departments={departments.map(dept => dept.name)}
        branches={branches.map(branch => branch.name)}
        positions={positionsData}
      />

       {/* Performance Employees Modal */}
       <Dialog open={isPerformanceModalOpen} onOpenChangeAction={setIsPerformanceModalOpen}>
         <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
           <DialogHeader className="pb-6">
             <DialogTitle className="text-2xl font-bold text-gray-900">
               {selectedPerformanceLevel.charAt(0).toUpperCase() + selectedPerformanceLevel.slice(1)} Performers
             </DialogTitle>
             <DialogDescription className="text-base text-gray-600 mt-2">
               Employees with {selectedPerformanceLevel} performance rating
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4">
             {getPerformanceEmployees(selectedPerformanceLevel).map((employee) => (
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
             ))}
           </div>

           <DialogFooter className="pt-3 border-t border-gray-200 mt-3">
             <div className="flex justify-end space-x-4 w-full">
               <Button 
                 variant="outline" 
                 onClick={() => setIsPerformanceModalOpen(false)}
                 className="px-6 py-2"
               >
                 Close
               </Button>
             </div>
           </DialogFooter>
         </DialogContent>
               </Dialog>

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
            className="sm:max-w-md delete-employee-dialog"
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

        {/* Employee Evaluation Modal */}
        {isEvaluationModalOpen && employeeToEvaluate && currentUser && (
          <Dialog open={isEvaluationModalOpen} onOpenChangeAction={setIsEvaluationModalOpen}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0 evaluation-container">
              <EvaluationForm
                key={`hr-eval-${employeeToEvaluate.id}-${isEvaluationModalOpen}`}
                employee={{
                  id: employeeToEvaluate.id,
                  name: employeeToEvaluate.name,
                  email: employeeToEvaluate.email,
                  position: employeeToEvaluate.position,
                  department: employeeToEvaluate.department,
                  branch: employeeToEvaluate.branch,
                  role: employeeToEvaluate.role,
                  hireDate: employeeToEvaluate.hireDate,
                }}
                currentUser={{
                  id: currentUser.id,
                  name: currentUser.name,
                  email: currentUser.email,
                  position: currentUser.position || 'HR Manager',
                  department: currentUser.department || 'Human Resources',
                  role: currentUser.role,
                  signature: currentUser.signature,
                }}
                onCloseAction={async () => {
                  setIsEvaluationModalOpen(false);
                  setEmployeeToEvaluate(null);
                  // Small delay to ensure data is saved before refreshing
                  await new Promise(resolve => setTimeout(resolve, 500));
                  // Refresh submissions to show new evaluation
                  await fetchRecentSubmissions();
                }}
                onCancelAction={() => {
                  setIsEvaluationModalOpen(false);
                  setEmployeeToEvaluate(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Evaluation Record Confirmation Modal */}
        <Dialog open={isDeleteRecordModalOpen} onOpenChangeAction={setIsDeleteRecordModalOpen}>
          <DialogContent className="sm:max-w-md">
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
      </DashboardShell>
    </>
  );
}

// Wrap with HOC for authentication
export default withAuth(HRDashboard, { requiredRole: 'hr' });
