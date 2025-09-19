// src/lib/employeeService.ts

import accountsData from '@/data/accounts.json';

export interface Employee {
  id: number;
  employeeId?: number;
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
  approvedDate?: string;
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

const MOCK_EMPLOYEES_STORAGE_KEY = 'mockEmployeesData';

// Helper to get current employees from localStorage or fallback to JSON
const getEmployees = (): Employee[] => {
  if (typeof window === 'undefined') return (accountsData.accounts || []).map(emp => ({
    ...emp,
    lastLogin: emp.lastLogin || undefined
  }));
  
  const stored = localStorage.getItem(MOCK_EMPLOYEES_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Initialize with accounts data if not in localStorage
  const employees = (accountsData.accounts || []).map(emp => ({
    ...emp,
    lastLogin: emp.lastLogin || undefined
  }));
  localStorage.setItem(MOCK_EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
  return employees;
};

// Helper to save employees to localStorage
const saveEmployees = (employees: Employee[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MOCK_EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
  }
};

// Get all employees
export const getAllEmployees = async (): Promise<Employee[]> => {
  console.log('Mock API Call: Getting all employees');
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const employees = getEmployees();
  console.log(`Mock API Call: Retrieved ${employees.length} employees`);
  
  return employees;
};

// Get employee by ID
export const getEmployeeById = async (id: number): Promise<Employee | null> => {
  console.log(`Mock API Call: Getting employee by ID: ${id}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const employees = getEmployees();
  const employee = employees.find(emp => emp.id === id || emp.employeeId === id);
  
  if (employee) {
    console.log(`Mock API Call: Found employee: ${employee.name}`);
    return employee;
  } else {
    console.log(`Mock API Call: Employee with ID ${id} not found`);
    return null;
  }
};

// Get employee by email
export const getEmployeeByEmail = async (email: string): Promise<Employee | null> => {
  console.log(`Mock API Call: Getting employee by email: ${email}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const employees = getEmployees();
  const employee = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase());
  
  if (employee) {
    console.log(`Mock API Call: Found employee: ${employee.name}`);
    return employee;
  } else {
    console.log(`Mock API Call: Employee with email ${email} not found`);
    return null;
  }
};

// Search employees by name, email, or position
export const searchEmployees = async (query: string): Promise<EmployeeSearchResult[]> => {
  console.log(`Mock API Call: Searching employees with query: "${query}"`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  if (!query.trim()) {
    return [];
  }
  
  const employees = getEmployees();
  const normalizedQuery = query.toLowerCase().trim();
  
  const results = employees
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
  
  console.log(`Mock API Call: Found ${results.length} matching employees`);
  return results;
};

// Get employees by department
export const getEmployeesByDepartment = async (department: string): Promise<Employee[]> => {
  console.log(`Mock API Call: Getting employees by department: ${department}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const employees = getEmployees();
  const filtered = employees.filter(emp => 
    emp.department.toLowerCase() === department.toLowerCase()
  );
  
  console.log(`Mock API Call: Found ${filtered.length} employees in ${department}`);
  return filtered;
};

// Get employees by role
export const getEmployeesByRole = async (role: string): Promise<Employee[]> => {
  console.log(`Mock API Call: Getting employees by role: ${role}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const employees = getEmployees();
  const filtered = employees.filter(emp => 
    emp.role.toLowerCase() === role.toLowerCase()
  );
  
  console.log(`Mock API Call: Found ${filtered.length} employees with role ${role}`);
  return filtered;
};

// Update employee information
export const updateEmployee = async (id: number, updates: Partial<Employee>): Promise<Employee | null> => {
  console.log(`Mock API Call: Updating employee ${id} with:`, updates);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const employees = getEmployees();
  const employeeIndex = employees.findIndex(emp => emp.id === id || emp.employeeId === id);
  
  if (employeeIndex === -1) {
    console.log(`Mock API Call: Employee with ID ${id} not found`);
    return null;
  }
  
  // Update employee
  employees[employeeIndex] = {
    ...employees[employeeIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  saveEmployees(employees);
  
  console.log(`Mock API Call: Employee ${id} updated successfully`);
  return employees[employeeIndex];
};

// Get employee statistics
export const getEmployeeStats = async () => {
  console.log('Mock API Call: Getting employee statistics');
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const employees = getEmployees();
  
  const stats = {
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
  
  console.log('Mock API Call: Employee statistics:', stats);
  return stats;
};

// TODO: Replace with actual API calls when backend is ready:
/*
export const getAllEmployees = async (): Promise<Employee[]> => {
  const response = await fetch('/api/employees');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

export const getEmployeeById = async (id: number): Promise<Employee | null> => {
  const response = await fetch(`/api/employees/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

export const searchEmployees = async (query: string): Promise<EmployeeSearchResult[]> => {
  const response = await fetch(`/api/employees/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};
*/
