// API Service Layer - replaces clientDataService for backend integration
import { CONFIG } from '../../config/config';

const sanctum_csrf = async ():Promise<any> => {
   await fetch(`http://localhost:8000/sanctum/csrf-cookie`, {
    method: 'GET',
    credentials: 'include', 
  });
}

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
    try {
      await sanctum_csrf();

      const res = await fetch(`${CONFIG.API_URL}/login`, {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ username, password, remember: rememberMe }),
      });

      const response = await res.json();

      if (!res.ok) {
        throw { ...response, status: res.status };
      }
      return response;
    } catch (error) {
      throw error;
    }
  },


  logout: async (): Promise<any> => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });
  },

  getCurrentUser: async (): Promise<any> => {
     try {
        const res = await fetch(`${CONFIG.API_URL}/current_user`,
        {
          method: "GET",
          credentials: 'include',
          headers :  {
                  "Content-Type": "application/json",
                  "Accept": "application/json",
          }
        }
        );
        const response = await res.json();
           if (!res.ok) {
                 throw { ...response, status: res.status };
            }
          return response;
      } catch (error) {
        // rethrow so the caller knows login failed
        throw error;
      }
    },

  // Registration
  createPendingRegistration: async (formData: FormData): Promise<any> => {
    try{
      await sanctum_csrf();
      const res = await fetch(`${CONFIG.API_URL}/register`, 
        {
        method: "POST",
        headers: {
            "Accept": "application/json",
          }, 
        body: formData
        });
        const response = await res.json();
        if (!res.ok) {
         throw { ...response , status: res.status }
        }
        return response;
      }catch(error){
        console.log('Error fetching data;', error);
        throw error;
      }
    },

  getPendingRegistrations: async (): Promise<any> => {
    try{
      const res = await fetch(`${CONFIG.API_URL}/getAll_Pending_users`,
      {
        method: "GET",
        credentials: 'include',
        headers: {
          "Accept": 'application/json'
        }
      });
      const response = await res.json();
        if (!res.ok) {
         throw { ...response , status: res.status }
        }
        return response;
      }catch(error){
        console.log('Error fetching data;', error);
        throw error;
      }
    },
  
  getActiveUsers: async (): Promise<any> => {
    try{
      const res = await fetch(`${CONFIG.API_URL}/getAll_Active_users`,
      {
        method: "GET",
        credentials: 'include',
        headers: {
          "Accept": 'application/json'
        }
      });
       const response = await res.json();
        if (!res.ok) {
         throw { ...response , status: res.status }
        }
        return response;
      }catch(error){
        console.log('Error fetching data;', error);
        throw error;
      }
    },

  // Data
    getDepartments: async ():  Promise<{ label: string; value: string }[]> => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/departments`, 
        {
          method: "GET",
          headers: {
            "Accept": 'application/json'
          }
        });
        const response = await res.json(); 
        if (!res.ok) {
          throw { ...response, status: res.status }
        } 
        return response.departments.map(
          (departments: any) => ({
            value: departments.id,
            label: departments.department_name,
          })
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
      }
    },

    getPositions: async (): Promise<{ label: string; value: string }[]> => {
          try {
            const res = await fetch(`${CONFIG.API_URL}/positions`, 
              { 
                method: "GET" ,
                headers: {
                      "Accept":'application/json'
                    }
              });
            const response = await res.json();
            if (!res.ok) {
              throw { ...response , status: res.status }
            }
            return response.positions.map((position: any) => ({
              value: position.id,
              label: position.label,
            })); 
          } catch (error) {
            console.error("Error fetching positions:", error);
           throw error;
          }
        },

   getBranches: async ():  Promise<{ label: string; value: string }[]> => {
     try {
        const res = await fetch(`${CONFIG.API_URL}/branches`, {
          method: "GET",
          headers: {
            "Accept":'application/json'
            }
        });
        const response = await res.json();
        if (!res.ok) {
          throw { ...response, status: res.status }
        }
        return response.branches.map((branches: any) => ({
          value: branches.id,
          label: branches.branch_name + " /" + branches.branch_code,
        }));
        } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
      }
    },

  getUsers: async (): Promise<any> => {
    try{
      const res = await fetch(`${CONFIG.API_URL}/users`, 
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          "Accept":'application/json'
        }
      });
      const response = await res.json();
        if (!res.ok) {
         throw { ...response , status: res.status }
        }
        return response;
      }catch(error){
        console.log('Error fetching data;', error);
        throw error;
      }
    },

  // Profile management
  updateProfile: async (formData: FormData): Promise<any> => {
    try{
          await sanctum_csrf();
          const res = await fetch(`${CONFIG.API_URL}/update`, 
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Accept':'application/json'
          },
          body: formData
        });
        const response = await res.json();
        if (!res.ok) {
         throw { ...response , status: res.status }
        }
        return response;
      }catch(error){
        console.log('Error fetching data;', error);
        throw error;
      }
    },


}
export default apiService;
