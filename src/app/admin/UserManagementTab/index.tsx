"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, ChevronDown } from "lucide-react";
import EditUserModal from "@/components/EditUserModal";
import AddEmployeeModal from "@/components/AddEmployeeModal";
import { toastMessages } from "@/lib/toastMessages";
import { apiService } from "@/lib/apiService";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";

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
  approvedDate?: string;
}

interface UserManagementTabProps {
  branchesData: { value: string; label: string }[];
  positionsData: { value: string; label: string }[];
  refreshDashboardDataAction: (
    showModal?: boolean,
    isAutoRefresh?: boolean
  ) => Promise<void>;
}

export function UserManagementTab({
  branchesData,
  positionsData,
  refreshDashboardDataAction: refreshDashboardData,
}: UserManagementTabProps) {
  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [departmentsData, setDepartmentsData] = useState<{id: number, name: string}[]>([]);
  const [userManagementTab, setUserManagementTab] = useState<"active" | "new">(
    "active"
  );
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [approvedRegistrations, setApprovedRegistrations] = useState<number[]>(
    []
  );
  const [rejectedRegistrations, setRejectedRegistrations] = useState<number[]>(
    []
  );
  const [usersRefreshing, setUsersRefreshing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeUsersPage, setActiveUsersPage] = useState(1);
  const [newRegistrationsPage, setNewRegistrationsPage] = useState(1);
  const itemsPerPage = 8;

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Use dialog animation hook (0.4s to match EditUserModal speed)
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null
  );

  // Function to filter out deleted employees
  const filterDeletedEmployees = (employeeList: Employee[]) => {
    const deletedEmployees = JSON.parse(
      localStorage.getItem("deletedEmployees") || "[]"
    );
    return employeeList.filter((emp) => !deletedEmployees.includes(emp.id));
  };

  // Function to load accounts data from API
  const loadAccountsData = async () => {
    try {
      const accounts = await apiService.getAllUsers();
      
      // Debug: Log the first account to see the structure
      if (accounts.length > 0) {
        console.log("📊 Sample account data structure:", accounts[0]);
      }

      const employees = accounts
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
          
          const position = account.position || 
                          account.position_name || 
                          account.position?.name ||
                          "";
          
          const role = account.role || 
                      account.roles || 
                      account.user_role ||
                      account.role_name ||
                      "";

          return {
            id: account.employeeId || account.id || account.user_id,
            name: name,
            fname: fname,
            lname: lname,
            email: account.email || account.user_email || "",
            position: position,
            department: account.department || account.department_name || account.department?.name || "",
            branch: account.branch || account.branch_name || account.branch?.name || "",
            hireDate: account.hireDate || account.hire_date || account.created_at || "",
            role: String(role || ""), // Ensure role is always a string
            username: account.username || account.user_name || "",
            password: account.password || "",
            isActive: account.isActive !== undefined ? account.isActive : (account.is_active !== undefined ? account.is_active : true),
            avatar: account.avatar || account.avatar_url || null,
            bio: account.bio || null,
            contact: account.contact || account.phone || account.contact_number || "",
            updatedAt: account.updatedAt || account.updated_at || "",
            approvedDate: account.approvedDate || account.approved_date || account.created_at || "",
          };
        });

      return employees;
    } catch (error) {
      console.error("Error loading accounts data:", error);
      return [];
    }
  };

  // Function to refresh user data
  const refreshUserData = async (showLoading = false) => {
    console.log("🔄 Starting user data refresh...");
    if (showLoading) {
      setUsersRefreshing(true);
    }
    setIsRefreshing(true);

    try {
      const employeesData = await loadAccountsData();
      const filteredEmployees = filterDeletedEmployees(employeesData);
      setEmployees(filteredEmployees);

      await loadPendingRegistrations();
      console.log("✅ User data refresh completed successfully");

      // Keep spinner visible for at least 800ms for better UX (same as tab switching)
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (error) {
      console.error("❌ Error refreshing user data:", error);
      toastMessages.generic.error(
        "Refresh Failed",
        "Failed to refresh user data. Please try again."
      );
      // Even on error, show spinner for minimum duration
      await new Promise((resolve) => setTimeout(resolve, 800));
    } finally {
      setIsRefreshing(false);
      if (showLoading) {
        setUsersRefreshing(false);
      }
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setUsersRefreshing(true); // Show spinner on initial load
      try {
        // Add a small delay to ensure spinner is visible
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Load departments from API
        const departments = await apiService.getDepartments();
        setDepartmentsData(departments.map((dept: any) => ({
          id: Number(dept.id),
          name: dept.name
        })));

        await refreshUserData(false); // Don't show loading spinner again (we're already showing it)

        // Load approved/rejected registrations from localStorage
        const approved = JSON.parse(
          localStorage.getItem("approvedRegistrations") || "[]"
        );
        const rejected = JSON.parse(
          localStorage.getItem("rejectedRegistrations") || "[]"
        );
        setApprovedRegistrations(approved);
        setRejectedRegistrations(rejected);
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
        setUsersRefreshing(false);
      }
    };

    loadInitialData();
  }, []);

  // Function to load pending registrations
  const loadPendingRegistrations = async () => {
    try {
      const pendingRegistrations =
        await apiService.getPendingRegistrations();
      setPendingRegistrations(pendingRegistrations);
    } catch (error) {
      console.error("Error loading pending registrations:", error);
      setPendingRegistrations([]);
    }
  };

  // Function to get active employees
  const getActiveEmployees = () => {
    return employees.filter((emp) => emp.isActive !== false);
  };

  const getFilteredActiveEmployees = () => {
    const activeEmployees = getActiveEmployees();
    if (!userSearchTerm) return activeEmployees;

    return activeEmployees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        employee.position
          .toLowerCase()
          .includes(userSearchTerm.toLowerCase()) ||
        employee.department
          .toLowerCase()
          .includes(userSearchTerm.toLowerCase()) ||
        (employee.branch || "")
          .toLowerCase()
          .includes(userSearchTerm.toLowerCase())
    );
  };

  // Function to get newly registered accounts from pending registrations
  const getNewlyRegisteredAccounts = () => {
    return pendingRegistrations
      .filter((reg: any) => {
        const isApproved = approvedRegistrations.includes(reg.id);
        const isRejected = rejectedRegistrations.includes(reg.id);
        return !isApproved && !isRejected;
      })
      .map((reg: any) => ({
        id: reg.id,
        name: reg.name,
        email: reg.email,
        position: reg.position,
        department: reg.department,
        branch: reg.branch,
        registrationDate: new Date(
          reg.submittedAt || reg.createdAt || Date.now()
        ),
        status: rejectedRegistrations.includes(reg.id)
          ? "rejected"
          : "pending_verification",
      }));
  };

  const getFilteredNewAccounts = () => {
    const newAccounts = getNewlyRegisteredAccounts();
    if (!userSearchTerm) return newAccounts;

    return newAccounts.filter(
      (account) =>
        account.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        account.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        account.position.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        account.department
          .toLowerCase()
          .includes(userSearchTerm.toLowerCase()) ||
        (account.branch || "")
          .toLowerCase()
          .includes(userSearchTerm.toLowerCase())
    );
  };

  // Handlers
  const openEditModal = (user: any) => {
    setUserToEdit(user);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteModalOpen(true);
  };

  const handleSaveUser = async (updatedUser: any) => {
    try {
      // Convert user object to FormData for API
      const formData = new FormData();
      Object.keys(updatedUser).forEach((key) => {
        if (updatedUser[key] !== undefined && updatedUser[key] !== null) {
          if (key === 'avatar' && updatedUser[key] instanceof File) {
            formData.append(key, updatedUser[key]);
          } else {
            // Convert boolean to string, handle empty strings
            const value = updatedUser[key];
            if (typeof value === 'boolean') {
              formData.append(key, value ? '1' : '0');
            } else if (value !== '') {
              formData.append(key, String(value));
            }
          }
        }
      });
      
      // Send fname and lname separately if they exist, otherwise use name
      if (updatedUser.fname || updatedUser.lname) {
        formData.append('fname', updatedUser.fname || '');
        formData.append('lname', updatedUser.lname || '');
        // Also keep name for backward compatibility
        if (!formData.has('name') || !updatedUser.name) {
          formData.append('name', `${updatedUser.fname || ''} ${updatedUser.lname || ''}`.trim());
        }
      }
      
      // Debug: Log what we're sending
      console.log("📤 Updating user with data:", {
        id: updatedUser.id,
        name: updatedUser.name,
        fname: updatedUser.fname,
        lname: updatedUser.lname,
        email: updatedUser.email,
        position: updatedUser.position,
        role: updatedUser.role,
        employeeId: updatedUser.employeeId
      });
      
      await apiService.updateEmployee(formData, updatedUser.id);

      // Small delay to ensure backend has processed the update
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Refresh user data from API to update the table immediately
      await refreshUserData(false);

      // Refresh dashboard data to get updated information
      await refreshDashboardData(false, false);

      // Show success toast
      toastMessages.user.updated(updatedUser.name);
    } catch (error) {
      console.error("Error updating user:", error);
      toastMessages.generic.error(
        "Update Failed",
        "Failed to update user information. Please try again."
      );
    }
  };

  const handleDeleteEmployee = () => {
    if (!employeeToDelete) return;

    const deletedEmployees = JSON.parse(
      localStorage.getItem("deletedEmployees") || "[]"
    );
    deletedEmployees.push(employeeToDelete.id);
    localStorage.setItem("deletedEmployees", JSON.stringify(deletedEmployees));

    setEmployees((prev) =>
      prev.filter((emp) => emp.id !== employeeToDelete.id)
    );
    toastMessages.user.deleted(employeeToDelete.name);

    setIsDeleteModalOpen(false);
    setEmployeeToDelete(null);
  };

  const handleApproveRegistration = async (
    registrationId: number,
    registrationName: string
  ) => {
    try {
      const result = await apiService.approveRegistration(
        registrationId
      );

      // Handle API response - check for success in various formats
      const success = result?.success || result?.data?.success || (result && !result.error);
      if (success) {
        const newApproved = [...approvedRegistrations, registrationId];
        setApprovedRegistrations(newApproved);
        localStorage.setItem(
          "approvedRegistrations",
          JSON.stringify(newApproved)
        );

        const newRejected = rejectedRegistrations.filter(
          (id) => id !== registrationId
        );
        setRejectedRegistrations(newRejected);
        localStorage.setItem(
          "rejectedRegistrations",
          JSON.stringify(newRejected)
        );

        await loadPendingRegistrations();
        // Small delay to ensure backend has processed the approval
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Refresh active users list to show the newly approved user
        await refreshUserData(false);
        // If user is on "new" tab, switch to "active" tab to show the newly approved user
        if (userManagementTab === "new") {
          setUserManagementTab("active");
        }
        await refreshDashboardData(false, false);
        toastMessages.user.approved(registrationName);
      } else {
        toastMessages.generic.error(
          "Approval Failed",
          result?.message || result?.data?.message || "Failed to approve registration. Please try again."
        );
      }
    } catch (error) {
      console.error("Error approving registration:", error);
      toastMessages.generic.error(
        "Approval Error",
        "An error occurred while approving the registration. Please try again."
      );
    }
  };

  const handleRejectRegistration = async (
    registrationId: number,
    registrationName: string
  ) => {
    try {
      const result = await apiService.rejectRegistration(registrationId);

      // Handle API response - check for success in various formats
      const success = result?.success || result?.data?.success || (result && !result.error);
      if (success) {
        const newRejected = [...rejectedRegistrations, registrationId];
        setRejectedRegistrations(newRejected);
        localStorage.setItem(
          "rejectedRegistrations",
          JSON.stringify(newRejected)
        );

        const newApproved = approvedRegistrations.filter(
          (id) => id !== registrationId
        );
        setApprovedRegistrations(newApproved);
        localStorage.setItem(
          "approvedRegistrations",
          JSON.stringify(newApproved)
        );

        await loadPendingRegistrations();
        toastMessages.user.rejected(registrationName);
      } else {
        toastMessages.generic.error(
          "Rejection Failed",
          result?.message || result?.data?.message || "Failed to reject registration. Please try again."
        );
      }
    } catch (error) {
      console.error("Error rejecting registration:", error);
      toastMessages.generic.error(
        "Rejection Error",
        "An error occurred while rejecting the registration. Please try again."
      );
    }
  };

  const handleAddUser = async (newUser: any) => {
    try {
      // Create FormData for API call
      const formData = new FormData();
      
      // Handle name - split if needed or use fname/lname if available
      if (newUser.fname && newUser.lname) {
        formData.append('fname', newUser.fname);
        formData.append('lname', newUser.lname);
        formData.append('name', `${newUser.fname} ${newUser.lname}`.trim());
      } else if (newUser.name) {
        const nameParts = newUser.name.split(' ');
        formData.append('fname', nameParts[0] || '');
        formData.append('lname', nameParts.slice(1).join(' ') || '');
        formData.append('name', newUser.name);
      }
      
      // Add other fields
      if (newUser.email) formData.append('email', newUser.email);
      if (newUser.position) formData.append('position', newUser.position);
      if (newUser.department) formData.append('department', newUser.department);
      if (newUser.branch) formData.append('branch', newUser.branch);
      if (newUser.role) formData.append('role', newUser.role);
      if (newUser.password) formData.append('password', newUser.password);
      if (newUser.contact) formData.append('contact', newUser.contact);
      if (newUser.hireDate) formData.append('hireDate', newUser.hireDate);
      formData.append('isActive', String(newUser.isActive !== undefined ? newUser.isActive : true));

      // Call API to add user
      const result = await apiService.addUser(formData);

      if (result.success || result) {
        await refreshUserData();
        await refreshDashboardData(false, false);

        toastMessages.user.created(newUser.name || `${newUser.fname} ${newUser.lname}`.trim());
        setIsAddUserModalOpen(false);
      } else {
        throw new Error(result.message || "Failed to add user");
      }
    } catch (error: any) {
      console.error("Error adding user:", error);
      toastMessages.generic.error(
        "Add Failed",
        error.message || "Failed to add user. Please try again."
      );
      throw error;
    }
  };

  // Handle tab change with refresh
  const handleTabChange = async (tab: "active" | "new") => {
    setUserManagementTab(tab);
    // Reset to first page when switching tabs
    setActiveUsersPage(1);
    setNewRegistrationsPage(1);

    // Refresh data when switching tabs
    console.log(
      `🔄 ${
        tab === "new" ? "New Registrations" : "Active Users"
      } tab clicked, refreshing user data...`
    );
    await refreshUserData(true);
  };

  // Pagination calculations for active users
  const activeUsersTotal = getFilteredActiveEmployees().length;
  const activeUsersTotalPages = Math.ceil(activeUsersTotal / itemsPerPage);
  const activeUsersStartIndex = (activeUsersPage - 1) * itemsPerPage;
  const activeUsersEndIndex = activeUsersStartIndex + itemsPerPage;
  const activeUsersPaginated = getFilteredActiveEmployees().slice(
    activeUsersStartIndex,
    activeUsersEndIndex
  );

  // Pagination calculations for new registrations
  const newRegistrationsTotal = getFilteredNewAccounts().length;
  const newRegistrationsTotalPages = Math.ceil(
    newRegistrationsTotal / itemsPerPage
  );
  const newRegistrationsStartIndex = (newRegistrationsPage - 1) * itemsPerPage;
  const newRegistrationsEndIndex = newRegistrationsStartIndex + itemsPerPage;
  const newRegistrationsPaginated = getFilteredNewAccounts().slice(
    newRegistrationsStartIndex,
    newRegistrationsEndIndex
  );

  // Reset to page 1 when search term changes
  useEffect(() => {
    setActiveUsersPage(1);
    setNewRegistrationsPage(1);
  }, [userSearchTerm]);

  // Show loading skeleton on initial load
  if (loading) {
    return (
      <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex space-x-1 mb-6">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
            </div>

            <div className="flex justify-between items-center mb-4">
              <div className="flex space-x-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-48" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>

            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 border-b pb-4"
                >
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-10 w-36" />
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[400px]">
      {/* Only show top-level spinner during initial load, not during refresh */}
      {usersRefreshing && loading && (
        <>
          {/* Centered Loading Spinner with Logo */}
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
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
                {userManagementTab === "new"
                  ? "Loading new registrations..."
                  : "Loading users..."}
              </p>
            </div>
          </div>
        </>
      )}

      {(!usersRefreshing || !loading) && (
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage system users and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6">
              <Button
                variant={userManagementTab === "active" ? "default" : "outline"}
                onClick={() => handleTabChange("active")}
                className="flex items-center gap-2"
              >
                <span>👥</span>
                Active Users ({getFilteredActiveEmployees().length})
              </Button>
              <Button
                variant={userManagementTab === "new" ? "default" : "outline"}
                onClick={() => handleTabChange("new")}
                className="flex items-center gap-2"
              >
                <span>🆕</span>
                New Registrations ({getFilteredNewAccounts().length})
              </Button>
            </div>

            {/* Active Users Tab */}
            {userManagementTab === "active" && (
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
                      onClick={() => refreshUserData(true)}
                      disabled={isRefreshing || usersRefreshing}
                      className="flex items-center bg-blue-500 text-white hover:bg-blue-700 hover:text-white gap-2"
                    >
                      {isRefreshing || usersRefreshing ? (
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
                    <Button
                      onClick={() => setIsAddUserModalOpen(true)}
                      className="flex items-center bg-blue-600 text-white hover:bg-green-700 hover:text-white gap-2"
                    >
                      <Plus className="h-5 w-5 font-blod " />
                      Add User
                    </Button>
                  </div>
                </div>

                <div className="relative max-h-[450px] overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeUsersPaginated.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-8 text-gray-500"
                          >
                            No active users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeUsersPaginated.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell className="font-medium">
                              {employee.name}
                            </TableCell>
                            <TableCell>{employee.email}</TableCell>
                            <TableCell>{employee.position}</TableCell>
                            <TableCell>
                              {employee.branch
                                ? employee.branch.includes(",")
                                  ? employee.branch.split(",")[0].trim()
                                  : employee.branch
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{employee.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="text-green-600 bg-green-100">
                                Active
                              </Badge>
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

                {/* Pagination Controls for Active Users */}
                {activeUsersTotal > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4 px-2">
                    <div className="text-sm text-gray-600">
                      Showing {activeUsersStartIndex + 1} to{" "}
                      {Math.min(activeUsersEndIndex, activeUsersTotal)} of{" "}
                      {activeUsersTotal} users
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setActiveUsersPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={activeUsersPage === 1}
                        className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: activeUsersTotalPages },
                          (_, i) => i + 1
                        ).map((page) => {
                          if (
                            page === 1 ||
                            page === activeUsersTotalPages ||
                            (page >= activeUsersPage - 1 &&
                              page <= activeUsersPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={
                                  activeUsersPage === page
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setActiveUsersPage(page)}
                                className="text-xs w-8 h-8 p-0 bg-blue-700 text-white hover:bg-blue-500 hover:text-white"
                              >
                                {page}
                              </Button>
                            );
                          } else if (
                            page === activeUsersPage - 2 ||
                            page === activeUsersPage + 2
                          ) {
                            return (
                              <span key={page} className="text-gray-400">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setActiveUsersPage((prev) =>
                            Math.min(activeUsersTotalPages, prev + 1)
                          )
                        }
                        disabled={activeUsersPage === activeUsersTotalPages}
                        className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Registrations Tab Content */}
      {userManagementTab === "new" && (
        <div className="relative mt-4">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>New Registrations</CardTitle>
              <CardDescription>
                Review and approve new user registrations
              </CardDescription>
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
                        <SelectItem value="pending_verification">
                          Pending Verification
                        </SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => refreshUserData(true)}
                      disabled={isRefreshing || usersRefreshing}
                      className="flex items-center gap-2"
                    >
                      {isRefreshing || usersRefreshing ? (
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

                <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b border-gray-200">
                      <TableRow>
                        <TableHead className="px-6 py-3">Name</TableHead>
                        <TableHead className="px-6 py-3">Email</TableHead>
                        <TableHead className="px-6 py-3">Position</TableHead>
                        <TableHead className="px-6 py-3">
                          Registration Date
                        </TableHead>
                        <TableHead className="px-6 py-3">Status</TableHead>
                        <TableHead className="px-6 py-3">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-200">
                      {newRegistrationsPaginated.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-gray-500"
                          >
                            {userSearchTerm
                              ? "No new registrations match your search."
                              : "No new registrations found."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        newRegistrationsPaginated.map((account) => (
                          <TableRow
                            key={account.id}
                            className="hover:bg-gray-50"
                          >
                            <TableCell className="px-6 py-3 font-medium">
                              {account.name}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {account.email}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {account.position}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {account.registrationDate.toLocaleDateString()}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Badge
                                className={
                                  account.status === "rejected"
                                    ? "bg-red-100 text-red-800 hover:bg-red-200"
                                    : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                }
                              >
                                {account.status === "rejected"
                                  ? "REJECTED"
                                  : "PENDING VERIFICATION"}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <div className="flex space-x-2">
                                {account.status === "pending_verification" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-white bg-green-500 hover:text-white hover:bg-green-600"
                                      onClick={() =>
                                        handleApproveRegistration(
                                          account.id,
                                          account.name
                                        )
                                      }
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-white bg-red-500 hover:bg-red-600 hover:text-white"
                                      onClick={() =>
                                        handleRejectRegistration(
                                          account.id,
                                          account.name
                                        )
                                      }
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {account.status === "rejected" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() =>
                                      handleApproveRegistration(
                                        account.id,
                                        account.name
                                      )
                                    }
                                  >
                                    Approve
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm">
                                  View Details
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls for New Registrations */}
                {newRegistrationsTotal > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4 px-2">
                    <div className="text-sm text-gray-600">
                      Showing {newRegistrationsStartIndex + 1} to{" "}
                      {Math.min(
                        newRegistrationsEndIndex,
                        newRegistrationsTotal
                      )}{" "}
                      of {newRegistrationsTotal} registrations
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setNewRegistrationsPage((prev) =>
                            Math.max(1, prev - 1)
                          )
                        }
                        disabled={newRegistrationsPage === 1}
                        className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: newRegistrationsTotalPages },
                          (_, i) => i + 1
                        ).map((page) => {
                          if (
                            page === 1 ||
                            page === newRegistrationsTotalPages ||
                            (page >= newRegistrationsPage - 1 &&
                              page <= newRegistrationsPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={
                                  newRegistrationsPage === page
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setNewRegistrationsPage(page)}
                                className="text-xs w-8 h-8 p-0 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                              >
                                {page}
                              </Button>
                            );
                          } else if (
                            page === newRegistrationsPage - 2 ||
                            page === newRegistrationsPage + 2
                          ) {
                            return (
                              <span key={page} className="text-gray-400">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setNewRegistrationsPage((prev) =>
                            Math.min(newRegistrationsTotalPages, prev + 1)
                          )
                        }
                        disabled={
                          newRegistrationsPage === newRegistrationsTotalPages
                        }
                        className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={userToEdit}
        onSave={handleSaveUser}
        departments={departmentsData.map((dept) => dept.name)}
        branches={branchesData.map((branch: { value: string; label: string }) => ({ id: branch.value, name: branch.label }))}
        positions={positionsData.map((pos: { value: string; label: string }) => ({ id: pos.value, name: pos.label }))}
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={isDeleteModalOpen}
        onOpenChangeAction={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setEmployeeToDelete(null);
          }
        }}
      >
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <DialogHeader className="pb-4 bg-red-50 rounded-lg ">
            <DialogTitle className="text-red-800 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Delete Employee
            </DialogTitle>
            <DialogDescription className="text-red-700">
              This action cannot be undone. Are you sure you want to permanently
              delete {employeeToDelete?.name}?
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
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {employeeToDelete?.name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {employeeToDelete?.email}
                  </p>
                  <p>
                    <span className="font-medium">Position:</span>{" "}
                    {employeeToDelete?.position}
                  </p>
                  <p>
                    <span className="font-medium">Department:</span>{" "}
                    {employeeToDelete?.department}
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
                  setEmployeeToDelete(null);
                }}
                className="text-white bg-blue-600 hover:text-white hover:bg-green-500"
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteEmployee}
              >
                ❌ Delete Permanently
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddUserModalOpen}
        onClose={() => {
          setIsAddUserModalOpen(false);
        }}
        onSave={handleAddUser}
        departments={departmentsData.map((dept) => dept.name)}
        branches={branchesData.map((branch: { value: string; label: string }) => ({ id: branch.value, name: branch.label }))}
        positions={positionsData.map((pos: { value: string; label: string }) => ({ id: pos.value, name: pos.label }))}
        onRefresh={async () => {
          await refreshUserData();
          await refreshDashboardData(false, false);
        }}
      />
    </div>
  );
}
