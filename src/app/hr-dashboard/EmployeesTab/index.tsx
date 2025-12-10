'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Eye, FileText, Pencil, Trash2 } from "lucide-react";
import EvaluationsPagination from "@/components/paginationComponent";

interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch: string;
  hireDate?: string; // Optional - hire date removed from forms
  role: string;
  is_active?: string; // For status display
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
  const [employeesPage, setEmployeesPage] = useState(1);
  const [isPageChanging, setIsPageChanging] = useState(false);
  const itemsPerPage = 8;

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (employee.name?.toLowerCase() || '').includes(searchLower) ||
                           (employee.email?.toLowerCase() || '').includes(searchLower) ||
                           (employee.position?.toLowerCase() || '').includes(searchLower);
      const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;
      const matchesBranch = selectedBranch === 'all' || employee.branch === selectedBranch;
      
      return matchesSearch && matchesDepartment && matchesBranch;
    });
  }, [employees, searchTerm, selectedDepartment, selectedBranch]);

  // Pagination calculations
  const employeesTotal = filteredEmployees.length;
  const employeesTotalPages = Math.ceil(employeesTotal / itemsPerPage);
  const employeesStartIndex = (employeesPage - 1) * itemsPerPage;
  const employeesEndIndex = employeesStartIndex + itemsPerPage;
  const employeesPaginated = filteredEmployees.slice(employeesStartIndex, employeesEndIndex);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setEmployeesPage(1);
  }, [searchTerm, selectedDepartment, selectedBranch]);

  // Get performance employees for a level
  const getPerformanceEmployees = (level: string) => {
    const count = hrMetrics?.performanceDistribution[level as keyof typeof hrMetrics.performanceDistribution] || 0;
    return employees.slice(0, Math.min(count, 3)); // Show first 3 employees as example
  };

  // Calculate new hires this month
  const newHiresThisMonth = (() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return employees.filter(emp => {
      // Hire date removed - return false
      return false;
    }).length;
  })();

  return (
    <div className="relative space-y-4">
      <>
        {/* Main Employee Directory Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle>{employeeViewMode === 'directory' ? 'Employee Directory' : 'Performance Distribution'}</CardTitle>
                  <CardDescription>
                    {employeeViewMode === 'directory' ? 'Search and manage employees' : 'Employee performance overview'}
                  </CardDescription>
                </div>
                {/* Badge-style employee counts */}
                {employeeViewMode === 'directory' && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1 text-sm font-semibold bg-blue-50 text-blue-700 border-blue-200">
                      Total: {employees.length}
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 text-sm font-semibold bg-green-50 text-green-700 border-green-200">
                      New Hires: {newHiresThisMonth}
                    </Badge>
                  </div>
                )}
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
                <div className="relative">
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
                      <div className="relative overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <Table>
                          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Position</TableHead>
                              <TableHead>Branch</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Skeleton loading rows */}
                            {Array.from({ length: itemsPerPage }).map((_, index) => (
                              <TableRow key={`skeleton-employee-${index}`}>
                                <TableCell className="px-6 py-3">
                                  <Skeleton className="h-6 w-24" />
                                </TableCell>
                                <TableCell className="px-6 py-3">
                                  <Skeleton className="h-6 w-24" />
                                </TableCell>
                                <TableCell className="px-6 py-3">
                                  <Skeleton className="h-6 w-24" />
                                </TableCell>
                                <TableCell className="px-6 py-3">
                                  <Skeleton className="h-6 w-24" />
                                </TableCell>
                                <TableCell className="px-6 py-3">
                                  <Skeleton className="h-6 w-24" />
                                </TableCell>
                                <TableCell className="px-6 py-3">
                                  <Skeleton className="h-6 w-24" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <Table>
                          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Position</TableHead>
                              <TableHead>Branch</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(employeesRefreshing || isPageChanging) ? (
                              Array.from({ length: itemsPerPage }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`}>
                                  <TableCell className="px-6 py-3">
                                    <Skeleton className="h-6 w-24" />
                                  </TableCell>
                                  <TableCell className="px-6 py-3">
                                    <Skeleton className="h-6 w-24" />
                                  </TableCell>
                                  <TableCell className="px-6 py-3">
                                    <Skeleton className="h-6 w-24" />
                                  </TableCell>
                                  <TableCell className="px-6 py-3">
                                    <Skeleton className="h-6 w-24" />
                                  </TableCell>
                                  <TableCell className="px-6 py-3">
                                    <Skeleton className="h-6 w-24" />
                                  </TableCell>
                                  <TableCell className="px-6 py-3">
                                    <Skeleton className="h-6 w-24" />
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : employeesPaginated && Array.isArray(employeesPaginated) && employeesPaginated.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="text-center py-8 text-gray-500"
                                >
                                  <div className="flex flex-col items-center justify-center gap-4">
                                    <img
                                      src="/not-found.gif"
                                      alt="No data"
                                      className="w-25 h-25 object-contain"
                                      style={{
                                        imageRendering: "auto",
                                        willChange: "auto",
                                        transform: "translateZ(0)",
                                        backfaceVisibility: "hidden",
                                        WebkitBackfaceVisibility: "hidden",
                                      }}
                                    />
                                    <div className="text-gray-500">
                                      {searchTerm ? (
                                        <>
                                          <p className="text-base font-medium mb-1">
                                            No results found
                                          </p>
                                          <p className="text-sm text-gray-400">
                                            Try adjusting your search or filters
                                          </p>
                                        </>
                                      ) : (
                                        <>
                                          <p className="text-base font-medium mb-1">
                                            No evaluation records to display
                                          </p>
                                          <p className="text-sm text-gray-400">
                                            Records will appear here when evaluations
                                            are submitted
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : employeesPaginated && Array.isArray(employeesPaginated) && employeesPaginated.length > 0 ? (
                              employeesPaginated.map((employee) => (
                                <TableRow key={employee.id}>
                                  <TableCell className="font-medium">
                                    {employee.name}
                                  </TableCell>
                                  <TableCell>{employee.email}</TableCell>
                                  <TableCell>
                                    {employee.position || "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    {employee.branch || "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {employee.role || "N/A"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-600 hover:text-blue-700"
                                        onClick={() => onViewEmployee(employee)}
                                        title="View employee details"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-green-600 hover:text-green-700"
                                        onClick={() => onEvaluateEmployee(employee)}
                                        title="Evaluate employee performance"
                                      >
                                        <FileText className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-600 hover:text-blue-700"
                                        onClick={() => onEditEmployee(employee)}
                                        title="Edit employee"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={() => onDeleteEmployee(employee)}
                                        title="Delete employee"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : null}
                          </TableBody>
                        </Table>
                      </div>
                    </>
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

        {/* Pagination Controls */}
        {employeeViewMode === 'directory' && employeesTotal > itemsPerPage && (
          <EvaluationsPagination
            currentPage={employeesPage}
            totalPages={employeesTotalPages}
            total={employeesTotal}
            perPage={itemsPerPage}
            onPageChange={(page) => {
              setIsPageChanging(true);
              setEmployeesPage(page);
              // Simulate a brief loading delay for smooth transition
              setTimeout(() => {
                setIsPageChanging(false);
              }, 300);
            }}
          />
        )}
      </>
    </div>
  );
}

