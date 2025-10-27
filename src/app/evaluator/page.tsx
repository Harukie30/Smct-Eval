'use client';

import { useEffect, useState, useMemo,} from 'react';
import { X } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import DashboardShell, { SidebarItem } from '@/components/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';  
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ViewEmployeeModal from '@/components/ViewEmployeeModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, } from "lucide-react";
import EvaluationForm from '@/components/evaluation';
import ViewResultsModal from '@/components/evaluation/ViewResultsModal';
import SearchableDropdown from "@/components/ui/searchable-dropdown";
import mockData from '@/data/dashboard.json';
import accountsData from '@/data/accounts.json';
import departments from '@/data/departments.json';
import { UserProfile } from '@/components/ProfileCard';
import clientDataService from '@/lib/clientDataService';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageTransition from '@/components/PageTransition';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';
import { createApprovalNotification, createFullyApprovedNotification } from '@/lib/notificationUtils';
import { getQuarterFromEvaluationData, getQuarterFromDate, getQuarterColor } from '@/lib/quarterUtils';
import { useProfilePictureUpdates } from '@/hooks/useProfileUpdates';

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
  evaluationData?: any;// Full evaluation data from the form
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
  name: string;
  email: string;
  position: string;
  department: string;
  branch?: string;
  role: string;
  hireDate: string;
  avatar?: string;
};

