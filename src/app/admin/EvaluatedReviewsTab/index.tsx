'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableDropdown from "@/components/ui/searchable-dropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQuarterFromDate, getQuarterColor } from '@/lib/quarterUtils';
import accountsData from '@/data/accounts.json';
import ViewResultsModal from '@/components/evaluation/ViewResultsModal';
import clientDataService from '@/lib/clientDataService';

export function EvaluatedReviewsTab() {
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
  const [recordsApprovalFilter, setRecordsApprovalFilter] = useState('');
  const [recordsQuarterFilter, setRecordsQuarterFilter] = useState('');
  const [recordsYearFilter, setRecordsYearFilter] = useState<string>('all');
  const [recordsRefreshing, setRecordsRefreshing] = useState(false);
  const [recordsSort, setRecordsSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({ field: 'date', direction: 'desc' });
  const [isViewResultsModalOpen, setIsViewResultsModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  // Get available years from submissions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    recentSubmissions.forEach((submission) => {
      if (submission.submittedAt) {
        const year = new Date(submission.submittedAt).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  }, [recentSubmissions]);

  // Load submissions data
  const loadSubmissions = async () => {
    try {
      setRecordsRefreshing(true);
      const submissions = await clientDataService.getSubmissions();
      setRecentSubmissions(submissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setRecentSubmissions([]);
    } finally {
      setRecordsRefreshing(false);
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setRecordsRefreshing(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        await loadSubmissions();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setRecordsRefreshing(false);
      }
    };

    loadInitialData();
  }, []);

  // Helper function to calculate score
  const calculateScore = (scores: (string | number | undefined)[]): number => {
    const validScores = scores
      .filter((score): score is string | number => score !== undefined && score !== '')
      .map(score => typeof score === 'string' ? parseFloat(score) : score)
      .filter(score => !isNaN(score));
    
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  };

  // Helper function to get rating label
  const getRatingLabel = (score: number): string => {
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

  // Helper function to calculate overall rating from submission
  const calculateOverallRating = (submission: any): number => {
    if (submission.rating) {
      return typeof submission.rating === 'string' ? parseFloat(submission.rating) : submission.rating;
    }

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
      return Math.round((
        (jobKnowledgeScore * 0.20) +
        (qualityOfWorkScore * 0.20) +
        (adaptabilityScore * 0.10) +
        (teamworkScore * 0.10) +
        (reliabilityScore * 0.05) +
        (ethicalScore * 0.05) +
        (customerServiceScore * 0.30)
      ) * 10) / 10; // Round to 1 decimal place
    }

    return 0;
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
              <div class="print-value">${data.supervisor || originalSubmission.evaluator || 'N/A'}</div>
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

  // Sort handler
  const sortRecords = (field: string) => {
    setRecordsSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get sort icon
  const getSortIcon = (field: string) => {
    if (recordsSort.field !== field) return ' ↕️';
    return recordsSort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Refresh handler
  const handleRecordsRefresh = async () => {
    setRecordsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await loadSubmissions();
    setRecordsRefreshing(false);
  };

  // Filter and sort submissions
  const filteredAndSortedSubmissions = useMemo(() => {
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
        // Match quarter regardless of year (e.g., "Q1" matches "Q1 2024", "Q1 2025", etc.)
        if (!itemQuarter.startsWith(recordsQuarterFilter)) return false;
      }
      if (recordsYearFilter && recordsYearFilter !== 'all') {
        const year = parseInt(recordsYearFilter);
        const itemYear = new Date(sub.submittedAt).getFullYear();
        if (itemYear !== year) return false;
      }
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

  // Add visible scrollbar styling
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .evaluation-records-table::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .evaluation-records-table::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      .evaluation-records-table::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }
      .evaluation-records-table::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      .evaluation-records-table {
        scrollbar-width: thin;
        scrollbar-color: #888 #f1f1f1;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleViewEvaluation = async (submission: any) => {
    try {
      // Fetch the full submission data
      const fullSubmission = await clientDataService.getSubmissionById(submission.id);
      
      if (fullSubmission) {
        const ratingValue = calculateOverallRating(fullSubmission);
        
        // Transform the submission to match ViewResultsModal's expected format
        const submissionForModal = {
          id: fullSubmission.id,
          employeeName: fullSubmission.employeeName || submission.employeeName,
          category: 'Performance Review',
          rating: ratingValue,
          submittedAt: fullSubmission.submittedAt || submission.submittedAt,
          status: fullSubmission.status || 'completed',
          evaluator: fullSubmission.evaluator || submission.evaluator,
          evaluationData: fullSubmission.evaluationData || submission.evaluationData,
          employeeId: fullSubmission.employeeId,
          employeeEmail: fullSubmission.employeeEmail || submission.evaluationData?.employeeEmail,
          evaluatorId: fullSubmission.evaluatorId,
          evaluatorName: fullSubmission.evaluator || submission.evaluator,
          period: fullSubmission.period,
          overallRating: ratingValue.toString(),
          approvalStatus: fullSubmission.approvalStatus || submission.approvalStatus,
          employeeSignature: fullSubmission.employeeSignature || submission.employeeSignature,
          employeeApprovedAt: fullSubmission.employeeApprovedAt || submission.employeeApprovedAt,
          evaluatorSignature: fullSubmission.evaluatorSignature || submission.evaluatorSignature,
          evaluatorApprovedAt: fullSubmission.evaluatorApprovedAt || submission.evaluatorApprovedAt,
        };
        
        setSelectedSubmission(submissionForModal);
        setIsViewResultsModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching submission details:', error);
    }
  };

  const handleDeleteClick = async (submission: any) => {
    if (confirm(`Are you sure you want to delete the evaluation for ${submission.employeeName}?`)) {
      try {
        await clientDataService.deleteSubmission(submission.id);
        await loadSubmissions();
      } catch (error) {
        console.error('Error deleting submission:', error);
      }
    }
  };

  return (
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
                className="mt-1"
              />
            </div>

            {/* Year Filter */}
            <div className="w-full md:w-48">
              <Label htmlFor="records-year" className="text-sm font-medium">Year</Label>
              <Select value={recordsYearFilter} onValueChange={setRecordsYearFilter}>
                <SelectTrigger className="mt-1">
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
            <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto evaluation-records-table">
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
                    <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('rating')}>
                      Rating{getSortIcon('rating')}
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
                        <div className="h-5 w-18 rounded-full bg-gray-200 animate-pulse"></div>
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
            <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto evaluation-records-table">
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                  <TableRow>
                    <TableHead className="px-6 py-3 cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('employeeName')}>
                      Employee{getSortIcon('employeeName')}
                    </TableHead>
                    <TableHead className="px-6 py-3">Evaluator/HR</TableHead>
                    <TableHead className="px-6 py-3">Type</TableHead>
                    <TableHead className="px-6 py-3">Quarter</TableHead>
                    <TableHead className="px-6 py-3 cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('date')}>
                      Date{getSortIcon('date')}
                    </TableHead>
                    <TableHead className="px-6 py-3 cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('rating')}>
                      Rating{getSortIcon('rating')}
                    </TableHead>
                    <TableHead className="px-6 py-3">Status</TableHead>
                    <TableHead className="px-6 py-3">Employee Sign</TableHead>
                    <TableHead className="px-6 py-3">Evaluator Sign</TableHead>
                    <TableHead className="px-6 py-3">HR signature</TableHead>
                    <TableHead className="px-6 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200">
                  {filteredAndSortedSubmissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                        No evaluation records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedSubmissions.map((submission) => {
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

                      // Determine if evaluator is HR or Evaluator
                      const evaluatorAccount = (accountsData as any).accounts.find((acc: any) => 
                        acc.id === submission.evaluatorId || acc.employeeId === submission.evaluatorId
                      );
                      const isHR = evaluatorAccount?.role === 'hr';
                      const hasSigned = submission.evaluatorSignature || submission.evaluationData?.evaluatorSignature;
                      
                      return (
                        <TableRow key={submission.id} className={rowClassName}>
                          <TableCell className="px-6 py-3">
                            <div>
                              <div className="font-medium text-gray-900">{submission.employeeName}</div>
                              <div className="text-sm text-gray-500">{submission.evaluationData?.position || 'N/A'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3 text-sm">
                            {submission.evaluationData?.supervisor || submission.evaluator || 'N/A'}
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Badge className={isHR ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                              {isHR ? '👔 HR' : '📋 Evaluator'}
                            </Badge>
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
                            {(() => {
                              const rating = calculateOverallRating(submission);
                              return (
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-xs ${getRatingColor(rating)}`}>
                                    {rating.toFixed(1)}/5
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {getRatingLabel(rating)}
                                  </span>
                                </div>
                              );
                            })()}
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
                            {!isHR && hasSigned ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">✓ Signed</Badge>
                            ) : !isHR && !hasSigned ? (
                              <Badge className="bg-gray-100 text-gray-600 text-xs">⏳ Pending</Badge>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            {isHR && hasSigned ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">✓ Signed</Badge>
                            ) : isHR && !hasSigned ? (
                              <Badge className="bg-gray-100 text-gray-600 text-xs">⏳ Pending</Badge>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewEvaluation(submission)}
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
                                onClick={() => handleDeleteClick(submission)}
                                className="text-xs px-2 py-1 bg-red-300 hover:bg-red-500 text-gray-700 hover:text-white border-red-200"
                                title="Delete this evaluation record"
                              >
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
          )}

          {/* Results Counter */}
          {!recordsRefreshing && (
            <div className="m-4 text-center text-sm text-gray-600">
              Showing {filteredAndSortedSubmissions.length} of {recentSubmissions.length} evaluation records
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Results Modal */}
      <ViewResultsModal
        isOpen={isViewResultsModalOpen}
        onCloseAction={() => {
          setIsViewResultsModalOpen(false);
          setSelectedSubmission(null);
        }}
        submission={selectedSubmission}
        showApprovalButton={false}
        isEvaluatorView={false}
      />
    </div>
  );
}
