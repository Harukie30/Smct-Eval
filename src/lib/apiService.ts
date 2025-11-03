// API Service Layer - replaces clientDataService for backend integration
import { AuthenticatedUser } from '@/contexts/UserContext';
import { PendingRegistration, Account } from './clientDataService';
import { CONFIG } from '../../config/config';

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Helper function to get auth token
export const sanctum_csrf = async () => {
  await fetch(`http://localhost:8000/sanctum/csrf-cookie`, {
    credentials: 'include',
  });
};

export const apiService = {


  // Registration
  createPendingRegistration: async (formData: FormData): Promise<any> => {
  const res = await fetch(`${CONFIG.API_URL}/register`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
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


  updateEmployee_auth: async (formData: FormData): Promise<any> => {
    await sanctum_csrf();
    const res = await fetch(`${CONFIG.API_URL}/update_employee_auth`, {
          method: "POST",
          credentials: 'include',
          headers: {
            "Accept": "application/json",
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
      
  updateEmployee: async (formData: FormData, id :string | number): Promise<any> => {
    await sanctum_csrf();
    const res = await fetch(`${CONFIG.API_URL}/update_user/${id}`, {
          method: "POST",
          credentials: 'include',
          headers: {
            "Accept": "application/json",
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
  
  deleteUser: async (id :string | number): Promise<any> => {
    await sanctum_csrf();
    const res = await fetch(`${CONFIG.API_URL}/delete_user/${id}`, {
          method: "POST",
          credentials: 'include',
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
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
    try{
      const response = await fetch(`${CONFIG.API_URL}/getAll_Pending_users`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending registrations');
      }

      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error("Error fetching pending registrations:", error);
      return [];
    }
  },
  
  getActiveRegistrations: async (): Promise<any | null> => {
    try{
      const response = await fetch(`${CONFIG.API_URL}/getAll_Active_users`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active registrations');
      }

      const data = await response.json();
      return data.users ;
    } catch (error) {
      console.error("Error fetching active registrations:", error);
      return [];
    }
  },

  // Data
    getDepartments: async ():  Promise<{ label: string; value: string }[]> => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/departments`, {
          method: "GET",
        });
        if (!res.ok) {
          throw new Error('Failed to save departments');
        }
        const response = await res.json();
        return response.departments.map(
          (departments: any) => ({
            value: departments.id,
            label: departments.department_name,
          })
        );
      } catch (error) {
        console.error("Error fetching data:", error);
         return [];
      }
    },

    getPositions: async (): Promise<{ label: string; value: string }[]> => {
          try {
            const res = await fetch(`${CONFIG.API_URL}/positions`, { 
              method: "GET" 
            });
            
            if (!res.ok) {
               throw new Error('Failed to save positions');
            }
            const response = await res.json();
            return response.positions.map((position: any) => ({
              value: position.id,
              label: position.label,
            }));

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
        if (!res.ok) {
               throw new Error('Failed to save positions');
        }
        const response = await res.json();
        return response.branches.map((branches: any) => ({
          value: branches.id,
          label: branches.branch_name + " /" + branches.branch_code,
        }));
        } catch (error) {
        console.error("Error fetching data:", error);
        return [];
      }
    },

  getAccounts: async (): Promise<any> => {
    const response = await fetch('/api/accounts');
    // return response.accounts || [];
  },



uploadAvatar: async (formData : FormData): Promise<any> => {

    await sanctum_csrf();

    const response = await fetch(`${CONFIG.API_URL}/upload_avatar`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        "Accept": 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Image upload failed');
    }

    const data = await response.json();
    return data;
  },
}
export default apiService;
