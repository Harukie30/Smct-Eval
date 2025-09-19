// src/components/EmployeeTableExample.tsx

'use client';

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEmployees } from '@/hooks/useEmployeeData';
import { Employee } from '@/lib/employeeService';
import { EmployeeNameDisplay } from './EmployeeNameDisplay';
import { RefreshCw, Users, Building, UserCheck } from 'lucide-react';

// Example of how to integrate employee service into existing tables
export default function EmployeeTableExample() {
  const { employees, loading, error, refetch } = useEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  if (loading) {
    return (
      <Card>
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
      <Card>
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Employee Directory (API Integration Example)</span>
            <Badge variant="outline" className="ml-2">
              {employees.length} employees
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.slice(0, 10).map((employee) => (
                  <TableRow 
                    key={employee.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <TableCell>
                      <EmployeeNameDisplay 
                        employeeId={employee.id} 
                        variant="compact"
                        className="font-medium"
                      />
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
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(employee);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Employee Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>ID:</strong> {selectedEmployee.id}
              </div>
              <div>
                <strong>Name:</strong> {selectedEmployee.name}
              </div>
              <div>
                <strong>Email:</strong> {selectedEmployee.email}
              </div>
              <div>
                <strong>Position:</strong> {selectedEmployee.position}
              </div>
              <div>
                <strong>Department:</strong> {selectedEmployee.department}
              </div>
              <div>
                <strong>Branch:</strong> {selectedEmployee.branch || 'N/A'}
              </div>
              <div>
                <strong>Role:</strong> {selectedEmployee.role}
              </div>
              <div>
                <strong>Hire Date:</strong> {new Date(selectedEmployee.hireDate).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Example of how to use in existing table cells
export function ExampleTableRow({ employeeId }: { employeeId: number }) {
  return (
    <TableRow>
      <TableCell>
        <EmployeeNameDisplay 
          employeeId={employeeId} 
          variant="compact"
          className="font-medium"
        />
      </TableCell>
      <TableCell>
        <EmployeeNameDisplay 
          employeeId={employeeId} 
          variant="detailed"
          showEmail={true}
          showPosition={true}
        />
      </TableCell>
    </TableRow>
  );
}
