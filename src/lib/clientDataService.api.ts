// API-enabled version of clientDataService
// This replaces the localStorage version with API calls

import apiService from './apiService';
import { Employee, Submission, PendingRegistration, Profile, Account, Notification } from './clientDataService';

export const clientDataService = {
  // Authentication - now uses API
  // login: async (email: string, password: string) => {
  //   return await apiService.login(email, password);
  // },

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
  
  updateEmployee_auth: async (formData: FormData): Promise<any> => {
    return await apiService.updateEmployee_auth(formData);
  },

  getPendingRegistrations: async (): Promise<PendingRegistration[]> => {
    return await apiService.getPendingRegistrations();
  },

  // Profile management - now uses API
  // updateProfile: async (id: number, updates: Partial<Profile>): Promise<Profile> => {
  //   return await apiService.updateProfile(id, updates);
  // },

  // Employee management - you'll need to implement these API endpoints
  getEmployees: async (): Promise<Employee[]> => {
    // TODO: Implement GET /api/employees
    console.warn('getEmployees: API endpoint not implemented yet');
    return [];
  },

  getEmployee: async (id: number): Promise<Employee | null> => {
    // TODO: Implement GET /api/employees/:id
    console.warn('getEmployee: API endpoint not implemented yet');
    return null;
  },

  updateEmployee: async (id: number, updates: Partial<Employee>): Promise<Employee> => {
    // TODO: Implement PUT /api/employees/:id
    console.warn('updateEmployee: API endpoint not implemented yet');
    throw new Error('Not implemented');
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
  uploadAvatar: async (formData: FormData): Promise<string> => {
    return await apiService.uploadAvatar(formData);
  },
};

export default clientDataService;
