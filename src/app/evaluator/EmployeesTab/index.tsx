'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Eye, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import { useEmployeeFiltering } from '@/hooks/useEmployeeFiltering';
import accountsData from '@/data/accounts.json';
import positionsData from '@/data/positions.json';

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
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [employeesPage, setEmployeesPage] = useState(1);
  const itemsPerPage = 8;

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
    return filteredEmployees
      .filter((e: any) => {
        // Filter by position if selected
        if (selectedPosition && e.position !== selectedPosition) {
          return false;
        }
        return true;
      })
      .map((e: any) => {
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
          branch: updatedEmployee.branch || 'N/A'
        };
      });
  }, [filteredEmployees, selectedPosition, getUpdatedEmployeeData]);

  // Pagination calculations
  const employeesTotal = filtered.length;
  const employeesTotalPages = Math.ceil(employeesTotal / itemsPerPage);
  const employeesStartIndex = (employeesPage - 1) * itemsPerPage;
  const employeesEndIndex = employeesStartIndex + itemsPerPage;
  const employeesPaginated = filtered.slice(employeesStartIndex, employeesEndIndex);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setEmployeesPage(1);
  }, [employeeSearch, selectedDepartment, selectedPosition]);

  // Calculate new hires this month
  const newHiresThisMonth = (() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return filtered.filter((emp: any) => {
      const hireDate = new Date(emp.hireDate);
      return hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear;
    }).length;
  })();

  return (
    <Card key={refreshKey}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>Search and manage employees</CardDescription>
            </div>
            {/* Badge-style employee counts */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 text-sm font-semibold bg-blue-50 text-blue-700 border-blue-200">
                Total: {filtered.length}
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-sm font-semibold bg-green-50 text-green-700 border-green-200">
                New Hires: {newHiresThisMonth}
              </Badge>
            </div>
          </div>
          <Button
            onClick={onRefresh}
            disabled={isEmployeesRefreshing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
            title="Refresh employee data"
          >
            {isEmployeesRefreshing ? (
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
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 w-1/3">
          <div className="relative flex-1">
            <Input
              placeholder="Search employees..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="flex-1 pr-10"
            />
            {employeeSearch && (
              <button
                onClick={() => setEmployeeSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Combobox
            options={[
              { value: 'all', label: 'All Positions' },
              ...positionsData.map((pos) => ({ value: pos, label: pos }))
            ]}
            value={selectedPosition || 'all'}
            onValueChangeAction={(value) => {
              const selectedValue = typeof value === 'string' ? value : String(value);
              setSelectedPosition(selectedValue === 'all' ? '' : selectedValue);
            }}
            placeholder="All Positions"
            searchPlaceholder="Search positions..."
            emptyText="No positions found."
            className="w-[180px]"
          />
          {(employeeSearch || selectedPosition) && (
            <Button
              variant="outline"
              onClick={() => {
                setEmployeeSearch('');
                setSelectedPosition('');
              }}
              className="px-4 py-2 text-sm"
              title="Clear all filters"
            >
              Clear
            </Button>
          )}
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
            <div className="relative max-h-[450px] overflow-y-auto overflow-x-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <Table className="w-full">
                <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <>
            <div className="relative max-h-[450px] overflow-y-auto overflow-x-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <Table className="w-full">
                <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
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
                  {employeesPaginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                        No employees found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    employeesPaginated.map((employee: any) => (
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Pagination Controls - Outside Card, bottom right aligned */}
        {employeesTotal > itemsPerPage && (
          <div className="flex items-center justify-end mt-4 px-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmployeesPage(prev => Math.max(1, prev - 1))}
                disabled={employeesPage === 1}
                className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: employeesTotalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === employeesTotalPages ||
                    (page >= employeesPage - 1 && page <= employeesPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={employeesPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEmployeesPage(page)}
                        className="text-xs w-8 h-8 p-0 bg-blue-700 text-white hover:bg-blue-500 hover:text-white"
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === employeesPage - 2 || page === employeesPage + 2) {
                    return <span key={page} className="text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmployeesPage(prev => Math.min(employeesTotalPages, prev + 1))}
                disabled={employeesPage === employeesTotalPages}
                className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

