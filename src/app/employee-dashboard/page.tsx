'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardShell from '@/components/DashboardShell';
import PageTransition from '@/components/PageTransition';
import { useUser } from '@/contexts/UserContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ViewResultsModal from '@/components/evaluation/ViewResultsModal';
import EvaluationDetailsModal from '@/components/EvaluationDetailsModal';
import CommentDetailModal from '@/components/CommentDetailModal';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import clientDataService from '@/lib/clientDataService';
import { getEmployeeResults, initializeMockData } from '@/lib/evaluationStorage';
import commentsService from '@/lib/commentsService';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

import RefreshAnimationModal from '@/components/RefreshAnimationModal';

export default function EmployeeDashboard() {
  const router = useRouter();
  const { profile, user, isAuthenticated, isLoading: authLoading, logout } = useUser();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
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
  const [comments, setComments] = useState<any[]>([]);
  const [commentsSearchTerm, setCommentsSearchTerm] = useState('');
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [isDeletingComments, setIsDeletingComments] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  // Separate loading states for different refresh operations
  const [isRefreshingSubmissions, setIsRefreshingSubmissions] = useState(false);
  const [isRefreshingAccountHistory, setIsRefreshingAccountHistory] = useState(false);
  const [isRefreshingComments, setIsRefreshingComments] = useState(false);
  const [isRefreshingQuarterly, setIsRefreshingQuarterly] = useState(false);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);

  // Individual comment deletion states
  const [isDeleteCommentDialogOpen, setIsDeleteCommentDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isDeletingSingleComment, setIsDeletingSingleComment] = useState(false);
  const [showSingleDeleteSuccess, setShowSingleDeleteSuccess] = useState(false);

  // Logout confirmation states
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

  // Success animation states for various actions
  const [showViewSuccess, setShowViewSuccess] = useState(false);
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  // Delete evaluation states
  const [isDeleteEvaluationDialogOpen, setIsDeleteEvaluationDialogOpen] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<any>(null);
  const [isDeletingEvaluation, setIsDeletingEvaluation] = useState(false);
  const [showDeleteEvaluationSuccess, setShowDeleteEvaluationSuccess] = useState(false);

  // Approval states
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [evaluationToApprove, setEvaluationToApprove] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(false);
  const [approvedEvaluations, setApprovedEvaluations] = useState<Set<string>>(new Set());
  const [employeeApprovalName, setEmployeeApprovalName] = useState('');

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'reviews', label: 'Performance Reviews', icon: '📝' },
    { id: 'history', label: 'Evaluation History', icon: '📈' },
    { id: 'account-history', label: 'Account History', icon: '📋' },
  ];

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

  // Function to load comments data using the service
  const loadComments = (email: string) => {
    return commentsService.getCommentsByEmployee(email);
  };

  // Helper functions for comments
  const getFilteredComments = () => {
    if (!commentsSearchTerm) return comments;
    return commentsService.searchComments(commentsSearchTerm, profile?.email);
  };

  const getCommentTypeIcon = (type: string) => {
    switch (type) {
      case 'positive': return '✅';
      case 'constructive': return '💡';
      case 'negative': return '⚠️';
      case 'recognition': return '🏆';
      default: return '💬';
    }
  };

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'constructive': return 'bg-blue-100 text-blue-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'recognition': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Comment action functions
  const handleViewComment = (comment: any) => {
    setSelectedComment(comment);
    setIsCommentModalOpen(true);
    // Show Sonner toast
    success('Comment details opened', 'Comment information has been loaded successfully');
  };

  const handleClearComment = (commentId: string) => {
    setCommentToDelete(commentId);
    setIsDeleteCommentDialogOpen(true);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;

    setIsDeletingSingleComment(true);

    // Simulate a small delay for the loading animation
    await new Promise(resolve => setTimeout(resolve, 1000));

    const success = commentsService.deleteComment(commentToDelete);
    if (success && profile?.email) {
      const updatedComments = commentsService.getCommentsByEmployee(profile.email);
      setComments(updatedComments);
    }

    // Show success animation
    setIsDeletingSingleComment(false);
    setShowSingleDeleteSuccess(true);

    // Close dialog after success animation
    setTimeout(() => {
      setIsDeleteCommentDialogOpen(false);
      setShowSingleDeleteSuccess(false);
      setCommentToDelete(null);
    }, 2000);
  };

  const handleClearAllComments = () => {
    setIsClearAllDialogOpen(true);
  };

  const confirmClearAllComments = async () => {
    setIsDeletingComments(true);

    // Simulate a small delay for the loading animation
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (profile?.email) {
      const deletedCount = commentsService.deleteAllCommentsForEmployee(profile.email);
      if (deletedCount > 0) {
        setComments([]);
      }
    }

    // Show success animation
    setIsDeletingComments(false);
    setShowDeleteSuccess(true);

    // Close dialog after success animation (increased time to see checkmark better)
    setTimeout(() => {
      setIsClearAllDialogOpen(false);
      setShowDeleteSuccess(false);
    }, 3000);
  };

  // Delete evaluation function
  const handleDeleteEvaluation = async () => {
    if (!evaluationToDelete) return;

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

      console.log('Evaluation deleted:', evaluationToDelete.id);

      // Show success animation
      setIsDeletingEvaluation(false);
      setShowDeleteEvaluationSuccess(true);

      // Close dialog after success animation
      setTimeout(() => {
        setIsDeleteEvaluationDialogOpen(false);
        setEvaluationToDelete(null);
        setShowDeleteEvaluationSuccess(false);
      }, 3000);

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


  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Auto-refresh data when switching to specific tabs
    if (tabId === 'history') {
      handleRefreshHistory();
    } else if (tabId === 'reviews') {
      handleRefreshSubmissions();
    } else if (tabId === 'account-history') {
      // Refresh account history data
      if (profile?.email) {
        const history = loadAccountHistory(profile.email);
        setAccountHistory(history);
      }
    }
  };

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

        // Refresh comments
        const commentsData = loadComments(profile.email);
        setComments(commentsData);


        console.log('Dashboard refreshed:', {
          submissions: finalSubmissions.length,
          evaluations: results.length,
          history: history.length,
          comments: commentsData.length
        });
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

  // Refresh function for Account History table only
  const handleRefreshAccountHistory = async () => {
    // Show refresh modal
    setRefreshMessage('Refreshing account history...');
    setShowRefreshSuccess(true);

    try {
      if (profile?.email) {
        // Load only account history data
        const history = loadAccountHistory(profile.email);
        setAccountHistory(history);
        console.log('Account history refreshed:', history.length, 'items');

        // Show success toast
        success('Account history refreshed successfully', 'All account records have been updated');
      }
    } catch (error) {
      console.error('Error refreshing account history:', error);
    } finally {
      // Hide refresh modal after a delay
      setTimeout(() => {
        setShowRefreshSuccess(false);
      }, 2000);
    }
  };

  // Refresh function for Comments table only
  const handleRefreshComments = async () => {
    // Show refresh modal
    setRefreshMessage('Refreshing comments and feedback...');
    setShowRefreshSuccess(true);

    try {
      if (profile?.email) {
        // Load only comments data
        const commentsData = loadComments(profile.email);
        setComments(commentsData);
        console.log('Comments refreshed:', commentsData.length, 'items');

        // Show success toast
        success('Comments refreshed successfully', 'All comments and feedback have been updated');
      }
    } catch (error) {
      console.error('Error refreshing comments:', error);
    } finally {
      // Hide refresh modal after a delay
      setTimeout(() => {
        setShowRefreshSuccess(false);
      }, 2000);
    }
  };

  // Refresh function for Performance Reviews (submissions) only
  const handleRefreshSubmissions = async () => {
    // Show refresh modal
    setRefreshMessage('Refreshing performance reviews...');
    setShowRefreshSuccess(true);

    try {
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
        console.log('Submissions refreshed:', userSubmissions.length, 'items');

        // Show success toast
        success('Performance reviews refreshed successfully', 'All performance data has been updated');
      } catch (error) {
        console.log('Submissions not available');
      }
    } catch (error) {
      console.error('Error refreshing submissions:', error);
    } finally {
      // Hide refresh modal after a delay
      setTimeout(() => {
        setShowRefreshSuccess(false);
      }, 2000);
    }
  };

  // Refresh function for Quarterly Performance table
  const handleRefreshQuarterly = async () => {
    // Show refresh modal
    setRefreshMessage('Refreshing quarterly performance...');
    setShowRefreshSuccess(true);

    try {
      if (profile?.email) {
        // Reload evaluation results which are used for quarterly performance
        const results = getEmployeeResults(profile.email);
        setEvaluationResults(results);
        console.log('Quarterly performance refreshed:', results.length, 'items');

        // Show success toast
        success('Quarterly performance refreshed successfully', 'All quarterly data has been updated');
      }
    } catch (error) {
      console.error('Error refreshing quarterly performance:', error);
    } finally {
      // Hide refresh modal after a delay
      setTimeout(() => {
        setShowRefreshSuccess(false);
      }, 2000);
    }
  };

  // Refresh function for Evaluation History table
  const handleRefreshHistory = async () => {
    // Show refresh modal
    setRefreshMessage('Refreshing evaluation history...');
    setShowRefreshSuccess(true);

    try {
      if (profile?.email) {
        // Reload evaluation results which are used for evaluation history
        const results = getEmployeeResults(profile.email);
        setEvaluationResults(results);
        console.log('Evaluation history refreshed:', results.length, 'items');

        // Show success toast
        success('Evaluation history refreshed successfully', 'All evaluation records have been updated');
      }
    } catch (error) {
      console.error('Error refreshing evaluation history:', error);
    } finally {
      // Hide refresh modal after a delay
      setTimeout(() => {
        setShowRefreshSuccess(false);
      }, 2000);
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
    
    // Debug logging
    console.log('🔍 Debug - handleApproveEvaluation:', {
      submissionOrId,
      submissionOrIdType: typeof submissionOrId,
      selectedEvaluation,
      submission,
      submissionId: submission?.id,
      submissionKeys: submission ? Object.keys(submission) : 'no submission',
      submissionsLength: submissions.length,
      foundInSubmissions: submissions.find(sub => sub.id.toString() === submissionOrId)
    });
    
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

  const confirmApproval = async () => {
    if (!evaluationToApprove || !profile?.email) return;

    // Debug logging
    console.log('🔍 Debug - confirmApproval:', {
      evaluationToApprove,
      evaluationId: evaluationToApprove.id,
      evaluationIdType: typeof evaluationToApprove.id,
      profileEmail: profile.email
    });

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
      
      // Debug logging
      console.log('🔍 Debug - Approval Data:', {
        evaluationId: evaluationToApprove.id,
        hasSignature: employeeSignature ? 'YES' : 'NO',
        signatureLength: employeeSignature?.length || 0,
        signaturePreview: employeeSignature?.substring(0, 50) + '...',
        employeeName: approvalData.employeeName,
        employeeEmail: approvalData.employeeEmail
      });
      

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
      
      // Debug logging for localStorage save
      console.log('🔍 Debug - Saving to localStorage:', {
        key: `approvalData_${profile.email}`,
        submissionId: submissionId,
        approvalData: approvalData,
        existingApprovals: existingApprovals
      });

      // Also save the approved IDs list
      localStorage.setItem(`approvedEvaluations_${profile.email}`, JSON.stringify([...newApproved]));

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
    
    // Debug logging
    console.log('🔍 Debug - getApprovalData:', {
      submissionId,
      key,
      profileEmail: profile.email,
      approvalData,
      foundData: data,
      hasSignature: data?.employeeSignature ? 'YES' : 'NO',
      signatureLength: data?.employeeSignature?.length || 0
    });
    
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
    setTimeout(() => {
      setIsLogoutDialogOpen(false);
      setShowLogoutSuccess(false);
      // Use the UserContext logout which includes loading screen
      logout();
    }, 1500);
  };

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
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-bold text-gray-900">4.2</span>
            <span className="text-sm text-gray-500">/ 5.0</span>
          </div>
          <Badge className="mt-2 text-green-600 bg-green-100">Good</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Reviews Received</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">3</div>
          <p className="text-sm text-gray-500 mt-1">This quarter</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Evaluation Score</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Performance Rating</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>


    </>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {/* Performance Reviews */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Recent Performance Reviews</CardTitle>
                    <CardDescription>Your latest performance evaluations</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshSubmissions}
                    disabled={showRefreshModal}
                    className="flex items-center space-x-2 bg-blue-500 text-white hover:bg-green-700 hover:text-white"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {submissions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Immediate Supervisor</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Rating</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Quarter</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.slice(0, 5).map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-medium">{submission.evaluationData?.supervisor || 'Not specified'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{submission.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating}/5
                          </TableCell>
                          <TableCell>{new Date(submission.submittedAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className={getQuarterColor(getQuarterFromDate(submission.submittedAt))}>
                              {getQuarterFromDate(submission.submittedAt)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right bg-">
                            <Button
                              className='bg-blue-500 text-white hover:bg-green-700 hover:text-white'
                              size="sm"
                              onClick={() => {
                                // Get approval data for this submission
                                const approvalData = getApprovalData(submission.id);
                                
                                // Include approval data in the submission object
                                const submissionWithApproval = {
                                  ...submission,
                                  employeeSignature: approvalData?.employeeSignature || null,
                                  employeeApprovedAt: approvalData?.approvedAt || null
                                };
                                
                                setSelectedEvaluation(submissionWithApproval);
                                setModalOpenedFromTab('overview');
                                setIsViewResultsModalOpen(true);
                                // Show success animation
                                setShowViewSuccess(true);
                                setTimeout(() => setShowViewSuccess(false), 2000);
                              }}
                              
                            >
                              <Eye className="w-4 h-4" />
                              View 
                            </Button>
                            
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-lg mb-2">No performance reviews yet</div>
                    <div className="text-gray-400 text-sm">Your evaluations will appear here once they are completed by your manager.</div>
                  </div>
                )}
              </CardContent>
            </Card>            
          </>
        );

      case 'reviews':
        return (
          <div className="h-[calc(100vh-200px)] overflow-y-auto">
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
                      <CardDescription>Your rating progression over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        // Prepare chart data from submissions
                        const chartData = submissions
                          .filter(s => (s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating) > 0)
                          .map((submission, index) => ({
                            review: `Review ${submissions.length - index}`,
                            rating: submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating,
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
                            <span className="font-medium">{submissions.filter(s => (s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating) > 0).length}</span> evaluation{submissions.filter(s => (s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating) > 0).length !== 1 ? 's' : ''} tracked
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
                      <CardDescription>Your overall performance insights</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(() => {
                        const ratings = submissions.map(s =>
                          s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating
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
                              <Badge variant="outline">{submissions.length}</Badge>
                            </div>

                            <div className="pt-2 border-t">
                              <div className="text-sm font-medium mb-2">Performance Level</div>
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
              )}

              {/* Performance Insights */}
              {submissions.length > 0 && (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      💡 Performance Insights
                    </CardTitle>
                    <CardDescription>Actionable insights based on your performance history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(() => {
                        const ratings = submissions.map(s =>
                          s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating
                        ).filter(r => r > 0);
                        const averageRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) : 0;
                        const latestRating = ratings.length > 0 ? ratings[0] : 0;
                        const trend = ratings.length > 1 ? (latestRating - ratings[1]) : 0;

                        const insights = [];

                        if (averageRating >= 4.5) {
                          insights.push({
                            type: 'excellent',
                            icon: '🏆',
                            title: 'Outstanding Performance',
                            message: 'You\'re performing exceptionally well! Consider mentoring others or taking on leadership opportunities.'
                          });
                        } else if (averageRating >= 4.0) {
                          insights.push({
                            type: 'good',
                            icon: '⭐',
                            title: 'Strong Performance',
                            message: 'You\'re exceeding expectations. Focus on maintaining this level and identifying areas for continued growth.'
                          });
                        } else if (averageRating >= 3.5) {
                          insights.push({
                            type: 'average',
                            icon: '📈',
                            title: 'Solid Performance',
                            message: 'You\'re meeting expectations. Consider setting specific goals to push beyond your current level.'
                          });
                        } else {
                          insights.push({
                            type: 'improvement',
                            icon: '🎯',
                            title: 'Growth Opportunity',
                            message: 'There\'s room for improvement. Focus on one key area at a time and seek feedback regularly.'
                          });
                        }

                        if (trend > 0.2) {
                          insights.push({
                            type: 'improving',
                            icon: '🚀',
                            title: 'Improving Trend',
                            message: 'Great job! Your performance is trending upward. Keep up the momentum!'
                          });
                        } else if (trend < -0.2) {
                          insights.push({
                            type: 'declining',
                            icon: '⚠️',
                            title: 'Performance Dip',
                            message: 'Your recent performance has declined. Consider discussing challenges with your manager.'
                          });
                        }

                        if (submissions.length >= 3) {
                          insights.push({
                            type: 'consistency',
                            icon: '📊',
                            title: 'Consistent Reviews',
                            message: 'You have a solid review history. This shows reliability and commitment to performance.'
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
              )}

              {/* All Performance Reviews Table */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>All Performance Reviews</CardTitle>
                  <CardDescription>Complete history of your performance evaluations</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {submissions.length > 0 ? (
                    <div className="max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10 border-b">
                          <TableRow>
                            <TableHead className="px-6 py-4">Date</TableHead>
                            <TableHead className="px-6 py-4">Immediate Supervisor</TableHead>
                            <TableHead className="px-6 py-4">Category</TableHead>
                            <TableHead className="px-6 py-4 text-right">Score</TableHead>
                            <TableHead className="px-6 py-4">Quarter</TableHead>
                            <TableHead className="px-6 py-4 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {submissions.map((submission) => (
                            <TableRow key={submission.id} className="hover:bg-gray-50">
                              <TableCell className="px-6 py-4">
                                {new Date(submission.submittedAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="px-6 py-4 font-medium">
                                {submission.evaluationData?.supervisor || 'Not specified'}
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <Badge variant="outline">{submission.category}</Badge>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right font-semibold">
                                {submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating}/5
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <Badge className={getQuarterColor(getQuarterFromDate(submission.submittedAt))}>
                                  {getQuarterFromDate(submission.submittedAt)}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Get approval data for this submission
                                    const approvalData = getApprovalData(submission.id);
                                    
                                    // Include approval data in the submission object
                                    const submissionWithApproval = {
                                      ...submission,
                                      employeeSignature: approvalData?.employeeSignature || null,
                                      employeeApprovedAt: approvalData?.approvedAt || null
                                    };
                                    
                                    setSelectedEvaluation(submissionWithApproval);
                                    setModalOpenedFromTab('reviews');
                                    setIsViewResultsModalOpen(true);
                                    // Show success animation
                                    setShowViewSuccess(true);
                                    setTimeout(() => setShowViewSuccess(false), 2000);
                                  }}
                                  className="text-white bg-blue-500 hover:text-white hover:bg-blue-600"
                                >
                                  <Eye className="w-4 h-4" />
                                  View 
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 px-6">
                      <div className="text-gray-500 text-lg mb-2">No performance reviews yet</div>
                      <div className="text-gray-400 text-sm">Your evaluation history will appear here once reviews are completed.</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'history':
        // Filter submissions based on search term only
        const filteredHistorySubmissions = submissions.filter(submission => {
          if (!historySearchTerm) return true;

          const searchLower = historySearchTerm.toLowerCase();
          return (
            submission.employeeName?.toLowerCase().includes(searchLower) ||
            submission.evaluator?.toLowerCase().includes(searchLower) ||
            submission.evaluationData?.supervisor?.toLowerCase().includes(searchLower) ||
            submission.category?.toLowerCase().includes(searchLower) ||
            submission.rating?.toString().includes(searchLower) ||
            getQuarterFromDate(submission.submittedAt)?.toLowerCase().includes(searchLower)
          );
        });

        return (
          <Card>
            <CardHeader>
              <CardTitle>Evaluation History</CardTitle>
              <CardDescription>Complete timeline of your performance evaluations</CardDescription>
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
                          disabled={showRefreshModal}
                          className="flex items-center bg-blue-500 text-white hover:bg-green-700 hover:text-white space-x-2"
                        >
                          <svg
                            className="h-4 w-4 "
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
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
                              <svg className="h-5 w-5 text-red-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} d="M6 18L18 6M6 6l12 12" />
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

                      {/* Quarter Filter Buttons */}
                      <div className="mb-6">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-sm font-medium text-gray-700 mr-2">Filter by Quarter:</span>
                          <Button
                            variant={selectedQuarter === '' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedQuarter('')}
                            className={`text-xs ${selectedQuarter === ''
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            All Quarters
                          </Button>
                          {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => (
                            <Button
                              key={quarter}
                              variant={selectedQuarter === quarter ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSelectedQuarter(quarter)}
                              className={`text-xs font-medium transition-all duration-200 ${selectedQuarter === quarter
                                ? `${getQuarterColor(quarter)} border-2 shadow-md transform scale-105`
                                : `${getQuarterColor(quarter)} border border-gray-300 hover:shadow-sm hover:scale-102`
                                }`}
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
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Quarter</TableHead>
                              <TableHead>Total Evaluations</TableHead>
                              <TableHead>Average Rating</TableHead>
                              <TableHead>Latest Rating</TableHead>
                              <TableHead>Performance Trend</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              // Group submissions by quarter
                              const quarterlyData = submissions.reduce((acc, submission) => {
                                const quarter = getQuarterFromDate(submission.submittedAt);
                                if (!acc[quarter]) {
                                  acc[quarter] = {
                                    quarter,
                                    submissions: [],
                                    averageRating: 0,
                                    totalEvaluations: 0,
                                    latestRating: 0,
                                    trend: 0
                                  };
                                }
                                acc[quarter].submissions.push(submission);
                                return acc;
                              }, {} as any);

                              // Calculate statistics for each quarter
                              Object.keys(quarterlyData).forEach(quarter => {
                                const data = quarterlyData[quarter];
                                const ratings = data.submissions.map((s: any) =>
                                  s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating
                                ).filter((r: any) => r > 0);
                                data.totalEvaluations = ratings.length;
                                data.averageRating = ratings.length > 0 ? (ratings.reduce((a: any, b: any) => a + b, 0) / ratings.length).toFixed(1) : 0;
                                data.latestRating = ratings.length > 0 ? ratings[ratings.length - 1] : 0;
                                data.trend = ratings.length > 1 ? (ratings[ratings.length - 1] - ratings[0]) : 0;
                              });

                              // Sort quarters chronologically
                              const sortedQuarters = Object.values(quarterlyData).sort((a: any, b: any) => {
                                const quarterOrder: { [key: string]: number } = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 };
                                const aQuarter = a.quarter.split(' ')[0]; // Extract just Q1, Q2, etc.
                                const bQuarter = b.quarter.split(' ')[0];
                                return (quarterOrder[aQuarter] || 0) - (quarterOrder[bQuarter] || 0);
                              });

                              // Filter quarters based on selected quarter
                              const filteredQuarters = selectedQuarter
                                ? sortedQuarters.filter((q: any) => q.quarter.startsWith(selectedQuarter))
                                : sortedQuarters;

                              return filteredQuarters.length > 0 ? filteredQuarters.map((quarterData: any) => (
                                <TableRow key={quarterData.quarter}>
                                  <TableCell>
                                    <Badge className={getQuarterColor(quarterData.quarter)}>
                                      {quarterData.quarter}
                                    </Badge>
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
                                    {quarterData.trend !== 0 ? (
                                      <div className="flex items-center space-x-1">
                                        <span className={`text-sm font-medium ${quarterData.trend > 0 ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                          {quarterData.trend > 0 ? '↗' : '↘'}
                                        </span>
                                        <span className="text-sm">
                                          {Math.abs(quarterData.trend).toFixed(1)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-sm">No change</span>
                                    )}
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
                                        // Filter submissions for this quarter and show the first one
                                        const quarterSubmissions = submissions.filter(submission =>
                                          getQuarterFromDate(submission.submittedAt) === quarterData.quarter
                                        );
                                        if (quarterSubmissions.length > 0) {
                                          // Get approval data for this submission
                                          const approvalData = getApprovalData(quarterSubmissions[0].id);
                                          
                                          // Include approval data in the submission object
                                          const submissionWithApproval = {
                                            ...quarterSubmissions[0],
                                            employeeSignature: approvalData?.employeeSignature || null,
                                            employeeApprovedAt: approvalData?.approvedAt || null
                                          };
                                          
                                          setSelectedEvaluation(submissionWithApproval);
                                          setModalOpenedFromTab('quarterly');
                                          setIsViewResultsModalOpen(true);
                                          // Show success animation
                                          setShowViewSuccess(true);
                                          setTimeout(() => setShowViewSuccess(false), 2000);
                                        }
                                      }}
                                      className="bg-blue-500 text-white hover:bg-green-700 hover:text-white"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View 
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              )) : (
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
                          <CardDescription>Complete timeline of your performance evaluations</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshHistory}
                          disabled={showRefreshModal}
                          className="flex items-center bg-blue-500 text-white hover:bg-green-700 hover:text-white space-x-2"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
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
                            placeholder="Search by employee, evaluator, supervisor, category, rating, or quarter..."
                            value={historySearchTerm}
                            onChange={(e) => setHistorySearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                          {historySearchTerm && (
                            <button
                              onClick={() => setHistorySearchTerm('')}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              <svg className="h-5 w-5 text-red-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {historySearchTerm && (
                          <div className="mt-2 text-sm text-gray-600">
                            Showing {filteredHistorySubmissions.length} of {submissions.length} evaluations
                          </div>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Employee</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-right">Rating</TableHead>
                              <TableHead>Quarter</TableHead>
                              <TableHead>Immediate Supervisor</TableHead>
                              <TableHead>Acknowledgement</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredHistorySubmissions.length > 0 ? filteredHistorySubmissions.map((submission) => (
                              <TableRow key={submission.id}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {new Date(submission.submittedAt).toLocaleDateString()}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(submission.submittedAt).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">{submission.employeeName}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{submission.category}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end space-x-1">
                                    <span className="font-semibold">
                                      {submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating}
                                    </span>
                                    <span className="text-gray-500">/5</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getQuarterColor(getQuarterFromDate(submission.submittedAt))}>
                                    {getQuarterFromDate(submission.submittedAt)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {submission.evaluationData?.supervisor || 'Not specified'}
                                </TableCell>
                                <TableCell>
                                  {isEvaluationApproved(submission.id) ? (
                                    <div className="flex items-center space-x-3">
                                      <Badge className="bg-green-100 text-green-800">
                                        ✓ Approved
                                      </Badge>
                  {(() => {
                    const approvalData = getApprovalData(submission.id);
                    return approvalData?.employeeSignature ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Signature:</span>
                        <div className="text-center">
                          {/* Signature area */}
                          <div className="h-6 border-b border-gray-300 flex items-center justify-center">
                            <img 
                              src={approvalData.employeeSignature} 
                              alt="Employee Signature" 
                              className="h-4 max-w-full object-contain"
                            />
                          </div>
                          {/* Printed Name */}
                          <p className="text-xs font-medium text-gray-900 mt-1">
                            {approvalData.employeeName || 'Employee'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">
                        {approvalData ? 'No signature' : 'No approval data'}
                      </div>
                    );
                  })()}
                                    </div>
                                  ) : (
                                    <Badge  className="text-white bg-orange-500 border-orange-300">
                                      Pending
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        // Get approval data for this submission
                                        const approvalData = getApprovalData(submission.id);
                                        
                                        // Include approval data in the submission object
                                        const submissionWithApproval = {
                                          ...submission,
                                          employeeSignature: approvalData?.employeeSignature || null,
                                          employeeApprovedAt: approvalData?.approvedAt || null
                                        };
                                        
                                        setSelectedEvaluation(submissionWithApproval);
                                        setModalOpenedFromTab('history');
                                        setIsViewResultsModalOpen(true);
                                        // Show success animation
                                        setShowViewSuccess(true);
                                        setTimeout(() => setShowViewSuccess(false), 2000);
                                      }}
                                      className="text-white bg-blue-500 hover:text-blue-800 border-blue-200 hover:border-blue-300"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View 
                                    </Button>
                                    <Button
                                     
                                      size="sm"
                                      onClick={() => {
                                        setEvaluationToDelete(submission);
                                        setIsDeleteEvaluationDialogOpen(true);
                                      }}
                                      className="text-white bg-red-500 hover:bg-red-600 hover:text-white border-red-200 hover:border-red-300"
                                    >
                                       <Trash className="w-4 h-4" />
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )) : (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
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
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );

      case 'account-history':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Account History & Comments</CardTitle>
              <CardDescription>Track suspension records and comments from supervisors and HR</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="account-history" className="w-full">
                <TabsList className="grid w-1/2 bg-gray-200 grid-cols-2">
                  <TabsTrigger value="account-history">Account History📋</TabsTrigger>
                  <TabsTrigger value="comments" >Comments & Feedback🗨️</TabsTrigger>
                </TabsList>

                <TabsContent value="account-history" className="mt-6">
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
                        placeholder="Search account history..."
                        value={accountHistorySearchTerm}
                        onChange={(e) => setAccountHistorySearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {accountHistorySearchTerm && (
                        <button
                          onClick={() => setAccountHistorySearchTerm('')}
                          className="absolute inset-y-0 font-medium  px-2 right-0 pr-3 flex items-center"
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
                      onClick={handleRefreshAccountHistory}
                      disabled={showRefreshModal}
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
                          <TableHead>Action By</TableHead>
                          <TableHead>Details</TableHead>
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
                            <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge className={getSeverityColor(item.severity)}>
                                {item.severity.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(item.status)}>
                                {item.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.actionBy}</TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                {item.type === 'violation' && (
                                  <>
                                    {item.details.duration && (
                                      <div>Duration: {item.details.duration}</div>
                                    )}
                                    {item.details.reinstatedDate && (
                                      <div className="text-green-600">
                                        Reinstated: {new Date(item.details.reinstatedDate).toLocaleDateString()}
                                      </div>
                                    )}
                                    {item.details.reinstatedBy && (
                                      <div>By: {item.details.reinstatedBy}</div>
                                    )}
                                  </>
                                )}
                                {item.type === 'feedback' && (
                                  <>
                                    {item.details.rating && (
                                      <div>Rating: {item.details.rating}%</div>
                                    )}
                                    {item.details.period && (
                                      <div>Period: {item.details.period}</div>
                                    )}
                                    {item.details.category && (
                                      <div>Category: {item.details.category}</div>
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
                        {accountHistorySearchTerm ? 'No matching records found' : 'No account history found'}
                      </p>
                      <p className="text-sm">
                        {accountHistorySearchTerm
                          ? 'Try adjusting your search terms'
                          : 'Your account history will appear here when violations or feedback are recorded'
                        }
                      </p>
                    </div>
                  )}

                  {/* Summary Statistics */}
                  {accountHistory.length > 0 && (
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
                </TabsContent>

                <TabsContent value="comments" className="mt-6">
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
                        placeholder="Search comments..."
                        value={commentsSearchTerm}
                        onChange={(e) => setCommentsSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {commentsSearchTerm && (
                        <button
                          onClick={() => setCommentsSearchTerm('')}
                          className="absolute inset-y-0 font-medium text-white  px-2 right-0 pr-3 flex items-center"
                        >
                          <svg className="h-5 w-5 text-red-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} d="M6 18L18 6M6 6l12 12" />
                          </svg>

                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comments Actions */}
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      {comments.length > 0
                        ? `Showing ${getFilteredComments().length} of ${comments.length} comments`
                        : 'No comments found'
                      }
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshComments}
                        disabled={showRefreshModal}
                        className="flex items-center space-x-2 bg-blue-500 text-white hover:bg-green-700 hover:text-white"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Refresh</span>
                      </Button>
                      {comments.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearAllComments}
                          className="text-red-600 hover:text-red-800 border-red-200 hover:border-red-300"
                        >
                          Clear All Comments
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Comments Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Author</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Content</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredComments().map((comment) => (
                          <TableRow key={comment.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{getCommentTypeIcon(comment.type)}</span>
                                <Badge className={getCommentTypeColor(comment.type)}>
                                  {comment.type}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{comment.author}</span>
                                <span className="text-xs text-gray-500">{comment.authorRole}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{comment.category}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate" title={comment.content}>
                                {comment.content}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm">
                                  {new Date(comment.date).toLocaleDateString()}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(comment.date).toLocaleTimeString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getPriorityColor(comment.priority)}>
                                {comment.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewComment(comment)}
                                  className="text-blue-600 hover:text-blue-800 border-blue-200 hover:border-blue-300"
                                >
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleClearComment(comment.id)}
                                  className="text-red-600 hover:text-red-800 border-red-200 hover:border-red-300"
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Empty State */}
                  {getFilteredComments().length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-4">💬</div>
                      <p className="text-lg font-medium">
                        {commentsSearchTerm ? 'No matching comments found' : 'No comments found'}
                      </p>
                      <p className="text-sm">
                        {commentsSearchTerm
                          ? 'Try adjusting your search terms'
                          : 'Comments from supervisors and HR will appear here'
                        }
                      </p>
                    </div>
                  )}

                  {/* Comments Summary Statistics */}
                  {comments.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t mt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {comments.filter(comment => comment.type === 'positive').length}
                        </div>
                        <div className="text-sm text-gray-600">Positive</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {comments.filter(comment => comment.type === 'constructive').length}
                        </div>
                        <div className="text-sm text-gray-600">Constructive</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {comments.filter(comment => comment.type === 'recognition').length}
                        </div>
                        <div className="text-sm text-gray-600">Recognition</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {comments.filter(comment => comment.priority === 'high').length}
                        </div>
                        <div className="text-sm text-gray-600">High Priority</div>
                      </div>
                    </div>
                  )}


                  {/* Refresh Success Animation */}
                  {showRefreshSuccess && (
                    <div className="fixed top-4 right-4 z-50 bg-white border border-green-200 rounded-lg shadow-lg p-4 flex items-center space-x-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                        <svg 
                          className="w-4 h-4 text-white animate-checkmark" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          style={{
                            strokeDasharray: '20',
                            strokeDashoffset: '20',
                            animation: 'drawCheckmark 0.6s ease-in-out forwards'
                          }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-green-800">Success!</p>
                        <p className="text-sm text-green-600">{refreshMessage}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      {/* Loading Screen - Shows during initial load, authentication, and auto-refresh */}
      {(loading || authLoading || !profile) && (
        <RefreshAnimationModal
          isOpen={true}
          message={
            authLoading ? "Authenticating..." :
              !profile ? "Loading user profile..." :
                "Loading Employee Dashboard..."
          }
          gifPath="/search-file.gif"
          duration={authLoading ? 800 : 1200}
        />
      )}

      {/* Refresh Modal for manual refresh operations */}
      {showRefreshModal && (
        <RefreshAnimationModal
          isOpen={true}
          message={refreshModalMessage}
          gifPath="/search-file.gif"
          duration={2000}
          onComplete={handleRefreshModalComplete}
        />
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
        showApprovalButton={modalOpenedFromTab === 'history'} // Only show approval button in Evaluation History tab
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

      {/* Comment Detail Modal */}
      <CommentDetailModal
        isOpen={isCommentModalOpen}
        onCloseAction={() => setIsCommentModalOpen(false)}
        comment={selectedComment}
      />

      {/* Clear All Comments Alert Dialog */}
      <AlertDialog
        open={isClearAllDialogOpen}
        onOpenChangeAction={setIsClearAllDialogOpen}
        title={showDeleteSuccess ? "Comments Deleted!" : "Clear All Comments"}
        description={showDeleteSuccess
          ? `Successfully deleted ${comments.length} comments from your account.`
          : `Are you sure you want to delete ALL ${comments.length} comments? This action cannot be undone and will permanently remove all feedback and comments from your account.`
        }
        type={showDeleteSuccess ? "success" : "warning"}
        confirmText={showDeleteSuccess ? "Done" : "Yes, Delete All"}
        cancelText="Cancel"
        showCancel={!showDeleteSuccess}
        isLoading={isDeletingComments}
        showSuccessAnimation={showDeleteSuccess}
        // Success animations from AnimationExamples
        loadingAnimation={{
          variant: 'spinner',
          color: 'blue',
          size: 'lg'
        }}
        onConfirm={confirmClearAllComments}
        onCancel={() => setIsClearAllDialogOpen(false)}
      />

      {/* Delete Single Comment Alert Dialog */}
      <AlertDialog
        open={isDeleteCommentDialogOpen}
        onOpenChangeAction={setIsDeleteCommentDialogOpen}
        title={showSingleDeleteSuccess ? "Comment Deleted!" : "Delete Comment"}
        description={showSingleDeleteSuccess
          ? "The comment has been successfully removed from your account."
          : "Are you sure you want to delete this comment? This action cannot be undone and will permanently remove the feedback from your account."
        }
        type={showSingleDeleteSuccess ? "success" : "error"}
        confirmText={showSingleDeleteSuccess ? "Done" : "Yes, Delete"}
        cancelText="Cancel"
        showCancel={!showSingleDeleteSuccess}
        isLoading={isDeletingSingleComment}
        showSuccessAnimation={showSingleDeleteSuccess}
        // Circle animation from AnimationExamples
        loadingAnimation={{
          variant: 'dots',
          color: 'red',
          size: 'lg'
        }}
        onConfirm={confirmDeleteComment}
        onCancel={() => {
          setIsDeleteCommentDialogOpen(false);
          setCommentToDelete(null);
        }}
      />

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

      {/* Delete Evaluation Alert Dialog */}
      <AlertDialog
        open={isDeleteEvaluationDialogOpen}
        onOpenChangeAction={setIsDeleteEvaluationDialogOpen}
        title={showDeleteEvaluationSuccess ? "Evaluation Deleted!" : "Delete Evaluation"}
        description={showDeleteEvaluationSuccess
          ? "The evaluation has been successfully removed from your history."
          : `Are you sure you want to delete this evaluation from ${evaluationToDelete?.employeeName}? This action cannot be undone and will permanently remove the evaluation from your history.`
        }
        confirmText={isDeletingEvaluation ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        showCancel={!showDeleteEvaluationSuccess}
        isLoading={isDeletingEvaluation}
        showSuccessAnimation={showDeleteEvaluationSuccess}
        onConfirm={handleDeleteEvaluation}
        onCancel={() => {
          setIsDeleteEvaluationDialogOpen(false);
          setEvaluationToDelete(null);
        }}
      />

      {/* Approval Confirmation Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChangeAction={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-md">
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
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-red-800 font-medium">No Signature Found</span>
                    </div>
                    <p className="text-xs text-red-700 mt-1">Please add a signature to your profile before approving evaluations.</p>
                  </div>
                );
              })()}
              
              <div className="space-y-2">
                <Label htmlFor="employeeName" className="text-sm font-medium">
                  Your Name (as it will appear on the signature):
                </Label>
                <Input
                  id="employeeName"
                  value={employeeApprovalName}
                  onChange={(e) => setEmployeeApprovalName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full"
                  disabled={isApproving}
                />
              </div>
              
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
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-lg font-medium text-gray-900 text-center">Evaluation Approved Successfully!</p>
              <p className="text-sm text-gray-600 text-center">
                Your signature has been recorded and the evaluation is now complete.
              </p>
              
              {/* Show approved name as read-only */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Approved By:</Label>
                <Input
                  type="text"
                  value={employeeApprovalName}
                  readOnly
                  className="w-full bg-gray-50 text-gray-900 cursor-not-allowed"
                />
              </div>
              
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

      {/* Refresh Animation Modal for Submissions */}
      <RefreshAnimationModal
        isOpen={showRefreshSuccess}
        message={refreshMessage}
        gifPath="/search-file.gif"
        duration={2000}
      />

      {/* Refresh Animation Modal */}
      <RefreshAnimationModal
        isOpen={showRefreshModal}
        message={refreshModalMessage}
        gifPath="/search-file.gif" // You can change this path to your GIF
        onComplete={handleRefreshModalComplete}
        duration={2000}
      />
    </ProtectedRoute>
  );
}
