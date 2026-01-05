import { api, sanctum } from "./api";

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
    const response = await api.post("/login", { email, password });
    return response.data;
  },

  logout: async (): Promise<any> => {
    const response = await api.post("/logout");
    return response.data;
  },

  // Get current authenticated user
  authUser: async (): Promise<any> => {
    const response = await api.get("/profile");
    return response.data;
  },

  // Registration
  createPendingRegistration: async (formData: FormData): Promise<any> => {
    const response = await api.post("/register", formData);
    return response.data;
  },

  updateEmployee_auth: async (formData: FormData): Promise<any> => {
    const response = await api.post("/updateProfileUserAuth", formData);
    return response.data;
  },

  requestSignatureReset: async (): Promise<any> => {
    const response = await api.post("/requestSignatureReset");
    return response.data;
  },

  getSignatureResetRequests: async (): Promise<any> => {
    const response = await api.get("/getAllSignatureReset");
    return response.data.users;
  },

  approveSignatureReset: async (userId: number | string): Promise<any> => {
    const response = await api.post(`/approvedSignatureReset/${userId}`);
    return response.data;
  },

  rejectSignatureReset: async (userId: number | string): Promise<any> => {
    const response = await api.post(`/rejectSignatureReset/${userId}`);
    return response.data;
  },

  updateEmployee: async (
    formData: FormData,
    id: string | number
  ): Promise<any> => {
    const response = await api.post(`/updateUser/${id}`, formData);
    return response.data;
  },

  approveRegistration: async (id: string | number): Promise<any> => {
    const response = await api.post(`/approveRegistration/${id}`);
    return response.data;
  },

  rejectRegistration: async (id: string | number): Promise<any> => {
    const response = await api.post(`/rejectRegistration/${id}`);
    return response.data;
  },

  deleteUser: async (id: string | number): Promise<any> => {
    const response = await api.post(`/deleteUser/${id}`);
    return response.data;
  },

  getPendingRegistrations: async (
    searchTerm: string,
    status: string | number,
    page: number,
    perPage: number
  ): Promise<any | null> => {
    const response = await api.get("/getPendingRegistrations", {
      params: {
        search: searchTerm || "",
        status: status || "",
        page: page,
        per_page: perPage,
      },
    });
    return response.data.users || [];
  },

  getActiveRegistrations: async (
    searchTerm: string,
    role: string | number,
    page: number,
    perPage: number
  ): Promise<any | null> => {
    const response = await api.get("/getAllActiveUsers", {
      params: {
        search: searchTerm || "",
        role: role || "",
        page: page,
        per_page: perPage,
      },
    });
    return response.data.users || [];
  },

  getDepartments: async (): Promise<{ label: string; value: string }[]> => {
    const response = await api.get("/departments");
    return response.data.departments.map((departments: any) => ({
      value: departments.id,
      label: departments.department_name,
    }));
  },

  getPositions: async (): Promise<{ label: string; value: string }[]> => {
    const response = await api.get("/positions");
    return response.data.positions.map((position: any) => ({
      value: position.id,
      label: position.label,
    }));
  },

  getBranches: async (): Promise<{ label: string; value: string }[]> => {
    const response = await api.get("/branches");
    return response.data.branches.map((branches: any) => ({
      value: branches.id,
      label: branches.branch_name + " /" + branches.branch_code,
    }));
  },

  getAccounts: async (): Promise<any> => {
    try {
      // Use getAllUsers endpoint instead of /accounts (which returns 404)
      const response = await api.get("/getAllUsers");
      const data = response.data;

      // Handle different response formats similar to showUser pattern
      if (data.success && data.users) {
        return data.users;
      }
      if (Array.isArray(data.users)) {
        return data.users;
      }
      if (data.accounts && Array.isArray(data.accounts)) {
        return data.accounts;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error: any) {
      console.error("Error fetching accounts:", error);
      // Return empty array on error to prevent crashes
      return [];
    }
  },

  uploadAvatar: async (formData: FormData): Promise<any> => {
    const response = await api.post("/uploadAvatar", formData);
    return response.data;
  },

  // Profile management
  getProfile: async (id: number): Promise<any> => {
    const response = await api.get(`/profiles/${id}`);
    return response.data.profile || response.data;
  },

  updateProfile: async (id: number, updates: Partial<any>): Promise<any> => {
    const response = await api.put(`/profiles/${id}`, updates);
    return response.data.profile || response.data;
  },

  getSubmissions: async (
    searchTerm?: string,
    page?: number,
    perPage?: number,
    status?: string,
    quarter?: string,
    year?: string,
    getAll?: boolean // New parameter: if true, get all submissions (for HR/Admin)
  ): Promise<any> => {
    try {
      // For HR/Admin, use /allEvaluations endpoint to get ALL evaluations
      // For regular evaluators, use /getEvalAuthEvaluator to get only their evaluations
      const endpoint = getAll ? `/allEvaluations` : `/getEvalAuthEvaluator`;

      const response = await api.get(endpoint, {
        params: {
          search: searchTerm || "",
          page: page,
          per_page: perPage,
          status: status || "",
          quarter: quarter || "",
          year: year || "",
        },
      });

      // Add safety check to prevent "Cannot read properties of undefined" error
      if (!response || !response.data) {
        console.error("API response is undefined or missing data");
        return {
          data: [],
          total: 0,
          last_page: 1,
          per_page: perPage || 5,
        };
      }

      const data = response.data;

      // Handle /allEvaluations endpoint response: { evaluations: [...] }
      // This endpoint returns response.data.evaluations directly
      if (getAll && data.evaluations) {
        // If evaluations is an array, return it directly
        if (Array.isArray(data.evaluations)) {
          return {
            data: data.evaluations,
            total: data.total || data.evaluations.length,
            last_page: data.last_page || 1,
            per_page: data.per_page || perPage || 5,
          };
        }
        // If evaluations has nested data structure: { evaluations: { data: [...], total: X, ... } }
        if (data.evaluations.data && Array.isArray(data.evaluations.data)) {
          return {
            data: data.evaluations.data,
            total: data.evaluations.total || 0,
            last_page: data.evaluations.last_page || 1,
            per_page: data.evaluations.per_page || perPage || 5,
          };
        }
      }

      // Handle /getEvalAuthEvaluator endpoint response (for regular evaluators)
      // First check for myEval_as_Evaluator structure (like other evaluator endpoints)
      if (data.myEval_as_Evaluator) {
        if (
          data.myEval_as_Evaluator.data &&
          Array.isArray(data.myEval_as_Evaluator.data)
        ) {
          return {
            data: data.myEval_as_Evaluator.data,
            total: data.myEval_as_Evaluator.total || 0,
            last_page: data.myEval_as_Evaluator.last_page || 1,
            per_page: data.myEval_as_Evaluator.per_page || perPage || 5,
          };
        }
        // If myEval_as_Evaluator is directly an array
        if (Array.isArray(data.myEval_as_Evaluator)) {
          return {
            data: data.myEval_as_Evaluator,
            total: data.total || data.myEval_as_Evaluator.length,
            last_page: data.last_page || 1,
            per_page: data.per_page || perPage || 5,
          };
        }
      }

      // Handle nested structure: { evaluations: { data: [...], total: X, ... } }
      if (
        data.evaluations &&
        data.evaluations.data &&
        Array.isArray(data.evaluations.data)
      ) {
        return {
          data: data.evaluations.data,
          total: data.evaluations.total || 0,
          last_page: data.evaluations.last_page || 1,
          per_page: data.evaluations.per_page || perPage || 5,
        };
      }

      // Handle structure: { evaluations: [...], total: X, ... }
      if (data.evaluations && Array.isArray(data.evaluations)) {
        return {
          data: data.evaluations,
          total: data.total || data.evaluations.length,
          last_page: data.last_page || 1,
          per_page: data.per_page || perPage || 5,
        };
      }

      // Handle direct array response
      if (Array.isArray(data)) {
        return {
          data: data,
          total: data.length,
          last_page: 1,
          per_page: perPage || 5,
        };
      }

      // Fallback: return the data as-is if structure is different
      return {
        data: data.data || [],
        total: data.total || 0,
        last_page: data.last_page || 1,
        per_page: data.per_page || perPage || 5,
      };
    } catch (error) {
      console.error("Error fetching submissions:", error);
      return {
        data: [],
        total: 0,
        last_page: 1,
        per_page: perPage || 5,
      };
    }
  },

  getSubmissionById: async (id: number | string): Promise<any> => {
    const response = await api.get(`/submissions/${id}`);
    return response.data.user_eval;
  },

  getAllYears: async (): Promise<any> => {
    const response = await api.get(`getAllYears`);
    return response.data.years;
  },

  adminDashboard: async (): Promise<any> => {
    const response = await api.get(`/adminDashboard`);
    return response.data;
  },

  createSubmission: async (
    userId: string | number,
    submission: any
  ): Promise<any> => {
    // Use /submit/{user} if userId provided, otherwise fallback to /submissions
    //const endpoint = userId ? `` : "/submissions";
    const response = await api.post(`submit/${userId}`, submission);
    const data = response.data;

    if (data.success && data.submission) {
      return data.submission;
    }
    if (data.submission) {
      return data.submission;
    }
    return data;
  },

  updateSubmission: async (id: number, updates: any): Promise<any> => {
    const response = await api.put(`/submissions/${id}`, updates);
    const data = response.data;

    if (data.success && data.submission) {
      return data.submission;
    }
    if (data.submission) {
      return data.submission;
    }
    return data;
  },

  deleteSubmission: async (
    id: number
  ): Promise<{ success: boolean; message: string }> => {
    const delete_eval = await api.post(`/deleteEval/${id}`);
    return delete_eval.data;
  },

  updateSubmissionWithEmployeeSignature: async (
    submissionId: number,
    employeeSignature: string
  ): Promise<any> => {
    const response = await api.patch(
      `/submissions/${submissionId}/employee-approve`,
      {
        employeeSignature,
        employeeApprovedAt: new Date().toISOString(),
        approvalStatus: "employee_approved",
      }
    );
    return response.data;
  },

  // Approve evaluation by employee (matches documentation endpoint)
  approvedByEmployee: async (evaluationId: number): Promise<any> => {
    const response = await api.post(`/approvedByEmployee/${evaluationId}`);
    return response.data;
  },

  updateSubmissionWithEvaluatorSignature: async (
    submissionId: number,
    evaluatorSignature: string
  ): Promise<any> => {
    const response = await api.patch(
      `/submissions/${submissionId}/evaluator-approve`,
      {
        evaluatorSignature,
        evaluatorApprovedAt: new Date().toISOString(),
        approvalStatus: "fully_approved",
      }
    );
    return response.data;
  },

  bulkApproveSubmissions: async (
    submissionIds: number[]
  ): Promise<{ success: boolean; message: string }> => {
    await api.patch("/submissions/bulk-approve", { submissionIds });
    return { success: true, message: "Submissions approved successfully" };
  },

  updateApprovalStatus: async (
    submissionId: number,
    approvalStatus: string,
    additionalData?: any
  ): Promise<any> => {
    const response = await api.patch(
      `/submissions/${submissionId}/approval-status`,
      {
        approvalStatus,
        ...additionalData,
      }
    );
    return response.data;
  },

  // Employee methods (uses getAllUsers endpoint)
  getEmployees: async (): Promise<any> => {
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
  },

  getEmployee: async (id: number): Promise<any> => {
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
  },

  getEmployeeByEmail: async (email: string): Promise<any> => {
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
  },

  searchEmployees: async (query: string): Promise<any[]> => {
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
  },

  getEmployeesByDepartment: async (department: string): Promise<any[]> => {
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
  },

  getEmployeesByRole: async (role: string): Promise<any[]> => {
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
  },

  getEmployeeStats: async (): Promise<any> => {
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
  },

  markNotificationAsRead: async (
    notificationId: string | number
  ): Promise<void> => {
    await api.post(`/isReadNotification/${notificationId}`);
  },

  markAllNotificationsAsRead: async (): Promise<void> => {
    await api.post("/markAllAsRead");
  },

  deleteNotification: async (
    notificationId: string | number
  ): Promise<void> => {
    await api.post(`/deleteNotification/${notificationId}`);
  },

  // Utility methods
  getUserById: async (userId: number): Promise<any> => {
    const response = await api.get(`/users/${userId}`);
    const data = response.data;

    if (data.success && data.user) {
      return data.user;
    }
    if (data.user) {
      return data.user;
    }
    return data;
  },

  getProfiles: async (): Promise<any[]> => {
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
  },

  // ============================================
  // USER MANAGEMENT (Missing Endpoints)
  // ============================================

  // Get all users (except authenticated user)
  getAllUsers: async (): Promise<any[]> => {
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
  },

  // Get all branch heads/supervisors
  getAllBranchHeads: async (): Promise<any[]> => {
    const response = await api.get("/getAllBranchHeads");
    const data = response.data.branch_heads;

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
  },

  // Get all area managers
  getAllAreaManager: async (): Promise<any> => {
    const response = await api.get("/getAllAreaManager");
    return response.data.branch_heads;
  },

  // Get all employees under authenticated user
  getAllEmployeeByAuth: async (
    searchValue?: string,
    page?: number,
    perPage?: number,
    positionFilter?: string
  ): Promise<any> => {
    try {
      const response = await api.get("/getAllEmployeeByAuth", {
        params: {
          search: searchValue || "",
          page: page || 1,
          per_page: perPage || 10,
          position: positionFilter || "",
        },
      });

      // Add safety check to prevent "Cannot read properties of undefined" error
      if (!response || !response.data) {
        console.error("API response is undefined or missing data");
        return {
          data: [],
          total: 0,
          last_page: 1,
          per_page: perPage || 10,
        };
      }

      const data = response.data;

      // Handle response with employees wrapper: { employees: { data: [...], total: X, ... } }
      // This is the ACTUAL structure from the API
      if (
        data &&
        data.employees &&
        data.employees.data &&
        Array.isArray(data.employees.data)
      ) {
        return {
          data: data.employees.data,
          total: data.employees.total || 0,
          last_page: data.employees.last_page || 1,
          per_page: data.employees.per_page || perPage || 10,
        };
      }

      // Handle Laravel paginated response (data.data array) - Fallback structure
      // Response structure: { current_page: 1, data: [...], total: X, last_page: Y, per_page: Z }
      if (
        data &&
        typeof data === "object" &&
        data.hasOwnProperty("data") &&
        Array.isArray(data.data)
      ) {
        return {
          data: data.data,
          total: data.total || 0,
          last_page: data.last_page || 1,
          per_page: data.per_page || perPage || 10,
        };
      }

      // Handle response with users array (success.users)
      if (data.success && data.users && Array.isArray(data.users)) {
        return {
          data: data.users,
          total: data.total || data.users.length,
          last_page: data.last_page || 1,
          per_page: data.per_page || perPage || 10,
        };
      }

      // Handle response with employees array
      if (data.employees && Array.isArray(data.employees)) {
        return {
          data: data.employees,
          total: data.total || data.employees.length,
          last_page: data.last_page || 1,
          per_page: data.per_page || perPage || 10,
        };
      }

      // Handle direct users array (without success flag)
      if (Array.isArray(data.users)) {
        return {
          data: data.users,
          total: data.total || data.users.length,
          last_page: data.last_page || 1,
          per_page: data.per_page || perPage || 10,
        };
      }

      // Handle direct array response
      if (Array.isArray(data)) {
        return {
          data: data,
          total: data.length,
          last_page: 1,
          per_page: data.length,
        };
      }

      // Fallback: Try to find any array in the response
      for (const key in data) {
        if (Array.isArray(data[key])) {
          return {
            data: data[key],
            total: data.total || data[key].length,
            last_page: data.last_page || 1,
            per_page: data.per_page || perPage || 10,
          };
        }
      }

      // Return empty paginated structure if no data
      return {
        data: [],
        total: 0,
        last_page: 1,
        per_page: perPage || 10,
      };
    } catch (error: any) {
      // Handle 401 Unauthorized errors gracefully
      if (error.response?.status === 401) {
        console.warn("Unauthorized: User authentication may have expired");
        // Return empty data structure instead of throwing
        return {
          data: [],
          total: 0,
          last_page: 1,
          per_page: perPage || 10,
        };
      }

      // Re-throw other errors
      throw error;
    }
  },

  // Get specific user
  showUser: async (userId: string | number): Promise<any> => {
    const response = await api.get(`/showUser/${userId}`);
    const data = response.data;

    if (data.success && data.user) {
      return data.user;
    }
    if (data.user) {
      return data.user;
    }
    return data;
  },

  // Add new user
  addUser: async (formData: FormData): Promise<any> => {
    const response = await api.post("/addUser", formData);
    return response.data;
  },

  // Update branches for specific user
  updateUserBranch: async (
    userId: string | number,
    formData: FormData
  ): Promise<any> => {
    const response = await api.post(`/updateUserBranch/${userId}`, formData);
    return response.data;
  },

  // Remove all assigned branches for specific user
  removeUserBranches: async (userId: string | number): Promise<any> => {
    const response = await api.post(`/removeUserBranches/${userId}`);
    return response.data;
  },

  // Get total employees under a branch
  getTotalEmployeesBranch: async (
    searchValue: string,
    currentPage: number,
    itemsPerPage: number
  ): Promise<any> => {
    const response = await api.get("/getTotalEmployeesBranch", {
      params: {
        search: searchValue || "",
        page: currentPage,
        per_page: itemsPerPage,
      },
    });
    // Add safety check to prevent "Cannot read properties of undefined" error
    if (!response || !response.data) {
      console.error("API response is undefined or missing data");
      return null;
    }
    return response.data.branches || response.data || null;
  },

  // Get specific branch
  getBranch: async (branchId: string | number): Promise<any> => {
    const response = await api.get(`/branch/${branchId}`);
    return response.data;
  },

  // Add new branch
  addBranch: async (formData: {}): Promise<any> => {
    const response = await api.post("/addBranch", formData);
    return response.data;
  },

  // Get total employees under a department
  getTotalEmployeesDepartments: async (
    searchValue: string,
    currentPage: number,
    itemsPerPage: number
  ): Promise<any> => {
    const response = await api.get("/getTotalEmployeesDepartments", {
      params: {
        search: searchValue || "",
        page: currentPage,
        per_page: itemsPerPage,
      },
    });
    return response.data.departments;
  },

  // Add new department
  addDepartment: async (name: string): Promise<any> => {
    const response = await api.post("/addDepartment", {
      department_name: name,
    });
    return response.data;
  },

  // Delete department
  deleteDepartment: async (departmentId: string | number): Promise<any> => {
    const response = await api.post(`/deleteDepartment/${departmentId}`);
    return response.data;
  },

  // Delete department
  deleteBranches: async (branchId: string | number): Promise<any> => {
    const response = await api.post(`/deleteBranch/${branchId}`);
    return response.data;
  },

  // Get evaluations by authenticated evaluator
  getEvalAuthEvaluator: async (): Promise<any[]> => {
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
  },

  // Get evaluations by authenticated employee
  getMyEvalAuthEmployee: async (
    searchValue?: string,
    page?: number,
    perPage?: number,
    year?: string,
    quarter?: string
  ): Promise<any> => {
    const response = await api.get("/getMyEvalAuthEmployee", {
      params: {
        search: searchValue || "",
        page: page || 1,
        per_page: perPage || 10,
        year: year || "",
        quarter: quarter || "",
      },
    });
    const data = response.data;

    // Handle paginated response
    if (data.myEval_as_Employee) {
      return data;
    }

    // Handle non-paginated response (fallback)
    if (data.success && data.evaluations) {
      return {
        myEval_as_Employee: {
          data: data.evaluations,
          total: data.evaluations.length,
          last_page: 1,
          per_page: perPage || 10,
        },
      };
    }
    if (Array.isArray(data.evaluations)) {
      return {
        myEval_as_Employee: {
          data: data.evaluations,
          total: data.evaluations.length,
          last_page: 1,
          per_page: perPage || 10,
        },
      };
    }
    if (Array.isArray(data)) {
      return {
        myEval_as_Employee: {
          data: data,
          total: data.length,
          last_page: 1,
          per_page: perPage || 10,
        },
      };
    }
    return {
      myEval_as_Employee: {
        data: [],
        total: 0,
        last_page: 1,
        per_page: perPage || 10,
      },
    };
  },

  // Get quarters/reviews for an employee
  getQuarters: async (employeeId: number): Promise<any> => {
    const response = await api.get(`/getQuarters/${employeeId}`);
    return response.data;
  },

  // Evaluator dashboard total cards
  evaluatorDashboard: async (): Promise<any> => {
    const response = await api.get("/evaluatorDashboard");
    return response.data;
  },

  // HR dashboard total cards
  hrDashboard: async (): Promise<any> => {
    const response = await api.get("/hrDashboard");
    return response.data;
  },

  // Employee dashboard total cards
  employeeDashboard: async (): Promise<any> => {
    const response = await api.get("/employeeDashboard");
    return response.data;
  },

  // ============================================
  // OTHER MISSING ENDPOINTS
  // ============================================

  // Get all roles
  getAllRoles: async (): Promise<any[]> => {
    const response = await api.get("/getAllRoles");
    const data = response.data;
    return data.roles;
  },

  // Mark notification as read
  isReadNotification: async (notificationId: number): Promise<any> => {
    const response = await api.post("/isReadNotification", {
      notificationId,
    });
    return response.data;
  },
};

export default apiService;
