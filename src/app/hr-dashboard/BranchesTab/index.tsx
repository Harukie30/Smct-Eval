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

interface BranchesTabProps {
  branches: { id: string; name: string }[];
  employees: Employee[];
  branchesRefreshing: boolean;
  isActive?: boolean;
}

export function BranchesTab({
  branches,
  employees,
  branchesRefreshing,
  isActive = false
}: BranchesTabProps) {
  // Get branch statistics
  const getBranchStats = (branchName: string) => {
    const branchEmployees = employees.filter(emp => emp.branch === branchName);
    return {
      count: branchEmployees.length,
      managers: branchEmployees.filter(emp => emp.role === 'Manager').length
    };
  };

  return (
    <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
      {branchesRefreshing ? (
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
              <p className="text-sm text-gray-600 font-medium">Loading branches...</p>
            </div>
          </div>
          
          {/* Grid structure visible in background */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={`skeleton-branch-${index}`} className="animate-pulse">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-32 bg-gray-200 rounded"></div>
                    <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="h-4 w-40 bg-gray-200 rounded mt-2"></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-100 rounded-lg">
                      <div className="h-7 w-16 bg-gray-200 rounded mx-auto mb-2"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded mx-auto"></div>
                    </div>
                    <div className="text-center p-4 bg-gray-100 rounded-lg">
                      <div className="h-7 w-16 bg-gray-200 rounded mx-auto mb-2"></div>
                      <div className="h-4 w-16 bg-gray-200 rounded mx-auto"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {branches.map((branch) => {
            const stats = getBranchStats(branch.name);
            return (
              <Card key={branch.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {branch.name}
                    <Badge variant="outline">{stats.count} employees</Badge>
                  </CardTitle>
                  <CardDescription>Branch Location</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
                      <div className="text-sm text-gray-600">Total Employees</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.managers}</div>
                      <div className="text-sm text-gray-600">Manager</div>
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

