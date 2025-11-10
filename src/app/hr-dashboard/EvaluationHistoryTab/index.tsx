'use client';

import { useState } from 'react';
import { X, RefreshCw, Eye, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { getQuarterFromEvaluationData, getQuarterColor } from '@/lib/quarterUtils';

interface EvaluationHistoryTabProps {
  recentSubmissions: any[];
  loading: boolean;
  historyRefreshing: boolean;
  quarterlyRefreshing: boolean;
  calculateOverallRating: (evaluationData: any) => number;
  getSubmissionHighlight: (submittedAt: string, submissionId: number, approvalStatus?: string) => any;
  getTimeAgo: (submittedAt: string) => string;
  isNewSubmission: (submittedAt: string) => boolean;
  getQuarterColor: (quarter: string) => string;
  onRefreshQuarterly: () => Promise<void>;
  onRefreshHistory: () => Promise<void>;
  onViewSubmission: (submission: any) => void;
  isActive?: boolean;
}

export function EvaluationHistoryTab({
  recentSubmissions,
  loading,
  historyRefreshing,
  quarterlyRefreshing,
  calculateOverallRating,
  getSubmissionHighlight,
  getTimeAgo,
  isNewSubmission,
  getQuarterColor,
  onRefreshQuarterly,
  onRefreshHistory,
  onViewSubmission,
  isActive = false
}: EvaluationHistoryTabProps) {
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [quarterlySearchTerm, setQuarterlySearchTerm] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<{from?: Date, to?: Date}>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showRefreshingDialog, setShowRefreshingDialog] = useState(false);
  const [refreshingMessage, setRefreshingMessage] = useState('');

  const clearDateFilter = () => {
    setDateFilter({});
  };

  const handleRefreshQuarterly = async () => {
    setShowRefreshingDialog(true);
    setRefreshingMessage('Refreshing quarterly performance...');
    try {
      await onRefreshQuarterly();
    } finally {
      setShowRefreshingDialog(false);
    }
  };

  const handleRefreshHistory = async () => {
    setShowRefreshingDialog(true);
    setRefreshingMessage('Refreshing evaluation history...');
    try {
      await onRefreshHistory();
    } finally {
      setShowRefreshingDialog(false);
    }
  };

  return (
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
                                            onViewSubmission(quarterSubmissions[0]);
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
                                              onViewSubmission(submission);
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
  );
}

