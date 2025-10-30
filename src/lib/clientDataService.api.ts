// API-enabled version of clientDataService
// This replaces the localStorage version with API calls

import apiService from './apiService';
import { Employee, Submission, PendingRegistration, Profile, Account, Notification } from './clientDataService';

export const clientDataService = {
  // Authentication - now uses API with Laravel Sanctum cookies
  login: async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password, true); // Always remember login
      
      // Laravel Sanctum uses HTTP-only cookies (no token in response)
      // The session cookie is automatically set by the browser
      return {
        success: true,
        user: response.user || response.current_user,
        message: undefined,
        suspensionData: undefined,
        pending: false,
        pendingData: undefined,
      };
    } catch (error: any) {
      // Check if it's a suspension error (403 status)
      if (error.message?.includes('suspended') || error.message?.includes('Suspended')) {
        return {
          success: false,
          message: 'Account suspended',
          suspensionData: error.suspensionData || {
            reason: 'Account suspended',
            suspendedAt: new Date().toISOString(),
            suspendedBy: 'Administrator',
            accountName: 'User',
          },
        };
      }
      
      // Check if it's a pending approval error
      if (error.message?.includes('pending') || error.message?.includes('Pending')) {
        return {
          success: false,
          message: 'Account pending approval',
          pending: true,
          pendingData: error.pendingData || {
            name: 'User',
            email: '',
            submittedAt: new Date().toISOString(),
          },
        };
      }
      
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  },

  // Get user by ID (for session restoration)
  getUserById: async (userId: number): Promise<any | null> => {
    try {
      // Call backend API to get user by ID
      // TODO: Backend needs to provide GET /api/users/:id endpoint
      console.warn('getUserById: Using fallback - API endpoint not fully implemented');
      
      // For now, try to get user from current session
      const response = await apiService.getUser();
      if (response && response.id === userId) {
        return response;
      }
      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  },

  // Data fetching - now uses API
  getPositions: async (): Promise<{ label: string; value: string }[]> => {
    return await apiService.getPositions();
  },

  getDepartments: async ():  Promise<{ label: string; value: string }[]>  => {
    return await apiService.getDepartments();
  },
  
  getBranches: async (): Promise<{value: string ; label: string}[]> => {
    return await apiService.getBranches();
  },

  getAccounts: async (): Promise<Account[]> => {
    return await apiService.getAccounts();
  },

  // Registration - now uses API
  registerUser: async (formData: FormData): Promise<any> => {
    return await apiService.createPendingRegistration(formData);
  },

  getPendingRegistrations: async (): Promise<PendingRegistration[]> => {
    return await apiService.getPendingRegistrations();
  },

  // Profile management - now uses API
  updateProfile: async (id: number, updates: Partial<Profile>): Promise<Profile> => {
    return await apiService.updateProfile(id, updates);
  },

  getProfile: async (id: number): Promise<Profile | null> => {
    return await apiService.getProfile(id);
  },

  // Employee management - you'll need to implement these API endpoints
  getEmployees: async (): Promise<Employee[]> => {
    try {
      // TODO: Backend needs to implement GET /api/employees
      console.warn('getEmployees: API endpoint not fully implemented, using mock data');
      return [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  },

  getEmployee: async (id: number): Promise<Employee | null> => {
    try {
      // For now, get employee data from user endpoint
      const user = await apiService.getUser();
      if (user && user.id === id) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          position: user.position || '',
          department: user.department || '',
          branch: user.branch,
          role: user.role,
          hireDate: user.hireDate || new Date().toISOString(),
          avatar: user.avatar,
          bio: user.bio,
          signature: user.signature,
          isActive: user.isActive ?? true,
        };
      }
      console.warn('getEmployee: Could not fetch employee data for ID:', id);
      return null;
    } catch (error) {
      console.error('Error fetching employee:', error);
      return null;
    }
  },

  updateEmployee: async (id: number, updates: Partial<Employee>): Promise<Employee> => {
    try {
      // TODO: Backend needs to implement PUT /api/employees/:id
      // For now, return the updates as if successful
      console.warn('updateEmployee: API endpoint not implemented, changes not persisted');
      return { id, ...updates } as Employee;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  },

  // Submissions - you'll need to implement these API endpoints
  getSubmissions: async (): Promise<Submission[]> => {
    // TODO: Implement GET /api/submissions
    console.warn('getSubmissions: API endpoint not implemented yet');
    return [];
  },

  createSubmission: async (submission: Omit<Submission, 'id'>): Promise<Submission> => {
    // TODO: Implement POST /api/submissions
    console.warn('createSubmission: API endpoint not implemented yet');
    throw new Error('Not implemented');
  },

  updateSubmission: async (id: number, updates: Partial<Submission>): Promise<Submission | null> => {
    // TODO: Implement PUT /api/submissions/:id
    console.warn('updateSubmission: API endpoint not implemented yet');
    throw new Error('Not implemented');
  },

  // Notifications - you'll need to implement these API endpoints
  getNotifications: async (userRole: string): Promise<Notification[]> => {
    // TODO: Implement GET /api/notifications?role=:role
    console.warn('getNotifications: API endpoint not implemented yet');
    return [];
  },

  createNotification: async (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<Notification> => {
    // TODO: Implement POST /api/notifications
    console.warn('createNotification: API endpoint not implemented yet');
    throw new Error('Not implemented');
  },

  markNotificationAsRead: async (notificationId: number): Promise<void> => {
    // TODO: Implement PUT /api/notifications/:id/read
    console.warn('markNotificationAsRead: API endpoint not implemented yet');
  },

  markAllNotificationsAsRead: async (userRole: string): Promise<void> => {
    // TODO: Implement PUT /api/notifications/read-all?role=:role
    console.warn('markAllNotificationsAsRead: API endpoint not implemented yet');
  },

  getUnreadNotificationCount: async (userRole: string): Promise<number> => {
    // TODO: Implement GET /api/notifications/unread-count?role=:role
    console.warn('getUnreadNotificationCount: API endpoint not implemented yet');
    return 0;
  },

  deleteNotification: async (notificationId: number): Promise<void> => {
    // TODO: Implement DELETE /api/notifications/:id
    console.warn('deleteNotification: API endpoint not implemented yet');
  },

  // Utility functions
  resetAllData: (): void => {
    console.warn('resetAllData: Not applicable for API version');
  },

  forceReinitializeAccounts: (): void => {
    console.warn('forceReinitializeAccounts: Not applicable for API version');
  },

  // Dashboard data - you'll need to implement this API endpoint
  getDashboardData: async (): Promise<any> => {
    // TODO: Implement GET /api/dashboard
    console.warn('getDashboardData: API endpoint not implemented yet');
    return {
      totalEmployees: 0,
      totalSubmissions: 0,
      pendingRegistrations: 0,
      completedEvaluations: 0,
    };
  },

  getEmployeeMetrics: async (): Promise<any> => {
    // TODO: Implement GET /api/employee-metrics
    console.warn('getEmployeeMetrics: API endpoint not implemented yet');
    return {
      totalEvaluations: 0,
      averageRating: 0,
      completedEvaluations: 0,
    };
  },

  getEmployeeResults: async (): Promise<any[]> => {
    // TODO: Implement GET /api/employee-results
    console.warn('getEmployeeResults: API endpoint not implemented yet');
    return [];
  },

  // Image upload - you'll need to implement this API endpoint
  uploadImage: async (file: File): Promise<string> => {
    // TODO: Implement POST /api/upload/image
    console.warn('uploadImage: API endpoint not implemented yet');
    throw new Error('Not implemented');
  },
};

export default clientDataService;
