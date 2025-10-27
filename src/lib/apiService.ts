// API Service Layer - replaces clientDataService for backend integration
import { AuthenticatedUser } from '@/contexts/UserContext';
import { PendingRegistration, Account } from './clientDataService';
import { CONFIG } from '../../config/config';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

// Helper function to make API requests
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

export const apiService = {
  // Authentication
<<<<<<< Updated upstream
<<<<<<< Updated upstream
  login: async (email: string, password: string): Promise<{ success: boolean; user?: AuthenticatedUser; message?: string; suspensionData?: any; pending?: boolean; pendingData?: any; token?: string }> => {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
=======
 login: async (username: string, password: string, rememberMe: boolean) => {
    await sanctum_csrf();

    const res = await fetch(`${CONFIG.API_URL}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ username, password, remember: rememberMe }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Invalid credentials');

    return data;
  },

  getUser: async () => {
    const res = await fetch(`${CONFIG.API_URL}/current_user`, {
      credentials: 'include',
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.current_user || data; // handle both structures
  },

  logout: async () => {
    await fetch(`${CONFIG.API_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
>>>>>>> Stashed changes
    });

    // Store token if login successful
    if (response.success && response.token) {
      localStorage.setItem('authToken', response.token);
    }

    return response;
  },

<<<<<<< Updated upstream
  logout: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiRequest('/api/auth/logout', {
=======
 login: async (username: string, password: string, rememberMe: boolean) => {
    await sanctum_csrf();

    const res = await fetch(`${CONFIG.API_URL}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ username, password, remember: rememberMe }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Invalid credentials');

    return data;
  },

  getUser: async () => {
    const res = await fetch(`${CONFIG.API_URL}/current_user`, {
      credentials: 'include',
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.current_user || data; // handle both structures
  },

  logout: async () => {
    await fetch(`${CONFIG.API_URL}/logout`, {
>>>>>>> Stashed changes
      method: 'POST',
      credentials: 'include',
    });

    // Remove token from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('authenticatedUser');

    return response;
  },

<<<<<<< Updated upstream
  getCurrentUser: async (): Promise<{ success: boolean; user?: AuthenticatedUser; message?: string }> => {
    return apiRequest('/api/auth/me');
  },
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

  // Registration
  createPendingRegistration: async (formData: FormData): Promise<any> => {
  const res = await fetch(`${CONFIG.API_URL}/register`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw {
            ...data,
            status: res.status,
          };
        }

        return data;
      },

  getPendingRegistrations: async (): Promise<PendingRegistration[]> => {
    const response = await apiRequest('/api/registrations');
    return response.registrations || [];
  },

  // Data
    getDepartments: async ():  Promise<{ label: string; value: string }[]> => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/departments`, {
          method: "GET",
        });
        if (res.ok) {
          const response = await res.json();
          return response.departments.map(
            (departments: any) => ({
              value: departments.id,
              label: departments.department_name,
            })
          );
        }
        return [];
      } catch (error) {
        console.error("Error fetching data:", error);
         return [];
      }
    },

    getPositions: async (): Promise<{ label: string; value: string }[]> => {
          try {
            const res = await fetch(`${CONFIG.API_URL}/positions`, { method: "GET" });

            if (res.ok) {
              const response = await res.json();
              return response.positions.map((position: any) => ({
                value: position.id,
                label: position.label,
              }));
            }

            return []; // default empty
          } catch (error) {
            console.error("Error fetching positions:", error);
            return [];
          }
        },

   getBranches: async ():  Promise<{ label: string; value: string }[]> => {
     try {
        const res = await fetch(`${CONFIG.API_URL}/branches`, {
          method: "GET",
        });
        if (res.ok) {
          const response = await res.json();
          return response.branches.map((branches: any) => ({
            value: branches.id,
            label: branches.branch_name + " /" + branches.branch_code,
          }));
        }
        return [];
        } catch (error) {
        console.error("Error fetching data:", error);
        return [];
      }
    },

  getAccounts: async (): Promise<Account[]> => {
    const response = await apiRequest('/api/accounts');
    return response.accounts || [];
  },

  // Profile management
  updateProfile: async (id: number, updates: Partial<AuthenticatedUser>): Promise<AuthenticatedUser> => {
    const response = await apiRequest(`/api/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!response.success) {
      throw new Error(response.message || 'Profile update failed');
    }

    return response.profile;
  },

  getProfile: async (id: number): Promise<AuthenticatedUser | null> => {
    try {
      const response = await apiRequest(`/api/profiles/${id}`);
      return response.profile || null;
    } catch (error) {
      return null;
    }
  },
};

export default apiService;
