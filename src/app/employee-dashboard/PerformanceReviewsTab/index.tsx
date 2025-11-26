"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Eye } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/useToast";
import {
  getQuarterFromEvaluationData,
  getQuarterColor,
} from "@/lib/quarterUtils";
import clientDataService from "@/lib/clientDataService";

interface PerformanceReviewsTabProps {
  isActive?: boolean;
  onViewEvaluation: (submission: any) => void;
}

export function PerformanceReviewsTab({
  isActive = false,
  onViewEvaluation,
}: PerformanceReviewsTabProps) {
  const { profile } = useUser();
  const { success } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshingReviews, setIsRefreshingReviews] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const itemsPerPage = 4;
  const [approvedEvaluations, setApprovedEvaluations] = useState<Set<string>>(
    new Set()
  );
  const isFirstMount = useRef(true);

  // Load approved evaluations
  useEffect(() => {
    if (profile?.email) {
      const approved = JSON.parse(
        localStorage.getItem(`approvedEvaluations_${profile.email}`) || "[]"
      );
      setApprovedEvaluations(new Set(approved));
    }
  }, [profile?.email]);

  // Load submissions data
  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const allSubmissions = await clientDataService.getSubmissions();
      const userFullName = profile ? `${profile.fname} ${profile.lname}`.trim() : '';
      const userSubmissions = profile?.email
        ? allSubmissions.filter(
            (submission: any) =>
              submission.employeeName === userFullName ||
              submission.evaluationData?.employeeEmail === profile.email
          )
        : [];
      const finalSubmissions =
        userSubmissions.length > 0 ? userSubmissions : allSubmissions;
      setSubmissions(finalSubmissions);
    } catch (error) {
      console.error("Error loading submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadSubmissions();
  }, [profile]);

  // Refresh when tab becomes active
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (isActive && profile) {
      const refreshOnTabClick = async () => {
        setIsRefreshingReviews(true);
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await loadSubmissions();
        } catch (error) {
          console.error("Error refreshing on tab click:", error);
        } finally {
          setIsRefreshingReviews(false);
        }
      };
      refreshOnTabClick();
    }
  }, [isActive, profile]);

  const handleRefreshSubmissions = async () => {
    setIsRefreshingReviews(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await loadSubmissions();
      success(
        "Performance reviews refreshed successfully",
        "All performance data has been updated"
      );
    } catch (error) {
      console.error("Error refreshing submissions:", error);
    } finally {
      setIsRefreshingReviews(false);
    }
  };

  // Helper functions
  const getTimeAgo = (submittedAt: string) => {
    const submissionDate = new Date(submittedAt);
    const now = new Date();
    const diffInMs = now.getTime() - submissionDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return new Date(submittedAt).toLocaleDateString();
  };

  const calculateOverallRating = (evaluationData: any) => {
    if (!evaluationData) return 0;
    const calculateScore = (scores: string[]) => {
      const validScores = scores
        .filter((score) => score && score !== "")
        .map((score) => parseFloat(score));
      if (validScores.length === 0) return 0;
      return (
        validScores.reduce((sum, score) => sum + score, 0) / validScores.length
      );
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
      localStorage.getItem(`approvalData_${profile.email}`) || "{}"
    );
    const key = submissionId.toString();
    return approvalData[key] || null;
  };

  const getSubmissionHighlight = (
    submittedAt: string,
    allSubmissions: any[] = [],
    submissionId?: string
  ) => {
    if (submissionId && isEvaluationApproved(submissionId)) {
      return {
        className:
          "bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100",
        badge: { text: "Approved", className: "bg-green-200 text-green-800" },
        priority: "approved",
      };
    }

    const sortedSubmissions = [...allSubmissions].sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    const currentIndex = sortedSubmissions.findIndex(
      (sub) => sub.submittedAt === submittedAt
    );

    if (currentIndex === 0) {
      return {
        className:
          "bg-yellow-100 border-l-4 border-l-yellow-500 hover:bg-yellow-200",
        badge: { text: "New", className: "bg-yellow-200 text-yellow-800" },
        priority: "new",
      };
    } else if (currentIndex === 1) {
      return {
        className: "bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100",
        badge: { text: "Recent", className: "bg-blue-100 text-blue-800" },
        priority: "recent",
      };
    } else {
      return {
        className: "hover:bg-gray-50",
        badge: null,
        priority: "old",
      };
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    return submissions
      .filter(
        (s) =>
          (s.evaluationData
            ? calculateOverallRating(s.evaluationData)
            : s.rating) > 0
      )
      .map((submission, index) => ({
        review: `Review ${submissions.length - index}`,
        rating: submission.evaluationData
          ? calculateOverallRating(submission.evaluationData)
          : submission.rating,
        date: new Date(submission.submittedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        fullDate: new Date(submission.submittedAt).toLocaleDateString(),
      }))
      .reverse();
  }, [submissions]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const ratings = submissions
      .map((s) =>
        s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating
      )
      .filter((r) => r > 0);
    const averageRating =
      ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
        : "0.0";
    const latestRating = ratings.length > 0 ? ratings[0] : 0;
    const trend = ratings.length > 1 ? latestRating - ratings[1] : 0;

    return { ratings, averageRating, latestRating, trend };
  }, [submissions]);

  // Pagination calculations
  const sortedSubmissionsForPagination = useMemo(() => {
    return [...submissions].sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [submissions]);

  const reviewsTotalPages = Math.ceil(
    sortedSubmissionsForPagination.length / itemsPerPage
  );
  const reviewsStartIndex = (reviewsPage - 1) * itemsPerPage;
  const reviewsEndIndex = reviewsStartIndex + itemsPerPage;
  const reviewsPaginated = sortedSubmissionsForPagination.slice(
    reviewsStartIndex,
    reviewsEndIndex
  );

  // Reset to page 1 when submissions change
  useEffect(() => {
    setReviewsPage(1);
  }, [submissions.length]);

  // Performance insights
  const insights = useMemo(() => {
    const { averageRating, trend } = performanceMetrics;
    const insightsList: any[] = [];

    if (parseFloat(averageRating) >= 4.5) {
      insightsList.push({
        type: "excellent",
        icon: "🏆",
        title: "Outstanding Performance",
        message:
          "You're performing exceptionally well! Consider mentoring others or taking on leadership opportunities.",
      });
    } else if (parseFloat(averageRating) >= 4.0) {
      insightsList.push({
        type: "good",
        icon: "⭐",
        title: "Strong Performance",
        message:
          "You're exceeding expectations. Focus on maintaining this level and identifying areas for continued growth.",
      });
    } else if (parseFloat(averageRating) >= 3.5) {
      insightsList.push({
        type: "average",
        icon: "📈",
        title: "Solid Performance",
        message:
          "You're meeting expectations. Consider setting specific goals to push beyond your current level.",
      });
    } else {
      insightsList.push({
        type: "improvement",
        icon: "🎯",
        title: "Growth Opportunity",
        message:
          "There's room for improvement. Focus on one key area at a time and seek feedback regularly.",
      });
    }

    if (trend > 0.2) {
      insightsList.push({
        type: "improving",
        icon: "🚀",
        title: "Improving Trend",
        message:
          "Great job! Your performance is trending upward. Keep up the momentum!",
      });
    } else if (trend < -0.2) {
      insightsList.push({
        type: "declining",
        icon: "⚠️",
        title: "Performance Dip",
        message:
          "Your recent performance has declined. Consider discussing challenges with your manager.",
      });
    }

    if (submissions.length >= 3) {
      insightsList.push({
        type: "consistency",
        icon: "📊",
        title: "Consistent Reviews",
        message:
          "You have a solid review history. This shows reliability and commitment to performance.",
      });
    }

    return insightsList;
  }, [performanceMetrics, submissions.length]);

  const chartConfig = {
    rating: {
      label: "Rating",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <div className="relative h-[calc(100vh-200px)] overflow-y-auto">
      {isRefreshingReviews || loading ? (
        <div className="relative space-y-6 min-h-[500px]">
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src="/smct.png"
                    alt="SMCT Logo"
                    className="h-10 w-10 object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600 font-medium">
                Loading performance reviews...
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <Card className="h-fit">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card className="h-fit">
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
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
        <div className="space-y-6">
          {/* Performance Analytics Section */}
          {submissions.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              {/* Performance Trend Chart */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📈 Performance Trend
                  </CardTitle>
                  <CardDescription>
                    Your rating progression over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📊</div>
                        <div className="text-sm text-gray-500">
                          No data available
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Complete your first evaluation to see trends
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-80">
                      <ChartContainer config={chartConfig}>
                        <LineChart
                          data={chartData}
                          margin={{ left: 20, right: 20, top: 20, bottom: 60 }}
                        >
                          <CartesianGrid
                            strokeDasharray="2 2"
                            stroke="#e5e7eb"
                            opacity={0.3}
                          />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={16}
                            tick={{ fontSize: 11, fill: "#6b7280" }}
                            tickFormatter={(value) => value}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            domain={[0, 5]}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            tickFormatter={(value) => `${value}.0`}
                            ticks={[0, 1, 2, 3, 4, 5]}
                          />
                          <ChartTooltip
                            cursor={{
                              stroke: "#3b82f6",
                              strokeWidth: 1,
                              strokeDasharray: "3 3",
                            }}
                            content={
                              <ChartTooltipContent
                                formatter={(value, name) => [
                                  `${value}/5.0`,
                                  "Rating",
                                ]}
                                labelFormatter={(label, payload) => {
                                  if (payload && payload[0]) {
                                    return payload[0].payload.review;
                                  }
                                  return label;
                                }}
                                className="bg-white border border-gray-200 shadow-lg rounded-lg"
                              />
                            }
                          />
                          <Line
                            dataKey="rating"
                            type="monotone"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{
                              fill: "#3b82f6",
                              stroke: "#ffffff",
                              strokeWidth: 2,
                              r: 5,
                            }}
                            activeDot={{
                              r: 7,
                              stroke: "#3b82f6",
                              strokeWidth: 2,
                              fill: "#ffffff",
                            }}
                          />
                        </LineChart>
                      </ChartContainer>
                    </div>
                  )}

                  {/* Chart Legend */}
                  <div className="mt-6 px-4 py-3 bg-gray-50 rounded-lg border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Performance Rating Trend
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-md border">
                        <span className="font-medium">
                          {
                            submissions.filter(
                              (s) =>
                                (s.evaluationData
                                  ? calculateOverallRating(s.evaluationData)
                                  : s.rating) > 0
                            ).length
                          }
                        </span>{" "}
                        evaluation
                        {submissions.filter(
                          (s) =>
                            (s.evaluationData
                              ? calculateOverallRating(s.evaluationData)
                              : s.rating) > 0
                        ).length !== 1
                          ? "s"
                          : ""}{" "}
                        tracked
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📊 Performance Summary
                  </CardTitle>
                  <CardDescription>
                    Your overall performance insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Rating</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {performanceMetrics.averageRating}
                      </span>
                      <span className="text-sm text-gray-500">/5.0</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Latest Rating</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {performanceMetrics.latestRating}
                      </span>
                      <span className="text-sm text-gray-500">/5.0</span>
                      {performanceMetrics.trend !== 0 && (
                        <Badge
                          className={
                            performanceMetrics.trend > 0
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {performanceMetrics.trend > 0 ? "↗" : "↘"}{" "}
                          {Math.abs(performanceMetrics.trend).toFixed(1)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Reviews</span>
                    <Badge variant="outline">{submissions.length}</Badge>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium mb-2">
                      Performance Level
                    </div>
                    <Badge
                      className={
                        parseFloat(performanceMetrics.averageRating) >= 4.5
                          ? "bg-green-100 text-green-800"
                          : parseFloat(performanceMetrics.averageRating) >= 4.0
                          ? "bg-blue-100 text-blue-800"
                          : parseFloat(performanceMetrics.averageRating) >= 3.5
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {parseFloat(performanceMetrics.averageRating) >= 4.5
                        ? "Outstanding"
                        : parseFloat(performanceMetrics.averageRating) >= 4.0
                        ? "Exceeds Expectations"
                        : parseFloat(performanceMetrics.averageRating) >= 3.5
                        ? "Meets Expectations"
                        : "Needs Improvement"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Performance Insights */}
          {submissions.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💡 Performance Insights
                </CardTitle>
                <CardDescription>
                  Actionable insights based on your performance history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        insight.type === "excellent"
                          ? "bg-green-50 border-green-200"
                          : insight.type === "good"
                          ? "bg-blue-50 border-blue-200"
                          : insight.type === "improving"
                          ? "bg-emerald-50 border-emerald-200"
                          : insight.type === "declining"
                          ? "bg-red-50 border-red-200"
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{insight.icon}</span>
                        <div>
                          <h4 className="font-semibold text-sm mb-1">
                            {insight.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {insight.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Performance Reviews Table */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>All Performance Reviews</CardTitle>
              <CardDescription>
                Complete history of your performance evaluations
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                    <span className="text-red-700">Poor (&lt;2.5)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
                    <span className="text-orange-700">Low (&lt;3.0)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                    <span className="text-blue-700">Good (3.0-3.9)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                    <span className="text-green-700">Excellent (≥4.0)</span>
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {submissions.length > 0 ? (
                <>
                  <div className="max-h-[500px] overflow-y-auto overflow-x-hidden rounded-lg border mx-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <Table className="table-fixed w-full">
                      <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
                        <TableRow>
                          <TableHead className="w-1/5 pl-4">
                            Immediate Supervisor
                          </TableHead>
                          <TableHead className="w-1/5 text-right pr-25">
                            Rating
                          </TableHead>
                          <TableHead className="w-1/5 text-center">
                            Date
                          </TableHead>
                          <TableHead className="w-1/5 px-4 pr-23 text-center">
                            Quarter
                          </TableHead>
                          <TableHead className="w-1/5 text-right pl-1 pr-4">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reviewsPaginated.map((submission) => {
                          const highlight = getSubmissionHighlight(
                            submission.submittedAt,
                            submissions,
                            submission.id
                          );
                          const rating = submission.evaluationData
                            ? calculateOverallRating(submission.evaluationData)
                            : submission.rating;
                          const isLowPerformance = rating < 3.0;
                          const isPoorPerformance = rating < 2.5;

                          return (
                            <TableRow
                              key={submission.id}
                              className={`${highlight.className} ${
                                isPoorPerformance
                                  ? "bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100"
                                  : isLowPerformance
                                  ? "bg-orange-50 border-l-4 border-l-orange-400 hover:bg-orange-100"
                                  : ""
                              }`}
                            >
                              <TableCell className="w-1/5 font-medium pl-4">
                                <div className="flex items-center gap-2">
                                  {submission.evaluationData?.supervisor ||
                                    "Not specified"}
                                  {highlight.badge && (
                                    <Badge
                                      variant="secondary"
                                      className={`${highlight.badge.className} text-xs`}
                                    >
                                      {highlight.badge.text}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="w-1/5 text-right font-semibold pr-25">
                                <div
                                  className={`flex items-center justify-end gap-2 ${
                                    isPoorPerformance
                                      ? "text-red-700"
                                      : isLowPerformance
                                      ? "text-orange-600"
                                      : "text-gray-900"
                                  }`}
                                >
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      isPoorPerformance
                                        ? "bg-red-100 text-red-800"
                                        : isLowPerformance
                                        ? "bg-orange-100 text-orange-800"
                                        : rating >= 4.0
                                        ? "bg-green-100 text-green-800"
                                        : rating >= 3.5
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {isPoorPerformance
                                      ? "POOR"
                                      : isLowPerformance
                                      ? "LOW"
                                      : rating >= 4.0
                                      ? "EXCELLENT"
                                      : rating >= 3.5
                                      ? "GOOD"
                                      : "FAIR"}
                                  </span>
                                  <span className="font-bold">{rating}/5</span>
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
                              <TableCell className="w-1/5 px-4 pr-23">
                                <div className="flex justify-center">
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
                                </div>
                              </TableCell>
                              <TableCell className="w-1/5 text-right pl-1 pr-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const approvalData = getApprovalData(
                                      submission.id
                                    );
                                    const submissionWithApproval = {
                                      ...submission,
                                      employeeSignature:
                                        approvalData?.employeeSignature || null,
                                      employeeApprovedAt:
                                        approvalData?.approvedAt || null,
                                    };
                                    onViewEvaluation(submissionWithApproval);
                                  }}
                                  className="text-white bg-blue-500 hover:text-white hover:bg-blue-600"
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
                  {sortedSubmissionsForPagination.length > 4 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-0 mt-3 md:mt-4 px-4">
                      <div className="text-xs md:text-sm text-gray-600 order-2 sm:order-1">
                        Showing {reviewsStartIndex + 1} to{" "}
                        {Math.min(
                          reviewsEndIndex,
                          sortedSubmissionsForPagination.length
                        )}{" "}
                        of {sortedSubmissionsForPagination.length} records
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2 order-1 sm:order-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setReviewsPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={reviewsPage === 1}
                          className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-0.5 md:gap-1">
                          {Array.from(
                            { length: reviewsTotalPages },
                            (_, i) => i + 1
                          ).map((page) => {
                            if (
                              page === 1 ||
                              page === reviewsTotalPages ||
                              (page >= reviewsPage - 1 &&
                                page <= reviewsPage + 1)
                            ) {
                              return (
                                <Button
                                  key={page}
                                  variant={
                                    reviewsPage === page ? "default" : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setReviewsPage(page)}
                                  className={`text-xs md:text-sm w-7 h-7 md:w-8 md:h-8 p-0 ${
                                    reviewsPage === page
                                      ? "bg-blue-700 text-white hover:bg-blue-500 hover:text-white"
                                      : "bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                                  }`}
                                >
                                  {page}
                                </Button>
                              );
                            } else if (
                              page === reviewsPage - 2 ||
                              page === reviewsPage + 2
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
                            setReviewsPage((prev) =>
                              Math.min(reviewsTotalPages, prev + 1)
                            )
                          }
                          disabled={reviewsPage === reviewsTotalPages}
                          className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 px-6">
                  <div className="text-gray-500 text-lg mb-2">
                    No performance reviews yet
                  </div>
                  <div className="text-gray-400 text-sm">
                    Your evaluation history will appear here once reviews are
                    completed.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
