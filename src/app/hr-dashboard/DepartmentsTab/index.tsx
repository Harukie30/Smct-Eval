'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toastMessages } from '@/lib/toastMessages';
import { useDialogAnimation } from '@/hooks/useDialogAnimation';
import departmentsData from '@/data/departments.json';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  manager?: string;
  employeeCount?: number;
  performance?: number;
}

interface DepartmentsTabProps {
  departments: Department[];
  employees: Employee[];
  departmentsRefreshing: boolean;
  isActive?: boolean;
}

export function DepartmentsTab({
  departments: initialDepartments,
  employees,
  departmentsRefreshing,
  isActive = false
}: DepartmentsTabProps) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use dialog animation hook
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });

  // Update departments when prop changes
  useEffect(() => {
    setDepartments(initialDepartments);
  }, [initialDepartments]);

  // Function to handle adding a new department
  const handleAddDepartment = () => {
    if (!newDepartmentName.trim()) {
      toastMessages.generic.warning('Validation Error', 'Please enter a department name.');
      return;
    }

    // Check if department already exists
    const departmentExists = departments.some(
      dept => dept.name.toLowerCase().trim() === newDepartmentName.toLowerCase().trim()
    );

    if (departmentExists) {
      toastMessages.generic.warning('Duplicate Department', 'A department with this name already exists.');
      return;
    }

    try {
      // Generate new ID (get max ID and add 1)
      const maxId = departments.length > 0 
        ? Math.max(...departments.map(d => d.id))
        : 0;
      
      const newDepartment: Department = {
        id: maxId + 1,
        name: newDepartmentName.trim(),
      };

      // Add to state
      const updatedDepartments = [...departments, newDepartment];
      setDepartments(updatedDepartments);

      // Save to localStorage
      const savedDepartments = JSON.parse(localStorage.getItem('departments') || '[]');
      const allDepartments = savedDepartments.length > 0 ? savedDepartments : departmentsData;
      const updatedAllDepartments = [...allDepartments, newDepartment];
      localStorage.setItem('departments', JSON.stringify(updatedAllDepartments));

      // Show success toast
      toastMessages.generic.success('Department Added', `"${newDepartmentName}" has been added successfully.`);

      // Reset form and close modal
      setNewDepartmentName('');
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding department:', error);
      toastMessages.generic.error('Error', 'Failed to add department. Please try again.');
    }
  };

  // Function to handle deleting a department
  const handleDeleteDepartment = () => {
    if (!departmentToDelete) return;

    try {
      // Check if department has employees
      const deptEmployees = employees.filter(emp => emp.department === departmentToDelete.name);
      
      if (deptEmployees.length > 0) {
        toastMessages.generic.warning(
          'Cannot Delete Department',
          `This department has ${deptEmployees.length} employee(s). Please reassign them before deleting.`
        );
        setIsDeleteModalOpen(false);
        setDepartmentToDelete(null);
        return;
      }

      // Remove from state
      const updatedDepartments = departments.filter(dept => dept.id !== departmentToDelete.id);
      setDepartments(updatedDepartments);

      // Update localStorage
      const savedDepartments = JSON.parse(localStorage.getItem('departments') || '[]');
      const allDepartments = savedDepartments.length > 0 ? savedDepartments : departmentsData;
      const updatedAllDepartments = allDepartments.filter((dept: Department) => dept.id !== departmentToDelete.id);
      localStorage.setItem('departments', JSON.stringify(updatedAllDepartments));

      // Show success toast
      toastMessages.generic.success('Department Deleted', `"${departmentToDelete.name}" has been deleted successfully.`);

      // Close modal and reset
      setIsDeleteModalOpen(false);
      setDepartmentToDelete(null);
    } catch (error) {
      console.error('Error deleting department:', error);
      toastMessages.generic.error('Error', 'Failed to delete department. Please try again.');
    }
  };

  // Get department statistics
  const getDepartmentStats = (deptName: string) => {
    const deptEmployees = employees.filter(emp => emp.department === deptName);
    return {
      count: deptEmployees.length,
      managers: deptEmployees.filter(emp => emp.role === 'Manager').length,
      averageTenure: 2.5 // Mock data
    };
  };

  // Filter departments based on search term
  const filteredDepartments = departments.filter(dept => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return dept.name.toLowerCase().includes(searchLower) ||
           (dept.manager && dept.manager.toLowerCase().includes(searchLower));
  });

  return (
    <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Departments</CardTitle>
              <CardDescription>View and manage department information</CardDescription>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 hover:text-white"
            >
              <Plus className="h-5 w-5" />
              Add Department
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative w-1/5">
              <Input
                placeholder="Search departments by name or manager..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="relative">
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
                {filteredDepartments.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-gray-500">
                    {searchTerm ? `No departments found matching "${searchTerm}"` : 'No departments found'}
                  </div>
                ) : (
                  filteredDepartments.map((dept) => {
                  const stats = getDepartmentStats(dept.name);
                  return (
                    <Card key={dept.id}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          {dept.name}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{stats.count} employees</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDepartmentToDelete(dept);
                                setIsDeleteModalOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
                  })
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Department Modal */}
      <Dialog open={isAddModalOpen} onOpenChangeAction={setIsAddModalOpen}>
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <DialogHeader className="pb-4">
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>
              Create a new department in the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-2">
            <div className="space-y-2">
              <Label htmlFor="departmentName" className="text-sm font-medium">
                Department Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="departmentName"
                placeholder="Enter department name"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddDepartment();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter className="pt-6 px-2">
            <div className="flex justify-end space-x-4 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setNewDepartmentName('');
                  setIsAddModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddDepartment}
                className="bg-green-500 text-white hover:bg-green-600 hover:text-white"
              >
                Add Department
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Department Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChangeAction={(open) => {
        setIsDeleteModalOpen(open);
        if (!open) {
          setDepartmentToDelete(null);
        }
      }}>
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <DialogHeader className="pb-4 bg-red-50 rounded-lg">
            <DialogTitle className='text-red-800 flex items-center gap-2'>
              <span className="text-xl">⚠️</span>
              Delete Department
            </DialogTitle>
            <DialogDescription className='text-red-700'>
              This action cannot be undone. Are you sure you want to permanently delete "{departmentToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-2 mt-8">
            {departmentToDelete && (() => {
              const deptEmployees = employees.filter(emp => emp.department === departmentToDelete.name);
              return deptEmployees.length > 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium">Warning: This department has {deptEmployees.length} employee(s).</p>
                      <p className="mt-1">Please reassign all employees before deleting this department.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-red-700">
                      <p className="font-medium">Warning: This will permanently delete:</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li>Department record</li>
                        <li>All associated data</li>
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <DialogFooter className="pt-6 px-2">
            <div className="flex justify-end space-x-4 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDepartmentToDelete(null);
                }}
                className="text-white bg-blue-600 hover:text-white hover:bg-green-500"
              >
                Cancel
              </Button>
              <Button
                className='bg-red-600 hover:bg-red-700 text-white'
                onClick={handleDeleteDepartment}
                disabled={departmentToDelete ? employees.filter(emp => emp.department === departmentToDelete.name).length > 0 : false}
              >
                🗑️ Delete Permanently
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

