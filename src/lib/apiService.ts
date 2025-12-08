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
    const response = await api.get("/getSignatureResetRequests");
    return response.data;
  },

  approveSignatureReset: async (userId: number | string): Promise<any> => {
    const response = await api.post(`/approveSignatureReset/${userId}`);
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
    const response = await api.get("/api/accounts");
    return response.data.accounts || [];
  },

  uploadAvatar: async (formData: FormData): Promise<any> => {
    const response = await api.post("/uploadAvatar", formData);
    return response.data;
  },

  // Profile management
  getProfile: async (id: number): Promise<any> => {
    const response = await api.get(`/api/profiles/${id}`);
    return response.data.profile || response.data;
  },

  updateProfile: async (id: number, updates: Partial<any>): Promise<any> => {
    const response = await api.put(`/api/profiles/${id}`, updates);
    return response.data.profile || response.data;
  },

  getSubmissions: async (
    searchTerm?: string,
    page?: number,
    perPage?: number,
    status?: string,
    quarter?: string,
    year?: string
  ): Promise<any> => {
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
    submission: any,
    userId?: string | number
  ): Promise<any> => {
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
  approvedByEmployee: async (
    evaluationId: number,
    data?: any
  ): Promise<any> => {
    const response = await api.post(
      `/approvedByEmployee/${evaluationId}`,
      data || {}
    );
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

  markNotificationAsRead: async (notificationId: number): Promise<void> => {
    await api.put(`/notifications/${notificationId}/read`);
  },

  markAllNotificationsAsRead: async (userRole: string): Promise<void> => {
    await api.put("/notifications/read-all", null, {
      params: { role: userRole },
    });
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
  getAllEmployeeByAuth: async (): Promise<any[]> => {
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
    return response.data.branches;
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
  getMyEvalAuthEmployee: async (): Promise<any[]> => {
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
