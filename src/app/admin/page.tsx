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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, RefreshCcw } from "lucide-react";

import EditUserModal from '@/components/EditUserModal';
import { toastMessages } from '@/lib/toastMessages';
import clientDataService from '@/lib/clientDataService';
import clientDataServiceApi from '@/lib/clientDataService.api';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

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
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Initialize active tab from URL parameter or default to 'overview'
  const tabParam = searchParams.get('tab');
  const [active, setActive] = useState(tabParam || 'overview');
  const [values, setValues] = useState<any>({});

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
      // await loadPendingRegistrations();
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
  const [approvedRegistrations, setApprovedRegistrations] = useState<any[]>([]);
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
    useEffect(() => {
      const load_users = async () => {
        try {
          const pendingRegistrations = await clientDataServiceApi.getPendingRegistrations();
          setPendingRegistrations(pendingRegistrations);

          const activeRegistrations = await clientDataServiceApi.getActiveRegistrations();
          setApprovedRegistrations(activeRegistrations);
        } catch (error) {
          console.error('Error loading pending registrations:', error);
        }
      };
      load_users();
    }, []);
    console.log('📥 Loaded active registrations:', approvedRegistrations);
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
        // const newApproved = [...approvedRegistrations, registrationId];
        // setApprovedRegistrations(newApproved);

        // Store in localStorage for persistence
        // localStorage.setItem('approvedRegistrations', JSON.stringify(newApproved));

        // Remove from rejected list if it was there
        const newRejected = rejectedRegistrations.filter(id => id !== registrationId);
        setRejectedRegistrations(newRejected);
        localStorage.setItem('rejectedRegistrations', JSON.stringify(newRejected));

        // Reload pending registrations to get updated data
        // await loadPendingRegistrations();

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
        // const newApproved = approvedRegistrations.filter(id => id !== registrationId);
        // setApprovedRegistrations(newApproved);
        // localStorage.setItem('approvedRegistrations', JSON.stringify(newApproved));

        // Reload pending registrations to get updated data
        // await loadPendingRegistrations();

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

  // // Function to get newly registered accounts from pending registrations
  // const getNewlyRegisteredAccounts = () => {
  //   return pendingRegistrations
  //     .filter(registration => {
  //       // Only hide registrations that are actually approved in the file (status === 'approved')
  //       // Don't hide based on localStorage approvedRegistrations array
  //       return registration.status !== 'approved';
  //     })
  //     .map(registration => {
  //       let status: 'pending_verification' | 'approved' | 'rejected' = 'pending_verification';

  //       // Check localStorage for status overrides (only if the registration is still in pending)
  //       if (rejectedRegistrations.includes(registration.id)) {
  //         status = 'rejected';
  //       } else if (registration.status === 'rejected') {
  //         status = 'rejected';
  //       }
  //       // Note: We don't set status to 'approved' here because approved registrations
  //       // should be removed from pending-registrations.json entirely

  //       return {
  //         id: registration.id,
  //         name: `${registration.firstName} ${registration.lastName}`,
  //         email: registration.email,
  //         position: registration.position,
  //         department: registration.department,
  //         branch: registration.branch,
  //         registrationDate: new Date(registration.submittedAt),
  //         status
  //       };
  //     });
  // };

  // const getFilteredNewAccounts = () => {
  //   const newAccounts = getNewlyRegisteredAccounts();
  //   if (!userSearchTerm) return newAccounts;

  //   return newAccounts.filter(account =>
  //     account.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
  //     account.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
  //     account.position.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
  //     account.department.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
  //     (account.branch || '').toLowerCase().includes(userSearchTerm.toLowerCase())
  //   );
  // };

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
        // setApprovedRegistrations(savedApproved);
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
        // await loadPendingRegistrations();

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
    { id: 'evaluated-reviews', label: 'Evaluated Reviews', icon: '📋' },
    
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
    >
      {active === 'overview' && (
        <div className="space-y-6">
          {/* Dashboard Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Performance Overview</CardTitle>
              <CardDescription>Real-time statistics for all system dashboards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h3 className="font-semibold">Employee Dashboard</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-600">Active Users</span>
                      <span className="font-semibold">{dashboardStats.employeeDashboard.activeUsers}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-600">Total Views</span>
                      <span className="font-semibold">{dashboardStats.employeeDashboard.totalViews}</span>
                    </div>
                   
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h3 className="font-semibold">HR Dashboard</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-600">Active Users</span>
                      <span className="font-semibold">{dashboardStats.hrDashboard.activeUsers}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-600">Total Views</span>
                      <span className="font-semibold">{dashboardStats.hrDashboard.totalViews}</span>
                    </div>
                    
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <h3 className="font-semibold">Evaluator Dashboard</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-600">Active Users</span>
                      <span className="font-semibold">{dashboardStats.evaluatorDashboard.activeUsers}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-600">Total Views</span>
                      <span className="font-semibold">{dashboardStats.evaluatorDashboard.totalViews}</span>
                    </div>

                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submitted Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>Submitted Reviews</CardTitle>
              <CardDescription>Monitor and manage all submitted performance evaluations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <Input placeholder="Search reviews..." className="w-64" />
                    <Select value={values} onValueChange={setValues}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={values} onValueChange={setValues}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departmentsData.map(dept => (
                          <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    className="bg-purple-500 text-white hover:bg-purple-600 hover:text-white"
                  >
                    Export Reviews
                  </Button>
                </div>

                <div className="relative max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Evaluator</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Evaluation Date</TableHead>
                        <TableHead>Overall Score</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Quarter</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluatedReviews.map((review) => (
                        <TableRow key={review.id}>
                          <TableCell className="font-medium">{review.employeeName}</TableCell>
                          <TableCell>{review.evaluatorName}</TableCell>
                          <TableCell>{review.department}</TableCell>
                          <TableCell>{review.position}</TableCell>
                          <TableCell>{new Date(review.evaluationDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span className={`font-semibold ${getScoreColor(review.overallScore)}`}>
                              {review.overallScore > 0 ? `${review.overallScore}%` : 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress
                                value={(review.completedCriteria / review.totalCriteria) * 100}
                                className="w-16"
                              />
                              <span className="text-sm text-gray-600">
                                {review.completedCriteria}/{review.totalCriteria}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getQuarterColor(getQuarterFromDate(review.evaluationDate))}>
                              {getQuarterFromDate(review.evaluationDate)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(review.lastUpdated).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">View</Button>
                              <Button variant="ghost" size="sm">Edit</Button>
                              <Button variant="ghost" size="sm">Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {reviews.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-4">📊</div>
                    <p className="text-lg font-medium">No submitted reviews found</p>
                    <p className="text-sm">Performance evaluations will appear here once they are submitted by evaluators.</p>
                  </div>
                )}

                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {reviews.filter(r => r.status === 'completed').length}
                    </div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {reviews.filter(r => r.status === 'in_progress').length}
                    </div>
                    <div className="text-sm text-gray-600">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {reviews.filter(r => r.status === 'pending').length}
                    </div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {reviews.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Reviews</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {active === 'dashboards' && (
        <Card>
          <CardHeader>
            <CardTitle>Employee Management</CardTitle>
            <CardDescription>Monitor and manage employee suspensions and reinstatements</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6">
              <Button
                variant={dashboardTab === 'suspended' ? 'default' : 'outline'}
                onClick={() => setDashboardTab('suspended')}
                className={`flex items-center ${dashboardTab === 'suspended' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50'}`}
              >
                <span>⚠️</span>
                Suspended Employees ({getFilteredSuspendedEmployees().length})
              </Button>
              <Button
                variant={dashboardTab === 'reinstated' ? 'default' : 'outline'}
                onClick={() => setDashboardTab('reinstated')}
                className={`flex items-center gap-2 ${dashboardTab === 'reinstated' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50'}`}
              >
                <span>✅</span>
                Reinstated Records ({getFilteredReinstatedEmployees().length})
              </Button>
            </div>

            {/* Suspended Employees Tab */}
            {dashboardTab === 'suspended' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <Input
                      placeholder="Search suspended employees..."
                      className="w-64"
                      value={suspendedSearchTerm}
                      onChange={(e) => setSuspendedSearchTerm(e.target.value)}
                    />
                    <Select value={values} onValueChange={setValues}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="pending_review">Pending Review</SelectItem>
                        <SelectItem value="reinstated">Reinstated</SelectItem>
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
                      variant="outline"
                      onClick={cleanupDuplicateSuspendedEmployees}
                      className="flex items-center gap-2 bg-orange-500 text-white hover:bg-orange-600 hover:text-white"
                    >
                      <span>🧹</span>
                      Clean Duplicates
                    </Button>
                  </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Suspension Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Suspended By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredSuspendedEmployees().map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.email}</TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell>{employee.department}</TableCell>
                          <TableCell>{employee.branch}</TableCell>
                          <TableCell>{new Date(employee.suspensionDate).toLocaleDateString()}</TableCell>
                          <TableCell className="max-w-xs truncate" title={employee.suspensionReason}>
                            {employee.suspensionReason}
                          </TableCell>
                          <TableCell>{employee.suspensionDuration}</TableCell>
                          <TableCell>{employee.suspendedBy}</TableCell>
                          <TableCell>
                            <Badge className={getSuspensionStatusColor(employee.status)}>
                              {employee.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openViewDetailsModal(employee)}
                              >
                                View Details
                              </Button>
                              {employee.status === 'suspended' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleReinstateEmployee(employee.id)}
                                >
                                  Reinstate
                                </Button>
                              )}
                              {employee.status === 'pending_review' && (
                                <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700">
                                  Review
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {getFilteredSuspendedEmployees().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {suspendedSearchTerm ? 'No suspended employees match your search.' : 'No suspended employees found.'}
                  </div>
                )}
              </div>
            )}

            {/* Reinstated Records Tab */}
            {dashboardTab === 'reinstated' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <Input
                      placeholder="Search reinstated employees..."
                      className="w-64"
                      value={reinstatedSearchTerm}
                      onChange={(e) => setReinstatedSearchTerm(e.target.value)}
                    />
                    <Select value={values} onValueChange={setValues}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="it">Information Technology</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => refreshDashboardData(true, false)}
                      className="flex items-center bg-blue-500 text-white hover:bg-blue-700 hover:text-white gap-2"
                    >
                      <span>🔄</span>
                      Refresh
                    </Button>
                  </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto border border-gray-200 rounded-lg">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Suspension Date</TableHead>
                        <TableHead>Reinstatement Date</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Reinstated By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredReinstatedEmployees().map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.email}</TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell>{employee.department}</TableCell>
                          <TableCell>{employee.branch}</TableCell>
                          <TableCell>{new Date(employee.suspensionDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {employee.reinstatedDate ? new Date(employee.reinstatedDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>{employee.suspensionDuration}</TableCell>
                          <TableCell>{employee.reinstatedBy || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              REINSTATED
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openViewDetailsModal(employee)}
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => openDeleteReinstatedModal(employee)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {getFilteredReinstatedEmployees().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {reinstatedSearchTerm ? 'No reinstated employees match your search.' : 'No reinstated employees found.'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
                Active Users ({approvedRegistrations.length})
              </Button>
              <Button
                variant={userManagementTab === 'new' ? 'default' : 'outline'}
                onClick={() => setUserManagementTab('new')}
                className="flex items-center gap-2"
              >
                <span>🆕</span>
                New Registrations ({pendingRegistrations.length})
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
                    <Select value={values} onValueChange={setValues}>
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
                        <TableHead>Branches</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedRegistrations.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.fname} {employee.lname}</TableCell>
                          <TableCell>{employee.email}</TableCell>
                          <TableCell>{employee.positions.label}</TableCell>
                          <TableCell>{employee.branches.branch_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {employee.roles?.map((role : any) => role.name).join(", ") || "No role"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {employee.reinstated ? (
                              <Badge
                                className="text-blue-600 bg-blue-100"
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
                      ))}
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
                  <Select value={values} onValueChange={setValues}>
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
                      <TableHead>Branches</TableHead>
                      <TableHead>Registration Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRegistrations.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.fname} {account.lname}</TableCell>                      
                        <TableCell>{account.email}</TableCell>
                        <TableCell>{account.positions.label}</TableCell>
                        <TableCell>{account.branches.branch_name}</TableCell>
                        <TableCell>{new Date(account.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={
                            account.is_active === 'declined'
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }>
                            {account.is_active === 'declined'
                              ? 'REJECTED'
                              : 'PENDING VERIFICATION'
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {account.is_active === 'pending' && (
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

              {pendingRegistrations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {userSearchTerm ? 'No new registrations match your search.' : 'No new registrations found.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {active === 'evaluated-reviews' && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluated Reviews</CardTitle>
            <CardDescription>View and manage all completed performance evaluations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  <Input
                    placeholder="Search evaluations..."
                    className="w-64"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                  <Select value={values} onValueChange={setValues}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ratings</SelectItem>
                      <SelectItem value="excellent">Excellent (90-100)</SelectItem>
                      <SelectItem value="good">Good (80-89)</SelectItem>
                      <SelectItem value="satisfactory">Satisfactory (70-79)</SelectItem>
                      <SelectItem value="needs-improvement">Needs Improvement (0-69)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={values} onValueChange={setValues}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Periods</SelectItem>
                      <SelectItem value="2024-Q1">Q1 2024</SelectItem>
                      <SelectItem value="2024-Q2">Q2 2024</SelectItem>
                      <SelectItem value="2024-Q3">Q3 2024</SelectItem>
                      <SelectItem value="2024-Q4">Q4 2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleRefreshEvaluatedReviews}
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
                        <RefreshCcw className="h-5 w-5" />
                        Refresh
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
                  >
                    Export Reviews
                  </Button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto border border-gray-200 rounded-lg scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Evaluator</TableHead>
                      <TableHead>Overall Rating</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluatedReviews
                      .filter(review => {
                        if (!userSearchTerm) return true;
                        return review.employeeName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          review.evaluatorName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          review.employeeEmail.toLowerCase().includes(userSearchTerm.toLowerCase());
                      })
                      .map((review) => (
                        <TableRow key={review.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold">{review.employeeName}</div>
                              <div className="text-sm text-gray-500">{review.employeeEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>{review.evaluatorName}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className={`font-semibold text-lg ${getScoreColor(review.overallRating)}`}>
                                {review.overallRating}%
                              </span>
                              <Badge className={
                                review.overallRating >= 90
                                  ? 'bg-green-100 text-green-800'
                                  : review.overallRating >= 80
                                    ? 'bg-blue-100 text-blue-800'
                                    : review.overallRating >= 70
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                              }>
                                {review.overallRating >= 90
                                  ? 'Excellent'
                                  : review.overallRating >= 80
                                    ? 'Good'
                                    : review.overallRating >= 70
                                      ? 'Satisfactory'
                                      : 'Needs Improvement'
                                }
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getQuarterColor(review.period || 'Unknown')}>
                              {review.period || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">
                              {review.status || 'Completed'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(review.submittedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  toastMessages.generic.info('View Evaluation Details', `View detailed evaluation results for ${review.employeeName}`);
                                }}
                              >
                                View Details
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => {
                                  toastMessages.generic.info('Export Evaluation', `Export evaluation report for ${review.employeeName}`);
                                }}
                              >
                                Export
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {evaluatedReviews.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-lg font-medium">No evaluated reviews found</p>
                  <p className="text-sm">Evaluations will appear here once they are completed and submitted.</p>
                </div>
              )}

              {/* Summary Statistics */}
              {evaluatedReviews.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {evaluatedReviews.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Reviews</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {evaluatedReviews.filter(r => r.overallRating >= 90).length}
                    </div>
                    <div className="text-sm text-gray-600">Excellent (90+)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {evaluatedReviews.filter(r => r.overallRating >= 80 && r.overallRating < 90).length}
                    </div>
                    <div className="text-sm text-gray-600">Good (80-89)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {evaluatedReviews.filter(r => r.overallRating < 80).length}
                    </div>
                    <div className="text-sm text-gray-600">Needs Improvement</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
        branches={branchesData.map(branch => branch.name)}
        positions={positionsData}
      />

    </DashboardShell>
  );
}

// Wrap with HOC for authentication
export default withAuth(AdminDashboard, { requiredRole: 'admin' });
