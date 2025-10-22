// API Service Layer - replaces clientDataService for backend integration
import { AuthenticatedUser } from '@/contexts/UserContext';
import { PendingRegistration, Account } from './clientDataService';
import { CONFIG } from '../../config/config';

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Helper function to get auth token
// const getAuthToken = (): string | null => {
//   if (typeof window === 'undefined') return null;
//   return localStorage.getItem('authToken');
// };

// Helper function to make API requests
// const fetch = async (endpoint: string, options: RequestInit = {}) => {
//   const token = getAuthToken();
  
//   const config: RequestInit = {
//     headers: {
//       'Content-Type': 'application/json',
//       ...(token && { Authorization: `Bearer ${token}` }),
//       ...options.headers,
//     },
//     ...options,
//   };

//   const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
//   }
  
//   return response.json();
// };

export const apiService = {
  // Authentication
 login: async (username: string, password: string, rememberMe: boolean): Promise<any> => {
    const res = await fetch(`${CONFIG.API_URL}/login`, {
        method: "POST",
        headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
                username: username,
                password: password,
                remember: rememberMe, 
            }),
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


  logout: async (): Promise<any> => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });
  },

  getCurrentUser: async (): Promise<any> => {
    return fetch('/api/auth/me');
  },

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

  getPendingRegistrations: async (): Promise<any> => {
    const response = await fetch('/api/registrations');
    // return response.registrations || [];
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

  getAccounts: async (): Promise<any> => {
    const response = await fetch('/api/accounts');
    // return response.accounts || [];
  },

  // Profile management
  updateProfile: async (id: number, updates: any): Promise<any> => {
    const response = await fetch(`/api/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getProfile: async (id: number): Promise<any> => {
    try {
      const response = await fetch(`/api/profiles/${id}`);
      // return response.profile || null;
    } catch (error) {
      return null;
    }
  },
};

export default apiService;
