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
import { Plus } from "lucide-react";
import EditUserModal from "@/components/EditUserModal";
import AddEmployeeModal from "@/components/AddEmployeeModal";
import { toastMessages } from "@/lib/toastMessages";
import apiService from "@/lib/apiService";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";

import accountsDataRaw from "@/data/accounts.json";
import departmentsData from "@/data/departments.json";

// TypeScript interfaces
interface Employee {
  id: number;
  fname: string;
  lname: string;
  email: string;
  positions: any;
  departments: any;
  branches: any;
  hireDate: Date;
  roles: any;
  username: string;
  password: string;
  is_active: string;
  avatar?: string | null;
  bio?: string | null;
  contact?: string;
  created_at: Date;
  updated_at?: Date;
}

interface UserManagementTabProps {
  branchesData: any;
  departmentData: any;
  positionsData: any;
  refreshDashboardDataAction: (
    showModal?: boolean,
    isAutoRefresh?: boolean
  ) => Promise<void>;
}

export default function UserManagementTab({
  branchesData,
  departmentData,
  positionsData,
  refreshDashboardDataAction: refreshDashboardData,
}: UserManagementTabProps) {
  const [pendingRegistrations, setPendingRegistrations] = useState<Employee[]>(
    []
  );

  const [activeRegistrations, setActiveRegistrations] = useState<Employee[]>(
    []
  );
  const [tab, setTab] = useState<"active" | "new">("active");
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

  //
  //
  //
  //
  //
  //filters and paginations
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [overviewTotal, setOverviewTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(0);

  const loadPendingUsers = async () => {
    try {
      const pendingUsers = await apiService.getPendingRegistrations();
      setPendingRegistrations(pendingUsers);

      setLoading(true);

      setOverviewTotal(pendingUsers.total);
      setTotalPages(pendingUsers.last_page);
      setPerPage(pendingUsers.per_page);
    } catch (error) {
      console.log(error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveUsers = async () => {
    try {
      const activeUsers = await apiService.getActiveRegistrations();
      setActiveRegistrations(activeUsers);

      setLoading(true);

      setOverviewTotal(activeUsers.total);
      setTotalPages(activeUsers.last_page);
      setPerPage(activeUsers.per_page);
    } catch (error) {
      console.log(error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "new") {
      loadPendingUsers();
    }
    if (tab === "active") {
      loadActiveUsers();
    }
  }, []);

  // Function to refresh user data
  const refreshUserData = async (showLoading = false) => {
    try {
      if (showLoading) {
        setUsersRefreshing(true);
        setIsRefreshing(true);
      }

      if (tab === "new") {
        loadPendingUsers();
      }
      if (tab === "active") {
        loadActiveUsers();
      }

      if (showLoading) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } catch (error) {
      console.error("❌ Error refreshing user data:", error);
      toastMessages.generic.error(
        "Refresh Failed",
        "Failed to refresh user data. Please try again."
      );
    } finally {
      if (showLoading) {
        setUsersRefreshing(false);
        setIsRefreshing(false);
      }
    }
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
          if (key === "avatar" && updatedUser[key] instanceof File) {
            formData.append(key, updatedUser[key]);
          } else {
            formData.append(key, String(updatedUser[key]));
          }
        }
      });

      await apiService.updateEmployee(formData, updatedUser.id);

      const accounts = JSON.parse(localStorage.getItem("accounts") || "[]");
      const accountIndex = accounts.findIndex(
        (acc: any) =>
          acc.id === updatedUser.id || acc.employeeId === updatedUser.id
      );

      if (accountIndex !== -1) {
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
          isActive:
            updatedUser.isActive !== undefined
              ? updatedUser.isActive
              : accounts[accountIndex].isActive,
          employeeId:
            updatedUser.employeeId !== undefined
              ? updatedUser.employeeId
              : accounts[accountIndex].employeeId,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem("accounts", JSON.stringify(accounts));
      }

      // Refresh user data to update the table immediately
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

    toastMessages.user.deleted(employeeToDelete.fname);

    setIsDeleteModalOpen(false);
    setEmployeeToDelete(null);
  };

  const handleApproveRegistration = async (
    registrationId: number,
    registrationName: string
  ) => {
    try {
      const result = await apiService.approveRegistration(registrationId);

      // Handle API response - check for success in various formats
      const success =
        result?.success || result?.data?.success || (result && !result.error);
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

        await loadUsers();
        await refreshDashboardData(false, false);
        toastMessages.user.approved(registrationName);
      } else {
        toastMessages.generic.error(
          "Approval Failed",
          result?.message ||
            result?.data?.message ||
            "Failed to approve registration. Please try again."
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
      const success =
        result?.success || result?.data?.success || (result && !result.error);
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

        await loadUsers();
        toastMessages.user.rejected(registrationName);
      } else {
        toastMessages.generic.error(
          "Rejection Failed",
          result?.message ||
            result?.data?.message ||
            "Failed to reject registration. Please try again."
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
      const newAccount = {
        name: newUser.name,
        email: newUser.email,
        position: newUser.position,
        department: newUser.department,
        branch: newUser.branch,
        role: newUser.role,
        password: newUser.password,
        isActive: newUser.isActive !== undefined ? newUser.isActive : true,
        employeeId: Date.now(), // Temporary ID
      };

      const accounts = JSON.parse(localStorage.getItem("accounts") || "[]");
      accounts.push(newAccount);
      localStorage.setItem("accounts", JSON.stringify(accounts));

      await refreshUserData();
      await refreshDashboardData(false, false);

      toastMessages.user.created(newUser.name);
      setIsAddUserModalOpen(false);
    } catch (error) {
      console.error("Error adding user:", error);
      toastMessages.generic.error(
        "Add Failed",
        "Failed to add user. Please try again."
      );
      throw error;
    }
  };

  // Handle tab change with refresh
  const handleTabChange = async (tab: "active" | "new") => {
    setTab(tab);
    await refreshUserData(true);
  };

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
                {tab === "new"
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
                variant={tab === "active" ? "default" : "outline"}
                onClick={() => handleTabChange("active")}
                className="flex items-center gap-2"
              >
                <span>👥</span>
                Active Users ({activeRegistrations.length})
              </Button>
              <Button
                variant={tab === "new" ? "default" : "outline"}
                onClick={() => handleTabChange("new")}
                className="flex items-center gap-2"
              >
                <span>🆕</span>
                New Registrations ({pendingRegistrations.length})
              </Button>
            </div>

            {/* Active Users Tab */}
            {tab === "active" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <Input
                      placeholder="Search users..."
                      className="w-64"
                      value={searchTerm}
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
                      {activeRegistrations.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-8 text-gray-500"
                          >
                            No active users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeRegistrations.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell className="font-medium">
                              {employee.fname + " " + employee.lname}
                            </TableCell>
                            <TableCell>{employee.email}</TableCell>
                            <TableCell>{employee.positions.label}</TableCell>
                            <TableCell>
                              {employee.branches[0]?.branch_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {employee.roles[0].name}
                              </Badge>
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
                {
                  // activeUsersTotal > itemsPerPage && (
                  // <div className="flex items-center justify-between mt-4 px-2">
                  //   <div className="text-sm text-gray-600">
                  //     Showing {activeUsersStartIndex + 1} to{" "}
                  //     {Math.min(activeUsersEndIndex, activeUsersTotal)} of{" "}
                  //     {activeUsersTotal} users
                  //   </div>
                  //   <div className="flex items-center gap-2">
                  //     <Button
                  //       variant="outline"
                  //       size="sm"
                  //       onClick={() =>
                  //         setActiveUsersPage((prev) => Math.max(1, prev - 1))
                  //       }
                  //       disabled={activeUsersPage === 1}
                  //       className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                  //     >
                  //       Previous
                  //     </Button>
                  //     <div className="flex items-center gap-1">
                  //       {Array.from(
                  //         { length: activeUsersTotalPages },
                  //         (_, i) => i + 1
                  //       ).map((page) => {
                  //         if (
                  //           page === 1 ||
                  //           page === activeUsersTotalPages ||
                  //           (page >= activeUsersPage - 1 &&
                  //             page <= activeUsersPage + 1)
                  //         ) {
                  //           return (
                  //             <Button
                  //               key={page}
                  //               variant={
                  //                 activeUsersPage === page
                  //                   ? "default"
                  //                   : "outline"
                  //               }
                  //               size="sm"
                  //               onClick={() => setActiveUsersPage(page)}
                  //               className="text-xs w-8 h-8 p-0 bg-blue-700 text-white hover:bg-blue-500 hover:text-white"
                  //             >
                  //               {page}
                  //             </Button>
                  //           );
                  //         } else if (
                  //           page === activeUsersPage - 2 ||
                  //           page === activeUsersPage + 2
                  //         ) {
                  //           return (
                  //             <span key={page} className="text-gray-400">
                  //               ...
                  //             </span>
                  //           );
                  //         }
                  //         return null;
                  //       })}
                  //     </div>
                  //     <Button
                  //       variant="outline"
                  //       size="sm"
                  //       onClick={() =>
                  //         setActiveUsersPage((prev) =>
                  //           Math.min(activeUsersTotalPages, prev + 1)
                  //         )
                  //       }
                  //       disabled={activeUsersPage === activeUsersTotalPages}
                  //       className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                  //     >
                  //       Next
                  //     </Button>
                  //   </div>
                  // </div>
                  // )
                }
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Registrations Tab Content */}
      {tab === "new" && (
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
                      {pendingRegistrations.length === 0 ? (
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
                        pendingRegistrations.map((account) => (
                          <TableRow
                            key={account.id}
                            className="hover:bg-gray-50"
                          >
                            <TableCell className="px-6 py-3 font-medium">
                              {account.fname + " " + account.lname}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {account.email}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {account.positions.label}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {new Date(
                                account.created_at
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Badge
                                className={
                                  account.is_active === "declined"
                                    ? "bg-red-100 text-red-800 hover:bg-red-200"
                                    : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                }
                              >
                                {account.is_active === "declined"
                                  ? "REJECTED"
                                  : "PENDING VERIFICATION"}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <div className="flex space-x-2">
                                {account.is_active === "pending" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-white bg-green-500 hover:text-white hover:bg-green-600"
                                      onClick={() =>
                                        handleApproveRegistration(
                                          account.id,
                                          account.fname
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
                                          account.fname
                                        )
                                      }
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {account.is_active === "declined" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() =>
                                      handleApproveRegistration(
                                        account.id,
                                        account.fname
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
                {
                  // newRegistrationsTotal > itemsPerPage && (
                  //   <div className="flex items-center justify-between mt-4 px-2">
                  //     <div className="text-sm text-gray-600">
                  //       Showing {newRegistrationsStartIndex + 1} to{" "}
                  //       {Math.min(
                  //         newRegistrationsEndIndex,
                  //         newRegistrationsTotal
                  //       )}{" "}
                  //       of {newRegistrationsTotal} registrations
                  //     </div>
                  //     <div className="flex items-center gap-2">
                  //       <Button
                  //         variant="outline"
                  //         size="sm"
                  //         onClick={() =>
                  //           setNewRegistrationsPage((prev) =>
                  //             Math.max(1, prev - 1)
                  //           )
                  //         }
                  //         disabled={newRegistrationsPage === 1}
                  //         className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                  //       >
                  //         Previous
                  //       </Button>
                  //       <div className="flex items-center gap-1">
                  //         {Array.from(
                  //           { length: newRegistrationsTotalPages },
                  //           (_, i) => i + 1
                  //         ).map((page) => {
                  //           if (
                  //             page === 1 ||
                  //             page === newRegistrationsTotalPages ||
                  //             (page >= newRegistrationsPage - 1 &&
                  //               page <= newRegistrationsPage + 1)
                  //           ) {
                  //             return (
                  //               <Button
                  //                 key={page}
                  //                 variant={
                  //                   newRegistrationsPage === page
                  //                     ? "default"
                  //                     : "outline"
                  //                 }
                  //                 size="sm"
                  //                 onClick={() => setNewRegistrationsPage(page)}
                  //                 className="text-xs w-8 h-8 p-0 bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                  //               >
                  //                 {page}
                  //               </Button>
                  //             );
                  //           } else if (
                  //             page === newRegistrationsPage - 2 ||
                  //             page === newRegistrationsPage + 2
                  //           ) {
                  //             return (
                  //               <span key={page} className="text-gray-400">
                  //                 ...
                  //               </span>
                  //             );
                  //           }
                  //           return null;
                  //         })}
                  //       </div>
                  //       <Button
                  //         variant="outline"
                  //         size="sm"
                  //         onClick={() =>
                  //           setNewRegistrationsPage((prev) =>
                  //             Math.min(newRegistrationsTotalPages, prev + 1)
                  //           )
                  //         }
                  //         disabled={
                  //           newRegistrationsPage === newRegistrationsTotalPages
                  //         }
                  //         className="text-xs bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                  //       >
                  //         Next
                  //       </Button>
                  //     </div>
                  //   </div>
                  // )
                }
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
        departments={departmentData}
        branches={branchesData}
        positions={positionsData}
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
              delete {employeeToDelete?.fname}?
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
                    {employeeToDelete?.fname + " " + employeeToDelete?.lname}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {employeeToDelete?.email}
                  </p>
                  <p>
                    <span className="font-medium">Position:</span>{" "}
                    {employeeToDelete?.positions.label}
                  </p>
                  <p>
                    <span className="font-medium">Department:</span>{" "}
                    {employeeToDelete?.departments.department_name}
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
        departments={departmentsData}
        branches={branchesData}
        positions={positionsData}
        onRefresh={async () => {
          await refreshUserData();
          await refreshDashboardData(false, false);
        }}
      />
    </div>
  );
}
