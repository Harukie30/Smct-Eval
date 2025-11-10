'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { getQuarterFromDate, getQuarterColor } from '@/lib/quarterUtils';

interface OverviewTabProps {
  recentSubmissions: any[];
  submissionsLoading: boolean;
  onRefresh: () => Promise<void>;
  onViewSubmission: (submission: any) => void;
  isActive?: boolean;
}

export function OverviewTab({
  recentSubmissions,
  submissionsLoading,
  onRefresh,
  onViewSubmission,
  isActive = false
}: OverviewTabProps) {
  const [overviewSearchTerm, setOverviewSearchTerm] = useState('');

  // Filter submissions for overview table
  const filteredSubmissions = useMemo(() => {
    return recentSubmissions
      .filter((submission) => {
        if (!overviewSearchTerm) return true;
        
        const searchLower = overviewSearchTerm.toLowerCase();
        const employeeName = submission.employeeName?.toLowerCase() || '';
        const department = submission.evaluationData?.department?.toLowerCase() || '';
        const position = submission.evaluationData?.position?.toLowerCase() || '';
        const evaluator = (submission.evaluationData?.supervisor || submission.evaluator || '').toLowerCase();
        const quarter = getQuarterFromDate(submission.submittedAt).toLowerCase();
        const date = new Date(submission.submittedAt).toLocaleDateString().toLowerCase();
        const approvalStatus = submission.approvalStatus || (
          submission.employeeSignature && (submission.evaluatorSignature || submission.evaluationData?.evaluatorSignature)
            ? 'fully approved' 
            : 'pending'
        );
        const statusText = (
          approvalStatus === 'fully_approved' ? 'fully approved' :
          approvalStatus === 'rejected' ? 'rejected' :
          'pending'
        ).toLowerCase();
        
        return (
          employeeName.includes(searchLower) ||
          department.includes(searchLower) ||
          position.includes(searchLower) ||
          evaluator.includes(searchLower) ||
          quarter.includes(searchLower) ||
          date.includes(searchLower) ||
          statusText.includes(searchLower)
        );
      })
      .sort((a, b) => {
        // Sort by date descending (newest first)
        const dateA = new Date(a.submittedAt).getTime();
        const dateB = new Date(b.submittedAt).getTime();
        return dateB - dateA;
      });
  }, [recentSubmissions, overviewSearchTerm]);

  const handleRefresh = async () => {
    await onRefresh();
  };

  return (
    <div className="relative space-y-6 h-[calc(100vh-300px)] overflow-y-auto pr-2">
      {/* Recent Activity - Evaluation Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Recent Evaluation Records
            {(() => {
              const now = new Date();
              const newCount = filteredSubmissions.filter(sub => {
                const hoursDiff = (now.getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60);
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
          </CardTitle>
          <CardDescription>Latest performance evaluations and reviews (most recent at the top)</CardDescription>
          {/* Search Bar and Refresh Button */}
          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Search by employee, department, position, evaluator, or status..."
                value={overviewSearchTerm}
                onChange={(e) => setOverviewSearchTerm(e.target.value)}
                className="pr-10"
              />
              {overviewSearchTerm && (
                <button
                  onClick={() => setOverviewSearchTerm('')}
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
              disabled={submissionsLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              title="Refresh evaluation records"
            >
              {submissionsLoading ? (
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
          {/* Indicator Legend */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
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
                <Badge className="bg-green-500 text-white text-xs">Approved</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto">
            {submissionsLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Loading evaluation records...</p>
                </div>
              </div>
            )}
            
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                <TableRow>
                  <TableHead className="px-6 py-3">Employee Name</TableHead>
                  <TableHead className="px-6 py-3">Department</TableHead>
                  <TableHead className="px-6 py-3">Position</TableHead>
                  <TableHead className="px-6 py-3">HR</TableHead>
                  <TableHead className="px-6 py-3">Quarter</TableHead>
                  <TableHead className="px-6 py-3">Date</TableHead>
                  <TableHead className="px-6 py-3">Approval Status</TableHead>
                  <TableHead className="px-6 py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200">
                {submissionsLoading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell className="px-6 py-3">
                        <div className="space-y-1">
                          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-2.5 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <div className="space-y-1">
                          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="text-gray-500">
                        {overviewSearchTerm ? (
                          <>
                            <p className="text-sm font-medium">No results found for "{overviewSearchTerm}"</p>
                            <p className="text-xs mt-1">Try adjusting your search term</p>
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
                  filteredSubmissions.slice(0, 10).map((submission) => {
                    const quarter = getQuarterFromDate(submission.submittedAt);
                    
                    // Check if both parties have signed (handle empty strings too)
                    const hasEmployeeSignature = !!(submission.employeeSignature && submission.employeeSignature.trim());
                    const hasEvaluatorSignature = !!((submission.evaluatorSignature && submission.evaluatorSignature.trim()) || 
                      (submission.evaluationData?.evaluatorSignature && submission.evaluationData?.evaluatorSignature.trim()));
                    
                    // Determine approval status - SIGNATURES HAVE PRIORITY over stored status
                    let approvalStatus = 'pending';
                    if (hasEmployeeSignature && hasEvaluatorSignature) {
                      approvalStatus = 'fully_approved';
                    } else if (hasEmployeeSignature) {
                      approvalStatus = 'employee_approved';
                    } else if (submission.approvalStatus && submission.approvalStatus !== 'pending') {
                      approvalStatus = submission.approvalStatus;
                    }
                    
                    // Calculate time difference for indicators
                    const submittedDate = new Date(submission.submittedAt);
                    const now = new Date();
                    const hoursDiff = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
                    const isNew = hoursDiff <= 24;
                    const isRecent = hoursDiff > 24 && hoursDiff <= 168; // 7 days
                    const isApproved = approvalStatus === 'fully_approved';
                    
                    // Determine row background color - APPROVAL STATUS HAS PRIORITY
                    let rowClassName = "hover:bg-gray-100 transition-colors";
                    if (isApproved) {
                      // Approved is always green (highest priority)
                      rowClassName = "bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500 transition-colors";
                    } else if (isNew) {
                      rowClassName = "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500 transition-colors";
                    } else if (isRecent) {
                      rowClassName = "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500 transition-colors";
                    }
                    
                    return (
                      <TableRow key={submission.id} className={rowClassName}>
                        <TableCell className="px-6 py-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{submission.employeeName}</span>
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
                              {isApproved && (
                                <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0.5 font-semibold">
                                  ✓ APPROVED
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{submission.evaluationData?.email || ''}</div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Badge variant="outline" className="text-xs">
                            {submission.evaluationData?.department || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-3 text-sm text-gray-600">
                          {submission.evaluationData?.position || 'N/A'}
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="font-medium text-gray-900">
                            {submission.evaluationData?.supervisor || submission.evaluator || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Badge className={getQuarterColor(quarter)}>
                            {quarter}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-3 text-sm text-gray-600">
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Badge className={
                            approvalStatus === 'fully_approved' ? 'bg-green-100 text-green-800' :
                            approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {approvalStatus === 'fully_approved' ? '✓ Fully Approved' :
                             approvalStatus === 'rejected' ? '❌ Rejected' :
                             '⏳ Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewSubmission(submission)}
                            className="text-xs px-2 py-1 bg-green-600 hover:bg-green-300 text-white"
                          >
                            ☰ View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

