'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { getQuarterFromEvaluationData, getQuarterColor } from '@/lib/quarterUtils';

interface PerformanceReviewsTabProps {
  recentSubmissions: any[];
  reviewsRefreshing: boolean;
  loading: boolean;
  calculateOverallRating: (evaluationData: any) => number;
  getSubmissionHighlight: (submittedAt: string, submissionId: number, approvalStatus?: string) => any;
  getTimeAgo: (submittedAt: string) => string;
  onViewSubmission: (submission: any) => void;
  isActive?: boolean;
}

export function PerformanceReviewsTab({
  recentSubmissions,
  reviewsRefreshing,
  loading,
  calculateOverallRating,
  getSubmissionHighlight,
  getTimeAgo,
  onViewSubmission,
  isActive = false
}: PerformanceReviewsTabProps) {
  return (
    <div className="relative h-[calc(100vh-200px)] overflow-y-auto">
      {reviewsRefreshing || loading ? (
        <div className="relative space-y-6 min-h-[500px]">
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
              <p className="text-sm text-gray-600 font-medium">Loading performance reviews...</p>
            </div>
          </div>

          {/* Performance Analytics Skeleton (visible in background) */}
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

          {/* Performance Reviews Table Skeleton (visible in background) */}
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              {/* Performance Trend Chart */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📈 Performance Trend
                  </CardTitle>
                  <CardDescription>Rating progression across all evaluations</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Filter and sort all submissions for HR view
                    const filteredReviews = recentSubmissions
                      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                    
                    // Prepare chart data from submissions
                    const chartData = filteredReviews
                      .filter(s => (s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating || 0) > 0)
                      .map((submission, index) => ({
                        review: `Review ${filteredReviews.length - index}`,
                        rating: submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating || 0,
                        date: new Date(submission.submittedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        }),
                        fullDate: new Date(submission.submittedAt).toLocaleDateString()
                      }))
                      .reverse(); // Show oldest to newest

                    const chartConfig = {
                      rating: {
                        label: "Rating",
                        color: "hsl(var(--chart-1))",
                      },
                    };

                    if (chartData.length === 0) {
                      return (
                        <div className="h-64 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl mb-2">📊</div>
                            <div className="text-sm text-gray-500">No data available</div>
                            <div className="text-xs text-gray-400 mt-1">
                              Complete evaluations to see trends
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="h-80">
                        <ChartContainer config={chartConfig}>
                          <LineChart
                            data={chartData}
                            margin={{
                              left: 20,
                              right: 20,
                              top: 20,
                              bottom: 60,
                            }}
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
                              tick={{ fontSize: 11, fill: '#6b7280' }}
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
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              tickFormatter={(value) => `${value}.0`}
                              ticks={[0, 1, 2, 3, 4, 5]}
                            />
                            <ChartTooltip
                              cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3' }}
                              content={<ChartTooltipContent
                                formatter={(value, name) => [
                                  `${value}/5.0`,
                                  "Rating"
                                ]}
                                labelFormatter={(label, payload) => {
                                  if (payload && payload[0]) {
                                    return payload[0].payload.review;
                                  }
                                  return label;
                                }}
                                className="bg-white border border-gray-200 shadow-lg rounded-lg"
                              />}
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
                    );
                  })()}

                  {/* Chart Legend and Info */}
                  <div className="mt-6 px-4 py-3 bg-gray-50 rounded-lg border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm font-medium text-gray-700">Performance Rating Trend</span>
                      </div>
                      <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-md border">
                        <span className="font-medium">{recentSubmissions.filter(s => (s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating || 0) > 0).length}</span> evaluation{recentSubmissions.filter(s => (s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating || 0) > 0).length !== 1 ? 's' : ''} tracked
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
                  <CardDescription>Overall performance insights across all evaluations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const filteredReviews = recentSubmissions
                      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                    
                    const ratings = filteredReviews.map(s =>
                      s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating || 0
                    ).filter(r => r > 0);
                    const averageRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1) : '0.0';
                    const latestRating = ratings.length > 0 ? ratings[0] : 0;
                    const trend = ratings.length > 1 ? (latestRating - ratings[1]) : 0;

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Average Rating</span>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{averageRating}</span>
                            <span className="text-sm text-gray-500">/5.0</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Latest Rating</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">{latestRating}</span>
                            <span className="text-sm text-gray-500">/5.0</span>
                            {trend !== 0 && (
                              <Badge className={trend > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {trend > 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(1)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Total Reviews</span>
                          <Badge variant="outline">{filteredReviews.length}</Badge>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="text-sm font-medium mb-2">Overall Performance Level</div>
                          <Badge className={
                            parseFloat(averageRating) >= 4.5 ? 'bg-green-100 text-green-800' :
                              parseFloat(averageRating) >= 4.0 ? 'bg-blue-100 text-blue-800' :
                                parseFloat(averageRating) >= 3.5 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                          }>
                            {parseFloat(averageRating) >= 4.5 ? 'Outstanding' :
                              parseFloat(averageRating) >= 4.0 ? 'Exceeds Expectations' :
                                parseFloat(averageRating) >= 3.5 ? 'Meets Expectations' :
                                  'Needs Improvement'}
                          </Badge>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

          {/* Performance Insights */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                💡 Performance Insights
              </CardTitle>
              <CardDescription>Actionable insights based on performance evaluation history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const filteredReviews = recentSubmissions
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                  
                  const ratings = filteredReviews.map(s =>
                    s.evaluationData ? calculateOverallRating(s.evaluationData) : s.rating || 0
                  ).filter(r => r > 0);
                  const averageRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) : 0;
                  const latestRating = ratings.length > 0 ? ratings[0] : 0;
                  const trend = ratings.length > 1 ? (latestRating - ratings[1]) : 0;

                  const insights = [];

                  if (filteredReviews.length === 0) {
                    // Show message when no evaluations exist
                    insights.push({
                      type: 'improvement',
                      icon: '📝',
                      title: 'No Evaluations Yet',
                      message: 'Start conducting evaluations to see insights and track performance trends over time.'
                    });
                  } else {
                    if (averageRating >= 4.5) {
                      insights.push({
                        type: 'excellent',
                        icon: '🏆',
                        title: 'Outstanding Performance',
                        message: 'The organization is performing exceptionally well! Consider recognizing top performers and sharing best practices.'
                      });
                    } else if (averageRating >= 4.0) {
                      insights.push({
                        type: 'good',
                        icon: '⭐',
                        title: 'Strong Performance',
                        message: 'Performance levels are exceeding expectations. Focus on maintaining this level and identifying areas for continued growth.'
                      });
                    } else if (averageRating >= 3.5) {
                      insights.push({
                        type: 'average',
                        icon: '📈',
                        title: 'Solid Performance',
                        message: 'Performance is meeting expectations. Consider setting specific goals to push beyond current levels.'
                      });
                    } else {
                      insights.push({
                        type: 'improvement',
                        icon: '🎯',
                        title: 'Growth Opportunity',
                        message: 'There\'s room for improvement across evaluations. Focus on key areas and provide targeted support.'
                      });
                    }

                    if (trend > 0.2) {
                      insights.push({
                        type: 'improving',
                        icon: '🚀',
                        title: 'Improving Trend',
                        message: 'Great progress! Overall performance is trending upward. Keep up the momentum!'
                      });
                    } else if (trend < -0.2) {
                      insights.push({
                        type: 'declining',
                        icon: '⚠️',
                        title: 'Performance Dip',
                        message: 'Recent performance has declined. Consider reviewing processes and providing additional support.'
                      });
                    }

                    if (filteredReviews.length >= 3) {
                      insights.push({
                        type: 'consistency',
                        icon: '📊',
                        title: 'Consistent Reviews',
                        message: 'You have a solid review history. This shows reliability and commitment to performance management.'
                      });
                    }
                  }

                  // If no insights, show a default message
                  if (insights.length === 0) {
                    insights.push({
                      type: 'improvement',
                      icon: '📈',
                      title: 'Getting Started',
                      message: 'Complete more evaluations to receive personalized insights about performance patterns.'
                    });
                  }

                  return insights.map((insight, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${insight.type === 'excellent' ? 'bg-green-50 border-green-200' :
                      insight.type === 'good' ? 'bg-blue-50 border-blue-200' :
                        insight.type === 'improving' ? 'bg-emerald-50 border-emerald-200' :
                          insight.type === 'declining' ? 'bg-red-50 border-red-200' :
                            'bg-yellow-50 border-yellow-200'
                      }`}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{insight.icon}</span>
                        <div>
                          <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                          <p className="text-sm text-gray-600">{insight.message}</p>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>

          {/* All Performance Reviews Table */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>All Performance Reviews</CardTitle>
              <CardDescription>
                Complete history of all performance evaluations
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
              {(() => {
                const filteredReviews = recentSubmissions
                  .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                
                return filteredReviews.length > 0 ? (
                  <div className="max-h-[500px] overflow-y-auto overflow-x-hidden rounded-lg border mx-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
                        <TableRow>
                          <TableHead className="px-6 py-4">Employee</TableHead>
                          <TableHead className="px-6 py-4 text-right">Rating</TableHead>
                          <TableHead className="px-6 py-4">Date</TableHead>
                          <TableHead className="px-6 py-4">Quarter</TableHead>
                          <TableHead className="px-6 py-4 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReviews.map((submission) => {
                          const highlight = getSubmissionHighlight(submission.submittedAt, submission.id, submission.approvalStatus);
                          const rating = submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating || 0;
                          const isLowPerformance = rating < 3.0;
                          const isPoorPerformance = rating < 2.5;
                          
                          return (
                            <TableRow 
                              key={submission.id} 
                              className={`${highlight.className} ${
                                isPoorPerformance ? 'bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100' :
                                isLowPerformance ? 'bg-orange-50 border-l-4 border-l-orange-400 hover:bg-orange-100' :
                                  ''
                              }`}
                            >
                              <TableCell className="px-6 py-4 font-medium">
                                <div className="flex items-center gap-2">
                                  {submission.employeeName || 'Unknown'}
                                  {highlight.badge && (
                                    <Badge variant="secondary" className={`${highlight.badge.className} text-xs`}>
                                      {highlight.badge.text}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right font-semibold">
                                {(() => {
                                  const rating = submission.evaluationData ? calculateOverallRating(submission.evaluationData) : submission.rating || 0;
                                  const isLowPerformance = rating < 3.0;
                                  const isPoorPerformance = rating < 2.5;
                                  
                                  return (
                                    <div className={`flex items-center justify-end gap-2 ${
                                      isPoorPerformance ? 'text-red-700' : 
                                      isLowPerformance ? 'text-orange-600' : 
                                      'text-gray-900'
                                    }`}>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        isPoorPerformance ? 'bg-red-100 text-red-800' :
                                        isLowPerformance ? 'bg-orange-100 text-orange-800' :
                                        rating >= 4.0 ? 'bg-green-100 text-green-800' :
                                        rating >= 3.5 ? 'bg-blue-100 text-blue-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {isPoorPerformance ? 'POOR' : 
                                         isLowPerformance ? 'LOW' : 
                                         rating >= 4.0 ? 'EXCELLENT' :
                                         rating >= 3.5 ? 'GOOD' : 'FAIR'}
                                      </span>
                                      <span className="font-bold">
                                        {rating}/5
                                      </span>
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-medium">{new Date(submission.submittedAt).toLocaleDateString()}</span>
                                  <span className="text-xs text-gray-500">{getTimeAgo(submission.submittedAt)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <Badge className={getQuarterColor(getQuarterFromEvaluationData(submission.evaluationData || submission))}>
                                  {getQuarterFromEvaluationData(submission.evaluationData || submission)}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    onViewSubmission(submission);
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
                ) : (
                  <div className="text-center py-12 px-6">
                    <div className="text-gray-500 text-lg mb-2">No performance reviews yet</div>
                    <div className="text-gray-400 text-sm">Evaluation history will appear here once reviews are completed.</div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

