'use client';

import { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import DashboardShell from '@/components/DashboardShell';
import PageTransition from '@/components/PageTransition';
import { useUser } from '@/contexts/UserContext';
import { withAuth } from '@/hoc';
import ViewResultsModal from '@/components/evaluation/ViewResultsModal';
import EvaluationDetailsModal from '@/components/EvaluationDetailsModal';
// CommentDetailModal import removed
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import clientDataService from '@/lib/clientDataService';
import { getEmployeeResults, initializeMockData } from '@/lib/evaluationStorage';
// commentsService import removed
import accountsData from '@/data/accounts.json';
import { useToast } from '@/hooks/useToast';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load tab components
const OverviewTab = lazy(() => import('./OverviewTab').then(m => ({ default: m.OverviewTab })));
const PerformanceReviewsTab = lazy(() => import('./PerformanceReviewsTab').then(m => ({ default: m.PerformanceReviewsTab })));
const EvaluationHistoryTab = lazy(() => import('./EvaluationHistoryTab').then(m => ({ default: m.EvaluationHistoryTab })));
const AccountHistoryTab = lazy(() => import('./AccountHistoryTab').then(m => ({ default: m.AccountHistoryTab })));

function EmployeeDashboard() {
  const { profile, user, isLoading: authLoading, logout } = useUser();
  const { success, error } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Initialize activeTab from URL parameter or default to 'overview'
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTabState] = useState(tabParam || 'overview');

  // Sync activeTab with URL - memoized to prevent unnecessary re-renders
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    router.push(`${pathname}?tab=${tab}`, { scroll: false });
  }, [router, pathname]);

  // Individual loading states for each tab content
  const [isRefreshingReviews, setIsRefreshingReviews] = useState(false);
  const [, setIsRefreshingHistory] = useState(false);
  const [, setIsRefreshingAccountHistory] = useState(false);
  const [, setIsRefreshingQuarterly] = useState(false);
  const [isRefreshingOverview, setIsRefreshingOverview] = useState(false);

  // Refreshing dialog state
  const [showRefreshingDialog, setShowRefreshingDialog] = useState(false);
  const [refreshingMessage, setRefreshingMessage] = useState('');


  const [submissions, setSubmissions] = useState<any[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<any[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [isViewResultsModalOpen, setIsViewResultsModalOpen] = useState(false);
  const [isEvaluationDetailsModalOpen, setIsEvaluationDetailsModalOpen] = useState(false);
  const [modalOpenedFromTab, setModalOpenedFromTab] = useState<string>('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [quarterlySearchTerm, setQuarterlySearchTerm] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [accountHistory, setAccountHistory] = useState<any[]>([]);
  const [accountHistorySearchTerm, setAccountHistorySearchTerm] = useState('');
  const [overviewSearchTerm, setOverviewSearchTerm] = useState('');
  // Comments & feedback functionality removed
  
  // Date filtering states for quarterly performance
  const [dateFilter, setDateFilter] = useState<{from?: Date, to?: Date}>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Logout confirmation states
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

  // Success animation states for various actions
  const [showViewSuccess, setShowViewSuccess] = useState(false);

  // Delete evaluation states
  const [isDeleteEvaluationDialogOpen, setIsDeleteEvaluationDialogOpen] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<any>(null);
  const [isDeletingEvaluation, setIsDeletingEvaluation] = useState(false);
  const [showDeleteEvaluationSuccessDialog, setShowDeleteEvaluationSuccessDialog] = useState(false);

  // Password validation for deletion
  const [deletePassword, setDeletePassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showIncorrectPasswordDialog, setShowIncorrectPasswordDialog] = useState(false);
  const [isDialogClosing, setIsDialogClosing] = useState(false);

  // Approval states
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [evaluationToApprove, setEvaluationToApprove] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(false);
  const [approvedEvaluations, setApprovedEvaluations] = useState<Set<string>>(new Set());
  const [employeeApprovalName, setEmployeeApprovalName] = useState('');

  // Memoize sidebar items to prevent unnecessary re-renders
  const sidebarItems = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'reviews', label: 'Performance Reviews', icon: '📝' },
    { id: 'history', label: 'Evaluation History', icon: '📈' },
    { id: 'account-history', label: 'Account History', icon: '📋' },
  ], []);

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

  // Enhanced highlighting system with approval status
  const getSubmissionHighlight = (submittedAt: string, allSubmissions: any[] = [], submissionId?: string) => {
    // Check if this submission is approved first
    if (submissionId && isEvaluationApproved(submissionId)) {
      return {
        className: 'bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100',
        badge: { text: 'Approved', className: 'bg-green-200 text-green-800' },
        priority: 'approved'
      };
    }
    
    // Sort all submissions by date (most recent first)
    const sortedSubmissions = [...allSubmissions].sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    
    // Find the position of current submission in the sorted list
    const currentIndex = sortedSubmissions.findIndex(sub => sub.submittedAt === submittedAt);
    
    if (currentIndex === 0) {
      // Most recent submission - YELLOW "New"
      return {
        className: 'bg-yellow-100 border-l-4 border-l-yellow-500 hover:bg-yellow-200',
        badge: { text: 'New', className: 'bg-yellow-200 text-yellow-800' },
        priority: 'new'
      };
    } else if (currentIndex === 1) {
      // Second most recent - BLUE "Recent"
      return {
        className: 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100',
        badge: { text: 'Recent', className: 'bg-blue-100 text-blue-800' },
        priority: 'recent'
      };
    } else {
      // Older submissions - No special highlighting
      return {
        className: 'hover:bg-gray-50',
        badge: null,
        priority: 'old'
      };
    }
  };

  // Legacy function for backward compatibility
  const isNewSubmission = (submittedAt: string) => {
    const highlight = getSubmissionHighlight(submittedAt, submissions);
    return highlight.priority === 'new' || highlight.priority === 'recent';
  };

  // Function to load account history (suspension records only)
  const loadAccountHistory = (email: string) => {
    try {
      // Load only suspended employees data (violations/suspensions)
      const suspendedEmployees = JSON.parse(localStorage.getItem('suspendedEmployees') || '[]');
      const employeeViolations = suspendedEmployees.filter((emp: any) => emp.email === email);

      // Format only suspension/violation records
      const history = employeeViolations.map((violation: any) => ({
        id: `violation-${violation.id}`,
        type: 'violation',
        title: 'Policy Violation',
        description: violation.suspensionReason,
        date: violation.suspensionDate,
        status: violation.status,
        severity: 'high',
        actionBy: violation.suspendedBy,
        details: {
          duration: violation.suspensionDuration,
          reinstatedDate: violation.reinstatedDate,
          reinstatedBy: violation.reinstatedBy
        }
      }));

      // Sort by date (newest first)
      return history.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error loading account history:', error);
      return [];
    }
  };

  // Function to determine highlighting for account history items
  const getAccountHistoryHighlight = (item: any) => {
    if (item.type === 'violation') {
      return 'bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100';
    }
    return 'hover:bg-gray-50'; // Default or no highlight
  };

  // Comments & feedback functionality removed

  // Function to validate password for deletion
  const validateDeletePassword = (password: string) => {
    // Validate against the current user's actual password from accounts.json
    if (!user || !user.email) {
      setIsPasswordValid(false);
      setPasswordError('User not found. Please try again.');
      setShowIncorrectPasswordDialog(true);

      // Start pop-down animation after 1 second, then close after 1.3 seconds
      setTimeout(() => {
        setIsDialogClosing(true);
      }, 1000);

      setTimeout(() => {
        setShowIncorrectPasswordDialog(false);
        setDeletePassword('');
        setPasswordError('');
        setIsDialogClosing(false);
      }, 1300);

      return false;
    }

    // Find user account in accounts data
    const userAccount = accountsData.accounts.find((account: any) => account.email === user.email);

    if (!userAccount) {
      setIsPasswordValid(false);
      setPasswordError('User account not found. Please try again.');
      setShowIncorrectPasswordDialog(true);

      setTimeout(() => {
        setIsDialogClosing(true);
      }, 1000);

      setTimeout(() => {
        setShowIncorrectPasswordDialog(false);
        setDeletePassword('');
        setPasswordError('');
        setIsDialogClosing(false);
      }, 1300);

      return false;
    }

    if (password === userAccount.password) {
      setIsPasswordValid(true);
      setPasswordError('');
      return true;
    } else {
      setIsPasswordValid(false);
      setPasswordError('Incorrect password. Please try again.');
      setShowIncorrectPasswordDialog(true);

      // Start pop-down animation after 1 second, then close after 1.3 seconds
      setTimeout(() => {
        setIsDialogClosing(true);
      }, 1000);

      setTimeout(() => {
        setShowIncorrectPasswordDialog(false);
        setDeletePassword('');
        setPasswordError('');
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
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {

      // Remove the evaluation from submissions
      const updatedSubmissions = submissions.filter(submission => submission.id !== evaluationToDelete.id);
      setSubmissions(updatedSubmissions);

      // Also remove from evaluation results if it exists there
      const updatedResults = evaluationResults.filter(result => result.id !== evaluationToDelete.id);
      setEvaluationResults(updatedResults);


      // Reset password validation states
      setDeletePassword('');
      setIsPasswordValid(false);
      setPasswordError('');

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
      console.error('Error deleting evaluation:', error);
      setIsDeletingEvaluation(false);
    }
  };

  // Helper functions for account history
  const getFilteredAccountHistory = () => {
    if (!accountHistorySearchTerm) return accountHistory;

    return accountHistory.filter(item =>
      item.title.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
      item.actionBy.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(accountHistorySearchTerm.toLowerCase())
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'violation': return '⚠️';
      case 'feedback': return '💬';
      default: return '📝';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'reinstated': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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
        if (profile?.email) {
          const approvedData = localStorage.getItem(`approvedEvaluations_${profile.email}`);
          if (approvedData) {
            setApprovedEvaluations(new Set(JSON.parse(approvedData)));
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading employee data:', error);
        setLoading(false);
      }
    };

    // Always try to load data, let ProtectedRoute handle authentication
    if (profile) {
      loadEmployeeData();
    } else {
      // If no profile, still stop loading to prevent infinite loading
      setLoading(false);
    }
  }, [profile]);

  // Handle URL parameter changes for tab navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout reached, forcing loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);


  // Memoize handleTabChange to prevent unnecessary re-renders
  // Note: Individual tab components now handle their own refresh via isActive prop
  const handleTabChange = useCallback(async (tabId: string) => {
    setActiveTab(tabId);
    // Tab components handle their own refresh when isActive changes
  }, [setActiveTab]);

  // Handle refresh modal completion

  // Comprehensive refresh function for all dashboard data
  const refreshDashboardData = async (showToast = true, showModal = false, isInitialLoad = false) => {

    try {
      if (profile?.email) {
        // Fetch fresh submissions data
        const allSubmissions = await clientDataService.getSubmissions();
        const userSubmissions = allSubmissions.filter((submission: any) =>
          submission.employeeName === profile.name ||
          submission.evaluationData?.employeeEmail === profile.email
        );
        const finalSubmissions = userSubmissions.length > 0 ? userSubmissions : allSubmissions;
        setSubmissions(finalSubmissions);

        // Refresh evaluation results
        const results = getEmployeeResults(profile.email);
        setEvaluationResults(results);

        // Refresh account history
        const history = loadAccountHistory(profile.email);
        setAccountHistory(history);

        // Comments functionality removed


      }
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    } finally {
      // Show appropriate success message
      if (showToast) {
        const message = isInitialLoad
          ? 'Dashboard loaded successfully!'
          : 'Dashboard refreshed successfully!';
        success(message, 'All your data has been updated');
      }
    }
  };

  // Auto-refresh functionality using shared hook
  const {
    showRefreshModal,
    refreshModalMessage,
    handleRefreshModalComplete,
    refreshDashboardData: autoRefreshDashboardData
  } = useAutoRefresh({
    refreshFunction: refreshDashboardData,
    dashboardName: 'Employee Dashboard',
    customMessage: 'Welcome back! Refreshing your employee dashboard data...'
  });

  // Real-time data updates via localStorage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only refresh if the change is from another tab/window
      if (e.key === 'submissions' && e.newValue !== e.oldValue) {
        handleRefreshSubmissions();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Refresh function for Account History table only
  const handleRefreshAccountHistory = async () => {
    setIsRefreshing(true);
    setIsRefreshingAccountHistory(true);
    setRefreshingMessage('Refreshing account history...');
    setShowRefreshingDialog(true);
    try {
      if (profile?.email) {
        // Add a small delay to simulate loading
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Load only account history data
        const history = loadAccountHistory(profile.email);
        setAccountHistory(history);


        // Show success toast
        success('Account history refreshed successfully', 'All account records have been updated');
      }
    } catch (error) {
      console.error('Error refreshing account history:', error);
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
    setRefreshingMessage('Refreshing performance reviews...');
    setShowRefreshingDialog(true);
    try {
      // Add a small delay to simulate loading
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Fetch submissions data using client data service
      try {
        const allSubmissions = await clientDataService.getSubmissions();
        // Filter submissions to only show current user's data
        const userSubmissions = profile?.email
          ? allSubmissions.filter((submission: any) =>
            submission.employeeName === profile.name ||
            submission.evaluationData?.employeeEmail === profile.email
          )
          : [];

        // If no user-specific submissions found, show all submissions for testing
        const finalSubmissions = userSubmissions.length > 0 ? userSubmissions : allSubmissions;
        setSubmissions(finalSubmissions);

        // Show success toast
        success('Performance reviews refreshed successfully', 'All performance data has been updated');
      } catch (error) {
      }
    } catch (error) {
      console.error('Error refreshing submissions:', error);
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
    setRefreshingMessage('Refreshing quarterly performance...');
    setShowRefreshingDialog(true);
    try {
      if (profile?.email) {
        // Add a small delay to simulate loading
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Reload evaluation results which are used for quarterly performance
        const results = getEmployeeResults(profile.email);
        setEvaluationResults(results);

        // Show success toast
        success('Quarterly performance refreshed successfully', 'All quarterly data has been updated');
      }
    } catch (error) {
      console.error('Error refreshing quarterly performance:', error);
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
    setRefreshingMessage('Refreshing evaluation history...');
    setShowRefreshingDialog(true);

    try {
      if (profile?.email) {
        // Add a small delay to simulate loading
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Reload evaluation results which are used for evaluation history
        const results = getEmployeeResults(profile.email);
        setEvaluationResults(results);

        // Show success toast
        success('Evaluation history refreshed successfully', 'All evaluation records have been updated');
      }
    } catch (error) {
      console.error('Error refreshing evaluation history:', error);
    } finally {
      setIsRefreshing(false);
      setIsRefreshingHistory(false);
      setShowRefreshingDialog(false);
    }
  };

  const handleViewDetails = (id: string | number) => {
    const evaluation = evaluationResults.find(result => result.id === id);
    if (evaluation) {
      // Get approval data for this evaluation
      const approvalData = getApprovalData(evaluation.id);

      // Convert evaluation result to submission format for ViewResultsModal
      const submission = {
        id: evaluation.id,
        employeeName: evaluation.employeeName,
        category: 'Performance Review',
        rating: evaluation.overallRating,
        submittedAt: evaluation.submittedAt,
        status: evaluation.status,
        evaluator: evaluation.evaluatorName,
        evaluationData: evaluation.evaluationData,
        // Include approval data in the submission object
        employeeSignature: approvalData?.employeeSignature || null,
        employeeApprovedAt: approvalData?.approvedAt || null
      };
      setSelectedEvaluation(submission);
      setIsViewResultsModalOpen(true);
    }
  };

  // Approval functions
  const handleApproveEvaluation = (submissionOrId: any) => {
    let submission;

    if (typeof submissionOrId === 'string') {
      // If it's a string ID, find the submission from the submissions array
      submission = submissions.find(sub => sub.id.toString() === submissionOrId);
      if (!submission) {
        // Fallback to selectedEvaluation if not found in submissions
        submission = selectedEvaluation;
      }
    } else {
      // If it's an object, use it directly
      submission = submissionOrId;
    }


    if (!submission) {
      console.error('❌ Cannot approve: no submission found');
      return;
    }

    if (!submission.id) {
      console.error('❌ Cannot approve: submission has no id property');
      return;
    }

    setEvaluationToApprove(submission);
    setEmployeeApprovalName(profile?.name || user?.name || '');
    setIsApprovalDialogOpen(true);
  };

  // Function to update the submissions data with employee signature
  const updateSubmissionWithEmployeeSignature = async (evaluationId: number, employeeSignature: string) => {
    try {
      // Get current submissions from localStorage
      const currentSubmissions = JSON.parse(localStorage.getItem('submissions') || '[]');

      // Find and update the specific submission
      const updatedSubmissions = currentSubmissions.map((submission: any) => {
        if (submission.id === evaluationId) {
          return {
            ...submission,
            employeeSignature: employeeSignature,
            employeeApprovedAt: new Date().toISOString(),
            approvalStatus: 'employee_approved'
          };
        }
        return submission;
      });

      // Save back to localStorage
      localStorage.setItem('submissions', JSON.stringify(updatedSubmissions));
    } catch (error) {
      console.error('Error updating submission with employee signature:', error);
    }
  };

  const confirmApproval = async () => {
    if (!evaluationToApprove || !profile?.email) return;


    // Check if user has a signature
    const employeeSignature = profile.signature || user?.signature || '';

    if (!employeeSignature) {
      error('No Signature Found', 'Please add a signature to your profile before approving evaluations. Go to your profile settings to add a signature.');
      return;
    }

    setIsApproving(true);

    try {
      const approvalData = {
        id: evaluationToApprove.id,
        approvedAt: new Date().toISOString(),
        employeeSignature: employeeSignature,
        employeeName: employeeApprovalName || profile.name || user?.name || '',
        employeeEmail: profile.email || user?.email || ''
      };



      // Add to approved evaluations with full approval data
      const newApproved = new Set(approvedEvaluations);
      newApproved.add(evaluationToApprove.id);
      setApprovedEvaluations(newApproved);

      // Save approval data to localStorage
      const existingApprovals = JSON.parse(localStorage.getItem(`approvalData_${profile.email}`) || '{}');
      // Ensure we use the correct submission ID as the key
      const submissionId = evaluationToApprove.id?.toString() || '';
      if (!submissionId) {
        console.error('❌ Cannot save approval: evaluationToApprove.id is undefined');
        return;
      }
      existingApprovals[submissionId] = approvalData;
      localStorage.setItem(`approvalData_${profile.email}`, JSON.stringify(existingApprovals));


      // Also save the approved IDs list
      localStorage.setItem(`approvedEvaluations_${profile.email}`, JSON.stringify([...newApproved]));

      // CRITICAL: Update the main submissions data so evaluator can see the signature
      await updateSubmissionWithEmployeeSignature(evaluationToApprove.id, employeeSignature);

      // Show success animation
      setIsApproving(false);
      setShowApprovalSuccess(true);

      // Close dialog after success animation
      setTimeout(() => {
        setIsApprovalDialogOpen(false);
        setShowApprovalSuccess(false);
        setEvaluationToApprove(null);
        success('Evaluation Approved!', 'You have successfully acknowledged this evaluation with your signature.');

        // Refresh the evaluation history to show the signature
        handleRefreshHistory();
      }, 1500);

    } catch (error) {
      console.error('Error approving evaluation:', error);
      setIsApproving(false);
    }
  };

  const isEvaluationApproved = (submissionId: string) => {
    return approvedEvaluations.has(submissionId);
  };

  const getApprovalData = (submissionId: string) => {
    if (!profile?.email) return null;
    const approvalData = JSON.parse(localStorage.getItem(`approvalData_${profile.email}`) || '{}');
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
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Show success animation
    setIsLoggingOut(false);
    setShowLogoutSuccess(true);

    // Close dialog and logout after success animation
    setTimeout(async () => {
      setIsLogoutDialogOpen(false);
      setShowLogoutSuccess(false);
      // Use the UserContext logout which includes loading screen
      await logout();
    }, 1500);
  };


  // Calculate overall rating using the same formula as ViewResultsModal
  const calculateOverallRating = (evaluationData: any) => {
    if (!evaluationData) return 0;

    const calculateScore = (scores: string[]) => {
      const validScores = scores.filter(score => score && score !== '').map(score => parseFloat(score));
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

    return Math.round(overallWeightedScore * 10) / 10;
  };

  // Loading state is now handled in the main return statement

  const topSummary = (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Overall Rating</CardTitle>
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
          <CardTitle className="text-sm font-medium text-gray-600">Reviews Received</CardTitle>
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
          <CardTitle className="text-sm font-medium text-gray-600">Evaluation Score</CardTitle>
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
                {submissions.length > 0 ?
                  (submissions[0].evaluationData ?
                    calculateOverallRating(submissions[0].evaluationData).toFixed(1) :
                    submissions[0].rating?.toFixed(1) || '0.0'
                  ) : '0.0'
                }/5.0
              </div>
              <p className="text-sm text-gray-500 mt-1">Latest evaluation</p>
              <div className="mt-2">
                <Badge className={`text-xs ${submissions.length > 0 ?
                  (() => {
                    const score = submissions[0].evaluationData ?
                      calculateOverallRating(submissions[0].evaluationData) :
                      submissions[0].rating || 0;
                    if (score >= 4.5) return 'bg-green-100 text-green-800';
                    if (score >= 4.0) return 'bg-blue-100 text-blue-800';
                    if (score >= 3.5) return 'bg-yellow-100 text-yellow-800';
                    return 'bg-red-100 text-red-800';
                  })() : 'bg-gray-100 text-gray-800'
                  }`}>
                  {submissions.length > 0 ?
                    (() => {
                      const score = submissions[0].evaluationData ?
                        calculateOverallRating(submissions[0].evaluationData) :
                        submissions[0].rating || 0;
                      if (score >= 4.5) return 'Outstanding';
                      if (score >= 4.0) return 'Exceeds Expectations';
                      if (score >= 3.5) return 'Meets Expectations';
                      return 'Needs Improvement';
                    })() : 'No Data'
                  }
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Performance Rating</CardTitle>
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
                  if (submissions.length === 0) return '0.0';

                  const totalScore = submissions.reduce((sum, submission) => {
                    const score = submission.evaluationData ?
                      calculateOverallRating(submission.evaluationData) :
                      submission.rating || 0;
                    return sum + score;
                  }, 0);

                  return (totalScore / submissions.length).toFixed(1);
                })()}/5.0
              </div>
              <p className="text-sm text-gray-500 mt-1">Average across all evaluations</p>
              <div className="mt-2 flex items-center space-x-1">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${(() => {
                        const avgRating = submissions.length > 0 ?
                          submissions.reduce((sum, submission) => {
                            const score = submission.evaluationData ?
                              calculateOverallRating(submission.evaluationData) :
                              submission.rating || 0;
                            return sum + score;
                          }, 0) / submissions.length : 0;
                        return star <= avgRating ? 'text-yellow-400' : 'text-gray-300';
                      })()
                        }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-gray-600 ml-1">
                  {submissions.length > 0 ? `${submissions.length} review${submissions.length !== 1 ? 's' : ''}` : 'No reviews'}
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
      case 'overview':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            <OverviewTab 
              isActive={activeTab === 'overview'}
              onViewEvaluation={(submission) => {
                setSelectedEvaluation(submission);
                setModalOpenedFromTab('overview');
                setIsViewResultsModalOpen(true);
              }}
            />
          </Suspense>
        );

      case 'reviews':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            <PerformanceReviewsTab
              isActive={activeTab === 'reviews'}
              onViewEvaluation={(submission) => {
                setSelectedEvaluation(submission);
                setModalOpenedFromTab('reviews');
                setIsViewResultsModalOpen(true);
              }}
            />
          </Suspense>
        );

      case 'history':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            <EvaluationHistoryTab
              isActive={activeTab === 'history'}
              onViewEvaluation={(submission) => {
                setSelectedEvaluation(submission);
                setModalOpenedFromTab('history');
                setIsViewResultsModalOpen(true);
              }}
              onDeleteEvaluation={(submission) => {
                setEvaluationToDelete(submission);
                setIsDeleteEvaluationDialogOpen(true);
              }}
            />
          </Suspense>
        );

      case 'account-history':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            <AccountHistoryTab isActive={activeTab === 'account-history'} />
          </Suspense>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Loading Screen - Shows during initial load, authentication, and auto-refresh */}
      {(loading || authLoading || !profile) && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-800">
              {authLoading ? "Authenticating..." :
                !profile ? "Loading user profile..." :
                  "Loading Employee Dashboard..."}
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
        isApproved={selectedEvaluation ? isEvaluationApproved(selectedEvaluation.id) : false}
        approvalData={selectedEvaluation ? getApprovalData(selectedEvaluation.id) : null}
        currentUserName={profile?.name || user?.name}
        currentUserSignature={(() => {
          const signature = selectedEvaluation?.evaluationData?.evaluatorSignatureImage || selectedEvaluation?.evaluationData?.evaluatorSignature || null;
          return signature;
        })()}
        showApprovalButton={modalOpenedFromTab === 'overview'} // Only show approval button in Overview tab
      />

      {/* Evaluation Details Modal */}
      <EvaluationDetailsModal
        isOpen={isEvaluationDetailsModalOpen}
        onCloseAction={() => setIsEvaluationDetailsModalOpen(false)}
        evaluationData={selectedEvaluation ? {
          evaluationData: selectedEvaluation.evaluationData,
          evaluatorName: selectedEvaluation.evaluatorName,
          submittedAt: selectedEvaluation.submittedAt,
          period: selectedEvaluation.period,
          overallRating: selectedEvaluation.overallRating
        } : null}
        approvalData={selectedEvaluation ? getApprovalData(selectedEvaluation.id) : null}
        isApproved={selectedEvaluation ? isEvaluationApproved(selectedEvaluation.id) : false}
      />

      {/* Comments & feedback modals removed */}

      {/* Logout Confirmation Alert Dialog */}
      <AlertDialog
        open={isLogoutDialogOpen}
        onOpenChangeAction={setIsLogoutDialogOpen}
        title={showLogoutSuccess ? "Logging Out..." : "Logout"}
        description={showLogoutSuccess
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
          variant: 'wave',
          color: 'purple',
          size: 'lg'
        }}
        onConfirm={confirmLogout}
        onCancel={() => setIsLogoutDialogOpen(false)}
      />

      {/* Delete Evaluation Dialog */}
      <Dialog open={isDeleteEvaluationDialogOpen} onOpenChangeAction={setIsDeleteEvaluationDialogOpen}>
        <DialogContent className="max-w-md w-[90vw] sm:w-full px-6 py-6 animate-popup">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600 animate-fadeInOut" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Delete Evaluation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 fade-in-scale">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this evaluation from {evaluationToDelete?.employeeName}? This action cannot be undone and will permanently remove the evaluation from your history.
            </p>

            <div className="space-y-3">
              <div>
                <Label htmlFor="deletePassword" className="text-sm font-medium text-gray-700">
                  Enter your password to confirm deletion:
                </Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Enter password"
                  className={`mt-1 ${passwordError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
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
                  setDeletePassword('');
                  setIsPasswordValid(false);
                  setPasswordError('');
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
      <Dialog open={showDeleteEvaluationSuccessDialog} onOpenChangeAction={setShowDeleteEvaluationSuccessDialog}>
        <DialogContent className="max-w-sm w-[90vw] sm:w-full px-6 py-6 animate-popup">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 mt-4 font-bold flex items-center justify-center p-1">
                <svg viewBox="0 0 52 52" className="w-16 h-16 overflow-visible">
                  <circle className="check-circle" cx="26" cy="26" r="24" fill="none" />
                  <path className="check-path" fill="none" d="M14 27 l8 8 l16 -16" />
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
              @keyframes draw-circle { to { stroke-dashoffset: 0; } }
              @keyframes draw-check { to { stroke-dashoffset: 0; } }
              .fade-in-scale { animation: fadeInScale 220ms ease-out both; }
              @keyframes fadeInScale { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
            `}</style>
            <p className="text-lg font-medium text-gray-900 text-center">Evaluation Deleted</p>
            <p className="text-sm text-gray-600 text-center">
              The evaluation has been removed from your history.
            </p>

          </div>
        </DialogContent>
      </Dialog>

      {/* Incorrect Password Dialog */}
      <Dialog open={showIncorrectPasswordDialog} onOpenChangeAction={setShowIncorrectPasswordDialog}>
        <DialogContent className={`max-w-sm w-[90vw] sm:w-full px-6 py-6 ${isDialogClosing ? 'animate-popdown' : 'animate-popup'}`}>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 mt-4 font-bold flex items-center justify-center p-1">
                <svg viewBox="0 0 52 52" className="w-16 h-16 overflow-visible animate-x">
                  <circle className="error-circle" cx="26" cy="26" r="24" fill="none" stroke="#ef4444" strokeWidth="2" />
                  <path className="error-path" fill="none" stroke="#ef4444" strokeWidth="3" d="M16 16 l20 20 M36 16 l-20 20" />
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
              @keyframes draw-circle { to { stroke-dashoffset: 0; } }
              @keyframes draw-x { to { stroke-dashoffset: 0; } }
              .fade-in-scale { animation: fadeInScale 220ms ease-out both; }
              @keyframes fadeInScale { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
            `}</style>
            <p className="text-lg font-medium text-red-600 text-center">Incorrect Password</p>
            <p className="text-sm text-gray-600 text-center">
              The password you entered is incorrect. Please try again.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChangeAction={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-md w-[90vw] bg-blue-50 sm:w-full px-6 py-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {showApprovalSuccess ? "Evaluation Approved!" : "Approve Evaluation"}
            </DialogTitle>
          </DialogHeader>

          {!showApprovalSuccess ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to approve this evaluation? By approving, you acknowledge that you have reviewed and understood your performance assessment.
              </p>

              {/* Signature Status Check */}
              {(() => {
                const hasSignature = profile?.signature || user?.signature;
                return hasSignature ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-800 font-medium">Signature Available</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">Your signature will be used for approval.</p>
                  </div>
                ) : (
                  <div className="p-3 bg-red-200 border border-red-200 rounded-lg">
                    <div className="flex items-center  space-x-2">
                      <svg className="w-5 h-5 text-red-600 animate-fadeInOut" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-red-800 font-medium">No Signature Found</span>
                    </div>
                    <p className="text-xs text-red-700 mt-1">Please add a signature to your profile before approving evaluations.</p>
                  </div>
                );
              })()}



              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsApprovalDialogOpen(false);
                    setEvaluationToApprove(null);
                    setEmployeeApprovalName('');
                  }}
                  disabled={isApproving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmApproval}
                  disabled={isApproving || !employeeApprovalName.trim() || !(profile?.signature || user?.signature)}
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
                    <circle className="check-circle" cx="26" cy="26" r="25" fill="none" />
                    <path className="check-path" fill="none" d="M14 27 l8 8 l16 -16" />
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
                  to { stroke-dashoffset: 0; }
                }
                @keyframes draw-check {
                  to { stroke-dashoffset: 0; }
                }
              `}</style>
              <p className="text-lg font-medium text-gray-900 text-center">Evaluation Approved Successfully!</p>
              <p className="text-sm text-gray-600 text-center">
                Your signature has been recorded and the evaluation is now complete.
              </p>


              <Button
                onClick={() => {
                  setIsApprovalDialogOpen(false);
                  setShowApprovalSuccess(false);
                  setEmployeeApprovalName('');
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

    </>
  );
}

// Wrap with HOC for authentication
export default withAuth(EmployeeDashboard, { requiredRole: 'employee' });
