// Frontend-only evaluation storage using localStorage
// Perfect for frontend developers without backend!

export interface EvaluationResult {
  id: number;
  employeeId: number;
  employeeEmail: string;
  employeeName: string;
  evaluatorId: number;
  evaluatorName: string;
  evaluationData: any;
  submittedAt: string;
  status: 'completed' | 'pending';
  period: string;
  overallRating: string;
}

const STORAGE_KEY = 'employee-evaluation-results';

// Get all evaluation results from localStorage
export const getEvaluationResults = (): EvaluationResult[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading evaluation results:', error);
    return [];
  }
};

// Get evaluation results for specific employee
export const getEmployeeResults = (employeeEmail: string): EvaluationResult[] => {
  const allResults = getEvaluationResults();
  return allResults.filter(result => result.employeeEmail === employeeEmail);
};

// Store new evaluation result
export const storeEvaluationResult = (result: Omit<EvaluationResult, 'id' | 'submittedAt'>): EvaluationResult => {
  const allResults = getEvaluationResults();
  
  const newResult: EvaluationResult = {
    ...result,
    id: Date.now(),
    submittedAt: new Date().toISOString()
  };
  
  allResults.unshift(newResult);
  
  // Keep only last 100 results per employee
  const employeeResults = allResults.filter(r => r.employeeId === newResult.employeeId);
  if (employeeResults.length > 100) {
    const toKeep = employeeResults.slice(0, 100);
    const otherResults = allResults.filter(r => r.employeeId !== newResult.employeeId);
    const finalResults = [...otherResults, ...toKeep];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalResults));
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allResults));
  }
  
  return newResult;
};

// Initialize with some mock data
export const initializeMockData = () => {
  // No mock data - start with empty results
  return;
};

// Clear all data (useful for testing)
export const clearAllData = () => {
  localStorage.removeItem(STORAGE_KEY);
};
