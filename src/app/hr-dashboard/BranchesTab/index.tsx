'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toastMessages } from '@/lib/toastMessages';
import { useDialogAnimation } from '@/hooks/useDialogAnimation';
import branchCodesData from '@/data/branch-code.json';
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

interface Branch {
  id: string;
  name: string;
  branchCode?: string;
}

interface BranchesTabProps {
  branches: { id: string; name: string }[];
  employees: Employee[];
  branchesRefreshing: boolean;
  isActive?: boolean;
}

export function BranchesTab({
  branches: initialBranches,
  employees,
  branchesRefreshing,
  isActive = false
}: BranchesTabProps) {
  const [branches, setBranches] = useState<Branch[]>(initialBranches.map(b => ({ id: b.id, name: b.name })));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use dialog animation hook
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });

  // Update branches when prop changes
  useEffect(() => {
    setBranches(initialBranches.map(b => ({ id: b.id, name: b.name })));
  }, [initialBranches]);

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
        branchCode: newBranchCode && newBranchCode !== 'none' ? newBranchCode : undefined,
      };

      // Add to state
      const updatedBranches = [...branches, newBranch];
      setBranches(updatedBranches);

      // Save to localStorage
      const savedBranches = JSON.parse(localStorage.getItem('branches') || '[]');
      const updatedAllBranches = [...savedBranches, newBranch];
      localStorage.setItem('branches', JSON.stringify(updatedAllBranches));

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

  // Get branch statistics
  const getBranchStats = (branchName: string) => {
    const branchEmployees = employees.filter(emp => emp.branch === branchName);
    return {
      count: branchEmployees.length,
      managers: branchEmployees.filter(emp => emp.role === 'Manager').length
    };
  };

  // Filter branches based on search term
  const filteredBranches = branches.filter(branch => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return branch.name.toLowerCase().includes(searchLower) ||
           (branch.branchCode && branch.branchCode.toLowerCase().includes(searchLower));
  });

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
            {branchesRefreshing ? (
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
                    <p className="text-sm text-gray-600 font-medium">Loading branches...</p>
                  </div>
                </div>
                
                {/* Grid structure visible in background */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, index) => (
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
              </>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredBranches.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-gray-500">
                    {searchTerm ? `No branches found matching "${searchTerm}"` : 'No branches found'}
                  </div>
                ) : (
                  filteredBranches.map((branch) => {
                  const stats = getBranchStats(branch.name);
                  return (
                    <Card key={branch.id}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          {branch.name}
                          <Badge variant="outline">{stats.count} employees</Badge>
                        </CardTitle>
                        <CardDescription>Branch Location</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
                            <div className="text-sm text-gray-600">Total Employees</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{stats.managers}</div>
                            <div className="text-sm text-gray-600">Manager</div>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddBranch();
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
    </div>
  );
}

