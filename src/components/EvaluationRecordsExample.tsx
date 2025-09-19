// src/components/EvaluationRecordsExample.tsx

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EvaluationRecordsTable from './EvaluationRecordsTable';
import EmployeeSignatureApproval from './EmployeeSignatureApproval';
import { useEvaluationRecords, useEvaluationRecordsStats } from '@/hooks/useEvaluationRecords';
import { EvaluationRecord } from '@/lib/evaluationRecordsService';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  UserCheck,
  TrendingUp,
  Calendar
} from 'lucide-react';

export default function EvaluationRecordsExample() {
  const { records, loading, error, refetch } = useEvaluationRecords();
  const { stats } = useEvaluationRecordsStats();
  const [selectedRecord, setSelectedRecord] = useState<EvaluationRecord | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  const handleRecordSelect = (record: EvaluationRecord) => {
    setSelectedRecord(record);
    console.log('Selected record:', record);
  };

  const handleApproveRecord = (record: EvaluationRecord) => {
    setSelectedRecord(record);
    setShowApprovalDialog(true);
  };

  const handleApprovalSuccess = (record: EvaluationRecord) => {
    console.log('Approval successful:', record);
    // Refresh the records to show updated status
    refetch();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading evaluation records...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading evaluation records: {error}</p>
            <Button onClick={refetch} variant="outline" className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-sm text-gray-600">Total Records</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  <p className="text-sm text-gray-600">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.byApprovalStatus?.fully_approved || 0}
                  </p>
                  <p className="text-sm text-gray-600">Fully Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Department Breakdown */}
      {stats?.byDepartment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Records by Department</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.byDepartment).map(([department, count]) => (
                <div key={department} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-lg font-semibold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600">{department}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quarter Breakdown */}
      {stats?.byQuarter && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Records by Quarter</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(stats.byQuarter).map(([quarter, count]) => (
                <div key={quarter} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-lg font-semibold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600">{quarter}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Records Table */}
      <EvaluationRecordsTable
        showSearch={true}
        showStats={false} // We're showing stats above
        showFilters={true}
        maxRows={15}
        onRecordSelect={handleRecordSelect}
        onApproveRecord={handleApproveRecord}
        className="w-full"
      />

      {/* Selected Record Details */}
      {selectedRecord && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Evaluation Record Details</CardTitle>
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
                <strong>Department:</strong> {selectedRecord.department || 'N/A'}
              </div>
              <div>
                <strong>Position:</strong> {selectedRecord.position || 'N/A'}
              </div>
              <div>
                <strong>Quarter:</strong> {selectedRecord.quarter} {selectedRecord.year}
              </div>
              <div>
                <strong>Status:</strong> 
                <Badge className="ml-2 bg-blue-100 text-blue-800">{selectedRecord.status}</Badge>
              </div>
              <div>
                <strong>Approval Status:</strong>
                <Badge className="ml-2 bg-gray-100 text-gray-800">{selectedRecord.approvalStatus}</Badge>
              </div>
              <div>
                <strong>Submitted:</strong> {new Date(selectedRecord.submittedAt).toLocaleDateString()}
              </div>
              {selectedRecord.employeeApprovedAt && (
                <div>
                  <strong>Employee Approved:</strong> {new Date(selectedRecord.employeeApprovedAt).toLocaleDateString()}
                </div>
              )}
              {selectedRecord.evaluatorApprovedAt && (
                <div>
                  <strong>Evaluator Approved:</strong> {new Date(selectedRecord.evaluatorApprovedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Signature Approval Dialog */}
      <EmployeeSignatureApproval
        isOpen={showApprovalDialog}
        onClose={() => setShowApprovalDialog(false)}
        record={selectedRecord}
        onApprovalSuccess={handleApprovalSuccess}
      />
    </div>
  );
}
