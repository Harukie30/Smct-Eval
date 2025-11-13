'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import clientDataService from '@/lib/clientDataService';
import { toastMessages } from '@/lib/toastMessages';
import { useDialogAnimation } from '@/hooks/useDialogAnimation';

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

interface BranchHeadsTabProps {
  employees: Employee[];
  onRefresh?: (showModal?: boolean, isAutoRefresh?: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function BranchHeadsTab({
  employees,
  onRefresh,
  isLoading = false
}: BranchHeadsTabProps) {
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBranchHead, setSelectedBranchHead] = useState<Employee | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<{id: string, name: string}[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successData, setSuccessData] = useState<{branchHead: Employee | null, branches: {id: string, name: string}[]}>({branchHead: null, branches: []});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [branchHeadToEdit, setBranchHeadToEdit] = useState<Employee | null>(null);
  const [editSelectedBranches, setEditSelectedBranches] = useState<{id: string, name: string}[]>([]);
  const [showEditSuccessDialog, setShowEditSuccessDialog] = useState(false);
  const [editSuccessData, setEditSuccessData] = useState<{branchHead: Employee | null, branches: {id: string, name: string}[]}>({branchHead: null, branches: []});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchHeadToDelete, setBranchHeadToDelete] = useState<Employee | null>(null);
  
