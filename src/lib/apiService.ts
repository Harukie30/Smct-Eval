import { AuthenticatedUser } from "@/contexts/UserContext";
import { PendingRegistration, Account } from "./clientDataService";
import { CONFIG } from "../../config/config";
import { api, sanctum } from "./api";
import axios, { AxiosError } from "axios";

// Helper function to get CSRF cookie from Sanctum
export const sanctum_csrf = async () => {
  try {
    await axios.get("http://10.50.2.13:8000/sanctum/csrf-cookie");
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
    await sanctum_csrf();
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
    await sanctum_csrf();
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
    await sanctum_csrf();
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
    await sanctum_csrf();
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
    await sanctum_csrf();
    try {
      const response = await api.post(`/delete_user/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      throw {
        ...axiosError.response?.data,
        status: axiosError.response?.status || 500,
      };
    }
  },

  getPendingRegistrations: async (): Promise<any | null> => {
    try {
      const response = await api.get("/getPendingRegistrations");
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
    filters?: Record<string, string>
  ): Promise<any | null> => {
    try {
      const response = await api.get("/getAllActiveUsers", {
        params: filters,
      });
      return response.data.users;
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
    await sanctum_csrf();
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
    await sanctum_csrf();
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
    await sanctum_csrf();
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

  getSubmissions: async (): Promise<any> => {
    try {
      const response = await api.get(`/allEvaluations`);
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
};

export default apiService;
