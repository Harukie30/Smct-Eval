"use client";

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { ChevronDown, Plus, RefreshCcw } from "lucide-react";

import EditUserModal from '@/components/EditUserModal';
import { toastMessages } from '@/lib/toastMessages';
import clientDataService from '@/lib/clientDataService';
import { apiService } from '@/lib/apiService';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

// Import new tab components
import { OverviewTab } from './components/OverviewTab';
import { UserManagementTab } from './components/UserManagementTab';
import { EmployeeManagementTab } from './components/EmployeeManagementTab';
import { EvaluatedReviewsTab } from './components/EvaluatedReviewsTab';

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

interface Branch {
  id: string;
  name: string;
}

// Function to get quarter from date
const getQuarterFromDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';

    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();

    if (month >= 1 && month <= 3) return `Q1 ${year}`;
    if (month >= 4 && month <= 6) return `Q2 ${year}`;
    if (month >= 7 && month <= 9) return `Q3 ${year}`;
    if (month >= 10 && month <= 12) return `Q4 ${year}`;

    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

const getQuarterColor = (quarter: string) => {
  if (quarter.includes('Q1')) return 'bg-blue-100 text-blue-800';
  if (quarter.includes('Q2')) return 'bg-green-100 text-green-800';
  if (quarter.includes('Q3')) return 'bg-yellow-100 text-yellow-800';
  if (quarter.includes('Q4')) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
};

