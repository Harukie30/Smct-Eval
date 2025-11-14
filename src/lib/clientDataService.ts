// Client-side data service to replace API routes

import positionsData from '@/data/positions.json';
import departmentsData from '@/data/departments.json';
import submissionsData from '@/data/submissions.json';
import pendingRegistrationsData from '@/data/pending-registrations.json';
import profilesData from '@/data/profiles.json';
import accountsData from '@/data/accounts.json';
import branchCodesData from '@/data/branch-code.json';
import { CONFIG } from '../../config/config';
import axiosInstance from './axiosInstance';

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

export interface EmployeeSearchResult {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch?: string;
  role: string;
  hireDate: string;
  isActive: boolean;
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
  availableRoles?: string[]; // Added for role selection modal
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

// Import storage cache for optimized localStorage reads
import { storageCache } from './storageCache';

// Helper functions for localStorage with caching
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  // Use cache for faster repeated reads
  const cached = storageCache.get(key, defaultValue);
  
  // Validate cached data matches expected type
  if (Array.isArray(defaultValue) && !Array.isArray(cached)) {
    console.warn(`Expected array for key "${key}" but got object, returning default`);
    return defaultValue;
  }
  
  return cached;
};

const saveToStorage = <T>(key: string, data: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Update cache immediately after write to keep it in sync
    storageCache.set(key, data);
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    // Invalidate cache on error to prevent stale data
    storageCache.invalidate(key);
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
  // Invalidate cache when removing from localStorage
  storageCache.invalidate(STORAGE_KEYS.ACCOUNTS);
  saveToStorage(STORAGE_KEYS.ACCOUNTS, accountsData.accounts || []);
};

// Initialize data on module load
initializeData();

