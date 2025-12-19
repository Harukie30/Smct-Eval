"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getQuarterFromEvaluationData,
  getQuarterColor,
} from "@/lib/quarterUtils";

interface OverviewTabProps {
  recentSubmissions: any[];
  seenSubmissions: Set<number>;
  isRefreshing: boolean;
  isFeedbackRefreshing: boolean;
  onRefresh: () => void;
  onViewEvaluation: (submission: any) => void;
  onMarkAsSeen: (submissionId: number) => void;
  getSubmissionHighlight: (
    submittedAt: string,
    submissionId: number,
    approvalStatus?: string
  ) => any;
  getTimeAgo: (submittedAt: string) => string;
  calculateOverallRating: (evaluationData: any) => number;
  isActive?: boolean;
}

export default function OverviewTab() {
  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewPage, setOverviewPage] = useState(1);
  const itemsPerPage = 4;

  // Ensure scrollbar is always visible
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .overview-table::-webkit-scrollbar {
        width: 12px;
        height: 12px;
        -webkit-appearance: none;
      }
      .overview-table::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 6px;
      }
      .overview-table::-webkit-scrollbar-thumb {
        background: #94a3b8;
        border-radius: 6px;
        border: 2px solid #f1f5f9;
      }
      .overview-table::-webkit-scrollbar-thumb:hover {
        background: #64748b;
      }
      /* Force scrollbar to always be visible */
      .overview-table {
        scrollbar-width: thin;
        scrollbar-color: #94a3b8 #f1f5f9;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Filter submissions for overview table
  const filteredSubmissions = useMemo(() => {
    return recentSubmissions.filter((submission) => {
      // Ensure submission is valid
      if (!submission || !submission.employeeName) {
        return false;
      }

      if (!overviewSearch.trim()) return true;
      const searchTerm = overviewSearch.toLowerCase();
      return (
        submission.employeeName.toLowerCase().includes(searchTerm) ||
        (submission.evaluator || "").toLowerCase().includes(searchTerm)
      );
    });
  }, [recentSubmissions, overviewSearch]);

  // Pagination calculations
  const sortedFilteredSubmissions = useMemo(() => {
    return [...filteredSubmissions].sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [filteredSubmissions]);

  const overviewTotalPages = Math.ceil(
    sortedFilteredSubmissions.length / itemsPerPage
  );
  const overviewStartIndex = (overviewPage - 1) * itemsPerPage;
  const overviewEndIndex = overviewStartIndex + itemsPerPage;
  const overviewPaginated = sortedFilteredSubmissions.slice(
    overviewStartIndex,
    overviewEndIndex
  );

  // Reset to page 1 when search term changes
  useEffect(() => {
    setOverviewPage(1);
  }, [overviewSearch]);

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Recent Submissions
            {(() => {
              const newCount = filteredSubmissions.filter((sub) => {
                const hoursDiff =
                  (new Date().getTime() - new Date(sub.submittedAt).getTime()) /
                  (1000 * 60 * 60);
                return hoursDiff <= 24 && !seenSubmissions.has(sub.id);
              }).length;
              return newCount > 0 ? (
                <Badge className="bg-yellow-500 text-white animate-pulse">
                  {newCount} NEW
                </Badge>
              ) : null;
            })()}
          </CardTitle>
          <CardDescription>
            Latest items awaiting evaluation ({filteredSubmissions.length}{" "}
            total)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Search and Filter Controls */}
          <div className="px-6 py-4 flex gap-2 border-b border-gray-200">
            <Input
              placeholder="Search submissions by employee name or evaluator..."
              value={overviewSearch}
              onChange={(e) => setOverviewSearch(e.target.value)}
              className="w-1/2 bg-gray-100"
            />
            {overviewSearch && (
              <Button
                size="sm"
                onClick={() => setOverviewSearch("")}
                className="px-3 py-2 text-white hover:text-white bg-blue-400 hover:bg-blue-500"
              >
                ⌫ Clear
              </Button>
            )}
            <Button
              size="sm"
              onClick={onRefresh}
              disabled={isFeedbackRefreshing}
              className="px-3 py-2 text-white hover:text-white bg-blue-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="Refresh submissions data"
            >
              {isFeedbackRefreshing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  {" "}
                  Refresh{" "}
                  <span>
                    <RefreshCw className="h-3 w-3" />
                  </span>{" "}
                </>
              )}
            </Button>
          </div>
          {isRefreshing ? (
            <div className="relative max-h-[350px] md:max-h-[500px] lg:max-h-[700px] xl:max-h-[750px] overflow-y-auto overflow-x-auto scrollable-table overview-table">
              {/* Centered Loading Spinner */}
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
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
                    Loading submissions...
                  </p>
                </div>
              </div>

              {/* Table structure visible in background */}
              <Table className="table-fixed w-full">
                <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                  <TableRow key="overview-header">
                    <TableHead className="w-1/5 pl-4">Employee</TableHead>
                    <TableHead className="w-1/5 text-center pl-4">
                      Rating
                    </TableHead>
                    <TableHead className="w-1/5 text-center">Date</TableHead>
                    <TableHead className="w-1/5 text-right pr-6">
                      Quarter
                    </TableHead>
                    <TableHead className="w-1/5 text-right pl-1 pr-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell className="w-1/5 pl-4">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-1/5 pl-4">
                        <Skeleton className="h-6 w-20 rounded-full mx-auto" />
                      </TableCell>
                      <TableCell className="w-1/5">
                        <div className="flex flex-col items-center space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </TableCell>
                      <TableCell className="w-1/5 text-right pr-6">
                        <Skeleton className="h-6 w-16 rounded-full ml-auto" />
                      </TableCell>
                      <TableCell className="w-1/5 text-right pl-1 pr-4">
                        <Skeleton className="h-8 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <>
              {/* Simple Legend */}
              <div className="m-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
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
                    <div className="w-2 h-2 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
                    <Badge className="bg-green-500 text-white text-xs">
                      Approved
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Scrollable Table */}
              <div className="max-h-[350px] md:max-h-[500px] lg:max-h-[700px] xl:max-h-[750px] overflow-y-auto overflow-x-auto scrollable-table overview-table">
                <Table className="table-fixed w-full">
                  <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                    <TableRow key="overview-header">
                      <TableHead className="w-1/5 pl-4">Employee</TableHead>
                      <TableHead className="w-1/5 text-center pl-4">
                        Rating
                      </TableHead>
                      <TableHead className="w-1/5 text-center">Date</TableHead>
                      <TableHead className="w-1/5 text-right pr-6">
                        Quarter
                      </TableHead>
                      <TableHead className="w-1/5 text-right pl-1 pr-4">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFilteredSubmissions.length === 0 ? (
                      <TableRow key="no-submissions">
                        <TableCell
                          colSpan={5}
                          className="px-6 py-12 text-center"
                        >
                          <div className="flex flex-col items-center justify-center gap-4">
                            <img
                              src="/not-found.gif"
                              alt="No data"
                              className="w-25 h-25 object-contain"
                              style={{
                                imageRendering: "auto",
                                willChange: "auto",
                                transform: "translateZ(0)",
                                backfaceVisibility: "hidden",
                                WebkitBackfaceVisibility: "hidden",
                              }}
                            />
                            <div className="text-gray-500">
                              {overviewSearch.trim() ? (
                                <>
                                  <p className="text-base font-medium mb-1">
                                    No submissions found
                                  </p>
                                  <p className="text-sm">
                                    Try adjusting your search criteria
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-base font-medium mb-1">
                                    No recent submissions
                                  </p>
                                  <p className="text-sm">
                                    Start evaluating employees to see
                                    submissions here
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      overviewPaginated.map((submission) => {
                        // Check if both parties have signed - must be actual signature images (base64 data URLs)
                        const hasEmployeeSignature = !!(
                          (submission.employeeSignature &&
                            submission.employeeSignature.trim() &&
                            submission.employeeSignature.startsWith(
                              "data:image"
                            )) ||
                          (submission.evaluationData?.employeeSignature &&
                            submission.evaluationData.employeeSignature.trim() &&
                            submission.evaluationData.employeeSignature.startsWith(
                              "data:image"
                            ))
                        );

                        const hasEvaluatorSignature = !!(
                          (submission.evaluationData?.evaluatorSignatureImage &&
                            submission.evaluationData.evaluatorSignatureImage.trim() &&
                            submission.evaluationData.evaluatorSignatureImage.startsWith(
                              "data:image"
                            )) ||
                          ((submission as any).evaluatorSignatureImage &&
                            (
                              submission as any
                            ).evaluatorSignatureImage.trim() &&
                            (
                              submission as any
                            ).evaluatorSignatureImage.startsWith("data:image"))
                        );

                        // Determine approval status
                        let actualApprovalStatus = "pending";
                        if (hasEmployeeSignature && hasEvaluatorSignature) {
                          actualApprovalStatus = "fully_approved";
                        } else if (hasEmployeeSignature) {
                          actualApprovalStatus = "employee_approved";
                        } else if (
                          submission.approvalStatus &&
                          submission.approvalStatus !== "pending"
                        ) {
                          actualApprovalStatus = submission.approvalStatus;
                        } else {
                          actualApprovalStatus = "pending";
                        }

                        const highlight = getSubmissionHighlight(
                          submission.submittedAt,
                          submission.id,
                          actualApprovalStatus
                        );
                        return (
                          <TableRow
                            key={submission.id}
                            className={highlight.className}
                            onClick={() => onMarkAsSeen(submission.id)}
                          >
                            <TableCell className="w-1/5 font-medium pl-4">
                              <div className="flex items-center gap-2">
                                {submission.employeeName}
                                {highlight.badge && (
                                  <Badge
                                    variant="secondary"
                                    className={`${highlight.badge.className} text-xs`}
                                  >
                                    {highlight.badge.text}
                                  </Badge>
                                )}
                                {highlight.secondaryBadge && (
                                  <Badge
                                    variant="secondary"
                                    className={`${highlight.secondaryBadge.className} text-xs`}
                                  >
                                    {highlight.secondaryBadge.text}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="w-1/5 pl-4">
                              <div className="flex justify-center">
                                <span className="font-semibold">
                                  {(() => {
                                    if (submission.evaluationData) {
                                      const calculatedRating =
                                        calculateOverallRating(
                                          submission.evaluationData
                                        );
                                      if (
                                        calculatedRating > 0 &&
                                        calculatedRating <= 5
                                      ) {
                                        return `${calculatedRating}/5`;
                                      }
                                    }
                                    return `${submission.rating || "N/A"}/5`;
                                  })()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="w-1/5">
                              <div className="flex flex-col items-center">
                                <span className="font-medium">
                                  {new Date(
                                    submission.submittedAt
                                  ).toLocaleDateString()}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {getTimeAgo(submission.submittedAt)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="w-1/5 text-right pr-6">
                              <Badge
                                className={getQuarterColor(
                                  getQuarterFromEvaluationData(
                                    submission.evaluationData || submission
                                  )
                                )}
                              >
                                {getQuarterFromEvaluationData(
                                  submission.evaluationData || submission
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="w-1/5 text-right pl-1 pr-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkAsSeen(submission.id);
                                  onViewEvaluation(submission);
                                }}
                                className="bg-blue-500 hover:bg-blue-200 text-white border-blue-200"
                              >
                                <Eye className="w-4 h-4" />
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

              {/* Pagination Controls - Show when more than 4 items */}
              {sortedFilteredSubmissions.length > 4 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-0 mt-3 md:mt-4 px-4">
                  <div className="text-xs md:text-sm text-gray-600 order-2 sm:order-1">
                    Showing {overviewStartIndex + 1} to{" "}
                    {Math.min(
                      overviewEndIndex,
                      sortedFilteredSubmissions.length
                    )}{" "}
                    of {sortedFilteredSubmissions.length} records
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setOverviewPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={overviewPage === 1}
                      className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-0.5 md:gap-1">
                      {Array.from(
                        { length: overviewTotalPages },
                        (_, i) => i + 1
                      ).map((page) => {
                        if (
                          page === 1 ||
                          page === overviewTotalPages ||
                          (page >= overviewPage - 1 && page <= overviewPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={
                                overviewPage === page ? "default" : "outline"
                              }
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
                        } else if (
                          page === overviewPage - 2 ||
                          page === overviewPage + 2
                        ) {
                          return (
                            <span
                              key={page}
                              className="text-gray-400 text-xs md:text-sm"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setOverviewPage((prev) =>
                          Math.min(overviewTotalPages, prev + 1)
                        )
                      }
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
    </div>
  );
}
