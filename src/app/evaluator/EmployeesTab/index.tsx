'use client';

import { useState, useMemo } from 'react';
import { X, Eye, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import SearchableDropdown from "@/components/ui/searchable-dropdown";
import accountsData from '@/data/accounts.json';
import departments from '@/data/departments.json';
import { useEmployeeFiltering } from '@/hooks/useEmployeeFiltering';

interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch?: string;
  role: string;
  hireDate: string;
  avatar?: string;
}

interface EmployeesTabProps {
  filteredSubmissions: any[];
  isEmployeesRefreshing: boolean;
  employeeDataRefresh: number;
  onRefresh: () => void;
  onViewEmployee: (employee: any) => void;
  onEvaluateEmployee: (employee: any) => void;
  getUpdatedAvatar: (employeeId: number, currentAvatar?: string) => string | undefined;
  hasAvatarUpdate: (employeeId: number) => boolean;
  currentUser?: any; // Add currentUser prop for filtering
  isActive?: boolean;
}

export function EmployeesTab({
  filteredSubmissions,
  isEmployeesRefreshing,
  employeeDataRefresh,
  onRefresh,
  onViewEmployee,
  onEvaluateEmployee,
  getUpdatedAvatar,
  hasAvatarUpdate,
  currentUser,
  isActive = false
}: EmployeesTabProps) {
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [employeeSort, setEmployeeSort] = useState<{ key: keyof Employee; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const refreshKey = `employees-${employeeDataRefresh}`;

  // Get updated profile data from localStorage with auto-update support
  const getUpdatedEmployeeData = (employee: any) => {
    try {
      const employeeId = employee.employeeId || employee.id;
      
      // First check for real-time profile updates
      const updatedAvatar = getUpdatedAvatar(employeeId, employee.avatar);
      if (hasAvatarUpdate(employeeId) && updatedAvatar) {
        return {
          ...employee,
          avatar: updatedAvatar,
        };
      }

      // Check for updated profile data in localStorage
      const storedUser = localStorage.getItem('authenticatedUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData.id === employeeId) {
          return {
            ...employee,
            avatar: userData.avatar || employee.avatar,
            name: userData.name || employee.name,
            email: userData.email || employee.email,
            position: userData.position || employee.position,
            department: userData.department || employee.department,
            bio: userData.bio || employee.bio
          };
        }
      }

      // Check for other employees' profile updates in localStorage
      const employeeProfiles = localStorage.getItem('employeeProfiles');
      if (employeeProfiles) {
        const profiles = JSON.parse(employeeProfiles);
        const profileData = profiles[employeeId];
        
        if (profileData) {
          return {
            ...employee,
            avatar: profileData.avatar || employee.avatar,
            name: profileData.name || employee.name,
            email: profileData.email || employee.email,
            position: profileData.position || employee.position,
            department: profileData.department || employee.department,
            bio: profileData.bio || employee.bio
          };
        }
      }

      // Check accounts localStorage
      const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
      const accountData = accounts.find((acc: any) => (acc.id === employeeId || acc.employeeId === employeeId));
      if (accountData && (accountData.avatar || accountData.name !== employee.name)) {
        return {
          ...employee,
          avatar: accountData.avatar || employee.avatar,
          name: accountData.name || employee.name,
          email: accountData.email || employee.email,
          position: accountData.position || employee.position,
          department: accountData.department || employee.department,
          bio: accountData.bio || employee.bio
        };
      }

      return employee;
    } catch (error) {
      console.error('Error getting updated employee data:', error);
      return employee;
    }
  };

  // Get all employees from accounts data
  const allEmployees = useMemo(() => {
    return (accountsData as any).accounts.map((e: any) => ({
      id: e.employeeId || e.id,
      name: e.name,
      email: e.email,
      position: e.position,
      department: e.department,
      branch: e.branch,
      role: e.role,
      isActive: e.isActive,
      hireDate: e.hireDate,
      avatar: e.avatar,
    }));
  }, []);

  // Use the custom hook for filtering
  const filteredEmployees = useEmployeeFiltering({
    currentUser,
    employees: allEmployees,
    searchQuery: employeeSearch,
    selectedDepartment,
  });

  const filtered: Employee[] = useMemo(() => {
    return filteredEmployees.map((e: any) => {
      const updatedEmployee = getUpdatedEmployeeData(e);
      
      return {
        id: updatedEmployee.employeeId || updatedEmployee.id,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        position: updatedEmployee.position,
        department: updatedEmployee.department,
        role: updatedEmployee.role,
        hireDate: updatedEmployee.hireDate,
        avatar: updatedEmployee.avatar,
        branch: updatedEmployee.branch
      };
    });
  }, [filteredEmployees]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const { key, direction } = employeeSort;
      const av = a[key] ?? '';
      const bv = b[key] ?? '';
      const res = key === 'hireDate'
        ? new Date(av as string).getTime() - new Date(bv as string).getTime()
        : String(av).localeCompare(String(bv));
      return direction === 'asc' ? res : -res;
    });
  }, [filtered, employeeSort]);

  const toggleSort = (key: keyof Employee) => {
    setEmployeeSort((prev) =>
      prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }
    );
  };

  const sortIcon = (key: keyof Employee) => {
    if (employeeSort.key !== key) return '↕';
    return employeeSort.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <Card key={refreshKey}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Employees</CardTitle>
            <CardDescription>Directory of employees (includes profile updates)</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="flex items-center bg-blue-500 text-white hover:bg-green-600 hover:text-white"
            title="Refresh employee data (including profile updates)"
          >
            <span>Refresh</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Quick Stats Summary */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sorted.length}</div>
              <div className="text-sm text-gray-600">Total Employees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {sorted.filter(e => {
                  const employeeEvaluations = filteredSubmissions.filter(sub => sub.employeeId === e.id);
                  const latestEvaluation = employeeEvaluations.sort((a, b) => 
                    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                  )[0];
                  const hasRecentEvaluation = latestEvaluation && 
                    (new Date().getTime() - new Date(latestEvaluation.submittedAt).getTime()) < (90 * 24 * 60 * 60 * 1000);
                  return hasRecentEvaluation;
                }).length}
              </div>
              <div className="text-sm text-gray-600">Up to Date</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {sorted.filter(e => {
                  const employeeEvaluations = filteredSubmissions.filter(sub => sub.employeeId === e.id);
                  const latestEvaluation = employeeEvaluations.sort((a, b) => 
                    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                  )[0];
                  const hasRecentEvaluation = latestEvaluation && 
                    (new Date().getTime() - new Date(latestEvaluation.submittedAt).getTime()) < (90 * 24 * 60 * 60 * 1000);
                  return !hasRecentEvaluation;
                }).length}
              </div>
              <div className="text-sm text-gray-600">Need Review</div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex gap-4 w-1/2">
            <div className="flex items-center gap-2 w-full">
              {/* Search input with clear button inside */}
              <div className="relative flex-1 w-1/2">
                <Input
                  placeholder="Search employees by name, email, position, department, role"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className=" pr-10"
                />
                {employeeSearch && (
                  <button
                    onClick={() => setEmployeeSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 font hover:text-red-700"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Department dropdown */}
              <SearchableDropdown
                options={['All Departments', ...departments.map((dept) => dept.name)]}
                value={selectedDepartment || 'All Departments'}
                onValueChangeAction={(value) =>
                  setSelectedDepartment(value === 'All Departments' ? '' : value)
                }
                placeholder="All Departments"
                className="w-[200px]" 
              />
            </div>
          </div>
        </div>
        {isEmployeesRefreshing ? (
          <div className="relative max-h-[500px] overflow-y-auto">
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
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 bg-white z-10 border-b">
                <TableRow key="employees-header">
                  <TableHead className="px-6 py-3">Employee</TableHead>
                  <TableHead className="px-6 py-3">Position & Department</TableHead>
                  <TableHead className="px-6 py-3">Role</TableHead>
                  <TableHead className="px-6 py-3 text-center">Status</TableHead>
                  <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={`skeleton-employee-${index}`}>
                    <TableCell className="px-6 py-3">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="px-6 py-3 text-center">
                      <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                    </TableCell>
                    <TableCell className="px-6 py-3 flex justify-end">
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 bg-white z-10 border-b">
                <TableRow key="employees-header">
                  <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                    Employee <span className="ml-1 text-xs text-gray-500">{sortIcon('name')}</span>
                  </TableHead>
                  <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('position')}>
                    Position & Department <span className="ml-1 text-xs text-gray-500">{sortIcon('position')}</span>
                  </TableHead>
                  <TableHead className="px-6 py-3 cursor-pointer select-none" onClick={() => toggleSort('role')}>
                    Role <span className="ml-1 text-xs text-gray-500">{sortIcon('role')}</span>
                  </TableHead>
                  <TableHead className="px-6 py-3 text-center">Status</TableHead>
                  <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => {
                  // Get employee's latest evaluation to determine status
                  const employeeEvaluations = filteredSubmissions.filter(sub => sub.employeeId === e.id);
                  const latestEvaluation = employeeEvaluations.sort((a, b) => 
                    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                  )[0];
                  
                  // Determine status
                  const now = new Date();
                  const hasRecentEvaluation = latestEvaluation && 
                    (now.getTime() - new Date(latestEvaluation.submittedAt).getTime()) < (90 * 24 * 60 * 60 * 1000); // 90 days
                  const status = hasRecentEvaluation ? 'Up to Date' : 'Needs Review';
                  
                  return (
                  <TableRow key={e.id} className="hover:bg-gray-50">
                    <TableCell className="px-6 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="relative h-10 w-10 rounded-full overflow-hidden flex items-center justify-center">
                          {e.avatar ? (
                            <img 
                              src={e.avatar} 
                              alt={e.name} 
                              className="h-10 w-10 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextElement) {
                                  nextElement.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div 
                            className={`h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm ${e.avatar ? 'hidden' : 'flex'}`}
                          >
                            {e.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          {/* Auto-update indicator */}
                          {hasAvatarUpdate(e.id) && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                              <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {e.name}
                            {hasAvatarUpdate(e.id) && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Updated
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{e.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{e.position}</div>
                        <Badge className="bg-blue-100 text-blue-800 text-xs">{e.department}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <Badge className={
                        e.role === 'admin' ? 'bg-red-100 text-red-800' :
                        e.role === 'hr' ? 'bg-green-100 text-green-800' :
                        e.role === 'evaluator' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {e.role.charAt(0).toUpperCase() + e.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-center">
                      <Badge className={
                        status === 'Up to Date' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }>
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                          onClick={() => onViewEmployee(e)}
                          title="View employee details"
                        >
                          <Eye className="h-4 w-4 text-white" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                          onClick={() => onEvaluateEmployee(e)}
                          title="Evaluate employee performance"
                        >
                          <FileText className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
