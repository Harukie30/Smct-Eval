'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Eye, FileText, Pencil, Trash2 } from "lucide-react";
import { apiService } from '@/lib/apiService';
import { toastMessages } from '@/lib/toastMessages';

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
  const [tab, setTab] = useState<'active' | 'new'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [employeeViewMode, setEmployeeViewMode] = useState<'directory' | 'performance'>('directory');
  const [employeesPage, setEmployeesPage] = useState(1);
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);
  const itemsPerPage = 8;

  // New Registrations state
  const [pendingRegistrations, setPendingRegistrations] = useState<Employee[]>([]);
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingItemsPerPage, setPendingItemsPerPage] = useState(8);
  const [pendingTotalItems, setPendingTotalItems] = useState(0);
  const [isPendingLoading, setIsPendingLoading] = useState(false);

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

  // Load pending registrations
  const loadPendingRegistrations = async () => {
    try {
      setIsPendingLoading(true);
      const response = await apiService.getPendingRegistrations(
        pendingSearchTerm,
        statusFilter,
        pendingPage,
        pendingItemsPerPage
      );

      let pendingUsersData: Employee[] = [];
      let total = 0;

      if (response) {
        if (response.data && Array.isArray(response.data)) {
          pendingUsersData = response.data;
          total = response.total || 0;
        } else if (Array.isArray(response)) {
          total = response.length;
          const startIndex = (pendingPage - 1) * pendingItemsPerPage;
          const endIndex = startIndex + pendingItemsPerPage;
          pendingUsersData = response.slice(startIndex, endIndex);
        } else if (response.users && Array.isArray(response.users)) {
          if (response.total && response.last_page) {
            pendingUsersData = response.users;
            total = response.total;
          } else {
            total = response.users.length;
            const startIndex = (pendingPage - 1) * pendingItemsPerPage;
            const endIndex = startIndex + pendingItemsPerPage;
            pendingUsersData = response.users.slice(startIndex, endIndex);
          }
        }
      }

      setPendingRegistrations(pendingUsersData);
      setPendingTotalItems(total);
    } catch (error) {
      console.error("Error loading pending registrations:", error);
      setPendingRegistrations([]);
      setPendingTotalItems(0);
    } finally {
      setIsPendingLoading(false);
    }
  };

  // Reset to page 1 when switching to new registrations tab or when filters change
  useEffect(() => {
    if (tab === 'new') {
      setPendingPage(1);
    }
  }, [tab, pendingSearchTerm, statusFilter]);

  // Load pending registrations when tab changes, filters change, or page changes
  useEffect(() => {
    if (tab === 'new') {
      loadPendingRegistrations();
    }
  }, [tab, pendingSearchTerm, statusFilter, pendingPage]);

  // Handle approve registration
  const handleApproveRegistration = async (registrationId: number, registrationName: string) => {
    try {
      await apiService.approveRegistration(registrationId);
      await loadPendingRegistrations();
      await onRefresh(); // Refresh active employees list
      toastMessages.user.approved(registrationName);
    } catch (error) {
      console.error("Error approving registration:", error);
      toastMessages.generic.error(
        "Approval Error",
        "An error occurred while approving the registration. Please try again."
      );
    }
  };

  // Handle reject registration
  const handleRejectRegistration = async (registrationId: number, registrationName: string) => {
    try {
      await apiService.rejectRegistration(registrationId);
      await loadPendingRegistrations();
      toastMessages.user.rejected(registrationName);
    } catch (error) {
      console.error("Error rejecting registration:", error);
      toastMessages.generic.error(
        "Rejection Error",
        "An error occurred while rejecting the registration. Please try again."
      );
    }
  };

  return (
    <div className="relative space-y-4">
      <>
        {/* Tab Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex space-x-1">
              <Button
                variant={tab === "active" ? "default" : "outline"}
                onClick={() => setTab("active")}
                className="flex items-center gap-2"
              >
                <span>👥</span>
                Active Employees ({employees.length})
              </Button>
              <Button
                variant={tab === "new" ? "default" : "outline"}
                onClick={() => setTab("new")}
                className="flex items-center gap-2"
              >
                <span>🆕</span>
                New Registrations ({pendingTotalItems})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Employees Tab */}
        {tab === "active" && (
          <>
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
                      onClick={() => {
                        setIsPerformanceLoading(true);
                        setEmployeeViewMode('performance');
                        // Simulate loading delay for smooth transition
                        setTimeout(() => {
                          setIsPerformanceLoading(false);
                        }, 2000);
                      }}
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

                    {/* Role and Status Color Indicators */}
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">Role Indicators:</span>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-300">
                            Admin
                          </Badge>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300">
                            HR
                          </Badge>
                          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300">
                            Evaluator
                          </Badge>
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300">
                            Employee
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">Status Indicators:</span>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300">
                            ✨ New Added 
                          </Badge>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300">
                            🕐 Recently Added 
                          </Badge>
                        </div>
                      </div>
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
                                  employeesPaginated.map((employee) => {
                                    // Check if user is new (within 30 minutes) or recently added (after 30 minutes, within 48 hours)
                                    const createdDate = (employee as any).created_at ? new Date((employee as any).created_at) : null;
                                    let isNew = false;
                                    let isRecentlyAdded = false;

                                    if (createdDate) {
                                      const now = new Date();
                                      const minutesDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60);
                                      const hoursDiff = minutesDiff / 60;
                                      isNew = minutesDiff <= 30;
                                      isRecentlyAdded = minutesDiff > 30 && hoursDiff <= 48;
                                    }

                                    return (
                                      <TableRow
                                        key={employee.id}
                                        className={
                                          isNew
                                            ? "bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                                            : isRecentlyAdded
                                              ? "bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                                              : "hover:bg-blue-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                                        }
                                      >
                                        <TableCell className="font-medium">
                                          <div className="flex items-center gap-2">
                                            <span>{employee.name}</span>
                                            {isNew && (
                                              <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 font-semibold">
                                                ✨
                                              </Badge>
                                            )}
                                            {isRecentlyAdded && !isNew && (
                                              <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5 font-semibold">
                                                🕐
                                              </Badge>
                                            )}
                                          </div>
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
                                    );
                                  })
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
                    {isPerformanceLoading ? (
                      // Skeleton loading animation
                      Array.from({ length: 4 }).map((_, index) => (
                        <div key={`skeleton-performance-${index}`} className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <Skeleton className="h-6 w-24" />
                              <Skeleton className="h-5 w-20" />
                            </div>
                            <Skeleton className="h-7 w-20" />
                          </div>
                          <Skeleton className="h-3 w-full" />
                          <div className="space-y-2 mt-3">
                            <Skeleton className="h-4 w-32" />
                            <div className="space-y-2">
                              {Array.from({ length: 2 }).map((_, empIndex) => (
                                <div key={`skeleton-emp-${empIndex}`} className="flex items-center justify-between text-sm bg-white p-3 rounded border border-gray-200">
                                  <div className="flex items-center space-x-3">
                                    <Skeleton className="w-2 h-2 rounded-full" />
                                    <Skeleton className="h-4 w-32" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-20" />
                                    <Skeleton className="h-4 w-24" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      Object.entries(hrMetrics?.performanceDistribution || {}).map(([level, count]) => {
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
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination Controls for Active Employees - Outside table, centered */}
            {tab === "active" && employeeViewMode === 'directory' && !isPageChanging && employeesTotal > itemsPerPage && (
              <div className="w-full flex flex-col items-center justify-center py-4 px-4">
                <div className="text-center text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                  Showing {employeesStartIndex + 1} to {Math.min(employeesEndIndex, employeesTotal)} of {employeesTotal} records
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsPageChanging(true);
                      setEmployeesPage(Math.max(1, employeesPage - 1));
                      setTimeout(() => {
                        setIsPageChanging(false);
                      }, 300);
                    }}
                    disabled={employeesPage === 1 || isPageChanging}
                    className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-0.5 md:gap-1">
                    {Array.from({ length: employeesTotalPages }, (_, i) => i + 1).map((page) => {
                      if (page === 1 || page === employeesTotalPages || (page >= employeesPage - 1 && page <= employeesPage + 1)) {
                        return (
                          <Button
                            key={page}
                            variant={employeesPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setIsPageChanging(true);
                              setEmployeesPage(page);
                              setTimeout(() => {
                                setIsPageChanging(false);
                              }, 300);
                            }}
                            disabled={isPageChanging}
                            className={`text-xs md:text-sm w-7 h-7 md:w-8 md:h-8 p-0 ${
                              employeesPage === page
                                ? "bg-blue-700 text-white hover:bg-blue-500 hover:text-white"
                                : "bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                            }`}
                          >
                            {page}
                          </Button>
                        );
                      } else if (page === employeesPage - 2 || page === employeesPage + 2) {
                        return <span key={page} className="text-gray-400 text-xs md:text-sm">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsPageChanging(true);
                      setEmployeesPage(Math.min(employeesTotalPages, employeesPage + 1));
                      setTimeout(() => {
                        setIsPageChanging(false);
                      }, 300);
                    }}
                    disabled={employeesPage === employeesTotalPages || isPageChanging}
                    className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* New Registrations Tab */}
        {tab === "new" && (
          <Card>
            <CardHeader>
              <CardTitle>New Registrations</CardTitle>
              <CardDescription>
                Review and approve new user registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <div className="relative flex-1 max-w-md">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                      </span>
                      <Input
                        placeholder="Search new registrations..."
                        className="w-64 pl-10"
                        value={pendingSearchTerm}
                        onChange={(e) => setPendingSearchTerm(e.target.value)}
                      />
                      {pendingSearchTerm && (
                        <button
                          onClick={() => setPendingSearchTerm("")}
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
                    <Select
                      value={statusFilter || "all"}
                      onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending Verification</SelectItem>
                        <SelectItem value="declined">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={loadPendingRegistrations}
                      disabled={isPendingLoading}
                      className="flex items-center bg-blue-500 text-white hover:bg-blue-700 hover:text-white gap-2"
                    >
                      {isPendingLoading ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <svg
                            className="h-5 w-5 font-bold"
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
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Status Color Indicator */}
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Status Indicators:</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300">
                      ⚡ New (≤24h)
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300">
                      🕐 Recent (24-48h)
                    </Badge>
                    <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-300">
                      ✗ Rejected
                    </Badge>
                  </div>
                </div>

                <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto rounded-lg border [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b border-gray-200">
                      <TableRow>
                        <TableHead className="px-6 py-3">Name</TableHead>
                        <TableHead className="px-6 py-3">Email</TableHead>
                        <TableHead className="px-6 py-3">Position</TableHead>
                        <TableHead className="px-6 py-3">Registration Date</TableHead>
                        <TableHead className="px-6 py-3">Status</TableHead>
                        <TableHead className="px-6 py-3">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-200">
                      {isPendingLoading ? (
                        Array.from({ length: pendingItemsPerPage }).map((_, index) => (
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
                      ) : pendingRegistrations.length === 0 ? (
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
                                {pendingSearchTerm ? (
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
                                      No new registrations
                                    </p>
                                    <p className="text-sm text-gray-400">
                                      New registrations will appear here
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : pendingRegistrations &&
                        Array.isArray(pendingRegistrations) &&
                        pendingRegistrations.length > 0 ? (
                        pendingRegistrations.map((account) => {
                          // Check if registration is new (within 24 hours) or recent (24-48 hours)
                          const registrationDate = new Date((account as any).created_at);
                          const now = new Date();
                          const hoursDiff = (now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60);
                          const isNew = hoursDiff <= 24;
                          const isRecent = hoursDiff > 24 && hoursDiff <= 48;
                          const isRejected = (account as any).is_active === "declined";

                          return (
                            <TableRow
                              key={account.id}
                              className={
                                isRejected
                                  ? "bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100"
                                  : isNew
                                    ? "bg-yellow-50 border-l-4 border-l-yellow-500 hover:bg-yellow-100"
                                    : isRecent
                                      ? "bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100"
                                      : "hover:bg-gray-50"
                              }
                            >
                              <TableCell className="px-6 py-3 font-medium">
                                <div className="flex items-center gap-2">
                                  <span>{(account as any).fname + " " + (account as any).lname}</span>
                                  {!isRejected && isNew && (
                                    <Badge className="bg-yellow-500 text-white text-xs px-2 py-0.5 font-semibold">
                                      ⚡ New
                                    </Badge>
                                  )}
                                  {!isRejected && isRecent && !isNew && (
                                    <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5 font-semibold">
                                      🕐 Recent
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                {account.email}
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                {(account as any).positions?.label || (account as any).position || "N/A"}
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                {new Date(
                                  (account as any).created_at
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <Badge
                                  className={
                                    (account as any).is_active === "declined"
                                      ? "bg-red-100 text-red-800 hover:bg-red-200"
                                      : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                  }
                                >
                                  {(account as any).is_active === "declined"
                                    ? "REJECTED"
                                    : "PENDING VERIFICATION"}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="flex space-x-2">
                                  {(account as any).is_active === "pending" && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white bg-green-500 hover:text-white hover:bg-green-600"
                                        onClick={() =>
                                          handleApproveRegistration(
                                            account.id,
                                            (account as any).fname
                                          )
                                        }
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white bg-red-500 hover:bg-red-600 hover:text-white"
                                        onClick={() =>
                                          handleRejectRegistration(
                                            account.id,
                                            (account as any).fname
                                          )
                                        }
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {(account as any).is_active === "declined" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700"
                                      onClick={() =>
                                        handleApproveRegistration(
                                          account.id,
                                          (account as any).fname
                                        )
                                      }
                                    >
                                      Approve
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination for New Registrations - Outside table, centered */}
        {tab === "new" && !isPendingLoading && pendingTotalItems > pendingItemsPerPage && (() => {
          const pendingTotalPages = Math.ceil(pendingTotalItems / pendingItemsPerPage);
          const pendingStartIndex = (pendingPage - 1) * pendingItemsPerPage;
          const pendingEndIndex = pendingStartIndex + pendingItemsPerPage;
          return (
            <div className="w-full flex flex-col items-center justify-center py-4 px-4">
              <div className="text-center text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                Showing {pendingStartIndex + 1} to {Math.min(pendingEndIndex, pendingTotalItems)} of {pendingTotalItems} records
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingPage(Math.max(1, pendingPage - 1))}
                  disabled={pendingPage === 1 || isPendingLoading}
                  className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-0.5 md:gap-1">
                  {Array.from({ length: pendingTotalPages }, (_, i) => i + 1).map((page) => {
                    if (page === 1 || page === pendingTotalPages || (page >= pendingPage - 1 && page <= pendingPage + 1)) {
                      return (
                        <Button
                          key={page}
                          variant={pendingPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPendingPage(page)}
                          disabled={isPendingLoading}
                          className={`text-xs md:text-sm w-7 h-7 md:w-8 md:h-8 p-0 ${
                            pendingPage === page
                              ? "bg-blue-700 text-white hover:bg-blue-500 hover:text-white"
                              : "bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === pendingPage - 2 || page === pendingPage + 2) {
                      return <span key={page} className="text-gray-400 text-xs md:text-sm">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingPage(Math.min(pendingTotalPages, pendingPage + 1))}
                  disabled={pendingPage === pendingTotalPages || isPendingLoading}
                  className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          );
        })()}
      </>
    </div>
  );
}

