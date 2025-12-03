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
import apiService from "@/lib/apiService";
import EvaluationsPagination from "@/components/paginationComponent";

interface Department {
  id: number;
  department_name: string;
  managers_count: string;
  employees_count: string;
}

export default function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] =
    useState<Department | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [overviewTotal, setOverviewTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(0);

  // Use dialog animation hook (0.4s to match EditUserModal speed)
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });

  // Function to load data
  const loadData = async (search: string) => {
    try {
      const departments = await apiService.getTotalEmployeesDepartments(
        search,
        currentPage,
        itemsPerPage
      );
      setDepartments(departments.data);
      setOverviewTotal(departments.total);
      setTotalPages(departments.last_page);
      setPerPage(departments.per_page);
    } catch (error) {
      console.error("Error loading departments:", error);
    }
  };

  // Load departments and employees when component mounts
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await loadData(searchTerm);
      } catch (error) {
        console.error("Error initializing departments:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      searchTerm === "" ? currentPage : setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      await refreshData();
    };

    fetchData();
  }, [debouncedSearchTerm, currentPage]);

  // Function to refresh data
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await loadData(searchTerm);
    } catch (error) {
      console.error("❌ Error refreshing departments:", error);
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
    try {
      await apiService.addDepartment(newDepartmentName);
      loadData(searchTerm);
      toastMessages.generic.success(
        "Success " + newDepartmentName + " has been added",
        "A new department has been save."
      );
      setNewDepartmentName("");
    } catch (error) {
      console.log(error);
    } finally {
      setIsAddModalOpen(false);
    }
  };

  // Function to handle deleting a department
  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return;

    try {
      if (
        Number(departmentToDelete.employees_count) +
          Number(departmentToDelete.managers_count) !==
        0
      ) {
        toastMessages.generic.warning(
          "Department Deleted revoked",
          `Deletion failed: "${departmentToDelete.department_name}" has employees linked to it.`
        );
        return;
      } else {
        await apiService.deleteDepartment(departmentToDelete.id);
        loadData(searchTerm);
        toastMessages.generic.success(
          "Department Deleted",
          `"${departmentToDelete.department_name}" has been deleted successfully.`
        );
      }
    } catch (error) {
      console.error("Error deleting department:", error);
      toastMessages.generic.error(
        "Error",
        "Failed to delete department. Please try again."
      );
    } finally {
      setIsDeleteModalOpen(false);
      setDepartmentToDelete(null);
    }
  };

  // Show loading skeleton on initial load
  if (loading) {
    return (
      <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px] mt-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ">
          {Array.from({ length: itemsPerPage }).map((_, index) => (
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
    <div className="relative  overflow-y-auto pr-2 min-h-[400px]">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="w-1/4">
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                View and manage department information
              </CardDescription>
              <div className="relative flex-1 mt-5">
                <Input
                  placeholder="Search by department name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      viewBox="0 0 20 20"
                      fill="currentColor"
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
            {isRefreshing && (
              <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-white/80">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    {/* Spinning ring */}
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    {/* Logo in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src="/smct.png"
                        alt="SMCT Logo"
                        className="h-10 w-10 object-contain"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
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
          {departments.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4">
              <img
                src="/not-found.gif"
                alt="No data"
                className="w-25 h-25 object-contain"
                style={{
                  imageRendering: "auto",
                  willChange: "auto",
                  transform: "translateZ(0)",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}
              />
              <div className="text-gray-500 text-center">
                {searchTerm ? (
                  <>
                    <p className="text-base font-medium mb-1">
                      No results found
                    </p>
                    <p className="text-sm text-gray-400">
                      Try adjusting your search or filters
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-medium mb-1">
                      No evaluation records to display
                    </p>
                    <p className="text-sm text-gray-400">
                      Records will appear here when evaluations are submitted
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
          {/* Pagination Controls */}
          {overviewTotal > itemsPerPage && (
            <EvaluationsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={overviewTotal}
              perPage={perPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                loadData(searchTerm);
              }}
            />
          )}
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

      {/* Delete Confirmation Modal */}
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
          <DialogHeader className="pb-4 bg-red-50 rounded-lg ">
            <DialogTitle className="text-red-800 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Delete {departmentToDelete?.department_name} Department
            </DialogTitle>
            <DialogDescription className="text-red-700">
              This action cannot be undone. Are you sure you want to permanently
              delete this department?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-2 mt-8">
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
                    <li>This department record</li>
                    <li>All users under this department</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-700">
                <p className="font-medium">Department Details:</p>
                <div className="mt-2 space-y-1">
                  <p>
                    <span className="font-medium">Department Name:</span>{" "}
                    {departmentToDelete?.department_name}
                  </p>
                  <p>
                    <span className="font-medium">No. of employees:</span>{" "}
                    {Number(departmentToDelete?.employees_count) +
                      Number(departmentToDelete?.managers_count)}
                  </p>
                </div>
              </div>
            </div>
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
                onClick={() => handleDeleteDepartment()}
              >
                ❌ Delete Permanently
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
