'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SuspendedEmployee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch: string;
  suspensionDate: string;
  suspensionReason: string;
  suspensionDuration: string;
  suspendedBy: string;
  status: 'suspended' | 'pending_review' | 'reinstated';
  reinstatedDate?: string;
  reinstatedBy?: string;
}

interface EmployeeManagementTabProps {
  suspendedEmployees: SuspendedEmployee[];
  onReinstate: (employee: SuspendedEmployee) => void;
  onDeleteSuspended: (employee: SuspendedEmployee) => void;
  onDeleteReinstated: (employee: SuspendedEmployee) => void;
}

export function EmployeeManagementTab({
  suspendedEmployees,
  onReinstate,
  onDeleteSuspended,
  onDeleteReinstated
}: EmployeeManagementTabProps) {
  const [activeTab, setActiveTab] = useState<'suspended' | 'reinstated'>('suspended');
  const [suspendedSearch, setSuspendedSearch] = useState('');
  const [reinstatedSearch, setReinstatedSearch] = useState('');

  // Filter suspended employees
  const filteredSuspended = suspendedEmployees.filter(emp => 
    emp.status === 'suspended' &&
    (emp.name.toLowerCase().includes(suspendedSearch.toLowerCase()) ||
     emp.email.toLowerCase().includes(suspendedSearch.toLowerCase()))
  );

  // Filter reinstated employees
  const filteredReinstated = suspendedEmployees.filter(emp => 
    emp.status === 'reinstated' &&
    (emp.name.toLowerCase().includes(reinstatedSearch.toLowerCase()) ||
     emp.email.toLowerCase().includes(reinstatedSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Employee Management</CardTitle>
          <CardDescription>Monitor and manage employee suspensions and reinstatements</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6">
            <Button
              variant={activeTab === 'suspended' ? 'default' : 'outline'}
              onClick={() => setActiveTab('suspended')}
              className={`flex items-center ${activeTab === 'suspended' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50'}`}
            >
              <span>⚠️</span>
              Suspended Employees ({filteredSuspended.length})
            </Button>
            <Button
              variant={activeTab === 'reinstated' ? 'default' : 'outline'}
              onClick={() => setActiveTab('reinstated')}
              className={`flex items-center gap-2 ${activeTab === 'reinstated' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50'}`}
            >
              <span>✅</span>
              Reinstated Records ({filteredReinstated.length})
            </Button>
          </div>

          {/* Suspended Employees Tab */}
          {activeTab === 'suspended' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  <Input
                    placeholder="Search suspended employees..."
                    className="w-64"
                    value={suspendedSearch}
                    onChange={(e) => setSuspendedSearch(e.target.value)}
                  />
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Suspended Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuspended.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        No suspended employees
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSuspended.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>{new Date(employee.suspensionDate).toLocaleDateString()}</TableCell>
                        <TableCell>{employee.suspensionReason}</TableCell>
                        <TableCell>{employee.suspensionDuration}</TableCell>
                        <TableCell>
                          <Badge className="bg-red-100 text-red-800">Suspended</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => onReinstate(employee)}
                            >
                              Reinstate
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDeleteSuspended(employee)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Reinstated Employees Tab */}
          {activeTab === 'reinstated' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Input
                  placeholder="Search reinstated employees..."
                  className="w-64"
                  value={reinstatedSearch}
                  onChange={(e) => setReinstatedSearch(e.target.value)}
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Suspended Date</TableHead>
                    <TableHead>Reinstated Date</TableHead>
                    <TableHead>Reinstated By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReinstated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        No reinstated employees
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReinstated.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>{new Date(employee.suspensionDate).toLocaleDateString()}</TableCell>
                        <TableCell>{employee.reinstatedDate ? new Date(employee.reinstatedDate).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{employee.reinstatedBy || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">Reinstated</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDeleteReinstated(employee)}
                          >
                            Remove Record
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
