'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import clientDataService from '@/lib/clientDataService';
import { toastMessages } from '@/lib/toastMessages';
import { useDialogAnimation } from '@/hooks/useDialogAnimation';

interface Employee {
  id: number;
  name: string;
  branch?: string;
  role: string;
}

interface Branch {
  id: string;
  name: string;
  branchCode?: string;
}

interface BranchesTabProps {
  employees: Employee[];
}

export function BranchesTab({ employees }: BranchesTabProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState<string>('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  
  // Use dialog animation hook (0.4s to match EditUserModal speed)
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });

  // Function to load data
  const loadData = async () => {
    try {
      // Load branches from API - now returns {id, name} format consistently
      const branchesData = await clientDataService.getBranches();
      
      // Load from localStorage if available, otherwise use API data
      const savedBranches = JSON.parse(localStorage.getItem('branches') || '[]');
      const branchesToUse = savedBranches.length > 0 ? savedBranches : branchesData;
      
      // If no saved branches, initialize localStorage with API data
      if (savedBranches.length === 0 && branchesData.length > 0) {
        localStorage.setItem('branches', JSON.stringify(branchesData));
      }
      
      setBranches(branchesToUse);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  // Load branches when component mounts
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // Add a small delay to ensure skeleton is visible
        await new Promise(resolve => setTimeout(resolve, 300));
        await loadData();
      } catch (error) {
        console.error('Error initializing branches:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Function to refresh data
  const refreshData = async () => {
    console.log('🔄 Starting branches refresh...');
    setIsRefreshing(true);

    try {
      await loadData();
      console.log('✅ Branches refresh completed successfully');
      
      // Keep spinner visible for at least 800ms for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error('❌ Error refreshing branches:', error);
      // Even on error, show spinner for minimum duration
      await new Promise(resolve => setTimeout(resolve, 800));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to handle adding a new branch
  const handleAddBranch = () => {
    if (!newBranchName.trim()) {
      toastMessages.generic.warning('Validation Error', 'Please enter a branch name.');
      return;
    }

    // Check if branch already exists
    const branchExists = branches.some(
      branch => branch.name.toLowerCase().trim() === newBranchName.toLowerCase().trim()
    );

    if (branchExists) {
      toastMessages.generic.warning('Duplicate Branch', 'A branch with this name already exists.');
      return;
    }

    try {
      // Generate new ID (get max ID and add 1, or use timestamp)
      const maxId = branches.length > 0 
        ? Math.max(...branches.map(b => parseInt(b.id) || 0))
        : 0;
      
      const newBranch: Branch = {
        id: String(maxId + 1),
        name: newBranchName.trim(),
        branchCode: newBranchCode.trim() || undefined,
      };

      // Add to state
      const updatedBranches = [...branches, newBranch];
      setBranches(updatedBranches);

      // Save to localStorage
      localStorage.setItem('branches', JSON.stringify(updatedBranches));

      // Show success toast
      toastMessages.generic.success('Branch Added', `"${newBranchName}" has been added successfully.`);

      // Reset form and close modal
      setNewBranchName('');
      setNewBranchCode('');
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding branch:', error);
      toastMessages.generic.error('Error', 'Failed to add branch. Please try again.');
    }
  };

  // Function to handle deleting a branch
  const handleDeleteBranch = () => {
    if (!branchToDelete) return;

    try {
      // Check if branch has employees
      const branchEmployees = employees.filter(emp => emp.branch === branchToDelete.name);
      
      if (branchEmployees.length > 0) {
        toastMessages.generic.warning(
          'Cannot Delete Branch',
          `This branch has ${branchEmployees.length} employee(s). Please reassign them before deleting.`
        );
        setIsDeleteModalOpen(false);
        setBranchToDelete(null);
        return;
      }

      // Remove from state
      const updatedBranches = branches.filter(branch => branch.id !== branchToDelete.id);
      setBranches(updatedBranches);

      // Update localStorage
      localStorage.setItem('branches', JSON.stringify(updatedBranches));

      // Show success toast
      toastMessages.generic.success('Branch Deleted', `"${branchToDelete.name}" has been deleted successfully.`);

      // Close modal and reset
      setIsDeleteModalOpen(false);
      setBranchToDelete(null);
    } catch (error) {
      console.error('Error deleting branch:', error);
      toastMessages.generic.error('Error', 'Failed to delete branch. Please try again.');
    }
  };

  // Function to get branch statistics
  const getBranchStats = (branchName: string) => {
    const branchEmployees = employees.filter(emp => emp.branch === branchName);
    return {
      count: branchEmployees.length,
      managers: branchEmployees.filter(emp => emp.role === 'Manager' || emp.role?.toLowerCase().includes('manager')).length
    };
  };

  // Show loading skeleton on initial load
  if (loading) {
    return (
      <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`skeleton-branch-${index}`} className="animate-pulse">
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
              <CardTitle>Branches</CardTitle>
              <CardDescription>View and manage branch information</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 hover:text-white"
              >
                <Plus className="h-5 w-5" />
                Add Branch
              </Button>
              <Button
                variant="outline"
                onClick={refreshData}
                disabled={isRefreshing}
                className="flex items-center gap-2 bg-blue-600 text-white hover:bg-green-700 hover:text-white"
              >
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
                      <img src="/smct.png" alt="SMCT Logo" className="h-8 w-8 object-contain" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">Refreshing...</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {branches.map((branch) => {
                const stats = getBranchStats(branch.name);
                return (
                  <Card key={branch.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        {branch.name}
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
                      <CardDescription>Branch Location</CardDescription>
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
              })}
            </div>
          </div>
        </CardContent>
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
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchCode" className="text-sm font-medium">
                Branch Code
              </Label>
              <Input
                id="branchCode"
                placeholder="Enter branch code (optional)"
                value={newBranchCode}
                onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
              />
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

      {/* Delete Branch Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChangeAction={(open) => {
        setIsDeleteModalOpen(open);
        if (!open) {
          setBranchToDelete(null);
        }
      }}>
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <DialogHeader className="pb-4 bg-red-50 rounded-lg">
            <DialogTitle className='text-red-800 flex items-center gap-2'>
              <span className="text-xl">⚠️</span>
              Delete Branch
            </DialogTitle>
            <DialogDescription className='text-red-700'>
              This action cannot be undone. Are you sure you want to permanently delete "{branchToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-2 mt-8">
            {branchToDelete && (() => {
              const branchEmployees = employees.filter(emp => emp.branch === branchToDelete.name);
              return branchEmployees.length > 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium">Warning: This branch has {branchEmployees.length} employee(s).</p>
                      <p className="mt-1">Please reassign all employees before deleting this branch.</p>
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
                        <li>Branch record</li>
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
                  setBranchToDelete(null);
                }}
                className="text-white bg-blue-600 hover:text-white hover:bg-green-500"
              >
                Cancel
              </Button>
              <Button
                className='bg-red-600 hover:bg-red-700 text-white'
                onClick={handleDeleteBranch}
                disabled={branchToDelete ? employees.filter(emp => emp.branch === branchToDelete.name).length > 0 : false}
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
