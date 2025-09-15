// Client-side data service to replace API routes
import departmentsData from '@/data/departments-minimal.json';
import positionsData from '@/data/positions.json';
import submissionsData from '@/data/submissions.json';
import pendingRegistrationsData from '@/data/pending-registrations.json';
import profilesData from '@/data/profiles.json';
import accountsData from '@/data/accounts.json';

// Types
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
  overallRating: number;
  submittedAt: string;
  category?: string;
  evaluator?: string;
}

export interface PendingRegistration {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch: string;
  hireDate: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
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
}

// Local storage keys
const STORAGE_KEYS = {
  EMPLOYEES: 'employees',
  SUBMISSIONS: 'submissions',
  PENDING_REGISTRATIONS: 'pending_registrations',
  PROFILES: 'profiles',
  ACCOUNTS: 'accounts',
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
};

// Force reinitialize accounts data (useful for fixing corrupted data)
const forceReinitializeAccounts = () => {
  if (typeof window === 'undefined') return;
  
  console.log('Force reinitializing accounts data...');
  localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
  saveToStorage(STORAGE_KEYS.ACCOUNTS, accountsData.accounts || []);
  console.log('Accounts data reinitialized successfully');
};

// Initialize data on module load
initializeData();

// API replacement functions
export const clientDataService = {
  // Departments
  getDepartments: async (): Promise<string[]> => {
    return departmentsData;
  },

  // Positions
  getPositions: async (): Promise<string[]> => {
    return positionsData;
  },

  // Employees
  getEmployees: async (): Promise<Employee[]> => {
    return getFromStorage(STORAGE_KEYS.EMPLOYEES, []);
  },

  getEmployee: async (id: number): Promise<Employee | null> => {
    const employees = await clientDataService.getEmployees();
    return employees.find(emp => emp.id === id) || null;
  },

  updateEmployee: async (id: number, updates: Partial<Employee>): Promise<Employee> => {
    const employees = await clientDataService.getEmployees();
    const index = employees.findIndex(emp => emp.id === id);
    
    if (index === -1) {
      throw new Error('Employee not found');
    }

    employees[index] = { ...employees[index], ...updates, updatedAt: new Date().toISOString() };
    saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
    
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

    // Move to employees
    const employees = await clientDataService.getEmployees();
    const newEmployee: Employee = {
      id: Date.now(),
      name: registration.name,
      email: registration.email,
      position: registration.position,
      department: registration.department,
      branch: registration.branch,
      role: registration.role,
      hireDate: registration.hireDate,
      avatar: null,
      bio: null,
      updatedAt: new Date().toISOString(),
    };

    employees.push(newEmployee);
    saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);

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
      throw new Error('Profile not found');
    }

    profiles[index] = { ...profiles[index], ...updates, updatedAt: new Date().toISOString() };
    saveToStorage(STORAGE_KEYS.PROFILES, profiles);
    
    return profiles[index];
  },

  // Authentication
  login: async (email: string, password: string): Promise<{ success: boolean; user?: any; message?: string; suspensionData?: any }> => {
    console.log('Login attempt:', { email, password: '***' });
    
    const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
    console.log('Loaded accounts:', accounts.length, 'accounts');
    
    // Ensure accounts is an array
    if (!Array.isArray(accounts)) {
      console.error('Accounts data is not an array:', accounts);
      return { success: false, message: 'Data error - please refresh the page' };
    }
    
    const account = accounts.find((acc: Account) => acc.email === email && acc.password === password);
    console.log('Found account:', account ? 'Yes' : 'No', account ? { id: account.id, email: account.email, role: account.role, isSuspended: account.isSuspended } : null);
    
    if (!account) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Check if account is suspended in accounts.json
    if (account.isSuspended) {
      console.log('Account is suspended in accounts.json:', account);
      const suspensionData = {
        reason: account.suspensionReason || 'No reason provided',
        suspendedAt: account.suspendedAt || new Date().toISOString(),
        suspendedBy: account.suspendedBy || 'System Administrator',
        accountName: account.name || account.username || account.email
      };
      console.log('Suspension data from accounts.json:', suspensionData);
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
      console.log('Account is suspended in admin system:', suspendedEmployee);
      const suspensionData = {
        reason: suspendedEmployee.suspensionReason || 'No reason provided',
        suspendedAt: suspendedEmployee.suspensionDate || new Date().toISOString(),
        suspendedBy: suspendedEmployee.suspendedBy || 'System Administrator',
        accountName: suspendedEmployee.name || account.name || account.username || account.email
      };
      console.log('Suspension data from admin system:', suspensionData);
      return { 
        success: false, 
        message: 'Account suspended',
        suspensionData: suspensionData
      };
    }

    // For accounts without employeeId (like admin), use account data directly
    if (!account.employeeId) {
      console.log('Account without employeeId (admin account):', account);
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
      };
      console.log('Created admin user object:', adminUser);
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
        ? submissions.reduce((sum, s) => sum + s.overallRating, 0) / submissions.length 
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
};

export default clientDataService;
