// Client-side data service to replace API routes

import positionsData from '@/data/positions.json';
import departmentsData from '@/data/departments.json';
import submissionsData from '@/data/submissions.json';
import pendingRegistrationsData from '@/data/pending-registrations.json';
import profilesData from '@/data/profiles.json';
import accountsData from '@/data/accounts.json';
import branchCodesData from '@/data/branch-code.json';

// Types
export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  roles: string[];
  timestamp: string;
  isRead: boolean;
  actionUrl?: string; // Optional URL for clickable notifications
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch?: string;
  role: string;
  hireDate: string;
  avatar?: string | null;
  bio?: string | null;
  contact?: string;
  updatedAt?: string;
  username?: string;
  password?: string;
  isActive?: boolean;
  lastLogin?: string;
  signature?: string;
  approvedDate?: string; // Date when the user was approved
}

export interface Submission {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  evaluatorId: number;
  evaluatorName: string;
  evaluationData: any;
  status: 'pending' | 'completed' | 'approved';
  period: string;
  overallRating: string;
  submittedAt: string;
  category?: string;
  evaluator?: string;
  // Approval-related properties
  approvalStatus?: string;
  employeeSignature?: string | null;
  employeeApprovedAt?: string | null;
  evaluatorSignature?: string | null;
  evaluatorApprovedAt?: string | null;
  fullyApprovedNotified?: boolean;
}

export interface PendingRegistration {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string; // Required field
  branch?: string; // Made optional
  hireDate: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  signature?: string; // Digital signature as base64 image
  username?: string;
  contact?: string;
  password?: string; // Note: In production, this should be hashed
}

export interface Profile {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch?: string;
  avatar?: string;
  bio?: string;
  contact?: string;
  updatedAt?: string;
  signature?: string;
}

export interface Account {
  id: number;
  email: string;
  password: string;
  role: string;
  employeeId?: number;
  username?: string;
  name?: string;
  position?: string;
  department?: string;
  branch?: string;
  isActive?: boolean;
  lastLogin?: string | null;
  contact?: string;
  hireDate?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  signature?: string; // Digital signature as base64 or URL
}

// Local storage keys
const STORAGE_KEYS = {
  EMPLOYEES: 'employees',
  SUBMISSIONS: 'submissions',
  PENDING_REGISTRATIONS: 'pending_registrations',
  PROFILES: 'profiles',
  ACCOUNTS: 'accounts',
  NOTIFICATIONS: 'notifications',
} as const;

// Helper functions for localStorage
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    
    const parsed = JSON.parse(stored);
    
    // If we expect an array but got an object, return default
    if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
      console.warn(`Expected array for key "${key}" but got object, returning default`);
      return defaultValue;
    }
    
    return parsed;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, data: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// Initialize data from JSON files if not in localStorage
const initializeData = () => {
  if (typeof window === 'undefined') return;
  
  // Initialize employees from accounts data (filter out admin accounts)
  const storedEmployees = getFromStorage(STORAGE_KEYS.EMPLOYEES, []);
  if (storedEmployees.length === 0) {
    const employeeAccounts = (accountsData.accounts || []).filter((account: any) => account.role !== 'admin');
    const employees = employeeAccounts.map((account: any) => ({
      id: account.employeeId || account.id,
      name: account.name,
      email: account.email,
      position: account.position,
      department: account.department,
      branch: account.branch,
      role: account.role,
      hireDate: account.hireDate,
      avatar: account.avatar,
      bio: account.bio,
      contact: account.contact,
      updatedAt: account.updatedAt
    }));
    saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
  }

  // Initialize submissions
  const storedSubmissions = getFromStorage(STORAGE_KEYS.SUBMISSIONS, []);
  if (storedSubmissions.length === 0) {
    saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissionsData || []);
  }

  // Initialize pending registrations
  const storedPending = getFromStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, []);
  if (storedPending.length === 0) {
    saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, pendingRegistrationsData || []);
  }

  // Initialize profiles
  const storedProfiles = getFromStorage(STORAGE_KEYS.PROFILES, []);
  if (storedProfiles.length === 0) {
    saveToStorage(STORAGE_KEYS.PROFILES, profilesData || []);
  }

  // Initialize accounts - with special handling for corrupted data
  const storedAccounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []);
  if (storedAccounts.length === 0) {
    saveToStorage(STORAGE_KEYS.ACCOUNTS, accountsData.accounts || []);
  }

  // Initialize notifications (start empty)
  const storedNotifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, []);
  if (storedNotifications.length === 0) {
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, []);
  }
};

