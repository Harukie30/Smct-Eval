// API Service Layer - replaces clientDataService for backend integration
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
     try {
        const res = await fetch(`${CONFIG.API_URL}/current_user`,
        { method: "GET" }
        );
        if(res.ok){
          const response = await res.json();
          return response ;
        }
      } catch (error) {
        return null;
      }
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
    try{
      const res = await fetch(`${CONFIG.API_URL}/getAll_Pending_users`,{
        method: "get"
      });
      if(res.ok){
        const response = await res.json();
        return response;
      }
      return [];
    }catch(error){
      console.log('Error fetching data:',error);
      return [];
    }
   
  },
  
  getActiveUsers: async (): Promise<any> => {
    try{
      const res = await fetch(`${CONFIG.API_URL}/getAll_Active_users`,{
        method: "get"
      });
      if(res.ok){
        const response = await res.json();
        return response;
      }
      return [];
    }catch(error){
      console.log('Error fetching data:',error);
      return [];
    }
   
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

  getUsers: async (): Promise<any> => {
    try{

      const response = await fetch(`${CONFIG.API_URL}/users`, {
        method: 'GET',
      });
      if(response.ok){
        const data = await response.json();
        return data;
      }
      return [];
    }catch(error){
      console.log('Error fetching accounts:', error);
      return [];
    }
  },

  // Profile management
  updateProfile: async (id: number, updates: any): Promise<any> => {
    const response = await fetch('${}', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getProfile: async (id: number): Promise<any> => {
    try {
      const res = await fetch(`${CONFIG.API_URL}/profile?${id}`,
      { method: "GET" }
      );
      if(res.ok){
        const response = await res.json();
        return response ;
      }
    } catch (error) {
      return null;
    }
  },
};

export default apiService;
