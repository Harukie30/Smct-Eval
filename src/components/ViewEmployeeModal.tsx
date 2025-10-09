'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  role: string;
  hireDate: string;
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
      fetchEmployeeEvaluationHistory(employee.id, employee.name);
    }
  }, [isOpen, employee]);

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
    <DialogContent className="max-w-7xl mx-8 my-8 max-h-[90vh] overflow-hidden p-6 animate-popup">


     <div className="px-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Employee Details & Evaluation History
          </DialogTitle>
          <DialogDescription>
            Comprehensive view of employee information and their evaluation history
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Employee Header */}
          <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{employee.name}</h3>
              <p className="text-lg text-gray-600">{employee.position}</p>
              <p className="text-sm text-gray-500">{employee.department}</p>
            </div>
          </div>

          {/* Employee Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Employee ID</Label>
                <p className="text-lg font-semibold text-gray-900">#{employee.id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Email Address</Label>
                <p className="text-lg text-gray-900">{employee.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Role</Label>
                <Badge className="bg-blue-100 text-blue-800 text-sm">
                  {employee.role}
                </Badge>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Department</Label>
                <p className="text-lg text-gray-900">{employee.department}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Position</Label>
                <p className="text-lg text-gray-900">{employee.position}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Hire Date</Label>
                <p className="text-lg text-gray-900">
                  {new Date(employee.hireDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Performance Metrics Section */}
          {employeeEvaluationData.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const metrics = getEmployeePerformanceMetrics(employeeEvaluationData);
                  return (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{metrics.totalEvaluations}</div>
                        <div className="text-sm text-gray-600">Total Evaluations</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{metrics.averageRating}</div>
                        <div className="text-sm text-gray-600">Average Rating</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{metrics.highestRating}</div>
                        <div className="text-sm text-gray-600">Highest Rating</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {metrics.performanceTrend === 'improving' ? '↗' : 
                           metrics.performanceTrend === 'declining' ? '↘' : '→'}
                        </div>
                        <div className="text-sm text-gray-600 capitalize">{metrics.performanceTrend}</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Quarterly Performance Summary Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Quarterly Performance Summary</h4>
                <p className="text-sm text-gray-600">Performance overview grouped by quarter</p>
              </div>
              
            </div>

            {/* Search Bar */}
            <div className="mb-4 w-1/2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by quarter, year, or performance metrics..."
                  value={employeeSearchTerm}
                  onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {employeeSearchTerm && (
                  <button
                    onClick={() => setEmployeeSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-5 w-5 text-red-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Loading and Error States */}
            {isLoadingEmployeeData && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Loading employee data...</span>
                </div>
              </div>
            )}

            {employeeDataError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-800">{employeeDataError}</span>
                </div>
              </div>
            )}

            {/* Quarterly Performance Summary Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quarter</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Avg Rating</TableHead>
                    <TableHead className="text-right">Evaluations</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Performance Trend</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Use API data if available
                    const employeeSubmissions = employeeEvaluationData;

                    // Group submissions by quarter and year
                    const quarterlyData = employeeSubmissions.reduce((acc, submission) => {
                      const date = new Date(submission.submittedAt);
                      const year = date.getFullYear();
                      const quarter = Math.ceil((date.getMonth() + 1) / 3);
                      const key = `${year}-Q${quarter}`;
                      
                      if (!acc[key]) {
                        acc[key] = {
                          year,
                          quarter,
                          submissions: [],
                          categories: new Set(),
                          totalRating: 0,
                          count: 0
                        };
                      }
                      
                      acc[key].submissions.push(submission);
                      acc[key].categories.add(submission.category);
                      acc[key].totalRating += submission.rating || 0;
                      acc[key].count += 1;
                      
                      return acc;
                    }, {} as any);

                    // Convert to array and sort by year and quarter
                    const quarterlyArray = Object.values(quarterlyData)
                      .map((data: any) => ({
                        ...data,
                        avgRating: data.totalRating / data.count,
                        categories: Array.from(data.categories),
                        key: `${data.year}-Q${data.quarter}`
                      }))
                      .sort((a, b) => {
                        if (a.year !== b.year) return b.year - a.year;
                        return b.quarter - a.quarter;
                      });

                    // Apply search filter
                    const filteredData = quarterlyArray.filter(data => {
                      if (!employeeSearchTerm) return true;
                      const searchLower = employeeSearchTerm.toLowerCase();
                      return (
                        `Q${data.quarter}`.toLowerCase().includes(searchLower) ||
                        data.year.toString().includes(searchLower) ||
                        data.avgRating.toString().includes(searchLower) ||
                        data.categories.some((cat: string) => cat.toLowerCase().includes(searchLower))
                      );
                    });

                    return filteredData.length > 0 ? filteredData.map((data) => (
                      <TableRow key={data.key}>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800">
                            Q{data.quarter}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{data.year}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <span className="font-semibold text-lg">
                              {data.avgRating.toFixed(1)}
                            </span>
                            <span className="text-gray-500">/5</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-gray-100">
                            {data.count} evaluation{data.count !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {data.categories.slice(0, 2).map((category: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                            {data.categories.length > 2 && (
                              <Badge variant="outline" className="text-xs bg-gray-100">
                                +{data.categories.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {data.avgRating >= 4.0 ? (
                              <Badge className="bg-green-100 text-green-800">
                                ↗ Excellent
                              </Badge>
                            ) : data.avgRating >= 3.0 ? (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                → Good
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">
                                ↘ Needs Improvement
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Show all submissions for this quarter
                              const quarterSubmissions = data.submissions;
                              if (quarterSubmissions.length > 0) {
                                const submission = quarterSubmissions[0];
                                onViewSubmissionAction(submission);
                              }
                            }}
                            className="bg-blue-500 text-white hover:bg-blue-600"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          {employeeSearchTerm ? (
                            <>
                              <p>No quarterly data found matching "{employeeSearchTerm}"</p>
                              <p className="text-sm">Try adjusting your search terms</p>
                            </>
                          ) : (
                            <>
                              <p>No quarterly performance data found</p>
                              <p className="text-sm">Performance summaries will appear here once evaluations are completed</p>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onCloseAction}
              className="px-6 py-2 bg-blue-500 hover:bg-white hover:text-red-500 text-white"
            >
              <X className="w-4 h-4 mr-0" />
              Close
            </Button>
            <Button
              onClick={() => onStartEvaluationAction(employee)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white hover:text-white"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
