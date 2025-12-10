'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { X, Mail, Briefcase, Building2, User, Hash, Phone, Shield } from 'lucide-react';

interface Employee {
  id: number;
  name?: string;
  email?: string;
  position?: string;
  department?: string;
  role?: string;
}

interface ViewEmployeeModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  employee: Employee | null;
  onStartEvaluationAction: (employee: Employee) => void;
  onViewSubmissionAction: (submission: any) => void;
}

export default function ViewEmployeeModal({
  isOpen,
  onCloseAction,
  employee,
  onStartEvaluationAction,
  onViewSubmissionAction
}: ViewEmployeeModalProps) {
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeEvaluationData, setEmployeeEvaluationData] = useState<any[]>([]);
  const [isLoadingEmployeeData, setIsLoadingEmployeeData] = useState(false);
  const [employeeDataError, setEmployeeDataError] = useState<string | null>(null);

  // API Functions for Employee Data Tracking
  const fetchEmployeeEvaluationHistory = async (employeeId: number, employeeName: string) => {
    setIsLoadingEmployeeData(true);
    setEmployeeDataError(null);
    
    try {
      console.log('Fetching evaluation history for employee:', { employeeId, employeeName });
      
      // Get all submissions from localStorage
      const allSubmissions = JSON.parse(localStorage.getItem('evaluationSubmissions') || '[]');
      
      // Filter submissions for this specific employee
      const employeeSubmissions = allSubmissions.filter((submission: any) => 
        submission.employeeId === employeeId || 
        submission.employeeName === employeeName ||
        submission.employeeEmail === employee?.email
      );
      
      console.log('Found submissions for employee:', employeeSubmissions.length);
      
      setEmployeeEvaluationData(employeeSubmissions);
      console.log('Employee evaluation data loaded:', employeeSubmissions);
      
      return employeeSubmissions;
    } catch (err) {
      console.error('Error fetching employee evaluation history:', err);
      setEmployeeDataError('Failed to load employee evaluation data');
      throw err;
    } finally {
      setIsLoadingEmployeeData(false);
    }
  };

  const getEmployeePerformanceMetrics = (employeeData: any[]) => {
    if (!employeeData || employeeData.length === 0) {
      return {
        totalEvaluations: 0,
        averageRating: 0,
        highestRating: 0,
        lowestRating: 0,
        categories: [],
        quarterlyBreakdown: {},
        performanceTrend: 'stable'
      };
    }

    const ratings = employeeData.map(sub => sub.rating || 0).filter(r => r > 0);
    const categories = [...new Set(employeeData.map(sub => sub.category).filter(Boolean))];
    
    // Calculate quarterly breakdown
    const quarterlyBreakdown = employeeData.reduce((acc, submission) => {
      const date = new Date(submission.submittedAt);
      const quarter = `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;
      
      if (!acc[quarter]) {
        acc[quarter] = { count: 0, totalRating: 0, submissions: [] };
      }
      
      acc[quarter].count += 1;
      acc[quarter].totalRating += submission.rating || 0;
      acc[quarter].submissions.push(submission);
      
      return acc;
    }, {});

    // Calculate performance trend
    const sortedByDate = employeeData.sort((a, b) => 
      new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );
    
    let performanceTrend = 'stable';
    if (sortedByDate.length >= 2) {
      const recent = sortedByDate.slice(-3).map(s => s.rating || 0);
      const older = sortedByDate.slice(0, -3).map(s => s.rating || 0);
      
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        if (recentAvg > olderAvg + 0.5) performanceTrend = 'improving';
        else if (recentAvg < olderAvg - 0.5) performanceTrend = 'declining';
      }
    }

    return {
      totalEvaluations: employeeData.length,
      averageRating: ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2) : 0,
      highestRating: Math.max(...ratings, 0),
      lowestRating: Math.min(...ratings, 5),
      categories,
      quarterlyBreakdown,
      performanceTrend
    };
  };


  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && employee) {
      fetchEmployeeEvaluationHistory(employee.id, employee.name || '');
    }
  }, [isOpen, employee]);

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 animate-popup">
        <DialogHeader className="pb-6 border-b border-gray-200">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            Employee Profile
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 mt-2">
            Complete employee information and evaluation history
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          {/* Employee Header Card */}
          <Card className="bg-white border-2 border-blue-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
                  {(employee.name || 'N/A').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'N/A'}
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-black mb-2">{employee.name || 'Not Assigned'}</h2>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <Badge variant="outline" className="text-base px-3 py-1 bg-blue-50 text-blue-700 border-blue-300">
                      <Briefcase className="w-4 h-4 mr-1.5" />
                      {employee.position || 'Not Assigned'}
                    </Badge>
                    <Badge variant="outline" className="text-base px-3 py-1 bg-purple-50 text-purple-700 border-purple-300">
                      <Building2 className="w-4 h-4 mr-1.5" />
                      {employee.department || 'Not Assigned'}
                    </Badge>
                    <Badge variant="outline" className="text-base px-3 py-1 bg-green-50 text-green-700 border-green-300">
                      <Shield className="w-4 h-4 mr-1.5" />
                      {employee.role || 'Not Assigned'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee ID Card */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Hash className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employee ID</Label>
                    <p className="text-lg font-semibold text-black mt-1">#{employee.id || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Card */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email Address</Label>
                    <p className="text-sm font-medium text-black mt-1 truncate">{employee.email || 'Not Assigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Position Card */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Position</Label>
                    <p className="text-sm font-medium text-black mt-1">{employee.position || 'Not Assigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Card */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</Label>
                    <p className="text-sm font-medium text-black mt-1">{employee.department || 'Not Assigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics Section */}
          {employeeEvaluationData.length > 0 && (
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <h4 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Performance Overview
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const metrics = getEmployeePerformanceMetrics(employeeEvaluationData);
                    return (
                      <>
                        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200">
                          <div className="text-3xl font-bold text-blue-600 mb-1">{metrics.totalEvaluations}</div>
                          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Evaluations</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200">
                          <div className="text-3xl font-bold text-green-600 mb-1">{metrics.averageRating}</div>
                          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Average Rating</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200">
                          <div className="text-3xl font-bold text-purple-600 mb-1">{metrics.highestRating}</div>
                          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Highest Rating</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200">
                          <div className="text-3xl font-bold text-orange-600 mb-1">
                            {metrics.performanceTrend === 'improving' ? '↗' : 
                             metrics.performanceTrend === 'declining' ? '↘' : '→'}
                          </div>
                          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide capitalize">{metrics.performanceTrend}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onCloseAction}
              className="px-6 py-2 border-gray-300 hover:bg-gray-50"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button
              onClick={() => onStartEvaluationAction(employee)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Evaluate Employee
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