// API replacement functions
export const clientDataService = {
  // Departments - calls external backend, merges with localStorage departments
  // Returns {id, name} format where id is sent to backend, name is displayed in UI
  getDepartments: async (): Promise<{id: string, name: string}[]> => {
    let apiDepartments: {id: string, name: string}[] = [];
    
    try {
      const response = await axiosInstance.get('/departments');
      if (response.data) {
        apiDepartments = (response.data.departments || response.data).map(
          (dept: any) => ({
            id: dept.id.toString(),
            name: dept.department_name || dept.name,
          })
        );
      }
    } catch (error) {
      console.error('Error fetching departments from API:', error);
    }

    // Get departments from localStorage (added via admin panel) - already in {id, name} format
    // Use cache for faster reads
    const savedDepartments: {id: number, name: string}[] = storageCache.get('departments', []);
    
    // Convert to {id: string, name: string} format
    const localStorageDepartments = savedDepartments.map((dept) => ({
      id: dept.id.toString(),
      name: dept.name
    }));

    // Merge API departments with localStorage departments (avoid duplicates)
    const allDepartments = [...apiDepartments];
    localStorageDepartments.forEach((localDept) => {
      // Check if department already exists (by id)
      const exists = allDepartments.some(d => d.id === localDept.id);
      if (!exists) {
        allDepartments.push(localDept);
      }
    });

    // If we have departments (from API or localStorage), return them
    if (allDepartments.length > 0) {
      return allDepartments;
    }

    // Fallback to local data if API fails
    return departmentsData.map(dept => ({
      id: dept.id.toString(),
      name: dept.name
    }));
  },

  // Positions - calls external backend
  getPositions: async (): Promise<{id: string, name: string}[]> => {
    try {
      const response = await axiosInstance.get('/positions');
      if (response.data) {
        return (response.data.positions || response.data).map((position: any) => ({
          value: position.id,
          label: position.label || position.name,
        }));
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
    
    // Fallback to local data if API fails
    return positionsData.map(position => ({
      id: position,
      name: position
    }));
  },

  // Branches - calls external backend, merges with localStorage branches
  // Returns {id, name} format where id is sent to backend, name is displayed in UI
  getBranches: async (): Promise<{id: string, name: string}[]> => {
    let apiBranches: {id: string, name: string}[] = [];
    
    try {
      const response = await axiosInstance.get('/branches');
      if (response.data) {
        apiBranches = (response.data.branches || response.data).map((branch: any) => ({
          id: branch.id,
          name: branch.branch_name + " /" + branch.branch_code,
        }));
      }
    } catch (error) {
      console.error('Error fetching branches from API:', error);
    }

    // Get branches from localStorage (added via admin panel) - already in {id, name} format
    // Use cache for faster reads
    const savedBranches: {id: string, name: string}[] = storageCache.get('branches', []);

    // Merge API branches with localStorage branches (avoid duplicates)
    const allBranches = [...apiBranches];
    savedBranches.forEach((localBranch) => {
      // Check if branch already exists (by id)
      const exists = allBranches.some(b => b.id === localBranch.id);
      if (!exists) {
        allBranches.push(localBranch);
      }
    });

    // If we have branches (from API or localStorage), return them
    if (allBranches.length > 0) {
      return allBranches;
    }

    // Fallback to hardcoded branches
    return [
      { id: 'HO', name: 'Head Office' },
      { id: 'CEB', name: 'Cebu Branch' },
      { id: 'DAV', name: 'Davao Branch' },
      { id: 'BAC', name: 'Bacolod Branch' },
      { id: 'ILO', name: 'Iloilo Branch' },
      { id: 'CDO', name: 'Cagayan de Oro Branch' },
      { id: 'BAG', name: 'Baguio Branch' },
      { id: 'ZAM', name: 'Zamboanga Branch' },
      { id: 'GSC', name: 'General Santos Branch' }
    ];
  },

  // Branch Codes - returns local data (no API)
  getBranchCodes: async (): Promise<{id: string, name: string}[]> => {
    return branchCodesData.map(code => ({
      id: code,
      name: code
    }));
  },

  // Employees
  getEmployees: async (): Promise<Employee[]> => {
    try {
      // Try backend API first
      const response = await axiosInstance.get('/api/employees');
      const data = response.data;
      
      // Cache the data for offline fallback
      if (data.success && data.employees) {
        saveToStorage(STORAGE_KEYS.EMPLOYEES, data.employees);
        storageCache.invalidate(STORAGE_KEYS.EMPLOYEES);
        return data.employees;
      }
      
      // If response has employees array directly
      if (Array.isArray(data.employees)) {
        saveToStorage(STORAGE_KEYS.EMPLOYEES, data.employees);
        storageCache.invalidate(STORAGE_KEYS.EMPLOYEES);
        return data.employees;
      }
      
      // If response is array directly
      if (Array.isArray(data)) {
        saveToStorage(STORAGE_KEYS.EMPLOYEES, data);
        storageCache.invalidate(STORAGE_KEYS.EMPLOYEES);
        return data;
      }
      
      // If response doesn't have expected structure, fallback to localStorage
      console.warn('Backend API response format unexpected, using localStorage fallback');
      return getFromStorage(STORAGE_KEYS.EMPLOYEES, []);
      
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Fallback to localStorage
      return getFromStorage(STORAGE_KEYS.EMPLOYEES, []);
    }
  },

  getEmployee: async (id: number): Promise<Employee | null> => {
    try {
      // Try backend API first
      const response = await axiosInstance.get(`/api/employees/${id}`);
      const data = response.data;
      
      let employee: Employee | null = null;
      
      // Handle different response formats
      if (data.success && data.employee) {
        employee = data.employee;
      } else if (data.employee) {
        employee = data.employee;
      } else if (data.id) {
        employee = data as Employee;
      }
      
      if (employee) {
        // Cache the employee in the employees array
        const employees = await clientDataService.getEmployees();
        const index = employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
          employees[index] = employee;
        } else {
          employees.push(employee);
        }
        saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
        storageCache.invalidate(STORAGE_KEYS.EMPLOYEES);
        
        // Try to get signature from accounts data if not present in employee data
        if (!employee.signature) {
          const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
          const account = accounts.find(acc => acc.employeeId === id || acc.id === id);
          if (account?.signature) {
            employee = { ...employee, signature: account.signature };
          }
        }
        
        return employee;
      }
      
      // If API doesn't return employee, fallback to localStorage
      console.warn('Backend API did not return employee, using localStorage fallback');
      const employeesList = await clientDataService.getEmployees();
      const foundEmployee = employeesList.find(emp => emp.id === id);
      
      if (!foundEmployee) return null;
      
      // Try to get signature from accounts data if not present in employee data
      if (!foundEmployee.signature) {
        const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
        const account = accounts.find(acc => acc.employeeId === id || acc.id === id);
        if (account?.signature) {
          return { ...foundEmployee, signature: account.signature };
        }
      }
      
      return foundEmployee;
      
    } catch (error) {
      console.error('Error fetching employee:', error);
      // Fallback to localStorage
      const employeesList = await clientDataService.getEmployees();
      const foundEmployee = employeesList.find(emp => emp.id === id);
      
      if (!foundEmployee) return null;
      
      // Try to get signature from accounts data if not present in employee data
      if (!foundEmployee.signature) {
        const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
        const account = accounts.find(acc => acc.employeeId === id || acc.id === id);
        if (account?.signature) {
          return { ...foundEmployee, signature: account.signature };
        }
      }
      
      return foundEmployee;
    }
  },

  updateEmployee: async (id: number, updates: Partial<Employee>): Promise<Employee> => {
    try {
      // Try backend API first
      const response = await axiosInstance.put(`/api/employees/${id}`, updates);
      const data = response.data;
      
      let updatedEmployee: Employee | null = null;
      
      // Handle different response formats
      if (data.success && data.employee) {
        updatedEmployee = data.employee;
      } else if (data.employee) {
        updatedEmployee = data.employee;
      } else if (data.id) {
        updatedEmployee = data as Employee;
      }
      
      if (updatedEmployee) {
        // Update localStorage cache
        const employees = await clientDataService.getEmployees();
        const index = employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
          employees[index] = updatedEmployee;
        } else {
          employees.push(updatedEmployee);
        }
        saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
        storageCache.invalidate(STORAGE_KEYS.EMPLOYEES);
        
        // Also update signature in accounts if provided
        if (updates.signature !== undefined) {
          const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
          const accountIndex = accounts.findIndex(acc => acc.employeeId === id || acc.id === id);
          if (accountIndex !== -1) {
            accounts[accountIndex] = { ...accounts[accountIndex], signature: updates.signature };
            saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
            storageCache.invalidate(STORAGE_KEYS.ACCOUNTS);
          }
        }
        
        return updatedEmployee;
      }
      
      // If API doesn't return updated employee, fallback to localStorage update
      console.warn('Backend API did not return updated employee, using localStorage fallback');
      throw new Error('API response format unexpected');
      
    } catch (error) {
      console.error('Error updating employee via API, using localStorage fallback:', error);
      
      // Fallback to localStorage update
      const employees = await clientDataService.getEmployees();
      const index = employees.findIndex(emp => emp.id === id);
      
      if (index === -1) {
        throw new Error('Employee not found');
      }

      employees[index] = { ...employees[index], ...updates, updatedAt: new Date().toISOString() };
      saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
      storageCache.invalidate(STORAGE_KEYS.EMPLOYEES);
      
      // Also update signature in accounts if provided
      if (updates.signature !== undefined) {
        const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
        const accountIndex = accounts.findIndex(acc => acc.employeeId === id || acc.id === id);
        if (accountIndex !== -1) {
          accounts[accountIndex] = { ...accounts[accountIndex], signature: updates.signature };
          saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
          storageCache.invalidate(STORAGE_KEYS.ACCOUNTS);
        }
      }
      
      return employees[index];
    }
  },

  // Helper function to get employee by email
  getEmployeeByEmail: async (email: string): Promise<Employee | null> => {
    const employees = await clientDataService.getEmployees();
    const employee = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase());
    return employee || null;
  },

  // Search employees by name, email, position, or department
  searchEmployees: async (query: string): Promise<EmployeeSearchResult[]> => {
    if (!query.trim()) {
      return [];
    }
    
    const employees = await clientDataService.getEmployees();
    const normalizedQuery = query.toLowerCase().trim();
    
    return employees
      .filter(emp => 
        emp.name.toLowerCase().includes(normalizedQuery) ||
        emp.email.toLowerCase().includes(normalizedQuery) ||
        emp.position.toLowerCase().includes(normalizedQuery) ||
        emp.department.toLowerCase().includes(normalizedQuery)
      )
      .map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        position: emp.position,
        department: emp.department,
        branch: emp.branch,
        role: emp.role,
        hireDate: emp.hireDate,
        isActive: emp.isActive ?? true
      }))
      .slice(0, 20); // Limit results to 20
  },

  // Get employees by department
  getEmployeesByDepartment: async (department: string): Promise<Employee[]> => {
    const employees = await clientDataService.getEmployees();
    return employees.filter(emp => 
      emp.department.toLowerCase() === department.toLowerCase()
    );
  },

  // Get employees by role
  getEmployeesByRole: async (role: string): Promise<Employee[]> => {
    const employees = await clientDataService.getEmployees();
    return employees.filter(emp => 
      emp.role.toLowerCase() === role.toLowerCase()
    );
  },

  // Get employee statistics
  getEmployeeStats: async () => {
    const employees = await clientDataService.getEmployees();
    
    return {
      total: employees.length,
      active: employees.filter(emp => emp.isActive !== false).length,
      byRole: employees.reduce((acc, emp) => {
        acc[emp.role] = (acc[emp.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byDepartment: employees.reduce((acc, emp) => {
        acc[emp.department] = (acc[emp.department] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  },

  // Submissions
  getSubmissions: async (): Promise<Submission[]> => {
    try {
      // Try backend API first
      const response = await axiosInstance.get('/submissions');
      const data = response.data;
      
      // Cache the data for offline fallback
      if (data.success && data.submissions) {
        saveToStorage(STORAGE_KEYS.SUBMISSIONS, data.submissions);
        storageCache.invalidate(STORAGE_KEYS.SUBMISSIONS);
        return data.submissions;
      }
      
      // If response has submissions array directly
      if (Array.isArray(data.submissions)) {
        saveToStorage(STORAGE_KEYS.SUBMISSIONS, data.submissions);
        storageCache.invalidate(STORAGE_KEYS.SUBMISSIONS);
        return data.submissions;
      }
      
      // If response is array directly
      if (Array.isArray(data)) {
        saveToStorage(STORAGE_KEYS.SUBMISSIONS, data);
        storageCache.invalidate(STORAGE_KEYS.SUBMISSIONS);
        return data;
      }
      
      // If response doesn't have expected structure, fallback to localStorage
      console.warn('Backend API response format unexpected, using localStorage fallback');
      return getFromStorage(STORAGE_KEYS.SUBMISSIONS, []);
      
    } catch (error) {
      console.error('Error fetching submissions:', error);
      // Fallback to localStorage
      return getFromStorage(STORAGE_KEYS.SUBMISSIONS, []);
    }
  },

  createSubmission: async (submission: Omit<Submission, 'id'>): Promise<Submission> => {
    try {
      // Try backend API first
      const response = await axiosInstance.post('/submissions', submission);
      const data = response.data;
      
      let newSubmission: Submission | null = null;
      
      // Handle different response formats
      if (data.success && data.submission) {
        newSubmission = data.submission;
      } else if (data.submission) {
        newSubmission = data.submission;
      } else if (data.id) {
        newSubmission = data as Submission;
      }
      
      if (newSubmission) {
        // Cache the new submission in localStorage
        const submissions = await clientDataService.getSubmissions();
        submissions.push(newSubmission);
        saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);
        storageCache.invalidate(STORAGE_KEYS.SUBMISSIONS);
        return newSubmission;
      }
      
      // If API doesn't return submission, fallback to localStorage
      console.warn('Backend API did not return submission, using localStorage fallback');
      throw new Error('API response format unexpected');
      
    } catch (error) {
      console.error('Error creating submission via API, using localStorage fallback:', error);
      
      // Fallback to localStorage
      const submissions = await clientDataService.getSubmissions();
      const newSubmission: Submission = {
        ...submission,
        id: Date.now(), // Simple ID generation
        submittedAt: new Date().toISOString(),
      };
      
      submissions.push(newSubmission);
      saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);
      storageCache.invalidate(STORAGE_KEYS.SUBMISSIONS);
      
      return newSubmission;
    }
  },

  updateSubmission: async (id: number, updates: Partial<Submission>): Promise<Submission | null> => {
    try {
      // Try backend API first
      const response = await axiosInstance.put(`/submissions/${id}`, updates);
      const data = response.data;
      
      let updatedSubmission: Submission | null = null;
      
      // Handle different response formats
      if (data.success && data.submission) {
        updatedSubmission = data.submission;
      } else if (data.submission) {
        updatedSubmission = data.submission;
      } else if (data.id) {
        updatedSubmission = data as Submission;
      }
      
      if (updatedSubmission) {
        // Update localStorage cache
        const submissions = await clientDataService.getSubmissions();
        const index = submissions.findIndex(sub => sub.id === id);
        if (index !== -1) {
          submissions[index] = updatedSubmission;
        } else {
          submissions.push(updatedSubmission);
        }
        saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);
        storageCache.invalidate(STORAGE_KEYS.SUBMISSIONS);
        return updatedSubmission;
      }
      
      // If API doesn't return updated submission, fallback to localStorage update
      console.warn('Backend API did not return updated submission, using localStorage fallback');
      throw new Error('API response format unexpected');
      
    } catch (error) {
      console.error('Error updating submission via API, using localStorage fallback:', error);
      
      // Fallback to localStorage update
      const submissions = await clientDataService.getSubmissions();
      const index = submissions.findIndex(sub => sub.id === id);
      
      if (index === -1) {
        return null;
      }

      submissions[index] = { ...submissions[index], ...updates };
      saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);
      storageCache.invalidate(STORAGE_KEYS.SUBMISSIONS);
      
      return submissions[index];
    }
  },

  // Pending Registrations
  getPendingRegistrations: async (): Promise<PendingRegistration[]> => {
    try {
      // Try backend API first
      const response = await axiosInstance.get('/api/register');
      const data = response.data;
      
      // Cache the data for offline fallback
      if (data.success && data.registrations) {
        saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, data.registrations);
        return data.registrations;
      }
      
      // If response doesn't have expected structure, fallback to localStorage
      console.warn('Backend API response format unexpected, using localStorage fallback');
      return getFromStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, []);
      
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      // Fallback to localStorage
      return getFromStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, []);
    }
  },

  createPendingRegistration: async (registration: Omit<PendingRegistration, 'id' | 'status' | 'submittedAt'>): Promise<PendingRegistration> => {
    try {
      // Try backend API first
      const response = await axiosInstance.post('/api/register', registration);
      const data = response.data;
      
      if (data.success && data.registration) {
        // Cache the new registration for offline fallback
        const pending = await clientDataService.getPendingRegistrations();
        pending.push(data.registration);
        saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, pending);
        return data.registration;
      }
      
      // If response doesn't have expected structure, fallback to localStorage
      console.warn('Backend API response format unexpected, using localStorage fallback');
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
      
    } catch (error) {
      console.error('Error creating pending registration:', error);
      // Fallback to localStorage
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
    }
  },

  approveRegistration: async (id: number): Promise<{ success: boolean; message: string }> => {
    try {
      // Try backend API first
      const response = await axiosInstance.post(`/api/registrations/${id}/approve`);
      const data = response.data;
      
      if (data.success) {
        // Now handle the localStorage logic (until backend has full database)
        const pending = await clientDataService.getPendingRegistrations();
        const registration = pending.find(reg => reg.id === id);
        
        if (registration) {
          // Move to accounts
          const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as any[];
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
            username: registration.username,
            password: registration.password,
            signature: registration.signature,
            isActive: true,
            approvedDate: new Date().toISOString(),
          };

          accounts.push(newAccount);
          saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);

          // Remove from pending
          const updatedPending = pending.filter(reg => reg.id !== id);
          saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, updatedPending);
        }
        
        return { success: true, message: data.message || 'Registration approved successfully' };
      }
      
      // If response doesn't have expected structure, fallback to localStorage
      console.warn('Backend API response format unexpected, using localStorage fallback');
      const pending = await clientDataService.getPendingRegistrations();
      const registration = pending.find(reg => reg.id === id);
      
      if (!registration) {
        return { success: false, message: 'Registration not found' };
      }

      const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as any[];
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
        username: registration.username,
        password: registration.password,
        signature: registration.signature,
        isActive: true,
        approvedDate: new Date().toISOString(),
      };

      accounts.push(newAccount);
      saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);

      const updatedPending = pending.filter(reg => reg.id !== id);
      saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, updatedPending);

      return { success: true, message: 'Registration approved successfully' };
      
    } catch (error) {
      console.error('Error approving registration:', error);
      // Fallback to localStorage on error (same logic as above)
      const pending = await clientDataService.getPendingRegistrations();
      const registration = pending.find(reg => reg.id === id);
      
      if (!registration) {
        return { success: false, message: 'Registration not found' };
      }

      const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as any[];
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
        username: registration.username,
        password: registration.password,
        signature: registration.signature,
        isActive: true,
        approvedDate: new Date().toISOString(),
      };

      accounts.push(newAccount);
      saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);

      const updatedPending = pending.filter(reg => reg.id !== id);
      saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, updatedPending);

      return { success: true, message: 'Registration approved successfully' };
    }
  },

  rejectRegistration: async (id: number): Promise<{ success: boolean; message: string }> => {
    try {
      // Try backend API first
      const response = await axiosInstance.delete(`/api/registrations/${id}/reject`);
      const data = response.data;
      
      if (data.success) {
        // Remove from localStorage
        const pending = await clientDataService.getPendingRegistrations();
        const updatedPending = pending.filter(reg => reg.id !== id);
        saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, updatedPending);
        
        return { success: true, message: data.message || 'Registration rejected successfully' };
      }
      
      // If response doesn't have expected structure, fallback to localStorage
      console.warn('Backend API response format unexpected, using localStorage fallback');
      const pending = await clientDataService.getPendingRegistrations();
      const updatedPending = pending.filter(reg => reg.id !== id);
      saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, updatedPending);

      return { success: true, message: 'Registration rejected' };
      
    } catch (error) {
      console.error('Error rejecting registration:', error);
      // Fallback to localStorage on error
      const pending = await clientDataService.getPendingRegistrations();
      const updatedPending = pending.filter(reg => reg.id !== id);
      saveToStorage(STORAGE_KEYS.PENDING_REGISTRATIONS, updatedPending);

      return { success: true, message: 'Registration rejected' };
    }
  },

  // Profiles
  getProfiles: async (): Promise<Profile[]> => {
    try {
      // Try backend API first
      const response = await axiosInstance.get('/api/profiles');
      const data = response.data;
      
      // Cache the data for offline fallback
      if (data.success && data.profiles) {
        saveToStorage(STORAGE_KEYS.PROFILES, data.profiles);
        storageCache.invalidate(STORAGE_KEYS.PROFILES);
        return data.profiles;
      }
      
      // If response has profiles array directly
      if (Array.isArray(data.profiles)) {
        saveToStorage(STORAGE_KEYS.PROFILES, data.profiles);
        storageCache.invalidate(STORAGE_KEYS.PROFILES);
        return data.profiles;
      }
      
      // If response is array directly
      if (Array.isArray(data)) {
        saveToStorage(STORAGE_KEYS.PROFILES, data);
        storageCache.invalidate(STORAGE_KEYS.PROFILES);
        return data;
      }
      
      // If response doesn't have expected structure, fallback to localStorage
      console.warn('Backend API response format unexpected, using localStorage fallback');
      return getFromStorage(STORAGE_KEYS.PROFILES, []);
      
    } catch (error) {
      console.error('Error fetching profiles:', error);
      // Fallback to localStorage
      return getFromStorage(STORAGE_KEYS.PROFILES, []);
    }
  },

  getProfile: async (id: number): Promise<Profile | null> => {
    try {
      // Try backend API first
      const response = await axiosInstance.get(`/api/profiles/${id}`);
      const data = response.data;
      
      let profile: Profile | null = null;
      
      // Handle different response formats
      if (data.success && data.profile) {
        profile = data.profile;
      } else if (data.profile) {
        profile = data.profile;
      } else if (data.id) {
        profile = data as Profile;
      }
      
      if (profile) {
        // Cache the profile in the profiles array
        const profiles = await clientDataService.getProfiles();
        const index = profiles.findIndex(p => p.id === id);
        if (index !== -1) {
          profiles[index] = profile;
        } else {
          profiles.push(profile);
        }
        saveToStorage(STORAGE_KEYS.PROFILES, profiles);
        storageCache.invalidate(STORAGE_KEYS.PROFILES);
        return profile;
      }
      
      // If API doesn't return profile, fallback to localStorage
      console.warn('Backend API did not return profile, using localStorage fallback');
      const profiles = await clientDataService.getProfiles();
      return profiles.find(p => p.id === id) || null;
      
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to localStorage
      const profiles = await clientDataService.getProfiles();
      return profiles.find(profile => profile.id === id) || null;
    }
  },

  updateProfile: async (id: number, updates: Partial<Profile>): Promise<Profile> => {
    try {
      // Try backend API first
      const response = await axiosInstance.put(`/api/profiles/${id}`, updates);
      const data = response.data;
      
      let updatedProfile: Profile | null = null;
      
      // Handle different response formats
      if (data.success && data.profile) {
        updatedProfile = data.profile;
      } else if (data.profile) {
        updatedProfile = data.profile;
      } else if (data.id) {
        updatedProfile = data as Profile;
      }
      
      if (updatedProfile) {
        // Update localStorage cache
        const profiles = await clientDataService.getProfiles();
        const index = profiles.findIndex(profile => profile.id === id);
        if (index !== -1) {
          profiles[index] = updatedProfile;
        } else {
          profiles.push(updatedProfile);
        }
        saveToStorage(STORAGE_KEYS.PROFILES, profiles);
        storageCache.invalidate(STORAGE_KEYS.PROFILES);
        
        // Also update signature in accounts and employees if provided
        if (updates.signature !== undefined) {
          const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
          const accountIndex = accounts.findIndex(acc => acc.employeeId === id || acc.id === id);
          if (accountIndex !== -1) {
            accounts[accountIndex] = { ...accounts[accountIndex], signature: updates.signature };
            saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
            storageCache.invalidate(STORAGE_KEYS.ACCOUNTS);
          }
          
          const employees = await clientDataService.getEmployees();
          const employeeIndex = employees.findIndex(emp => emp.id === id);
          if (employeeIndex !== -1) {
            employees[employeeIndex] = { ...employees[employeeIndex], signature: updates.signature };
            saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
            storageCache.invalidate(STORAGE_KEYS.EMPLOYEES);
          }
        }
        
        return updatedProfile;
      }
      
      // If API doesn't return updated profile, fallback to localStorage update
      console.warn('Backend API did not return updated profile, using localStorage fallback');
      throw new Error('API response format unexpected');
      
    } catch (error) {
      console.error('Error updating profile via API, using localStorage fallback:', error);
      
      // Fallback to localStorage update
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
        storageCache.invalidate(STORAGE_KEYS.PROFILES);
        
        // Also update signature in accounts and employees if provided
        if (updates.signature !== undefined) {
          const accountIndex = accounts.findIndex(acc => acc.employeeId === id || acc.id === id);
          if (accountIndex !== -1) {
            accounts[accountIndex] = { ...accounts[accountIndex], signature: updates.signature };
            saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
            storageCache.invalidate(STORAGE_KEYS.ACCOUNTS);
          }
          
          const employees = await clientDataService.getEmployees();
          const employeeIndex = employees.findIndex(emp => emp.id === id);
          if (employeeIndex !== -1) {
            employees[employeeIndex] = { ...employees[employeeIndex], signature: updates.signature };
            saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
            storageCache.invalidate(STORAGE_KEYS.EMPLOYEES);
          }
        }
        
        return newProfile;
      }

      profiles[index] = { ...profiles[index], ...updates, updatedAt: new Date().toISOString() };
      saveToStorage(STORAGE_KEYS.PROFILES, profiles);
      storageCache.invalidate(STORAGE_KEYS.PROFILES);
      
      // Also update signature in accounts and employees if provided
      if (updates.signature !== undefined) {
        const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
        const accountIndex = accounts.findIndex(acc => acc.employeeId === id || acc.id === id);
        if (accountIndex !== -1) {
          accounts[accountIndex] = { ...accounts[accountIndex], signature: updates.signature };
          saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
          storageCache.invalidate(STORAGE_KEYS.ACCOUNTS);
        }
        
        const employees = await clientDataService.getEmployees();
        const employeeIndex = employees.findIndex(emp => emp.id === id);
        if (employeeIndex !== -1) {
          employees[employeeIndex] = { ...employees[employeeIndex], signature: updates.signature };
          saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
          storageCache.invalidate(STORAGE_KEYS.EMPLOYEES);
        }
      }
      
      return profiles[index];
    }
  },

  // Authentication
  login: async (email: string, password: string): Promise<{ success: boolean; user?: any; message?: string; suspensionData?: any; pending?: boolean; pendingData?: any }> => {
    try {
      // Try backend API first
      const response = await axiosInstance.post('/api/login', {
        email,
        password
      });
      const data = response.data;
      
      // Handle different response formats
      if (data.success && data.user) {
        return {
          success: true,
          user: data.user
        };
      }
      
      // Check for suspension
      if (data.suspended || data.message?.toLowerCase().includes('suspended')) {
        return {
          success: false,
          message: 'Account suspended',
          suspensionData: data.suspensionData || {
            reason: data.reason || 'Account suspended',
            suspendedAt: data.suspendedAt || new Date().toISOString(),
            suspendedBy: data.suspendedBy || 'Administrator',
            accountName: data.accountName || email,
          }
        };
      }
      
      // Check for pending approval
      if (data.pending || data.message?.toLowerCase().includes('pending')) {
        return {
          success: false,
          message: 'Account pending approval',
          pending: true,
          pendingData: data.pendingData || {
            name: data.name || email,
            email: email,
            submittedAt: data.submittedAt || new Date().toISOString(),
          }
        };
      }
      
      // If response doesn't have expected structure, fallback to localStorage
      console.warn('Backend API response format unexpected, using localStorage fallback');
      throw new Error('API response format unexpected');
      
    } catch (error: any) {
      console.error('Error logging in via API, using localStorage fallback:', error);
      
      // Fallback to localStorage
      const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
      
      // Ensure accounts is an array
      if (!Array.isArray(accounts)) {
        return { success: false, message: 'Data error - please refresh the page' };
      }
      
      // Check both username and email fields
      const account = accounts.find((acc: Account) => 
        (acc.email === email || acc.username === email) && acc.password === password
      );
      
      if (!account) {
        return { success: false, message: 'Invalid credentials' };
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
          availableRoles: account.availableRoles || [account.role], // Include available roles
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
          availableRoles: account.availableRoles || [account.role], // Include available roles
          signature: account.signature || employee.signature, // Include signature from account
        }
      };
    }
  },

  // Get user by ID (for session restoration with avatar/signature)
  getUserById: async (userId: number): Promise<any | null> => {
    try {
      // Try backend API first
      const response = await axiosInstance.get(`/api/users/${userId}`);
      const data = response.data;
      
      let user: any | null = null;
      
      // Handle different response formats
      if (data.success && data.user) {
        user = data.user;
      } else if (data.user) {
        user = data.user;
      } else if (data.id) {
        user = data;
      }
      
      if (user) {
        return user;
      }
      
      // If API doesn't return user, fallback to localStorage
      console.warn('Backend API did not return user, using localStorage fallback');
      throw new Error('API response format unexpected');
      
    } catch (error) {
      console.error('Error getting user by ID via API, using localStorage fallback:', error);
      
      // Fallback to localStorage
      const accounts = getFromStorage(STORAGE_KEYS.ACCOUNTS, []) as Account[];
      const employees = getFromStorage(STORAGE_KEYS.EMPLOYEES, []) as Employee[];
      
      // Find the account
      const account = accounts.find((acc: Account) => acc.id === userId);
      if (!account) {
        return null;
      }

      // If account has employeeId, merge with employee data
      if (account.employeeId) {
        const employee = employees.find((emp: Employee) => emp.id === account.employeeId);
        if (employee) {
          return {
            id: account.id,
            username: account.username,
            email: account.email,
            role: account.role,
            name: employee.name,
            position: employee.position,
            department: employee.department,
            branch: employee.branch,
            hireDate: employee.hireDate,
            avatar: employee.avatar,
            bio: employee.bio,
            signature: account.signature || employee.signature,
            isActive: account.isActive,
            lastLogin: account.lastLogin,
            availableRoles: account.availableRoles || [account.role],
          };
        }
      }

      // Return account data if no employee found
      return {
        id: account.id,
        username: account.username,
        name: account.name || account.username,
        email: account.email,
        role: account.role,
        position: account.position || 'System Administrator',
        department: account.department || 'IT',
        branch: account.branch || 'head-office',
        hireDate: account.hireDate || new Date().toISOString(),
        avatar: undefined,
        bio: undefined,
        signature: account.signature,
        isActive: account.isActive,
        lastLogin: account.lastLogin,
        availableRoles: account.availableRoles || [account.role],
      };
    }
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
      // Invalidate cache for each key
      storageCache.invalidate(key);
    });
    
    // Clear all cache entries
    storageCache.clear();
    
    // Reinitialize data
    initializeData();
  },

  // Force reinitialize accounts data (fixes corrupted data)
  forceReinitializeAccounts: (): void => {
    forceReinitializeAccounts();
  },

  // Notifications
  getNotifications: async (userRole: string): Promise<Notification[]> => {
    try {
      // Try backend API first
      const response = await axiosInstance.get(`/api/notifications`, {
        params: { role: userRole }
      });
      const data = response.data;
      
      let notifications: Notification[] = [];
      
      // Handle different response formats
      if (data.success && data.notifications) {
        notifications = data.notifications;
      } else if (Array.isArray(data.notifications)) {
        notifications = data.notifications;
      } else if (Array.isArray(data)) {
        notifications = data;
      }
      
      if (notifications.length > 0 || data.success !== false) {
        // Cache the notifications for offline fallback
        const allNotifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
        // Merge with existing notifications (avoid duplicates)
        notifications.forEach(notif => {
          const existingIndex = allNotifications.findIndex(n => n.id === notif.id);
          if (existingIndex !== -1) {
            allNotifications[existingIndex] = notif;
          } else {
            allNotifications.push(notif);
          }
        });
        saveToStorage(STORAGE_KEYS.NOTIFICATIONS, allNotifications);
        storageCache.invalidate(STORAGE_KEYS.NOTIFICATIONS);
        
        // Filter by role
        return notifications.filter(notification => 
          notification.roles.includes(userRole) || 
          notification.roles.includes('all')
        );
      }
      
      // If response doesn't have expected structure, fallback to localStorage
      console.warn('Backend API response format unexpected, using localStorage fallback');
      const allNotifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
      return allNotifications.filter(notification => 
        notification.roles.includes(userRole) || 
        notification.roles.includes('all')
      );
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fallback to localStorage
      const allNotifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
      return allNotifications.filter(notification => 
        notification.roles.includes(userRole) || 
        notification.roles.includes('all')
      );
    }
  },

  createNotification: async (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<Notification> => {
    try {
      // Try backend API first
      const response = await axiosInstance.post('/api/notifications', notification);
      const data = response.data;
      
      let newNotification: Notification | null = null;
      
      // Handle different response formats
      if (data.success && data.notification) {
        newNotification = data.notification;
      } else if (data.notification) {
        newNotification = data.notification;
      } else if (data.id) {
        newNotification = data as Notification;
      }
      
      if (newNotification) {
        // Cache the new notification in localStorage
        const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
        const existingIndex = notifications.findIndex(n => n.id === newNotification!.id);
        if (existingIndex !== -1) {
          notifications[existingIndex] = newNotification;
        } else {
          notifications.push(newNotification);
        }
        saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
        storageCache.invalidate(STORAGE_KEYS.NOTIFICATIONS);
        
        // Trigger storage event for real-time updates across tabs
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new StorageEvent('storage', {
            key: STORAGE_KEYS.NOTIFICATIONS,
            newValue: JSON.stringify(notifications)
          }));
        }
        
        return newNotification;
      }
      
      // If API doesn't return notification, fallback to localStorage
      console.warn('Backend API did not return notification, using localStorage fallback');
      throw new Error('API response format unexpected');
      
    } catch (error) {
      console.error('Error creating notification via API, using localStorage fallback:', error);
      
      // Fallback to localStorage
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
      storageCache.invalidate(STORAGE_KEYS.NOTIFICATIONS);
      
      // Trigger storage event for real-time updates across tabs
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEYS.NOTIFICATIONS,
          newValue: JSON.stringify(notifications)
        }));
      }
      
      return newNotification;
    }
  },

  markNotificationAsRead: async (notificationId: number): Promise<void> => {
    try {
      // Try backend API first
      await axiosInstance.put(`/api/notifications/${notificationId}/read`);
      
      // Update localStorage cache
      const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (notification) {
        notification.isRead = true;
        saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
        storageCache.invalidate(STORAGE_KEYS.NOTIFICATIONS);
        
        // Trigger storage event for real-time updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new StorageEvent('storage', {
            key: STORAGE_KEYS.NOTIFICATIONS,
            newValue: JSON.stringify(notifications)
          }));
        }
      }
      
    } catch (error) {
      console.error('Error marking notification as read via API, using localStorage fallback:', error);
      
      // Fallback to localStorage
      const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (notification) {
        notification.isRead = true;
        saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
        storageCache.invalidate(STORAGE_KEYS.NOTIFICATIONS);
        
        // Trigger storage event for real-time updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new StorageEvent('storage', {
            key: STORAGE_KEYS.NOTIFICATIONS,
            newValue: JSON.stringify(notifications)
          }));
        }
      }
    }
  },

  markAllNotificationsAsRead: async (userRole: string): Promise<void> => {
    try {
      // Try backend API first
      await axiosInstance.put(`/api/notifications/read-all`, null, {
        params: { role: userRole }
      });
      
      // Update localStorage cache
      const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
      const userNotifications = notifications.filter(notification => 
        notification.roles.includes(userRole) || 
        notification.roles.includes('all')
      );
      
      userNotifications.forEach(notification => {
        notification.isRead = true;
      });
      
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
      storageCache.invalidate(STORAGE_KEYS.NOTIFICATIONS);
      
      // Trigger storage event for real-time updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEYS.NOTIFICATIONS,
          newValue: JSON.stringify(notifications)
        }));
      }
      
    } catch (error) {
      console.error('Error marking all notifications as read via API, using localStorage fallback:', error);
      
      // Fallback to localStorage
      const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
      const userNotifications = notifications.filter(notification => 
        notification.roles.includes(userRole) || 
        notification.roles.includes('all')
      );
      
      userNotifications.forEach(notification => {
        notification.isRead = true;
      });
      
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
      storageCache.invalidate(STORAGE_KEYS.NOTIFICATIONS);
      
      // Trigger storage event for real-time updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEYS.NOTIFICATIONS,
          newValue: JSON.stringify(notifications)
        }));
      }
    }
  },

  getUnreadNotificationCount: async (userRole: string): Promise<number> => {
    try {
      // Try backend API first
      const response = await axiosInstance.get(`/api/notifications/unread-count`, {
        params: { role: userRole }
      });
      const data = response.data;
      
      // Handle different response formats
      if (typeof data.count === 'number') {
        return data.count;
      } else if (typeof data.unreadCount === 'number') {
        return data.unreadCount;
      } else if (typeof data === 'number') {
        return data;
      }
      
      // If response doesn't have expected structure, fallback to localStorage
      console.warn('Backend API response format unexpected, using localStorage fallback');
      const notifications = await clientDataService.getNotifications(userRole);
      return notifications.filter(notification => !notification.isRead).length;
      
    } catch (error) {
      console.error('Error getting unread notification count via API, using localStorage fallback:', error);
      // Fallback to localStorage
      const notifications = await clientDataService.getNotifications(userRole);
      return notifications.filter(notification => !notification.isRead).length;
    }
  },

  deleteNotification: async (notificationId: number): Promise<void> => {
    try {
      // Try backend API first
      await axiosInstance.delete(`/api/notifications/${notificationId}`);
      
      // Update localStorage cache
      const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
      const updatedNotifications = notifications.filter(n => n.id !== notificationId);
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, updatedNotifications);
      storageCache.invalidate(STORAGE_KEYS.NOTIFICATIONS);
      
      // Trigger storage event for real-time updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEYS.NOTIFICATIONS,
          newValue: JSON.stringify(updatedNotifications)
        }));
      }
      
    } catch (error) {
      console.error('Error deleting notification via API, using localStorage fallback:', error);
      
      // Fallback to localStorage
      const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
      const updatedNotifications = notifications.filter(n => n.id !== notificationId);
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, updatedNotifications);
      storageCache.invalidate(STORAGE_KEYS.NOTIFICATIONS);
      
      // Trigger storage event for real-time updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEYS.NOTIFICATIONS,
          newValue: JSON.stringify(updatedNotifications)
        }));
      }
    }
  },

  // Migrate old notification URLs (tab=reviews -> tab=overview for employees)
  migrateNotificationUrls: async (): Promise<void> => {
    const notifications = getFromStorage(STORAGE_KEYS.NOTIFICATIONS, [] as Notification[]);
    let updated = false;
    
    const migratedNotifications = notifications.map(notification => {
      // Only update employee notifications with reviews tab
      if (notification.roles.includes('employee') && 
          notification.actionUrl && 
          notification.actionUrl.includes('/employee-dashboard?tab=reviews')) {
        updated = true;
        return {
          ...notification,
          actionUrl: notification.actionUrl.replace('?tab=reviews', '?tab=overview')
        };
      }
      return notification;
    });
    
    if (updated) {
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, migratedNotifications);
      console.log('✅ Migrated notification URLs from reviews to overview tab');
      
      // Trigger storage event for real-time updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEYS.NOTIFICATIONS,
          newValue: JSON.stringify(migratedNotifications)
        }));
      }
    }
  },

  // Force refresh accounts data from JSON (clears cache)
  forceRefreshAccounts: (): void => {
    if (typeof window === 'undefined') return;
    
    console.log('🔄 Force refreshing accounts data...');
    localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
    // Invalidate cache when removing from localStorage
    storageCache.invalidate(STORAGE_KEYS.ACCOUNTS);
    saveToStorage(STORAGE_KEYS.ACCOUNTS, accountsData.accounts || []);
    console.log('✅ Accounts data refreshed from source');
  },

  // Get all accounts
  getAccounts: async (): Promise<Account[]> => {
    return getFromStorage(STORAGE_KEYS.ACCOUNTS, []);
  },

  
  // BACKEND-READY FUNCTIONS 
 
  
  // Get single submission by ID
  getSubmissionById: async (id: number): Promise<Submission | null> => {
    try {
      // Try backend first
      const response = await axiosInstance.get(`/submissions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching submission by ID:', error);
      // Fallback to localStorage
      const submissions = await clientDataService.getSubmissions();
      return submissions.find(sub => sub.id === id) || null;
    }
  },

  // Employee Approval - Update submission with employee signature
  updateSubmissionWithEmployeeSignature: async (
    submissionId: number, 
    employeeSignature: string
  ): Promise<Submission | null> => {
    try {
      // Try backend first
      const response = await axiosInstance.patch(
        `/submissions/${submissionId}/employee-approve`,
        {
          employeeSignature,
          employeeApprovedAt: new Date().toISOString(),
          approvalStatus: 'employee_approved'
        }
      );
      
      const updated = response.data;
      // Update localStorage cache
      const submissions = await clientDataService.getSubmissions();
      const updatedSubmissions = submissions.map(sub => 
        sub.id === submissionId ? { ...sub, ...updated } : sub
      );
      saveToStorage(STORAGE_KEYS.SUBMISSIONS, updatedSubmissions);
      return updated;
    } catch (error) {
      console.error('Error updating employee signature:', error);
      // Fallback to localStorage
      const submissions = await clientDataService.getSubmissions();
      const updatedSubmissions = submissions.map(sub => {
        if (sub.id === submissionId) {
          return {
            ...sub,
            employeeSignature,
            employeeApprovedAt: new Date().toISOString(),
            approvalStatus: 'employee_approved'
          };
        }
        return sub;
      });
      saveToStorage(STORAGE_KEYS.SUBMISSIONS, updatedSubmissions);
      return updatedSubmissions.find(sub => sub.id === submissionId) || null;
    }
  },

  // Evaluator Approval - Update submission with evaluator signature
  updateSubmissionWithEvaluatorSignature: async (
    submissionId: number, 
    evaluatorSignature: string
  ): Promise<Submission | null> => {
    try {
      // Try backend first
      const response = await axiosInstance.patch(
        `/submissions/${submissionId}/evaluator-approve`,
        {
          evaluatorSignature,
          evaluatorApprovedAt: new Date().toISOString(),
          approvalStatus: 'fully_approved'
        }
      );
      
      const updated = response.data;
      // Update localStorage cache
      const submissions = await clientDataService.getSubmissions();
      const updatedSubmissions = submissions.map(sub => 
        sub.id === submissionId ? { ...sub, ...updated } : sub
      );
      saveToStorage(STORAGE_KEYS.SUBMISSIONS, updatedSubmissions);
      return updated;
    } catch (error) {
      console.error('Error updating evaluator signature:', error);
      // Fallback to localStorage
      const submissions = await clientDataService.getSubmissions();
      const updatedSubmissions = submissions.map(sub => {
        if (sub.id === submissionId) {
          return {
            ...sub,
            evaluatorSignature,
            evaluatorApprovedAt: new Date().toISOString(),
            approvalStatus: 'fully_approved'
          };
        }
        return sub;
      });
      saveToStorage(STORAGE_KEYS.SUBMISSIONS, updatedSubmissions);
      return updatedSubmissions.find(sub => sub.id === submissionId) || null;
    }
  },

  // Delete Submission
  deleteSubmission: async (id: number): Promise<{ success: boolean; message: string }> => {
    try {
      // Try backend first
      await axiosInstance.delete(`/submissions/${id}`);
      // Update localStorage cache
      const submissions = await clientDataService.getSubmissions();
      const updatedSubmissions = submissions.filter(sub => sub.id !== id);
      saveToStorage(STORAGE_KEYS.SUBMISSIONS, updatedSubmissions);
      return { success: true, message: 'Submission deleted successfully' };
    } catch (error) {
      console.error('Error deleting submission:', error);
      // Fallback to localStorage
      const submissions = await clientDataService.getSubmissions();
      const updatedSubmissions = submissions.filter(sub => sub.id !== id);
      saveToStorage(STORAGE_KEYS.SUBMISSIONS, updatedSubmissions);
      return { success: true, message: 'Submission deleted successfully (offline)' };
    }
  },


  // Bulk approve submissions (for evaluator)
  bulkApproveSubmissions: async (submissionIds: number[]): Promise<{ success: boolean; message: string }> => {
    try {
      // Try backend first
      await axiosInstance.patch('/submissions/bulk-approve', { submissionIds });
      return { success: true, message: 'Submissions approved successfully' };
    } catch (error) {
      console.error('Error bulk approving submissions:', error);
      return { success: false, message: 'Failed to approve submissions' };
    }
  },

  // Update approval status (generic)
  updateApprovalStatus: async (
    submissionId: number, 
    approvalStatus: string,
    additionalData?: Partial<Submission>
  ): Promise<Submission | null> => {
    try {
      // Try backend first
      const response = await axiosInstance.patch(
        `/submissions/${submissionId}/approval-status`,
        {
          approvalStatus,
          ...additionalData
        }
      );
      
      const updated = response.data;
      // Update localStorage cache
      const submissions = await clientDataService.getSubmissions();
      const updatedSubmissions = submissions.map(sub => 
        sub.id === submissionId ? { ...sub, ...updated } : sub
      );
      saveToStorage(STORAGE_KEYS.SUBMISSIONS, updatedSubmissions);
      return updated;
    } catch (error) {
      console.error('Error updating approval status:', error);
      // Fallback to localStorage
      const submissions = await clientDataService.getSubmissions();
      const updatedSubmissions = submissions.map(sub => {
        if (sub.id === submissionId) {
          return {
            ...sub,
            approvalStatus,
            ...additionalData
          };
        }
        return sub;
      });
      saveToStorage(STORAGE_KEYS.SUBMISSIONS, updatedSubmissions);
      return updatedSubmissions.find(sub => sub.id === submissionId) || null;
    }
  },
};

export default clientDataService;
