'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import DashboardShell, { SidebarItem } from '@/components/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, ChevronDown } from "lucide-react";
import EvaluationForm from '@/components/evaluation';
import ViewResultsModal from '@/components/evaluation/ViewResultsModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SearchableDropdown from "@/components/ui/searchable-dropdown";
import mockData from '@/data/dashboard.json';
import accountsData from '@/data/accounts.json';
import departments from '@/data/departments.json';
import { UserProfile } from '@/components/ProfileCard';
import clientDataService from '@/lib/clientDataService';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageTransition from '@/components/PageTransition';
import { AlertDialog } from '@/components/ui/alert-dialog';
import RefreshAnimationModal from '@/components/RefreshAnimationModal';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/useToast';

type Feedback = {
  id: number;
  reviewer: string;
  role: string;
  rating: number;
  date: string;
  comment: string;
  category: string;
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
  overallRating?: number;

  // Approval-related properties
  approvalStatus?: string;
  employeeSignature?: string | null;
  employeeApprovedAt?: string | null;
  evaluatorSignature?: string | null;
  evaluatorApprovedAt?: string | null;
};

type PerformanceData = {
  overallRating: number;
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
  role: string;
  hireDate: string;
};

function getRatingColor(rating: number) {
  if (rating >= 4.5) return 'text-green-600 bg-green-100';
  if (rating >= 4.0) return 'text-blue-600 bg-blue-100';
  if (rating >= 3.5) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

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

export default function EvaluatorDashboard() {
  const { profile, user } = useUser();
  const { success, error } = useToast();

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
        console.log(`✅ Successfully refreshed ${uniqueData.length} evaluation records`);
      } else {
        console.warn('Invalid data structure received from API');
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

  const handleProfileSave = (updatedProfile: UserProfile) => {
    // Profile is now managed by UserContext
    // Optionally refresh data or show success message
    console.log('Profile updated:', updatedProfile);
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
        evaluatorApprovedAt: new Date().toISOString(),
        approvalStatus: 'fully_approved'
      };

      console.log('🔍 Debug - Updated submission:', {
        id: updatedSubmission.id,
        approvalStatus: updatedSubmission.approvalStatus,
        evaluatorSignature: updatedSubmission.evaluatorSignature ? 'Present' : 'Missing',
        evaluatorApprovedAt: updatedSubmission.evaluatorApprovedAt
      });

      // Update the submissions array
      setRecentSubmissions(prev => {
        const updated = prev.map(sub => sub.id === feedback.id ? updatedSubmission : sub);
        console.log('🔍 Debug - Updated recentSubmissions state:', {
          totalSubmissions: updated.length,
          updatedSubmission: updated.find(sub => sub.id === feedback.id)
        });
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

      // Debug: Check if the data was properly updated
      const refreshedSubmissions = await clientDataService.getSubmissions();
      const refreshedSubmission = refreshedSubmissions.find(sub => sub.id === feedback.id) as any;
      console.log('🔍 Debug - After refresh:', {
        id: refreshedSubmission?.id,
        approvalStatus: refreshedSubmission?.approvalStatus,
        evaluatorSignature: refreshedSubmission?.evaluatorSignature ? 'Present' : 'Missing',
        evaluatorApprovedAt: refreshedSubmission?.evaluatorApprovedAt
      });

      alert(`Evaluation for ${feedback.employeeName} has been approved successfully!`);
      
    } catch (error) {
      console.error('Error approving evaluation:', error);
      alert('Failed to approve evaluation. Please try again.');
    }
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

    // Debug logging to help identify issues
    if (validSubmissions.length !== recentSubmissions.length) {
      console.warn(`Filtered out ${recentSubmissions.length - validSubmissions.length} invalid submissions`);
    }

    let data = validSubmissions.map((submission, index) => {
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
        category: submission.category || 'Performance Review',
        rating: calculatedRating,
        date: submission.submittedAt || new Date().toISOString(),
        comment: submission.evaluationData?.overallComments || 'Performance evaluation completed',
        // Approval-related properties - extract from nested evaluationData or top level
        approvalStatus: submission.approvalStatus || submission.evaluationData?.approvalStatus || 'pending',
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
        const itemQuarter = getQuarterFromDate(item.date);
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

    // Debug: Log approval statuses
    console.log('🔍 Debug - filteredFeedbackData approval statuses:', 
      finalData.map(item => ({ id: item.id, employeeName: item.employeeName, approvalStatus: item.approvalStatus }))
    );

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
  ];

  // Loading state is now handled in the main return statement

  const topSummary = (
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
          <Badge className={`mt-2 ${getRatingColor(data?.overallRating || 0)}`}>
            {(data?.overallRating || 0) >= 4.5 ? 'Excellent' : (data?.overallRating || 0) >= 4.0 ? 'Good' : (data?.overallRating || 0) >= 3.5 ? 'Average' : 'Needs Improvement'}
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
      (submission.category || '').toLowerCase().includes(searchTerm) ||
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
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>Latest items awaiting evaluation</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 py-4 space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search submissions by employee name, category, or evaluator..."
                    value={overviewSearch}
                    onChange={(e) => setOverviewSearch(e.target.value)}
                    className=" w-1/2 bg-gray-100 "
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
                    onClick={refreshSubmissions}
                    disabled={isRefreshing}
                    className="px-3 py-2 text-white hover:text-white bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    title="Refresh submissions data"
                  >
                    {isRefreshing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>🔄 Refresh</>
                    )}
                  </Button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow key="overview-header">
                      <TableHead className="px-6 py-3">Employee</TableHead>
                      <TableHead className="px-6 py-3">Category</TableHead>
                      <TableHead className="px-6 py-3">Submitted</TableHead>
                      <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.length === 0 ? (
                      <TableRow key="no-submissions">
                        <TableCell colSpan={4} className="px-6 py-3 text-center text-gray-500">
                          {overviewSearch.trim() ? 'No submissions found matching your search' : 'No recent submissions'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubmissions.slice(0, 6).map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="px-6 py-3 font-medium text-gray-900">{submission.employeeName}</TableCell>
                          <TableCell className="px-6 py-3">
                            <Badge className="bg-blue-100 text-blue-800">{submission.category || 'Performance Review'}</Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3 text-gray-600">{new Date(submission.submittedAt).toLocaleDateString()}</TableCell>
                          <TableCell className="px-6 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEvaluationSubmission(submission);
                                setIsViewResultsModalOpen(true);
                              }}
                              className="bg-blue-500 hover:bg-blue-200 text-white border-blue-200"
                            >
                              <Eye className="w-4 h-4" />
                               View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        );
      case 'employees':
        return (
        (() => {
          const normalizedQuery = employeeSearch.trim().toLowerCase();
          const filtered: Employee[] = (accountsData as any).accounts.filter((e: any) => {
            // Only show active employees (not suspended or inactive)
            if (!e.isActive || e.isSuspended) return false;
            
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
            <Card>
              <CardHeader>
                <CardTitle>Employees</CardTitle>
                <CardDescription>Directory of employees</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-6 py-4 space-y-4">
                  <div className="flex gap-4">
                    <Input
                      placeholder="Search employees by name, email, position, department, role"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="flex-1"
                    />
                    <SearchableDropdown
                      options={['All Departments', ...departments.map(dept => dept.name)]}
                      value={selectedDepartment || 'All Departments'}
                      onValueChangeAction={(value) => setSelectedDepartment(value === 'All Departments' ? '' : value)}
                      placeholder="All Departments"
                      className="w-[200px]"
                    />
                  </div>
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                  <Table className="min-w-full">
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow key="employees-header">
                        <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                          Name <span className="ml-1 text-xs text-gray-500">{sortIcon('name')}</span>
                        </TableHead>
                        <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('email')}>
                          Email <span className="ml-1 text-xs text-gray-500">{sortIcon('email')}</span>
                        </TableHead>
                        <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('position')}>
                          Position <span className="ml-1 text-xs text-gray-500">{sortIcon('position')}</span>
                        </TableHead>
                        <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('department')}>
                          Department <span className="ml-1 text-xs text-gray-500">{sortIcon('department')}</span>
                        </TableHead>
                        <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('role')}>
                          Role <span className="ml-1 text-xs text-gray-500">{sortIcon('role')}</span>
                        </TableHead>
                        <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('hireDate')}>
                          Hire Date <span className="ml-1 text-xs text-gray-500">{sortIcon('hireDate')}</span>
                        </TableHead>
                        <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sorted.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="px-6 py-3 font-medium text-gray-900">{e.name}</TableCell>
                          <TableCell className="px-6 py-3 text-gray-600">{e.email}</TableCell>
                          <TableCell className="px-6 py-3">{e.position}</TableCell>
                          <TableCell className="px-6 py-3">{e.department}</TableCell>
                          <TableCell className="px-6 py-3">{e.role}</TableCell>
                          <TableCell className="px-6 py-3 text-gray-600">{new Date(e.hireDate).toLocaleDateString()}</TableCell>
                          <TableCell className="px-6 py-3 text-right">
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
              <CardTitle>All Feedback/Evaluation Records</CardTitle>
              <CardDescription>Complete feedback history and evaluation records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="flex-1">
                  <Label htmlFor="feedback-search" className="text-sm font-medium">Search</Label>
                  <div className="mt-1 relative">
                    <Input
                      id="feedback-search"
                      placeholder="Search by employee name, reviewer, or comments..."
                      className={`${(feedbackSearch || feedbackDepartmentFilter || feedbackDateFilter || feedbackDateRange.from || feedbackDateRange.to || feedbackQuarterFilter || feedbackApprovalStatusFilter) ? 'pr-20' : 'pr-3'}`}
                      value={feedbackSearch}
                      onChange={(e) => setFeedbackSearch(e.target.value)}
                    />
                    {(feedbackSearch || feedbackDepartmentFilter || feedbackDateFilter || feedbackDateRange.from || feedbackDateRange.to || feedbackQuarterFilter || feedbackApprovalStatusFilter) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFeedbackSearch('');
                          setFeedbackDepartmentFilter('');
                          setFeedbackDateFilter('');
                          setFeedbackDateRange({ from: '', to: '' });
                          setFeedbackQuarterFilter('');
                          setFeedbackApprovalStatusFilter('');
                        }}
                        className="absolute right-1 top-1 h-8 px-2 text-xs bg-blue-500 hover:bg-blue-600 text-center text-white border-blue-200"
                        title="Clear all filters"
                      >
                        Clear All
                      </Button>
                    )}
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
                      '👤 Employee Approved', 
                      '👨‍💼 Evaluator Approved',
                      '✓ Fully Approved',
                      '❌ Rejected'
                    ]}
                    value={
                      feedbackApprovalStatusFilter === 'pending' ? '⏳ Pending' :
                      feedbackApprovalStatusFilter === 'employee_approved' ? '👤 Employee Approved' :
                      feedbackApprovalStatusFilter === 'evaluator_approved' ? '👨‍💼 Evaluator Approved' :
                      feedbackApprovalStatusFilter === 'fully_approved' ? '✓ Fully Approved' :
                      feedbackApprovalStatusFilter === 'rejected' ? '❌ Rejected' :
                      'All Statuses'
                    }
                    onValueChangeAction={(value) => {
                      const statusMap: Record<string, string> = {
                        '⏳ Pending': 'pending',
                        '👤 Employee Approved': 'employee_approved',
                        '👨‍💼 Evaluator Approved': 'evaluator_approved',
                        '✓ Fully Approved': 'fully_approved',
                        '❌ Rejected': 'rejected'
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
                    onClick={refreshSubmissions}
                    disabled={isRefreshing}
                    className="mt-1 w-full text-xs bg-blue-500 hover:bg-blue-600 text-center text-white border-blue-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    title="Refresh evaluation records data"
                  >
                    {isRefreshing ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>🔄 Refresh</>
                    )}
                  </Button>
                </div>


              </div>
            </CardContent>
          </Card>

          {/* Feedback Table */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[60vh] overflow-y-auto overflow-x-auto scrollable-table">
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
                      <TableHead className="px-6 py-3">Category</TableHead>
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
                    {filteredFeedbackData.map((feedback) => (
                        <TableRow key={feedback.uniqueKey} className="hover:bg-gray-50">
                        <TableCell className="px-6 py-3">
                          <div>
                            <div className="font-medium text-gray-900">{feedback.employeeName}</div>
                            <div className="text-sm text-gray-500">{feedback.employeeEmail}</div>
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
                            <div className="font-medium text-gray-900">{feedback.reviewer}</div>
                            <div className="text-sm text-gray-500">{feedback.reviewerRole}</div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Badge className={`text-xs ${feedback.category === 'Performance Review' ? 'bg-blue-100 text-blue-800' :
                              feedback.category === 'Probationary Review' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {feedback.category}
                          </Badge>
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
                            feedback.approvalStatus === 'employee_approved' ? 'bg-blue-100 text-blue-800' :
                            feedback.approvalStatus === 'evaluator_approved' ? 'bg-purple-100 text-purple-800' :
                            feedback.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {feedback.approvalStatus === 'fully_approved' ? '✓ Fully Approved' :
                             feedback.approvalStatus === 'employee_approved' ? '👤 Employee Approved' :
                             feedback.approvalStatus === 'evaluator_approved' ? '👨‍💼 Evaluator Approved' :
                             feedback.approvalStatus === 'rejected' ? '❌ Rejected' :
                             '⏳ Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          {/* Employee Signature Status */}
                          <div className="flex items-center space-x-2">
                            {feedback.employeeSignature ? (
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
                              onClick={() => viewEvaluationForm(feedback)}
                              className="text-xs px-2 py-1 bg-green-50 hover:bg-green-300 text-green-700 border-green-200"
                            >
                              📋 View Form
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => printFeedback(feedback)}
                              className="text-xs px-2 py-1"
                            >
                              🖨️ Print
                            </Button>

                            {/* Evaluator Approval Button */}
                            {feedback.approvalStatus === 'employee_approved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEvaluatorApproval(feedback)}
                                className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-300 text-blue-700 border-blue-200"
                              >
                                ✅ Approve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* No Data Message */}
              {filteredFeedbackData.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg">No evaluation data found</div>
                  <div className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</div>
                </div>
              )}
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
      {/* Refresh Animation Modal - Outside PageTransition to avoid opacity conflicts */}
      {(loading || !data) && (
        <RefreshAnimationModal
          isOpen={true}
          message="Loading Dashboard..."
          gifPath="/search-file.gif"
          duration={1200}
        />
      )}

      {/* Auto-refresh Modal */}
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
          title="Evaluator Dashboard"
          currentPeriod="Q4 2024"
          sidebarItems={sidebarItems}
          activeItemId={active}
          onChangeActive={setActive}
          topSummary={topSummary}
          onSaveProfile={handleProfileSave}
        >
          {renderContent()}
        </DashboardShell>
        
        {/* Evaluation Modal */}
        <Dialog open={isEvaluationModalOpen} onOpenChangeAction={setIsEvaluationModalOpen}>
          <DialogContent className="max-w-7xl max-h-[101vh] overflow-hidden p-2">
            {selectedEmployee && (
              <EvaluationForm 
                employee={selectedEmployee}
                currentUser={getCurrentUserData()}
                onCloseAction={() => {
                  setIsEvaluationModalOpen(false);
                  setSelectedEmployee(null);
                }}
                onCancelAction={() => setIsCancelAlertOpen(true)}
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* View Results Modal */}
        <ViewResultsModal
          isOpen={isViewResultsModalOpen}
          onCloseAction={() => setIsViewResultsModalOpen(false)}
          submission={selectedEvaluationSubmission}
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
      </PageTransition>
    </ProtectedRoute>
  );
}


