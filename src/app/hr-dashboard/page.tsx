'use client';

import { useState, useEffect, lazy, Suspense, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardShell, { SidebarItem } from '@/components/DashboardShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChevronDown, Eye, FileText, Pencil, Trash2, Plus, X, RefreshCw } from "lucide-react";
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
import ViewEmployeeModal from '@/components/ViewEmployeeModal';
import { useDialogAnimation } from '@/hooks/useDialogAnimation';
import SearchableDropdown from "@/components/ui/searchable-dropdown";
import { getQuarterFromDate, getQuarterFromEvaluationData } from '@/lib/quarterUtils';
import departmentsData from '@/data/departments.json';
import accountsData from '@/data/accounts.json';

// Lazy load admin tab components (shared with admin dashboard)
const BranchHeadsTab = lazy(() => import('../admin/branchHeads/page'));
const AreaManagersTab = lazy(() => import('../admin/areaManagers/page'));
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

// ========================================
// Helper Functions
// ========================================

// Helper to safely extract name from object or string
const getEmployeeNameForSearch = (employee: any): string => {
  if (!employee) return '';
  if (typeof employee === 'string') return employee;
  if (employee.name) return employee.name;
  if (employee.full_name) return employee.full_name;
  if (employee.fname && employee.lname) return `${employee.fname} ${employee.lname}`;
  if (employee.fname) return employee.fname;
  return '';
};

// ========================================
// Inline Tab Components
// ========================================

// OverviewTab Component
function OverviewTab({
  recentSubmissions,
  submissionsLoading,
  onRefresh,
  onViewSubmission,
  isActive = false
}: {
  recentSubmissions: any[];
  submissionsLoading: boolean;
  onRefresh: () => Promise<void>;
  onViewSubmission: (submission: any) => void;
  isActive?: boolean;
}) {
  const [overviewSearchTerm, setOverviewSearchTerm] = useState('');
  const [overviewPage, setOverviewPage] = useState(1);
  const [isPageChanging, setIsPageChanging] = useState(false);
  const itemsPerPage = 8;

  // Helper function to calculate overall rating
  const calculateOverallRating = (evaluationData: any) => {
    if (!evaluationData) return 0;

    const calculateScore = (scores: (string | number | null | undefined)[]) => {
      const validScores = scores
        .filter(score => score !== null && score !== undefined && score !== '')
        .map(score => typeof score === 'string' ? parseFloat(score) : score)
        .filter(score => !isNaN(score as number)) as number[];
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

    const overallWeightedScore =
      jobKnowledgeScore * 0.2 +
      qualityOfWorkScore * 0.2 +
      adaptabilityScore * 0.1 +
      teamworkScore * 0.1 +
      reliabilityScore * 0.05 +
      ethicalScore * 0.05 +
      customerServiceScore * 0.3;

    return Math.round(overallWeightedScore * 10) / 10;
  };

  // Helper function to get rating color
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-100 text-green-800';
    if (rating >= 4.0) return 'bg-blue-100 text-blue-800';
    if (rating >= 3.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Filter submissions for overview table
  const filteredSubmissions = useMemo(() => {
    return recentSubmissions
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
  }, [recentSubmissions, overviewSearchTerm]);

  // Pagination calculations
  const overviewTotal = filteredSubmissions.length;
  const overviewTotalPages = Math.ceil(overviewTotal / itemsPerPage);
  const overviewStartIndex = (overviewPage - 1) * itemsPerPage;
  const overviewEndIndex = overviewStartIndex + itemsPerPage;
  const overviewPaginated = filteredSubmissions.slice(overviewStartIndex, overviewEndIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setOverviewPage(1);
  }, [overviewSearchTerm]);

  const handleRefresh = async () => {
    await onRefresh();
  };

  return (
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
              onClick={handleRefresh}
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
          <div className="mt-3 md:mt-4 p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
              <span className="font-medium text-gray-700 mr-2">Indicators:</span>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-yellow-100 border-l-2 border-l-yellow-500 rounded"></div>
                <Badge className="bg-yellow-200 text-yellow-800 text-xs md:text-sm px-1.5 md:px-2 py-0.5">New</Badge>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-blue-50 border-l-2 border-l-blue-500 rounded"></div>
                <Badge className="bg-blue-300 text-blue-800 text-xs md:text-sm px-1.5 md:px-2 py-0.5">Recent</Badge>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
                <Badge className="bg-green-500 text-white text-xs md:text-sm px-1.5 md:px-2 py-0.5">Approved</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative max-h-[50vh] lg:max-h-[60vh] xl:max-h-[65vh] 2xl:max-h-[70vh] overflow-y-auto overflow-x-auto w-full">
            {submissionsLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-6 md:px-8 py-4 md:py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 md:h-16 w-12 md:w-16 border-4 border-blue-500 border-t-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-8 md:h-10 w-8 md:w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-gray-600 font-medium">Loading evaluation records...</p>
                </div>
              </div>
            )}
            
            <Table className="min-w-full w-full">
              <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                <TableRow>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[140px] md:min-w-[160px] lg:min-w-[180px] xl:min-w-[200px]">
                    <span className="text-xs md:text-sm lg:text-base">Employee Name</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 text-left pl-0 min-w-[100px] md:min-w-[120px] lg:min-w-[140px]">
                    <span className="text-xs md:text-sm lg:text-base">Rating</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[80px] md:min-w-[90px] lg:min-w-[100px]">
                    <span className="text-xs md:text-sm lg:text-base">Quarter</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[90px] md:min-w-[100px] lg:min-w-[110px]">
                    <span className="text-xs md:text-sm lg:text-base">Date</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[110px] md:min-w-[130px] lg:min-w-[150px]">
                    <span className="text-xs md:text-sm lg:text-base">Approval Status</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[120px] md:min-w-[140px] lg:min-w-[160px]">
                    <span className="text-xs md:text-sm lg:text-base">Actions</span>
                  </TableHead>
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
                      <TableCell className="px-6 py-3 text-left pl-0">
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
                        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : isPageChanging ? (
                  // Skeleton loading rows for page changes
                  Array.from({ length: itemsPerPage }).map((_, index) => (
                    <TableRow key={`skeleton-page-${index}`}>
                      <TableCell className="px-6 py-3">
                        <div className="space-y-1">
                          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-2.5 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3 text-left pl-0">
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
                        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : overviewPaginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <img
                          src="/not-found.gif"
                          alt="No data"
                          className="w-25 h-25 object-contain"
                          style={{
                            imageRendering: 'auto',
                            willChange: 'auto',
                            transform: 'translateZ(0)',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                          }}
                        />
                        <div className="text-gray-500">
                          {overviewSearchTerm ? (
                            <>
                              <p className="text-base font-medium mb-1">
                                No results found for "{overviewSearchTerm}"
                              </p>
                              <p className="text-sm text-gray-400">
                                Try adjusting your search term
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-base font-medium mb-1">
                                No evaluation records to display
                              </p>
                              <p className="text-sm text-gray-400">
                                Records will appear here when evaluations are submitted
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  overviewPaginated.map((submission) => {
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
                        <TableCell className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-xs md:text-sm lg:text-base">
                                {getEmployeeNameForSearch(submission.employeeName || submission.employee || submission.evaluationData?.employeeName)}
                              </span>
                              {isNew && (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs px-1.5 md:px-2 py-0.5 font-semibold">
                                  ⚡ NEW
                                </Badge>
                              )}
                              {!isNew && isRecent && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs px-1.5 md:px-2 py-0.5 font-semibold">
                                  🕐 RECENT
                                </Badge>
                              )}
                              {isApproved && (
                                <Badge className="bg-green-100 text-green-800 text-xs px-1.5 md:px-2 py-0.5 font-semibold">
                                  ✓ APPROVED
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs md:text-sm text-gray-500">{submission.evaluationData?.email || ''}</div>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 text-left pl-0">
                          {(() => {
                            const rating = submission.evaluationData
                              ? calculateOverallRating(submission.evaluationData)
                              : submission.rating || 0;
                            return (
                              <Badge className={`text-xs md:text-sm font-semibold ${getRatingColor(rating)}`}>
                                {rating > 0 ? `${rating}/5` : 'N/A'}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3">
                          <Badge className={`${getQuarterColor(quarter)} text-xs md:text-sm`}>
                            {quarter}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 text-xs md:text-sm text-gray-600">
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3">
                          <Badge className={`text-xs md:text-sm ${
                            approvalStatus === 'fully_approved' ? 'bg-green-100 text-green-800' :
                            approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {approvalStatus === 'fully_approved' ? '✓ Fully Approved' :
                             approvalStatus === 'rejected' ? '❌ Rejected' :
                             '⏳ Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewSubmission(submission)}
                            className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 bg-green-600 hover:bg-green-300 text-white"
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

          {/* Pagination Controls - Centered */}
          {!isPageChanging && overviewTotal > itemsPerPage && (
            <div className="w-full flex flex-col items-center justify-center py-4">
              <div className="text-xs md:text-sm text-gray-600 mb-3">
                Showing {overviewStartIndex + 1} to {Math.min(overviewEndIndex, overviewTotal)} of {overviewTotal} records
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsPageChanging(true);
                    setOverviewPage(prev => Math.max(1, prev - 1));
                    setTimeout(() => {
                      setIsPageChanging(false);
                    }, 300);
                  }}
                  disabled={overviewPage === 1 || isPageChanging}
                  className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-0.5 md:gap-1">
                  {Array.from({ length: overviewTotalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === overviewTotalPages ||
                      (page >= overviewPage - 1 && page <= overviewPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={overviewPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setIsPageChanging(true);
                            setOverviewPage(page);
                            setTimeout(() => {
                              setIsPageChanging(false);
                            }, 300);
                          }}
                          disabled={isPageChanging}
                          className={`text-xs md:text-sm w-7 h-7 md:w-8 md:h-8 p-0 ${
                            overviewPage === page
                              ? "bg-blue-700 text-white hover:bg-blue-500 hover:text-white"
                              : "bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === overviewPage - 2 || page === overviewPage + 2) {
                      return <span key={page} className="text-gray-400 text-xs md:text-sm">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsPageChanging(true);
                    setOverviewPage(prev => Math.min(overviewTotalPages, prev + 1));
                    setTimeout(() => {
                      setIsPageChanging(false);
                    }, 300);
                  }}
                  disabled={overviewPage === overviewTotalPages || isPageChanging}
                  className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// All tab components are now inline below

// EvaluationRecordsTab Component (inline)
function EvaluationRecordsTab({
  recentSubmissions,
  departments,
  onRefresh,
  onViewSubmission,
  onDeleteClick,
  isActive = false
}: {
  recentSubmissions: any[];
  departments: any[];
  onRefresh: () => Promise<void>;
  onViewSubmission: (submission: any) => void;
  onDeleteClick: (submission: any) => void;
  isActive?: boolean;
}) {
  const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
  
  // Helper to safely extract name from object or string (local to this component)
  const getEmployeeNameForSearch = (employee: any): string => {
    if (!employee) return '';
    if (typeof employee === 'string') return employee;
    if (employee.name) return employee.name;
    if (employee.full_name) return employee.full_name;
    if (employee.fname && employee.lname) return `${employee.fname} ${employee.lname}`;
    if (employee.fname) return employee.fname;
    return '';
  };
  const [recordsApprovalFilter, setRecordsApprovalFilter] = useState('');
  const [recordsQuarterFilter, setRecordsQuarterFilter] = useState('');
  const [recordsYearFilter, setRecordsYearFilter] = useState<string>('all');
  const [recordsRefreshing, setRecordsRefreshing] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [recordsSort, setRecordsSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({ field: 'date', direction: 'desc' });
  const [recordsPage, setRecordsPage] = useState(1);
  const itemsPerPage = 8;

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    recentSubmissions.forEach((submission) => {
      if (submission.submittedAt) {
        const year = new Date(submission.submittedAt).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [recentSubmissions]);
  
  useEffect(() => {
    const refreshOnMount = async () => {
      setRecordsRefreshing(true);
      try {
        await Promise.all([
          onRefresh(),
          new Promise(resolve => setTimeout(resolve, 500))
        ]);
      } catch (error) {
        console.error('Error refreshing on tab click:', error);
      } finally {
        setRecordsRefreshing(false);
      }
    };
    refreshOnMount();
  }, []);

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
    if (score >= 4.0) return 'Exceeds Expectations';
    if (score >= 3.5) return 'Meets Expectations';
    if (score >= 2.5) return 'Needs Improvement';
    return 'Unsatisfactory';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-100';
    if (rating >= 4.0) return 'text-blue-600 bg-blue-100';
    if (rating >= 3.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const calculateOverallRating = (submission: any): number => {
    if (submission.rating) {
      return typeof submission.rating === 'string' ? parseFloat(submission.rating) : submission.rating;
    }

    if (submission.evaluationData) {
      const evalData = submission.evaluationData;
      const jobKnowledgeScore = calculateScore([evalData.jobKnowledgeScore1, evalData.jobKnowledgeScore2, evalData.jobKnowledgeScore3]);
      const qualityOfWorkScore = calculateScore([evalData.qualityOfWorkScore1, evalData.qualityOfWorkScore2, evalData.qualityOfWorkScore3, evalData.qualityOfWorkScore4, evalData.qualityOfWorkScore5]);
      const adaptabilityScore = calculateScore([evalData.adaptabilityScore1, evalData.adaptabilityScore2, evalData.adaptabilityScore3]);
      const teamworkScore = calculateScore([evalData.teamworkScore1, evalData.teamworkScore2, evalData.teamworkScore3]);
      const reliabilityScore = calculateScore([evalData.reliabilityScore1, evalData.reliabilityScore2, evalData.reliabilityScore3, evalData.reliabilityScore4]);
      const ethicalScore = calculateScore([evalData.ethicalScore1, evalData.ethicalScore2, evalData.ethicalScore3, evalData.ethicalScore4]);
      const customerServiceScore = calculateScore([evalData.customerServiceScore1, evalData.customerServiceScore2, evalData.customerServiceScore3, evalData.customerServiceScore4, evalData.customerServiceScore5]);

      return Math.round((
        (jobKnowledgeScore * 0.20) +
        (qualityOfWorkScore * 0.20) +
        (adaptabilityScore * 0.10) +
        (teamworkScore * 0.10) +
        (reliabilityScore * 0.05) +
        (ethicalScore * 0.05) +
        (customerServiceScore * 0.30)
      ) * 10) / 10;
    }

    return 0;
  };

  const printFeedback = (feedback: any) => {
    const originalSubmission = recentSubmissions.find(submission => submission.id === feedback.id);
    if (!originalSubmission || !originalSubmission.evaluationData) {
      alert('No evaluation data available for printing');
      return;
    }
    // Print functionality implementation would go here - simplified for brevity
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the evaluation');
      return;
    }
    printWindow.document.write('<html><body>Print functionality</body></html>');
    printWindow.document.close();
  };

  const sortRecords = (field: string) => {
    setRecordsSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (field: string) => {
    if (recordsSort.field !== field) return ' ↕️';
    return recordsSort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const handleRecordsRefresh = async () => {
    setRecordsRefreshing(true);
    try {
      await Promise.all([
        onRefresh(),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
    } catch (error) {
      console.error('Error refreshing records:', error);
    } finally {
      setRecordsRefreshing(false);
    }
  };

  const filteredAndSortedSubmissions = useMemo(() => {
    const filtered = recentSubmissions.filter((sub) => {
      if (recordsSearchTerm) {
        const searchLower = recordsSearchTerm.toLowerCase();
        const employeeName = getEmployeeNameForSearch(sub.employeeName || sub.employee || sub.evaluationData?.employeeName);
        const evaluatorName = getEmployeeNameForSearch(
          sub.evaluationData?.supervisor || sub.evaluator || sub.evaluationData?.evaluator
        );
        const matches = 
          employeeName.toLowerCase().includes(searchLower) ||
          sub.evaluationData?.department?.toLowerCase().includes(searchLower) ||
          sub.evaluationData?.position?.toLowerCase().includes(searchLower) ||
          evaluatorName.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
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
      if (recordsQuarterFilter) {
        const itemQuarter = getQuarterFromDate(sub.submittedAt);
        if (!itemQuarter.startsWith(recordsQuarterFilter)) return false;
      }
      if (recordsYearFilter && recordsYearFilter !== 'all') {
        const year = parseInt(recordsYearFilter);
        const itemYear = new Date(sub.submittedAt).getFullYear();
        if (itemYear !== year) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const { field, direction } = recordsSort;
      let aVal, bVal;

      switch (field) {
        case 'employeeName':
          aVal = getEmployeeNameForSearch(a.employeeName || a.employee || a.evaluationData?.employeeName).toLowerCase();
          bVal = getEmployeeNameForSearch(b.employeeName || b.employee || b.evaluationData?.employeeName).toLowerCase();
          break;
        case 'date':
          aVal = new Date(a.submittedAt).getTime();
          bVal = new Date(b.submittedAt).getTime();
          break;
        case 'rating':
          aVal = calculateOverallRating(a);
          bVal = calculateOverallRating(b);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [recentSubmissions, recordsSearchTerm, recordsApprovalFilter, recordsQuarterFilter, recordsYearFilter, recordsSort]);

  const recordsTotal = filteredAndSortedSubmissions.length;
  const recordsTotalPages = Math.ceil(recordsTotal / itemsPerPage);
  const recordsStartIndex = (recordsPage - 1) * itemsPerPage;
  const recordsEndIndex = recordsStartIndex + itemsPerPage;
  const recordsPaginated = filteredAndSortedSubmissions.slice(recordsStartIndex, recordsEndIndex);

  const pageChangeStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setRecordsPage(1);
  }, [recordsSearchTerm, recordsApprovalFilter, recordsQuarterFilter, recordsYearFilter]);

  const handlePageChange = (page: number, isPageChange: boolean = false) => {
    if (isPageChange) {
      setIsPageLoading(true);
      pageChangeStartTimeRef.current = Date.now();
      setRecordsPage(page);
      setTimeout(() => {
        setIsPageLoading(false);
        pageChangeStartTimeRef.current = null;
      }, 2000);
    } else {
      setRecordsPage(page);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base md:text-lg lg:text-xl">
            <span>All Evaluation Records</span>
            {(() => {
              const now = new Date();
              const newCount = recentSubmissions.filter(sub => {
                const hoursDiff = (now.getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60);
                return hoursDiff <= 24;
              }).length;
              return newCount > 0 ? (
                <Badge className="bg-yellow-500 text-white animate-pulse text-xs md:text-sm">
                  {newCount} NEW
                </Badge>
              ) : null;
            })()}
            <Badge variant="outline" className="text-xs md:text-sm font-normal">
              {recentSubmissions.length} Total Records
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs md:text-sm mt-1 md:mt-2">Complete evaluation history with advanced filtering</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="flex-1 min-w-0">
              <Label htmlFor="records-search" className="text-xs md:text-sm font-medium">Search</Label>
              <div className="mt-1 relative">
                <Input
                  id="records-search"
                  placeholder="Search by employee name, evaluator, department, position..."
                  className="pr-10 text-xs md:text-sm"
                  value={recordsSearchTerm}
                  onChange={(e) => setRecordsSearchTerm(e.target.value)}
                />
                {(recordsSearchTerm || recordsApprovalFilter || recordsQuarterFilter || recordsYearFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setRecordsSearchTerm('');
                      setRecordsApprovalFilter('');
                      setRecordsQuarterFilter('');
                      setRecordsYearFilter('all');
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

            <div className="w-full md:w-44 lg:w-48 xl:w-52">
              <Label htmlFor="records-approval-status" className="text-xs md:text-sm font-medium">Approval Status</Label>
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
                className="mt-1 text-xs md:text-sm"
              />
            </div>

            <div className="w-full md:w-44 lg:w-48 xl:w-52">
              <Label htmlFor="records-quarter" className="text-xs md:text-sm font-medium">Quarter</Label>
              <SearchableDropdown
                options={['All Quarters', 'Q1', 'Q2', 'Q3', 'Q4']}
                value={recordsQuarterFilter || 'All Quarters'}
                onValueChangeAction={(value: string) => {
                  const quarter = value === 'All Quarters' ? '' : value;
                  setRecordsQuarterFilter(quarter);
                  if (quarter) {
                    setRecordsYearFilter('all');
                  }
                }}
                placeholder="All Quarters"
                className="mt-1 text-xs md:text-sm"
              />
            </div>

            <div className="w-full md:w-44 lg:w-48 xl:w-52">
              <Label htmlFor="records-year" className="text-xs md:text-sm font-medium">Year</Label>
              <Select value={recordsYearFilter} onValueChange={setRecordsYearFilter}>
                <SelectTrigger className="mt-1 text-xs md:text-sm">
                  <SelectValue placeholder="Select a year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-auto flex gap-2">
              <div className="w-full md:w-28 lg:w-32 xl:w-36">
                <Label className="text-xs md:text-sm font-medium opacity-0">Refresh</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecordsRefresh}
                  disabled={recordsRefreshing}
                  className="mt-1 w-full text-xs md:text-sm bg-blue-500 hover:bg-green-600 text-white hover:text-white disabled:cursor-not-allowed"
                >
                  {recordsRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="m-3 md:m-4 p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
              <span className="font-medium text-gray-700">Status Indicators:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-yellow-100 border-l-2 border-l-yellow-500 rounded"></div>
                <Badge className="bg-yellow-500 text-white text-xs md:text-sm px-1.5 md:px-2 py-0.5">NEW</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-blue-50 border-l-2 border-l-blue-500 rounded"></div>
                <Badge className="bg-blue-500 text-white text-xs md:text-sm px-1.5 md:px-2 py-0.5">Recent</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
                <Badge className="bg-green-500 text-white text-xs md:text-sm px-1.5 md:px-2 py-0.5">Fully Approved</Badge>
              </div>
            </div>
          </div>

          <div className="relative max-h-[50vh] lg:max-h-[60vh] xl:max-h-[65vh] 2xl:max-h-[70vh] overflow-y-auto overflow-x-auto w-full">
            <Table className="min-w-full w-full">
              <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                <TableRow>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 cursor-pointer hover:bg-gray-50 min-w-[140px]" onClick={() => sortRecords('employeeName')}>
                    <span className="text-xs md:text-sm lg:text-base">Employee{getSortIcon('employeeName')}</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[100px]">
                    <span className="text-xs md:text-sm lg:text-base">Evaluator/HR</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[80px]">
                    <span className="text-xs md:text-sm lg:text-base">Quarter</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 cursor-pointer hover:bg-gray-50 min-w-[90px]" onClick={() => sortRecords('date')}>
                    <span className="text-xs md:text-sm lg:text-base">Date{getSortIcon('date')}</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 cursor-pointer hover:bg-gray-50 min-w-[120px]" onClick={() => sortRecords('rating')}>
                    <span className="text-xs md:text-sm lg:text-base">Rating{getSortIcon('rating')}</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[90px]">
                    <span className="text-xs md:text-sm lg:text-base">Status</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[100px] hidden lg:table-cell">
                    <span className="text-xs md:text-sm lg:text-base">Employee Sign</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[110px] hidden xl:table-cell">
                    <span className="text-xs md:text-sm lg:text-base">Evaluator Sign</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[100px] hidden xl:table-cell">
                    <span className="text-xs md:text-sm lg:text-base">HR signature</span>
                  </TableHead>
                  <TableHead className="px-3 py-2 md:px-4 md:py-2.5 lg:px-6 lg:py-3 min-w-[140px]">
                    <span className="text-xs md:text-sm lg:text-base">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200">
                {(recordsRefreshing || isPageLoading) ? (
                  Array.from({ length: itemsPerPage }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell className="px-3 py-2"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="px-3 py-2"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="px-3 py-2"><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell className="px-3 py-2"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="px-3 py-2"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="px-3 py-2"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell className="px-3 py-2 hidden lg:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="px-3 py-2 hidden xl:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="px-3 py-2 hidden xl:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-16" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : recordsPaginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 md:py-12">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <img src="/not-found.gif" alt="No data" className="w-25 h-25 object-contain" style={{ imageRendering: 'auto', willChange: 'auto', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }} />
                          <div className="text-gray-500">
                            <p className="text-base font-medium mb-1">No evaluation records found</p>
                            <p className="text-sm">Start evaluating employees to see records here</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recordsPaginated.map((submission) => {
                      const quarter = getQuarterFromDate(submission.submittedAt);
                      const hasEmployeeSignature = !!(submission.employeeSignature && submission.employeeSignature.trim());
                      const hasEvaluatorSignature = !!((submission.evaluatorSignature && submission.evaluatorSignature.trim()) || 
                        (submission.evaluationData?.evaluatorSignature && submission.evaluationData?.evaluatorSignature.trim()));
                      let approvalStatus = 'pending';
                      if (hasEmployeeSignature && hasEvaluatorSignature) {
                        approvalStatus = 'fully_approved';
                      } else if (hasEmployeeSignature) {
                        approvalStatus = 'employee_approved';
                      } else if (submission.approvalStatus && submission.approvalStatus !== 'pending') {
                        approvalStatus = submission.approvalStatus;
                      }
                      
                      const hoursDiff = (new Date().getTime() - new Date(submission.submittedAt).getTime()) / (1000 * 60 * 60);
                      let rowClassName = 'hover:bg-gray-50';
                      
                      if (approvalStatus === 'fully_approved') {
                        rowClassName = 'bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100';
                      } else if (hoursDiff <= 24) {
                        rowClassName = 'bg-yellow-100 border-l-4 border-l-yellow-500 hover:bg-yellow-200';
                      } else if (hoursDiff <= 48) {
                        rowClassName = 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100';
                      }

                      const evaluatorAccount = (accountsData as any).accounts.find((acc: any) => 
                        acc.id === submission.evaluatorId || acc.employeeId === submission.evaluatorId
                      );
                      const isHR = evaluatorAccount?.role === 'hr';
                      const hasSigned = submission.evaluatorSignature || submission.evaluationData?.evaluatorSignature;
                      
                      // Helper to safely extract name from object or string
                      const getEmployeeName = (employee: any): string => {
                        if (!employee) return 'N/A';
                        if (typeof employee === 'string') return employee;
                        if (employee.name) return employee.name;
                        if (employee.full_name) return employee.full_name;
                        if (employee.fname && employee.lname) return `${employee.fname} ${employee.lname}`;
                        if (employee.fname) return employee.fname;
                        return 'N/A';
                      };

                      // Helper to safely extract evaluator name
                      const getEvaluatorName = (evaluator: any): string => {
                        if (!evaluator) return 'N/A';
                        if (typeof evaluator === 'string') return evaluator;
                        if (evaluator.name) return evaluator.name;
                        if (evaluator.full_name) return evaluator.full_name;
                        if (evaluator.fname && evaluator.lname) return `${evaluator.fname} ${evaluator.lname}`;
                        if (evaluator.fname) return evaluator.fname;
                        return 'N/A';
                      };

                      const employeeName = getEmployeeName(submission.employeeName || submission.employee || submission.evaluationData?.employeeName);
                      const evaluatorName = getEvaluatorName(
                        submission.evaluationData?.supervisor || 
                        submission.evaluator || 
                        submission.evaluationData?.evaluator
                      );

                      return (
                        <TableRow key={submission.id} className={rowClassName}>
                          <TableCell className="px-3 py-2">
                            <div>
                              <div className="font-medium text-gray-900 text-xs md:text-sm">{employeeName}</div>
                              <div className="text-xs text-gray-500">{submission.evaluationData?.position || 'N/A'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs md:text-sm">
                            {evaluatorName}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <Badge className={`${getQuarterColor(quarter)} text-xs md:text-sm`}>
                              {quarter}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs md:text-sm text-gray-600">
                            {new Date(submission.submittedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            {(() => {
                              const rating = calculateOverallRating(submission);
                              return (
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2">
                                  <Badge className={`text-xs md:text-sm ${getRatingColor(rating)}`}>
                                    {rating.toFixed(1)}/5
                                  </Badge>
                                  <span className="text-xs text-gray-500 hidden md:inline">
                                    {getRatingLabel(rating)}
                                  </span>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <Badge className={`text-xs md:text-sm ${
                              approvalStatus === 'fully_approved' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {approvalStatus === 'fully_approved' ? '✓ Approved' : '⏳ Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-2 hidden lg:table-cell">
                            {submission.employeeSignature ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">✓ Signed</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 text-xs">⏳ Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-2 hidden xl:table-cell">
                            {!isHR && hasSigned ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">✓ Signed</Badge>
                            ) : !isHR && !hasSigned ? (
                              <Badge className="bg-gray-100 text-gray-600 text-xs">⏳ Pending</Badge>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-2 hidden xl:table-cell">
                            {isHR && hasSigned ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">✓ Signed</Badge>
                            ) : isHR && !hasSigned ? (
                              <Badge className="bg-gray-100 text-gray-600 text-xs">⏳ Pending</Badge>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <div className="flex flex-col sm:flex-row gap-1 md:gap-2">
                              <Button variant="outline" size="sm" onClick={() => onViewSubmission(submission)} className="text-xs bg-green-600 hover:bg-green-700 text-white">
                                ☰ View
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => onDeleteClick(submission)} className="text-xs bg-red-300 hover:bg-red-500 text-gray-700 hover:text-white border-red-200">
                                ❌ Delete
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
        </CardContent>

        {/* Pagination - Outside the table, centered */}
        {!recordsRefreshing && !isPageLoading && (
          <div className="w-full flex flex-col items-center justify-center py-4 px-4">
            <div className="text-center text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
              Showing {recordsStartIndex + 1} to {Math.min(recordsEndIndex, recordsTotal)} of {recordsTotal} records
            </div>
            
            {recordsTotal > itemsPerPage && (
              <div className="flex items-center gap-1.5 md:gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePageChange(Math.max(1, recordsPage - 1), true)} disabled={recordsPage === 1 || isPageLoading} className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white">
                  Previous
                </Button>
                <div className="flex items-center gap-0.5 md:gap-1">
                  {Array.from({ length: recordsTotalPages }, (_, i) => i + 1).map((page) => {
                    if (page === 1 || page === recordsTotalPages || (page >= recordsPage - 1 && page <= recordsPage + 1)) {
                      return (
                        <Button key={page} variant={recordsPage === page ? "default" : "outline"} size="sm" onClick={() => handlePageChange(page, true)} disabled={isPageLoading} className={`text-xs md:text-sm w-7 h-7 md:w-8 md:h-8 p-0 ${recordsPage === page ? "bg-blue-700 text-white hover:bg-blue-500 hover:text-white" : "bg-blue-500 text-white hover:bg-blue-700 hover:text-white"}`}>
                          {page}
                        </Button>
                      );
                    } else if (page === recordsPage - 2 || page === recordsPage + 2) {
                      return <span key={page} className="text-gray-400 text-xs md:text-sm">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(Math.min(recordsTotalPages, recordsPage + 1), true)} disabled={recordsPage === recordsTotalPages || isPageLoading} className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white">
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// Remaining tab components (EmployeesTab, DepartmentsTab, BranchesTab, PerformanceReviewsTab, EvaluationHistoryTab)
// need to be fully inlined here before HRDashboard. Due to their massive size (400-1100+ lines each),
// they should be copied from their respective index.tsx files in the hr-dashboard subdirectories.

// Import tab components from their page.tsx files
import { EmployeesTab } from './EmployeesTab/page';
import { DepartmentsTab } from './DepartmentsTab/page';
import { BranchesTab } from './BranchesTab/page';
import { PerformanceReviewsTab } from './PerformanceReviewsTab/page';
import { EvaluationHistoryTab } from './EvaluationHistoryTab/page';

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
  const [isViewEmployeeModalOpen, setIsViewEmployeeModalOpen] = useState(false);
  const [employeeToView, setEmployeeToView] = useState<Employee | null>(null);
  const [viewEmployeeId, setViewEmployeeId] = useState<number | undefined>(undefined);
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
          created_at: user.created_at,
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
  // HR should see ALL evaluation records across all dashboards
  const fetchRecentSubmissions = async () => {
    try {
      setSubmissionsLoading(true); // Set loading to true when starting fetch
      // Pass getAll: true to get ALL evaluations (not just HR's own)
      const response = await apiService.getSubmissions(undefined, undefined, undefined, undefined, undefined, undefined, true);
      // Handle paginated response structure: { data: [...], total: ..., ... }
      if (response && response.data && Array.isArray(response.data)) {
        setRecentSubmissions(response.data);
      } else if (Array.isArray(response)) {
        // Fallback: if response is already an array
        setRecentSubmissions(response);
      } else {
        // Default to empty array if structure is unexpected
        console.warn('Unexpected response structure from getSubmissions:', response);
        setRecentSubmissions([]);
      }
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
            created_at: user.created_at,
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
        setEmployeeToView(fullUserData as any);
      } else {
        // Fallback to the employee object if not found in API
        setEmployeeToView({
          ...employee,
          username: (employee as any).username || '',
          password: (employee as any).password || '',
          contact: (employee as any).contact || '',
          isActive: (employee as any).isActive !== undefined ? (employee as any).isActive : true,
          signature: (employee as any).signature || ''
        } as any);
      }
      setIsViewEmployeeModalOpen(true);
    } catch (error) {
      console.error("Error fetching full user data for view:", error);
      // Fallback to the employee object on error
      setEmployeeToView({
        ...employee,
        username: (employee as any).username || '',
        password: (employee as any).password || '',
        contact: (employee as any).contact || '',
        isActive: (employee as any).isActive !== undefined ? (employee as any).isActive : true,
        signature: (employee as any).signature || ''
      } as any);
      setIsViewEmployeeModalOpen(true);
    }
  };

  // Fetch Employee ID when modal opens (same as admin and EditUserModal)
  useEffect(() => {
    const fetchEmployeeId = async () => {
      if (employeeToView && isViewEmployeeModalOpen && !viewEmployeeId) {
        try {
          // First check if it's already in the employee object
          const existingId = (employeeToView as any).employeeId || (employeeToView as any).employee_id;
          if (existingId) {
            setViewEmployeeId(existingId);
            return;
          }

          // Otherwise fetch from accounts API
          const accounts = await apiService.getAllUsers();
          const account = accounts.find(
            (acc: any) =>
              acc.id === employeeToView.id ||
              acc.employeeId === employeeToView.id ||
              acc.employee_id === employeeToView.id ||
              acc.user_id === employeeToView.id
          );

          const foundEmployeeId =
            account?.employeeId ||
            account?.employee_id ||
            account?.emp_id ||
            undefined;

          if (foundEmployeeId) {
            setViewEmployeeId(foundEmployeeId);
          }
        } catch (error) {
          console.error('Error fetching employeeId:', error);
        }
      }
    };

    fetchEmployeeId();
  }, [employeeToView, isViewEmployeeModalOpen, viewEmployeeId]);

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
            created_at: user.created_at,
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
        topSummary={active === 'overview' ? topSummary : null}
        // profile={{ name: 'HR Manager', roleOrPosition: 'Human Resources' }}
      >
      {active === 'overview' && (
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
      )}

      {active === 'evaluation-records' && (
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
      )}

      {active === 'employees' && (
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
      )}

      {active === 'departments' && (
        <DepartmentsTab
          departments={departments}
          employees={employees}
          departmentsRefreshing={departmentsRefreshing}
          isActive={active === 'departments'}
        />
      )}

      {active === 'branches' && (
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
      )}

      {active === 'history' && (
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


      {/* View Employee Modal */}
      {employeeToView && (
        <ViewEmployeeModal
          isOpen={isViewEmployeeModalOpen}
          onCloseAction={() => {
            setIsViewEmployeeModalOpen(false);
            setEmployeeToView(null);
            setViewEmployeeId(undefined);
          }}
          employee={{
            id: employeeToView.id,
            fname: (() => {
              const userAny = employeeToView as any;
              if (userAny.fname) return userAny.fname;
              if (employeeToView.name) {
                const nameParts = employeeToView.name.split(' ');
                return nameParts[0] || '';
              }
              return '';
            })(),
            lname: (() => {
              const userAny = employeeToView as any;
              if (userAny.lname) return userAny.lname;
              if (employeeToView.name) {
                const nameParts = employeeToView.name.split(' ');
                return nameParts.slice(1).join(' ') || '';
              }
              return '';
            })(),
            emp_id: viewEmployeeId || (employeeToView as any).employeeId || (employeeToView as any).employee_id || (employeeToView as any).emp_id || 0,
            email: employeeToView.email || '',
            username: (employeeToView as any).username || '',
            password: '',
            contact: (employeeToView as any).contact || undefined,
            positions: (() => {
              const userAny = employeeToView as any;
              const pos = employeeToView.position || userAny.positions;
              if (!pos) return null;
              if (typeof pos === 'string') return { name: pos, label: pos };
              if (typeof pos === 'object') return pos;
              return null;
            })(),
            departments: (() => {
              const userAny = employeeToView as any;
              const dept = employeeToView.department || userAny.departments;
              if (!dept) return null;
              if (typeof dept === 'string') return { name: dept, department_name: dept };
              if (Array.isArray(dept) && dept.length > 0) {
                return typeof dept[0] === 'object' ? dept[0] : { name: dept[0], department_name: dept[0] };
              }
              if (typeof dept === 'object') return dept;
              return null;
            })(),
            branches: (() => {
              const userAny = employeeToView as any;
              const branch = employeeToView.branch || userAny.branches;
              if (!branch) return null;
              if (typeof branch === 'string') return [{ branch_name: branch, name: branch }];
              if (Array.isArray(branch) && branch.length > 0) {
                return branch.map((b: any) => typeof b === 'object' ? b : { branch_name: b, name: b });
              }
              if (typeof branch === 'object') return [branch];
              return null;
            })(),
            roles: (() => {
              const userAny = employeeToView as any;
              const role = employeeToView.role || userAny.roles;
              if (!role) return null;
              if (typeof role === 'string') return [{ name: role }];
              if (Array.isArray(role) && role.length > 0) {
                return role.map((r: any) => typeof r === 'object' ? r : { name: r });
              }
              if (typeof role === 'object') return [role];
              return null;
            })(),
            hireDate: (() => {
              const userAny = employeeToView as any;
              const hireDate = userAny.hireDate || userAny.hire_date || userAny.created_at;
              if (!hireDate) return new Date();
              if (hireDate instanceof Date) return hireDate;
              return new Date(hireDate);
            })(),
            is_active: (() => {
              const userAny = employeeToView as any;
              if (typeof userAny.is_active === 'string') return userAny.is_active;
              if (typeof userAny.isActive === 'boolean') return userAny.isActive ? 'active' : 'inactive';
              return 'active';
            })(),
            avatar: (employeeToView as any).avatar || null,
            bio: (employeeToView as any).bio || null,
            created_at: (employeeToView as any).created_at || new Date().toISOString(),
            updated_at: (employeeToView as any).updated_at || undefined,
          } as any}
          onStartEvaluationAction={() => {
            // Not used in HR, but required by component
            setIsViewEmployeeModalOpen(false);
            setEmployeeToView(null);
            setViewEmployeeId(undefined);
          }}
          onViewSubmissionAction={() => {
            // Not used in HR, but required by component
          }}
          designVariant="admin"
        />
      )}

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
                } as any}
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
                } as any}
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

// Authentication is handled by layout.tsx
export default HRDashboard;