function getRatingColor(rating: number) {
  if (rating >= 4.5) return 'text-green-600 bg-green-100';
  if (rating >= 4.0) return 'text-blue-600 bg-blue-100';
  if (rating >= 3.5) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

// Calculate overall rating using the same formula as employee dashboard
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

// Helper functions for rating calculations
const getRatingLabel = (score: number) => {
  if (score >= 4.5) return 'Outstanding';
  if (score >= 4.0) return 'Exceeds Expectations';
  if (score >= 3.5) return 'Meets Expectations';
  if (score >= 2.5) return 'Needs Improvement';
  return 'Unsatisfactory';
};

const calculateScore = (scores: string[]) => {
  const validScores = scores.filter(score => score && score !== '').map(score => parseFloat(score));
  if (validScores.length === 0) return 0;
  return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
};

const getRatingColorForLabel = (rating: string) => {
  switch (rating) {
    case 'Outstanding':
    case 'Exceeds Expectations':
      return 'text-green-700 bg-green-100';
    case 'Needs Improvement':
    case 'Unsatisfactory':
      return 'text-red-700 bg-red-100';
    case 'Meets Expectations':
      return 'text-yellow-700 bg-yellow-100';
    default:
      return 'text-gray-500 bg-gray-100';
  }
};

export default function EvaluatorDashboard() {
  const { profile, user } = useUser();
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

  // Track seen submissions in localStorage
  const [seenSubmissions, setSeenSubmissions] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('seenEvaluationSubmissions');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  // Save seen submissions when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('seenEvaluationSubmissions', JSON.stringify(Array.from(seenSubmissions)));
    }
  }, [seenSubmissions]);

  // Mark submission as seen
  const markSubmissionAsSeen = (submissionId: number) => {
    setSeenSubmissions(prev => {
      const newSet = new Set(prev);
      newSet.add(submissionId);
      return newSet;
    });
  };

  // Enhanced time-based highlighting system with seen tracking and approval status
  const getSubmissionHighlight = (submittedAt: string, submissionId: number, approvalStatus?: string) => {
    const submissionTime = new Date(submittedAt).getTime();
    const now = new Date().getTime();
    const hoursDiff = (now - submissionTime) / (1000 * 60 * 60);
    const isSeen = seenSubmissions.has(submissionId);
    
    // Priority 1: Fully approved - GREEN (always visible)
    if (approvalStatus === 'fully_approved') {
      return {
        className: 'bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100',
        badge: { text: 'Approved', className: 'bg-green-500 text-white' },
        priority: 'approved'
      };
    }
    
    // Priority 2: Within 24 hours and not seen - YELLOW "New"
    if (hoursDiff <= 24 && !isSeen) {
      return {
        className: 'bg-yellow-100 border-l-4 border-l-yellow-500 hover:bg-yellow-200',
        badge: { text: 'New', className: 'bg-yellow-200 text-yellow-800' },
        priority: 'new'
      };
    } 
    // Priority 3: Within 48 hours and not seen - BLUE "Recent"
    else if (hoursDiff <= 48 && !isSeen) {
      return {
        className: 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100',
        badge: { text: 'Recent', className: 'bg-blue-100 text-blue-800' },
        priority: 'recent'
      };
    } 
    // Default: Older or already seen - No special highlighting
    else {
      return {
        className: 'hover:bg-gray-50',
        badge: null,
        priority: 'old'
      };
    }
  };

  // Add custom CSS for container popup animation
  useEffect(() => {
    const style = document.createElement('style');
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
      // AuthenticatedUser type
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        position: user.position,
        department: user.department,
        role: user.role,
        signature: user.signature // Include signature from user
      };
    } else if (profile) {
      // UserProfile type
      return {
        id: typeof profile.id === 'string' ? parseInt(profile.id) || 0 : profile.id || 0,
        name: profile.name,
        email: profile.email || '',
        position: profile.roleOrPosition || '',
        department: profile.department || '',
        role: profile.roleOrPosition || '',
        signature: profile.signature // Include signature from profile
      };
    }
    return undefined;
  };

  // Add custom styles for better table scrolling
  useEffect(() => {
    const style = document.createElement('style');
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

  const [active, setActive] = useState('overview');

  // Custom tab change handler with auto-refresh functionality
  const handleTabChange = (tabId: string) => {
    setActive(tabId);

    // Auto-refresh data when switching to specific tabs (no modals)
    if (tabId === 'feedback') {
      // Refresh evaluation records data
      setIsFeedbackRefreshing(true);
      
      // Add a 1-second delay to make skeleton visible
      setTimeout(() => {
        refreshEvaluatorData().then(() => {
          // Show success toast for feedback refresh
          success(
            'Evaluation Records Refreshed',
            'Feedback data has been updated'
          );
        }).finally(() => {
          setIsFeedbackRefreshing(false);
        });
      }, 1000); // 1-second delay to see skeleton properly
    } else if (tabId === 'employees') {
      // Refresh employees data
      setIsEmployeesRefreshing(true);
      
      // Add a 1-second delay to make skeleton visible
      setTimeout(() => {
        refreshEvaluatorData().then(() => {
          // Show success toast for employees refresh
          success(
            'Employees Refreshed',
            'Employee data has been updated'
          );
        }).finally(() => {
          setIsEmployeesRefreshing(false);
        });
      }, 1000); // 1-second delay to see skeleton properly
    } else if (tabId === 'account-history') {
      // Refresh account history data
      setIsAccountHistoryRefreshing(true);
      setTimeout(() => {
        const history = loadAccountHistory();
        setAccountHistory(history);
        success(
          'Account History Refreshed',
          'Account history data has been updated'
        );
        setIsAccountHistoryRefreshing(false);
      }, 1000); // 1-second delay to see skeleton properly
    } else if (tabId === 'overview') {
      // Refresh overview data when switching to overview tab
      setIsRefreshing(true);
      
      // Add a 2-second delay to make skeleton visible
      setTimeout(() => {
        refreshEvaluatorData().then(() => {
          // Show success toast for overview refresh
          success(
            'Overview Refreshed',
            'Recent submissions data has been updated'
          );
        }).finally(() => {
          setIsRefreshing(false);
        });
      }, 1000); // 2-second delay to see skeleton properly
    }
  };
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [employeeSort, setEmployeeSort] = useState<{ key: keyof Employee; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [isViewSubmissionModalOpen, setIsViewSubmissionModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedEmployeeForView, setSelectedEmployeeForView] = useState<Employee | null>(null);
  const [isViewEmployeeModalOpen, setIsViewEmployeeModalOpen] = useState(false);

  // ViewResultsModal state
  const [isViewResultsModalOpen, setIsViewResultsModalOpen] = useState(false);
  const [selectedEvaluationSubmission, setSelectedEvaluationSubmission] = useState<Submission | null>(null);

  // Print Preview Modal state
  const [isPrintPreviewModalOpen, setIsPrintPreviewModalOpen] = useState(false);
  const [printPreviewContent, setPrintPreviewContent] = useState<string>('');
  const [printPreviewData, setPrintPreviewData] = useState<any>(null);

  // Cancel Evaluation Alert Dialog state
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);

  // Profile is now managed by UserContext

  // Function to refresh dashboard data (used by shared hook)
  const refreshEvaluatorData = async () => {
    try {
      setLoading(true);

      // Load dashboard data
      setCurrentPeriod(mockData.dashboard.currentPeriod);
      setData(mockData.dashboard.performanceData as unknown as PerformanceData);

      // Fetch recent submissions from client data service
      const submissions = await clientDataService.getSubmissions();

      if (Array.isArray(submissions)) {
        // Ensure data is valid and has unique IDs
        const validData = submissions.filter((item: any) =>
          item &&
          typeof item === 'object' &&
          item.id !== undefined &&
          item.employeeName
        );

        // Remove duplicates based on ID
        const uniqueData = validData.filter((item: any, index: number, self: any[]) =>
          index === self.findIndex(t => t.id === item.id)
        );

        setRecentSubmissions(uniqueData);
      } else {
        console.warn('Invalid data structure received from API');
        setRecentSubmissions([]);
      }
    } catch (error) {
      console.error('Error refreshing evaluator data:', error);
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
    refreshFunction: refreshEvaluatorData,
    dashboardName: 'Evaluator Dashboard',
    customMessage: 'Welcome back! Refreshing your evaluator dashboard data...'
  });

  // Real-time data updates via localStorage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only refresh if the change is from another tab/window
      if (e.key === 'submissions' && e.newValue !== e.oldValue) {
        refreshSubmissions();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Overview table state
  const [overviewSearch, setOverviewSearch] = useState('');

  // Feedback table state
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackDepartmentFilter, setFeedbackDepartmentFilter] = useState('');
  const [feedbackDateFilter, setFeedbackDateFilter] = useState('');
  const [feedbackDateRange, setFeedbackDateRange] = useState({ from: '', to: '' });
  const [feedbackQuarterFilter, setFeedbackQuarterFilter] = useState('');
  const [feedbackApprovalStatusFilter, setFeedbackApprovalStatusFilter] = useState('');
  
  const [feedbackSort, setFeedbackSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEmployeesRefreshing, setIsEmployeesRefreshing] = useState(false);
  const [isFeedbackRefreshing, setIsFeedbackRefreshing] = useState(false);
  const [isAccountHistoryRefreshing, setIsAccountHistoryRefreshing] = useState(false);
  const [employeeDataRefresh, setEmployeeDataRefresh] = useState(0);
  
  // Account History state
  const [accountHistory, setAccountHistory] = useState<any[]>([]);
  const [accountHistorySearchTerm, setAccountHistorySearchTerm] = useState('');
  
  // Violations Storage state


  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [showDeleteSuccessDialog, setShowDeleteSuccessDialog] = useState(false);
  const [showIncorrectPasswordDialog, setShowIncorrectPasswordDialog] = useState(false);
  const [isDialogClosing, setIsDialogClosing] = useState(false);
  const [isSuccessDialogClosing, setIsSuccessDialogClosing] = useState(false);
  const [isDeleteDialogClosing, setIsDeleteDialogClosing] = useState(false);


  // Function to refresh employee data
  const refreshEmployeeData = async () => {
    try {
      setIsRefreshing(true);
      
      // Fetch fresh employee data from clientDataService
      const employees = await clientDataService.getEmployees();
      
      if (Array.isArray(employees)) {
        // Ensure data is valid and has unique IDs
        const validData = employees.filter((item: any) =>
          item &&
          typeof item === 'object' &&
          item.id !== undefined &&
          item.name &&
          item.email
        );

        // Remove duplicates based on ID
        const uniqueData = validData.filter((item: any, index: number, self: any[]) =>
          index === self.findIndex(t => t.id === item.id)
        );

        // Force re-render by updating the refresh counter
        setEmployeeDataRefresh(prev => prev + 1);
        
        // Show success feedback
        success(
          'Employee Data Refreshed',
          `Successfully loaded ${uniqueData.length} employee records`
        );
      } else {
        setEmployeeDataRefresh(prev => prev + 1);
        error(
          'Invalid Data',
          'Received invalid employee data structure from the server'
        );
      }
    } catch (err) {
      console.error('Error refreshing employee data:', err);
      setEmployeeDataRefresh(prev => prev + 1);
      error(
        'Refresh Failed',
        'Failed to refresh employee data. Please try again.'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshSubmissions = async () => {
    try {
      setIsRefreshing(true);
      const submissions = await clientDataService.getSubmissions();

      if (Array.isArray(submissions)) {
        // Ensure data is valid and has unique IDs
        const validData = submissions.filter((item: any) =>
          item &&
          typeof item === 'object' &&
          item.id !== undefined &&
          item.employeeName
        );

        // Remove duplicates based on ID
        const uniqueData = validData.filter((item: any, index: number, self: any[]) =>
          index === self.findIndex(t => t.id === item.id)
        );

        setRecentSubmissions(uniqueData);

        // Show success feedback
        success(
          'Evaluation Records Refreshed',
          `Successfully loaded ${uniqueData.length} evaluation records`
        );
      } else {
        setRecentSubmissions([]);
        error(
          'Invalid Data',
          'Received invalid data structure from the server'
        );
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setRecentSubmissions([]);
      error(
        'Refresh Failed',
        'Failed to refresh evaluation records. Please try again.'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to handle refresh with modal
  const handleEvaluationRecordsRefresh = async () => {
    try {
      setIsRefreshing(true);
      setIsFeedbackRefreshing(true);
      
      // Add a 1-second delay to make skeleton visible
      setTimeout(async () => {
        await refreshSubmissions();
        success(
          'Evaluation Records Refreshed',
          'Feedback data has been updated'
        );
        setIsRefreshing(false);
        setIsFeedbackRefreshing(false);
      }, 1000); // 1-second delay to see skeleton properly
    } catch (error) {
      console.error('Error during evaluation records refresh:', error);
      setIsRefreshing(false);
      setIsFeedbackRefreshing(false);
    }
  };

  // Function to handle refresh completion (no modal)
  const handleEvaluationRecordsRefreshComplete = () => {
    handleEvaluationRecordsRefresh();
  };

  // Function to load account history (all employees' violations/suspensions)
  const loadAccountHistory = () => {
    try {
      // Load all suspended employees data (violations/suspensions)
      const suspendedEmployees = JSON.parse(localStorage.getItem('suspendedEmployees') || '[]');
      
      // Format all suspension/violation records
      const history = suspendedEmployees.map((violation: any) => ({
        id: `violation-${violation.id}`,
        type: 'violation',
        title: 'Policy Violation',
        description: violation.suspensionReason,
        date: violation.suspensionDate,
        status: violation.status,
        severity: 'high',
        actionBy: violation.suspendedBy,
        employeeName: violation.name,
        employeeEmail: violation.email
      }));

      // Add some sample feedback records for variety
      const sampleFeedback = [
        {
          id: 'feedback-1',
          type: 'feedback',
          title: 'Performance Review',
          description: 'Quarterly performance evaluation completed',
          date: new Date().toISOString(),
          status: 'completed',
          severity: 'low',
          actionBy: 'HR Manager',
          employeeName: 'John Doe',
          employeeEmail: 'john.doe@company.com'
        },
        {
          id: 'feedback-2',
          type: 'feedback',
          title: 'Goal Setting',
          description: 'Annual goals reviewed and updated',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          severity: 'low',
          actionBy: 'Supervisor',
          employeeName: 'Jane Smith',
          employeeEmail: 'jane.smith@company.com'
        }
      ];

      return [...history, ...sampleFeedback];
    } catch (error) {
      console.error('Error loading account history:', error);
      return [];
    }
  };


  // Helper functions for account history
  const getFilteredAccountHistory = () => {
    if (!accountHistorySearchTerm) return accountHistory;

    return accountHistory.filter(item =>
      item.title.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
      item.actionBy.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(accountHistorySearchTerm.toLowerCase())
    );
  };


  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'reinstated': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'violation': return '⚠️';
      case 'feedback': return '💬';
      case 'review': return '📝';
      default: return '📋';
    }
  };

  // Function to handle account history refresh
  const handleAccountHistoryRefresh = async () => {
    try {
      setIsAccountHistoryRefreshing(true);
      
      // Add a 1-second delay to make skeleton visible
      setTimeout(async () => {
        const history = loadAccountHistory();
        setAccountHistory(history);
        
        success(
          'Account History Refreshed',
          'Account history data has been updated'
        );
        setIsAccountHistoryRefreshing(false);
      }, 1000); // 1-second delay to see skeleton properly
    } catch (error) {
      console.error('Error during account history refresh:', error);
      setIsAccountHistoryRefreshing(false);
    }
  };



  const getStorageTypeColor = (type: string) => {
    switch (type) {
      case 'localStorage': return 'bg-blue-100 text-blue-800';
      case 'sessionStorage': return 'bg-green-100 text-green-800';
      case 'database': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStorageIcon = (type: string) => {
    switch (type) {
      case 'localStorage': return '💾';
      case 'sessionStorage': return '🔄';
      case 'database': return '🗄️';
      default: return '📦';
    }
  };

  // Function to handle violations storage refresh

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
      console.error('Error during employees refresh:', error);
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
      setDeletePasswordError('Password is required to delete records');
      return;
    }

    // Get current user data to verify password
    const currentUser = getCurrentUserData();
    if (!currentUser) {
      setDeletePasswordError('User not found. Please refresh and try again.');
      return;
    }

    // Password verification using the current user's password from accounts.json
    // Get the user's password from the accounts data
    const userAccount = (accountsData as any).accounts.find((account: any) =>
      account.email === currentUser.email || account.username === currentUser.email
    );

    if (!userAccount) {
      setDeletePasswordError('User account not found. Please refresh and try again.');
      return;
    }

    // Compare the entered password with the user's actual password
    if (deletePassword !== userAccount.password) {
      setDeletePasswordError('Incorrect password. Please try again.');
      setShowIncorrectPasswordDialog(true);
      
      // Start pop-down animation after 1 second, then close after 1.3 seconds
      setTimeout(() => {
        setIsDialogClosing(true);
      }, 1000);
      
      setTimeout(() => {
        setShowIncorrectPasswordDialog(false);
        setDeletePassword('');
        setDeletePasswordError('');
        setIsDialogClosing(false);
      }, 1300);
      
      return;
    }

    try {
      // Get all submissions from localStorage
      const allSubmissions = await clientDataService.getSubmissions();

      // Filter out the record to delete
      const updatedSubmissions = allSubmissions.filter((sub: any) => sub.id !== recordToDelete.id);

      // Update localStorage
      localStorage.setItem('submissions', JSON.stringify(updatedSubmissions));

      // Update the state to reflect the deletion
      setRecentSubmissions(prev => prev.filter(sub => sub.id !== recordToDelete.id));

      // Show success message
      success(
        'Record Deleted',
        `Evaluation record for ${recordToDelete.employeeName} has been deleted successfully`
      );

      // Trigger pop-down animation before closing
      setIsDeleteDialogClosing(true);
      
      // Close modal and reset state after animation
      setTimeout(() => {
        setIsDeleteModalOpen(false);
        setRecordToDelete(null);
        setDeletePassword('');
        setDeletePasswordError('');
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
      console.error('Error deleting record:', err);
      error(
        'Delete Failed',
        'Failed to delete the evaluation record. Please try again.'
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
      setDeletePassword('');
      setDeletePasswordError('');
      setIsDeleteDialogClosing(false);
    }, 300); // Match animation duration
  };

  const handleProfileSave = (updatedProfile: UserProfile) => {
    // Profile is now managed by UserContext
    // Optionally refresh data or show success message
  };


  // Feedback table functions
  const sortFeedback = (key: string) => {
    setFeedbackSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: string) => {
    if (feedbackSort.key !== key) return '↕️';
    return feedbackSort.direction === 'asc' ? '↑' : '↓';
  };



  const viewEvaluationForm = (feedback: any) => {
    // Find the original submission data for this feedback
    const originalSubmission = recentSubmissions.find(submission => submission.id === feedback.id);

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
        status: 'completed',
        evaluator: feedback.reviewer,
        evaluationData: {
          overallComments: feedback.comment,
          employeeEmail: feedback.employeeEmail,
          department: feedback.department,
          position: feedback.position
        }
      };
      setSelectedEvaluationSubmission(submissionData);
      setIsViewResultsModalOpen(true);
    }
  };

  const printFeedback = (feedback: any) => {
    // Find the original submission data for this feedback
    const originalSubmission = recentSubmissions.find(submission => submission.id === feedback.id);

    if (!originalSubmission || !originalSubmission.evaluationData) {
      alert('No evaluation data available for printing');
      return;
    }

    const data = originalSubmission.evaluationData;

    // Calculate scores from individual evaluations
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

    const printContent = document.createElement('div');
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
              ${data.reviewTypeProbationary3 ? '✓ 3m' : '☐ 3m'} | ${data.reviewTypeProbationary5 ? '✓ 5m' : '☐ 5m'} | 
              ${data.reviewTypeRegularQ1 ? '✓ Q1' : '☐ Q1'} | ${data.reviewTypeRegularQ2 ? '✓ Q2' : '☐ Q2'} | 
              ${data.reviewTypeRegularQ3 ? '✓ Q3' : '☐ Q3'} | ${data.reviewTypeRegularQ4 ? '✓ Q4' : '☐ Q4'}
              ${data.reviewTypeOthersImprovement ? ' | ✓ PI' : ''}
              ${data.reviewTypeOthersCustom ? ` | ${data.reviewTypeOthersCustom}` : ''}
            </div>
          </div>
          <div class="print-field">
            <div class="print-label">Employee:</div>
            <div class="print-value">${data.employeeName || 'Not specified'} (${data.employeeId || 'ID: N/A'})</div>
          </div>
          <div class="print-field">
            <div class="print-label">Position:</div>
            <div class="print-value">${data.position || 'Not specified'} - ${data.department || 'Dept: N/A'}</div>
          </div>
          <div class="print-field">
            <div class="print-label">Branch & Supervisor:</div>
            <div class="print-value">${data.branch || 'Branch: N/A'} | ${data.supervisor || 'Sup: N/A'}</div>
          </div>
          <div class="print-field">
            <div class="print-label">Hire Date & Coverage:</div>
            <div class="print-value">${data.hireDate || 'Hire: N/A'} | ${data.coverageFrom && data.coverageTo ? `${new Date(data.coverageFrom).toLocaleDateString()} - ${new Date(data.coverageTo).toLocaleDateString()}` : 'Coverage: N/A'}</div>
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
              <td>${data.jobKnowledgeScore1 || ''}</td>
              <td>${data.jobKnowledgeScore1 ? getRatingLabel(parseFloat(data.jobKnowledgeScore1)) : 'N/A'}</td>
              <td>${data.jobKnowledgeComments1 || ''}</td>
            </tr>
            <tr>
              <td>Keeps Documentation Updated</td>
              <td>Maintains current and accurate documentation</td>
              <td>${data.jobKnowledgeScore2 || ''}</td>
              <td>${data.jobKnowledgeScore2 ? getRatingLabel(parseFloat(data.jobKnowledgeScore2)) : 'N/A'}</td>
              <td>${data.jobKnowledgeComments2 || ''}</td>
            </tr>
            <tr>
              <td>Problem Solving</td>
              <td>Effectively identifies and resolves work challenges</td>
              <td>${data.jobKnowledgeScore3 || ''}</td>
              <td>${data.jobKnowledgeScore3 ? getRatingLabel(parseFloat(data.jobKnowledgeScore3)) : 'N/A'}</td>
              <td>${data.jobKnowledgeComments3 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Avg: ${jobKnowledgeScore.toFixed(2)} | ${getRatingLabel(jobKnowledgeScore)}</strong>
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
              <td>${data.qualityOfWorkScore1 || ''}</td>
              <td>${data.qualityOfWorkScore1 ? getRatingLabel(parseFloat(data.qualityOfWorkScore1)) : 'N/A'}</td>
              <td>${data.qualityOfWorkComments1 || ''}</td>
            </tr>
            <tr>
              <td>Timeliness (L.E.A.D.E.R.)</td>
              <td>Completes tasks within established deadlines</td>
              <td>${data.qualityOfWorkScore2 || ''}</td>
              <td>${data.qualityOfWorkScore2 ? getRatingLabel(parseFloat(data.qualityOfWorkScore2)) : 'N/A'}</td>
              <td>${data.qualityOfWorkComments2 || ''}</td>
            </tr>
            <tr>
              <td>Work Output Volume (L.E.A.D.E.R.)</td>
              <td>Produces appropriate volume of work output</td>
              <td>${data.qualityOfWorkScore3 || ''}</td>
              <td>${data.qualityOfWorkScore3 ? getRatingLabel(parseFloat(data.qualityOfWorkScore3)) : 'N/A'}</td>
              <td>${data.qualityOfWorkComments3 || ''}</td>
            </tr>
            <tr>
              <td>Consistency in Performance (L.E.A.D.E.R.)</td>
              <td>Maintains consistent quality standards</td>
              <td>${data.qualityOfWorkScore4 || ''}</td>
              <td>${data.qualityOfWorkScore4 ? getRatingLabel(parseFloat(data.qualityOfWorkScore4)) : 'N/A'}</td>
              <td>${data.qualityOfWorkComments4 || ''}</td>
            </tr>
            <tr>
              <td>Attention to Detail</td>
              <td>Demonstrates thoroughness and accuracy</td>
              <td>${data.qualityOfWorkScore5 || ''}</td>
              <td>${data.qualityOfWorkScore5 ? getRatingLabel(parseFloat(data.qualityOfWorkScore5)) : 'N/A'}</td>
              <td>${data.qualityOfWorkComments5 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Avg: ${qualityOfWorkScore.toFixed(2)} | ${getRatingLabel(qualityOfWorkScore)}</strong>
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
              <td>${data.adaptabilityScore1 || ''}</td>
              <td>${data.adaptabilityScore1 ? getRatingLabel(parseFloat(data.adaptabilityScore1)) : 'Not Rated'}</td>
              <td>${data.adaptabilityComments1 || ''}</td>
            </tr>
            <tr>
              <td>Flexibility in Job Role (ability to adapt to changes)</td>
              <td>Adapts to changes in job responsibilities and willingly takes on new tasks</td>
              <td>${data.adaptabilityScore2 || ''}</td>
              <td>${data.adaptabilityScore2 ? getRatingLabel(parseFloat(data.adaptabilityScore2)) : 'Not Rated'}</td>
              <td>${data.adaptabilityComments2 || ''}</td>
            </tr>
            <tr>
              <td>Resilience in the Face of Challenges</td>
              <td>Maintains a positive attitude and performance under challenging or difficult conditions</td>
              <td>${data.adaptabilityScore3 || ''}</td>
              <td>${data.adaptabilityScore3 ? getRatingLabel(parseFloat(data.adaptabilityScore3)) : 'Not Rated'}</td>
              <td>${data.adaptabilityComments3 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${adaptabilityScore.toFixed(2)} | Rating: ${getRatingLabel(adaptabilityScore)}</strong>
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
              <td>${data.teamworkScore1 || ''}</td>
              <td>${data.teamworkScore1 ? getRatingLabel(parseFloat(data.teamworkScore1)) : 'Not Rated'}</td>
              <td>${data.teamworkComments1 || ''}</td>
            </tr>
            <tr>
              <td>Promotion of a Positive Team Culture</td>
              <td>Interacts positively with coworkers. Fosters inclusive team culture. Provides support and constructive feedback.</td>
              <td>${data.teamworkScore2 || ''}</td>
              <td>${data.teamworkScore2 ? getRatingLabel(parseFloat(data.teamworkScore2)) : 'Not Rated'}</td>
              <td>${data.teamworkComments2 || ''}</td>
            </tr>
            <tr>
              <td>Effective Communication</td>
              <td>Communicates openly and clearly with team members. Shares information and updates in a timely manner.</td>
              <td>${data.teamworkScore3 || ''}</td>
              <td>${data.teamworkScore3 ? getRatingLabel(parseFloat(data.teamworkScore3)) : 'Not Rated'}</td>
              <td>${data.teamworkComments3 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${teamworkScore.toFixed(2)} | Rating: ${getRatingLabel(teamworkScore)}</strong>
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
              <td>${data.reliabilityScore1 || ''}</td>
              <td>${data.reliabilityScore1 ? getRatingLabel(parseFloat(data.reliabilityScore1)) : 'Not Rated'}</td>
              <td>${data.reliabilityComments1 || ''}</td>
            </tr>
            <tr>
              <td>Punctuality</td>
              <td>Arrives at work and meetings on time or before the scheduled time</td>
              <td>${data.reliabilityScore2 || ''}</td>
              <td>${data.reliabilityScore2 ? getRatingLabel(parseFloat(data.reliabilityScore2)) : 'Not Rated'}</td>
              <td>${data.reliabilityComments2 || ''}</td>
            </tr>
            <tr>
              <td>Follows Through on Commitments</td>
              <td>Follows through on assignments from and commitments made to coworkers or superiors</td>
              <td>${data.reliabilityScore3 || ''}</td>
              <td>${data.reliabilityScore3 ? getRatingLabel(parseFloat(data.reliabilityScore3)) : 'Not Rated'}</td>
              <td>${data.reliabilityComments3 || ''}</td>
            </tr>
            <tr>
              <td>Reliable Handling of Routine Tasks</td>
              <td>Demonstrates reliability in completing routine tasks without oversight</td>
              <td>${data.reliabilityScore4 || ''}</td>
              <td>${data.reliabilityScore4 ? getRatingLabel(parseFloat(data.reliabilityScore4)) : 'Not Rated'}</td>
              <td>${data.reliabilityComments4 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${reliabilityScore.toFixed(2)} | Rating: ${getRatingLabel(reliabilityScore)}</strong>
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
              <td>${data.ethicalScore1 || ''}</td>
              <td>${data.ethicalScore1 ? getRatingLabel(parseFloat(data.ethicalScore1)) : 'Not Rated'}</td>
              <td>${data.ethicalExplanation1 || ''}</td>
            </tr>
            <tr>
              <td>Professionalism (L.E.A.D.E.R.)</td>
              <td>Maintains a high level of professionalism in all work interactions</td>
              <td>${data.ethicalScore2 || ''}</td>
              <td>${data.ethicalScore2 ? getRatingLabel(parseFloat(data.ethicalScore2)) : 'Not Rated'}</td>
              <td>${data.ethicalExplanation2 || ''}</td>
            </tr>
            <tr>
              <td>Accountability for Mistakes (L.E.A.D.E.R.)</td>
              <td>Takes responsibility for errors and actively works to correct mistakes</td>
              <td>${data.ethicalScore3 || ''}</td>
              <td>${data.ethicalScore3 ? getRatingLabel(parseFloat(data.ethicalScore3)) : 'Not Rated'}</td>
              <td>${data.ethicalExplanation3 || ''}</td>
            </tr>
            <tr>
              <td>Respect for Others (L.E.A.D.E.R.)</td>
              <td>Treats all individuals fairly and with respect, regardless of background or position</td>
              <td>${data.ethicalScore4 || ''}</td>
              <td>${data.ethicalScore4 ? getRatingLabel(parseFloat(data.ethicalScore4)) : 'Not Rated'}</td>
              <td>${data.ethicalExplanation4 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${ethicalScore.toFixed(2)} | Rating: ${getRatingLabel(ethicalScore)}</strong>
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
              <td>${data.customerServiceScore1 || ''}</td>
              <td>${data.customerServiceScore1 ? getRatingLabel(parseFloat(data.customerServiceScore1)) : 'Not Rated'}</td>
              <td>${data.customerServiceExplanation1 || ''}</td>
            </tr>
            <tr>
              <td>Problem-Solving for Customer Satisfaction</td>
              <td>Proactively identifies and solves customer problems to ensure satisfaction</td>
              <td>${data.customerServiceScore2 || ''}</td>
              <td>${data.customerServiceScore2 ? getRatingLabel(parseFloat(data.customerServiceScore2)) : 'Not Rated'}</td>
              <td>${data.customerServiceExplanation2 || ''}</td>
            </tr>
            <tr>
              <td>Product Knowledge for Customer Support (L.E.A.D.E.R.)</td>
              <td>Possesses comprehensive product knowledge to assist customers effectively</td>
              <td>${data.customerServiceScore3 || ''}</td>
              <td>${data.customerServiceScore3 ? getRatingLabel(parseFloat(data.customerServiceScore3)) : 'Not Rated'}</td>
              <td>${data.customerServiceExplanation3 || ''}</td>
            </tr>
            <tr>
              <td>Positive and Professional Attitude (L.E.A.D.E.R.)</td>
              <td>Maintains a positive and professional demeanor, particularly during customer interactions</td>
              <td>${data.customerServiceScore4 || ''}</td>
              <td>${data.customerServiceScore4 ? getRatingLabel(parseFloat(data.customerServiceScore4)) : 'Not Rated'}</td>
              <td>${data.customerServiceExplanation4 || ''}</td>
            </tr>
            <tr>
              <td>Timely Resolution of Customer Issues (L.E.A.D.E.R.)</td>
              <td>Resolves customer issues promptly and efficiently</td>
              <td>${data.customerServiceScore5 || ''}</td>
              <td>${data.customerServiceScore5 ? getRatingLabel(parseFloat(data.customerServiceScore5)) : 'Not Rated'}</td>
              <td>${data.customerServiceExplanation5 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${customerServiceScore.toFixed(2)} | Rating: ${getRatingLabel(customerServiceScore)}</strong>
        </div>
      </div>

      <!-- COMPACT EVALUATION SUMMARY -->
      <div class="print-section print-summary">
        <div class="print-section-title">EVALUATION SUMMARY</div>
        <div class="print-grid">
          <div class="print-field">
            <div class="print-label">Job Knowledge:</div>
            <div class="print-value">${jobKnowledgeScore.toFixed(2)} (${getRatingLabel(jobKnowledgeScore)}) - 20%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Quality of Work:</div>
            <div class="print-value">${qualityOfWorkScore.toFixed(2)} (${getRatingLabel(qualityOfWorkScore)}) - 20%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Adaptability:</div>
            <div class="print-value">${adaptabilityScore.toFixed(2)} (${getRatingLabel(adaptabilityScore)}) - 10%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Teamwork:</div>
            <div class="print-value">${teamworkScore.toFixed(2)} (${getRatingLabel(teamworkScore)}) - 10%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Reliability:</div>
            <div class="print-value">${reliabilityScore.toFixed(2)} (${getRatingLabel(reliabilityScore)}) - 5%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Ethical Behavior:</div>
            <div class="print-value">${ethicalScore.toFixed(2)} (${getRatingLabel(ethicalScore)}) - 5%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Customer Service:</div>
            <div class="print-value">${customerServiceScore.toFixed(2)} (${getRatingLabel(customerServiceScore)}) - 30%</div>
          </div>
        </div>
        
        <div class="print-results">
          <div class="print-percentage">${overallPercentage}%</div>
          <div style="margin-bottom: 8px;">Performance Score</div>
          <div class="print-status ${isPass ? 'pass' : 'fail'}">${isPass ? 'PASS' : 'FAIL'}</div>
        </div>
      </div>

      <!-- FINAL SECTIONS -->
      <div class="print-section">
        <div class="print-section-title">PRIORITY AREAS, REMARKS & ACKNOWLEDGEMENT</div>
        
        ${data.priorityArea1 || data.priorityArea2 || data.priorityArea3 ? `
        <div style="margin-bottom: 8px;">
          <strong>Priority Areas:</strong><br>
          ${data.priorityArea1 ? `1. ${data.priorityArea1}<br>` : ''}
          ${data.priorityArea2 ? `2. ${data.priorityArea2}<br>` : ''}
          ${data.priorityArea3 ? `3. ${data.priorityArea3}` : ''}
        </div>
        ` : ''}
        
        ${data.remarks ? `
        <div style="margin-bottom: 8px;">
          <strong>Remarks:</strong> ${data.remarks}
        </div>
        ` : ''}
        
        <div style="margin-bottom: 8px;">
          <strong>Acknowledgement:</strong> I hereby acknowledge that the Evaluator has explained to me, to the best of their ability, 
          and in a manner I fully understand, my performance and respective rating on this performance evaluation.
        </div>
        
        <div class="print-signature-grid">
          <div>
            <div class="print-signature">${data.employeeSignature || 'Employee signature not provided'}</div>
            <div class="print-signature-label">Employee's Name & Signature</div>
            <div style="margin-top: 5px; font-size: 8px;">
              <strong>Date:</strong> ${data.employeeSignatureDate || 'Not specified'}
            </div>
          </div>
          <div>
            <div class="print-signature">${data.evaluatorSignature || 'Evaluator signature not provided'}</div>
            <div class="print-signature-label">Evaluator's Name & Signature</div>
            <div style="margin-top: 5px; font-size: 8px;">
              <strong>Date:</strong> ${data.evaluatorSignatureDate || 'Not specified'}
            </div>
          </div>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } else {
      alert('Please allow popups to print the evaluation.');
    }
  };







  // Evaluator approval function
  const handleEvaluatorApproval = async (feedback: any) => {
    const currentUser = getCurrentUserData();

    if (!currentUser?.signature) {
      alert('Please add a signature to your profile before approving evaluations.');
      return;
    }

    if (!confirm(`Are you sure you want to approve this evaluation for ${feedback.employeeName}?`)) {
      return;
    }

    try {
      // Find the original submission
      const originalSubmission = recentSubmissions.find(submission => submission.id === feedback.id);

      if (!originalSubmission) {
        alert('Evaluation not found');
        return;
      }

      // Update the submission with evaluator approval
      const updatedSubmission = {
        ...originalSubmission,
        evaluatorSignature: currentUser.signature,
        evaluatorApprovedAt: new Date().toISOString()
        // Don't set approvalStatus here - let getCorrectApprovalStatus determine it
      };

      // Update the submissions array
      setRecentSubmissions(prev => {
        const updated = prev.map(sub => sub.id === feedback.id ? updatedSubmission : sub);
        return updated;
      });

      // Save to localStorage using the proper service method
      const allSubmissions = await clientDataService.getSubmissions();
      const updatedSubmissions = allSubmissions.map((sub: any) =>
        sub.id === feedback.id ? updatedSubmission : sub
      );

      // Update localStorage using the same key as the service
      localStorage.setItem('submissions', JSON.stringify(updatedSubmissions));

      // Refresh the submissions data to ensure UI updates
      await refreshSubmissions();

      alert(`Evaluation for ${feedback.employeeName} has been approved successfully!`);

      // Create notification for evaluator approval
      try {
        await createApprovalNotification(
          feedback.employeeName,
          currentUser?.name || 'Evaluator',
          'evaluator'
        );
      } catch (notificationError) {
        console.warn('Failed to create approval notification:', notificationError);
      }

    } catch (error) {
      console.error('Error approving evaluation:', error);
      alert('Failed to approve evaluation. Please try again.');
    }
  };

  // Function to determine correct approval status based on signatures
  const getCorrectApprovalStatus = (submission: any) => {
    // Check for employee signature - only count actual image signatures or approval dates
    const hasEmployeeSignature = !!(
      submission.employeeSignature || 
      submission.employeeApprovedAt
    );
    
    // Check for evaluator signature - only count actual image signatures or approval dates
    const hasEvaluatorSignature = !!(
      submission.evaluatorSignature || 
      submission.evaluatorApprovedAt
    );


    if (hasEmployeeSignature && hasEvaluatorSignature) {
      return 'fully_approved';
    } else if (hasEmployeeSignature) {
      return 'fully_approved';
    } else if (hasEvaluatorSignature) {
      return 'pending';
    } else {
      return 'pending';
    }
  };

  // Monitor for fully approved evaluations and send notifications
  // Only check when there's a recent change, not on initial load
  const [hasCheckedNotifications, setHasCheckedNotifications] = useState(false);
  
  useEffect(() => {
    const checkForFullyApproved = async () => {
      if (!recentSubmissions || recentSubmissions.length === 0) return;
      
      // Only check notifications after initial load
      if (!hasCheckedNotifications) {
        setHasCheckedNotifications(true);
        return;
      }

      for (const submission of recentSubmissions) {
        const status = getCorrectApprovalStatus(submission);
        
        // Check if this submission is fully approved and we haven't notified yet
        if (status === 'fully_approved' && !submission.fullyApprovedNotified) {
          try {
            await createFullyApprovedNotification(submission.employeeName);
            
            // Mark as notified to prevent duplicate notifications
            const updatedSubmissions = recentSubmissions.map(sub => 
              sub.id === submission.id 
                ? { ...sub, fullyApprovedNotified: true }
                : sub
            );
            setRecentSubmissions(updatedSubmissions);
            
            // Also update in localStorage
            await clientDataService.updateSubmission(submission.id, { fullyApprovedNotified: true });
            
          } catch (error) {
            console.warn('Failed to create fully approved notification:', error);
          }
        }
      }
    };

    checkForFullyApproved();
  }, [recentSubmissions, hasCheckedNotifications]);

  // Function to merge employee approval data from localStorage
  const mergeEmployeeApprovalData = (submissions: any[]) => {
    return submissions.map(submission => {
      // Try to get employee approval data from localStorage
      // We need to check all possible employee emails that might have approved this evaluation
      let employeeApprovalData = null;

      // Check if submission has employee email
      if (submission.employeeEmail) {
        const approvalKey = `approvalData_${submission.employeeEmail}`;
        const approvalData = JSON.parse(localStorage.getItem(approvalKey) || '{}');
        employeeApprovalData = approvalData[submission.id?.toString()] || null;
      }

      // If not found, try to find approval data by checking all localStorage keys
      if (!employeeApprovalData) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('approvalData_')) {
            const approvalData = JSON.parse(localStorage.getItem(key) || '{}');
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
          employeeName: employeeApprovalData.employeeName || submission.employeeName,
          employeeEmail: employeeApprovalData.employeeEmail || submission.employeeEmail
        };
      }

      return submission;
    });
  };

  // Computed feedback data
  const filteredFeedbackData = useMemo(() => {
    // Filter out any submissions with invalid data
    const validSubmissions = recentSubmissions.filter(submission =>
      submission &&
      typeof submission === 'object' &&
      submission.id !== undefined &&
      submission.employeeName
    );

    // Merge employee approval data from localStorage
    const submissionsWithApprovalData = mergeEmployeeApprovalData(validSubmissions);

    // Debug logging to help identify issues
    if (validSubmissions.length !== recentSubmissions.length) {
      console.warn(`Filtered out ${recentSubmissions.length - validSubmissions.length} invalid submissions`);
    }

    let data = submissionsWithApprovalData.map((submission, index) => {
      // Calculate rating from evaluation data if available
      let calculatedRating = submission.rating || 0;

      if (submission.evaluationData) {
        const evalData = submission.evaluationData;

        // Calculate weighted average from all scores
        const jobKnowledgeScore = calculateScore([evalData.jobKnowledgeScore1, evalData.jobKnowledgeScore2, evalData.jobKnowledgeScore3]);
        const qualityOfWorkScore = calculateScore([evalData.qualityOfWorkScore1, evalData.qualityOfWorkScore2, evalData.qualityOfWorkScore3, evalData.qualityOfWorkScore4, evalData.qualityOfWorkScore5]);
        const adaptabilityScore = calculateScore([evalData.adaptabilityScore1, evalData.adaptabilityScore2, evalData.adaptabilityScore3]);
        const teamworkScore = calculateScore([evalData.teamworkScore1, evalData.teamworkScore2, evalData.teamworkScore3]);
        const reliabilityScore = calculateScore([evalData.reliabilityScore1, evalData.reliabilityScore2, evalData.reliabilityScore3, evalData.reliabilityScore4]);
        const ethicalScore = calculateScore([evalData.ethicalScore1, evalData.ethicalScore2, evalData.ethicalScore3, evalData.ethicalScore4]);
        const customerServiceScore = calculateScore([evalData.customerServiceScore1, evalData.customerServiceScore2, evalData.customerServiceScore3, evalData.customerServiceScore4, evalData.customerServiceScore5]);

        // Calculate weighted overall score
        calculatedRating = Math.round((
          (jobKnowledgeScore * 0.20) +
          (qualityOfWorkScore * 0.20) +
          (adaptabilityScore * 0.10) +
          (teamworkScore * 0.10) +
          (reliabilityScore * 0.05) +
          (ethicalScore * 0.05) +
          (customerServiceScore * 0.30)
        ) * 10) / 10; // Round to 1 decimal place
      }

      return {
        id: submission.id || `submission-${index}`, // Fallback to index if no ID
        uniqueKey: `${submission.id || 'submission'}-${index}-${submission.submittedAt || Date.now()}`, // Ensure unique key with timestamp fallback
        employeeName: submission.employeeName || 'Unknown Employee',
        employeeEmail: submission.evaluationData?.employeeEmail || '',
        department: submission.evaluationData?.department || '',
        position: submission.evaluationData?.position || '',
        reviewer: submission.evaluator || 'Unknown',
        reviewerRole: 'Evaluator',
        supervisor: submission.evaluationData?.supervisor || 'Not specified',
        category: submission.category || 'Performance Review',
        rating: calculatedRating,
        date: submission.submittedAt || new Date().toISOString(),
        comment: submission.evaluationData?.overallComments || 'Performance evaluation completed',
        // Approval-related properties - use correct status based on signatures
        approvalStatus: getCorrectApprovalStatus(submission),
        employeeSignature: submission.employeeSignature || submission.evaluationData?.employeeSignature || null,
        employeeApprovedAt: submission.employeeApprovedAt || submission.evaluationData?.employeeApprovedAt || null,
        evaluatorSignature: submission.evaluatorSignature || submission.evaluationData?.evaluatorSignature || null,
        evaluatorApprovedAt: submission.evaluatorApprovedAt || submission.evaluationData?.evaluatorApprovedAt || null
      };
    });

    // Apply search filter
    if (feedbackSearch) {
      data = data.filter(item =>
        item.employeeName.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
        item.reviewer.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
        item.comment.toLowerCase().includes(feedbackSearch.toLowerCase())
      );
    }

    // Apply department filter
    if (feedbackDepartmentFilter) {
      data = data.filter(item => item.department === feedbackDepartmentFilter);
    }

    // Apply date filter (preset ranges)
    if (feedbackDateFilter) {
      const daysAgo = parseInt(feedbackDateFilter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      data = data.filter(item => new Date(item.date) >= cutoffDate);
    }

    // Apply custom date range filter
    if (feedbackDateRange.from || feedbackDateRange.to) {
      data = data.filter(item => {
        const itemDate = new Date(item.date);
        const fromDate = feedbackDateRange.from ? new Date(feedbackDateRange.from) : null;
        const toDate = feedbackDateRange.to ? new Date(feedbackDateRange.to) : null;

        if (fromDate && toDate) {
          return itemDate >= fromDate && itemDate <= toDate;
        } else if (fromDate) {
          return itemDate >= fromDate;
        } else if (toDate) {
          return itemDate <= toDate;
        }
        return true;
      });
    }

    // Apply quarter filter
    if (feedbackQuarterFilter) {
      data = data.filter(item => {
        const itemQuarter = getQuarterFromEvaluationData(item);
        return itemQuarter === feedbackQuarterFilter;
      });
    }

    if (feedbackApprovalStatusFilter) {
      data = data.filter(item => {
        const approvalStatus = item.approvalStatus || 'pending';
        return approvalStatus === feedbackApprovalStatusFilter;
      });
    }

    // Apply sorting
    data.sort((a, b) => {
      const aValue = a[feedbackSort.key as keyof typeof a];
      const bValue = b[feedbackSort.key as keyof typeof b];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return feedbackSort.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return feedbackSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    // Ensure unique keys by filtering out duplicates
    const uniqueData = data.filter((item, index, self) =>
      index === self.findIndex(t => t.uniqueKey === item.uniqueKey)
    );

    // Debug logging to help identify issues
    if (uniqueData.length !== data.length) {
      console.warn(`Filtered out ${data.length - uniqueData.length} duplicate submissions`);
    }

    // Final validation - ensure all items have unique keys
    const finalData = uniqueData.map((item, index) => ({
      ...item,
      uniqueKey: item.uniqueKey || `fallback-${index}-${Date.now()}`
    }));

    return finalData;
  }, [recentSubmissions, feedbackSearch, feedbackDepartmentFilter, feedbackDateFilter, feedbackDateRange, feedbackQuarterFilter, feedbackApprovalStatusFilter, feedbackSort]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        setCurrentPeriod(mockData.dashboard.currentPeriod);
        setData(mockData.dashboard.performanceData as unknown as PerformanceData);

        // Fetch recent submissions from client data service
        const submissions = await clientDataService.getSubmissions();

        if (Array.isArray(submissions)) {
          // Ensure data is valid and has unique IDs
          const validData = submissions.filter((item: any) =>
            item &&
            typeof item === 'object' &&
            item.id !== undefined &&
            item.employeeName
          );

          // Remove duplicates based on ID
          const uniqueData = validData.filter((item: any, index: number, self: any[]) =>
            index === self.findIndex(t => t.id === item.id)
          );

          setRecentSubmissions(uniqueData);
        } else {
          console.warn('Invalid data structure received from API');
          setRecentSubmissions([]);
        }

        // Load account history data
        const history = loadAccountHistory();
        setAccountHistory(history);


      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'employees', label: 'Employees', icon: '👥' },
    { id: 'feedback', label: 'Evaluation Records', icon: '🗂️' },
    { id: 'account-history', label: 'Account History', icon: '📋' },
  ];

  // Loading state is now handled in the main return statement

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
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-3 w-20 mt-1" />
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
        // Actual cards
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Overall Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-bold text-gray-900">{data?.overallRating || 0}</span>
                <span className="text-sm text-gray-500">/ 5.0</span>
              </div>
              <Badge className={`mt-2 ${getRatingColor(parseFloat(data?.overallRating || '0'))}`}>
                {parseFloat(data?.overallRating || '0') >= 4.5 ? 'Excellent' : parseFloat(data?.overallRating || '0') >= 4.0 ? 'Good' : parseFloat(data?.overallRating || '0') >= 3.5 ? 'Average' : 'Needs Improvement'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Reviews to Verify</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{Math.max(0, 10 - (data?.totalReviews || 0))}</div>
              <p className="text-sm text-gray-500 mt-1">Pending this quarter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Goals Reviewed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{data?.goalsCompleted || 0}/{data?.totalGoals || 0}</div>
              <p className="text-sm text-gray-500 mt-1">Completed</p>
              <Progress value={((data?.goalsCompleted || 0) / (data?.totalGoals || 1)) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Performance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{data?.performanceTrend || 'N/A'}</div>
              <p className="text-sm text-gray-500 mt-1">vs last quarter</p>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );

  // Filter submissions for overview table
  const filteredSubmissions = recentSubmissions.filter((submission) => {
    // Ensure submission is valid
    if (!submission || !submission.employeeName) {
      return false;
    }

    if (!overviewSearch.trim()) return true;
    const searchTerm = overviewSearch.toLowerCase();
    return (
      submission.employeeName.toLowerCase().includes(searchTerm) ||
      (submission.evaluator || '').toLowerCase().includes(searchTerm)
    );
  });

  const renderContent = () => {
    switch (active) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Recent Submissions
                  {(() => {
                    const newCount = filteredSubmissions.filter(sub => {
                      const hoursDiff = (new Date().getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60);
                      return hoursDiff <= 24 && !seenSubmissions.has(sub.id);
                    }).length;
                    return newCount > 0 ? (
                      <Badge className="bg-yellow-500 text-white animate-pulse">
                        {newCount} NEW
                      </Badge>
                    ) : null;
                  })()}
                </CardTitle>
                <CardDescription>Latest items awaiting evaluation ({filteredSubmissions.length} total)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Search and Filter Controls */}
                <div className="px-6 py-4 flex gap-2 border-b border-gray-200">
                  <Input
                    placeholder="Search submissions by employee name or evaluator..."
                    value={overviewSearch}
                    onChange={(e) => setOverviewSearch(e.target.value)}
                    className="w-1/2 bg-gray-100"
                  />
                  {overviewSearch && (
                    <Button
                      size="sm"
                      onClick={() => setOverviewSearch('')}
                      className="px-3 py-2 text-white hover:text-white bg-blue-400 hover:bg-blue-500"
                    >
                      ⌫ Clear
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleEvaluationRecordsRefresh}
                    disabled={isFeedbackRefreshing}
                    className="px-3 py-2 text-white hover:text-white bg-blue-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    title="Refresh submissions data"
                  >
                    {isFeedbackRefreshing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Refreshing...
                      </>
                    ) : (
                      <> Refresh <span><RefreshCw className="h-3 w-3" /></span> </>
                    )}
                  </Button>
                </div>
                {isRefreshing ? (
                  <div className="max-h-[350px] md:max-h-[500px] lg:max-h-[700px] xl:max-h-[750px] overflow-y-auto overflow-x-auto scrollable-table">
                    <Table className="min-w-full">
                      <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                        <TableRow key="overview-header">
                          <TableHead className="px-6 py-3">Employee</TableHead>
                          <TableHead className="px-6 py-3 text-right">Rating</TableHead>
                          <TableHead className="px-6 py-3">Date</TableHead>
                          <TableHead className="px-6 py-3">Quarter</TableHead>
                          <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <TableRow key={`skeleton-${index}`}>
                            <TableCell className="px-6 py-3">
                              <div className="flex items-center space-x-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-24" />
                                  <Skeleton className="h-3 w-16" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-20 rounded-full" />
                            </TableCell>
                            <TableCell className="px-6 py-3 text-right">
                              <Skeleton className="h-4 w-12" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-16 rounded-full" />
                            </TableCell>
                            <TableCell className="px-6 py-4 flex justify-end">
                              <Skeleton className="h-8 w-16" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <>
                    {/* Simple Legend */}
                    <div className="m-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
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
                    
                    {/* Scrollable Table */}
                    <div className="max-h-[350px] md:max-h-[500px] lg:max-h-[700px] xl:max-h-[750px] overflow-y-auto overflow-x-auto scrollable-table">
                    <Table className="min-w-full">
                      <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                        <TableRow key="overview-header">
                          <TableHead className="px-6 py-3">Employee</TableHead>
                          <TableHead className="px-6 py-3 text-right">Rating</TableHead>
                          <TableHead className="px-6 py-3">Date</TableHead>
                          <TableHead className="px-6 py-3">Quarter</TableHead>
                          <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubmissions.length === 0 ? (
                          <TableRow key="no-submissions">
                            <TableCell colSpan={5} className="px-6 py-3 text-center text-gray-500">
                              {overviewSearch.trim() ? 'No submissions found matching your search' : 'No recent submissions'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSubmissions
                            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                            .map((submission) => {
                              const highlight = getSubmissionHighlight(submission.submittedAt, submission.id, submission.approvalStatus);
                              return (
                                <TableRow 
                                  key={submission.id} 
                                  className={highlight.className}
                                  onClick={() => markSubmissionAsSeen(submission.id)}
                                >
                                  <TableCell className="px-6 py-3 font-medium">
                                    <div className="flex items-center gap-2">
                                      {submission.employeeName}
                                      {highlight.badge && (
                                        <Badge variant="secondary" className={`${highlight.badge.className} text-xs`}>
                                          {highlight.badge.text}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-6 py-3 text-right font-semibold">
                                    {(() => {
                                      // Try to calculate rating from evaluation data first
                                      if (submission.evaluationData) {
                                        const calculatedRating = calculateOverallRating(submission.evaluationData);
                                        if (calculatedRating > 0 && calculatedRating <= 5) {
                                          return `${calculatedRating}/5`;
                                        }
                                      }
                                      // Fallback to stored rating
                                      return `${submission.rating || 'N/A'}/5`;
                                    })()}
                                  </TableCell>
                                  <TableCell className="px-6 py-3">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{new Date(submission.submittedAt).toLocaleDateString()}</span>
                                      <span className="text-xs text-gray-500">{getTimeAgo(submission.submittedAt)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-6 py-3">
                                    <Badge className={getQuarterColor(getQuarterFromEvaluationData(submission.evaluationData || submission))}>
                                      {getQuarterFromEvaluationData(submission.evaluationData || submission)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-6 py-4 flex justify-end text-right">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markSubmissionAsSeen(submission.id);
                                      setSelectedEvaluationSubmission(submission);
                                      setIsViewResultsModalOpen(true);
                                    }}
                                    className="bg-blue-500 hover:bg-blue-200 text-white border-blue-200"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
                                  </Button>

                                </div>
                              </TableCell>
                            </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case 'employees':
        return (
          (() => {
            // Use refresh counter as key to force re-render when data is refreshed
            const refreshKey = `employees-${employeeDataRefresh}`;
            const normalizedQuery = employeeSearch.trim().toLowerCase();
            // Get updated profile data from localStorage with auto-update support
            const getUpdatedEmployeeData = (employee: any) => {
              try {
                const employeeId = employee.employeeId || employee.id;
                
                // First check for real-time profile updates
                const updatedAvatar = getUpdatedAvatar(employeeId, employee.avatar);
                if (hasAvatarUpdate(employeeId)) {
                  return {
                    ...employee,
                    avatar: updatedAvatar,
                    // Keep other data as is, only update avatar from real-time updates
                  };
                }

                // Check for updated profile data in localStorage
                // First check if this is the current user
                const storedUser = localStorage.getItem('authenticatedUser');
                if (storedUser) {
                  const userData = JSON.parse(storedUser);
                  if (userData.id === employeeId) {
                    return {
                      ...employee,
                      avatar: userData.avatar || employee.avatar,
                      name: userData.name || employee.name,
                      email: userData.email || employee.email,
                      position: userData.position || employee.position,
                      department: userData.department || employee.department,
                      bio: userData.bio || employee.bio
                    };
                  }
                }

                // Check for other employees' profile updates in localStorage
                const employeeProfiles = localStorage.getItem('employeeProfiles');
                if (employeeProfiles) {
                  const profiles = JSON.parse(employeeProfiles);
                  const profileData = profiles[employeeId];
                  
                  if (profileData) {
                    return {
                      ...employee,
                      avatar: profileData.avatar || employee.avatar,
                      name: profileData.name || employee.name,
                      email: profileData.email || employee.email,
                      position: profileData.position || employee.position,
                      department: profileData.department || employee.department,
                      bio: profileData.bio || employee.bio
                    };
                  }
                }

                // For demo purposes, let's also check if there are any profile updates in the accounts localStorage
                const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
                const accountData = accounts.find((acc: any) => (acc.id === employeeId || acc.employeeId === employeeId));
                if (accountData && (accountData.avatar || accountData.name !== employee.name)) {
                  return {
                    ...employee,
                    avatar: accountData.avatar || employee.avatar,
                    name: accountData.name || employee.name,
                    email: accountData.email || employee.email,
                    position: accountData.position || employee.position,
                    department: accountData.department || employee.department,
                    bio: accountData.bio || employee.bio
                  };
                }

                return employee;
              } catch (error) {
                console.error('Error getting updated employee data:', error);
                return employee;
              }
            };

            const filtered: Employee[] = (accountsData as any).accounts.filter((e: any) => {
              // Only show active employees
              if (!e.isActive) return false;

              // Only show employees (not admins, managers, etc.)
              if (e.role !== 'employee') return false;

              const matchesSearch = !normalizedQuery ||
                e.name.toLowerCase().includes(normalizedQuery) ||
                e.email.toLowerCase().includes(normalizedQuery) ||
                e.position.toLowerCase().includes(normalizedQuery) ||
                e.department.toLowerCase().includes(normalizedQuery) ||
                e.role.toLowerCase().includes(normalizedQuery);

              const matchesDepartment = !selectedDepartment || e.department === selectedDepartment;

              return matchesSearch && matchesDepartment;
            }).map((e: any) => {
              // Get updated data from localStorage
              const updatedEmployee = getUpdatedEmployeeData(e);
              
              return {
                // Use employeeId instead of id to match submissions data
                id: updatedEmployee.employeeId || updatedEmployee.id,
                name: updatedEmployee.name,
                email: updatedEmployee.email,
                position: updatedEmployee.position,
                department: updatedEmployee.department,
                role: updatedEmployee.role,
                hireDate: updatedEmployee.hireDate,
                avatar: updatedEmployee.avatar
              };
            });
            const sorted = [...filtered].sort((a, b) => {
              const { key, direction } = employeeSort;
              const av = a[key] ?? '';
              const bv = b[key] ?? '';
              const res = key === 'hireDate'
                ? new Date(av as string).getTime() - new Date(bv as string).getTime()
                : String(av).localeCompare(String(bv));
              return direction === 'asc' ? res : -res;
            });
            const toggleSort = (key: keyof Employee) => {
              setEmployeeSort((prev) =>
                prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }
              );
            };
            const sortIcon = (key: keyof Employee) => {
              if (employeeSort.key !== key) return '↕';
              return employeeSort.direction === 'asc' ? '↑' : '↓';
            };
            return (
              <Card key={refreshKey}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Employees</CardTitle>
                      <CardDescription>Directory of employees (includes profile updates)</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEmployeesRefresh}
                      className="flex items-center bg-blue-500 text-white hover:bg-green-600 hover:text-white"
                      title="Refresh employee data (including profile updates)"
                    >
                      <span>Refresh</span>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Quick Stats Summary */}
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{sorted.length}</div>
                        <div className="text-sm text-gray-600">Total Employees</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {sorted.filter(e => {
                            const employeeEvaluations = filteredSubmissions.filter(sub => sub.employeeId === e.id);
                            const latestEvaluation = employeeEvaluations.sort((a, b) => 
                              new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                            )[0];
                            const hasRecentEvaluation = latestEvaluation && 
                              (new Date().getTime() - new Date(latestEvaluation.submittedAt).getTime()) < (90 * 24 * 60 * 60 * 1000);
                            return hasRecentEvaluation;
                          }).length}
                        </div>
                        <div className="text-sm text-gray-600">Up to Date</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {sorted.filter(e => {
                            const employeeEvaluations = filteredSubmissions.filter(sub => sub.employeeId === e.id);
                            const latestEvaluation = employeeEvaluations.sort((a, b) => 
                              new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                            )[0];
                            const hasRecentEvaluation = latestEvaluation && 
                              (new Date().getTime() - new Date(latestEvaluation.submittedAt).getTime()) < (90 * 24 * 60 * 60 * 1000);
                            return !hasRecentEvaluation;
                          }).length}
                        </div>
                        <div className="text-sm text-gray-600">Need Review</div>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 space-y-4">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 w-full">
                        {/* Search input with clear button inside */}
                        <div className="relative flex-1">
                          <Input
                            placeholder="Search employees by name, email, position, department, role"
                            value={employeeSearch}
                            onChange={(e) => setEmployeeSearch(e.target.value)}
                            className="w-full pr-10"
                          />
                          {employeeSearch && (
                            <button
                              onClick={() => setEmployeeSearch('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 font hover:text-red-700"
                              title="Clear search"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Department dropdown */}
                        <SearchableDropdown
                          options={['All Departments', ...departments.map((dept) => dept.name)]}
                          value={selectedDepartment || 'All Departments'}
                          onValueChangeAction={(value) =>
                            setSelectedDepartment(value === 'All Departments' ? '' : value)
                          }
                          placeholder="All Departments"
                          className="w-[200px]"
                        />

                      </div>

                    </div>
                  </div>
                  {isEmployeesRefreshing ? (
                    <div className="max-h-[500px] overflow-y-auto">
                      <Table className="min-w-full">
                        <TableHeader className="sticky top-0 bg-white z-10 border-b">
                          <TableRow key="employees-header">
                            <TableHead className="px-6 py-3">Employee</TableHead>
                            <TableHead className="px-6 py-3">Position & Department</TableHead>
                            <TableHead className="px-6 py-3">Role</TableHead>
                            <TableHead className="px-6 py-3 text-center">Status</TableHead>
                            <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: 8 }).map((_, index) => (
                            <TableRow key={`skeleton-employee-${index}`}>
                              <TableCell className="px-6 py-3">
                                <div className="flex items-center space-x-3">
                                  <Skeleton className="h-10 w-10 rounded-full" />
                                  <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-32" />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-20" />
                                  <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <Skeleton className="h-6 w-16 rounded-full" />
                              </TableCell>
                              <TableCell className="px-6 py-3 text-center">
                                <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                              </TableCell>
                              <TableCell className="px-6 py-3 flex justify-end">
                                <div className="flex gap-2">
                                  <Skeleton className="h-8 w-16" />
                                  <Skeleton className="h-8 w-20" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto">
                      <Table className="min-w-full">
                        <TableHeader className="sticky top-0 bg-white z-10 border-b">
                          <TableRow key="employees-header">
                            <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                              Employee <span className="ml-1 text-xs text-gray-500">{sortIcon('name')}</span>
                            </TableHead>
                            <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('position')}>
                              Position & Department <span className="ml-1 text-xs text-gray-500">{sortIcon('position')}</span>
                            </TableHead>
                            <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('role')}>
                              Role <span className="ml-1 text-xs text-gray-500">{sortIcon('role')}</span>
                            </TableHead>
                            <TableHead className="px-6 py-3 text-center">Status</TableHead>
                            <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sorted.map((e) => {
                            // Get employee's latest evaluation to determine status
                            const employeeEvaluations = filteredSubmissions.filter(sub => sub.employeeId === e.id);
                            const latestEvaluation = employeeEvaluations.sort((a, b) => 
                              new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                            )[0];
                            
                            // Determine status
                            const now = new Date();
                            const hasRecentEvaluation = latestEvaluation && 
                              (now.getTime() - new Date(latestEvaluation.submittedAt).getTime()) < (90 * 24 * 60 * 60 * 1000); // 90 days
                            const status = hasRecentEvaluation ? 'Up to Date' : 'Needs Review';
                            
                            return (
                            <TableRow key={e.id} className="hover:bg-gray-50">
                              <TableCell className="px-6 py-3">
                                <div className="flex items-center space-x-3">
                                  <div className="relative h-10 w-10 rounded-full overflow-hidden flex items-center justify-center">
                                    {e.avatar ? (
                                      <img 
                                        src={e.avatar} 
                                        alt={e.name} 
                                        className="h-10 w-10 rounded-full object-cover"
                                        onError={(e) => {
                                          // Fallback to gradient avatar if image fails to load
                                          e.currentTarget.style.display = 'none';
                                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                          if (nextElement) {
                                            nextElement.style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <div 
                                      className={`h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm ${e.avatar ? 'hidden' : 'flex'}`}
                                    >
                                      {e.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    {/* Auto-update indicator */}
                                    {hasAvatarUpdate(e.id) && (
                                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                        <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                      {e.name}
                                      {hasAvatarUpdate(e.id) && (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                          Updated
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">{e.email}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div>
                                  <div className="font-medium text-gray-900">{e.position}</div>
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">{e.department}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <Badge className={
                                  e.role === 'admin' ? 'bg-red-100 text-red-800' :
                                  e.role === 'hr' ? 'bg-green-100 text-green-800' :
                                  e.role === 'evaluator' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {e.role.charAt(0).toUpperCase() + e.role.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-3 text-center">
                                <Badge className={
                                  status === 'Up to Date' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                }>
                                  {status}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-3 text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className='bg-green-500 hover:bg-green-600 text-white border-green-500'
                                    onClick={() => {
                                      setSelectedEmployeeForView(e);
                                      setIsViewEmployeeModalOpen(true);
                                    }}
                                  >
                                    <svg
                                      className="w-4 h-4 mr-2"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    className='bg-blue-500 hover:bg-yellow-400 hover:text-black'
                                    onClick={() => {
                                      setSelectedEmployee(e);
                                      setIsEvaluationModalOpen(true);
                                    }}
                                  >
                                    <svg
                                      className="w-4 h-4 mr-2"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                    Evaluate
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()
        );
      case 'feedback':
        return (
          <div className="space-y-6">
            {/* Search and Filter Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  All Feedback/Evaluation Records
                  {(() => {
                    const newCount = filteredFeedbackData.filter(feedback => {
                      const hoursDiff = (new Date().getTime() - new Date(feedback.date).getTime()) / (1000 * 60 * 60);
                      return hoursDiff <= 24 && !seenSubmissions.has(feedback.id);
                    }).length;
                    return newCount > 0 ? (
                      <Badge className="bg-yellow-500 text-white animate-pulse">
                        {newCount} NEW
                      </Badge>
                    ) : null;
                  })()}
                </CardTitle>
                <CardDescription>Complete feedback history and evaluation records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  {/* Search */}
                  <div className="flex-1">
                    <Label htmlFor="feedback-search" className="text-sm font-medium">Search</Label>
                    <div className="mt-1 relative">
                      <div className="relative w-full">
                        <Input
                          id="feedback-search"
                          placeholder="Search by employee name, reviewer, or comments..."
                          className={`pr-10`} // reserve space for the button
                          value={feedbackSearch}
                          onChange={(e) => setFeedbackSearch(e.target.value)}
                        />

                        {(feedbackSearch || feedbackDepartmentFilter || feedbackDateFilter || feedbackDateRange.from || feedbackDateRange.to || feedbackQuarterFilter || feedbackApprovalStatusFilter) && (
                          <button
                            onClick={() => {
                              setFeedbackSearch('');
                              setFeedbackDepartmentFilter('');
                              setFeedbackDateFilter('');
                              setFeedbackDateRange({ from: '', to: '' });
                              setFeedbackQuarterFilter('');
                              setFeedbackApprovalStatusFilter('');
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600  hover:text-red-700"
                            title="Clear all filters"
                          >
                            <X className="h-4 w-4  " />
                          </button>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Department Filter */}
                  <div className="w-full md:w-48">
                    <Label htmlFor="feedback-department" className="text-sm font-medium">Department</Label>
                    <SearchableDropdown
                      options={['All Departments', ...departments.map(dept => dept.name)]}
                      value={feedbackDepartmentFilter || 'All Departments'}
                      onValueChangeAction={(value) => setFeedbackDepartmentFilter(value === 'All Departments' ? '' : value)}
                      placeholder="All Departments"
                      className="mt-1"
                    />
                  </div>

                  {/* Approval Status Filter */}
                  <div className="w-full md:w-48">
                    <Label htmlFor="feedback-approval-status" className="text-sm font-medium">Approval Status</Label>
                    <SearchableDropdown
                      options={[
                        'All Statuses',
                        '⏳ Pending',
                        '✓ Fully Approved',
                      ]}
                      value={
                        feedbackApprovalStatusFilter === 'pending' ? '⏳ Pending' :
                          feedbackApprovalStatusFilter === 'fully_approved' ? '✓ Fully Approved' :
                            'All Statuses'
                      }
                      onValueChangeAction={(value) => {
                        const statusMap: Record<string, string> = {
                          '⏳ Pending': 'pending',
                          '✓ Fully Approved': 'fully_approved',
                        };
                        setFeedbackApprovalStatusFilter(value === 'All Statuses' ? '' : statusMap[value] || '');
                      }}
                      placeholder="All Statuses"
                      className="mt-1"
                    />
                  </div>

                  {/* Quarter Filter */}
                  <div className="w-full md:w-48">
                    <Label htmlFor="feedback-quarter" className="text-sm font-medium">Quarter</Label>
                    <SearchableDropdown
                      options={[
                        'All Quarters',
                        'Q1 2024',
                        'Q2 2024',
                        'Q3 2024',
                        'Q4 2024',
                        'Q1 2025',
                        'Q2 2025',
                        'Q3 2025',
                        'Q4 2025'
                      ]}
                      value={feedbackQuarterFilter || 'All Quarters'}
                      onValueChangeAction={(value) => {
                        setFeedbackQuarterFilter(value === 'All Quarters' ? '' : value);
                        // Clear date filters when quarter is selected
                        if (value !== 'All Quarters') {
                          setFeedbackDateFilter('');
                          setFeedbackDateRange({ from: '', to: '' });
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
                        value={feedbackDateRange.from}
                        onChange={(e) => {
                          setFeedbackDateRange(prev => ({ ...prev, from: e.target.value }));
                          // Clear preset filters when using custom range
                          if (e.target.value) {
                            setFeedbackDateFilter('');
                            setFeedbackQuarterFilter('');
                          }
                        }}
                        className="text-sm"
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        value={feedbackDateRange.to}
                        onChange={(e) => {
                          setFeedbackDateRange(prev => ({ ...prev, to: e.target.value }));
                          // Clear preset filters when using custom range
                          if (e.target.value) {
                            setFeedbackDateFilter('');
                            setFeedbackQuarterFilter('');
                          }
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>


                  {/* Refresh Button */}
                  <div className="w-full md:w-32">
                    <Label className="text-sm font-medium opacity-0">Refresh</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEvaluationRecordsRefresh}
                      disabled={isFeedbackRefreshing}
                      className="mt-1 w-full text-xs bg-blue-500 hover:bg-green-600 text-center text-white  hover:text-white disabled:cursor-not-allowed"
                      title="Refresh evaluation records data"
                    >
                      {isFeedbackRefreshing ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          Refreshing...
                        </>
                      ) : (
                        <>

                          Refresh <span><RefreshCw className="h-3 w-3" /></span> </>
                      )}
                    </Button>
                  </div>


                </div>
              </CardContent>
            </Card>

            {/* Feedback Table */}
            <Card>
              <CardContent className="p-0">
                {/* Color Legend */}
                <div className="m-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span className="font-medium text-gray-700">Status Indicators:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-yellow-100 border-l-2 border-l-yellow-500 rounded"></div>
                      <span className="text-gray-600 bg-yellow-500 text-white rounded-full px-2 py-1">NEW </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-blue-50 border-l-2 border-l-blue-500 rounded"></div>
                      <span className="text-gray-600 bg-blue-500 text-white rounded-full px-2 py-1">Recent </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
                      <span className="text-gray-600 bg-green-500 text-white rounded-full px-2 py-1">Fully Approved</span>
                    </div>
                  </div>
                </div>  

                {isFeedbackRefreshing ? (
                  <div className="max-h-[500px] overflow-y-auto overflow-x-auto scrollable-table">
                    <Table className="min-w-full">
                      <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                        <TableRow key="feedback-header">
                          <TableHead className="px-6 py-3">Employee Name</TableHead>
                          <TableHead className="px-6 py-3">Department</TableHead>
                          <TableHead className="px-6 py-3">Position</TableHead>
                          <TableHead className="px-6 py-3">Reviewer</TableHead>
                          <TableHead className="px-6 py-3">Rating</TableHead>
                          <TableHead className="px-6 py-3">Date</TableHead>
                          <TableHead className="px-6 py-3">Approval Status</TableHead>
                          <TableHead className="px-6 py-3">Employee Signature</TableHead>
                          <TableHead className="px-6 py-3">Evaluator Signature</TableHead>
                          <TableHead className="px-6 py-3">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-200">
                        {Array.from({ length: 10 }).map((_, index) => (
                          <TableRow key={`skeleton-feedback-${index}`}>
                            <TableCell className="px-6 py-3">
                              <div className="space-y-1">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-2.5 w-24" />
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-5 w-12 rounded-full" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-3 w-16" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <div className="space-y-1">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-2.5 w-12" />
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-5 w-18 rounded-full" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-3 w-8" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-3 w-16" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-5 w-12 rounded-full" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-3 w-12" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-3 w-12" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-12" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto overflow-x-auto scrollable-table">
                    <Table className="min-w-full">
                      <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                        <TableRow key="feedback-header">
                          <TableHead className="px-6 py-3 cursor-pointer hover:bg-gray-50" onClick={() => sortFeedback('employeeName')}>
                            Employee Name {getSortIcon('employeeName')}
                          </TableHead>
                          <TableHead className="px-6 py-3 cursor-pointer hover:bg-gray-50" onClick={() => sortFeedback('department')}>
                            Department {getSortIcon('department')}
                          </TableHead>
                          <TableHead className="px-6 py-3">Position</TableHead>
                          <TableHead className="px-6 py-3">Reviewer</TableHead>
                          <TableHead className="px-6 py-3 cursor-pointer hover:bg-gray-50" onClick={() => sortFeedback('rating')}>
                            Rating {getSortIcon('rating')}
                          </TableHead>
                          <TableHead className="px-6 py-3 cursor-pointer hover:bg-gray-50" onClick={() => sortFeedback('date')}>
                            Date {getSortIcon('date')}
                          </TableHead>
                          <TableHead className="px-6 py-3">Approval Status</TableHead>
                          <TableHead className="px-6 py-3">Employee Signature</TableHead>
                          <TableHead className="px-6 py-3">Evaluator Signature</TableHead>
                          <TableHead className="px-6 py-3">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-200">
                        {filteredFeedbackData.map((feedback) => {
                          const highlight = getSubmissionHighlight(feedback.date, feedback.id, feedback.approvalStatus);
                          return (
                            <TableRow 
                              key={feedback.uniqueKey} 
                              className={highlight.className}
                              onClick={() => markSubmissionAsSeen(feedback.id)}
                            >
                              <TableCell className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900">{feedback.employeeName}</span>
                                      {highlight.badge && (
                                        <Badge className={`${highlight.badge.className} text-xs px-1.5 py-0`}>
                                          {highlight.badge.text}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">{feedback.employeeEmail}</div>
                                  </div>
                                </div>
                              </TableCell>
                          <TableCell className="px-6 py-3">
                            <Badge variant="outline" className="text-xs">
                              {feedback.department}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3 text-sm text-gray-600">
                            {feedback.position}
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                {feedback.supervisor && feedback.supervisor !== 'Not specified' 
                                  ? feedback.supervisor 
                                  : feedback.reviewer}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${getRatingColor(feedback.rating)}`}>
                                {feedback.rating.toFixed(1)}/5
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {getRatingLabel(feedback.rating)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3 text-sm text-gray-600">
                            {new Date(feedback.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            {/* Approval Status */}
                            <Badge className={
                              feedback.approvalStatus === 'fully_approved' ? 'bg-green-100 text-green-800' :
                                feedback.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                            }>
                              {feedback.approvalStatus === 'fully_approved' ? '✓ Fully Approved' :
                                feedback.approvalStatus === 'rejected' ? '❌ Rejected' :
                                  '⏳ Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            {/* Employee Signature Status */}
                            <div className="flex items-center space-x-2">
                              {feedback.employeeSignature && feedback.employeeApprovedAt ? (
                                <div className="flex items-center space-x-1 text-green-600">
                                  <span className="text-xs">✓</span>
                                  <span className="text-xs font-medium">Signed</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 text-gray-500">
                                  <span className="text-xs">⏳</span>
                                  <span className="text-xs">Pending</span>
                                </div>
                              )}
                              {feedback.employeeApprovedAt && (
                                <div className="text-xs text-gray-500">
                                  {new Date(feedback.employeeApprovedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            {/* Evaluator Signature Status */}
                            <div className="flex items-center space-x-2">
                              {feedback.evaluatorSignature ? (
                                <div className="flex items-center space-x-1 text-blue-600">
                                  <span className="text-xs">✓</span>
                                  <span className="text-xs font-medium">Signed</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 text-gray-500">
                                  <span className="text-xs">⏳</span>
                                  <span className="text-xs">Pending</span>
                                </div>
                              )}
                              {feedback.evaluatorApprovedAt && (
                                <div className="text-xs text-gray-500">
                                  {new Date(feedback.evaluatorApprovedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markSubmissionAsSeen(feedback.id);
                                  viewEvaluationForm(feedback);
                                }}
                                className="text-xs px-2 py-1 bg-green-600 hover:bg-green-300 text-white "
                              >
                                ☰ View 
                              </Button>

                              <Button
                                
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markSubmissionAsSeen(feedback.id);
                                  printFeedback(feedback);
                                }}
                                className="text-xs bg-gray-500 text-white px-2 py-1"
                              >
                                ⎙ Print
                              </Button>


                              {/* Delete Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(feedback);
                                }}
                                className="text-xs px-2 py-1 bg-red-300 hover:bg-red-500 text-gray-700 hover:text-white border-red-200"
                                title="Delete this evaluation record"
                              >
                                ❌ Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
            )}
              </CardContent>
            </Card>
          </div>
        );
      case 'account-history':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account History</CardTitle>
                <CardDescription>Track suspension records and account activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mt-6">
                  {/* Tab Navigation */}

                  {/* Tab Content */}
                  <>
                      {/* Search Controls */}
                      <div className="mb-6">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            placeholder="Search account history..."
                            value={accountHistorySearchTerm}
                            onChange={(e) => setAccountHistorySearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                          {accountHistorySearchTerm && (
                            <button
                              onClick={() => setAccountHistorySearchTerm('')}
                              className="absolute inset-y-0 font-medium px-2 right-0 pr-3 flex items-center"
                            >
                              <svg className="h-5 w-5 text-red-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                  {/* Account History Actions */}
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Showing {getFilteredAccountHistory().length} of {accountHistory.length} records
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAccountHistoryRefresh}
                      disabled={isAccountHistoryRefreshing}
                      className="flex items-center space-x-2 bg-blue-500 text-white hover:bg-green-700 hover:text-white"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh</span>
                    </Button>
                  </div>

                  {/* Account History Table */}
                  {isAccountHistoryRefreshing ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: 8 }).map((_, index) => (
                            <TableRow key={`skeleton-account-${index}`}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Skeleton className="h-4 w-4" />
                                  <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-20" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-32" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-20" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-12 rounded-full" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-16 rounded-full" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-20" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredAccountHistory().map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">{getTypeIcon(item.type)}</span>
                                  <Badge variant="outline" className="capitalize">
                                    {item.type}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{item.title}</TableCell>
                              <TableCell className="max-w-xs truncate" title={item.description}>
                                {item.description}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.employeeName}</div>
                                  <div className="text-sm text-gray-500">{item.employeeEmail}</div>
                                </div>
                              </TableCell>
                              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge className={getSeverityColor(item.severity)}>
                                  {item.severity}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={getAccountStatusColor(item.status)}>
                                  {item.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{item.actionBy}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Empty State */}
                  {!isAccountHistoryRefreshing && getFilteredAccountHistory().length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-4">📋</div>
                      <p className="text-lg font-medium">
                        {accountHistorySearchTerm ? 'No matching records found' : 'No account history found'}
                      </p>
                      <p className="text-sm">
                        {accountHistorySearchTerm
                          ? 'Try adjusting your search terms'
                          : 'Account history will appear here when violations or feedback are recorded'
                        }
                      </p>
                    </div>
                  )}

                  {/* Summary Statistics */}
                  {!isAccountHistoryRefreshing && accountHistory.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t mt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {accountHistory.filter(item => item.type === 'violation').length}
                        </div>
                        <div className="text-sm text-gray-600">Violations</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {accountHistory.filter(item => item.type === 'feedback').length}
                        </div>
                        <div className="text-sm text-gray-600">Feedback</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {accountHistory.filter(item => item.severity === 'high').length}
                        </div>
                        <div className="text-sm text-gray-600">High Severity</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {accountHistory.filter(item => item.status === 'completed' || item.status === 'reinstated').length}
                        </div>
                        <div className="text-sm text-gray-600">Resolved</div>
                      </div>
                    </div>
                  )}
                  </>

                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute requiredRole={["evaluator", "manager"]}>
      
      {/* Loading Screen - Shows during initial load */}
      {(loading || !data) && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-800">Loading Dashboard...</p>
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

        {/* Evaluation Modal */}
        <Dialog open={isEvaluationModalOpen} onOpenChangeAction={setIsEvaluationModalOpen}>
          <DialogContent 
            className="max-w-7xl max-h-[101vh] overflow-hidden p-2 evaluation-container"
          >
            {selectedEmployee && (
              <EvaluationForm
                employee={selectedEmployee}
                currentUser={getCurrentUserData()}
                onCloseAction={() => {
                  setIsEvaluationModalOpen(false);
                  setSelectedEmployee(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

    {/* Delete Success Dialog */}
    <Dialog open={showDeleteSuccessDialog} onOpenChangeAction={setShowDeleteSuccessDialog}>
      <DialogContent className={`max-w-sm w-[90vw] sm:w-full px-6 py-6 ${isSuccessDialogClosing ? 'animate-popdown' : 'animate-popup'}`}>
        <div className="space-y-4 fade-in-scale">
          <div className="flex justify-center mt-2">
            <div className="w-16 h-16 flex items-center justify-center p-1">
              <svg viewBox="0 0 52 52" className="w-12 h-12 overflow-visible">
                <circle className="check-circle" cx="26" cy="26" r="24" fill="none" />
                <path className="check-path" fill="none" d="M14 27 l8 8 l16 -16" />
              </svg>
            </div>
          </div>
          <style jsx>{`
            .check-circle { stroke: #22c55e; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 160; stroke-dashoffset: 160; animation: draw-circle 0.6s ease-out forwards; }
            .check-path { stroke: #16a34a; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 50; stroke-dashoffset: 50; animation: draw-check 0.4s ease-out 0.4s forwards; }
            @keyframes draw-circle { to { stroke-dashoffset: 0; } }
            @keyframes draw-check { to { stroke-dashoffset: 0; } }
            .fade-in-scale { animation: fadeInScale 220ms ease-out both; }
            @keyframes fadeInScale { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
          `}</style>
          <p className="text-lg font-medium text-gray-900 text-center">Record Deleted</p>
          <p className="text-sm text-gray-600 text-center">The evaluation record has been removed.</p>
        </div>
      </DialogContent>
    </Dialog>

    {/* Incorrect Password Dialog */}
    <Dialog open={showIncorrectPasswordDialog} onOpenChangeAction={setShowIncorrectPasswordDialog}>
      <DialogContent className={`max-w-sm w-[90vw] sm:w-full px-6 py-6 ${isDialogClosing ? 'animate-popdown' : 'animate-popup'}`}>
        <div className="space-y-3 fade-in-scale">
          <div className="flex justify-center mt-1">
            <div className="w-16 h-16 flex items-center justify-center p-1">
              <svg viewBox="0 0 52 52" className="w-12 h-12 overflow-visible">
                <circle className="error-circle" cx="26" cy="26" r="24" fill="none" />
                <path className="error-x-line1" fill="none" d="M16 16 l20 20" />
                <path className="error-x-line2" fill="none" d="M36 16 l-20 20" />
              </svg>
            </div>
          </div>
          <style jsx>{`
            .fade-in-scale { animation: fadeInScale 200ms ease-out both; }
            @keyframes fadeInScale { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
            .error-circle { stroke: #dc2626; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 160; stroke-dashoffset: 160; animation: draw-error-circle 0.6s ease-out forwards; }
            .error-x-line1 { stroke: #dc2626; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 30; stroke-dashoffset: 30; animation: draw-x-line1 0.4s ease-out 0.3s forwards; }
            .error-x-line2 { stroke: #dc2626; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 30; stroke-dashoffset: 30; animation: draw-x-line2 0.4s ease-out 0.5s forwards; }
            @keyframes draw-error-circle { to { stroke-dashoffset: 0; } }
            @keyframes draw-x-line1 { to { stroke-dashoffset: 0; } }
            @keyframes draw-x-line2 { to { stroke-dashoffset: 0; } }
          `}</style>
          <p className="text-lg font-medium text-gray-900 text-center">Incorrect Password</p>
          <p className="text-sm text-gray-600 text-center">Please try again with the correct password.</p>
        </div>
      </DialogContent>
    </Dialog>
        {/* View Results Modal */}
        <ViewResultsModal
          isOpen={isViewResultsModalOpen}
          onCloseAction={() => setIsViewResultsModalOpen(false)}
          submission={selectedEvaluationSubmission}
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
        <Dialog open={isDeleteModalOpen} onOpenChangeAction={setIsDeleteModalOpen}>
          <DialogContent className={`sm:max-w-md mx-4 my-8 bg-white ${isDeleteDialogClosing ? 'animate-popdown' : 'animate-popup'}`}>
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
          onCloseAction={() => setIsViewEmployeeModalOpen(false)}
          employee={selectedEmployeeForView}
          onStartEvaluationAction={(employee: Employee) => {
            setIsViewEmployeeModalOpen(false);
            setSelectedEmployee(employee);
            setIsEvaluationModalOpen(true);
          }}
          onViewSubmissionAction={(submission: any) => {
            setSelectedSubmission(submission);
            setIsViewSubmissionModalOpen(true);
          }}
        />

      </PageTransition>
    </ProtectedRoute>
  );
}