  // Use dialog animation hook (0.4s to match EditUserModal speed)
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });

  // Memoized branch heads (only recalculates when employees change)
  const branchHeads = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    
    return employees.filter(emp => {
      const position = emp.position?.toLowerCase() || '';
      
      // Filter by position only - looking for branch head or branch manager positions
      return position.includes('branch head') || 
             position.includes('branchhead') ||
             position.includes('branch manager');
    });
  }, [employees]);


  // Load branches data
  const loadBranches = async (): Promise<{id: string, name: string}[]> => {
    // Don't reload if branches are already loaded
    if (branches.length > 0 && !branchesLoading) {
      return branches;
    }
    
    setBranchesLoading(true);
    try {
      const branchesData = await clientDataService.getBranches();
      // Normalize the data format - handle both {id, name} and {value, label} formats
      const normalizedBranches = branchesData.map((branch: any) => {
        if ('id' in branch && 'name' in branch) {
          return { id: branch.id, name: branch.name };
        } else if ('value' in branch && 'label' in branch) {
          // Extract branch code from label if it contains " /"
          const labelParts = branch.label.split(' /');
          return { 
            id: branch.value, 
            name: labelParts[0] || branch.label 
          };
        }
        return { id: String(branch.id || branch.value || ''), name: String(branch.name || branch.label || '') };
      });
      setBranches(normalizedBranches);
      return normalizedBranches;
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
      return [];
    } finally {
      setBranchesLoading(false);
    }
  };

  // Auto-close success dialog after 2 seconds
  useEffect(() => {
    if (showSuccessDialog) {
      const timer = setTimeout(() => {
        setShowSuccessDialog(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [showSuccessDialog]);

  // Auto-close edit success dialog after 2 seconds
  useEffect(() => {
    if (showEditSuccessDialog) {
      const timer = setTimeout(() => {
        setShowEditSuccessDialog(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [showEditSuccessDialog]);

  // Add custom CSS for success dialog content animations (checkmark, ripple, etc.)
  // Note: Container animations are now handled by useDialogAnimation hook
  useEffect(() => {
    const styleId = 'branch-heads-success-animations';
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      return; // Styles already injected
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Success Dialog Content Animations */
      @keyframes successScale {
        0% {
          transform: scale(0);
          opacity: 0;
        }
        50% {
          transform: scale(1.1);
          opacity: 1;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      
      @keyframes drawCheckmark {
        0% {
          stroke-dashoffset: 20;
        }
        100% {
          stroke-dashoffset: 0;
        }
      }
      
      @keyframes successRipple {
        0% {
          transform: scale(1);
          opacity: 0.5;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }
      
      .animate-success-scale {
        animation: successScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }
      
      .animate-success-checkmark {
        animation: drawCheckmark 0.5s ease-out 0.3s forwards;
      }
      
      .animate-success-ripple {
        animation: successRipple 1s ease-out 0.2s;
      }
      
      .animate-draw-checkmark {
        animation: drawCheckmark 0.5s ease-out 0.3s forwards;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Branch Heads</CardTitle>
              <CardDescription>List of all branch heads in the organization</CardDescription>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsListModalOpen(true)}
            >
              Add New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative max-h-[600px] overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-1/3">Name</TableHead>
                  <TableHead className="w-1/3 text-center">Branch</TableHead>
                  <TableHead className="w-1/3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoading || !employees || employees.length === 0) ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell className="py-4">
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex flex-wrap justify-center gap-2">
                          <Skeleton className="h-6 w-24" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex justify-end space-x-2">
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-16" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : branchHeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      No branch heads found
                    </TableCell>
                  </TableRow>
                ) : (
                  branchHeads.map((head) => {
                    // Parse branches from comma-separated string
                    const branchList = head.branch ? head.branch.split(', ').filter(b => b.trim()) : [];
                    
                    return (
                      <TableRow key={head.id}>
                        <TableCell className="font-medium py-4">{head.name}</TableCell>
                        <TableCell className="py-4 text-center">
                          {branchList.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-2">
                              {branchList.map((branch, index) => (
                                <Badge key={index} className="bg-blue-600 text-white">
                                  {branch.trim()}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-white bg-blue-400 hover:text-blue-700 hover:bg-blue-50"
                              onClick={async () => {
                                setBranchHeadToEdit(head);
                                setIsEditModalOpen(true);
                                // Load branches first and wait for them
                                const loadedBranches = await loadBranches();
                                // Then parse existing branches after branches are loaded
                                if (head.branch && loadedBranches) {
                                  const existingBranches = head.branch.split(', ').map(name => {
                                    // Try to find matching branch from loaded branches
                                    const branch = loadedBranches.find((b: {id: string, name: string}) => b.name === name.trim());
                                    return branch || { id: '', name: name.trim() };
                                  }).filter((b: {id: string, name: string}) => b.id || b.name);
                                  setEditSelectedBranches(existingBranches);
                                } else {
                                  setEditSelectedBranches([]);
                                }
                              }}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-white bg-red-400 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setBranchHeadToDelete(head);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Branch Heads List Modal */}
      <Dialog open={isListModalOpen} onOpenChangeAction={setIsListModalOpen}>
        <DialogContent className={`max-w-xl max-h-[90vh] p-4 flex flex-col ${dialogAnimationClass}`}>
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Branch Heads List</DialogTitle>
                <DialogDescription>
                  Complete list of all branch heads in the organization
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsListModalOpen(false)}
                className="h-10 w-10 p-0 hover:bg-gray-100 bg-blue-600 text-white rounded-full hover:text-white hover:bg-red-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
            {branchHeads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No branch heads found
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table className="w-full">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-2/3 px-6">Name</TableHead>
                      <TableHead className="w-1/3 text-center px-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchHeads.map((head) => (
                      <TableRow key={head.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium py-3 px-6">{head.name}</TableCell>
                        <TableCell className="py-3 text-center px-6">
                          <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            size="sm"
                            onClick={async () => {
                              // Store the selected branch head
                              setSelectedBranchHead(head);
                              // Load branches first (in background) to prevent loading state flicker
                              await loadBranches();
                              // Close the Branch Heads modal
                              setIsListModalOpen(false);
                              // Use double requestAnimationFrame for smoother transition (allows DOM to update)
                              requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                  setIsBranchesModalOpen(true);
                                });
                              });
                            }}
                          >
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Branches List Modal */}
      <Dialog open={isBranchesModalOpen} onOpenChangeAction={setIsBranchesModalOpen}>
        <DialogContent className={`max-w-xl max-h-[90vh] p-4 flex flex-col ${dialogAnimationClass}`}>
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Branches List</DialogTitle>
                <DialogDescription>
                  Complete list of all branches in the organization
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsBranchesModalOpen(false);
                  setShowConfirmation(false);
                  setSelectedBranches([]);
                }}
                className="h-10 w-10 p-0 hover:bg-gray-100 bg-blue-600 text-white rounded-full hover:text-white hover:bg-red-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
            {/* Confirmation Indicator */}
            {showConfirmation && selectedBranches.length > 0 && selectedBranchHead && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Branch Assignment Ready</p>
                    <p className="text-sm text-blue-700 mt-1">
                      <span className="font-semibold">{selectedBranchHead.name}</span> will be assigned to:
                    </p>
                    <div className="mt-2 space-y-1">
                      {selectedBranches.map((branch) => (
                        <div key={branch.id} className="flex items-center gap-2">
                          <span className="text-xs text-blue-600">•</span>
                          <span className="text-sm text-blue-700 font-medium">{branch.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setSelectedBranches([]);
                      setShowConfirmation(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={async () => {
                      if (!selectedBranchHead || selectedBranches.length === 0) return;
                      
                      try {
                        // Store data for success message
                        setSuccessData({branchHead: selectedBranchHead, branches: [...selectedBranches]});
                        
                        // Update employee with branch assignments
                        // If multiple branches, combine them with comma separator
                        const branchNames = selectedBranches.map(b => b.name).join(', ');
                        const branchIds = selectedBranches.map(b => b.id).join(', ');
                        
                        // Update using clientDataService
                        await clientDataService.updateEmployee(selectedBranchHead.id, {
                          branch: branchNames, // Store branch names
                          updatedAt: new Date().toISOString()
                        });
                        
                        // Also update accounts in localStorage
                        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
                        const accountIndex = accounts.findIndex((acc: any) => 
                          acc.id === selectedBranchHead.id || acc.employeeId === selectedBranchHead.id
                        );
                        
                        if (accountIndex !== -1) {
                          accounts[accountIndex] = {
                            ...accounts[accountIndex],
                            branch: branchNames,
                            updatedAt: new Date().toISOString()
                          };
                          localStorage.setItem('accounts', JSON.stringify(accounts));
                        }
                        
                        // Close the branches modal after confirmation
                        setIsBranchesModalOpen(false);
                        setShowConfirmation(false);
                        // Show success dialog
                        setShowSuccessDialog(true);
                        // Clear selections after a delay
                        setTimeout(() => {
                          setSelectedBranches([]);
                        }, 100);
                        
                        // Show success toast
                        toastMessages.generic.success(
                          'Branch Assignment Successful',
                          `${selectedBranchHead.name} has been assigned to ${selectedBranches.length} ${selectedBranches.length === 1 ? 'branch' : 'branches'}.`
                        );
                        
                        // Refresh parent component data to update the table
                        if (onRefresh) {
                          await onRefresh(false, false);
                        } else {
                          // Fallback: reload the page if no refresh callback
                          window.location.reload();
                        }
                      } catch (error) {
                        console.error('Error assigning branches:', error);
                        toastMessages.generic.error(
                          'Assignment Failed',
                          'Failed to assign branches. Please try again.'
                        );
                      }
                    }}
                  >
                    Confirm ({selectedBranches.length})
                  </Button>
                </div>
              </div>
            )}

            {branchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No branches found
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-2/5">Branch Name</TableHead>
                      <TableHead className="w-2/5 text-center">Branch ID</TableHead>
                      <TableHead className="w-1/5 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((branch) => (
                      <TableRow key={branch.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium py-3">{branch.name}</TableCell>
                        <TableCell className="py-3 text-center">{branch.id}</TableCell>
                        <TableCell className="py-3 text-center">
                          <div className="flex justify-center">
                            <Button
                              className={`${
                                selectedBranches.some(b => b.id === branch.id)
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              size="sm"
                              onClick={() => {
                                // Check if branch is already selected
                                const isSelected = selectedBranches.some(b => b.id === branch.id);
                                
                                if (isSelected) {
                                  // Remove from selection
                                  setSelectedBranches(selectedBranches.filter(b => b.id !== branch.id));
                                  if (selectedBranches.length === 1) {
                                    setShowConfirmation(false);
                                  }
                                } else {
                                  // Add to selection
                                  setSelectedBranches([...selectedBranches, branch]);
                                  setShowConfirmation(true);
                                }
                              }}
                            >
                              {selectedBranches.some(b => b.id === branch.id) ? 'Added' : 'Add'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChangeAction={setShowSuccessDialog}>
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            {/* Success Animation */}
            <div className="relative">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-success-scale">
                <svg 
                  className="w-12 h-12 text-green-600 animate-success-checkmark" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7"
                    strokeDasharray="20"
                    strokeDashoffset="20"
                    className="animate-draw-checkmark"
                  />
                </svg>
              </div>
              {/* Ripple effect */}
              <div className="absolute inset-0 bg-green-200 rounded-full animate-success-ripple opacity-0"></div>
            </div>
            
            {/* Success Message */}
            <div className="text-center space-y-2">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Success!
              </DialogTitle>
              <DialogDescription className="text-base text-gray-600">
                {successData.branchHead && successData.branches.length > 0 && (
                  <>
                    <span className="font-semibold">{successData.branchHead.name}</span> has been successfully assigned to {successData.branches.length} {successData.branches.length === 1 ? 'branch' : 'branches'}.
                  </>
                )}
              </DialogDescription>
              <p className="text-sm text-gray-500 mt-2">Closing automatically...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Head Modal */}
      <Dialog open={isEditModalOpen} onOpenChangeAction={setIsEditModalOpen}>
        <DialogContent className={`max-w-xl max-h-[90vh] p-4 flex flex-col ${dialogAnimationClass}`}>
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Edit Branch Assignment</DialogTitle>
                <DialogDescription>
                  Update branch assignments for {branchHeadToEdit?.name}
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setBranchHeadToEdit(null);
                  setEditSelectedBranches([]);
                }}
                className="h-10 w-10 p-0 hover:bg-gray-100 bg-blue-600 text-white rounded-full hover:text-white hover:bg-red-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
            {/* Current Assignment Display */}
            {branchHeadToEdit && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Current Assignment:</p>
                <p className="text-sm text-gray-600">
                  {branchHeadToEdit.branch || 'No branches assigned'}
                </p>
              </div>
            )}

            {/* Branches Selection */}
            {branchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No branches found
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-2/5">Branch Name</TableHead>
                        <TableHead className="w-2/5 text-center">Branch ID</TableHead>
                        <TableHead className="w-1/5 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((branch) => {
                        const isSelected = editSelectedBranches.some(b => b.id === branch.id);
                        return (
                          <TableRow key={branch.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium py-3">{branch.name}</TableCell>
                            <TableCell className="py-3 text-center">{branch.id}</TableCell>
                            <TableCell className="py-3 text-center">
                              <div className="flex justify-center">
                                <Button
                                  className={`${
                                    isSelected
                                      ? 'bg-green-600 hover:bg-green-700 text-white'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                                  size="sm"
                                  onClick={() => {
                                    if (isSelected) {
                                      setEditSelectedBranches(editSelectedBranches.filter(b => b.id !== branch.id));
                                    } else {
                                      setEditSelectedBranches([...editSelectedBranches, branch]);
                                    }
                                  }}
                                >
                                  {isSelected ? 'Selected' : 'Select'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Selected Branches Summary */}
            {editSelectedBranches.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Selected Branches ({editSelectedBranches.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {editSelectedBranches.map((branch) => (
                    <Badge key={branch.id} className="bg-blue-600 text-white">
                      {branch.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setIsEditModalOpen(false);
                setBranchHeadToEdit(null);
                setEditSelectedBranches([]);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={async () => {
                if (!branchHeadToEdit || editSelectedBranches.length === 0) {
                  toastMessages.generic.error('Validation Error', 'Please select at least one branch.');
                  return;
                }

                try {
                  // Update employee with branch assignments
                  const branchNames = editSelectedBranches.map(b => b.name).join(', ');
                  
                  // Update using clientDataService
                  await clientDataService.updateEmployee(branchHeadToEdit.id, {
                    branch: branchNames,
                    updatedAt: new Date().toISOString()
                  });
                  
                  // Also update accounts in localStorage
                  const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
                  const accountIndex = accounts.findIndex((acc: any) => 
                    acc.id === branchHeadToEdit.id || acc.employeeId === branchHeadToEdit.id
                  );
                  
                  if (accountIndex !== -1) {
                    accounts[accountIndex] = {
                      ...accounts[accountIndex],
                      branch: branchNames,
                      updatedAt: new Date().toISOString()
                    };
                    localStorage.setItem('accounts', JSON.stringify(accounts));
                  }
                  
                  // Refresh parent component data
                  if (onRefresh) {
                    await onRefresh(false, false);
                  }
                  
                  // Store success data
                  setEditSuccessData({branchHead: branchHeadToEdit, branches: [...editSelectedBranches]});
                  
                  // Close modal
                  setIsEditModalOpen(false);
                  setBranchHeadToEdit(null);
                  setEditSelectedBranches([]);
                  
                  // Show success dialog
                  setShowEditSuccessDialog(true);
                  
                  // Show success toast
                  toastMessages.generic.success(
                    'Branch Assignment Updated',
                    `${branchHeadToEdit.name}'s branch assignment has been updated.`
                  );
                } catch (error) {
                  console.error('Error updating branch assignment:', error);
                  toastMessages.generic.error(
                    'Update Failed',
                    'Failed to update branch assignment. Please try again.'
                  );
                }
              }}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Success Dialog */}
      <Dialog open={showEditSuccessDialog} onOpenChangeAction={setShowEditSuccessDialog}>
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            {/* Success Animation */}
            <div className="relative">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-success-scale">
                <svg 
                  className="w-12 h-12 text-green-600 animate-success-checkmark" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7"
                    strokeDasharray="20"
                    strokeDashoffset="20"
                    className="animate-draw-checkmark"
                  />
                </svg>
              </div>
              {/* Ripple effect */}
              <div className="absolute inset-0 bg-green-200 rounded-full animate-success-ripple opacity-0"></div>
            </div>
            
            {/* Success Message */}
            <div className="text-center space-y-2">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Updated!
              </DialogTitle>
              <DialogDescription className="text-base text-gray-600">
                {editSuccessData.branchHead && editSuccessData.branches.length > 0 && (
                  <>
                    <span className="font-semibold">{editSuccessData.branchHead.name}</span>'s branch assignment has been updated to {editSuccessData.branches.length} {editSuccessData.branches.length === 1 ? 'branch' : 'branches'}.
                  </>
                )}
              </DialogDescription>
              <p className="text-sm text-gray-500 mt-2">Closing automatically...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Branch Head Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChangeAction={(open) => {
        setIsDeleteModalOpen(open);
        if (!open) {
          setBranchHeadToDelete(null);
        }
      }}>
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <DialogHeader className="pb-4 bg-red-50 rounded-lg">
            <DialogTitle className='text-red-800 flex items-center gap-2'>
              <span className="text-xl">⚠️</span>
              Delete Branch Assignment
            </DialogTitle>
            <DialogDescription className='text-red-700'>
              This action cannot be undone. Are you sure you want to permanently remove branch assignments for {branchHeadToDelete?.name}?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-6 px-2">
            <div className="flex justify-end space-x-4 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setBranchHeadToDelete(null);
                }}
                className="text-white bg-blue-600 hover:text-white hover:bg-green-500"
              >
                Cancel
              </Button>
              <Button
                className='bg-red-600 hover:bg-red-700 text-white'
                onClick={async () => {
                  if (!branchHeadToDelete) return;

                  try {
                    // Remove branch assignment (set branch to empty)
                    await clientDataService.updateEmployee(branchHeadToDelete.id, {
                      branch: '',
                      updatedAt: new Date().toISOString()
                    });

                    // Also update accounts in localStorage
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
                    const accountIndex = accounts.findIndex((acc: any) => 
                      acc.id === branchHeadToDelete.id || acc.employeeId === branchHeadToDelete.id
                    );
                    
                    if (accountIndex !== -1) {
                      accounts[accountIndex] = {
                        ...accounts[accountIndex],
                        branch: '',
                        updatedAt: new Date().toISOString()
                      };
                      localStorage.setItem('accounts', JSON.stringify(accounts));
                    }

                    // Refresh parent component data
                    if (onRefresh) {
                      await onRefresh(false, false);
                    }

                    // Show success message
                    toastMessages.generic.success(
                      'Branch Assignment Removed',
                      `${branchHeadToDelete.name}'s branch assignment has been removed.`
                    );

                    // Close modal and reset
                    setIsDeleteModalOpen(false);
                    setBranchHeadToDelete(null);
                  } catch (error) {
                    console.error('Error deleting branch assignment:', error);
                    toastMessages.generic.error(
                      'Delete Failed',
                      'Failed to remove branch assignment. Please try again.'
                    );
                  }
                }}
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

