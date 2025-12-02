"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import departmentsData from "@/data/departments.json";
import accountsDataRaw from "@/data/accounts.json";
import { toastMessages } from "@/lib/toastMessages";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";
import apiService from "@/lib/apiService";

const accountsData = accountsDataRaw.accounts || [];

interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch?: string;
  role: string;
  isActive?: boolean;
}

interface Department {
  id: number;
  department_name: string;
  managers_count: string;
  employees_count: string;
}

export default function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] =
    useState<Department | null>(null);

  // Use dialog animation hook (0.4s to match EditUserModal speed)
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });

  // Function to load data
  const loadData = async () => {
    try {
      const departments = await apiService.getTotalEmployeesDepartments();
      setDepartments(departments);
    } catch (error) {
      console.error("Error loading departments:", error);
    }
  };

  // Load departments and employees when component mounts
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await loadData();
      } catch (error) {
        console.error("Error initializing departments:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Function to refresh data
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      console.error("❌ Error refreshing departments:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to handle adding a new department
  const handleAddDepartment = () => {
    if (!newDepartmentName.trim()) {
      toastMessages.generic.warning(
        "Validation Error",
        "Please enter a department name."
      );
      return;
    }


  // Function to handle deleting a department
  const handleDeleteDepartment = () => {
    if (!departmentToDelete) return;

    try {
      // Check if department has employees
      const deptEmployees = employees.filter(
        (emp) => emp.department === departmentToDelete.name
      );

      if (deptEmployees.length > 0) {
        toastMessages.generic.warning(
          "Cannot Delete Department",
          `This department has ${deptEmployees.length} employee(s). Please reassign them before deleting.`
        );
        setIsDeleteModalOpen(false);
        setDepartmentToDelete(null);
        return;
      }

      // Remove from state
      const updatedDepartments = departments.filter(
        (dept) => dept.id !== departmentToDelete.id
      );
      setDepartments(updatedDepartments);

      // Update localStorage
      localStorage.setItem("departments", JSON.stringify(updatedDepartments));

      // Show success toast
      toastMessages.generic.success(
        "Department Deleted",
        `"${departmentToDelete.name}" has been deleted successfully.`
      );

      // Close modal and reset
      setIsDeleteModalOpen(false);
      setDepartmentToDelete(null);
    } catch (error) {
      console.error("Error deleting department:", error);
      toastMessages.generic.error(
        "Error",
        "Failed to delete department. Please try again."
      );
    }
  };



  // Show loading skeleton on initial load
  if (loading) {
    return (
      <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`skeleton-dept-${index}`} className="animate-pulse">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-40 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-100 rounded-lg">
                    <Skeleton className="h-6 w-12 mx-auto mb-2" />
                    <Skeleton className="h-3 w-16 mx-auto" />
                  </div>
                  <div className="text-center p-3 bg-gray-100 rounded-lg">
                    <Skeleton className="h-6 w-12 mx-auto mb-2" />
                    <Skeleton className="h-3 w-16 mx-auto" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                View and manage department information
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 hover:text-white"
              >
                <Plus className="h-5 w-5" />
                Add Department
              </Button>
              <Button
                variant="outline"
                onClick={refreshData}
                disabled={isRefreshing}
                className="flex items-center gap-2 bg-blue-600 text-white hover:bg-green-700 hover:text-white"
              >
                {isRefreshing ? (
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
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Refresh overlay spinner - shows content underneath */}
            {isRefreshing && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-white/60 rounded-lg">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    {/* Spinning ring */}
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    {/* Logo in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src="/smct.png"
                        alt="SMCT Logo"
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    Refreshing...
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {departments.map((dept) => {
                return (
                  <Card key={dept.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        {dept.department_name}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {dept.employees_count} employees
                          </Badge>
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
                          <div className="text-lg font-bold text-blue-600">
                            {dept.employees_count}
                          </div>
                          <div className="text-xs text-gray-600">Employees</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {dept.managers_count}
                          </div>
                          <div className="text-xs text-gray-600">Managers</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
                  if (e.key === "Enter") {
                    handleAddDepartment();
                  }
                }}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="pt-6 px-2">
            <div className="flex justify-end space-x-4 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setNewDepartmentName("");
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
      <Dialog
        open={isDeleteModalOpen}
        onOpenChangeAction={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setDepartmentToDelete(null);
          }
        }}
      >
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <DialogHeader className="pb-4 bg-red-50 rounded-lg">
            <DialogTitle className="text-red-800 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Delete Department
            </DialogTitle>
            <DialogDescription className="text-red-700">
              This action cannot be undone. Are you sure you want to permanently
              delete "{departmentToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-2 mt-8">
            {departmentToDelete &&
              (() => {
                const deptEmployees = employees.filter(
                  (emp) => emp.department === departmentToDelete.name
                );
                return deptEmployees.length > 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-yellow-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="text-sm text-yellow-700">
                        <p className="font-medium">
                          Warning: This department has {deptEmployees.length}{" "}
                          employee(s).
                        </p>
                        <p className="mt-1">
                          Please reassign all employees before deleting this
                          department.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="text-sm text-red-700">
                        <p className="font-medium">
                          Warning: This will permanently delete:
                        </p>
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
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteDepartment}
                disabled={
                  departmentToDelete
                    ? employees.filter(
                        (emp) => emp.department === departmentToDelete.name
                      ).length > 0
                    : false
                }
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
