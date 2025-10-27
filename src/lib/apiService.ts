// API Service Layer - replaces clientDataService for backend integration
import { AuthenticatedUser } from '@/contexts/UserContext';
import { PendingRegistration, Account } from './clientDataService';
import { CONFIG } from '../../config/config';

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Helper function to get auth token
export const sanctum_csrf = async () => {
  await fetch(`${CONFIG.API_URL}/sanctum/csrf-cookie`, {
    credentials: 'include',
  });
};

export const apiService = {
  // Authentication
//  login: async (username: string, password: string) => {
//     await sanctum_csrf();
//     const res = await fetch(`${CONFIG.API_URL}/login`, {
//       method: 'POST',
//       credentials: 'include',
//       headers: {
//         'Content-Type': 'application/json',
//         Accept: 'application/json',
//       },
//       body: JSON.stringify({ username, password }),
//     });

//     const data = await res.json();

//     if (!res.ok) throw new Error(data.message || 'Invalid credentials');

//     return data;
//   },

//   getUser: async () => {
//     const res = await fetch(`${CONFIG.API_URL}/current_user`, {
//       credentials: 'include',
//     });

//     if (!res.ok) return null;

//     const data = await res.json();
//     return data.current_user || data; // handle both structures
//   },


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

  getPendingRegistrations: async (): Promise<any | null> => {
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
  updateProfile: async (id: number, updates: Partial<AuthenticatedUser>): Promise<any> => {
    const response = await fetch(`/api/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    // if (!response.success) {
    //   throw new Error(response.message || 'Profile update failed');
    // }

    // return response.profile;
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
