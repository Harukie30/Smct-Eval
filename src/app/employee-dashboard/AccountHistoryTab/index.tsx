'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/useToast";

interface AccountHistoryTabProps {
  isActive?: boolean;
}

export function AccountHistoryTab({ isActive = false }: AccountHistoryTabProps) {
  const { profile } = useUser();
  const { success } = useToast();
  const [accountHistory, setAccountHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshingAccountHistory, setIsRefreshingAccountHistory] = useState(false);
  const [accountHistorySearchTerm, setAccountHistorySearchTerm] = useState('');
  const isFirstMount = useRef(true);

  // Function to load account history (suspension records only)
  const loadAccountHistory = (email: string) => {
    try {
      const suspendedEmployees = JSON.parse(
        localStorage.getItem('suspendedEmployees') || '[]'
      );
      const employeeViolations = suspendedEmployees.filter(
        (emp: any) => emp.email === email
      );

      const history = employeeViolations.map((violation: any) => ({
        id: `violation-${violation.id}`,
        type: 'violation',
        title: 'Policy Violation',
        description: violation.suspensionReason,
        date: violation.suspensionDate,
        status: violation.status,
        severity: 'high',
        actionBy: violation.suspendedBy,
        details: {
          duration: violation.suspensionDuration,
          reinstatedDate: violation.reinstatedDate,
          reinstatedBy: violation.reinstatedBy,
        },
      }));

      return history.sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error('Error loading account history:', error);
      return [];
    }
  };

  // Helper functions
  const getFilteredAccountHistory = () => {
    if (!accountHistorySearchTerm) return accountHistory;

    return accountHistory.filter(
      (item) =>
        item.title.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
        item.actionBy?.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(accountHistorySearchTerm.toLowerCase())
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'violation':
        return '⚠️';
      case 'feedback':
        return '💬';
      default:
        return '📝';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'reinstated':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Initial load
  useEffect(() => {
    if (profile?.email) {
      const history = loadAccountHistory(profile.email);
      setAccountHistory(history);
      setLoading(false);
    }
  }, [profile]);

  // Refresh when tab becomes active
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (isActive && profile?.email) {
      const refreshOnTabClick = async () => {
        setIsRefreshingAccountHistory(true);
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const history = loadAccountHistory(profile.email!);
          setAccountHistory(history);
          success('Account history refreshed successfully', 'All account records have been updated');
        } catch (error) {
          console.error('Error refreshing account history:', error);
        } finally {
          setIsRefreshingAccountHistory(false);
        }
      };
      refreshOnTabClick();
    }
  }, [isActive, profile]);

  const handleRefreshAccountHistory = async () => {
    if (!profile?.email) return;
    setIsRefreshingAccountHistory(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const history = loadAccountHistory(profile.email);
      setAccountHistory(history);
      success('Account history refreshed successfully', 'All account records have been updated');
    } catch (error) {
      console.error('Error refreshing account history:', error);
    } finally {
      setIsRefreshingAccountHistory(false);
    }
  };

  return (
    <div className="relative">
      {isRefreshingAccountHistory || loading ? (
        <div className="relative min-h-[500px]">
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                </div>
              </div>
              <p className="text-sm text-gray-600 font-medium">Loading account history...</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-60" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 py-2 border-b">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Account History</CardTitle>
            <CardDescription>Track suspension records and account activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-6">
              {/* Search Bar */}
              <div className="mb-6 w-1/3">
                <div className="relative">
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
                  <input
                    type="text"
                    placeholder="Search account history..."
                    value={accountHistorySearchTerm}
                    onChange={(e) => setAccountHistorySearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {accountHistorySearchTerm && (
                    <button
                      onClick={() => setAccountHistorySearchTerm('')}
                      className="absolute inset-y-0 font-medium px-2 right-0 pr-3 flex items-center"
                    >
                      <svg
                        className="h-5 w-5 text-red-400 hover:text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={6}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Account History Actions */}
              <div className="mb-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {getFilteredAccountHistory().length} of {accountHistory.length} records
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshAccountHistory}
                  disabled={isRefreshingAccountHistory}
                  className="flex items-center space-x-2 bg-blue-500 text-white hover:bg-green-700 hover:text-white"
                >
                  <svg
                    className="h-5 w-5"
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

              {/* Account History Table */}
              <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                    <TableRow>
                      <TableHead className="px-6 py-3">Type</TableHead>
                      <TableHead className="px-6 py-3">Title</TableHead>
                      <TableHead className="px-6 py-3">Description</TableHead>
                      <TableHead className="px-6 py-3">Date</TableHead>
                      <TableHead className="px-6 py-3">Severity</TableHead>
                      <TableHead className="px-6 py-3">Status</TableHead>
                      <TableHead className="px-6 py-3">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-200">
                    {getFilteredAccountHistory().length > 0 ? (
                      getFilteredAccountHistory().map((item, index) => (
                        <TableRow key={`account-${item.id}-${index}`} className="hover:bg-gray-50">
                          <TableCell className="px-6 py-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getTypeIcon(item.type)}</span>
                              <Badge variant="outline" className="capitalize">
                                {item.type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3 font-medium">{item.title}</TableCell>
                          <TableCell className="px-6 py-3 max-w-xs truncate" title={item.description}>
                            {item.description}
                          </TableCell>
                          <TableCell className="px-6 py-3">{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell className="px-6 py-3">
                            <Badge className={getSeverityColor(item.severity)}>
                              {item.severity?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Badge className={getStatusColor(item.status)}>
                              {item.status?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <div className="space-y-1 text-sm">
                              {item.type === 'violation' && (
                                <>
                                  {item.details.duration && (
                                    <div>Duration: {item.details.duration}</div>
                                  )}
                                  {item.details.reinstatedDate && (
                                    <div className="text-green-600">
                                      Reinstated: {new Date(item.details.reinstatedDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </>
                              )}
                              {item.type === 'feedback' && (
                                <>
                                  {item.details.rating && <div>Rating: {item.details.rating}%</div>}
                                  {item.details.period && <div>Period: {item.details.period}</div>}
                                  {item.details.category && <div>Category: {item.details.category}</div>}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-4">📋</div>
                          <p className="text-lg font-medium">
                            {accountHistorySearchTerm ? 'No matching records found' : 'No account history found'}
                          </p>
                          <p className="text-sm">
                            {accountHistorySearchTerm
                              ? 'Try adjusting your search terms'
                              : 'Your account history will appear here when violations or feedback are recorded'}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Statistics */}
              {accountHistory.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {accountHistory.filter((item) => item.type === 'violation').length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Violations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {accountHistory.filter((item) => item.type === 'feedback').length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Feedback</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {accountHistory.filter((item) => item.severity === 'high').length || 0}
                    </div>
                    <div className="text-sm text-gray-600">High Severity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {accountHistory.filter(
                        (item) => item.status === 'completed' || item.status === 'reinstated'
                      ).length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Resolved</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

