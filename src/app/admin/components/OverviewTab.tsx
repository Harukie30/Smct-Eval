'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface Review {
  id: number;
  employeeName: string;
  evaluatorName: string;
  department: string;
  position: string;
  evaluationDate: string;
  overallScore: number;
  completedCriteria: number;
  totalCriteria: number;
  lastUpdated: string;
  status: 'completed' | 'in_progress' | 'pending';
}

interface OverviewTabProps {
  systemMetrics: any; // Replace with proper type
  dashboardStats: any; // Replace with proper type
  loading: boolean;
  evaluatedReviews: Review[];
  departments: any[];
}

export function OverviewTab({ 
  systemMetrics, 
  dashboardStats, 
  loading,
  evaluatedReviews,
  departments
}: OverviewTabProps) {
  if (loading) {
    return <div>Loading overview...</div>;
  }

  if (!systemMetrics || !dashboardStats) {
    return <div>No data available</div>;
  }

  // Helper functions
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQuarterFromDate = (date: string): string => {
    const d = new Date(date);
    const month = d.getMonth();
    const year = d.getFullYear();
    const quarter = Math.floor(month / 3) + 1;
    return `Q${quarter} ${year}`;
  };

  const getQuarterColor = (quarter: string): string => {
    if (quarter.includes('Q1')) return 'bg-blue-100 text-blue-800';
    if (quarter.includes('Q2')) return 'bg-green-100 text-green-800';
    if (quarter.includes('Q3')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-purple-100 text-purple-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
        <Badge className="bg-green-100 text-green-800">
          {systemMetrics.systemHealth === 'excellent' ? '✓ Excellent' : systemMetrics.systemHealth}
        </Badge>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{systemMetrics.totalUsers}</div>
            <p className="text-sm text-gray-500 mt-1">{systemMetrics.activeUsers} active</p>
          </CardContent>
        </Card>

        {/* Evaluations Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{systemMetrics.totalEvaluations}</div>
            <p className="text-sm text-gray-500 mt-1">{systemMetrics.pendingEvaluations} pending</p>
          </CardContent>
        </Card>

        {/* System Health Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {systemMetrics.systemHealth === 'excellent' ? '✓' : '!'}
            </div>
            <p className="text-sm text-gray-500 mt-1 capitalize">{systemMetrics.systemHealth}</p>
          </CardContent>
        </Card>

        {/* Storage Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {Math.round((systemMetrics.storageUsed / systemMetrics.storageTotal) * 100)}%
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {systemMetrics.storageUsed}GB / {systemMetrics.storageTotal}GB
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Employee Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Users:</span>
                <span className="font-semibold">{dashboardStats.employeeDashboard.activeUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Views:</span>
                <span className="font-semibold">{dashboardStats.employeeDashboard.totalViews}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Last Activity: {new Date(dashboardStats.employeeDashboard.lastActivity).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>HR Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Users:</span>
                <span className="font-semibold">{dashboardStats.hrDashboard.activeUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Views:</span>
                <span className="font-semibold">{dashboardStats.hrDashboard.totalViews}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Last Activity: {new Date(dashboardStats.hrDashboard.lastActivity).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evaluator Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Users:</span>
                <span className="font-semibold">{dashboardStats.evaluatorDashboard.activeUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Views:</span>
                <span className="font-semibold">{dashboardStats.evaluatorDashboard.totalViews}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Last Activity: {new Date(dashboardStats.evaluatorDashboard.lastActivity).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submitted Reviews Section */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Reviews</CardTitle>
          <CardDescription>Monitor and manage all submitted performance evaluations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <Input placeholder="Search reviews..." className="w-64" />
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                className="bg-purple-500 text-white hover:bg-purple-600 hover:text-white"
              >
                Export Reviews
              </Button>
            </div>

            {/* Reviews Table */}
            <div className="relative max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Evaluator</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Evaluation Date</TableHead>
                    <TableHead>Overall Score</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Quarter</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluatedReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">{review.employeeName}</TableCell>
                      <TableCell>{review.evaluatorName}</TableCell>
                      <TableCell>{review.department}</TableCell>
                      <TableCell>{review.position}</TableCell>
                      <TableCell>{new Date(review.evaluationDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${getScoreColor(review.overallScore)}`}>
                          {review.overallScore > 0 ? `${review.overallScore}%` : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress
                            value={(review.completedCriteria / review.totalCriteria) * 100}
                            className="w-16"
                          />
                          <span className="text-sm text-gray-600">
                            {review.completedCriteria}/{review.totalCriteria}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getQuarterColor(getQuarterFromDate(review.evaluationDate))}>
                          {getQuarterFromDate(review.evaluationDate)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(review.lastUpdated).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">View</Button>
                          <Button variant="ghost" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm">Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {evaluatedReviews.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-lg font-medium">No submitted reviews found</p>
                <p className="text-sm">Performance evaluations will appear here once they are submitted by evaluators.</p>
              </div>
            )}

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {evaluatedReviews.filter(r => r.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {evaluatedReviews.filter(r => r.status === 'in_progress').length}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {evaluatedReviews.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {evaluatedReviews.length}
                </div>
                <div className="text-sm text-gray-600">Total Reviews</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

