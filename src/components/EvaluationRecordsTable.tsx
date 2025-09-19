// src/components/EvaluationRecordsTable.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvaluationRecords, useEvaluationRecordsStats, useEmployeeSignatureApproval } from '@/hooks/useEvaluationRecords';
import { EvaluationRecord } from '@/lib/evaluationRecordsService';
import { 
  RefreshCw, 
  Search, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  UserCheck,
  Calendar,
  Building,
  Filter
} from 'lucide-react';

interface EvaluationRecordsTableProps {
  showSearch?: boolean;
  showStats?: boolean;
  showFilters?: boolean;
  maxRows?: number;
  filterByEmployee?: number;
  filterByEvaluator?: string;
  filterByStatus?: string;
  filterByApprovalStatus?: string;
  onRecordSelect?: (record: EvaluationRecord) => void;
  onApproveRecord?: (record: EvaluationRecord) => void;
  className?: string;
}

export default function EvaluationRecordsTable({
  showSearch = true,
  showStats = false,
  showFilters = true,
  maxRows,
  filterByEmployee,
  filterByEvaluator,
  filterByStatus,
  filterByApprovalStatus,
  onRecordSelect,
  onApproveRecord,
  className = ''
}: EvaluationRecordsTableProps) {
  const { records, loading, error, refetch } = useEvaluationRecords();
  const { stats } = useEvaluationRecordsStats();
  const { approveWithSignature, loading: approving } = useEmployeeSignatureApproval();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(filterByStatus || '');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState(filterByApprovalStatus || '');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Filter records based on props and state
  const filteredRecords = React.useMemo(() => {
    let filtered = records;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(rec => 
        rec.employeeName.toLowerCase().includes(query) ||
        rec.evaluator.toLowerCase().includes(query) ||
        rec.category.toLowerCase().includes(query) ||
        rec.department?.toLowerCase().includes(query) ||
        rec.position?.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (filterByEmployee) {
      filtered = filtered.filter(rec => rec.employeeId === filterByEmployee);
    }

    if (filterByEvaluator) {
      filtered = filtered.filter(rec => rec.evaluatorId === filterByEvaluator);
    }

    if (statusFilter) {
      filtered = filtered.filter(rec => rec.status === statusFilter);
    }

    if (approvalStatusFilter) {
      filtered = filtered.filter(rec => rec.approvalStatus === approvalStatusFilter);
    }

    if (departmentFilter) {
      filtered = filtered.filter(rec => rec.department === departmentFilter);
    }

    if (maxRows) {
      filtered = filtered.slice(0, maxRows);
    }

    return filtered;
  }, [records, searchQuery, filterByEmployee, filterByEvaluator, statusFilter, approvalStatusFilter, departmentFilter, maxRows]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800"><FileText className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getApprovalStatusBadge = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'employee_approved':
        return <Badge className="bg-blue-100 text-blue-800"><UserCheck className="h-3 w-3 mr-1" />Employee Approved</Badge>;
      case 'evaluator_approved':
        return <Badge className="bg-purple-100 text-purple-800"><UserCheck className="h-3 w-3 mr-1" />Evaluator Approved</Badge>;
      case 'fully_approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Fully Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{approvalStatus}</Badge>;
    }
  };

  const handleApproveRecord = async (record: EvaluationRecord) => {
    if (onApproveRecord) {
      onApproveRecord(record);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading evaluation records...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading evaluation records: {error}</p>
            <Button onClick={refetch} variant="outline" className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Evaluation Records</span>
            {stats && (
              <Badge variant="outline" className="ml-2">
                {stats.total} total
              </Badge>
            )}
          </CardTitle>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by employee name, evaluator, category, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Approval Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Approval Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="employee_approved">Employee Approved</SelectItem>
                <SelectItem value="evaluator_approved">Evaluator Approved</SelectItem>
                <SelectItem value="fully_approved">Fully Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Departments</SelectItem>
                {stats?.byDepartment && Object.keys(stats.byDepartment).map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setApprovalStatusFilter('');
                setDepartmentFilter('');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        )}

        {showStats && stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-800">Total Records</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-yellow-800">Pending</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-green-800">Approved</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.byApprovalStatus?.fully_approved || 0}
              </div>
              <div className="text-sm text-purple-800">Fully Approved</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-red-800">Rejected</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Evaluator</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Quarter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    No evaluation records found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow 
                    key={record.id} 
                    className={onRecordSelect ? 'cursor-pointer hover:bg-gray-50' : ''}
                    onClick={() => onRecordSelect?.(record)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {record.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{record.employeeName}</div>
                          <div className="text-xs text-gray-500">ID: {record.employeeId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{record.evaluator}</div>
                        {record.evaluatorId && (
                          <div className="text-xs text-gray-500">{record.evaluatorId}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <span className="font-semibold">{record.rating}</span>
                        <span className="text-gray-500">/5</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Building className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{record.department || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{record.quarter} {record.year}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(record.status)}
                    </TableCell>
                    <TableCell>
                      {getApprovalStatusBadge(record.approvalStatus)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <div className="flex flex-col">
                        <span>{new Date(record.submittedAt).toLocaleDateString()}</span>
                        <span className="text-xs">{new Date(record.submittedAt).toLocaleTimeString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {onRecordSelect && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRecordSelect(record);
                            }}
                          >
                            View
                          </Button>
                        )}
                        {onApproveRecord && record.approvalStatus === 'pending' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveRecord(record);
                            }}
                            disabled={approving}
                          >
                            {approving ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              'Approve'
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredRecords.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredRecords.length} evaluation record{filteredRecords.length !== 1 ? 's' : ''}
            {searchQuery.trim() || statusFilter || approvalStatusFilter || departmentFilter ? ' (filtered)' : ''}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Example usage component
export function EvaluationRecordsTableExample() {
  const [selectedRecord, setSelectedRecord] = useState<EvaluationRecord | null>(null);

  const handleRecordSelect = (record: EvaluationRecord) => {
    setSelectedRecord(record);
    console.log('Selected record:', record);
  };

  const handleApproveRecord = (record: EvaluationRecord) => {
    console.log('Approving record:', record);
    // Handle approval logic here
  };

  return (
    <div className="space-y-6">
      <EvaluationRecordsTable
        showSearch={true}
        showStats={true}
        showFilters={true}
        maxRows={20}
        onRecordSelect={handleRecordSelect}
        onApproveRecord={handleApproveRecord}
        className="w-full"
      />

      {selectedRecord && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Evaluation Record</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Employee:</strong> {selectedRecord.employeeName}
              </div>
              <div>
                <strong>Evaluator:</strong> {selectedRecord.evaluator}
              </div>
              <div>
                <strong>Category:</strong> {selectedRecord.category}
              </div>
              <div>
                <strong>Rating:</strong> {selectedRecord.rating}/5
              </div>
              <div>
                <strong>Status:</strong> {selectedRecord.status}
              </div>
              <div>
                <strong>Approval Status:</strong> {selectedRecord.approvalStatus}
              </div>
              <div>
                <strong>Submitted:</strong> {new Date(selectedRecord.submittedAt).toLocaleDateString()}
              </div>
              <div>
                <strong>Department:</strong> {selectedRecord.department || 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
