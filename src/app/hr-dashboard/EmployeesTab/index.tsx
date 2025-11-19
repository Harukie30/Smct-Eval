'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Eye, FileText, Pencil, Trash2 } from "lucide-react";

interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch: string;
  hireDate: string;
  role: string;
}

interface Department {
  id: number;
  name: string;
  manager: string;
  employeeCount: number;
  performance: number;
}

interface HRMetrics {
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
  turnoverRate: number;
  averageTenure: number;
  departmentsCount: number;
  branchesCount: number;
  genderDistribution: {
    male: number;
    female: number;
  };
  ageDistribution: {
    '18-25': number;
    '26-35': number;
    '36-45': number;
    '46+': number;
  };
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
}

interface EmployeesTabProps {
  employees: Employee[];
  departments: Department[];
  branches: { id: string; name: string }[];
  hrMetrics: HRMetrics | null;
  employeesRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onViewEmployee: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onEvaluateEmployee: (employee: Employee) => void;
  onViewPerformanceEmployees: (level: string) => void;
  onAddEmployee: () => void;
  isActive?: boolean;
}

export function EmployeesTab({
  employees,
  departments,
  branches,
  hrMetrics,
  employeesRefreshing,
  onRefresh,
  onViewEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onEvaluateEmployee,
  onViewPerformanceEmployees,
  onAddEmployee,
  isActive = false
}: EmployeesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [employeeViewMode, setEmployeeViewMode] = useState<'directory' | 'performance'>('directory');

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;
      const matchesBranch = selectedBranch === 'all' || employee.branch === selectedBranch;
      
      return matchesSearch && matchesDepartment && matchesBranch;
    });
  }, [employees, searchTerm, selectedDepartment, selectedBranch]);

  // Get performance employees for a level
  const getPerformanceEmployees = (level: string) => {
    const count = hrMetrics?.performanceDistribution[level as keyof typeof hrMetrics.performanceDistribution] || 0;
    return employees.slice(0, Math.min(count, 3)); // Show first 3 employees as example
  };

  return (
    <div className="relative space-y-4">
      <>
        {/* Employee Status Cards - Separate from table */}
        {employeeViewMode === 'directory' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Total Employees */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{employees.length}</p>
              </CardContent>
            </Card>

            {/* New Hires This Month */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">New Hires This Month</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(() => {
                    const now = new Date();
                    const currentMonth = now.getMonth();
                    const currentYear = now.getFullYear();
                    return employees.filter(emp => {
                      const hireDate = new Date(emp.hireDate);
                      return hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear;
                    }).length;
                  })()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Employee Directory Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{employeeViewMode === 'directory' ? 'Employee Directory' : 'Performance Distribution'}</CardTitle>
                <CardDescription>
                  {employeeViewMode === 'directory' ? 'Search and manage employees' : 'Employee performance overview'}
                </CardDescription>
              </div>
              {/* Toggle Switch */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={employeeViewMode === 'directory' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setEmployeeViewMode('directory')}
                  className={employeeViewMode === 'directory' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}
                >
                  👥 Directory
                </Button>
                <Button
                  variant={employeeViewMode === 'performance' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setEmployeeViewMode('performance')}
                  className={employeeViewMode === 'performance' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}
                >
                  📊 Performance
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Employee Directory View */}
            {employeeViewMode === 'directory' && (
              <>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-between">
                        {selectedDepartment === 'all' ? 'All Departments' : selectedDepartment || 'Department'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[180px]">
                      <DropdownMenuItem 
                        onClick={() => setSelectedDepartment('all')}
                        className={selectedDepartment === 'all' ? "bg-accent" : ""}
                      >
                        All Departments
                      </DropdownMenuItem>
                      {departments.map(dept => (
                        <DropdownMenuItem 
                          key={dept.id} 
                          onClick={() => setSelectedDepartment(dept.name)}
                          className={selectedDepartment === dept.name ? "bg-accent" : ""}
                        >
                          {dept.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-between">
                        {selectedBranch === 'all' ? 'All Branches' : selectedBranch || 'Branch'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[180px]">
                      <DropdownMenuItem 
                        onClick={() => setSelectedBranch('all')}
                        className={selectedBranch === 'all' ? "bg-accent" : ""}
                      >
                        All Branches
                      </DropdownMenuItem>
                      {branches.map(branch => (
                        <DropdownMenuItem 
                          key={branch.id} 
                          onClick={() => setSelectedBranch(branch.name)}
                          className={selectedBranch === branch.name ? "bg-accent" : ""}
                        >
                          {branch.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={onRefresh}
                    disabled={employeesRefreshing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                    title="Refresh employee data"
                  >
                    {employeesRefreshing ? (
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
                  <Button
                    onClick={onAddEmployee}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white"
                    title="Add new employee"
                  >
                    <div className="flex items-center space-x-2">
                      <span>➕</span>
                      <span>Add Employee</span>
                    </div>
                  </Button>
                </div>

                {/* Employee Table */}
                <div className="relative max-h-[70vh] overflow-y-auto min-h-[400px]">
                  {employeesRefreshing ? (
                    <>
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
                          <p className="text-sm text-gray-600 font-medium">Loading employees...</p>
                        </div>
                      </div>
                      
                      {/* Table structure visible in background */}
                      <Table className="w-full">
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow>
                            <TableHead className="w-auto">Name</TableHead>
                            <TableHead className="w-auto">Email</TableHead>
                            <TableHead className="w-auto">Position</TableHead>
                            <TableHead className="w-auto">Branch</TableHead>
                            <TableHead className="w-auto">Hire Date</TableHead>
                            <TableHead className="w-auto text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Skeleton loading rows */}
                          {Array.from({ length: 8 }).map((_, index) => (
                            <TableRow key={`skeleton-employee-${index}`}>
                              <TableCell className="px-6 py-3">
                                <div className="space-y-1">
                                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-6 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  ) : (
                    <Table className="w-full">
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="w-auto">Name</TableHead>
                          <TableHead className="w-auto">Email</TableHead>
                          <TableHead className="w-auto">Position</TableHead>
                          <TableHead className="w-auto">Branch</TableHead>
                          <TableHead className="w-auto">Hire Date</TableHead>
                          <TableHead className="w-auto text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                              No employees found matching your criteria
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredEmployees.map((employee) => (
                            <TableRow key={employee.id}>
                              <TableCell className="font-medium">{employee.name}</TableCell>
                              <TableCell className="text-sm text-gray-600">{employee.email}</TableCell>
                              <TableCell>{employee.position}</TableCell>
                              <TableCell>{employee.branch}</TableCell>
                              <TableCell>
                                {new Date(employee.hireDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                    onClick={() => onViewEmployee(employee)}
                                    title="View employee details"
                                  >
                                    <Eye className="h-4 w-4 text-white" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => onEvaluateEmployee(employee)}
                                    title="Evaluate employee performance"
                                  >
                                    <FileText className="h-4 w-4 text-white" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-blue-800 hover:bg-blue-900"
                                    onClick={() => onEditEmployee(employee)}
                                    title="Edit employee"
                                  >
                                    <Pencil className="h-4 w-4 text-white" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
                                    onClick={() => onDeleteEmployee(employee)}
                                    title="Delete employee"
                                  >
                                    <Trash2 className="h-4 w-4 text-white" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </>
            )}

            {/* Performance Distribution View */}
            {employeeViewMode === 'performance' && (
              <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2">
                {Object.entries(hrMetrics?.performanceDistribution || {}).map(([level, count]) => {
                  // Get employees for this performance level (mock data for now)
                  const performanceEmployees = getPerformanceEmployees(level);
                  
                  return (
                    <div key={level} className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="capitalize font-semibold text-lg">{level}</span>
                          <Badge variant="outline" className="text-xs">
                            {count} employees
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-xs h-7 px-3 hover:bg-blue-100"
                          onClick={() => onViewPerformanceEmployees(level)}
                        >
                          View All →
                        </Button>
                      </div>
                      <Progress 
                        value={(count / (hrMetrics?.totalEmployees || 1)) * 100} 
                        className="h-3"
                      />
                      {performanceEmployees.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <p className="text-xs text-gray-600 font-medium">Sample employees:</p>
                          <div className="space-y-2">
                            {performanceEmployees.map((emp) => (
                              <div key={emp.id} className="flex items-center justify-between text-sm bg-white p-3 rounded border border-gray-200 hover:border-blue-300 transition-colors">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <span className="font-medium">{emp.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{emp.department}</Badge>
                                  <span className="text-gray-500 text-xs">{emp.position}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </>
    </div>
  );
}

