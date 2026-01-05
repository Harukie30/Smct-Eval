'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, RefreshCw, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [quarterlySearchTerm, setQuarterlySearchTerm] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 8;

  // Get available years from submissions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    recentSubmissions.forEach((submission) => {
      const year = new Date(submission.submittedAt).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  }, [recentSubmissions]);

  // Calculate filtered quarters with useMemo
  const filteredQuarters = useMemo(() => {
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
      const aQuarter = a.quarter ? a.quarter.split(' ')[0] : '';
      const bQuarter = b.quarter ? b.quarter.split(' ')[0] : '';
      return (quarterOrder[aQuarter] || 0) - (quarterOrder[bQuarter] || 0);
    });

    // Filter quarters based on selected quarter and year
    let filtered = selectedQuarter
      ? sortedQuarters.filter((q: any) => q.quarter.startsWith(selectedQuarter))
      : sortedQuarters;

    // Apply year filter - match both quarter year and submission year
    if (selectedYear && selectedYear !== 'all') {
      const year = parseInt(selectedYear);
      filtered = filtered.filter((quarterData: any) => {
        // Extract year from quarter string (e.g., "Q1 2024" -> "2024")
        const quarterYear = quarterData.quarter ? quarterData.quarter.split(' ')[1] : '';
        const quarterYearMatches = quarterYear === selectedYear;
        
        // Also check if any submission in this quarter matches the year
        const submissionYearMatches = quarterData.submissions.some((submission: any) => {
          const submissionYear = new Date(submission.submittedAt).getFullYear();
          return submissionYear === year;
        });
        
        // Match if either the quarter year or submission year matches
        return quarterYearMatches || submissionYearMatches;
      });
    }

    // Filter by search term
    if (quarterlySearchTerm) {
      filtered = filtered.filter((quarterData: any) => {
        const searchLower = quarterlySearchTerm.toLowerCase();
        return quarterData.quarter.toLowerCase().includes(searchLower) ||
          quarterData.submissions.some((s: any) =>
            s.employeeName?.toLowerCase().includes(searchLower) ||
            s.evaluatorName?.toLowerCase().includes(searchLower)
          );
      });
    }

    return filtered as any[];
  }, [recentSubmissions, selectedQuarter, selectedYear, quarterlySearchTerm, calculateOverallRating]);

  // Pagination calculations
  const historyTotalPages = Math.ceil(filteredQuarters.length / itemsPerPage);
  const historyStartIndex = (historyPage - 1) * itemsPerPage;
  const historyEndIndex = historyStartIndex + itemsPerPage;
  const historyPaginated = filteredQuarters.slice(historyStartIndex, historyEndIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setHistoryPage(1);
  }, [selectedQuarter, selectedYear, quarterlySearchTerm]);

  const clearYearFilter = () => {
    setSelectedYear('all');
    setHistoryPage(1);
  };

  const handleRefreshQuarterly = async () => {
    try {
      await onRefreshQuarterly();
    } catch (error) {
      console.error('Error refreshing quarterly data:', error);
    }
  };

  return (
    <div className="relative">
      {loading ? (
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
                            <svg className="h-5 w-5 text-red-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Year Filter */}
                    <div className="mb-6">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700">Filter by Year:</span>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                          <SelectTrigger className="w-[180px]">
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
                        {selectedYear && selectedYear !== 'all' && (
                          <Button variant="outline" size="sm" onClick={clearYearFilter} className="text-red-600 hover:text-red-700">
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
                      {quarterlyRefreshing || loading ? (
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
                            {historyPaginated.length > 0 ? (
                              historyPaginated.map((quarterData: any) => {
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

          {/* Pagination Controls - Outside table, centered */}
          {filteredQuarters.length > 7 && (
            <div className="w-full flex flex-col items-center justify-center py-4 px-4">
              <div className="text-center text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                Showing {historyStartIndex + 1} to {Math.min(historyEndIndex, filteredQuarters.length)} of {filteredQuarters.length} records
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                  disabled={historyPage === 1}
                  className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-0.5 md:gap-1">
                  {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === historyTotalPages ||
                      (page >= historyPage - 1 && page <= historyPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={historyPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setHistoryPage(page)}
                          className={`text-xs md:text-sm w-7 h-7 md:w-8 md:h-8 p-0 ${
                            historyPage === page
                              ? "bg-blue-700 text-white hover:bg-blue-500 hover:text-white"
                              : "bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === historyPage - 2 || page === historyPage + 2) {
                      return <span key={page} className="text-gray-400 text-xs md:text-sm">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(prev => Math.min(historyTotalPages, prev + 1))}
                  disabled={historyPage === historyTotalPages}
                  className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

