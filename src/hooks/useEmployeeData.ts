// src/hooks/useEmployeeData.ts

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/lib/apiService';
import {
  Employee,
  EmployeeSearchResult
} from '@/lib/types';

// Hook for getting all employees
export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getEmployees();
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return { employees, loading, error, refetch: fetchEmployees };
};

// Hook for getting a single employee by ID
export const useEmployee = (id: number | null) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployee = useCallback(async (employeeId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getEmployee(employeeId);
      setEmployee(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employee');
      console.error('Error fetching employee:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchEmployee(id);
    } else {
      setEmployee(null);
    }
  }, [id, fetchEmployee]);

  return { employee, loading, error, refetch: () => id && fetchEmployee(id) };
};

// Hook for employee search
export const useEmployeeSearch = () => {
  const [results, setResults] = useState<EmployeeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiService.searchEmployees(query);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search employees');
      console.error('Error searching employees:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, error, search, clearResults };
};

// Hook for getting employees by department
export const useEmployeesByDepartment = (department: string | null) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async (dept: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getEmployeesByDepartment(dept);
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees by department');
      console.error('Error fetching employees by department:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (department) {
      fetchEmployees(department);
    } else {
      setEmployees([]);
    }
  }, [department, fetchEmployees]);

  return { employees, loading, error, refetch: () => department && fetchEmployees(department) };
};

// Hook for getting employees by role
export const useEmployeesByRole = (role: string | null) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async (employeeRole: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getEmployeesByRole(employeeRole);
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees by role');
      console.error('Error fetching employees by role:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role) {
      fetchEmployees(role);
    } else {
      setEmployees([]);
    }
  }, [role, fetchEmployees]);

  return { employees, loading, error, refetch: () => role && fetchEmployees(role) };
};

// Hook for employee statistics
export const useEmployeeStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getEmployeeStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employee statistics');
      console.error('Error fetching employee statistics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

// Hook for updating employee
export const useUpdateEmployee = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEmployeeData = useCallback(async (id: number, updates: Partial<Employee>) => {
    try {
      setLoading(true);
      setError(null);
      // Convert updates to FormData for apiService
      const formData = new FormData();
      Object.keys(updates).forEach(key => {
        const value = updates[key as keyof Employee];
        if (value !== undefined && value !== null) {
          // Check if value is a File object by checking for File-specific properties
          const valueAny = value as any;
          if (valueAny && typeof valueAny === 'object' && valueAny.constructor && valueAny.constructor.name === 'File') {
            formData.append(key, valueAny as File);
          } else {
            formData.append(key, String(value));
          }
        }
      });
      const updatedEmployee = await apiService.updateEmployee(formData, id);
      return updatedEmployee;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update employee';
      setError(errorMessage);
      console.error('Error updating employee:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateEmployee: updateEmployeeData, loading, error };
};

// Utility hook to get employee name by ID
export const useEmployeeName = (id: number | null) => {
  const { employee, loading } = useEmployee(id);
  return { name: employee?.name || null, loading };
};

// Utility hook to get employee info by email
export const useEmployeeByEmail = (email: string | null) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployee = useCallback(async (employeeEmail: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getEmployeeByEmail(employeeEmail);
      setEmployee(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employee by email');
      console.error('Error fetching employee by email:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (email) {
      fetchEmployee(email);
    } else {
      setEmployee(null);
    }
  }, [email, fetchEmployee]);

  return { employee, loading, error, refetch: () => email && fetchEmployee(email) };
};
