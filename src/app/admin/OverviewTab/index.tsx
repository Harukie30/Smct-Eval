"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import clientDataService from "@/lib/apiService";
// import accountsDataRaw from "@/data/accounts.json";
import ViewResultsModal from "@/components/evaluation/ViewResultsModal";

// const accountsData = accountsDataRaw.accounts || [];

interface Review {
  id: number;
  employee: any;
  evaluator: any;
  reviewTypeProbationary: number | string;
  reviewTypeRegular: number | string;
  created_at: string;
  rating: number;
  status: string;
}

interface DashboardTotals {
  total_users: number;
  total_pending_users: number;
  total_active_users: number;
  total_evaluations: number;
  total_pending_evaluations: number;
  total_completed_evaluations: number;
  total_declined_users: number;
}

export function OverviewTab() {
  const [evaluatedReviews, setEvaluatedReviews] = useState<Review[]>([]);
  const [dashboardTotals, setDashboardTotals] =
    useState<DashboardTotals | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isViewResultsModalOpen, setIsViewResultsModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [overviewPage, setOverviewPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [overviewTotal, setOverviewTotal] = useState(0);
  const [overviewTotalPages, setOverviewTotalPages] = useState(1);
  const [overviewStartIndex, setOverviewStartIndex] = useState(0);
  const [overviewEndIndex, setOverviewEndIndex] = useState(0);

  useEffect(() => {
    const loadDashboardTotals = async () => {
      const getTotals = await clientDataService.adminDashboard();
      setDashboardTotals(getTotals);
    };
    loadDashboardTotals();
  }, []);

  const loadEvaluations = async (searchValue: string) => {
    const response = await clientDataService.getSubmissions(
      searchValue,
      overviewPage,
      itemsPerPage
    );

    setEvaluatedReviews(response.data);
    setOverviewTotal(response.total);
    setOverviewTotalPages(response.last_page);
    setOverviewStartIndex((response.current_page - 1) * response.per_page);
    setOverviewEndIndex(response.current_page * response.per_page);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch API whenever debounced search term changes
  useEffect(() => {
    const fetchData = async () => {
      setRefreshing(true);
      try {
        await loadEvaluations(debouncedSearchTerm);
      } catch (error) {
        console.error("Error refreshing data:", error);
      } finally {
        setRefreshing(false);
      }
    };

    fetchData();
  }, [debouncedSearchTerm]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await loadEvaluations(debouncedSearchTerm);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const getQuarterColor = (quarter: string): string => {
    if (quarter.includes("Q1")) return "bg-blue-100 text-blue-800";
    if (quarter.includes("Q2")) return "bg-green-100 text-green-800";
    if (quarter.includes("Q3")) return "bg-yellow-100 text-yellow-800";
    return "bg-purple-100 text-purple-800";
  };

  const handleViewEvaluation = async (review: Review) => {
    try {
      const submission = await clientDataService.getSubmissionById(review.id);

      if (submission) {
        setSelectedSubmission(submission);
        setIsViewResultsModalOpen(true);
      } else {
        console.error("Submission not found for review ID:", review.id);
      }
    } catch (error) {
      console.error("Error fetching submission details:", error);
    }
  };

  return (
    <>
      <div className="flex w-1/2 gap-4 mb-5">
        <Card className="w-3/4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {dashboardTotals?.total_users}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {dashboardTotals?.total_active_users} active
            </p>
            <p className="text-xs text-orange-500 mt-1">
              {dashboardTotals?.total_pending_users} pending
            </p>
            <p className="text-xs text-red-500 mt-1">
              {dashboardTotals?.total_declined_users} rejected
            </p>
          </CardContent>
        </Card>

        <Card className="w-3/4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {dashboardTotals?.total_evaluations}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {dashboardTotals?.total_completed_evaluations} completed
            </p>
            <p className="text-sm text-orange-500 mt-1">
              {dashboardTotals?.total_pending_evaluations} pending
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        {/* Main Container Div (replacing Card) */}
        <div className="bg-white border rounded-lg p-6">
          {/* Table Header Section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900">
                Recent Evaluation Records
              </h2>
              {(() => {
                const now = new Date();
                const newCount = evaluatedReviews.filter((review) => {
                  const hoursDiff =
                    (now.getTime() - new Date(review.created_at).getTime()) /
                    (1000 * 60 * 60);
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
            </div>
            {/* Search Bar and Refresh Button */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="Search by employee, department, position, evaluator, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
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
                disabled={refreshing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                title="Refresh evaluation records"
              >
                {refreshing ? (
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
          </div>

          {/* Indicator Legend */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="text-sm font-medium text-gray-700 mr-2">
                Indicators:
              </span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-100 border-l-2 border-l-yellow-500 rounded"></div>
                <Badge className="bg-yellow-200 text-yellow-800 text-xs">
                  New
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-50 border-l-2 border-l-blue-500 rounded"></div>
                <Badge className="bg-blue-300 text-blue-800 text-xs">
                  Recent
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-50 border-l-2 border-l-red-500 rounded"></div>
                <Badge className="bg-orange-300 text-orange-800 text-xs">
                  Pending
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
                <Badge className="bg-green-500 text-white text-xs">
                  Completed
                </Badge>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="border rounded-lg overflow-hidden">
            <div
              className="relative max-h-[600px] overflow-y-auto overflow-x-auto"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#cbd5e1 #f1f5f9",
              }}
            >
              {refreshing && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-white/80">
                  <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                    <div className="relative">
                      {/* Spinning ring */}
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                      {/* Logo in center */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img
                          src="/smct.png"
                          alt="SMCT Logo"
                          className="h-10 w-10 object-contain"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                      Refreshing...
                    </p>
                  </div>
                </div>
              )}
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                  <TableRow>
                    <TableHead className="px-6 py-3">Employee Name</TableHead>
                    <TableHead className="px-6 py-3">Position</TableHead>
                    <TableHead className="px-6 py-3">Evaluator</TableHead>
                    <TableHead className="px-6 py-3">Quarter</TableHead>
                    <TableHead className="px-6 py-3">Date</TableHead>
                    <TableHead className="px-6 py-3">Status</TableHead>
                    <TableHead className="px-6 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200">
                  {refreshing ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Skeleton className="h-8 w-16" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : evaluatedReviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="text-gray-500">
                          {searchTerm ? (
                            <>
                              <p className="text-sm font-medium">
                                No results found
                              </p>
                              <p className="text-xs mt-1">
                                Try adjusting your search or filters
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm">
                                No evaluation records to display
                              </p>
                              <p className="text-xs mt-1">
                                Records will appear here when evaluations are
                                submitted
                              </p>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    evaluatedReviews.map((review) => {
                      const submittedDate = new Date(review.created_at);
                      const now = new Date();
                      const hoursDiff =
                        (now.getTime() - submittedDate.getTime()) /
                        (1000 * 60 * 60);
                      const isNew = hoursDiff <= 24;
                      const isRecent = hoursDiff > 24 && hoursDiff <= 168; // 7 days
                      const isCompleted = review.status === "completed";
                      const isPending = review.status === "pending";

                      // Determine row background color
                      let rowClassName = "hover:bg-gray-100 transition-colors";
                      if (isCompleted) {
                        rowClassName =
                          "bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500 transition-colors";
                      } else if (isNew) {
                        rowClassName =
                          "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500 transition-colors";
                      } else if (isRecent) {
                        rowClassName =
                          "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500 transition-colors";
                      } else if (isPending) {
                        rowClassName =
                          "bg-orange-50 hover:bg-orange-100 border-l-4 border-l-orange-500 transition-colors";
                      }

                      return (
                        <TableRow key={review.id} className={rowClassName}>
                          <TableCell className="px-6 py-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {review.employee?.fname +
                                    " " +
                                    review.employee?.lname}
                                </span>
                                {isNew && (
                                  <Badge className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 font-semibold">
                                    ⚡ NEW
                                  </Badge>
                                )}
                                {!isNew && isRecent && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 font-semibold">
                                    🕐 RECENT
                                  </Badge>
                                )}
                                {isPending && (
                                  <Badge className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 font-semibold">
                                    🕐 PENDING
                                  </Badge>
                                )}

                                {isCompleted && (
                                  <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0.5 font-semibold">
                                    ✓ COMPLETED
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3 text-sm text-gray-600">
                            {review.employee?.positions.label}
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <div className="font-medium text-gray-900">
                              {review.evaluator?.fname +
                                " " +
                                review.evaluator?.lname}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Badge
                              className={getQuarterColor(
                                String(
                                  review.reviewTypeRegular ||
                                    review.reviewTypeProbationary
                                )
                              )}
                            >
                              {review.reviewTypeRegular ||
                                review.reviewTypeProbationary}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3 text-sm text-gray-600">
                            {new Date(review.created_at).toLocaleString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Badge
                              className={
                                review.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : review.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {review.status === "completed"
                                ? `✓ ${review.status}`
                                : review.status === "pending"
                                ? `⏳ ${review.status}`
                                : review.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleViewEvaluation(review)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls */}
          {overviewTotal > itemsPerPage && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-gray-600">
                Showing {overviewStartIndex + 1} to{" "}
                {Math.min(overviewEndIndex, overviewTotal)} of {overviewTotal}{" "}
                records
              </div>

              <div className="flex items-center gap-2">
                {/* PREVIOUS */}
                <Button
                  size="sm"
                  onClick={() => {
                    setOverviewPage((prev) => Math.max(1, prev - 1));
                    loadEvaluations(searchTerm);
                  }}
                  disabled={overviewPage === 1}
                  className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                >
                  Previous
                </Button>

                {/* PAGE NUMBERS */}
                {[...Array(overviewTotalPages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === overviewTotalPages ||
                    (page >= overviewPage - 1 && page <= overviewPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        size="sm"
                        onClick={() => {
                          setOverviewPage(page);
                          loadEvaluations(searchTerm);
                        }}
                        variant={overviewPage === page ? "default" : "outline"}
                        className="text-xs w-8 h-8 p-0 bg-blue-700 text-white hover:bg-blue-500 hover:text-white"
                      >
                        {page}
                      </Button>
                    );
                  }
                  return null;
                })}

                {/* NEXT */}
                <Button
                  size="sm"
                  onClick={() => {
                    setOverviewPage((prev) =>
                      Math.min(overviewTotalPages, prev + 1)
                    );
                    loadEvaluations(searchTerm);
                  }}
                  disabled={overviewPage === overviewTotalPages}
                  className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

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
    </>
  );
}
