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
import { apiService } from '@/lib/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch: string;
  hireDate?: string; // Optional - hire date removed from forms
  role: string;
}

interface Branch {
  id: number;
  branch_code: string;
  branch_name: string;
  branch: string;
  acronym: string;
  managers_count: string;
  employees_count: string;
}

interface BranchesTabProps {
  branches: { id: string; name: string }[];
  employees: Employee[];
  branchesRefreshing: boolean;
  isActive?: boolean;
  onBranchesUpdate?: () => void; // Callback to refresh branches in parent
}

export function BranchesTab({
  branches: initialBranches,
  employees,
  branchesRefreshing,
  isActive = false,
  onBranchesUpdate
}: BranchesTabProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [overviewTotal, setOverviewTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(0);
  const [isPageChanging, setIsPageChanging] = useState(false);
  
  // Use dialog animation hook
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });

  // Load branches data with pagination
  const loadData = async (search: string) => {
    try {
      const response = await apiService.getTotalEmployeesBranch(
        search,
        currentPage,
        itemsPerPage
      );
      
      // Handle different response structures
      let branchesData: Branch[] = [];
      let total = 0;
      let lastPage = 1;
      let perPageValue = itemsPerPage;
      
      if (response) {
        // If response has data property (paginated response)
        if (response.data && Array.isArray(response.data)) {
          branchesData = response.data;
          total = response.total || 0;
          lastPage = response.last_page || 1;
          perPageValue = response.per_page || itemsPerPage;
        }
        // If response is directly an array
        else if (Array.isArray(response)) {
          branchesData = response;
          total = response.length;
          lastPage = 1;
          perPageValue = response.length;
        }
        // If response has branches property
        else if (response.branches && Array.isArray(response.branches)) {
          branchesData = response.branches;
          total = response.total || response.branches.length;
          lastPage = response.last_page || 1;
          perPageValue = response.per_page || itemsPerPage;
        }
      }
      
      setBranches(branchesData);
      setOverviewTotal(total);
      setTotalPages(lastPage);
      setPerPage(perPageValue);
    } catch (error) {
      console.error("Error loading branches:", error);
      setBranches([]);
      setOverviewTotal(0);
      setTotalPages(1);
      setPerPage(itemsPerPage);
    }
  };

  // Load branches when component mounts
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await loadData(searchTerm);
      } catch (error) {
        console.error("Error initializing branches:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      searchTerm === "" ? currentPage : setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reload data when search term or page changes
  useEffect(() => {
    const fetchData = async () => {
      await loadData(debouncedSearchTerm);
    };

    fetchData();
  }, [debouncedSearchTerm, currentPage]);

  // Function to handle adding a new branch
  const handleAddBranch = async () => {
    if (!newBranchName.trim()) {
      toastMessages.generic.warning('Validation Error', 'Please enter a branch name.');
      return;
    }

    // Check if branch already exists
    const branchExists = branches.some(
      branch => branch.branch_name.toLowerCase().trim() === newBranchName.toLowerCase().trim()
    );

    if (branchExists) {
      toastMessages.generic.warning('Duplicate Branch', 'A branch with this name already exists.');
      return;
    }

    try {
      // Create FormData for API call
      const formData = new FormData();
      formData.append('name', newBranchName.trim());
      if (newBranchCode && newBranchCode !== 'none') {
        formData.append('branchCode', newBranchCode.trim());
      }

      // Add branch via API
      await apiService.addBranch(formData);

      // Refresh branches from API
      await loadData(debouncedSearchTerm);

      // Notify parent to refresh branches
      if (onBranchesUpdate) {
        onBranchesUpdate();
      }

      // Show success toast
      toastMessages.generic.success('Branch Added', `"${newBranchName}" has been added successfully.`);

      // Reset form and close modal
      setNewBranchName('');
      setNewBranchCode('');
      setIsAddModalOpen(false);
    } catch (error: any) {
      console.error('Error adding branch:', error);
      toastMessages.generic.error(
        'Error',
        error.message || 'Failed to add branch. Please try again.'
      );
    }
  };

  // Get branch statistics from branch data
  const getBranchStats = (branch: Branch) => {
    return {
      count: Number(branch.employees_count) || 0,
      managers: Number(branch.managers_count) || 0
    };
  };

  // Function to handle deleting a branch
  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;

    try {
      // Check if branch has employees
      const totalEmployees = Number(branchToDelete.employees_count) + Number(branchToDelete.managers_count);

      if (totalEmployees > 0) {
        toastMessages.generic.warning(
          'Branch Deletion Revoked',
          `Deletion failed: "${branchToDelete.branch_name + "/ " + branchToDelete.branch_code}" has ${totalEmployees} employee${totalEmployees !== 1 ? 's' : ''} linked to it.`
        );
        setIsDeleteModalOpen(false);
        setBranchToDelete(null);
        return;
      }

      // Delete branch via API
      await apiService.deleteBranches(branchToDelete.id);

      // Refresh branches from API
      await loadData(debouncedSearchTerm);

      // Notify parent to refresh branches
      if (onBranchesUpdate) {
        onBranchesUpdate();
      }

      // Show success toast
      toastMessages.generic.success(
        'Branch Deleted',
        `"${branchToDelete.branch_name + "/ " + branchToDelete.branch_code}" has been deleted successfully.`
      );

      setIsDeleteModalOpen(false);
      setBranchToDelete(null);
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      toastMessages.generic.error(
        'Error',
        error.message || 'Failed to delete branch. Please try again.'
      );
      setIsDeleteModalOpen(false);
      setBranchToDelete(null);
    }
  };

  return (
    <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Branches</CardTitle>
              <CardDescription>View and manage branch information</CardDescription>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 hover:text-white"
            >
              <Plus className="h-5 w-5" />
              Add Branch
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6 ">
            <div className="relative w-1/5">
              <Input
                placeholder="Search branches by name or code..."
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
            {(branchesRefreshing || loading || isPageChanging) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: itemsPerPage }).map((_, index) => (
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
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {branches && Array.isArray(branches) && branches.length > 0 ? (
                  branches.map((branch) => {
                  const stats = getBranchStats(branch);
                  return (
                    <Card key={branch.id}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          {branch.branch_name + " /" + branch.branch_code}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{stats.count} employees</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setBranchToDelete(branch);
                                setIsDeleteModalOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                        <CardDescription>Branch: {branch.branch}</CardDescription>
                        <CardDescription>Acronym: {branch.acronym}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
                            <div className="text-sm text-gray-600">Total Employees</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{stats.managers}</div>
                            <div className="text-sm text-gray-600">Managers</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                  })
                ) : (
                  <div className="col-span-2 text-center py-12 text-gray-500">
                    {searchTerm ? `No branches found matching "${searchTerm}"` : 'No branches found'}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>

        {/* Pagination Controls - Outside table, centered */}
        {!isPageChanging && overviewTotal > itemsPerPage && (() => {
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          return (
            <div className="w-full flex flex-col items-center justify-center py-4 px-4">
              <div className="text-center text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                Showing {startIndex + 1} to {Math.min(endIndex, overviewTotal)} of {overviewTotal} records
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsPageChanging(true);
                    const newPage = Math.max(1, currentPage - 1);
                    setCurrentPage(newPage);
                    setTimeout(async () => {
                      try {
                        await loadData(debouncedSearchTerm);
                        setTimeout(() => {
                          setIsPageChanging(false);
                        }, 300);
                      } catch (error) {
                        setIsPageChanging(false);
                      }
                    }, 10);
                  }}
                  disabled={currentPage === 1 || isPageChanging}
                  className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-0.5 md:gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={async () => {
                            setIsPageChanging(true);
                            setCurrentPage(page);
                            setTimeout(async () => {
                              try {
                                await loadData(debouncedSearchTerm);
                                setTimeout(() => {
                                  setIsPageChanging(false);
                                }, 300);
                              } catch (error) {
                                setIsPageChanging(false);
                              }
                            }, 10);
                          }}
                          disabled={isPageChanging}
                          className={`text-xs md:text-sm w-7 h-7 md:w-8 md:h-8 p-0 ${
                            currentPage === page
                              ? "bg-blue-700 text-white hover:bg-blue-500 hover:text-white"
                              : "bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="text-gray-400 text-xs md:text-sm">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsPageChanging(true);
                    const newPage = Math.min(totalPages, currentPage + 1);
                    setCurrentPage(newPage);
                    setTimeout(async () => {
                      try {
                        await loadData(debouncedSearchTerm);
                        setTimeout(() => {
                          setIsPageChanging(false);
                        }, 300);
                      } catch (error) {
                        setIsPageChanging(false);
                      }
                    }, 10);
                  }}
                  disabled={currentPage === totalPages || isPageChanging}
                  className="text-xs md:text-sm px-2 md:px-3 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Add Branch Modal */}
      <Dialog open={isAddModalOpen} onOpenChangeAction={setIsAddModalOpen}>
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <DialogHeader className="pb-4">
            <DialogTitle>Add New Branch</DialogTitle>
            <DialogDescription>
              Create a new branch in the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-2">
            <div className="space-y-2">
              <Label htmlFor="branchName" className="text-sm font-medium">
                Branch Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="branchName"
                placeholder="Enter branch name"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddBranch();
                  }
                }}
              />
            </div>
            <div className="w-full md:w-48 space-y-2">
              <Label
                htmlFor="branchCode"
                className="text-sm font-medium"
              >
                Branch Code
              </Label>
              <Select
                value={newBranchCode || undefined}
                onValueChange={(value) => setNewBranchCode(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select branch code (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAP">DAP</SelectItem>
                  <SelectItem value="DSM">DSM</SelectItem>
                  <SelectItem value="HD">HD</SelectItem>
                  <SelectItem value="HO">HO</SelectItem>
                  <SelectItem value="KIA">KIA</SelectItem>
                  <SelectItem value="SMCT">SMCT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-6 px-2">
            <div className="flex justify-end space-x-4 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setNewBranchName('');
                  setNewBranchCode('');
                  setIsAddModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddBranch}
                className="bg-green-500 text-white hover:bg-green-600 hover:text-white"
              >
                Add Branch
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
            setBranchToDelete(null);
          }
        }}
      >
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <DialogHeader className="pb-4 bg-red-50 rounded-lg">
            <DialogTitle className="text-red-800 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Delete {branchToDelete?.branch_name} Branch
            </DialogTitle>
            <DialogDescription className="text-red-700">
              This action cannot be undone. Are you sure you want to permanently
              delete this branch?
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
                    <li>This branch record</li>
                    <li>All associations with this branch</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-700">
                <p className="font-medium">Branch Details:</p>
                <div className="mt-2 space-y-1">
                  <p>
                    <span className="font-medium">Branch Name:</span>{" "}
                    {branchToDelete?.branch_name + "/ " + branchToDelete?.branch_code}
                  </p>
                  <p>
                    <span className="font-medium">No. of employees:</span>{" "}
                    {branchToDelete ? Number(branchToDelete.employees_count) + Number(branchToDelete.managers_count) : 0}
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
                  setBranchToDelete(null);
                }}
                className="text-white bg-blue-600 hover:text-white hover:bg-green-500"
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteBranch}
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

