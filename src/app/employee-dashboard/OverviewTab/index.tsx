'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Eye, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/useToast";
import { getQuarterFromEvaluationData, getQuarterColor } from '@/lib/quarterUtils';
import clientDataService from '@/lib/clientDataService';

interface OverviewTabProps {
  onViewEvaluation: (submission: any) => void;
  isActive?: boolean;
}

export function OverviewTab({ onViewEvaluation, isActive = false }: OverviewTabProps) {
  const { profile } = useUser();
  const { success } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshingOverview, setIsRefreshingOverview] = useState(false);
  const [overviewSearchTerm, setOverviewSearchTerm] = useState('');
  const [overviewPage, setOverviewPage] = useState(1);
  const itemsPerPage = 4;
  const [approvedEvaluations, setApprovedEvaluations] = useState<Set<string>>(new Set());
  const isFirstMount = useRef(true);

  // Load approved evaluations from localStorage
  useEffect(() => {
    if (profile?.email) {
      const approved = JSON.parse(
        localStorage.getItem(`approvedEvaluations_${profile.email}`) || '[]'
      );
      setApprovedEvaluations(new Set(approved));
    }
  }, [profile?.email]);

  // Load submissions data
  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const allSubmissions = await clientDataService.getSubmissions();
      const userSubmissions = profile?.email
        ? allSubmissions.filter(
            (submission: any) =>
              submission.employeeName === profile.name ||
              submission.evaluationData?.employeeEmail === profile.email
          )
        : [];
      const finalSubmissions = userSubmissions.length > 0 ? userSubmissions : allSubmissions;
      setSubmissions(finalSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadSubmissions();
  }, [profile]);

  // Refresh when tab becomes active (but not on initial mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (isActive && profile) {
      const refreshOnTabClick = async () => {
        setIsRefreshingOverview(true);
        try {
          // Add delay to show spinner
          await new Promise((resolve) => setTimeout(resolve, 500));
          const allSubmissions = await clientDataService.getSubmissions();
          const userSubmissions = profile?.email
            ? allSubmissions.filter(
                (submission: any) =>
                  submission.employeeName === profile.name ||
                  submission.evaluationData?.employeeEmail === profile.email
              )
            : [];
          const finalSubmissions = userSubmissions.length > 0 ? userSubmissions : allSubmissions;
          setSubmissions(finalSubmissions);
        } catch (error) {
          console.error('Error refreshing on tab click:', error);
        } finally {
          setIsRefreshingOverview(false);
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

  const handleRefreshSubmissions = async () => {
    setIsRefreshingOverview(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const allSubmissions = await clientDataService.getSubmissions();
      const userSubmissions = profile?.email
        ? allSubmissions.filter(
            (submission: any) =>
              submission.employeeName === profile.name ||
              submission.evaluationData?.employeeEmail === profile.email
          )
        : [];
      const finalSubmissions = userSubmissions.length > 0 ? userSubmissions : allSubmissions;
      setSubmissions(finalSubmissions);
      success('Performance reviews refreshed successfully', 'All performance data has been updated');
    } catch (error) {
      console.error('Error refreshing submissions:', error);
    } finally {
      setIsRefreshingOverview(false);
    }
  };

  // Filter submissions based on search term
  const filteredSubmissions = useMemo(() => {
    if (!overviewSearchTerm) return submissions;

    const searchLower = overviewSearchTerm.toLowerCase();
    return submissions.filter((submission) => {
      const supervisor = (submission.evaluationData?.supervisor || 'not specified').toLowerCase();
      const rating = submission.evaluationData
        ? calculateOverallRating(submission.evaluationData).toString()
        : submission.rating.toString();
      const date = new Date(submission.submittedAt).toLocaleDateString().toLowerCase();
      const quarter = getQuarterFromEvaluationData(submission.evaluationData || submission).toLowerCase();
      const acknowledgement = isEvaluationApproved(submission.id) ? 'approved' : 'pending';

      return (
        supervisor.includes(searchLower) ||
        rating.includes(searchLower) ||
        date.includes(searchLower) ||
        quarter.includes(searchLower) ||
        acknowledgement.includes(searchLower)
      );
    });
  }, [submissions, overviewSearchTerm, approvedEvaluations]);

  // Pagination calculations
  const overviewTotalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const overviewStartIndex = (overviewPage - 1) * itemsPerPage;
  const overviewEndIndex = overviewStartIndex + itemsPerPage;
  const overviewPaginated = filteredSubmissions
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(overviewStartIndex, overviewEndIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setOverviewPage(1);
  }, [overviewSearchTerm]);

  return (
    <>
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
              disabled={isRefreshingOverview}
              className="flex items-center space-x-2 bg-blue-500 text-white hover:bg-green-700 hover:text-white"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh</span>
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative w-1/5">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <Input
              type="text"
              placeholder="Search by supervisor, rating, date."
              value={overviewSearchTerm}
              onChange={(e) => setOverviewSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            {overviewSearchTerm && (
              <button
                onClick={() => setOverviewSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5 text-lg" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isRefreshingOverview || loading ? (
            <div className="relative max-h-[350px] md:max-h-[500px] lg:max-h-[700px] xl:max-h-[750px] overflow-y-auto overflow-x-auto scrollable-table mx-4">
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading performance reviews...</p>
                </div>
              </div>
              <Table className="table-fixed w-full">
                <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
                  <TableRow>
                    <TableHead className="w-1/6 pl-4">Immediate Supervisor</TableHead>
                    <TableHead className="w-1/6 text-right pr-25">Rating</TableHead>
                    <TableHead className="w-1/6 pl-6">Date</TableHead>
                    <TableHead className="w-1/6 px-4 pr-23 text-center">Quarter</TableHead>
                    <TableHead className="w-1/6 text-center">Acknowledgement</TableHead>
                    <TableHead className="w-1/6 text-right pl-1 pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="w-1/6 pl-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-12 rounded-full" />
                        </div>
                      </TableCell>
                      <TableCell className="w-1/6 text-right pr-25">
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell className="w-1/6 pl-6">
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </TableCell>
                      <TableCell className="w-1/6 px-4 pr-23">
                        <Skeleton className="h-5 w-16 rounded-full mx-auto" />
                      </TableCell>
                      <TableCell className="w-1/6 text-center">
                        <Skeleton className="h-5 w-20 rounded-full mx-auto" />
                      </TableCell>
                      <TableCell className="w-1/6 text-right pl-1 pr-4">
                        <Skeleton className="h-8 w-16" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg mb-2">No performance reviews yet</div>
              <div className="text-gray-400 text-sm">
                Your evaluations will appear here once they are completed by your manager.
              </div>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg mb-2">No results found</div>
              <div className="text-gray-400 text-sm mb-4">
                No performance reviews match "{overviewSearchTerm}"
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverviewSearchTerm('')}
                className="text-white hover:text-white bg-blue-500 hover:bg-blue-600"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <>
              {overviewSearchTerm && (
                <div className="mb-3 mx-4 text-sm text-gray-600">
                  Found <span className="font-semibold text-blue-600">{filteredSubmissions.length}</span>{' '}
                  result{filteredSubmissions.length !== 1 ? 's' : ''} for "{overviewSearchTerm}"
                </div>
              )}

              <div className="mb-3 mx-4 flex flex-wrap gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
                  <Badge className="bg-green-200 text-green-800 text-xs">Approved</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-100 border-l-2 border-l-yellow-500 rounded"></div>
                  <Badge className="bg-yellow-200 text-yellow-800 text-xs">New</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-50 border-l-2 border-l-blue-500 rounded"></div>
                  <Badge className="bg-blue-300 text-blue-800 text-xs">Recent</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className="text-white bg-orange-500 text-xs">Pending</Badge>
                </div>
              </div>

              <div className="max-h-[350px] md:max-h-[500px] lg:max-h-[700px] xl:max-h-[750px] overflow-y-auto overflow-x-auto scrollable-table mx-4">
                <Table className="table-fixed w-full">
                  <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
                    <TableRow>
                      <TableHead className="w-1/6 pl-4">Immediate Supervisor</TableHead>
                      <TableHead className="w-1/6 text-right pr-25">Rating</TableHead>
                      <TableHead className="w-1/6 pl-6">Date</TableHead>
                      <TableHead className="w-1/6 px-4 pr-23 text-center">Quarter</TableHead>
                      <TableHead className="w-1/6 text-center">Acknowledgement</TableHead>
                      <TableHead className="w-1/6 text-right pl-1 pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overviewPaginated.map((submission) => {
                        const highlight = getSubmissionHighlight(
                          submission.submittedAt,
                          submissions,
                          submission.id
                        );
                        return (
                          <TableRow key={submission.id} className={highlight.className}>
                            <TableCell className="w-1/6 font-medium pl-4">
                              <div className="flex items-center gap-2">
                                {submission.evaluationData?.supervisor || 'Not specified'}
                                {highlight.badge && (
                                  <Badge variant="secondary" className={`${highlight.badge.className} text-xs`}>
                                    {highlight.badge.text}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="w-1/6 text-right font-semibold pr-25">
                              {submission.evaluationData
                                ? calculateOverallRating(submission.evaluationData)
                                : submission.rating}
                              /5
                            </TableCell>
                            <TableCell className="w-1/6 pl-6">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {new Date(submission.submittedAt).toLocaleDateString()}
                                </span>
                                <span className="text-xs text-gray-500">{getTimeAgo(submission.submittedAt)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="w-1/6 px-4 pr-23">
                              <div className="flex justify-center">
                                <Badge
                                  className={getQuarterColor(
                                    getQuarterFromEvaluationData(submission.evaluationData || submission)
                                  )}
                                >
                                  {getQuarterFromEvaluationData(submission.evaluationData || submission)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="w-1/6">
                              <div className="flex justify-center">
                                {isEvaluationApproved(submission.id) ? (
                                  <Badge className="bg-green-100 text-green-800">✓ Approved</Badge>
                                ) : (
                                  <Badge className="text-white bg-orange-500 border-orange-300">Pending</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="w-1/6 text-right pl-1 pr-4">
                              <Button
                                className="bg-blue-500 text-white hover:bg-green-700 hover:text-white"
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
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls - Show when more than 4 items */}
              {filteredSubmissions.length > 4 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-0 mt-3 md:mt-4 px-4">
                  <div className="text-xs md:text-sm text-gray-600 order-2 sm:order-1">
                    Showing {overviewStartIndex + 1} to {Math.min(overviewEndIndex, filteredSubmissions.length)} of {filteredSubmissions.length} records
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOverviewPage(prev => Math.max(1, prev - 1))}
                      disabled={overviewPage === 1}
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
                              onClick={() => setOverviewPage(page)}
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
                      onClick={() => setOverviewPage(prev => Math.min(overviewTotalPages, prev + 1))}
                      disabled={overviewPage === overviewTotalPages}
                      className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

