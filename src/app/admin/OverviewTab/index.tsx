'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import clientDataService from '@/lib/clientDataService';
import accountsDataRaw from '@/data/accounts.json';
import ViewResultsModal from '@/components/evaluation/ViewResultsModal';

const accountsData = accountsDataRaw.accounts || [];

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

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalEvaluations: number;
  pendingEvaluations: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  lastBackup: string;
  uptime: string;
  storageUsed: number;
  storageTotal: number;
}

interface DashboardStats {
  employeeDashboard: {
    activeUsers: number;
    totalViews: number;
    lastActivity: string;
  };
  hrDashboard: {
    activeUsers: number;
    totalViews: number;
    lastActivity: string;
  };
  evaluatorDashboard: {
    activeUsers: number;
    totalViews: number;
    lastActivity: string;
  };
}

export function OverviewTab() {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [evaluatedReviews, setEvaluatedReviews] = useState<Review[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isViewResultsModalOpen, setIsViewResultsModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  // Shared data loading function
  const loadData = async () => {
    try {
      // Load evaluated reviews
      const submissions = await clientDataService.getSubmissions();
      const evaluationResults = submissions.map((submission: any) => ({
        id: submission.id,
        employeeName: submission.employeeName,
        evaluatorName: submission.evaluator,
        department: submission.evaluationData?.department || 'N/A',
        position: submission.evaluationData?.position || 'N/A',
        evaluationDate: submission.submittedAt,
        overallScore: Math.round((submission.rating / 5) * 100),
        status: submission.status || 'completed',
        lastUpdated: submission.submittedAt,
        totalCriteria: 7,
        completedCriteria: 7,
        submittedAt: submission.submittedAt, // Include for sorting
      }));
      evaluationResults.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setEvaluatedReviews(evaluationResults);

      // Reload employees to recalculate metrics
      const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
      const employees = (accounts.length > 0 ? accounts : accountsData)
        .filter((account: any) => account.role !== 'admin')
        .map((account: any) => ({
          id: account.employeeId || account.id,
          role: account.role,
          isActive: account.isActive,
        }));

      const activeEmployees = employees.filter((emp: any) => emp.isActive !== false);

      // Calculate system metrics
      const metrics: SystemMetrics = {
        totalUsers: employees.length,
        activeUsers: activeEmployees.length,
        totalEvaluations: evaluationResults.length,
        pendingEvaluations: evaluationResults.filter((r: any) => r.status === 'pending').length,
        systemHealth: 'excellent',
        lastBackup: new Date().toISOString(),
        uptime: '99.9%',
        storageUsed: 2.5,
        storageTotal: 10,
      };

      // Calculate dashboard stats
      const stats: DashboardStats = {
        employeeDashboard: {
          activeUsers: activeEmployees.filter((emp: any) => {
            const role = emp.role?.toLowerCase() || '';
            return role === 'employee' ||
              role.includes('representative') ||
              role.includes('designer') ||
              role.includes('developer') ||
              role.includes('analyst') ||
              role.includes('coordinator');
          }).length,
          totalViews: 0,
          lastActivity: new Date().toISOString(),
        },
        hrDashboard: {
          activeUsers: activeEmployees.filter((emp: any) => {
            const role = emp.role?.toLowerCase() || '';
            return role === 'hr' ||
              role === 'hr-manager' ||
              role.includes('hr') ||
              role.includes('human resources');
          }).length,
          totalViews: 0,
          lastActivity: new Date().toISOString(),
        },
        evaluatorDashboard: {
          activeUsers: activeEmployees.filter((emp: any) => {
            const role = emp.role?.toLowerCase() || '';
            return role === 'evaluator' ||
              role.includes('manager') ||
              role.includes('supervisor') ||
              role.includes('director') ||
              role.includes('lead');
          }).length,
          totalViews: 0,
          lastActivity: new Date().toISOString(),
        },
      };

      setSystemMetrics(metrics);
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Load initial data when component mounts (metrics and stats)
  useEffect(() => {
    const initialLoad = async () => {
      try {
        // Load metrics and stats first (without refreshing table)
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        const employees = (accounts.length > 0 ? accounts : accountsData)
          .filter((account: any) => account.role !== 'admin')
          .map((account: any) => ({
            id: account.employeeId || account.id,
            role: account.role,
            isActive: account.isActive,
          }));

        const activeEmployees = employees.filter((emp: any) => emp.isActive !== false);

        // Get current reviews count for metrics
        const submissions = await clientDataService.getSubmissions();
        const evaluationResults = submissions.map((submission: any) => ({
          id: submission.id,
          status: submission.status || 'completed',
        }));

        // Calculate system metrics
        const metrics: SystemMetrics = {
          totalUsers: employees.length,
          activeUsers: activeEmployees.length,
          totalEvaluations: evaluationResults.length,
          pendingEvaluations: evaluationResults.filter((r: any) => r.status === 'pending').length,
          systemHealth: 'excellent',
          lastBackup: new Date().toISOString(),
          uptime: '99.9%',
          storageUsed: 2.5,
          storageTotal: 10,
        };

        // Calculate dashboard stats
        const stats: DashboardStats = {
          employeeDashboard: {
            activeUsers: activeEmployees.filter((emp: any) => {
              const role = emp.role?.toLowerCase() || '';
              return role === 'employee' ||
                role.includes('representative') ||
                role.includes('designer') ||
                role.includes('developer') ||
                role.includes('analyst') ||
                role.includes('coordinator');
            }).length,
            totalViews: 0,
            lastActivity: new Date().toISOString(),
          },
          hrDashboard: {
            activeUsers: activeEmployees.filter((emp: any) => {
              const role = emp.role?.toLowerCase() || '';
              return role === 'hr' ||
                role === 'hr-manager' ||
                role.includes('hr') ||
                role.includes('human resources');
            }).length,
            totalViews: 0,
            lastActivity: new Date().toISOString(),
          },
          evaluatorDashboard: {
            activeUsers: activeEmployees.filter((emp: any) => {
              const role = emp.role?.toLowerCase() || '';
              return role === 'evaluator' ||
                role.includes('manager') ||
                role.includes('supervisor') ||
                role.includes('director') ||
                role.includes('lead');
            }).length,
            totalViews: 0,
            lastActivity: new Date().toISOString(),
          },
        };

        setSystemMetrics(metrics);
        setDashboardStats(stats);
      } catch (error) {
        console.error('Error loading overview data:', error);
      }
    };

    initialLoad();
  }, []);

  // Refresh table when tab is clicked (component remounts due to key prop)
  useEffect(() => {
    const refreshTable = async () => {
      setRefreshing(true);
      try {
        // Add a small delay to ensure spinner is visible
        await new Promise(resolve => setTimeout(resolve, 300));
        // Only refresh the reviews data (table data)
        const submissions = await clientDataService.getSubmissions();
        const evaluationResults = submissions.map((submission: any) => ({
          id: submission.id,
          employeeName: submission.employeeName,
          evaluatorName: submission.evaluator,
          department: submission.evaluationData?.department || 'N/A',
          position: submission.evaluationData?.position || 'N/A',
          evaluationDate: submission.submittedAt,
          overallScore: Math.round((submission.rating / 5) * 100),
          status: submission.status || 'completed',
          lastUpdated: submission.submittedAt,
          totalCriteria: 7,
          completedCriteria: 7,
          submittedAt: submission.submittedAt,
        }));
        evaluationResults.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setEvaluatedReviews(evaluationResults);
      } catch (error) {
        console.error('Error refreshing table data:', error);
      } finally {
        setRefreshing(false);
      }
    };

    refreshTable();
  }, []);

  // Helper functions (defined before useMemo to avoid reference errors)
  const getQuarterFromDate = (date: string): string => {
    const d = new Date(date);
    const month = d.getMonth();
    const year = d.getFullYear();
    const quarter = Math.floor(month / 3) + 1;
    return `Q${quarter} ${year}`;
  };

  // Filter reviews based on search term (comprehensive search like HR dashboard)
  // This hook MUST be called before any early returns to follow Rules of Hooks
  const filteredReviews = useMemo(() => {
    if (!searchTerm) return evaluatedReviews;
    
    const searchLower = searchTerm.toLowerCase();
    return evaluatedReviews.filter((review) => {
      return (
        review.employeeName.toLowerCase().includes(searchLower) ||
        review.evaluatorName.toLowerCase().includes(searchLower) ||
        review.department.toLowerCase().includes(searchLower) ||
        review.position.toLowerCase().includes(searchLower) ||
        review.status.toLowerCase().includes(searchLower) ||
        getQuarterFromDate(review.evaluationDate).toLowerCase().includes(searchLower)
      );
    });
  }, [evaluatedReviews, searchTerm]);

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

  const getQuarterColor = (quarter: string): string => {
    if (quarter.includes('Q1')) return 'bg-blue-100 text-blue-800';
    if (quarter.includes('Q2')) return 'bg-green-100 text-green-800';
    if (quarter.includes('Q3')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-purple-100 text-purple-800';
  };

  // Refresh function - refreshes all data including metrics
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Add a small delay to ensure spinner is visible
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle viewing evaluation details
  const handleViewEvaluation = async (review: Review) => {
    try {
      // Fetch the full submission data using the review ID
      const submission = await clientDataService.getSubmissionById(review.id);
      
      if (submission) {
        // Convert overallRating string to number for rating field
        const ratingValue = submission.overallRating 
          ? parseFloat(submission.overallRating) 
          : (review.overallScore / 20); // Convert percentage back to 5-point scale
        
        // Transform the submission to match ViewResultsModal's expected format
        const submissionForModal = {
          id: submission.id,
          employeeName: submission.employeeName || review.employeeName,
          category: 'Performance Review',
          rating: ratingValue,
          submittedAt: submission.submittedAt || review.evaluationDate,
          status: submission.status || review.status,
          evaluator: submission.evaluator || submission.evaluatorName || review.evaluatorName,
          evaluationData: submission.evaluationData || {
            department: review.department,
            position: review.position,
          },
          employeeId: submission.employeeId,
          employeeEmail: submission.employeeEmail,
          evaluatorId: submission.evaluatorId,
          evaluatorName: submission.evaluator || submission.evaluatorName || review.evaluatorName,
          period: submission.period,
          overallRating: submission.overallRating || ratingValue.toString(),
          approvalStatus: submission.approvalStatus,
          employeeSignature: submission.employeeSignature,
          employeeApprovedAt: submission.employeeApprovedAt,
          evaluatorSignature: submission.evaluatorSignature,
          evaluatorApprovedAt: submission.evaluatorApprovedAt,
        };
        
        setSelectedSubmission(submissionForModal);
        setIsViewResultsModalOpen(true);
      } else {
        console.error('Submission not found for review ID:', review.id);
      }
    } catch (error) {
      console.error('Error fetching submission details:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Container Div (replacing Card) */}
      <div className="bg-white border rounded-lg p-6">
        {/* Table Header Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Recent Evaluation Records</h2>
            {(() => {
              const now = new Date();
              const newCount = filteredReviews.filter(review => {
                const hoursDiff = (now.getTime() - new Date(review.evaluationDate).getTime()) / (1000 * 60 * 60);
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
                  onClick={() => setSearchTerm('')}
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
            <span className="text-sm font-medium text-gray-700 mr-2">Indicators:</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-100 border-l-2 border-l-yellow-500 rounded"></div>
              <Badge className="bg-yellow-200 text-yellow-800 text-xs">New</Badge>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-50 border-l-2 border-l-blue-500 rounded"></div>
              <Badge className="bg-blue-300 text-blue-800 text-xs">Recent</Badge>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
              <Badge className="bg-green-500 text-white text-xs">Completed</Badge>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="border rounded-lg overflow-hidden">
        <div className="relative max-h-[600px] overflow-y-auto overflow-x-auto" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9'
        }}>
          {refreshing && (
            <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-white/80">
              <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                <div className="relative">
                  {/* Spinning ring */}
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                  {/* Logo in center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 font-medium">Refreshing...</p>
              </div>
            </div>
          )}
          <Table className="min-w-full">
              <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                <TableRow>
                  <TableHead className="px-6 py-3">Employee Name</TableHead>
                  <TableHead className="px-6 py-3">Department</TableHead>
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
                ) : filteredReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="text-gray-500">
                        {searchTerm ? (
                          <>
                            <p className="text-sm font-medium">No results found</p>
                            <p className="text-xs mt-1">Try adjusting your search or filters</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm">No evaluation records to display</p>
                            <p className="text-xs mt-1">Records will appear here when evaluations are submitted</p>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReviews.map((review) => {
                    const submittedDate = new Date(review.evaluationDate);
                    const now = new Date();
                    const hoursDiff = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
                    const isNew = hoursDiff <= 24;
                    const isRecent = hoursDiff > 24 && hoursDiff <= 168; // 7 days
                    const isCompleted = review.status === 'completed';
                    
                    // Determine row background color
                    let rowClassName = "hover:bg-gray-100 transition-colors";
                    if (isCompleted) {
                      rowClassName = "bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500 transition-colors";
                    } else if (isNew) {
                      rowClassName = "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500 transition-colors";
                    } else if (isRecent) {
                      rowClassName = "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500 transition-colors";
                    }
                    
                    return (
                      <TableRow key={review.id} className={rowClassName}>
                        <TableCell className="px-6 py-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{review.employeeName}</span>
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
                              {isCompleted && (
                                <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0.5 font-semibold">
                                  ✓ COMPLETED
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Badge variant="outline" className="text-xs">
                            {review.department}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-3 text-sm text-gray-600">
                          {review.position}
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="font-medium text-gray-900">
                            {review.evaluatorName}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Badge className={getQuarterColor(getQuarterFromDate(review.evaluationDate))}>
                            {getQuarterFromDate(review.evaluationDate)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-3 text-sm text-gray-600">
                          {new Date(review.evaluationDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Badge className={
                            review.status === 'completed' ? 'bg-green-100 text-green-800' :
                            review.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {review.status === 'completed' ? '✓ Completed' :
                             review.status === 'in_progress' ? '⏳ In Progress' :
                             '⏳ Pending'}
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
  );
}
