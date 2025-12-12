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
import EvaluationsPagination from "@/components/paginationComponent";

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

interface RoleType {
  id: string;
  name: string;
}

export default function UserManagementTab() {
  const [pendingRegistrations, setPendingRegistrations] = useState<Employee[]>(
    []
  );

  const [activeRegistrations, setActiveRegistrations] = useState<Employee[]>(
    []
  );
  const [tab, setTab] = useState<"active" | "new">("active");
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [activeTotalItems, setActiveTotalItems] = useState(0);
  const [pendingTotalItems, setPendingTotalItems] = useState(0);

  //data
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [positionsData, setPositionData] = useState<any[]>([]);
  const [branchesData, setBranchesData] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);

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

  //filters for active users
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [debouncedActiveSearchTerm, setDebouncedActiveSearchTerm] =
    useState(activeSearchTerm);
  const [roleFilter, setRoleFilter] = useState("0"); // Default to "All Roles"
  const [debouncedRoleFilter, setDebouncedRoleFilter] = useState(roleFilter);
  //filters for pending users
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [debouncedPendingSearchTerm, setDebouncedPendingSearchTerm] =
    useState(pendingSearchTerm);
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedStatusFilter, setDebouncedStatusFilter] =
    useState(statusFilter);
  //pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(0);

  const loadPendingUsers = async (
    searchValue: string,
    statusFilter: string,
    isPageChange: boolean = false
  ) => {
    try {
      if (isPageChange) {
        setIsPageLoading(true);
      }
      const response = await apiService.getPendingRegistrations(
        searchValue,
        statusFilter,
        currentPage,
        itemsPerPage
      );

      // Handle different response structures
      let pendingUsersData: Employee[] = [];
      let total = 0;
      let lastPage = 1;
      let perPageValue = itemsPerPage;

      if (response) {
        // If response has data property (paginated response)
        if (response.data && Array.isArray(response.data)) {
          pendingUsersData = response.data;
          total = response.total || 0;
          lastPage = response.last_page || 1;
          perPageValue = response.per_page || itemsPerPage;
        }
        // If response is directly an array - apply client-side pagination
        else if (Array.isArray(response)) {
          total = response.length;
          lastPage = Math.ceil(response.length / itemsPerPage);
          perPageValue = itemsPerPage;
          // Slice the array to show only items for current page
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          pendingUsersData = response.slice(startIndex, endIndex);
        }
        // If response has users property
        else if (response.users && Array.isArray(response.users)) {
          // Check if it's already paginated
          if (response.total && response.last_page) {
            pendingUsersData = response.users;
            total = response.total;
            lastPage = response.last_page;
            perPageValue = response.per_page || itemsPerPage;
          } else {
            // Apply client-side pagination
            total = response.users.length;
            lastPage = Math.ceil(response.users.length / itemsPerPage);
            perPageValue = itemsPerPage;
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            pendingUsersData = response.users.slice(startIndex, endIndex);
          }
        }
      }

      setPendingRegistrations(pendingUsersData);
      setTotalItems(total);
      setPendingTotalItems(total);
      setTotalPages(lastPage);
      setPerPage(perPageValue);
    } catch (error) {
      console.error("Error loading pending users:", error);
      // Set empty array on error to prevent undefined errors
      setPendingRegistrations([]);
      setTotalItems(0);
      setPendingTotalItems(0);
      setTotalPages(1);
      setPerPage(itemsPerPage);
    } finally {
      if (isPageChange) {
        setIsPageLoading(false);
      }
    }
  };

  const loadActiveUsers = async (
    searchValue: string,
    roleFilter: string,
    isPageChange: boolean = false
  ) => {
    try {
      if (isPageChange) {
        setIsPageLoading(true);
      }
      // Convert "0" (All Roles) to empty string for API call
      const roleFilterForAPI = roleFilter === "0" ? "" : roleFilter;
      const response = await apiService.getActiveRegistrations(
        searchValue,
        roleFilterForAPI,
        currentPage,
        itemsPerPage
      );

      // Handle different response structures
      let activeUsersData: Employee[] = [];
      let total = 0;
      let lastPage = 1;
      let perPageValue = itemsPerPage;

      if (response) {
        // If response has data property (paginated response)
        if (response.data && Array.isArray(response.data)) {
          activeUsersData = response.data;
          total = response.total || 0;
          lastPage = response.last_page || 1;
          perPageValue = response.per_page || itemsPerPage;
        }
        // If response is directly an array - apply client-side pagination
        else if (Array.isArray(response)) {
          total = response.length;
          lastPage = Math.ceil(response.length / itemsPerPage);
          perPageValue = itemsPerPage;
          // Slice the array to show only items for current page
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          activeUsersData = response.slice(startIndex, endIndex);
        }
        // If response has users property
        else if (response.users && Array.isArray(response.users)) {
          // Check if it's already paginated
          if (response.total && response.last_page) {
            activeUsersData = response.users;
            total = response.total;
            lastPage = response.last_page;
            perPageValue = response.per_page || itemsPerPage;
          } else {
            // Apply client-side pagination
            total = response.users.length;
            lastPage = Math.ceil(response.users.length / itemsPerPage);
            perPageValue = itemsPerPage;
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            activeUsersData = response.users.slice(startIndex, endIndex);
          }
        }
      }

      setActiveRegistrations(activeUsersData);
      setTotalItems(total);
      setActiveTotalItems(total);
      setTotalPages(lastPage);
      setPerPage(perPageValue);
    } catch (error) {
      console.error("Error loading active users:", error);
      // Set empty array on error to prevent undefined errors
      setActiveRegistrations([]);
      setTotalItems(0);
      setActiveTotalItems(0);
      setTotalPages(1);
      setPerPage(itemsPerPage);
    } finally {
      if (isPageChange) {
        setIsPageLoading(false);
      }
    }
  };

  //render when page reload not loading not everySearch or Filters
  useEffect(() => {
    const mountData = async () => {
      setRefresh(true);
      try {
        const [positions, branches, departments] = await Promise.all([
          apiService.getPositions(),
          apiService.getBranches(),
          apiService.getDepartments(),
        ]);
        setPositionData(positions);
        setBranchesData(branches);
        setDepartmentData(departments);
        const roles = await apiService.getAllRoles();
        setRoles(roles);
        await loadActiveUsers(activeSearchTerm, roleFilter);
        await loadPendingUsers(pendingSearchTerm, statusFilter);
      } catch (error) {
        console.error("Error refreshing data:", error);
        setRefresh(false);
      } finally {
        setRefresh(false);
      }
    };
    mountData();
  }, []);

  //mount every activeSearchTerm changes and RoleFilter
  useEffect(() => {
    const handler = setTimeout(() => {
      activeSearchTerm === "" ? currentPage : setCurrentPage(1);
      setDebouncedActiveSearchTerm(activeSearchTerm);
      setDebouncedRoleFilter(roleFilter);
    }, 500);

    return () => clearTimeout(handler);
  }, [activeSearchTerm, roleFilter]);

  // Fetch API whenever debounced active search term changes
  useEffect(() => {
    const fetchData = async () => {
      if (tab === "active") {
        // Only show page loading if currentPage changed (not search/filter term)
        const isPageChange =
          debouncedActiveSearchTerm === activeSearchTerm &&
          debouncedRoleFilter === roleFilter;
        await loadActiveUsers(
          debouncedActiveSearchTerm,
          debouncedRoleFilter,
          isPageChange
        );
      }
    };

    fetchData();
  }, [debouncedActiveSearchTerm, debouncedRoleFilter, currentPage]);

  //mount every pendingSearchTerm changes and statusFilter
  useEffect(() => {
    const handler = setTimeout(() => {
      pendingSearchTerm === "" ? currentPage : setCurrentPage(1);
      setDebouncedPendingSearchTerm(pendingSearchTerm);
      setDebouncedStatusFilter(statusFilter);
    }, 500);

    return () => clearTimeout(handler);
  }, [pendingSearchTerm, statusFilter]);

  // Fetch API whenever debounced pending search term changes
  useEffect(() => {
    const fetchData = async () => {
      if (tab === "new") {
        // Only show page loading if currentPage changed (not search/filter term)
        const isPageChange =
          debouncedPendingSearchTerm === pendingSearchTerm &&
          debouncedStatusFilter === statusFilter;
        await loadPendingUsers(
          debouncedPendingSearchTerm,
          debouncedStatusFilter,
          isPageChange
        );
      }
    };

    fetchData();
  }, [debouncedPendingSearchTerm, debouncedStatusFilter, currentPage]);

  // Function to refresh user data
  const refreshUserData = async (showLoading = false) => {
    try {
      setRefresh(true);
      if (tab === "new") {
        await loadPendingUsers(pendingSearchTerm, statusFilter);
      }
      if (tab === "active") {
        await loadActiveUsers(activeSearchTerm, roleFilter);
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
      setRefresh(false);
    }
  };

  // Handlers
  const openEditModal = async (user: any) => {
    try {
      setUserToEdit(user);
      setIsEditModalOpen(true);
    } catch (error) {
      console.log(error);
    }
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
          // Skip these keys - we'll append them with _id suffix separately
          if (
            key === "position" ||
            key === "branch" ||
            key === "role" ||
            key === "department"
          ) {
            return;
          }
          if (key === "avatar" && updatedUser[key] instanceof File) {
            formData.append(key, updatedUser[key]);
          } else {
            formData.append(key, String(updatedUser[key]));
          }
        }
      });

      // Append position as position_id if it exists
      if (updatedUser.position !== undefined && updatedUser.position !== null) {
        formData.append("position_id", String(updatedUser.position));
      }

      // Append branch as branch_id if it exists
      if (updatedUser.branch !== undefined && updatedUser.branch !== null) {
        formData.append("branch_id", String(updatedUser.branch));
      }

      // Append role as roles if it exists
      if (updatedUser.role !== undefined && updatedUser.role !== null) {
        formData.append("roles", String(updatedUser.role));
      }

      // Append department as department_id if it exists
      if (
        updatedUser.department !== undefined &&
        updatedUser.department !== null
      ) {
        formData.append("department_id", String(updatedUser.department));
      }

      await apiService.updateEmployee(formData, updatedUser.id);

      // Refresh user data to update the table immediately
      await refreshUserData(false);

      // Refresh dashboard data to get updated information

      // Show success toast
      toastMessages.user.updated(updatedUser.name);
    } catch (error: any) {
      if (error.response?.data?.errors) {
        Object.keys(error.response.data.errors).forEach((field) => {
          toastMessages.generic.error(
            "Update Failed",
            error.response.data.errors[field][0]
          );
        });
      }
    }
  };

  const handleDeleteEmployee = async (employee: any) => {
    console.log(employee.id);
    try {
      await apiService.deleteUser(employee.id);
      toastMessages.user.deleted(employee.fname);
      loadActiveUsers(activeSearchTerm, roleFilter);
    } catch (error) {
      console.error("Error approving registration:", error);
    } finally {
      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleApproveRegistration = async (
    registrationId: number,
    registrationName: string
  ) => {
    try {
      await apiService.approveRegistration(registrationId);
      await loadPendingUsers(pendingSearchTerm, statusFilter);
      toastMessages.user.approved(registrationName);
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
      await apiService.rejectRegistration(registrationId);
      await loadPendingUsers(pendingSearchTerm, statusFilter);
      toastMessages.user.rejected(registrationName);
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
      const addUser = await apiService.addUser(newUser);

      await refreshUserData();

      toastMessages.user.created(newUser.fname);
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
    try {
      setTab(tab);
      await refreshUserData(true);
    } catch (error) {
      console.log(error);
    } finally {
      setRefresh(false);
    }
  };

  return (
    <div className="relative overflow-y-auto pr-2 min-h-[400px]">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage system users and permissions</CardDescription>
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
              Active Users ({activeTotalItems})
            </Button>
            <Button
              variant={tab === "new" ? "default" : "outline"}
              onClick={() => handleTabChange("new")}
              className="flex items-center gap-2"
            >
              <span>🆕</span>
              New Registrations ({pendingTotalItems})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Users Tab */}
      {tab === "active" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Approved Registrations</CardTitle>
            <CardDescription>List of Active Users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </span>
                    <Input
                      placeholder="Search users..."
                      className="w-64 pl-10"
                      value={activeSearchTerm}
                      onChange={(e) => setActiveSearchTerm(e.target.value)}
                    />
                    {activeSearchTerm && (
                      <button
                        onClick={() => setActiveSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors"
                        aria-label="Clear search"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <Select
                    value={roleFilter}
                    onValueChange={(value) => setRoleFilter(value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All Roles</SelectItem>
                      {roles &&
                        Array.isArray(roles) &&
                        roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => refreshUserData(true)}
                    disabled={refresh}
                    className="flex items-center bg-blue-500 text-white hover:bg-blue-700 hover:text-white gap-2"
                  >
                    {refresh ? (
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
                    <Plus className="h-5 w-5 font-bold " />
                    Add User
                  </Button>
                </div>
              </div>

              <div className="relative overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                    {refresh || isPageLoading ? (
                      Array.from({ length: itemsPerPage }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : activeRegistrations &&
                      Array.isArray(activeRegistrations) &&
                      activeRegistrations.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-gray-500"
                        >
                          <div className="flex flex-col items-center justify-center gap-4">
                            <img
                              src="/not-found.gif"
                              alt="No data"
                              className="w-25 h-25 object-contain"
                              style={{
                                imageRendering: "auto",
                                willChange: "auto",
                                transform: "translateZ(0)",
                                backfaceVisibility: "hidden",
                                WebkitBackfaceVisibility: "hidden",
                              }}
                            />
                            <div className="text-gray-500">
                              {activeSearchTerm ? (
                                <>
                                  <p className="text-base font-medium mb-1">
                                    No results found
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    Try adjusting your search or filters
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-base font-medium mb-1">
                                    No evaluation records to display
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    Records will appear here when evaluations
                                    are submitted
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : activeRegistrations &&
                      Array.isArray(activeRegistrations) &&
                      activeRegistrations.length > 0 ? (
                      activeRegistrations.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            {employee.fname + " " + employee.lname}
                          </TableCell>
                          <TableCell>{employee.email}</TableCell>
                          <TableCell>
                            {employee.positions?.label || "N/A"}
                          </TableCell>
                          <TableCell>
                            {(employee.branches &&
                              Array.isArray(employee.branches) &&
                              employee.branches[0]?.branch_name) ||
                              "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {(employee.roles &&
                                Array.isArray(employee.roles) &&
                                employee.roles[0]?.name) ||
                                "N/A"}
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
                    ) : null}
                  </TableBody>
                </Table>
              </div>
              <div>
                {tab === "active" && (
                  <div>
                    <EvaluationsPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      total={activeTotalItems}
                      perPage={perPage}
                      onPageChange={(page) => {
                        setCurrentPage(page);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
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
                    <div className="relative flex-1 max-w-md">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                      </span>
                      <Input
                        placeholder="Search new registrations..."
                        className="w-64 pl-10"
                        value={pendingSearchTerm}
                        onChange={(e) => setPendingSearchTerm(e.target.value)}
                      />

                      {pendingSearchTerm && (
                        <button
                          onClick={() => setPendingSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors"
                          aria-label="Clear search"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">All Status</SelectItem>
                        <SelectItem value="pending">
                          Pending Verification
                        </SelectItem>
                        <SelectItem value="declined">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => refreshUserData(true)}
                      disabled={refresh}
                      className="flex items-center gap-2"
                    >
                      {refresh ? (
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
                      {refresh || isPageLoading ? (
                        Array.from({ length: itemsPerPage }).map((_, index) => (
                          <TableRow key={`skeleton-${index}`}>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Skeleton className="h-6 w-24" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : pendingRegistrations.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-gray-500"
                          >
                            <div className="flex flex-col items-center justify-center gap-4">
                              <img
                                src="/not-found.gif"
                                alt="No data"
                                className="w-25 h-25 object-contain"
                                style={{
                                  imageRendering: "auto",
                                  willChange: "auto",
                                  transform: "translateZ(0)",
                                  backfaceVisibility: "hidden",
                                  WebkitBackfaceVisibility: "hidden",
                                }}
                              />
                              <div className="text-gray-500">
                                {pendingSearchTerm ? (
                                  <>
                                    <p className="text-base font-medium mb-1">
                                      No results found
                                    </p>
                                    <p className="text-sm text-gray-400">
                                      Try adjusting your search or filters
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-base font-medium mb-1">
                                      No evaluation records to display
                                    </p>
                                    <p className="text-sm text-gray-400">
                                      Records will appear here when evaluations
                                      are submitted
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : pendingRegistrations &&
                        Array.isArray(pendingRegistrations) &&
                        pendingRegistrations.length > 0 ? (
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
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  {tab === "new" && (
                    <div>
                      <EvaluationsPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        total={pendingTotalItems}
                        perPage={perPage}
                        onPageChange={(page) => {
                          setCurrentPage(page);
                        }}
                      />
                    </div>
                  )}
                </div>
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
                    <span className="font-medium">Branch:</span>{" "}
                    {employeeToDelete?.branches?.branch_name}
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
                onClick={() => handleDeleteEmployee(employeeToDelete)}
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
        departments={departmentData}
        branches={branchesData}
        positions={positionsData}
        roles={roles}
      />
    </div>
  );
}
