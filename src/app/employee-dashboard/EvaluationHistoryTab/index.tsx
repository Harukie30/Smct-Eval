'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Eye, Calendar, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/useToast";
import { getQuarterFromEvaluationData, getQuarterColor } from '@/lib/quarterUtils';
import { getEmployeeResults } from '@/lib/evaluationStorage';
import clientDataService from '@/lib/clientDataService';

interface EvaluationHistoryTabProps {
  isActive?: boolean;
  onViewEvaluation: (submission: any) => void;
}

export function EvaluationHistoryTab({ isActive = false, onViewEvaluation }: EvaluationHistoryTabProps) {
  const { profile } = useUser();
  const { success } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);
  const [isRefreshingQuarterly, setIsRefreshingQuarterly] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [quarterlySearchTerm, setQuarterlySearchTerm] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<{ from?: Date; to?: Date }>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [approvedEvaluations, setApprovedEvaluations] = useState<Set<string>>(new Set());
  const isFirstMount = useRef(true);

  // Load approved evaluations
  useEffect(() => {
    if (profile?.email) {
      const approved = JSON.parse(
        localStorage.getItem(`approvedEvaluations_${profile.email}`) || '[]'
      );
      setApprovedEvaluations(new Set(approved));
    }
  }, [profile?.email]);

  // Load data
  const loadData = async () => {
    if (!profile?.email) return;
    
    try {
      setLoading(true);
      const allSubmissions = await clientDataService.getSubmissions();
      const userSubmissions = allSubmissions.filter(
        (submission: any) =>
          submission.employeeName === profile.name ||
          submission.evaluationData?.employeeEmail === profile.email
      );
      const finalSubmissions = userSubmissions.length > 0 ? userSubmissions : allSubmissions;
      setSubmissions(finalSubmissions);

      const results = getEmployeeResults(profile.email);
      setEvaluationResults(results);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, [profile]);

  // Refresh when tab becomes active
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (isActive && profile?.email) {
      const refreshOnTabClick = async () => {
        setIsRefreshingHistory(true);
        setIsRefreshingQuarterly(true);
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await loadData();
        } catch (error) {
          console.error('Error refreshing on tab click:', error);
        } finally {
          setIsRefreshingHistory(false);
          setIsRefreshingQuarterly(false);
        }
      };
      refreshOnTabClick();
    }
  }, [isActive, profile]);

  // Helper functions
  const getTimeAgo = (submittedAt: string) => {
    const submissionDate = new Date(submittedAt);
    const now = new Date();
    const diffInMs = now.getTime() - submissionDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return new Date(submittedAt).toLocaleDateString();
  };

  const calculateOverallRating = (evaluationData: any) => {
    if (!evaluationData) return 0;
    const calculateScore = (scores: string[]) => {
      const validScores = scores
        .filter((score) => score && score !== '')
        .map((score) => parseFloat(score));
      if (validScores.length === 0) return 0;
      return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    };

    const jobKnowledgeScore = calculateScore([
      evaluationData.jobKnowledgeScore1,
      evaluationData.jobKnowledgeScore2,
      evaluationData.jobKnowledgeScore3,
    ]);
    const qualityOfWorkScore = calculateScore([
      evaluationData.qualityOfWorkScore1,
      evaluationData.qualityOfWorkScore2,
      evaluationData.qualityOfWorkScore3,
      evaluationData.qualityOfWorkScore4,
      evaluationData.qualityOfWorkScore5,
    ]);
    const adaptabilityScore = calculateScore([
      evaluationData.adaptabilityScore1,
      evaluationData.adaptabilityScore2,
      evaluationData.adaptabilityScore3,
    ]);
    const teamworkScore = calculateScore([
      evaluationData.teamworkScore1,
      evaluationData.teamworkScore2,
      evaluationData.teamworkScore3,
    ]);
    const reliabilityScore = calculateScore([
      evaluationData.reliabilityScore1,
      evaluationData.reliabilityScore2,
      evaluationData.reliabilityScore3,
      evaluationData.reliabilityScore4,
    ]);
    const ethicalScore = calculateScore([
      evaluationData.ethicalScore1,
      evaluationData.ethicalScore2,
      evaluationData.ethicalScore3,
      evaluationData.ethicalScore4,
    ]);
    const customerServiceScore = calculateScore([
      evaluationData.customerServiceScore1,
      evaluationData.customerServiceScore2,
      evaluationData.customerServiceScore3,
      evaluationData.customerServiceScore4,
      evaluationData.customerServiceScore5,
    ]);

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

  const isEvaluationApproved = (submissionId: string) => {
    return approvedEvaluations.has(submissionId);
  };

  const getApprovalData = (submissionId: string) => {
    if (!profile?.email) return null;
    const approvalData = JSON.parse(
      localStorage.getItem(`approvalData_${profile.email}`) || '{}'
    );
    const key = submissionId.toString();
    return approvalData[key] || null;
  };

  const getSubmissionHighlight = (submittedAt: string, allSubmissions: any[] = [], submissionId?: string) => {
    if (submissionId && isEvaluationApproved(submissionId)) {
      return {
        className: 'bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100',
        badge: { text: 'Approved', className: 'bg-green-200 text-green-800' },
        priority: 'approved',
      };
    }

    const sortedSubmissions = [...allSubmissions].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    const currentIndex = sortedSubmissions.findIndex((sub) => sub.submittedAt === submittedAt);

    if (currentIndex === 0) {
      return {
        className: 'bg-yellow-100 border-l-4 border-l-yellow-500 hover:bg-yellow-200',
        badge: { text: 'New', className: 'bg-yellow-200 text-yellow-800' },
        priority: 'new',
      };
    } else if (currentIndex === 1) {
      return {
        className: 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100',
        badge: { text: 'Recent', className: 'bg-blue-100 text-blue-800' },
        priority: 'recent',
      };
    } else {
      return {
        className: 'hover:bg-gray-50',
        badge: null,
        priority: 'old',
      };
    }
  };

  const isNewSubmission = (submittedAt: string) => {
    const highlight = getSubmissionHighlight(submittedAt, submissions);
    return highlight.priority === 'new' || highlight.priority === 'recent';
  };

  const clearDateFilter = () => {
    setDateFilter({});
  };

  const handleRefreshQuarterly = async () => {
    if (!profile?.email) return;
    setIsRefreshingQuarterly(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const results = getEmployeeResults(profile.email);
      setEvaluationResults(results);
      success('Quarterly performance refreshed successfully', 'All quarterly data has been updated');
    } catch (error) {
      console.error('Error refreshing quarterly performance:', error);
    } finally {
      setIsRefreshingQuarterly(false);
    }
  };

  const handleRefreshHistory = async () => {
    if (!profile?.email) return;
    setIsRefreshingHistory(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const results = getEmployeeResults(profile.email);
      setEvaluationResults(results);
      success('Evaluation history refreshed successfully', 'All evaluation records have been updated');
    } catch (error) {
      console.error('Error refreshing evaluation history:', error);
    } finally {
      setIsRefreshingHistory(false);
    }
  };

  // Filter submissions for history tab
  const filteredHistorySubmissions = useMemo(() => {
    if (!historySearchTerm) return submissions;

    const searchLower = historySearchTerm.toLowerCase();
    return submissions.filter((submission) => {
      return (
        submission.employeeName?.toLowerCase().includes(searchLower) ||
        submission.evaluator?.toLowerCase().includes(searchLower) ||
        submission.evaluationData?.supervisor?.toLowerCase().includes(searchLower) ||
        submission.rating?.toString().includes(searchLower) ||
        getQuarterFromEvaluationData(submission.evaluationData || submission)?.toLowerCase().includes(searchLower)
      );
    });
  }, [submissions, historySearchTerm]);

  // Quarterly data processing
  const quarterlyData = useMemo(() => {
    const data = submissions.reduce((acc, submission) => {
      const quarter = getQuarterFromEvaluationData(submission.evaluationData || submission);
      if (!acc[quarter]) {
        acc[quarter] = {
          quarter,
          submissions: [],
          averageRating: 0,
          totalEvaluations: 0,
          latestRating: 0,
          dateRange: '',
        };
      }
      acc[quarter].submissions.push(submission);
      return acc;
    }, {} as any);

    Object.keys(data).forEach((quarter) => {
      const quarterData = data[quarter];
      const ratings = quarterData.submissions
        .map((s: any) => (s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating))
        .filter((r: any) => r > 0);
      quarterData.totalEvaluations = ratings.length;
      quarterData.averageRating = ratings.length > 0
        ? (ratings.reduce((a: any, b: any) => a + b, 0) / ratings.length).toFixed(1)
        : 0;
      quarterData.latestRating = ratings.length > 0 ? ratings[ratings.length - 1] : 0;

      if (quarterData.submissions.length > 0) {
        const dates = quarterData.submissions
          .map((s: any) => new Date(s.submittedAt))
          .sort((a: any, b: any) => a - b);
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        quarterData.dateRange = startDate.getTime() === endDate.getTime()
          ? startDate.toLocaleDateString()
          : `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      }
    });

    return data;
  }, [submissions]);

  const sortedQuarters = useMemo(() => {
    const quarters = Object.values(quarterlyData);
    const quarterOrder: { [key: string]: number } = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
    return quarters.sort((a: any, b: any) => {
      const aQuarter = a.quarter.split(' ')[0];
      const bQuarter = b.quarter.split(' ')[0];
      return (quarterOrder[aQuarter] || 0) - (quarterOrder[bQuarter] || 0);
    });
  }, [quarterlyData]);

  const filteredQuarters = useMemo(() => {
    let filtered = selectedQuarter
      ? sortedQuarters.filter((q: any) => q.quarter.startsWith(selectedQuarter))
      : sortedQuarters;

    if (dateFilter.from || dateFilter.to) {
      filtered = filtered.filter((quarterData: any) => {
        return quarterData.submissions.some((submission: any) => {
          const submissionDate = new Date(submission.submittedAt);
          const submissionDateOnly = new Date(
            submissionDate.getFullYear(),
            submissionDate.getMonth(),
            submissionDate.getDate()
          );
          const fromDateOnly = dateFilter.from
            ? new Date(
                dateFilter.from.getFullYear(),
                dateFilter.from.getMonth(),
                dateFilter.from.getDate()
              )
            : null;
          const toDateOnly = dateFilter.to
            ? new Date(
                dateFilter.to.getFullYear(),
                dateFilter.to.getMonth(),
                dateFilter.to.getDate()
              )
            : null;

          const isAfterFrom = !fromDateOnly || submissionDateOnly >= fromDateOnly;
          const isBeforeTo = !toDateOnly || submissionDateOnly <= toDateOnly;
          return isAfterFrom && isBeforeTo;
        });
      });
    }

    return filtered;
  }, [sortedQuarters, selectedQuarter, dateFilter]);

  return (
    <div className="relative">
      {isRefreshingHistory || loading ? (
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

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-28" />
                </div>
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
            <CardDescription>Complete timeline of your performance evaluations</CardDescription>
          </CardHeader>
          <CardContent>
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
                        disabled={isRefreshingQuarterly}
                        className="flex items-center bg-blue-500 text-white hover:bg-green-700 hover:text-white space-x-2"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    </div>

                    {/* Date Range Filter */}
                    <div className="mb-6">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700">Filter by Date Range:</span>
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn('w-[280px] justify-start text-left font-normal', !dateFilter.from && 'text-muted-foreground')}
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
                                'Pick a date range'
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
                          <Button variant="outline" size="sm" onClick={clearDateFilter} className="text-red-600 hover:text-red-700">
                            <X className="h-4 w-4 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Quarter Filter */}
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
                      </div>
                    </div>

                    <div className="relative max-h-[300px] md:max-h-[450px] lg:max-h-[650px] xl:max-h-[700px] overflow-y-auto overflow-x-auto scrollable-table">
                      {isRefreshingQuarterly ? (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                              <div className="relative">
                                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 font-medium">Loading quarterly data...</p>
                            </div>
                          </div>
                          <div className="space-y-2 p-4">
                            <div className="flex space-x-3 py-2 border-b">
                              <Skeleton className="h-3 w-12" />
                              <Skeleton className="h-3 w-18" />
                              <Skeleton className="h-3 w-14" />
                              <Skeleton className="h-3 w-12" />
                              <Skeleton className="h-3 w-16" />
                              <Skeleton className="h-3 w-10" />
                              <Skeleton className="h-3 w-12" />
                            </div>
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
                            {filteredQuarters.length > 0 ? (
                              filteredQuarters.map((quarterData: any) => {
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
                                    <TableCell className="font-medium">{quarterData.totalEvaluations}</TableCell>
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
                                      <Badge
                                        className={
                                          parseFloat(quarterData.averageRating) >= 4.5
                                            ? 'bg-green-100 text-green-800'
                                            : parseFloat(quarterData.averageRating) >= 4.0
                                            ? 'bg-blue-100 text-blue-800'
                                            : parseFloat(quarterData.averageRating) >= 3.5
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                        }
                                      >
                                        {parseFloat(quarterData.averageRating) >= 4.5
                                          ? 'Outstanding'
                                          : parseFloat(quarterData.averageRating) >= 4.0
                                          ? 'Exceeds Expectations'
                                          : parseFloat(quarterData.averageRating) >= 3.5
                                          ? 'Meets Expectations'
                                          : 'Needs Improvement'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          const quarterSubmissions = submissions.filter(
                                            (submission) =>
                                              getQuarterFromEvaluationData(submission.evaluationData || submission) === quarterData.quarter
                                          );
                                          if (quarterSubmissions.length > 0) {
                                            const approvalData = getApprovalData(quarterSubmissions[0].id);
                                            const submissionWithApproval = {
                                              ...quarterSubmissions[0],
                                              employeeSignature: approvalData?.employeeSignature || null,
                                              employeeApprovedAt: approvalData?.approvedAt || null,
                                            };
                                            onViewEvaluation(submissionWithApproval);
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
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                  <p>No quarterly data available</p>
                                  <p className="text-sm">Evaluations will be grouped by quarter once available</p>
                                </TableCell>
                              </TableRow>
                            )}
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
                        <CardDescription>Complete timeline of your performance evaluations</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshHistory}
                        disabled={isRefreshingHistory}
                        className="flex items-center bg-blue-500 text-white hover:bg-green-700 hover:text-white space-x-2"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          placeholder="Search by employee, evaluator, supervisor,."
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

                    <div className="max-h-[350px] md:max-h-[500px] lg:max-h-[700px] xl:max-h-[750px] overflow-y-auto overflow-x-auto scrollable-table">
                      {isRefreshingHistory ? (
                        <div className="space-y-2 p-4">
                          <div className="flex space-x-3 py-2 border-b">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-14" />
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-10" />
                            <Skeleton className="h-3 w-18" />
                            <Skeleton className="h-3 w-12" />
                          </div>
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
                            {filteredHistorySubmissions.length > 0 ? (
                              filteredHistorySubmissions
                                .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                                .map((submission) => {
                                  const highlight = getSubmissionHighlight(submission.submittedAt, filteredHistorySubmissions);
                                  return (
                                    <TableRow key={submission.id} className={highlight.className}>
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
                                            {submission.evaluationData
                                              ? calculateOverallRating(submission.evaluationData)
                                              : submission.rating}
                                          </span>
                                          <span className="text-gray-500">/5</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          className={getQuarterColor(
                                            getQuarterFromEvaluationData(submission.evaluationData || submission)
                                          )}
                                        >
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
                                              const approvalData = getApprovalData(submission.id);
                                              const submissionWithApproval = {
                                                ...submission,
                                                employeeSignature: approvalData?.employeeSignature || null,
                                                employeeApprovedAt: approvalData?.approvedAt || null,
                                              };
                                              onViewEvaluation(submissionWithApproval);
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
                                })
                            ) : (
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
                            )}
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
  );
}

