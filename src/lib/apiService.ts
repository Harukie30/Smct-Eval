import { AuthenticatedUser } from "@/contexts/UserContext";
import { CONFIG } from "../../config/config";
import { api, sanctum } from "./api";
import axios, { AxiosError } from "axios";

// Helper function to get CSRF cookie from Sanctum
export const sanctum_csrf = async () => {
  try {
    await sanctum.get("/sanctum/csrf-cookie");
  } catch (error) {
    console.error("Failed to get CSRF cookie:", error);
    throw error;
  }
};

export const apiService = {
  // Authentication
  login: async (email: string, password: string): Promise<any> => {
    await sanctum_csrf();
    try {
      const response = await api.post("/login", { email, password });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
        message: axiosError.response?.data?.message || "Login failed",
      };
    }
  },

  logout: async (): Promise<any> => {
    try {
      const response = await api.post("/logout");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
        message: axiosError.response?.data?.message || "Login failed",
      };
    }
  },

  // Get current authenticated user
  authUser: async (): Promise<any> => {
    try {
      const response = await api.get("/profile");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
        message: axiosError.response?.data?.message || "Failed to get user",
      };
    }
  },

  // Registration
  createPendingRegistration: async (formData: FormData): Promise<any> => {
    try {
      const response = await api.post("/register", formData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
      };
    }
  },

  updateEmployee_auth: async (formData: FormData): Promise<any> => {
    try {
      const response = await api.post("/update_employee_auth", formData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
      };
    }
  },

  updateEmployee: async (
    formData: FormData,
    id: string | number
  ): Promise<any> => {
    try {
      const response = await api.post(`/update_user/${id}`, formData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
      };
    }
  },

  approveRegistration: async (id: string | number): Promise<any> => {
    try {
      const response = await api.post(`/approveRegistration/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
      };
    }
  },

  rejectRegistration: async (id: string | number): Promise<any> => {
    try {
      const response = await api.post(`/rejectRegistration/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
      };
    }
  },

  deleteUser: async (id: string | number): Promise<any> => {
    try {
      const response = await api.post(`/deleteUser/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
      };
    }
  },

  getPendingRegistrations: async (
    searchTerm: string,
    status: string | number,
    page: number,
    perPage: number
  ): Promise<any | null> => {
    try {
      const response = await api.get("/getPendingRegistrations", {
        params: {
          search: searchTerm || "",
          status: status || "",
          page: page,
          per_page: perPage,
        },
      });
      return response.data.users || [];
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch pending registrations"
      );
    }
  },

  getActiveRegistrations: async (
    searchTerm: string,
    role: string | number,
    page: number,
    perPage: number
  ): Promise<any | null> => {
    try {
      const response = await api.get("/getAllActiveUsers", {
        params: {
          search: searchTerm || "",
          role: role || "",
          page: page,
          per_page: perPage,
        },
      });
      return response.data.users || [];
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch active registrations"
      );
    }
  },

  getDepartments: async (): Promise<{ label: string; value: string }[]> => {
    try {
      const response = await api.get("/departments");
      return response.data.departments.map((departments: any) => ({
        value: departments.id,
        label: departments.department_name,
      }));
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch departments"
      );
    }
  },

  getPositions: async (): Promise<{ label: string; value: string }[]> => {
    try {
      const response = await api.get("/positions");
      return response.data.positions.map((position: any) => ({
        value: position.id,
        label: position.label,
      }));
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to get positions"
      );
    }
  },

  getBranches: async (): Promise<{ label: string; value: string }[]> => {
    try {
      const response = await api.get("/branches");
      return response.data.branches.map((branches: any) => ({
        value: branches.id,
        label: branches.branch_name + " /" + branches.branch_code,
      }));
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch branches"
      );
    }
  },

  getAccounts: async (): Promise<any> => {
    try {
      const response = await api.get("/api/accounts");
      return response.data.accounts || [];
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch accounts"
      );
    }
  },

  uploadAvatar: async (formData: FormData): Promise<any> => {
    try {
      const response = await api.post("/upload_avatar", formData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Image upload failed"
      );
    }
  },

  // Profile management
  getProfile: async (id: number): Promise<any> => {
    try {
      const response = await api.get(`/api/profiles/${id}`);
      return response.data.profile || response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
        message: axiosError.response?.data?.message || "Failed to get profile",
      };
    }
  },

  updateProfile: async (id: number, updates: Partial<any>): Promise<any> => {
    try {
      const response = await api.put(`/api/profiles/${id}`, updates);
      return response.data.profile || response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
        message:
          axiosError.response?.data?.message || "Failed to update profile",
      };
    }
  },

  getSubmissions: async (
    searchTerm?: string,
    page?: number,
    perPage?: number,
    status?: string,
    quarter?: string,
    year?: string
  ): Promise<any> => {
    try {
      const response = await api.get(`/allEvaluations`, {
        params: {
          search: searchTerm || "",
          page: page,
          per_page: perPage,
          status: status || "",
          quarter: quarter || "",
          year: year || "",
        },
      });

      return response.data.evaluations;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
        message:
          axiosError.response?.data?.message || "Failed to fetch evaluations",
      };
    }
  },

  getSubmissionById: async (id: number | string): Promise<any> => {
    try {
      const response = await api.get(`/submissions/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
        message:
          axiosError.response?.data?.message || "Failed to update profile",
      };
    }
  },

  adminDashboard: async (): Promise<any> => {
    try {
      const response = await api.get(`/adminDashboard`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
        message:
          axiosError.response?.data?.message || "Failed to update profile",
      };
    }
  },

  createSubmission: async (
    submission: any,
    userId?: string | number
  ): Promise<any> => {
    try {
      // Use /submit/{user} if userId provided, otherwise fallback to /submissions
      const endpoint = userId ? `/submit/${userId}` : "/submissions";
      const response = await api.post(endpoint, submission);
      const data = response.data;

      if (data.success && data.submission) {
        return data.submission;
      }
      if (data.submission) {
        return data.submission;
      }
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to create submission"
      );
    }
  },

  updateSubmission: async (id: number, updates: any): Promise<any> => {
    try {
      const response = await api.put(`/submissions/${id}`, updates);
      const data = response.data;

      if (data.success && data.submission) {
        return data.submission;
      }
      if (data.submission) {
        return data.submission;
      }
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to update submission"
      );
    }
  },

  deleteSubmission: async (
    id: number
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const delete_eval = await api.post(`/deleteEval/${id}`);
      return delete_eval.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to delete submission"
      );
    }
  },

  updateSubmissionWithEmployeeSignature: async (
    submissionId: number,
    employeeSignature: string
  ): Promise<any> => {
    try {
      const response = await api.patch(
        `/submissions/${submissionId}/employee-approve`,
        {
          employeeSignature,
          employeeApprovedAt: new Date().toISOString(),
          approvalStatus: "employee_approved",
        }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to update employee signature"
      );
    }
  },

  // Approve evaluation by employee (matches documentation endpoint)
  approvedByEmployee: async (
    evaluationId: number,
    data?: any
  ): Promise<any> => {
    try {
      const response = await api.post(
        `/approvedByEmployee/${evaluationId}`,
        data || {}
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to approve evaluation by employee"
      );
    }
  },

  updateSubmissionWithEvaluatorSignature: async (
    submissionId: number,
    evaluatorSignature: string
  ): Promise<any> => {
    try {
      const response = await api.patch(
        `/submissions/${submissionId}/evaluator-approve`,
        {
          evaluatorSignature,
          evaluatorApprovedAt: new Date().toISOString(),
          approvalStatus: "fully_approved",
        }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to update evaluator signature"
      );
    }
  },

  bulkApproveSubmissions: async (
    submissionIds: number[]
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await api.patch("/submissions/bulk-approve", { submissionIds });
      return { success: true, message: "Submissions approved successfully" };
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to approve submissions"
      );
    }
  },

  updateApprovalStatus: async (
    submissionId: number,
    approvalStatus: string,
    additionalData?: any
  ): Promise<any> => {
    try {
      const response = await api.patch(
        `/submissions/${submissionId}/approval-status`,
        {
          approvalStatus,
          ...additionalData,
        }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to update approval status"
      );
    }
  },

  // Employee methods (uses getAllUsers endpoint)
  getEmployees: async (): Promise<any> => {
    try {
      const response = await api.get("/getAllActiveUsers");
      const data = response.data;

      if (data.success && data.users) {
        return data.users;
      }
      if (Array.isArray(data.users)) {
        return data.users;
      }
      if (Array.isArray(data)) {
        return data;
      }

      return [];
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch employees"
      );
    }
  },

  getEmployee: async (id: number): Promise<any> => {
    try {
      // First get all users, then filter by id
      const response = await api.get("/getAllActiveUsers");
      const data = response.data;

      let users: any[] = [];
      if (data.success && data.users) {
        users = data.users;
      } else if (Array.isArray(data.users)) {
        users = data.users;
      } else if (Array.isArray(data)) {
        users = data;
      }

      return (
        users.find((user: any) => user.id === id || user.employeeId === id) ||
        null
      );
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch employee"
      );
    }
  },

  getEmployeeByEmail: async (email: string): Promise<any> => {
    try {
      const response = await api.get("/getAllActiveUsers", {
        params: { email },
      });
      const data = response.data;

      let users: any[] = [];
      if (data.success && data.users) {
        users = data.users;
      } else if (Array.isArray(data.users)) {
        users = data.users;
      } else if (Array.isArray(data)) {
        users = data;
      }

      // Backend handles filtering, return first result or null
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch employee by email"
      );
    }
  },

  searchEmployees: async (query: string): Promise<any[]> => {
    try {
      const response = await api.get("/getAllActiveUsers", {
        params: { search: query },
      });
      const data = response.data;

      let users: any[] = [];
      if (data.success && data.users) {
        users = data.users;
      } else if (Array.isArray(data.users)) {
        users = data.users;
      } else if (Array.isArray(data)) {
        users = data;
      }

      // Backend handles filtering, return results as-is
      return users.slice(0, 20); // Limit to 20 results
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to search employees"
      );
    }
  },

  getEmployeesByDepartment: async (department: string): Promise<any[]> => {
    try {
      const response = await api.get("/getAllActiveUsers", {
        params: { department },
      });
      const data = response.data;

      let users: any[] = [];
      if (data.success && data.users) {
        users = data.users;
      } else if (Array.isArray(data.users)) {
        users = data.users;
      } else if (Array.isArray(data)) {
        users = data;
      }

      // Backend handles filtering, return results as-is
      return users;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch employees by department"
      );
    }
  },

  getEmployeesByRole: async (role: string): Promise<any[]> => {
    try {
      const response = await api.get("/getAllActiveUsers", {
        params: { role },
      });
      const data = response.data;

      let users: any[] = [];
      if (data.success && data.users) {
        users = data.users;
      } else if (Array.isArray(data.users)) {
        users = data.users;
      } else if (Array.isArray(data)) {
        users = data;
      }

      // Backend handles filtering, return results as-is
      return users;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch employees by role"
      );
    }
  },

  getEmployeeStats: async (): Promise<any> => {
    try {
      const response = await api.get("/getAllActiveUsers");
      const data = response.data;

      let users: any[] = [];
      if (data.success && data.users) {
        users = data.users;
      } else if (Array.isArray(data.users)) {
        users = data.users;
      } else if (Array.isArray(data)) {
        users = data;
      }

      // Calculate stats client-side
      return {
        total: users.length,
        active: users.filter((user: any) => user.isActive !== false).length,
        byRole: users.reduce((acc: any, user: any) => {
          const role =
            user.role || user.roles?.[0]?.name || user.roles?.[0] || "unknown";
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {}),
        byDepartment: users.reduce((acc: any, user: any) => {
          const dept = user.department || "unknown";
          acc[dept] = (acc[dept] || 0) + 1;
          return acc;
        }, {}),
      };
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch employee stats"
      );
    }
  },

  markNotificationAsRead: async (notificationId: number): Promise<void> => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to mark notification as read"
      );
    }
  },

  markAllNotificationsAsRead: async (userRole: string): Promise<void> => {
    try {
      await api.put("/notifications/read-all", null, {
        params: { role: userRole },
      });
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to mark all notifications as read"
      );
    }
  },

  // Utility methods
  getUserById: async (userId: number): Promise<any> => {
    try {
      const response = await api.get(`/users/${userId}`);
      const data = response.data;

      if (data.success && data.user) {
        return data.user;
      }
      if (data.user) {
        return data.user;
      }
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      // 404 is expected if endpoint doesn't exist yet
      if (axiosError.response?.status === 404) {
        throw new Error("User not found");
      }
      throw new Error(
        axiosError.response?.data?.message || "Failed to get user"
      );
    }
  },

  getProfiles: async (): Promise<any[]> => {
    try {
      const response = await api.get("/profiles");
      const data = response.data;

      if (data.success && data.profiles) {
        return data.profiles;
      }
      if (Array.isArray(data.profiles)) {
        return data.profiles;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch profiles"
      );
    }
  },

  // ============================================
  // USER MANAGEMENT (Missing Endpoints)
  // ============================================

  // Get all users (except authenticated user)
  getAllUsers: async (): Promise<any[]> => {
    try {
      const response = await api.get("/getAllUsers");
      const data = response.data;

      if (data.success && data.users) {
        return data.users;
      }
      if (Array.isArray(data.users)) {
        return data.users;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch all users"
      );
    }
  },

  // Get all branch heads/supervisors
  getAllBranchHeads: async (): Promise<any[]> => {
    try {
      const response = await api.get("/getAllBranchHeads");
      const data = response.data;

      if (data.success && data.users) {
        return data.users;
      }
      if (Array.isArray(data.users)) {
        return data.users;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch branch heads"
      );
    }
  },

  // Get all area managers
  getAllAreaManager: async (): Promise<any[]> => {
    try {
      const response = await api.get("/getAllAreaManager");
      const data = response.data;

      if (data.success && data.users) {
        return data.users;
      }
      if (Array.isArray(data.users)) {
        return data.users;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch area managers"
      );
    }
  },

  // Get all employees under authenticated user
  getAllEmployeeByAuth: async (): Promise<any[]> => {
    try {
      const response = await api.get("/getAllEmployeeByAuth");
      const data = response.data;

      if (data.success && data.users) {
        return data.users;
      }
      if (Array.isArray(data.users)) {
        return data.users;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch employees by auth"
      );
    }
  },

  // Get specific user
  showUser: async (userId: string | number): Promise<any> => {
    try {
      const response = await api.get(`/showUser/${userId}`);
      const data = response.data;

      if (data.success && data.user) {
        return data.user;
      }
      if (data.user) {
        return data.user;
      }
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch user"
      );
    }
  },

  // Add new user
  addUser: async (formData: FormData): Promise<any> => {
    try {
      const response = await api.post("/addUser", formData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to add user"
      );
    }
  },

  // Update branches for specific user
  updateUserBranch: async (
    userId: string | number,
    formData: FormData
  ): Promise<any> => {
    try {
      const response = await api.post(`/updateUserBranch/${userId}`, formData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to update user branches"
      );
    }
  },

  // Remove all assigned branches for specific user
  removeUserBranches: async (userId: string | number): Promise<any> => {
    try {
      const response = await api.post(`/removeUserBranches/${userId}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to remove user branches"
      );
    }
  },

  // Get total employees under a branch
  getTotalEmployeesBranch: async (
    searchValue: string,
    currentPage: number,
    itemsPerPage: number
  ): Promise<any> => {
    try {
      const response = await api.get("/getTotalEmployeesBranch", {
        params: {
          search: searchValue || "",
          page: currentPage,
          per_page: itemsPerPage,
        },
      });
      return response.data.branches;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch total employees by department"
      );
    }
  },

  // Get specific branch
  getBranch: async (branchId: string | number): Promise<any> => {
    try {
      const response = await api.get(`/branch/${branchId}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch branch"
      );
    }
  },

  // Add new branch
  addBranch: async (formData: FormData): Promise<any> => {
    try {
      const response = await api.post("/addBranch", formData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to add branch"
      );
    }
  },

  // Get total employees under a department
  getTotalEmployeesDepartments: async (
    searchValue: string,
    currentPage: number,
    itemsPerPage: number
  ): Promise<any> => {
    try {
      const response = await api.get("/getTotalEmployeesDepartments", {
        params: {
          search: searchValue || "",
          page: currentPage,
          per_page: itemsPerPage,
        },
      });
      return response.data.departments;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch total employees by department"
      );
    }
  },

  // Add new department
  addDepartment: async (name: string): Promise<any> => {
    try {
      const response = await api.post("/addDepartment", {
        department_name: name,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to add department"
      );
    }
  },

  // Delete department
  deleteDepartment: async (departmentId: string | number): Promise<any> => {
    try {
      const response = await api.post(`/deleteDepartment/${departmentId}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to delete department"
      );
    }
  },

  // Delete department
  deleteBranches: async (branchId: string | number): Promise<any> => {
    try {
      const response = await api.post(`/deleteBranch/${branchId}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to delete branch"
      );
    }
  },
  // ============================================
  // EVALUATION ENDPOINTS (Missing)
  // ============================================

  // Get evaluations by authenticated evaluator
  getEvalAuthEvaluator: async (): Promise<any[]> => {
    try {
      const response = await api.get("/getEvalAuthEvaluator");
      const data = response.data;

      if (data.success && data.evaluations) {
        return data.evaluations;
      }
      if (Array.isArray(data.evaluations)) {
        return data.evaluations;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch evaluator evaluations"
      );
    }
  },

  // Get evaluations by authenticated employee
  getMyEvalAuthEmployee: async (): Promise<any[]> => {
    try {
      const response = await api.get("/getMyEvalAuthEmployee");
      const data = response.data;

      if (data.success && data.evaluations) {
        return data.evaluations;
      }
      if (Array.isArray(data.evaluations)) {
        return data.evaluations;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch employee evaluations"
      );
    }
  },

  // Evaluator dashboard total cards
  evaluatorDashboard: async (): Promise<any> => {
    try {
      const response = await api.get("/evaluatorDashboard");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch evaluator dashboard data"
      );
    }
  },

  // HR dashboard total cards
  hrDashboard: async (): Promise<any> => {
    try {
      const response = await api.get("/hrDashboard");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch HR dashboard data"
      );
    }
  },

  // Employee dashboard total cards
  employeeDashboard: async (): Promise<any> => {
    try {
      const response = await api.get("/employeeDashboard");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to fetch employee dashboard data"
      );
    }
  },

  // ============================================
  // OTHER MISSING ENDPOINTS
  // ============================================

  // Get all roles
  getAllRoles: async (): Promise<any[]> => {
    try {
      const response = await api.get("/getAllRoles");
      const data = response.data;
      return data.roles;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message || "Failed to fetch roles"
      );
    }
  },

  // Mark notification as read
  isReadNotification: async (notificationId: number): Promise<any> => {
    try {
      const response = await api.post("/isReadNotification", {
        notificationId,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Failed to mark notification as read"
      );
    }
  },
};

export default apiService;
