'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import SearchableDropdown from "@/components/ui/searchable-dropdown";
import departments from '@/data/departments.json';
import { getQuarterFromEvaluationData } from '@/lib/quarterUtils';

interface EvaluationRecordsTabProps {
  recentSubmissions: any[];
  seenSubmissions: Set<number>;
  isFeedbackRefreshing: boolean;
  onRefresh: () => void;
  onViewEvaluation: (feedback: any) => void;
  onPrintFeedback: (feedback: any) => void;
  onDeleteClick: (feedback: any) => void;
  onMarkAsSeen: (id: number) => void;
  getSubmissionHighlight: (submittedAt: string, id: number, approvalStatus?: string) => any;
  isActive?: boolean;
}

// Helper function to calculate score from array
const calculateScore = (scores: (string | number | null | undefined)[]): number => {
  const validScores = scores
    .filter(score => score !== null && score !== undefined && score !== '')
    .map(score => typeof score === 'string' ? parseFloat(score) : score)
    .filter(score => !isNaN(score as number)) as number[];
  
  if (validScores.length === 0) return 0;
  return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
};

// Helper function to get rating label
const getRatingLabel = (score: number) => {
  if (score >= 4.5) return 'Outstanding';
  if (score >= 4.0) return 'Exceeds Expectations';
  if (score >= 3.5) return 'Meets Expectations';
  if (score >= 2.5) return 'Needs Improvement';
  return 'Unsatisfactory';
};

// Helper function to get rating color
const getRatingColor = (rating: number) => {
  if (rating >= 4.5) return 'text-green-600 bg-green-100';
  if (rating >= 4.0) return 'text-blue-600 bg-blue-100';
  if (rating >= 3.5) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

// Helper function to merge employee approval data
const mergeEmployeeApprovalData = (submissions: any[]) => {
  return submissions.map(submission => {
    // Try to get employee approval data from localStorage
    let employeeApprovalData = null;

    // Check if submission has employee email
    if (submission.employeeEmail || submission.evaluationData?.employeeEmail) {
      const email = submission.employeeEmail || submission.evaluationData?.employeeEmail;
      const approvalKey = `approvalData_${email}`;
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
        employeeEmail: employeeApprovalData.employeeEmail || submission.employeeEmail || submission.evaluationData?.employeeEmail
      };
    }

    return submission;
  });
};

// Helper function to get correct approval status
const getCorrectApprovalStatus = (submission: any) => {
  // Check if both parties have signed (handle empty strings too)
  const hasEmployeeSignature = !!(
    (submission.employeeSignature && submission.employeeSignature.trim() && submission.employeeSignature.startsWith('data:image')) ||
    (submission.evaluationData?.employeeSignature && submission.evaluationData.employeeSignature.trim() && submission.evaluationData.employeeSignature.startsWith('data:image'))
  );
  
  // Evaluator signature - check for actual signature image, not just the name
  const hasEvaluatorSignature = !!(
    (submission.evaluatorSignatureImage && submission.evaluatorSignatureImage.trim() && submission.evaluatorSignatureImage.startsWith('data:image')) ||
    (submission.evaluationData?.evaluatorSignatureImage && submission.evaluationData.evaluatorSignatureImage.trim() && submission.evaluationData.evaluatorSignatureImage.startsWith('data:image'))
  );
  
  // Determine approval status - SIGNATURES HAVE PRIORITY over stored status
  if (hasEmployeeSignature && hasEvaluatorSignature) {
    return 'fully_approved';
  } else if (hasEmployeeSignature) {
    return 'employee_approved';
  } else if (submission.approvalStatus && submission.approvalStatus !== 'pending') {
    return submission.approvalStatus;
  } else {
    return 'pending';
  }
};

