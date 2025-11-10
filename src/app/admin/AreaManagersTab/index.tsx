'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import clientDataService from '@/lib/clientDataService';
import { toastMessages } from '@/lib/toastMessages';

interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch?: string;
  contact?: string;
  isActive?: boolean;
  role: string;
}

interface AreaManagersTabProps {
  employees: Employee[];
  onRefresh?: (showModal?: boolean, isAutoRefresh?: boolean) => Promise<void>;
}

export function AreaManagersTab({ employees, onRefresh }: AreaManagersTabProps) {
  const [areaManagersRefreshing, setAreaManagersRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedAreaManager, setSelectedAreaManager] = useState<Employee | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<{id: string, name: string}[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successData, setSuccessData] = useState<{areaManager: Employee | null, branches: {id: string, name: string}[]}>({areaManager: null, branches: []});

  // Memoized area managers (only recalculates when employees change)
  const areaManagers = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    
    return employees.filter(emp => {
      const position = emp.position?.toLowerCase() || '';
      const role = emp.role?.toLowerCase() || '';
      
      // Filter by position, role, or if role is manager with area-related position
      return position.includes('area manager') || 
             position.includes('areamanager') ||
             position.includes('regional manager') ||
             role.includes('area manager') ||
             role.includes('areamanager') ||
             (role === 'manager' && position.includes('area'));
    });
  }, [employees]);

  // Only show spinner on initial mount, not on employees prop changes
  useEffect(() => {
    if (isInitialLoad) {
      setAreaManagersRefreshing(true);
      const timer = setTimeout(() => {
        setAreaManagersRefreshing(false);
        setIsInitialLoad(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad]);

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

  // Add CSS animations for modal
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes modalPopup {
        0% {
          transform: scale(0.8) translateY(20px);
          opacity: 0;
        }
        50% {
          transform: scale(1.05) translateY(-5px);
          opacity: 0.9;
        }
        100% {
          transform: scale(1) translateY(0);
          opacity: 1;
        }
      }
      
      .area-managers-modal-container {
        animation: modalPopup 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        transform-origin: center !important;
        will-change: transform, opacity;
        transition: opacity 0.2s ease-in-out;
      }
      
      .area-managers-modal-container.animate-in,
      .area-managers-modal-container.fade-in-0,
      .area-managers-modal-container.zoom-in-95 {
        animation: modalPopup 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      }
      
      /* Prevent flicker during modal transition */
      [role="dialog"] {
        transition: opacity 0.15s ease-in-out;
      }

      /* Success Dialog Animations */
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
      
      .success-dialog-container {
        animation: modalPopup 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
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
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Auto-close success dialog after 2 seconds
  useEffect(() => {
    if (showSuccessDialog) {
      const timer = setTimeout(() => {
        setShowSuccessDialog(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [showSuccessDialog]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Area Managers</CardTitle>
              <CardDescription>List of all area managers in the organization</CardDescription>
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
            {areaManagersRefreshing && (
              <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-white/80">
                <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                  <div className="relative">
                    {/* Spinning ring */}
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    {/* Logo in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Refreshing...</p>
                </div>
              </div>
            )}
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-1/3">Name</TableHead>
                  <TableHead className="w-1/3 text-center">Branches</TableHead>
                  <TableHead className="w-1/3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areaManagersRefreshing && areaManagers.length === 0 ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell className="py-4">
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Skeleton className="h-4 w-24 mx-auto" />
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <Skeleton className="h-8 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : areaManagers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      No area managers found
                    </TableCell>
                  </TableRow>
                ) : (
                  areaManagers.map((manager) => {
                    // Parse branches - handle both comma-separated string and single branch
                    const branchList = manager.branch 
                      ? manager.branch.split(',').map(b => b.trim()).filter(b => b.length > 0)
                      : [];
                    
                    return (
                      <TableRow key={manager.id}>
                        <TableCell className="py-4 font-medium">{manager.name}</TableCell>
                        <TableCell className="py-4 text-center">
                          {branchList.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-2">
                              {branchList.map((branch, index) => (
                                <Badge key={index} className="bg-blue-600 text-white">
                                  {branch}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          {/* Actions will be added here */}
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

      {/* Area Managers List Modal */}
      <Dialog open={isListModalOpen} onOpenChangeAction={setIsListModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-6 area-managers-modal-container flex flex-col">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Area Managers List</DialogTitle>
                <DialogDescription>
                  Complete list of all area managers in the organization
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

          <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
            {areaManagers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No area managers found
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-1/4">Name</TableHead>
                        <TableHead className="w-1/4 text-center">Email</TableHead>
                        <TableHead className="w-1/4 text-center">Branch</TableHead>
                        <TableHead className="w-1/4 text-center">Position</TableHead>
                        <TableHead className="w-auto text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {areaManagers.map((manager) => (
                        <TableRow key={manager.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium py-3">{manager.name}</TableCell>
                          <TableCell className="py-3 text-center">{manager.email}</TableCell>
                          <TableCell className="py-3 text-center">{manager.branch || 'N/A'}</TableCell>
                          <TableCell className="py-3 text-center">{manager.position}</TableCell>
                          <TableCell className="py-3 text-center">
                            <Button
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              size="sm"
                              onClick={async () => {
                                // Store the selected area manager
                                setSelectedAreaManager(manager);
                                // Load branches first (in background) to prevent loading state flicker
                                await loadBranches();
                                // Close the Area Managers modal
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
        <DialogContent className="max-w-4xl max-h-[90vh] p-6 area-managers-modal-container flex flex-col">
          <DialogHeader className="pb-4">
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

          <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
            {/* Confirmation Indicator */}
            {showConfirmation && selectedBranches.length > 0 && selectedAreaManager && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Add Area Manager</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Add <span className="font-semibold">{selectedAreaManager.name}</span> to:
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
                      if (!selectedAreaManager || selectedBranches.length === 0) return;
                      
                      try {
                        // Store data for success message
                        setSuccessData({areaManager: selectedAreaManager, branches: [...selectedBranches]});
                        
                        // Update employee with branch assignments
                        // If multiple branches, combine them with comma separator
                        const branchNames = selectedBranches.map(b => b.name).join(', ');
                        
                        // Update using clientDataService
                        await clientDataService.updateEmployee(selectedAreaManager.id, {
                          branch: branchNames, // Store branch names
                          updatedAt: new Date().toISOString()
                        });
                        
                        // Also update accounts in localStorage
                        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
                        const accountIndex = accounts.findIndex((acc: any) => 
                          acc.id === selectedAreaManager.id || acc.employeeId === selectedAreaManager.id
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
                          `${selectedAreaManager.name} has been assigned to ${selectedBranches.length} ${selectedBranches.length === 1 ? 'branch' : 'branches'}.`
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
      <Dialog open={showSuccessDialog} onOpenChangeAction={() => {}}>
        <DialogContent className="max-w-md p-6 success-dialog-container">
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative mb-4">
              <div className="animate-success-ripple absolute inset-0 rounded-full bg-green-200"></div>
              <div className="relative w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-success-scale">
                <svg
                  className="w-8 h-8 text-green-600 animate-success-checkmark"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="20"
                    strokeDashoffset="20"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Success!</h3>
            <p className="text-sm text-gray-600 text-center">
              {successData.areaManager && successData.branches.length > 0 && (
                <>
                  {successData.areaManager.name} has been assigned to{' '}
                  {successData.branches.map(b => b.name).join(', ')}
                </>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

