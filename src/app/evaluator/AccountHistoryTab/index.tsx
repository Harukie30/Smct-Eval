'use client';

import { useState, useMemo, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from '@/hooks/useToast';

interface AccountHistoryTabProps {
  isActive?: boolean;
}

export function AccountHistoryTab({
  isActive = false
}: AccountHistoryTabProps) {
  const { success } = useToast();
  const [accountHistory, setAccountHistory] = useState<any[]>([]);
  const [accountHistorySearchTerm, setAccountHistorySearchTerm] = useState('');
  const [isAccountHistoryRefreshing, setIsAccountHistoryRefreshing] = useState(false);

  // Load account history from localStorage
  const loadAccountHistory = () => {
    try {
      // Load all suspended employees data (violations/suspensions)
      const suspendedEmployees = JSON.parse(localStorage.getItem('suspendedEmployees') || '[]');
      
      // Format all suspension/violation records
      const history = suspendedEmployees.map((violation: any) => ({
        id: `violation-${violation.id}`,
        type: 'violation',
        title: 'Policy Violation',
        description: violation.suspensionReason,
        date: violation.suspensionDate,
        status: violation.status,
        severity: 'high',
        actionBy: violation.suspendedBy,
        employeeName: violation.name,
        employeeEmail: violation.email
      }));

      // Add some sample feedback records for variety
      const sampleFeedback = [
        {
          id: 'feedback-1',
          type: 'feedback',
          title: 'Performance Review',
          description: 'Quarterly performance evaluation completed',
          date: new Date().toISOString(),
          status: 'completed',
          severity: 'low',
          actionBy: 'HR Manager',
          employeeName: 'John Doe',
          employeeEmail: 'john.doe@company.com'
        },
        {
          id: 'feedback-2',
          type: 'feedback',
          title: 'Goal Setting',
          description: 'Annual goals reviewed and updated',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          severity: 'low',
          actionBy: 'Supervisor',
          employeeName: 'Jane Smith',
          employeeEmail: 'jane.smith@company.com'
        }
      ];

      return [...history, ...sampleFeedback];
    } catch (error) {
      console.error('Error loading account history:', error);
      return [];
    }
  };

  // Load account history on mount
  useEffect(() => {
    const history = loadAccountHistory();
    setAccountHistory(history);
  }, []);

  // Helper functions
  const getFilteredAccountHistory = useMemo(() => {
    if (!accountHistorySearchTerm) return accountHistory;

    return accountHistory.filter(item =>
      item.title.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
      item.actionBy.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(accountHistorySearchTerm.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(accountHistorySearchTerm.toLowerCase())
    );
  }, [accountHistory, accountHistorySearchTerm]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'reinstated': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'violation': return '⚠️';
      case 'feedback': return '💬';
      case 'review': return '📝';
      default: return '📋';
    }
  };

  // Function to handle account history refresh
  const handleAccountHistoryRefresh = async () => {
    try {
      setIsAccountHistoryRefreshing(true);
      
      // Add a 1-second delay to make skeleton visible
      setTimeout(async () => {
        const history = loadAccountHistory();
        setAccountHistory(history);
        
        success(
          'Account History Refreshed',
          'Account history data has been updated'
        );
        setIsAccountHistoryRefreshing(false);
      }, 1000); // 1-second delay to see skeleton properly
    } catch (error) {
      console.error('Error during account history refresh:', error);
      setIsAccountHistoryRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account History</CardTitle>
          <CardDescription>Track suspension records and account activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-6">
            {/* Search Controls */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                    <X className="h-5 w-5 text-red-400 hover:text-red-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Account History Actions */}
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {getFilteredAccountHistory.length} of {accountHistory.length} records
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAccountHistoryRefresh}
                disabled={isAccountHistoryRefreshing}
                className="flex items-center space-x-2 bg-blue-500 text-white hover:bg-green-700 hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${isAccountHistoryRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>

            {/* Account History Table */}
            {isAccountHistoryRefreshing ? (
              <div className="relative overflow-x-auto">
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
                    <p className="text-sm text-gray-600 font-medium">Loading account history...</p>
                  </div>
                </div>
                
                {/* Table structure visible in background */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 8 }).map((_, index) => (
                      <TableRow key={`skeleton-account-${index}`}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-12 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredAccountHistory.length > 0 ? getFilteredAccountHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getTypeIcon(item.type)}</span>
                            <Badge variant="outline" className="capitalize">
                              {item.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell className="max-w-xs truncate" title={item.description}>
                          {item.description}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.employeeName}</div>
                            <div className="text-sm text-gray-500">{item.employeeEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(item.severity)}>
                            {item.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getAccountStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.actionBy}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {accountHistorySearchTerm ? (
                            <>
                              <p className="text-lg font-medium">No matching records found</p>
                              <p className="text-sm">Try adjusting your search terms</p>
                            </>
                          ) : (
                            <>
                              <p className="text-lg font-medium">No account history found</p>
                              <p className="text-sm">Account history will appear here when violations or feedback are recorded</p>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}


            {/* Summary Statistics */}
            {!isAccountHistoryRefreshing && accountHistory.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {accountHistory.filter(item => item.type === 'violation').length}
                  </div>
                  <div className="text-sm text-gray-600">Violations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {accountHistory.filter(item => item.type === 'feedback').length}
                  </div>
                  <div className="text-sm text-gray-600">Feedback</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {accountHistory.filter(item => item.severity === 'high').length}
                  </div>
                  <div className="text-sm text-gray-600">High Severity</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {accountHistory.filter(item => item.status === 'completed' || item.status === 'reinstated').length}
                  </div>
                  <div className="text-sm text-gray-600">Resolved</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

