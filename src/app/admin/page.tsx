"use client";

import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import DashboardShell, { SidebarItem } from '@/components/DashboardShell';
import { withAuth } from '@/hoc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

import EditUserModal from '@/components/EditUserModal';
import { toastMessages } from '@/lib/toastMessages';
import clientDataService from '@/lib/clientDataService';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

// Lazy load tab components for better performance
const OverviewTab = lazy(() => import('./OverviewTab').then(m => ({ default: m.OverviewTab })));
const UserManagementTab = lazy(() => import('./UserManagementTab').then(m => ({ default: m.UserManagementTab })));
const EmployeeManagementTab = lazy(() => import('./EmployeeManagementTab').then(m => ({ default: m.EmployeeManagementTab })));
const EvaluatedReviewsTab = lazy(() => import('./EvaluatedReviewsTab').then(m => ({ default: m.EvaluatedReviewsTab })));
const DepartmentsTab = lazy(() => import('./DepartmentsTab').then(m => ({ default: m.DepartmentsTab })));
const BranchHeadsTab = lazy(() => import('./BranchHeadsTab').then(m => ({ default: m.BranchHeadsTab })));
const BranchesTab = lazy(() => import('./BranchesTab').then(m => ({ default: m.BranchesTab })));
const AreaManagersTab = lazy(() => import('./AreaManagersTab').then(m => ({ default: m.AreaManagersTab })));

// Import data
import accountsDataRaw from '@/data/accounts.json';
import departmentsData from '@/data/departments.json';
// branchData now comes from clientDataService
// positionsData now comes from clientDataService
import branchCodesData from '@/data/branch-code.json';

// Extract accounts array from the new structure
const accountsData = accountsDataRaw.accounts || [];

// TypeScript interfaces
interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch?: string;
  hireDate: string;
  role: string;
  username?: string;
  password?: string;
  isActive?: boolean;
  avatar?: string | null;
  bio?: string | null;
  contact?: string;
  updatedAt?: string;
  approvedDate?: string; // Date when the user was approved
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalEvaluations: number;
  pendingEvaluations: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  lastBackup: string;
  uptime: string;
  storageUsed: number;
  storageTotal: number;
}

interface DashboardStats {
  employeeDashboard: {
    activeUsers: number;
    totalViews: number;
    lastActivity: string;
  };
  hrDashboard: {
    activeUsers: number;
    totalViews: number;
    lastActivity: string;
  };
  evaluatorDashboard: {
    activeUsers: number;
    totalViews: number;
    lastActivity: string;
  };
}


interface Review {
  id: number;
  employeeName: string;
  evaluatorName: string;
  department: string;
  position: string;
  evaluationDate: string;
  overallScore: number;
  status: 'completed' | 'pending' | 'in_progress';
  lastUpdated: string;
  totalCriteria: number;
  completedCriteria: number;
}

interface SuspendedEmployee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch: string;
  suspensionDate: string;
  suspensionReason: string;
  suspensionDuration: string;
  suspendedBy: string;
  status: 'suspended' | 'pending_review' | 'reinstated';
  reinstatedDate?: string;
  reinstatedBy?: string;
}

interface Department {
  id: number;
  name: string;
  manager: string;
  employeeCount: number;
  performance: number;
}


function AdminDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positionsData, setPositionsData] = useState<{id: string, name: string}[]>([]);
  const [branchesData, setBranchesData] = useState<{id: string, name: string}[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [suspendedEmployees, setSuspendedEmployees] = useState<SuspendedEmployee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Initialize active tab from URL parameter or default to 'overview'
  const tabParam = searchParams.get('tab');
  const [active, setActiveState] = useState(tabParam || 'overview');

  // Function to update both state and URL
  const setActive = useCallback((tab: string) => {
    setActiveState(tab);
    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  // Function to refresh user data (used by shared hook)
  const refreshUserData = async () => {
    console.log('🔄 Starting user data refresh...');
    setIsRefreshing(true);

    try {
      // Load accounts data directly (no merging needed)
      const employees = await loadAccountsData();
      console.log('📊 Loaded employees:', employees.length);

      const filteredEmployees = filterDeletedEmployees(employees);
      console.log('✅ Filtered employees:', filteredEmployees.length);

      setEmployees(filteredEmployees);

      // Update system metrics with actual data (will be updated by updateSystemMetrics)
      setSystemMetrics(prev => prev ? {
        ...prev,
        totalUsers: filteredEmployees.length,
        activeUsers: filteredEmployees.length
      } : null);

      // Update dashboard stats with actual data
      setDashboardStats(prev => prev ? {
        ...prev,
        employeeDashboard: {
          ...prev.employeeDashboard,
          activeUsers: filteredEmployees.filter((emp: any) => {
            const role = emp.role?.toLowerCase() || '';
            return role === 'employee' ||
              role.includes('representative') ||
              role.includes('designer') ||
              role.includes('developer') ||
              role.includes('specialist') ||
              role.includes('analyst') ||
              role.includes('coordinator') ||
              role.includes('assistant');
          }).length
        },
        hrDashboard: {
          ...prev.hrDashboard,
          activeUsers: filteredEmployees.filter((emp: any) => {
            const role = emp.role?.toLowerCase() || '';
            return role === 'hr' ||
              role === 'hr-manager' ||
              role.includes('hr') ||
              role.includes('human resources');
          }).length
        },
        evaluatorDashboard: {
          ...prev.evaluatorDashboard,
          activeUsers: filteredEmployees.filter((emp: any) => {
            const role = emp.role?.toLowerCase() || '';
            return role === 'evaluator' ||
              role.includes('manager') ||
              role.includes('supervisor') ||
              role.includes('director') ||
              role.includes('lead');
          }).length
        }
      } : null);

      // Also refresh pending registrations and evaluated reviews
      await loadPendingRegistrations();
      await loadEvaluatedReviews();

      // Update system metrics to reflect current state
      updateSystemMetrics();

      console.log('✅ User data refresh completed successfully');

    } catch (error) {
      console.error('❌ Error refreshing user data:', error);

      // Show error message to user
      toastMessages.generic.error('Refresh Failed', 'Failed to refresh user data. Please try again.');

      // Fallback: load accounts data directly
      try {
        const employees = await loadAccountsData();
        const filteredEmployees = filterDeletedEmployees(employees);
        setEmployees(filteredEmployees);
        console.log('🔄 Fallback refresh completed');
      } catch (fallbackError) {
        console.error('❌ Fallback refresh also failed:', fallbackError);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Ref to store refresh function to avoid dependency issues
  const refreshUserDataRef = useRef(refreshUserData);
  
  // Update ref when function changes
  useEffect(() => {
    refreshUserDataRef.current = refreshUserData;
  }, [refreshUserData]);

  // Auto-refresh functionality using shared hook
  const {
    showRefreshModal,
    refreshModalMessage,
    handleRefreshModalComplete,
    refreshDashboardData
  } = useAutoRefresh({
    refreshFunction: refreshUserData,
    dashboardName: 'Admin Dashboard',
    customMessage: 'Welcome back! Refreshing your admin dashboard data...'
  });

  // Handle URL parameter changes for tab navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== active) {
      setActiveState(tab);
    }
  }, [searchParams, active]);

  // Real-time data updates via localStorage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only refresh if the change is from another tab/window
      if (e.key === 'submissions' && e.newValue !== e.oldValue) {
        console.log('📊 Submissions data updated, refreshing admin dashboard...');
        loadEvaluatedReviews();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  // Function to refresh evaluated reviews only
  const handleRefreshEvaluatedReviews = async () => {
    console.log('🔄 Starting evaluated reviews refresh...');
    setIsRefreshing(true);

    try {
      await loadEvaluatedReviews();
      console.log('✅ Evaluated reviews refresh completed successfully');
    } catch (error) {
      console.error('❌ Error refreshing evaluated reviews:', error);
      toastMessages.generic.error('Refresh Failed', 'Failed to refresh evaluated reviews. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedSuspendedEmployee, setSelectedSuspendedEmployee] = useState<SuspendedEmployee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [reinstatedEmployeeToDelete, setReinstatedEmployeeToDelete] = useState<SuspendedEmployee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [dashboardTab, setDashboardTab] = useState<'suspended' | 'reinstated'>('suspended');
  const [suspendedSearchTerm, setSuspendedSearchTerm] = useState('');
  const [reinstatedSearchTerm, setReinstatedSearchTerm] = useState('');
  const [approvedRegistrations, setApprovedRegistrations] = useState<number[]>([]);
  const [rejectedRegistrations, setRejectedRegistrations] = useState<number[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [evaluatedReviews, setEvaluatedReviews] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    position: '',
    department: '',
    branchCode: '',
    branch: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  const [suspendForm, setSuspendForm] = useState({
    reason: '',
    duration: '',
    suspendedBy: 'Admin'
  });

  // Function to filter out deleted employees
  const filterDeletedEmployees = (employeeList: Employee[]) => {
    const deletedEmployees = JSON.parse(localStorage.getItem('deletedEmployees') || '[]');
    return employeeList.filter(emp => !deletedEmployees.includes(emp.id));
  };


  // Function to load pending registrations
  const loadPendingRegistrations = async () => {
    try {
      const pendingRegistrations = await clientDataService.getPendingRegistrations();
      setPendingRegistrations(pendingRegistrations);
    } catch (error) {
      console.error('Error loading pending registrations:', error);
      setPendingRegistrations([]);
    }
  };

  // Function to load evaluated reviews from client data service
  const loadEvaluatedReviews = async () => {
    try {
      const submissions = await clientDataService.getSubmissions();

      // Transform submissions data to match the Review interface expected by the table
      const evaluationResults = submissions.map((submission: any) => ({
        id: submission.id,
        employeeName: submission.employeeName,
        evaluatorName: submission.evaluator,
        department: submission.evaluationData?.department || 'N/A',
        position: submission.evaluationData?.position || 'N/A',
        evaluationDate: submission.submittedAt,
        overallScore: Math.round((submission.rating / 5) * 100), // Convert 5-point scale to percentage
        status: submission.status || 'completed',
        lastUpdated: submission.submittedAt,
        totalCriteria: 7, // Default total criteria count
        completedCriteria: 7, // Assume all criteria are completed for submitted reviews
        // Keep original data for other uses
        employeeId: submission.evaluationData?.employeeId || submission.id,
        employeeEmail: submission.evaluationData?.employeeEmail || '',
        overallRating: submission.rating,
        period: submission.evaluationData?.period || new Date().toISOString().slice(0, 7),
        submittedAt: submission.submittedAt,
        evaluationData: submission.evaluationData
      }));

      // Sort by submission date (newest first)
      evaluationResults.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      setEvaluatedReviews(evaluationResults);
    } catch (error) {
      console.error('Error loading evaluated reviews:', error);
      setEvaluatedReviews([]);
    }
  };

  // Function to load accounts data directly (no merging needed since accounts.json is now the single source)
  const loadAccountsData = async () => {
    try {
      // Load from localStorage first (for any runtime updates)
      const localStorageAccounts = JSON.parse(localStorage.getItem('accounts') || '[]');

      // If localStorage has data, use it; otherwise use the imported data
      const accounts = localStorageAccounts.length > 0 ? localStorageAccounts : accountsData;

      // Filter out admin accounts and convert to Employee format
      const employees = accounts
        .filter((account: any) => account.role !== 'admin') // Exclude admin accounts from employee list
        .map((account: any) => ({
          id: account.employeeId || account.id,
          name: account.name,
          email: account.email,
          position: account.position,
          department: account.department,
          branch: account.branch,
          hireDate: account.hireDate,
          role: account.role,
          username: account.username,
          password: account.password,
          isActive: account.isActive,
          avatar: account.avatar,
          bio: account.bio,
          contact: account.contact,
          updatedAt: account.updatedAt,
          approvedDate: account.approvedDate
        }));

      return employees;
    } catch (error) {
      console.error('Error loading accounts data:', error);
      return [];
    }
  };

  // Function to open suspend modal
  const openSuspendModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsSuspendModalOpen(true);
  };

  // Function to open view details modal
  const openViewDetailsModal = (suspendedEmployee: SuspendedEmployee) => {
    setSelectedSuspendedEmployee(suspendedEmployee);
    setIsViewDetailsModalOpen(true);
  };

  // Function to open delete modal
  const openDeleteModal = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setUserToEdit(user);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (updatedUser: any) => {
    try {
      // Update user using client data service
      await clientDataService.updateEmployee(updatedUser.id, updatedUser);

      // Also update accounts storage to persist changes
      const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
      const accountIndex = accounts.findIndex((acc: any) => acc.id === updatedUser.id || acc.employeeId === updatedUser.id);
      
      if (accountIndex !== -1) {
        // Update the account with the new user data
        accounts[accountIndex] = {
          ...accounts[accountIndex],
          name: updatedUser.name,
          email: updatedUser.email,
          position: updatedUser.position,
          department: updatedUser.department,
          branch: updatedUser.branch,
          role: updatedUser.role,
          username: updatedUser.username || accounts[accountIndex].username,
          password: updatedUser.password || accounts[accountIndex].password,
          contact: updatedUser.contact || accounts[accountIndex].contact,
          hireDate: updatedUser.hireDate || accounts[accountIndex].hireDate,
          isActive: updatedUser.isActive !== undefined ? updatedUser.isActive : accounts[accountIndex].isActive,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('accounts', JSON.stringify(accounts));
      }

      // Refresh user data to get updated information
      await refreshDashboardData(false, false);

      // Show success toast
      toastMessages.user.updated(updatedUser.name);
    } catch (error) {
      console.error('Error updating user:', error);
      toastMessages.generic.error('Update Failed', 'Failed to update user information. Please try again.');
    }
  };

  // Function to handle delete employee
  const handleDeleteEmployee = () => {
    if (!employeeToDelete) return;

    // Store deleted employee ID in localStorage for persistence
    const deletedEmployees = JSON.parse(localStorage.getItem('deletedEmployees') || '[]');
    deletedEmployees.push(employeeToDelete.id);
    localStorage.setItem('deletedEmployees', JSON.stringify(deletedEmployees));

    // Remove employee from the list
    setEmployees(prev => prev.filter(emp => emp.id !== employeeToDelete.id));

    // Show success toast
    toastMessages.user.deleted(employeeToDelete.name);

    // Close modal
    setIsDeleteModalOpen(false);
    setEmployeeToDelete(null);
  };

  // Function to handle approve registration
  const handleApproveRegistration = async (registrationId: number, registrationName: string) => {
    try {
      const result = await clientDataService.approveRegistration(registrationId);

      if (result.success) {
        // Add to approved list
        const newApproved = [...approvedRegistrations, registrationId];
        setApprovedRegistrations(newApproved);

        // Store in localStorage for persistence
        localStorage.setItem('approvedRegistrations', JSON.stringify(newApproved));

        // Remove from rejected list if it was there
        const newRejected = rejectedRegistrations.filter(id => id !== registrationId);
        setRejectedRegistrations(newRejected);
        localStorage.setItem('rejectedRegistrations', JSON.stringify(newRejected));

        // Reload pending registrations to get updated data
        await loadPendingRegistrations();

        // Refresh active users data to show the newly approved user
        await refreshDashboardData(false, false);

        // Show success toast
        toastMessages.user.approved(registrationName);
      } else {
        toastMessages.generic.error('Approval Failed', result.message || 'Failed to approve registration. Please try again.');
      }
    } catch (error) {
      console.error('Error approving registration:', error);
      toastMessages.generic.error('Approval Error', 'An error occurred while approving the registration. Please try again.');
    }
  };

  // Function to handle reject registration
  const handleRejectRegistration = async (registrationId: number, registrationName: string) => {
    try {
      const result = await clientDataService.rejectRegistration(registrationId);

      if (result.success) {
        // Add to rejected list
        const newRejected = [...rejectedRegistrations, registrationId];
        setRejectedRegistrations(newRejected);

        // Store in localStorage for persistence
        localStorage.setItem('rejectedRegistrations', JSON.stringify(newRejected));

        // Remove from approved list if it was there
        const newApproved = approvedRegistrations.filter(id => id !== registrationId);
        setApprovedRegistrations(newApproved);
        localStorage.setItem('approvedRegistrations', JSON.stringify(newApproved));

        // Reload pending registrations to get updated data
        await loadPendingRegistrations();

        // Show success toast
        toastMessages.user.rejected(registrationName);
      } else {
        toastMessages.generic.error('Rejection Failed', result.message || 'Failed to reject registration. Please try again.');
      }
    } catch (error) {
      console.error('Error rejecting registration:', error);
      toastMessages.generic.error('Rejection Error', 'An error occurred while rejecting the registration. Please try again.');
    }
  };

  // Function to handle suspend employee
  const handleSuspendEmployee = () => {
    if (!selectedEmployee || !suspendForm.reason || !suspendForm.duration) {
      toastMessages.generic.error('Validation Error', 'Please fill in all required fields.');
      return;
    }

    // Create new suspended employee
    const newSuspendedEmployee: SuspendedEmployee = {
      id: selectedEmployee.id,
      name: selectedEmployee.name,
      email: selectedEmployee.email,
      position: selectedEmployee.position,
      department: selectedEmployee.department,
      branch: selectedEmployee.branch || '',
      suspensionDate: new Date().toISOString().split('T')[0],
      suspensionReason: suspendForm.reason,
      suspensionDuration: suspendForm.duration,
      suspendedBy: suspendForm.suspendedBy,
      status: 'suspended'
    };

    // Check if employee already exists in suspended list and update or add accordingly
    setSuspendedEmployees(prev => {
      const existingIndex = prev.findIndex(emp => emp.id === selectedEmployee.id);
      let updated;

      if (existingIndex !== -1) {
        // Employee already exists, update the existing record
        console.log(`Updating existing suspended employee: ${selectedEmployee.name} (ID: ${selectedEmployee.id})`);
        updated = [...prev];
        updated[existingIndex] = newSuspendedEmployee;
      } else {
        // Employee doesn't exist, add new record
        console.log(`Adding new suspended employee: ${selectedEmployee.name} (ID: ${selectedEmployee.id})`);
        updated = [...prev, newSuspendedEmployee];
      }

      // Save to localStorage for login system integration
      localStorage.setItem('suspendedEmployees', JSON.stringify(updated));
      return updated;
    });

    // Show success toast
    toastMessages.user.suspended(selectedEmployee.name);

    // Update system metrics to reflect the suspension
    updateSystemMetrics();

    // Close modal and reset form
    setIsSuspendModalOpen(false);
    setSuspendForm({ reason: '', duration: '', suspendedBy: 'Admin' });
    setSelectedEmployee(null);
  };

  // Function to reset suspend form
  const resetSuspendForm = () => {
    setSuspendForm({
      reason: '',
      duration: '',
      suspendedBy: 'Admin'
    });
    setSelectedEmployee(null);
  };

  // Function to reinstate employee
  const handleReinstateEmployee = (employeeId: number) => {
    // Find the employee to get their name
    const employee = suspendedEmployees.find(emp => emp.id === employeeId);

    setSuspendedEmployees(prev => {
      const updated = prev.map(emp =>
        emp.id === employeeId
          ? {
            ...emp,
            status: 'reinstated' as const,
            reinstatedDate: new Date().toISOString().split('T')[0],
            reinstatedBy: 'Admin'
          }
          : emp
      );
      // Update localStorage
      localStorage.setItem('suspendedEmployees', JSON.stringify(updated));
      return updated;
    });

    // Show success toast
    if (employee) {
      toastMessages.user.reinstated(employee.name);
    }

    // Update system metrics to reflect the reinstatement
    updateSystemMetrics();
  };

  // Function to open delete modal for reinstated employee
  const openDeleteReinstatedModal = (employee: SuspendedEmployee) => {
    setReinstatedEmployeeToDelete(employee);
    setIsDeleteModalOpen(true);
  };

  // Function to delete reinstated employee permanently
  const handleDeleteReinstatedEmployee = () => {
    if (!reinstatedEmployeeToDelete) return;

    // Remove from suspended employees list (this will also remove from reinstated)
    setSuspendedEmployees(prev => {
      const updated = prev.filter(emp => emp.id !== reinstatedEmployeeToDelete.id);
      // Update localStorage
      localStorage.setItem('suspendedEmployees', JSON.stringify(updated));
      return updated;
    });

    // Also remove from main employees list
    setEmployees(prev => prev.filter(emp => emp.id !== reinstatedEmployeeToDelete.id));

    // Store deleted employee ID in localStorage for persistence
    const deletedEmployees = JSON.parse(localStorage.getItem('deletedEmployees') || '[]');
    deletedEmployees.push(reinstatedEmployeeToDelete.id);
    localStorage.setItem('deletedEmployees', JSON.stringify(deletedEmployees));

    // Show success toast
    toastMessages.user.deleted(reinstatedEmployeeToDelete.name);

    // Update system metrics to reflect the deletion
    updateSystemMetrics();

    // Close modal
    setIsDeleteModalOpen(false);
    setReinstatedEmployeeToDelete(null);
  };

  // Memoized active employees (only recalculates when employees or suspendedEmployees change)
  const activeEmployees = useMemo(() => {
    const currentlySuspendedIds = suspendedEmployees
      .filter(emp => emp.status === 'suspended')
      .map(emp => emp.id);

    return employees.filter(emp => 
      !currentlySuspendedIds.includes(emp.id) && 
      (emp.isActive !== false)
    );
  }, [employees, suspendedEmployees]);

  // Function to filter out suspended employees from User Management (kept for backward compatibility)
  const getActiveEmployees = () => activeEmployees;

  // Function to check if an employee was previously suspended and reinstated
  const wasEmployeeReinstated = (employeeId: number) => {
    return suspendedEmployees.some(emp => emp.id === employeeId && emp.status === 'reinstated');
  };

  // Function to get reinstatement date for an employee
  const getEmployeeReinstatementDate = (employeeId: number) => {
    const reinstatedEmployee = suspendedEmployees.find(emp => emp.id === employeeId && emp.status === 'reinstated');
    return reinstatedEmployee?.reinstatedDate;
  };

  // Helper functions for departments and branches
  const getDepartmentStats = (deptName: string) => {
    const deptEmployees = employees.filter(emp => emp.department === deptName);
    return {
      count: deptEmployees.length,
      managers: deptEmployees.filter(emp => emp.role === 'Manager' || emp.role?.toLowerCase().includes('manager')).length,
      averageTenure: 2.5 // Mock data
    };
  };


  // Function to update system metrics with correct active user count
  const updateSystemMetrics = () => {
    const currentlySuspendedCount = suspendedEmployees.filter(emp => emp.status === 'suspended').length;

    setSystemMetrics(prev => prev ? {
      ...prev,
      totalUsers: employees.length, // Total users in system
      activeUsers: activeEmployees.length, // Active users (includes reinstated)
      suspendedUsers: currentlySuspendedCount // Currently suspended users
    } : null);

    // Update dashboard stats with correct active user counts
    setDashboardStats(prev => prev ? {
      ...prev,
      employeeDashboard: {
        ...prev.employeeDashboard,
        activeUsers: activeEmployees.filter((emp: any) => {
          const role = emp.role?.toLowerCase() || '';
          return role === 'employee' ||
            role.includes('representative') ||
            role.includes('designer') ||
            role.includes('developer') ||
            role.includes('analyst') ||
            role.includes('coordinator');
        }).length
      },
      hrDashboard: {
        ...prev.hrDashboard,
        activeUsers: activeEmployees.filter((emp: any) => {
          const role = emp.role?.toLowerCase() || '';
          return role === 'hr' ||
            role === 'hr-manager' ||
            role.includes('hr') ||
            role.includes('human resources');
        }).length
      },
      evaluatorDashboard: {
        ...prev.evaluatorDashboard,
        activeUsers: activeEmployees.filter((emp: any) => {
          const role = emp.role?.toLowerCase() || '';
          return role === 'evaluator' ||
            role.includes('manager') ||
            role.includes('supervisor') ||
            role.includes('director') ||
            role.includes('lead');
        }).length
      }
    } : null);
  };

  // Memoized active suspended employees (only recalculates when suspendedEmployees change)
  const activeSuspendedEmployees = useMemo(() => {
    return suspendedEmployees.filter(employee => employee.status === 'suspended');
  }, [suspendedEmployees]);

  // Function wrapper for backward compatibility
  const getActiveSuspendedEmployees = () => activeSuspendedEmployees;

  // Memoized reinstated employees (only recalculates when suspendedEmployees change)
  const reinstatedEmployees = useMemo(() => {
    return suspendedEmployees.filter(employee => employee.status === 'reinstated');
  }, [suspendedEmployees]);

  // Function wrapper for backward compatibility
  const getReinstatedEmployees = () => reinstatedEmployees;

  // Function to clean up duplicate suspended employees (keep only the latest record per employee)
  const cleanupDuplicateSuspendedEmployees = () => {
    setSuspendedEmployees(prev => {
      const uniqueEmployees = new Map();
      const originalCount = prev.length;

      // Process employees in reverse order to keep the latest record
      prev.reverse().forEach(emp => {
        if (!uniqueEmployees.has(emp.id)) {
          uniqueEmployees.set(emp.id, emp);
        }
      });

      const cleaned = Array.from(uniqueEmployees.values()).reverse();
      const removedCount = originalCount - cleaned.length;

      localStorage.setItem('suspendedEmployees', JSON.stringify(cleaned));

      // Show success toast
      if (removedCount > 0) {
        toastMessages.generic.success('Cleanup Complete', `Removed ${removedCount} duplicate record(s).`);
      } else {
        toastMessages.generic.info('No Duplicates Found', 'All records are already unique.');
      }

      return cleaned;
    });
  };

  // Memoized filtered suspended employees (only recalculates when activeSuspendedEmployees or suspendedSearchTerm change)
  const filteredSuspendedEmployees = useMemo(() => {
    if (!suspendedSearchTerm) return activeSuspendedEmployees;

    return activeSuspendedEmployees.filter(employee =>
      employee.name.toLowerCase().includes(suspendedSearchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(suspendedSearchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(suspendedSearchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(suspendedSearchTerm.toLowerCase()) ||
      (employee.branch || '').toLowerCase().includes(suspendedSearchTerm.toLowerCase()) ||
      employee.suspensionReason.toLowerCase().includes(suspendedSearchTerm.toLowerCase())
    );
  }, [activeSuspendedEmployees, suspendedSearchTerm]);

  // Function wrapper for backward compatibility
  const getFilteredSuspendedEmployees = () => filteredSuspendedEmployees;

  // Memoized filtered reinstated employees (only recalculates when reinstatedEmployees or reinstatedSearchTerm change)
  const filteredReinstatedEmployees = useMemo(() => {
    if (!reinstatedSearchTerm) return reinstatedEmployees;

    return reinstatedEmployees.filter(employee =>
      employee.name.toLowerCase().includes(reinstatedSearchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(reinstatedSearchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(reinstatedSearchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(reinstatedSearchTerm.toLowerCase()) ||
      (employee.branch || '').toLowerCase().includes(reinstatedSearchTerm.toLowerCase()) ||
      employee.suspensionReason.toLowerCase().includes(reinstatedSearchTerm.toLowerCase())
    );
  }, [reinstatedEmployees, reinstatedSearchTerm]);

  // Function wrapper for backward compatibility
  const getFilteredReinstatedEmployees = () => filteredReinstatedEmployees;



  useEffect(() => {
    const loadAdminData = async () => {
      try {
        // Load positions data
        const positions = await clientDataService.getPositions();
        setPositionsData(positions);
        
        // Load branches data
        const branches = await clientDataService.getBranches();
        setBranchesData(branches);
        
        // Load persisted registration data
        const savedApproved = JSON.parse(localStorage.getItem('approvedRegistrations') || '[]');
        const savedRejected = JSON.parse(localStorage.getItem('rejectedRegistrations') || '[]');
        setApprovedRegistrations(savedApproved);
        setRejectedRegistrations(savedRejected);

        // Load fresh data from accounts.json
        await refreshDashboardData(false, false);

        // Real system metrics based on actual data (will be updated after refreshUserData)
        const metrics: SystemMetrics = {
          totalUsers: 0, // Will be updated after data loads
          activeUsers: 0, // Will be updated after data loads
          totalEvaluations: 0, // Will be updated when real evaluations are available
          pendingEvaluations: 0, // Will be updated when real evaluations are available
          systemHealth: 'excellent',
          lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          uptime: '99.9%',
          storageUsed: 2.3,
          storageTotal: 10
        };

        // Real dashboard stats based on actual data (will be updated after data loads)
        const stats: DashboardStats = {
          employeeDashboard: {
            activeUsers: 0, // Will be updated after data loads
            totalViews: 0, // Will be updated when real analytics are available
            lastActivity: new Date().toISOString()
          },
          hrDashboard: {
            activeUsers: 0, // Will be updated after data loads
            totalViews: 0, // Will be updated when real analytics are available
            lastActivity: new Date().toISOString()
          },
          evaluatorDashboard: {
            activeUsers: 0, // Will be updated after data loads
            totalViews: 0, // Will be updated when real analytics are available
            lastActivity: new Date().toISOString()
          }
        };


        // Initialize empty reviews array - will be populated from real evaluation data
        const reviewsData: Review[] = [];

        setSystemMetrics(metrics);
        setDashboardStats(stats);
        setReviews(reviewsData);

        // Load suspended employees from localStorage
        const savedSuspendedEmployees = JSON.parse(localStorage.getItem('suspendedEmployees') || '[]');
        setSuspendedEmployees(savedSuspendedEmployees);

        // Load pending registrations
        await loadPendingRegistrations();

        // Load evaluated reviews
        await loadEvaluatedReviews();

        // Update system metrics with correct active user counts
        updateSystemMetrics();

        setLoading(false);
      } catch (error) {
        console.error('Error loading admin data:', error);
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);


  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };


  const getSuspensionStatusColor = (status: string) => {
    switch (status) {
      case 'suspended': return 'text-red-600 bg-red-100';
      case 'pending_review': return 'text-yellow-600 bg-yellow-100';
      case 'reinstated': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getReviewStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100';
      case 'pending': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };


  const handleAddUser = () => {
    // Validate passwords match
    if (newUser.password !== newUser.confirmPassword) {
      toastMessages.generic.error('Password Mismatch', 'Passwords do not match! Please try again.');
      return;
    }

    // Validate required fields
    if (!newUser.name || !newUser.email || !newUser.password) {
      toastMessages.generic.warning('Missing Information', 'Please fill in all required fields.');
      return;
    }

    // In a real app, you would make an API call here


    toastMessages.user.created(newUser.name);
    // Reset form and close modal
    setNewUser({
      name: '',
      email: '',
      position: '',
      department: '',
      branchCode: '',
      branch: '',
      role: '',
      password: '',
      confirmPassword: ''
    });
    setIsAddUserModalOpen(false);
  };

  const resetUserForm = () => {
    setNewUser({
      name: '',
      email: '',
      position: '',
      department: '',
      branchCode: '',
      branch: '',
      role: '',
      password: '',
      confirmPassword: ''
    });
  };

  const sidebarItems: SidebarItem[] = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'dashboards', label: 'Employee Monitoring', icon: '💻' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'evaluated-reviews', label: 'Evaluation Records', icon: '📋' },
    { id: 'departments', label: 'Departments', icon: '🏢' },
    { id: 'branches', label: 'Branches', icon: '📍' },
    { id: 'branch-heads', label: 'Branch Heads', icon: '👔' },
    { id: 'area-managers', label: 'Area Managers', icon: '🎯' },
  ], []);

  if (loading || !systemMetrics || !dashboardStats) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-800">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const topSummary = (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{systemMetrics.totalUsers}</div>
          <p className="text-sm text-gray-500 mt-1">{systemMetrics.activeUsers} active</p>
          <p className="text-xs text-orange-500 mt-1">{pendingRegistrations.length} pending</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Evaluations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{systemMetrics.totalEvaluations}</div>
          <p className="text-sm text-gray-500 mt-1">{systemMetrics.pendingEvaluations} pending</p>
        </CardContent>
      </Card>

    </>
  );

  return (
    <DashboardShell
      title="Admin Dashboard"
      currentPeriod={new Date().toLocaleDateString()}
      sidebarItems={sidebarItems}
      activeItemId={active}
      onChangeActive={setActive}
      topSummary={topSummary}
      profile={{ name: 'System Administrator', roleOrPosition: 'Admin' }}
    >
      {active === 'overview' && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }>
          <OverviewTab key={active} />
        </Suspense>
      )}

      {active === 'dashboards' && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }>
          <EmployeeManagementTab
            suspendedEmployees={suspendedEmployees}
            onReinstate={(employee) => handleReinstateEmployee(employee.id)}
            onDeleteSuspended={(employee) => openDeleteModal(employee as any)}
            onDeleteReinstated={openDeleteReinstatedModal}
          />
        </Suspense>
      )}

      {active === 'users' && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }>
          <UserManagementTab
            key={active}
            branchesData={branchesData}
            positionsData={positionsData}
            suspendedEmployees={suspendedEmployees}
            onSuspendedEmployeesChange={setSuspendedEmployees}
            refreshDashboardData={refreshDashboardData}
          />
        </Suspense>
      )}

      {active === 'evaluated-reviews' && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }>
          <EvaluatedReviewsTab key={active} />
        </Suspense>
      )}

      {active === 'departments' && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }>
          <DepartmentsTab />
        </Suspense>
      )}

      {active === 'branches' && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }>
          <BranchesTab employees={employees} />
        </Suspense>
      )}

      {active === 'branch-heads' && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }>
          <BranchHeadsTab employees={employees} onRefresh={refreshDashboardData} />
        </Suspense>
      )}

      {active === 'area-managers' && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }>
          <AreaManagersTab employees={employees} onRefresh={refreshDashboardData} />
        </Suspense>
      )}

      

      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChangeAction={setIsAddUserModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account with appropriate permissions</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-2">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Job Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Job Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-sm font-medium">Position</Label>
                  <Select value={newUser.position} onValueChange={(value) => setNewUser({ ...newUser, position: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positionsData.map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="hr">HR Manager</SelectItem>
                      <SelectItem value="evaluator">Evaluator</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Organization Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Organization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                  <Select value={newUser.department} onValueChange={(value) => setNewUser({ ...newUser, department: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentsData.map(dept => (
                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchCode" className="text-sm font-medium">Branch Code</Label>
                  <Select value={newUser.branchCode} onValueChange={(value) => setNewUser({ ...newUser, branchCode: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch code" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchCodesData.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch" className="text-sm font-medium">Branch</Label>
                  <Select value={newUser.branch} onValueChange={(value) => setNewUser({ ...newUser, branch: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchesData.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Security Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
              {newUser.password && newUser.confirmPassword && newUser.password !== newUser.confirmPassword && (
                <p className="text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Permissions</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="dashboard-access"
                    defaultChecked
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="dashboard-access" className="text-sm">Dashboard Access</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="user-management"
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="user-management" className="text-sm">User Management</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="evaluation-access"
                    defaultChecked
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="evaluation-access" className="text-sm">Evaluation Access</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="reports-access"
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="reports-access" className="text-sm">Reports Access</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 px-2">
            <div className="flex justify-end space-x-4 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  resetUserForm();
                  setIsAddUserModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                className="bg-green-500 text-white hover:bg-green-600 hover:text-white"
              >
                Add User
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Employee Modal */}
      <Dialog open={isSuspendModalOpen} onOpenChangeAction={setIsSuspendModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="pb-4 bg-yellow-200/70 rounded-lg">
            <DialogTitle className='text-black'>Suspend Employee</DialogTitle>
            <DialogDescription className='text-black'>
              Suspend {selectedEmployee?.name} from the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-2">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium mt-5">
                Suspension Reason <span className="text-red-500">*</span>
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {suspendForm.reason || "Select suspension reason"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem
                    onClick={() => setSuspendForm({ ...suspendForm, reason: "Policy violation - unauthorized access" })}
                    className={suspendForm.reason === "Policy violation - unauthorized access" ? "bg-accent" : ""}
                  >
                    Policy violation - unauthorized access
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSuspendForm({ ...suspendForm, reason: "Performance issues - missed deadlines" })}
                    className={suspendForm.reason === "Performance issues - missed deadlines" ? "bg-accent" : ""}
                  >
                    Performance issues - missed deadlines
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSuspendForm({ ...suspendForm, reason: "Security breach - shared credentials" })}
                    className={suspendForm.reason === "Security breach - shared credentials" ? "bg-accent" : ""}
                  >
                    Security breach - shared credentials
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSuspendForm({ ...suspendForm, reason: "Inappropriate behavior" })}
                    className={suspendForm.reason === "Inappropriate behavior" ? "bg-accent" : ""}
                  >
                    Inappropriate behavior
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSuspendForm({ ...suspendForm, reason: "Attendance violations" })}
                    className={suspendForm.reason === "Attendance violations" ? "bg-accent" : ""}
                  >
                    Attendance violations
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSuspendForm({ ...suspendForm, reason: "Data misuse" })}
                    className={suspendForm.reason === "Data misuse" ? "bg-accent" : ""}
                  >
                    Data misuse
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSuspendForm({ ...suspendForm, reason: "Confidentiality breach" })}
                    className={suspendForm.reason === "Confidentiality breach" ? "bg-accent" : ""}
                  >
                    Confidentiality breach
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSuspendForm({ ...suspendForm, reason: "Workplace harassment" })}
                    className={suspendForm.reason === "Workplace harassment" ? "bg-accent" : ""}
                  >
                    Workplace harassment
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSuspendForm({ ...suspendForm, reason: "Substance abuse" })}
                    className={suspendForm.reason === "Substance abuse" ? "bg-accent" : ""}
                  >
                    Substance abuse
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSuspendForm({ ...suspendForm, reason: "Other - please specify" })}
                    className={suspendForm.reason === "Other - please specify" ? "bg-accent" : ""}
                  >
                    Other - please specify
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-medium">
                Suspension Duration <span className="text-red-500">*</span>
              </Label>
              <Select
                value={suspendForm.duration}
                onValueChange={(value) => setSuspendForm({ ...suspendForm, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 day">1 Day</SelectItem>
                  <SelectItem value="3 days">3 Days</SelectItem>
                  <SelectItem value="7 days">7 Days</SelectItem>
                  <SelectItem value="14 days">14 Days</SelectItem>
                  <SelectItem value="30 days">30 Days</SelectItem>
                  <SelectItem value="60 days">60 Days</SelectItem>
                  <SelectItem value="90 days">90 Days</SelectItem>
                  <SelectItem value="Indefinite">Indefinite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suspendedBy" className="text-sm font-medium">
                Suspended By
              </Label>
              <Select
                value={suspendForm.suspendedBy}
                onValueChange={(value) => setSuspendForm({ ...suspendForm, suspendedBy: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select who suspended" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="HR Manager">HR Manager</SelectItem>
                  <SelectItem value="Department Manager">Department Manager</SelectItem>
                  <SelectItem value="IT Manager">IT Manager</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="System">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-6 px-2">
            <div className="flex justify-end space-x-4 w-full">
              <Button className='bg-blue-400/90 text-white'
                variant="outline"
                onClick={() => {
                  resetSuspendForm();
                  setIsSuspendModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className='bg-red-400/100 text-white'
                onClick={handleSuspendEmployee}
              >
                ❌ Suspend Employee
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={isViewDetailsModalOpen} onOpenChangeAction={setIsViewDetailsModalOpen}>
        <DialogContent className="max-w-lg p-4">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              Suspension Details
            </DialogTitle>
            <DialogDescription>
              {selectedSuspendedEmployee?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-2">
            {/* Key Information */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-600">Date:</span>
                <div>{selectedSuspendedEmployee?.suspensionDate ? new Date(selectedSuspendedEmployee.suspensionDate).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Duration:</span>
                <div>{selectedSuspendedEmployee?.suspensionDuration}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Suspended By:</span>
                <div>{selectedSuspendedEmployee?.suspendedBy}</div>
              </div>
              {selectedSuspendedEmployee?.status === 'reinstated' && (
                <>
                  <div>
                    <span className="font-medium text-gray-600">Reinstated Date:</span>
                    <div>{selectedSuspendedEmployee?.reinstatedDate ? new Date(selectedSuspendedEmployee.reinstatedDate).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Reinstated By:</span>
                    <div>{selectedSuspendedEmployee?.reinstatedBy || 'N/A'}</div>
                  </div>
                </>
              )}
              <div>
                <span className="font-medium text-gray-600">Status:</span>
                <Badge className={getSuspensionStatusColor(selectedSuspendedEmployee?.status || '')}>
                  {selectedSuspendedEmployee?.status?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Violation Reason */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">Reason for Suspension</Label>
              <div className="p-3 bg-gray-50 rounded-lg border text-sm">
                {selectedSuspendedEmployee?.suspensionReason}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 px-2">
            <div className="flex justify-end space-x-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsViewDetailsModalOpen(false)}
              >
                Close
              </Button>
              {selectedSuspendedEmployee?.status === 'suspended' && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    handleReinstateEmployee(selectedSuspendedEmployee.id);
                    setIsViewDetailsModalOpen(false);
                  }}
                >
                  Reinstate
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChangeAction={(open) => {
        setIsDeleteModalOpen(open);
        if (!open) {
          setEmployeeToDelete(null);
          setReinstatedEmployeeToDelete(null);
        }
      }}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="pb-4 bg-red-50 rounded-lg">
            <DialogTitle className='text-red-800 flex items-center gap-2'>
              <span className="text-xl">⚠️</span>
              Delete Employee
            </DialogTitle>
            <DialogDescription className='text-red-700'>
              This action cannot be undone. Are you sure you want to permanently delete {employeeToDelete?.name || reinstatedEmployeeToDelete?.name}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-2 mt-8">
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
                    <li>Employee profile and data</li>
                    <li>All evaluation records</li>
                    <li>Access permissions</li>
                    <li>Associated files and documents</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-700">
                <p className="font-medium">Employee Details:</p>
                <div className="mt-2 space-y-1">
                  <p><span className="font-medium">Name:</span> {employeeToDelete?.name}</p>
                  <p><span className="font-medium">Email:</span> {employeeToDelete?.email}</p>
                  <p><span className="font-medium">Position:</span> {employeeToDelete?.position}</p>
                  <p><span className="font-medium">Department:</span> {employeeToDelete?.department}</p>
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
                  setEmployeeToDelete(null);
                  setReinstatedEmployeeToDelete(null);
                }}
                className="text-white bg-blue-600 hover:text-white hover:bg-green-500"
              >
                Cancel
              </Button>
              <Button
                className='bg-red-600 hover:bg-red-700 text-white'
                onClick={() => {
                  if (reinstatedEmployeeToDelete) {
                    handleDeleteReinstatedEmployee();
                  } else {
                    handleDeleteEmployee();
                  }
                }}
              >
                🗑️ Delete Permanently
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={userToEdit}
        onSave={handleSaveUser}
        departments={departmentsData.map((dept: any) => dept.name)}
        branches={branchesData}
        positions={positionsData}
      />

    </DashboardShell>
  );
}

// Wrap with HOC for authentication
export default withAuth(AdminDashboard, { requiredRole: 'admin' });
