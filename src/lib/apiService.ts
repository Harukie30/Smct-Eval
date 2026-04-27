import { api, sanctum } from "./api";

/** Ask API for stable name order so OFFSET pagination does not overlap pages (backend may ignore). */
const USER_LIST_SORT_PARAMS = {
  sort: "lname",
  direction: "asc",
} as const;
import { EvaluationPayload } from "../components/evaluation/types";
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

  getSignatureResetRequests: async (searchTerm: string): Promise<any> => {
    const response = await api.get("/getAllSignatureReset", {
      params: {
        searchTerm: searchTerm || "",
      },
    });
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
        ...USER_LIST_SORT_PARAMS,
      },
    });
    return response.data.users || [];
  },

  getActiveRegistrations: async (
    searchTerm: string,
    role: string | number,
    page: number,
    perPage: number,
    branch?: string,
    department?: string
  ): Promise<any | null> => {
    const response = await api.get("/getAllActiveUsers", {
      params: {
        search: searchTerm || "",
        role: role || "",
        page: page,
        per_page: perPage,
        branch: branch || "",
        department: department || "",
        ...USER_LIST_SORT_PARAMS,
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

  getPositions: async (): Promise<
    {
      label: string;
      value: string;
      created_at?: string | null;
      updated_at?: string | null;
    }[]
  > => {
    const response = await api.get("/positions");
    return response.data.positions.map((position: any) => ({
      value: position.id,
      label: position.label,
      created_at: position.created_at ?? null,
      updated_at: position.updated_at ?? null,
    }));
  },

  // Add new position (HR/management maintenance)
  addPosition: async (label: string): Promise<any> => {
    const response = await api.post("/addPosition", {
      label,
    });
    return response.data;
  },

  // Update position by id (HR/management maintenance)
  updatePosition: async (
    positionId: string | number,
    label: string
  ): Promise<any> => {
    const response = await api.post(`/updatePosition/${positionId}`, {
      label,
    });
    return response.data;
  },

  // Delete position by id (HR/management maintenance)
  deletePosition: async (positionId: string | number): Promise<any> => {
    const response = await api.post(`/deletePosition/${positionId}`);
    return response.data;
  },

  getBranches: async (): Promise<{ label: string; value: string }[]> => {
    const response = await api.get("/branches");
    return response.data.branches.map((branches: any) => ({
      value: branches.id,
      label: branches.branch_name + " /" + branches.branch_code,
    }));
  },

  /** `branch` may be a comma-separated list of branch ids when filtering by multiple branches. */
  getSubmissions: async (
    searchTerm?: string,
    page?: number,
    perPage?: number,
    status?: string,
    quarter?: string,
    year?: string,
    rating?: string,
    branch?: string
  ): Promise<any> => {
    const response = await api.get(`/allEvaluations`, {
      params: {
        search: searchTerm || "",
        page: page,
        per_page: perPage,
        status: status || "",
        quarter: quarter || "",
        year: year || "",
        rating: rating || "",
        branch: branch || "",
      },
    });

    return response.data.evaluations;
  },

  getSubmissionById: async (id: number | string): Promise<any> => {
    const response = await api.get(`/submissions/${id}`);
    return response.data.user_eval;
  },

  getQuarters: async (id: number | string): Promise<any> => {
    const response = await api.get(`/getQuarters/${id}`);
    return response.data.data;
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
    employeeId: number | string,
    submission: EvaluationPayload
  ): Promise<any> => {
    const response = await api.post(`/submit/${employeeId}`, submission);
    return response.data;
  },

  updateSubmission: async (id: number, updates: any): Promise<any> => {
    const response = await api.put(`/submissions/${id}`, updates);
    return response.data;
  },

  deleteSubmission: async (
    id: number
  ): Promise<{ success: boolean; message: string }> => {
    const delete_eval = await api.post(`/deleteEval/${id}`);
    return delete_eval.data;
  },

  approvedByEmployee: async (evaluationId: number): Promise<any> => {
    const response = await api.post(`/approvedByEmployee/${evaluationId}`);
    return response.data;
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
    search?: string,
    per_page?: number,
    page?: number,
    position_filter?: number
  ): Promise<any> => {
    const response = await api.get("/getAllEmployeeByAuth", {
      params: {
        search: search || "",
        per_page: per_page || 10,
        page: page || 1,
        position_filter: position_filter || "",
        ...USER_LIST_SORT_PARAMS,
      },
    });
    const data = response.data;
    return data.employees;
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

  /**
   * Record a memorandum violation. Uses `FormData` fields (text-only now):
   * user_id, violation_date, title, summary, document.
   */
  addMemorandumViolation: async (
    formData: FormData
  ): Promise<any> => {
    const response = await api.post("/addMemorandumViolation", formData);
    return response.data;
  },

  /*
   * Logged-in employee: list memorandum violations recorded against them.
   * Query: search (title etc.), month (YYYY-MM, optional), page, per_page.
   * Backend should return a Laravel-style paginator or { data: [], total, ... }.
   */
  getMyMemorandumViolations: async (params: {
    search?: string;
    month?: string;
    page?: number;
    per_page?: number;
  }): Promise<any> => {
    const response = await api.get("/myMemorandumViolations", {
      params: {
        search: params.search?.trim() ?? "",
        month: params.month?.trim() ?? "",
        page: params.page ?? 1,
        per_page: params.per_page ?? 10,
      },
    });
    return response.data;
  },

  /**
   * HR (or authorized role): list memorandum violations for a specific user.
   * Backend: GET /showUserMemorandumViolation/{userId}
   */
  getUserMemorandumViolations: async (
    userId: string | number
  ): Promise<any> => {
    const response = await api.get(
      `/showUserMemorandumViolation/${encodeURIComponent(String(userId))}`
    );
    return response.data;
  },

  // Bulk register users (Excel/CSV upload)
  bulkRegisterUser: async (payload: Record<string, any>): Promise<any> => {
    const response = await api.post("/bulkRegisterUser", payload);
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

  // Get subordinates by branch or department
  getSubordinate: async (params: {
    branch_id?: number | string;
    department_id?: number | string;
    page?: number;
    per_page?: number;
  }): Promise<any> => {
    const response = await api.get("/getSubordinate", {
      params: {
        branch_id: params.branch_id ?? "",
        department_id: params.department_id ?? "",
        page: params.page ?? 1,
        per_page: params.per_page ?? 300,
      },
    });
    return response.data;
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

  // Get branch rank and file employees
  getBranchRankNFile: async (
  ): Promise<any> => {
    const response = await api.post("/BranchRankNFile", {
    });
    return response.data;
  },

  // Get branch basic employees
  getBranchBasic: async (
  ): Promise<any> => {
    const response = await api.post("/BranchBasic", {    
    });
    return response.data;
  },

  // Get head office basic employees
  postHoBasic: async (
    employeeId: number | string,
    submission: EvaluationPayload
  ): Promise<any> => {
    const response = await api.post(`/HoBasic/${employeeId}`, submission);
    return response.data;
  },
  // Get head office rank and file employees
  postHoRankNFile: async (
    employeeId: number | string,
    submission: EvaluationPayload
  ): Promise<any> => {
    const response = await api.post(`/HoRankNFile/${employeeId}`, submission);
    return response.data;
  },

  // Get branch basic employees
  postBranchBasic: async (
    employeeId: number | string,
    submission: EvaluationPayload
  ): Promise<any> => {
    const response = await api.post(`/BranchBasic/${employeeId}`, submission);
    return response.data;
  },

  // Area Manager evaluation (BranchBasicAreaManager)
  postBranchBasicAreaManager: async (
    employeeId: number | string,
    submission: EvaluationPayload
  ): Promise<any> => {
    const response = await api.post(`/BranchBasicAreaManager/${employeeId}`, submission);
    return response.data;
  },

  // Get branch rank and file employees
  postBranchRankNFile: async (
    employeeId: number | string,
    submission: EvaluationPayload
  ): Promise<any> => {
    const response = await api.post(`/BranchRankNFile/${employeeId}`, submission);
    return response.data;
  },

  // Get evaluations by authenticated evaluator
  getEvalAuthEvaluator: async (
    search: string,
    page: number,
    per_page: number,
    status: string,
    quarter: string,
    year: number
  ): Promise<any> => {
    const response = await api.get("/getEvalAuthEvaluator", {
      params: {
        search: search || "",
        page: page || 1,
        per_page: per_page || 10,
        status: status || "",
        quarter: quarter || "",
        year: year || "",
      },
    });
    return response.data;
  },

  // Get evaluations by authenticated employee
  getMyEvalAuthEmployee: async (
    search: string,
    page: number,
    per_page: number,
    selectedYear?: string,
    selectedQuarter?: string
  ): Promise<any> => {
    const response = await api.get("/getMyEvalAuthEmployee", {
      params: {
        search: search || "",
        page: page || 1,
        per_page: per_page || 10,
        year: selectedYear,
        quarter: selectedQuarter,
      },
    });
    return response.data;
  },

  // Evaluator dashboard total cards
  evaluatorDashboard: async (
    searchTerm: string,
    currentPage: number,
    itemsPerPage: number
  ): Promise<any> => {
    const response = await api.get("/evaluatorDashboard", {
      params: {
        search: searchTerm || "",
        page: currentPage || 1,
        per_page: itemsPerPage || 10,
      },
    });
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

  employeeDashboard2: async (employeeId: number): Promise<any> => {
    const response = await api.get(`/employeeDashboard2/${employeeId}`);
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