// Force reinitialize accounts data (useful for fixing corrupted data)
const forceReinitializeAccounts = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
  saveToStorage(STORAGE_KEYS.ACCOUNTS, accountsData.accounts || []);
};

// Initialize data on module load
initializeData();

// API replacement functions
export const clientDataService = {
  // Departments
  getDepartments: async (): Promise<{id: string, name: string}[]> => {
    try {
      const response = await fetch('/api/data/departments');
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Fallback to local data if API fails
      return departmentsData.map(dept => ({
        id: dept.id.toString(),
        name: dept.name
      }));
    }
  },

  // Positions
  getPositions: async (): Promise<{id: string, name: string}[]> => {
    try {
      const response = await fetch('/api/data/positions');
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching positions:', error);
      // Fallback to local data if API fails
      return positionsData.map(position => ({
        id: position,
        name: position
      }));
    }
  },

  // Branches
  getBranches: async (): Promise<{id: string, name: string}[]> => {
    try {
      const response = await fetch('/api/data/branches');
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch branches');
    } catch (error) {
      console.error('Error fetching branches:', error);
      return []; // Return empty array as fallback
    }
  },

  // Branch Codes
  getBranchCodes: async (): Promise<{id: string, name: string}[]> => {
    try {
      const response = await fetch('/api/data/branch-codes');
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch branch codes');
    } catch (error) {
      console.error('Error fetching branch codes:', error);
      // Fallback to local data if API fails
      return branchCodesData.map(code => ({
        id: code,
        name: code
      }));
    }
  },

  // Employees
  getEmployees: async (): Promise<Employee[]> => {
    return getFromStorage(STORAGE_KEYS.EMPLOYEES, []);
  },

  getEmployee: async (id: number): Promise<Employee | null> => {
    const employees = await clientDataService.getEmployees();
    const employee = employees.find(emp => emp.id === id);
    
    if (!employee) return null;
    
    // Try to get signature from accounts data if not present in employee data
    if (!employee.signature) {
      const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
      const account = accounts.find(acc => acc.employeeId === id || acc.id === id);
      if (account?.signature) {
        return { ...employee, signature: account.signature };
      }
    }
    
    return employee;
  },

  updateEmployee: async (id: number, updates: Partial<Employee>): Promise<Employee> => {
    const employees = await clientDataService.getEmployees();
    const index = employees.findIndex(emp => emp.id === id);
    
    if (index === -1) {
      throw new Error('Employee not found');
    }

    employees[index] = { ...employees[index], ...updates, updatedAt: new Date().toISOString() };
    saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
    
    // Also update signature in accounts if provided
    if (updates.signature !== undefined) {
      const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
      const accountIndex = accounts.findIndex(acc => acc.employeeId === id || acc.id === id);
      if (accountIndex !== -1) {
        accounts[accountIndex] = { ...accounts[accountIndex], signature: updates.signature };
        saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
      }
    }
    
    return employees[index];
  },

  // Submissions
  getSubmissions: async (): Promise<Submission[]> => {
    return getFromStorage(STORAGE_KEYS.SUBMISSIONS, []);
  },

  createSubmission: async (submission: Omit<Submission, 'id'>): Promise<Submission> => {
    const submissions = await clientDataService.getSubmissions();
    const newSubmission: Submission = {
      ...submission,
      id: Date.now(), // Simple ID generation
      submittedAt: new Date().toISOString(),
    };
    
    submissions.push(newSubmission);
    saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);
    
    return newSubmission;
  },

  updateSubmission: async (id: number, updates: Partial<Submission>): Promise<Submission | null> => {
    const submissions = await clientDataService.getSubmissions();
    const index = submissions.findIndex(sub => sub.id === id);
    
    if (index === -1) {
      return null;
    }

    submissions[index] = { ...submissions[index], ...updates };
    saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);
    
    return submissions[index];
  },

  // Pending Registrations
  getPendingRegistrations: async (): Promise<PendingRegistration[]> => {
    return getFromStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, []);
  },

  createPendingRegistration: async (registration: Omit<PendingRegistration, 'id' | 'status' | 'submittedAt'>): Promise<PendingRegistration> => {
    const pending = await clientDataService.getPendingRegistrations();
    const newRegistration: PendingRegistration = {
      ...registration,
      id: Date.now(),
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    
    pending.push(newRegistration);
    saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, pending);
    
    return newRegistration;
  },

  approveRegistration: async (id: number): Promise<{ success: boolean; message: string }> => {
    const pending = await clientDataService.getPendingRegistrations();
    const registration = pending.find(reg => reg.id === id);
    
    if (!registration) {
      return { success: false, message: 'Registration not found' };
    }

    // Move to accounts (which is what the admin page uses)
    const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as any[];
    // Generate unique IDs that don't conflict with existing accounts
    const existingIds = accounts.map(acc => acc.id);
    const existingEmployeeIds = accounts.map(acc => acc.employeeId).filter(id => id !== undefined);
    const maxId = Math.max(...existingIds, 0);
    const maxEmployeeId = Math.max(...existingEmployeeIds, 1000);
    
    const newAccount = {
      id: maxId + 1,
      employeeId: maxEmployeeId + 1,
      name: registration.name,
      email: registration.email,
      position: registration.position,
      department: registration.department,
      branch: registration.branch,
      role: registration.role,
      hireDate: registration.hireDate,
      avatar: null,
      bio: null,
      contact: registration.contact || '',
      updatedAt: new Date().toISOString(),
      // Include additional fields from registration
      username: registration.username,
      password: registration.password,
      signature: registration.signature,
      isActive: true, // New employees are active by default
      approvedDate: new Date().toISOString(), // Record when the user was approved
    };

    accounts.push(newAccount);
    saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);

    // Remove from pending
    const updatedPending = pending.filter(reg => reg.id !== id);
    saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, updatedPending);

    return { success: true, message: 'Registration approved successfully' };
  },

  rejectRegistration: async (id: number): Promise<{ success: boolean; message: string }> => {
    const pending = await clientDataService.getPendingRegistrations();
    const updatedPending = pending.filter(reg => reg.id !== id);
    saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, updatedPending);

    return { success: true, message: 'Registration rejected' };
  },

  // Profiles
  getProfiles: async (): Promise<Profile[]> => {
    return getFromStorage(STORAGE_KEYS.PROFILES, []);
  },

  getProfile: async (id: number): Promise<Profile | null> => {
    const profiles = await clientDataService.getProfiles();
    return profiles.find(profile => profile.id === id) || null;
  },

  updateProfile: async (id: number, updates: Partial<Profile>): Promise<Profile> => {
    const profiles = await clientDataService.getProfiles();
    const index = profiles.findIndex(profile => profile.id === id);
    
    if (index === -1) {
      // Profile doesn't exist, create it
      const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
      const account = accounts.find(acc => acc.employeeId === id || acc.id === id);
      
      const newProfile: Profile = {
        id,
        name: account?.name || updates.name || '',
        email: account?.email || updates.email || '',
        position: account?.position || updates.position || '',
        department: account?.department || updates.department || '',
        branch: account?.branch || updates.branch,
        avatar: updates.avatar,
        bio: updates.bio,
        signature: updates.signature,
        updatedAt: new Date().toISOString()
      };
      
      profiles.push(newProfile);
      saveToStorage(STORAGE_KEYS.PROFILES, profiles);
      
      // Also update signature in accounts and employees if provided
      if (updates.signature !== undefined) {
        const accountIndex = accounts.findIndex(acc => acc.employeeId === id || acc.id === id);
        if (accountIndex !== -1) {
          accounts[accountIndex] = { ...accounts[accountIndex], signature: updates.signature };
          saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
        }
        
        const employees = await clientDataService.getEmployees();
        const employeeIndex = employees.findIndex(emp => emp.id === id);
        if (employeeIndex !== -1) {
          employees[employeeIndex] = { ...employees[employeeIndex], signature: updates.signature };
          saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
        }
      }
      
      return newProfile;
    }

    profiles[index] = { ...profiles[index], ...updates, updatedAt: new Date().toISOString() };
    saveToStorage(STORAGE_KEYS.PROFILES, profiles);
    
    // Also update signature in accounts and employees if provided
    if (updates.signature !== undefined) {
      const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
      const accountIndex = accounts.findIndex(acc => acc.employeeId === id || acc.id === id);
      if (accountIndex !== -1) {
        accounts[accountIndex] = { ...accounts[accountIndex], signature: updates.signature };
        saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
      }
      
      const employees = await clientDataService.getEmployees();
      const employeeIndex = employees.findIndex(emp => emp.id === id);
      if (employeeIndex !== -1) {
        employees[employeeIndex] = { ...employees[employeeIndex], signature: updates.signature };
        saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
      }
    }
    
    return profiles[index];
  },

  // Authentication
  login: async (email: string, password: string): Promise<{ success: boolean; user?: any; message?: string; suspensionData?: any }> => {
    const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
    
    // Ensure accounts is an array
    if (!Array.isArray(accounts)) {
      return { success: false, message: 'Data error - please refresh the page' };
    }
    
    const account = accounts.find((acc: Account) => acc.email === email && acc.password === password);
    
    if (!account) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Check if account is suspended in accounts.json
    if (account.isSuspended) {
      const suspensionData = {
        reason: account.suspensionReason || 'No reason provided',
        suspendedAt: account.suspendedAt || new Date().toISOString(),
        suspendedBy: account.suspendedBy || 'System Administrator',
        accountName: account.name || account.username || account.email
      };
      return { 
        success: false, 
        message: 'Account suspended',
        suspensionData: suspensionData
      };
    }

    // Check if account is suspended in admin suspension system
    const suspendedEmployees = getFromStorage('suspendedEmployees', []) as any[];
    const suspendedEmployee = suspendedEmployees.find((emp: any) => 
      emp.email === email && emp.status === 'suspended'
    );
    
    if (suspendedEmployee) {
      const suspensionData = {
        reason: suspendedEmployee.suspensionReason || 'No reason provided',
        suspendedAt: suspendedEmployee.suspensionDate || new Date().toISOString(),
        suspendedBy: suspendedEmployee.suspendedBy || 'System Administrator',
        accountName: suspendedEmployee.name || account.name || account.username || account.email
      };
      return { 
        success: false, 
        message: 'Account suspended',
        suspensionData: suspensionData
      };
    }

    // For accounts without employeeId (like admin), use account data directly
    if (!account.employeeId) {
      const adminUser = {
        id: account.id,
        name: account.name || account.username,
        email: account.email,
        position: account.position || 'System Administrator',
        department: account.department || 'IT',
        branch: account.branch || 'head-office',
        role: account.role,
        avatar: undefined,
        bio: undefined,
        contact: account.contact || '',
        hireDate: account.hireDate || new Date().toISOString(),
        signature: account.signature, // Include signature for admin accounts
      };
      return {
        success: true,
        user: adminUser
      };
    }

    // Find corresponding employee for accounts with employeeId
    const employees = await clientDataService.getEmployees();
    const employee = employees.find(emp => emp.id === account.employeeId);
    
    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    return {
      success: true,
      user: {
        ...employee,
        role: account.role,
        signature: account.signature || employee.signature, // Include signature from account
      }
    };
  },

  // Image upload simulation (returns a data URL)
  uploadImage: async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Dashboard data
  getDashboardData: async (): Promise<any> => {
    const employees = await clientDataService.getEmployees();
    const submissions = await clientDataService.getSubmissions();
    const pending = await clientDataService.getPendingRegistrations();

    return {
      totalEmployees: employees.length,
      totalSubmissions: submissions.length,
      pendingRegistrations: pending.length,
      completedEvaluations: submissions.filter(s => s.status === 'completed').length,
    };
  },

  // Employee metrics
  getEmployeeMetrics: async (): Promise<any> => {
    const submissions = await clientDataService.getSubmissions();
    
    return {
      totalEvaluations: submissions.length,
      averageRating: submissions.length > 0 
        ? submissions.reduce((sum, s) => sum + parseFloat(s.overallRating || '0'), 0) / submissions.length 
        : 0,
      completedEvaluations: submissions.filter(s => s.status === 'completed').length,
    };
  },

  // Employee results
  getEmployeeResults: async (): Promise<any[]> => {
    return getFromStorage(STORAGE_KEYS.SUBMISSIONS, []);
  },

  // Utility function to reset all data (useful for debugging)
  resetAllData: (): void => {
    if (typeof window === 'undefined') return;
    
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Reinitialize data
    initializeData();
  },

  // Force reinitialize accounts data (fixes corrupted data)
  forceReinitializeAccounts: (): void => {
    forceReinitializeAccounts();
  },

  // Notifications
  getNotifications: async (userRole: string): Promise<Notification[]> => {
    const allNotifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
    return allNotifications.filter(notification => 
      notification.roles.includes(userRole) || 
      notification.roles.includes('all')
    );
  },

  createNotification: async (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<Notification> => {
    const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
    
    // Check for duplicate notifications (same message and roles)
    const isDuplicate = notifications.some(existing => 
      existing.message === notification.message && 
      JSON.stringify(existing.roles.sort()) === JSON.stringify(notification.roles.sort())
    );
    
    if (isDuplicate) {
      return notifications.find(existing => 
        existing.message === notification.message && 
        JSON.stringify(existing.roles.sort()) === JSON.stringify(notification.roles.sort())
      )!;
    }
    
    const newNotification: Notification = {
      ...notification,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      isRead: false
    };
    
    notifications.push(newNotification);
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
    
    // Trigger storage event for real-time updates across tabs
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.NOTIFICATIONS,
        newValue: JSON.stringify(notifications)
      }));
    }
    
    return newNotification;
  },

  markNotificationAsRead: async (notificationId: number): Promise<void> => {
    const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.isRead = true;
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
      
      // Trigger storage event for real-time updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEYS.NOTIFICATIONS,
          newValue: JSON.stringify(notifications)
        }));
      }
    }
  },

  markAllNotificationsAsRead: async (userRole: string): Promise<void> => {
    const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
    const userNotifications = notifications.filter(notification => 
      notification.roles.includes(userRole) || 
      notification.roles.includes('all')
    );
    
    userNotifications.forEach(notification => {
      notification.isRead = true;
    });
    
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
    
    // Trigger storage event for real-time updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.NOTIFICATIONS,
        newValue: JSON.stringify(notifications)
      }));
    }
  },

  getUnreadNotificationCount: async (userRole: string): Promise<number> => {
    const notifications = await clientDataService.getNotifications(userRole);
    return notifications.filter(notification => !notification.isRead).length;
  },

  deleteNotification: async (notificationId: number): Promise<void> => {
    const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, updatedNotifications);
    
    // Trigger storage event for real-time updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.NOTIFICATIONS,
        newValue: JSON.stringify(updatedNotifications)
      }));
    }
  },

  // Get all accounts
  getAccounts: async (): Promise<Account[]> => {
    return getFromStorage(STORAGE_KEYS.ACCOUNTS, []);
  },
};

export default clientDataService;