export function EvaluationRecordsTab({
  recentSubmissions,
  seenSubmissions,
  isFeedbackRefreshing,
  onRefresh,
  onViewEvaluation,
  onPrintFeedback,
  onDeleteClick,
  onMarkAsSeen,
  getSubmissionHighlight,
  isActive = false
}: EvaluationRecordsTabProps) {
  const [feedbackSearch, setFeedbackSearch] = useState('');

  // Ensure scrollbar is always visible
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .evaluation-records-table::-webkit-scrollbar {
        width: 12px;
        height: 12px;
        -webkit-appearance: none;
      }
      .evaluation-records-table::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 6px;
      }
      .evaluation-records-table::-webkit-scrollbar-thumb {
        background: #94a3b8;
        border-radius: 6px;
        border: 2px solid #f1f5f9;
      }
      .evaluation-records-table::-webkit-scrollbar-thumb:hover {
        background: #64748b;
      }
      /* Force scrollbar to always be visible */
      .evaluation-records-table {
        scrollbar-width: thin;
        scrollbar-color: #94a3b8 #f1f5f9;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [feedbackDepartmentFilter, setFeedbackDepartmentFilter] = useState('');
  const [feedbackDateFilter, setFeedbackDateFilter] = useState('');
  const [feedbackDateRange, setFeedbackDateRange] = useState({ from: '', to: '' });
  const [feedbackQuarterFilter, setFeedbackQuarterFilter] = useState('');
  const [feedbackApprovalStatusFilter, setFeedbackApprovalStatusFilter] = useState('');
  const [feedbackSort, setFeedbackSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

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
        id: submission.id || `submission-${index}`,
        uniqueKey: `${submission.id || 'submission'}-${index}-${submission.submittedAt || Date.now()}`,
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
        submittedAt: submission.submittedAt,
        comment: submission.evaluationData?.overallComments || 'Performance evaluation completed',
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

    // Final validation - ensure all items have unique keys
    const finalData = uniqueData.map((item, index) => ({
      ...item,
      uniqueKey: item.uniqueKey || `fallback-${index}-${Date.now()}`
    }));

    return finalData;
  }, [recentSubmissions, feedbackSearch, feedbackDepartmentFilter, feedbackDateFilter, feedbackDateRange, feedbackQuarterFilter, feedbackApprovalStatusFilter, feedbackSort]);

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


  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            All Feedback/Evaluation Records
            {(() => {
              const newCount = filteredFeedbackData.filter(feedback => {
                if (!feedback.submittedAt) return false;
                const hoursDiff = (new Date().getTime() - new Date(feedback.submittedAt).getTime()) / (1000 * 60 * 60);
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
                    className="pr-10"
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600 hover:text-red-700"
                      title="Clear all filters"
                    >
                      <X className="h-4 w-4" />
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
            <div className="w-full md:w-auto flex gap-2">
              <div className="w-full md:w-32">
                <Label className="text-sm font-medium opacity-0">Refresh</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isFeedbackRefreshing}
                  className="mt-1 w-full text-xs bg-blue-500 hover:bg-green-600 text-center text-white hover:text-white disabled:cursor-not-allowed"
                  title="Refresh evaluation records data"
                >
                  {isFeedbackRefreshing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      Refresh <span><RefreshCw className="h-3 w-3" /></span>
                    </>
                  )}
                </Button>
              </div>
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
            <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto scrollable-table evaluation-records-table">
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
                  <p className="text-sm text-gray-600 font-medium">Loading evaluation records...</p>
                </div>
              </div>

              {/* Table structure visible in background */}
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
            <div className="max-h-[500px] overflow-y-auto overflow-x-auto scrollable-table evaluation-records-table">
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
                    // Find the original submission to check evaluationData if needed
                    const originalSubmission = recentSubmissions.find(s => s.id === feedback.id);

                    // Check if both parties have signed - must be actual signature images (base64 data URLs)
                    const hasEmployeeSignature = !!(
                      (feedback.employeeSignature && feedback.employeeSignature.trim() && feedback.employeeSignature.startsWith('data:image')) ||
                      (originalSubmission?.employeeSignature && originalSubmission.employeeSignature.trim() && originalSubmission.employeeSignature.startsWith('data:image')) ||
                      (originalSubmission?.evaluationData?.employeeSignature && originalSubmission.evaluationData.employeeSignature.trim() && originalSubmission.evaluationData.employeeSignature.startsWith('data:image'))
                    );

                    // Evaluator signature - check for actual signature image, not just the name
                    const hasEvaluatorSignature = !!(
                      (originalSubmission?.evaluationData?.evaluatorSignatureImage && originalSubmission.evaluationData.evaluatorSignatureImage.trim() && originalSubmission.evaluationData.evaluatorSignatureImage.startsWith('data:image')) ||
                      ((originalSubmission as any)?.evaluatorSignatureImage && (originalSubmission as any).evaluatorSignatureImage.trim() && (originalSubmission as any).evaluatorSignatureImage.startsWith('data:image'))
                    );

                    // Determine approval status - SIGNATURES HAVE PRIORITY over stored status
                    let actualApprovalStatus = 'pending';
                    if (hasEmployeeSignature && hasEvaluatorSignature) {
                      actualApprovalStatus = 'fully_approved';
                    } else if (hasEmployeeSignature) {
                      actualApprovalStatus = 'employee_approved';
                    } else if (feedback.approvalStatus && feedback.approvalStatus !== 'pending') {
                      actualApprovalStatus = feedback.approvalStatus;
                    } else {
                      actualApprovalStatus = 'pending';
                    }

                    const highlight = getSubmissionHighlight(feedback.submittedAt || feedback.date || new Date().toISOString(), feedback.id, actualApprovalStatus);
                    return (
                      <TableRow
                        key={feedback.uniqueKey}
                        className={highlight.className}
                        onClick={() => {
                          onMarkAsSeen(feedback.id);
                          onViewEvaluation(feedback);
                        }}
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
                                {highlight.secondaryBadge && (
                                  <Badge className={`${highlight.secondaryBadge.className} text-xs px-1.5 py-0`}>
                                    {highlight.secondaryBadge.text}
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
                          <Badge className={
                            actualApprovalStatus === 'fully_approved' ? 'bg-green-100 text-green-800' :
                              actualApprovalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                          }>
                            {actualApprovalStatus === 'fully_approved' ? '✓ Fully Approved' :
                              actualApprovalStatus === 'rejected' ? '❌ Rejected' :
                                '⏳ Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-3">
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
                          <div className="flex items-center space-x-2">
                            {(feedback.evaluatorSignature || originalSubmission?.evaluationData?.evaluatorSignature) ? (
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
                                onMarkAsSeen(feedback.id);
                                onViewEvaluation(feedback);
                              }}
                              className="text-xs px-2 py-1 bg-green-600 hover:bg-green-300 text-white"
                            >
                              ☰ View
                            </Button>

                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsSeen(feedback.id);
                                onPrintFeedback(feedback);
                              }}
                              className="text-xs bg-gray-500 text-white px-2 py-1"
                            >
                              ⎙ Print
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClick(feedback);
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
}

