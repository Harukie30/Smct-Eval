'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";

interface UserManagementTabProps {
  employees: any[]; // Replace with proper Employee type
  pendingRegistrations: any[]; // Replace with proper PendingRegistration type
  onApprove: (id: number, name: string) => Promise<void>;
  onReject: (id: number, name: string) => Promise<void>;
  onEditUser: (user: any) => void;
  onDeleteUser: (user: any) => void;
}

export function UserManagementTab({
  employees,
  pendingRegistrations,
  onApprove,
  onReject,
  onEditUser,
  onDeleteUser
}: UserManagementTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'new'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <div className="flex gap-2">
          <Button
            variant={activeSubTab === 'active' ? 'default' : 'outline'}
            onClick={() => setActiveSubTab('active')}
          >
            Active Users ({employees.length})
          </Button>
          <Button
            variant={activeSubTab === 'new' ? 'default' : 'outline'}
            onClick={() => setActiveSubTab('new')}
          >
            New Registrations ({pendingRegistrations.length})
          </Button>
        </div>
      </div>

      {/* Active Users Tab */}
      {activeSubTab === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
            <CardDescription>Manage existing system users</CardDescription>
            <div className="mt-4">
              <Input
                placeholder="Search users by name, email, or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.position}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditUser(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDeleteUser(user)}
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
          </CardContent>
        </Card>
      )}

      {/* New Registrations Tab */}
      {activeSubTab === 'new' && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Registrations</CardTitle>
            <CardDescription>Review and approve new user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No pending registrations
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingRegistrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell className="font-medium">{registration.name}</TableCell>
                      <TableCell>{registration.email}</TableCell>
                      <TableCell>{registration.position}</TableCell>
                      <TableCell>{registration.department}</TableCell>
                      <TableCell>
                        {new Date(registration.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => onApprove(registration.id, registration.name)}
                          >
                            ✓ Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onReject(registration.id, registration.name)}
                          >
                            ✗ Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

