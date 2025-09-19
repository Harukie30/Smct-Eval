// src/lib/employeeSignatureService.ts

import { EvaluationRecord } from './evaluationRecordsService';

export interface EmployeeSignatureData {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  signature: string;
  signatureDate: string;
  evaluationId?: number;
  evaluationTitle?: string;
  department?: string;
  position?: string;
  branch?: string;
  approvalStatus?: string;
}

export interface SignatureRetrievalOptions {
  employeeId?: number;
  evaluationId?: number;
  includeInactive?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}

const MOCK_SIGNATURES_STORAGE_KEY = 'mockEmployeeSignatures';

// Helper to get current mock signatures from localStorage
const getMockSignatures = (): EmployeeSignatureData[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(MOCK_SIGNATURES_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
};

// Helper to save mock signatures to localStorage
const saveMockSignatures = (signatures: EmployeeSignatureData[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MOCK_SIGNATURES_STORAGE_KEY, JSON.stringify(signatures));
  }
};

// Initialize with some sample data if none exists
const initializeSampleSignatures = () => {
  const existingSignatures = getMockSignatures();
  if (existingSignatures.length === 0) {
    const sampleSignatures: EmployeeSignatureData[] = [
      {
        id: 1,
        employeeId: 2,
        employeeName: 'John Doe',
        employeeEmail: 'john.doe@company.com',
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Sample base64 signature
        signatureDate: '2024-01-15T10:30:00.000Z',
        evaluationId: 1,
        evaluationTitle: 'Q1 2024 Performance Review',
        department: 'IT',
        position: 'Software Developer',
        branch: 'Head Office',
        approvalStatus: 'employee_approved'
      },
      {
        id: 2,
        employeeId: 3,
        employeeName: 'Jane Smith',
        employeeEmail: 'jane.smith@company.com',
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        signatureDate: '2024-01-16T14:20:00.000Z',
        evaluationId: 2,
        evaluationTitle: 'Q1 2024 Performance Review',
        department: 'HR',
        position: 'HR Manager',
        branch: 'Cebu Branch',
        approvalStatus: 'fully_approved'
      }
    ];
    saveMockSignatures(sampleSignatures);
  }
};

// Initialize sample data on module load
initializeSampleSignatures();

/**
 * Get employee signature by evaluation ID
 */
export const getEmployeeSignatureByEvaluation = async (evaluationId: number): Promise<EmployeeSignatureData | null> => {
  console.log(`Mock API Call: Getting employee signature for evaluation ID: ${evaluationId}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const signatures = getMockSignatures();
  const signature = signatures.find(sig => sig.evaluationId === evaluationId);
  
  if (signature) {
    console.log(`✅ Found employee signature for evaluation ${evaluationId}:`, signature.employeeName);
    return signature;
  } else {
    console.log(`❌ No employee signature found for evaluation ${evaluationId}`);
    return null;
  }
};

/**
 * Get employee signature by employee ID
 */
export const getEmployeeSignatureByEmployee = async (employeeId: number): Promise<EmployeeSignatureData[]> => {
  console.log(`Mock API Call: Getting employee signatures for employee ID: ${employeeId}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const signatures = getMockSignatures();
  const employeeSignatures = signatures.filter(sig => sig.employeeId === employeeId);
  
  console.log(`✅ Found ${employeeSignatures.length} signatures for employee ${employeeId}`);
  return employeeSignatures;
};

/**
 * Get all employee signatures with optional filtering
 */
export const getAllEmployeeSignatures = async (options?: SignatureRetrievalOptions): Promise<EmployeeSignatureData[]> => {
  console.log('Mock API Call: Getting all employee signatures with options:', options);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  let signatures = getMockSignatures();
  
  // Apply filters
  if (options?.employeeId) {
    signatures = signatures.filter(sig => sig.employeeId === options.employeeId);
  }
  
  if (options?.evaluationId) {
    signatures = signatures.filter(sig => sig.evaluationId === options.evaluationId);
  }
  
  if (options?.dateRange) {
    const fromDate = new Date(options.dateRange.from);
    const toDate = new Date(options.dateRange.to);
    signatures = signatures.filter(sig => {
      const sigDate = new Date(sig.signatureDate);
      return sigDate >= fromDate && sigDate <= toDate;
    });
  }
  
  if (!options?.includeInactive) {
    // Filter out signatures from inactive employees (you might want to check employee status)
    signatures = signatures.filter(sig => sig.approvalStatus !== 'rejected');
  }
  
  console.log(`✅ Retrieved ${signatures.length} employee signatures`);
  return signatures;
};

/**
 * Save employee signature (for when employee signs evaluation)
 */
export const saveEmployeeSignature = async (signatureData: Omit<EmployeeSignatureData, 'id'>): Promise<EmployeeSignatureData> => {
  console.log('Mock API Call: Saving employee signature:', signatureData);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 700));
  
  const signatures = getMockSignatures();
  const newSignature: EmployeeSignatureData = {
    ...signatureData,
    id: Date.now(), // Simple ID generation
  };
  
  signatures.push(newSignature);
  saveMockSignatures(signatures);
  
  console.log('✅ Employee signature saved successfully:', newSignature);
  return newSignature;
};

/**
 * Update employee signature
 */
export const updateEmployeeSignature = async (id: number, updates: Partial<EmployeeSignatureData>): Promise<EmployeeSignatureData | null> => {
  console.log(`Mock API Call: Updating employee signature ID: ${id}`, updates);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const signatures = getMockSignatures();
  const index = signatures.findIndex(sig => sig.id === id);
  
  if (index === -1) {
    console.log(`❌ Employee signature with ID ${id} not found`);
    return null;
  }
  
  signatures[index] = { ...signatures[index], ...updates };
  saveMockSignatures(signatures);
  
  console.log('✅ Employee signature updated successfully');
  return signatures[index];
};

/**
 * Delete employee signature
 */
export const deleteEmployeeSignature = async (id: number): Promise<boolean> => {
  console.log(`Mock API Call: Deleting employee signature ID: ${id}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const signatures = getMockSignatures();
  const initialLength = signatures.length;
  const filteredSignatures = signatures.filter(sig => sig.id !== id);
  
  if (filteredSignatures.length === initialLength) {
    console.log(`❌ Employee signature with ID ${id} not found`);
    return false;
  }
  
  saveMockSignatures(filteredSignatures);
  console.log('✅ Employee signature deleted successfully');
  return true;
};

/**
 * Get signature statistics
 */
export const getSignatureStats = async (): Promise<{
  total: number;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
  recentSignatures: number; // Last 30 days
}> => {
  console.log('Mock API Call: Getting signature statistics');
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const signatures = getMockSignatures();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const stats = {
    total: signatures.length,
    byDepartment: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    recentSignatures: signatures.filter(sig => new Date(sig.signatureDate) >= thirtyDaysAgo).length
  };
  
  // Count by department
  signatures.forEach(sig => {
    const dept = sig.department || 'Unknown';
    stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
  });
  
  // Count by status
  signatures.forEach(sig => {
    const status = sig.approvalStatus || 'pending';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
  });
  
  console.log('✅ Signature statistics retrieved:', stats);
  return stats;
};

export default {
  getEmployeeSignatureByEvaluation,
  getEmployeeSignatureByEmployee,
  getAllEmployeeSignatures,
  saveEmployeeSignature,
  updateEmployeeSignature,
  deleteEmployeeSignature,
  getSignatureStats
};
