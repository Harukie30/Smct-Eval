// src/components/EmployeeTable.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployees, useEmployeeSearch, useEmployeeStats } from '@/hooks/useEmployeeData';
import { Employee } from '@/lib/employeeService';
import { Search, RefreshCw, Users, Building, UserCheck } from 'lucide-react';

interface EmployeeTableProps {
  showSearch?: boolean;
  showStats?: boolean;
  maxRows?: number;
  filterByDepartment?: string;
  filterByRole?: string;
  onEmployeeSelect?: (employee: Employee) => void;
  className?: string;
}

export default function EmployeeTable({
  showSearch = true,
  showStats = false,
  maxRows,
  filterByDepartment,
  filterByRole,
  onEmployeeSelect,
  className = ''
}: EmployeeTableProps) {
  const { employees, loading, error, refetch } = useEmployees();
  const { results: searchResults, loading: searchLoading, search, clearResults } = useEmployeeSearch();
  const { stats } = useEmployeeStats();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Filter employees based on props
  const filteredEmployees = React.useMemo(() => {
    let filtered = employees;

    if (filterByDepartment) {
      filtered = filtered.filter(emp => emp.department === filterByDepartment);
    }

    if (filterByRole) {
      filtered = filtered.filter(emp => emp.role === filterByRole);
    }

    if (maxRows) {
      filtered = filtered.slice(0, maxRows);
    }

    return filtered;
  }, [employees, filterByDepartment, filterByRole, maxRows]);

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      await search(query);
      setIsSearching(false);
    } else {
      clearResults();
    }
  };

  // Display results (search results or filtered employees)
  const displayData = isSearching || searchQuery.trim() ? searchResults : filteredEmployees;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading employees...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading employees: {error}</p>
            <Button onClick={refetch} variant="outline" className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Employees</span>
            {stats && (
              <Badge variant="outline" className="ml-2">
                {stats.total} total
              </Badge>
            )}
          </CardTitle>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search employees by name, email, or position..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
            {searchLoading && (
              <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
        )}

        {showStats && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-800">Total Employees</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-green-800">Active</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(stats.byDepartment).length}
              </div>
              <div className="text-sm text-purple-800">Departments</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Object.keys(stats.byRole).length}
              </div>
              <div className="text-sm text-orange-800">Roles</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Status</TableHead>
                {onEmployeeSelect && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={onEmployeeSelect ? 9 : 8} className="text-center py-8 text-gray-500">
                    {isSearching || searchQuery.trim() ? 'No employees found matching your search.' : 'No employees found.'}
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((employee) => (
                  <TableRow 
                    key={employee.id} 
                    className={onEmployeeSelect ? 'cursor-pointer hover:bg-gray-50' : ''}
                    onClick={() => onEmployeeSelect?.(employee as Employee)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <span>{employee.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{employee.email}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Building className="h-3 w-3" />
                        <span>{employee.department}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>{employee.branch || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          employee.role === 'admin' ? 'bg-red-100 text-red-800' :
                          employee.role === 'hr' ? 'bg-blue-100 text-blue-800' :
                          employee.role === 'evaluator' ? 'bg-green-100 text-green-800' :
                          employee.role === 'employee' ? 'bg-gray-100 text-gray-800' :
                          'bg-purple-100 text-purple-800'
                        }
                      >
                        {employee.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(employee.hireDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={
                          employee.isActive !== false ? 
                            'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'
                        }
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        {employee.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    {onEmployeeSelect && (
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEmployeeSelect(employee as Employee);
                          }}
                        >
                          Select
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {displayData.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {displayData.length} employee{displayData.length !== 1 ? 's' : ''}
            {isSearching || searchQuery.trim() ? ' (search results)' : ''}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