function AdminDashboard() {
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positionsData, setPositionsData] = useState<{id: string, name: string}[]>([]);
  const [branchesData, setBranchesData] = useState<{id: string, name: string}[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [suspendedEmployees, setSuspendedEmployees] = useState<SuspendedEmployee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departmentsRefreshing, setDepartmentsRefreshing] = useState(false);
  const [branchesRefreshing, setBranchesRefreshing] = useState(false);
  const [branchHeadsRefreshing, setBranchHeadsRefreshing] = useState(false);
  const [areaManagersRefreshing, setAreaManagersRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Initialize active tab from URL parameter or default to 'overview'
  const tabParam = searchParams.get('tab');
  const [active, setActive] = useState(tabParam || 'overview');

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
      setActive(tab);
    }
  }, [searchParams]);

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

  // Load departments and branches when their tabs are active
  useEffect(() => {
    const loadDepartmentsAndBranches = async () => {
      if (active === 'departments') {
        setDepartmentsRefreshing(true);
        try {
          // Load departments from departmentsData
          setDepartments(departmentsData);
        } catch (error) {
          console.error('Error loading departments:', error);
        } finally {
          setDepartmentsRefreshing(false);
        }
      } else if (active === 'branches') {
        setBranchesRefreshing(true);
        try {
          // Load branches from API
          const branchesData = await clientDataService.getBranches();
          setBranches(branchesData);
        } catch (error) {
          console.error('Error loading branches:', error);
        } finally {
          setBranchesRefreshing(false);
        }
      } else if (active === 'branch-heads') {
        setBranchHeadsRefreshing(true);
        try {
          // Data is already loaded in employees, just trigger a refresh
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('Error loading branch heads:', error);
        } finally {
          setBranchHeadsRefreshing(false);
        }
      } else if (active === 'area-managers') {
        setAreaManagersRefreshing(true);
        try {
          // Data is already loaded in employees, just trigger a refresh
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('Error loading area managers:', error);
        } finally {
          setAreaManagersRefreshing(false);
        }
      }
    };

    loadDepartmentsAndBranches();
  }, [active]);

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
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userManagementTab, setUserManagementTab] = useState<'active' | 'new'>('active');
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

  // Function to filter out suspended employees from User Management
  // Only shows employees who are NOT currently suspended (includes reinstated employees)
  const getActiveEmployees = () => {
    const currentlySuspendedIds = suspendedEmployees
      .filter(emp => emp.status === 'suspended') // Only currently suspended
      .map(emp => emp.id);

    return employees.filter(emp => 
      !currentlySuspendedIds.includes(emp.id) && 
      (emp.isActive !== false) // Include employees where isActive is true or undefined
    );
  };

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

  const getBranchStats = (branchName: string) => {
    const branchEmployees = employees.filter(emp => emp.branch === branchName);
    return {
      count: branchEmployees.length,
      managers: branchEmployees.filter(emp => emp.role === 'Manager' || emp.role?.toLowerCase().includes('manager')).length
    };
  };

  // Helper functions to filter branch heads and area managers from accounts.json data
  const getBranchHeads = () => {
    return employees.filter(emp => {
      const position = emp.position?.toLowerCase() || '';
      const role = emp.role?.toLowerCase() || '';
      const name = emp.name?.toLowerCase() || '';
      
      // Filter by position, role, or if role is manager and has branch assigned
      return position.includes('branch head') || 
             position.includes('branchhead') ||
             position.includes('branch manager') ||
             role.includes('branch head') ||
             role.includes('branchhead') ||
             (role === 'manager' && emp.branch && !position.includes('area'));
    });
  };

  const getAreaManagers = () => {
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
  };

  // Function to update system metrics with correct active user count
  const updateSystemMetrics = () => {
    const activeEmployees = getActiveEmployees();
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

  // Function to get only active suspended employees (hide reinstated ones)
  const getActiveSuspendedEmployees = () => {
    return suspendedEmployees.filter(employee => employee.status === 'suspended');
  };

  // Function to get reinstated employees
  const getReinstatedEmployees = () => {
    return suspendedEmployees.filter(employee => employee.status === 'reinstated');
  };

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

  // Search filter functions
  const getFilteredSuspendedEmployees = () => {
    const activeSuspended = getActiveSuspendedEmployees();
    if (!suspendedSearchTerm) return activeSuspended;

    return activeSuspended.filter(employee =>
      employee.name.toLowerCase().includes(suspendedSearchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(suspendedSearchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(suspendedSearchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(suspendedSearchTerm.toLowerCase()) ||
      (employee.branch || '').toLowerCase().includes(suspendedSearchTerm.toLowerCase()) ||
      employee.suspensionReason.toLowerCase().includes(suspendedSearchTerm.toLowerCase())
    );
  };

  const getFilteredReinstatedEmployees = () => {
    const reinstated = getReinstatedEmployees();
    if (!reinstatedSearchTerm) return reinstated;

    return reinstated.filter(employee =>
      employee.name.toLowerCase().includes(reinstatedSearchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(reinstatedSearchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(reinstatedSearchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(reinstatedSearchTerm.toLowerCase()) ||
      (employee.branch || '').toLowerCase().includes(reinstatedSearchTerm.toLowerCase()) ||
      employee.suspensionReason.toLowerCase().includes(reinstatedSearchTerm.toLowerCase())
    );
  };

  const getFilteredActiveEmployees = () => {
    const activeEmployees = getActiveEmployees();
    if (!userSearchTerm) return activeEmployees;

    return activeEmployees.filter(employee =>
      employee.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (employee.branch || '').toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  };

  // Function to get newly registered accounts from pending registrations
  const getNewlyRegisteredAccounts = () => {
    return pendingRegistrations
      .filter(registration => {
        // Only hide registrations that are actually approved in the file (status === 'approved')
        // Don't hide based on localStorage approvedRegistrations array
        return registration.status !== 'approved';
      })
      .map(registration => {
        let status: 'pending_verification' | 'approved' | 'rejected' = 'pending_verification';

        // Check localStorage for status overrides (only if the registration is still in pending)
        if (rejectedRegistrations.includes(registration.id)) {
          status = 'rejected';
        } else if (registration.status === 'rejected') {
          status = 'rejected';
        }
        // Note: We don't set status to 'approved' here because approved registrations
        // should be removed from pending-registrations.json entirely

        return {
          id: registration.id,
          name: `${registration.firstName} ${registration.lastName}`,
          email: registration.email,
          position: registration.position,
          department: registration.department,
          branch: registration.branch,
          registrationDate: new Date(registration.submittedAt),
          status
        };
      });
  };

  const getFilteredNewAccounts = () => {
    const newAccounts = getNewlyRegisteredAccounts();
    if (!userSearchTerm) return newAccounts;

    return newAccounts.filter(account =>
      account.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      account.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      account.position.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      account.department.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (account.branch || '').toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  };

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

  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'dashboards', label: 'Employee Monitoring', icon: '💻' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'departments', label: 'Departments', icon: '🏢' },
    { id: 'branches', label: 'Branches', icon: '📍' },
    { id: 'branch-heads', label: 'Branch Heads', icon: '👔' },
    { id: 'area-managers', label: 'Area Managers', icon: '🎯' },
  ];

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-bold text-gray-900">{systemMetrics.uptime}</span>
          </div>
          <Badge className={`mt-2 ${getSystemHealthColor(systemMetrics.systemHealth)}`}>
            {systemMetrics.systemHealth}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Storage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{systemMetrics.storageUsed}TB</div>
          <p className="text-sm text-gray-500 mt-1">of {systemMetrics.storageTotal}TB used</p>
          <Progress value={(systemMetrics.storageUsed / systemMetrics.storageTotal) * 100} className="mt-2" />
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
        <OverviewTab
          systemMetrics={systemMetrics}
          dashboardStats={dashboardStats}
          loading={loading}
          evaluatedReviews={evaluatedReviews}
          departments={departmentsData}
        />
      )}

      {active === 'dashboards' && (
        <EmployeeManagementTab
          suspendedEmployees={suspendedEmployees}
          onReinstate={(employee) => handleReinstateEmployee(employee.id)}
          onDeleteSuspended={(employee) => openDeleteModal(employee as any)}
          onDeleteReinstated={openDeleteReinstatedModal}
        />
      )}

      {active === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage system users and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6">
              <Button
                variant={userManagementTab === 'active' ? 'default' : 'outline'}
                onClick={() => setUserManagementTab('active')}
                className="flex items-center gap-2"
              >
                <span>👥</span>
                Active Users ({getFilteredActiveEmployees().length})
              </Button>
              <Button
                variant={userManagementTab === 'new' ? 'default' : 'outline'}
                onClick={() => setUserManagementTab('new')}
                className="flex items-center gap-2"
              >
                <span>🆕</span>
                New Registrations ({getFilteredNewAccounts().length})
              </Button>
            </div>

            {/* Active Users Tab */}
            {userManagementTab === 'active' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <Input
                      placeholder="Search users..."
                      className="w-64"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                    <Select>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="evaluator">Evaluator</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => refreshDashboardData(true, false)}
                      disabled={isRefreshing}
                      className="flex items-center bg-blue-500 text-white hover:bg-blue-700 hover:text-white gap-2"
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
                          <span className="text-white"><svg
                              className="h-5 w-5 font-bold"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg></span>
                          Refresh
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setIsAddUserModalOpen(true)}
                      className="flex items-center bg-blue-600 text-white hover:bg-green-700 hover:text-white gap-2"
                    >
                      <Plus className="h-5 w-5 font-blod " />
                      Add User
                    </Button>
                  </div>
                </div>

                <div className="max-h-[450px] overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredActiveEmployees().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            No active users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        getFilteredActiveEmployees().slice(0, 10).map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.email}</TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell>{employee.department}</TableCell>
                          <TableCell>{employee.branch || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{employee.role}</Badge>
                          </TableCell>
                          <TableCell>
                            {wasEmployeeReinstated(employee.id) ? (
                              <Badge
                                className="text-blue-600 bg-blue-100"
                                title={`Reinstated on ${getEmployeeReinstatementDate(employee.id) ? new Date(getEmployeeReinstatementDate(employee.id)!).toLocaleDateString() : 'Unknown date'}`}
                              >
                                Reinstated
                              </Badge>
                            ) : (
                              <Badge className="text-green-600 bg-green-100">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => openEditModal(employee)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-600 hover:text-orange-700"
                                onClick={() => openSuspendModal(employee)}
                              >
                                Suspend
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => openDeleteModal(employee)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Registrations Tab Content */}
      {active === 'users' && userManagementTab === 'new' && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>New Registrations</CardTitle>
            <CardDescription>Review and approve new user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  <Input
                    placeholder="Search new registrations..."
                    className="w-64"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending_verification">Pending Verification</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => refreshDashboardData(true, false)}
                    disabled={isRefreshing}
                    className="flex items-center gap-2"
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
                        <span className="text-white"><svg
                            className="h-5 w-5 font-bold"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg></span>
                        Refresh
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="max-h-[450px] overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Registration Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredNewAccounts().map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell>{account.email}</TableCell>
                        <TableCell>{account.position}</TableCell>
                        <TableCell>{account.department}</TableCell>
                        <TableCell>{account.registrationDate.toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={
                            account.status === 'rejected'
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }>
                            {account.status === 'rejected'
                              ? 'REJECTED'
                              : 'PENDING VERIFICATION'
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {account.status === 'pending_verification' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-white bg-green-500 hover:text-white hover:bg-green-600"
                                  onClick={() => handleApproveRegistration(account.id, account.name)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-white bg-red-500 hover:bg-red-600 hover:text-white"
                                  onClick={() => handleRejectRegistration(account.id, account.name)}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {account.status === 'rejected' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleApproveRegistration(account.id, account.name)}
                              >
                                Approve
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">View Details</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {getFilteredNewAccounts().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {userSearchTerm ? 'No new registrations match your search.' : 'No new registrations found.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {active === 'departments' && (
        <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
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
              {departments.map((dept) => {
                const stats = getDepartmentStats(dept.name);
                return (
                  <Card key={dept.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        {dept.name}
                        <Badge variant="outline">{stats.count} employees</Badge>
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
              })}
            </div>
          )}
        </div>
      )}

      {active === 'branches' && (
        <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
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
              {branches.map((branch) => {
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
              })}
            </div>
          )}
        </div>
      )}

      {active === 'branch-heads' && (
        <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
          {branchHeadsRefreshing ? (
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
                  <p className="text-sm text-gray-600 font-medium">Loading branch heads...</p>
                </div>
              </div>
              
              {/* Table skeleton visible in background */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Branch Heads</CardTitle>
                <CardDescription>List of all branch heads in the organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getBranchHeads().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No branch heads found
                          </TableCell>
                        </TableRow>
                      ) : (
                        getBranchHeads().map((head) => (
                          <TableRow key={head.id}>
                            <TableCell className="font-medium">{head.name}</TableCell>
                            <TableCell>{head.email}</TableCell>
                            <TableCell>{head.position}</TableCell>
                            <TableCell>{head.department}</TableCell>
                            <TableCell>{head.branch || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge className={head.isActive === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                                {head.isActive === false ? 'Inactive' : 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm">View</Button>
                                <Button variant="ghost" size="sm">Edit</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {active === 'area-managers' && (
        <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
          {areaManagersRefreshing ? (
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
                  <p className="text-sm text-gray-600 font-medium">Loading area managers...</p>
                </div>
              </div>
              
              {/* Table skeleton visible in background */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Area Managers</CardTitle>
                <CardDescription>List of all area managers in the organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getAreaManagers().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No area managers found
                          </TableCell>
                        </TableRow>
                      ) : (
                        getAreaManagers().map((manager) => (
                          <TableRow key={manager.id}>
                            <TableCell className="font-medium">{manager.name}</TableCell>
                            <TableCell>{manager.email}</TableCell>
                            <TableCell>{manager.position}</TableCell>
                            <TableCell>{manager.department}</TableCell>
                            <TableCell>{manager.branch || 'N/A'}</TableCell>
                            <TableCell>{manager.contact || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge className={manager.isActive === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                                {manager.isActive === false ? 'Inactive' : 'Active'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
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
