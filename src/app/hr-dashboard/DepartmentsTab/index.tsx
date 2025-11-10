'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface DepartmentsTabProps {
  departments: Department[];
  employees: Employee[];
  departmentsRefreshing: boolean;
  isActive?: boolean;
}

export function DepartmentsTab({
  departments,
  employees,
  departmentsRefreshing,
  isActive = false
}: DepartmentsTabProps) {
  // Get department statistics
  const getDepartmentStats = (deptName: string) => {
    const deptEmployees = employees.filter(emp => emp.department === deptName);
    return {
      count: deptEmployees.length,
      managers: deptEmployees.filter(emp => emp.role === 'Manager').length,
      averageTenure: 2.5 // Mock data
    };
  };

  return (
    <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
      {departmentsRefreshing ? (
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
              <p className="text-sm text-gray-600 font-medium">Loading departments...</p>
            </div>
          </div>
          
          {/* Grid structure visible in background */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={`skeleton-dept-${index}`} className="animate-pulse">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-32 bg-gray-200 rounded"></div>
                    <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="h-4 w-40 bg-gray-200 rounded mt-2"></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-100 rounded-lg">
                      <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-2"></div>
                      <div className="h-3 w-16 bg-gray-200 rounded mx-auto"></div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 rounded-lg">
                      <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-2"></div>
                      <div className="h-3 w-16 bg-gray-200 rounded mx-auto"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {departments.map((dept) => {
            const stats = getDepartmentStats(dept.name);
            return (
              <Card key={dept.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {dept.name}
                    <Badge variant="outline">{stats.count} employees</Badge>
                  </CardTitle>
                  <CardDescription>Department Manager</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{stats.count}</div>
                      <div className="text-xs text-gray-600">Employees</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{stats.managers}</div>
                      <div className="text-xs text-gray-600">Managers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

