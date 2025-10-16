// API Service Layer - replaces clientDataService for backend integration
import { AuthenticatedUser, PendingRegistration, Account } from './clientDataService';

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
  login: async (email: string, password: string): Promise<{ success: boolean; user?: AuthenticatedUser; message?: string; suspensionData?: any; token?: string }> => {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token if login successful
    if (response.success && response.token) {
      localStorage.setItem('authToken', response.token);
    }

    return response;
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiRequest('/api/auth/logout', {
      method: 'POST',
    });

    // Remove token from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('authenticatedUser');

    return response;
  },

  getCurrentUser: async (): Promise<{ success: boolean; user?: AuthenticatedUser; message?: string }> => {
    return apiRequest('/api/auth/me');
  },

  // Registration
  createPendingRegistration: async (registration: Omit<PendingRegistration, 'id' | 'status' | 'submittedAt'>): Promise<PendingRegistration> => {
    const response = await apiRequest('/api/registrations', {
      method: 'POST',
      body: JSON.stringify(registration),
    });

    if (!response.success) {
      throw new Error(response.message || 'Registration failed');
    }

    return response.registration;
  },

  getPendingRegistrations: async (): Promise<PendingRegistration[]> => {
    const response = await apiRequest('/api/registrations');
    return response.registrations || [];
  },

  checkDuplicates: async (email?: string, username?: string): Promise<{ emailExists: boolean; usernameExists: boolean }> => {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (username) params.append('username', username);

    const response = await apiRequest(`/api/registrations/check-duplicates?${params.toString()}`);
    return response;
  },

  // Data
  getPositions: async (): Promise<string[]> => {
    const response = await apiRequest('/api/data/positions');
    return response.positions || [];
  },

  getBranchCodes: async (): Promise<any[]> => {
    const response = await apiRequest('/api/data/branch-codes');
    return response.branchCodes || [];
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
