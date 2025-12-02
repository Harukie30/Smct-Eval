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
import { toastMessages } from "@/lib/toastMessages";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";
import { apiService } from "@/lib/apiService";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

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
  id: string | number;
  name: string;
}

export function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] =
    useState<Department | null>(null);
  const [departmentsPage, setDepartmentsPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 6; // 2 columns x 3 rows = 6 items per page

  // Use dialog animation hook (0.4s to match EditUserModal speed)
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });

  // Function to load data
  const loadData = async () => {
    try {
      // Load departments from API
      const departmentsData = await apiService.getDepartments();
      
      // Convert API format to component format
      const departmentsToUse = departmentsData.map((dept: any) => ({
        id: dept.id,
        name: dept.name,
      }));

      setDepartments(departmentsToUse);

      // Load employees from API
      const accounts = await apiService.getAllUsers();
      
      // Filter out admin accounts and map to Employee format
      const employeesData = accounts
        .filter((account: any) => {
          const role = account.role || account.roles || account.user_role;
          return role !== "admin" && role !== "Admin";
        })
        .map((account: any) => {
          // Handle different possible field names from backend
          const fname = account.fname || account.first_name || account.firstName || "";
          const lname = account.lname || account.last_name || account.lastName || "";
          const name = account.name || 
                      (fname && lname ? `${fname} ${lname}`.trim() : null) ||
                      account.full_name ||
                      account.user_name ||
                      "";
          
          const department = account.department || account.department_name || account.department?.name || "";
          const role = account.role || account.roles || account.user_role || "";
          
          return {
            id: account.employeeId || account.id || account.user_id,
            name: name,
            email: account.email || account.user_email || "",
            position: account.position || account.position_name || account.position?.name || "",
            department: department,
            branch: account.branch || account.branch_name || account.branch?.name || "",
            role: String(role || ""),
            isActive: account.isActive !== undefined ? account.isActive : (account.is_active !== undefined ? account.is_active : true),
          };
        });

      setEmployees(employeesData);
    } catch (error) {
      console.error("Error loading departments:", error);
      toastMessages.generic.error(
        "Error",
        "Failed to load departments data. Please try again."
      );
    }
  };

  // Load departments and employees when component mounts
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // Add a small delay to ensure skeleton is visible
        await new Promise((resolve) => setTimeout(resolve, 300));
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
    console.log("🔄 Starting departments refresh...");
    setIsRefreshing(true);

    try {
      await loadData();
      console.log("✅ Departments refresh completed successfully");

      // Keep spinner visible for at least 800ms for better UX
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (error) {
      console.error("❌ Error refreshing departments:", error);
      // Even on error, show spinner for minimum duration
      await new Promise((resolve) => setTimeout(resolve, 800));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to handle adding a new department
  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) {
      toastMessages.generic.warning(
        "Validation Error",
        "Please enter a department name."
      );
      return;
    }

    // Check if department already exists
    const departmentExists = departments.some(
      (dept) =>
        dept.name.toLowerCase().trim() ===
        newDepartmentName.toLowerCase().trim()
    );

    if (departmentExists) {
      toastMessages.generic.warning(
        "Duplicate Department",
        "A department with this name already exists."
      );
      return;
    }

    try {
      // Create FormData for API call
      const formData = new FormData();
      formData.append("department_name", newDepartmentName.trim());

      // Call API to add department
      const result = await apiService.addDepartment(formData);

      if (result.success || result) {
        // Reload departments from API to get the updated list with new ID
        await loadData();

        // Show success toast
        toastMessages.generic.success(
          "Department Added",
          `"${newDepartmentName}" has been added successfully.`
        );

        // Reset form and close modal
        setNewDepartmentName("");
        setIsAddModalOpen(false);
      } else {
        throw new Error(result.message || "Failed to add department");
      }
    } catch (error: any) {
      console.error("Error adding department:", error);
      toastMessages.generic.error(
        "Error",
        error.message || "Failed to add department. Please try again."
      );
    }
  };

  // Function to handle deleting a department
  const handleDeleteDepartment = async () => {
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

      // Call API to delete department
      const result = await apiService.deleteDepartment(departmentToDelete.id);

      if (result.success || result) {
        // Reload departments from API to get the updated list
        await loadData();

        // Show success toast
        toastMessages.generic.success(
          "Department Deleted",
          `"${departmentToDelete.name}" has been deleted successfully.`
        );

        // Close modal and reset
        setIsDeleteModalOpen(false);
        setDepartmentToDelete(null);
      } else {
        throw new Error(result.message || "Failed to delete department");
      }
    } catch (error: any) {
      console.error("Error deleting department:", error);
      toastMessages.generic.error(
        "Error",
        error.message || "Failed to delete department. Please try again."
      );
    }
  };

  // Helper function to get department statistics
  const getDepartmentStats = (deptName: string) => {
    const deptEmployees = employees.filter(
      (emp) => emp.department === deptName
    );
    return {
      count: deptEmployees.length,
      managers: deptEmployees.filter(
        (emp) =>
          emp.role === "Manager" || 
          String(emp.role || "").toLowerCase().includes("manager")
      ).length,
      averageTenure: 2.5, // Mock data
    };
  };

  // Filter departments based on search term
  const filteredDepartments = departments.filter((dept) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return dept.name.toLowerCase().includes(searchLower);
  });

  // Helper function to generate pagination pages with ellipsis
  const generatePaginationPages = (
    currentPage: number,
    totalPages: number
  ): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [];

    if (currentPage <= 3) {
      // Show first 5 pages, ellipsis, last page
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push("ellipsis");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Show first page, ellipsis, last 5 pages
      pages.push(1);
      pages.push("ellipsis");
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
      pages.push(1);
      pages.push("ellipsis");
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push("ellipsis");
      pages.push(totalPages);
    }

    return pages;
  };

  // Pagination calculations (using filtered departments)
  const departmentsTotal = filteredDepartments.length;
  const departmentsTotalPages = Math.ceil(departmentsTotal / itemsPerPage);
  const departmentsStartIndex = (departmentsPage - 1) * itemsPerPage;
  const departmentsEndIndex = departmentsStartIndex + itemsPerPage;
  const departmentsPaginated = filteredDepartments.slice(
    departmentsStartIndex,
    departmentsEndIndex
  );

  // Reset to page 1 when search term changes
  useEffect(() => {
    setDepartmentsPage(1);
  }, [searchTerm]);

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
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative w-full max-w-md">
              <Input
                placeholder="Search departments by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

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
              {departmentsPaginated.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <img
                      src="/not-found.gif"
                      alt="No data"
                      className="w-25 h-25 object-contain"
                      style={{
                        imageRendering: 'auto',
                        willChange: 'auto',
                        transform: 'translateZ(0)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                      }}
                    />
                    <div className="text-gray-500">
                      {searchTerm ? (
                        <>
                          <p className="text-base font-medium mb-1">
                            No departments found matching "{searchTerm}"
                          </p>
                          <p className="text-sm text-gray-400">
                            Try adjusting your search term
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-base font-medium mb-1">
                            No departments found
                          </p>
                          <p className="text-sm text-gray-400">
                            Departments will appear here once added
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                departmentsPaginated.map((dept) => {
                  const stats = getDepartmentStats(dept.name);
                  return (
                    <Card key={dept.id}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          {dept.name}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {stats.count} employees
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
                              {stats.count}
                            </div>
                            <div className="text-xs text-gray-600">Employees</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {stats.managers}
                            </div>
                            <div className="text-xs text-gray-600">Managers</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
        
        {/* Pagination Controls */}
        {departmentsTotal > itemsPerPage && (
          <div className="flex items-center justify-end px-6 py-4 border-t">
            <Pagination className="justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setDepartmentsPage((prev) => Math.max(1, prev - 1));
                    }}
                    className={
                      departmentsPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                    }
                  />
                </PaginationItem>
                {generatePaginationPages(
                  departmentsPage,
                  departmentsTotalPages
                ).map((page, index) => {
                  if (page === "ellipsis") {
                    return (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setDepartmentsPage(page);
                        }}
                        isActive={departmentsPage === page}
                        className={
                          departmentsPage === page
                            ? "cursor-pointer bg-blue-700 text-white hover:bg-blue-800 hover:text-white"
                            : "cursor-pointer bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                        }
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setDepartmentsPage((prev) =>
                        Math.min(departmentsTotalPages, prev + 1)
                      );
                    }}
                    className={
                      departmentsPage === departmentsTotalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
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
