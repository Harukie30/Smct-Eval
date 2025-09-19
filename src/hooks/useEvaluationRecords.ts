// src/hooks/useEvaluationRecords.ts

import { useState, useEffect, useCallback } from 'react';
import { 
  getAllEvaluationRecords, 
  getEvaluationRecordById, 
  searchEvaluationRecords,
  updateEvaluationRecord,
  addEmployeeSignatureApproval,
  addEvaluatorSignatureApproval,
  getEvaluationRecordsStats,
  getApprovalHistoryForRecord,
  EvaluationRecord,
  EvaluationRecordSearchParams,
  ApprovalHistoryEntry
} from '@/lib/evaluationRecordsService';

// Hook for getting all evaluation records
export const useEvaluationRecords = () => {
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllEvaluationRecords();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch evaluation records');
      console.error('Error fetching evaluation records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, loading, error, refetch: fetchRecords };
};

// Hook for getting a single evaluation record by ID
export const useEvaluationRecord = (id: number | null) => {
  const [record, setRecord] = useState<EvaluationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecord = useCallback(async (recordId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEvaluationRecordById(recordId);
      setRecord(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch evaluation record');
      console.error('Error fetching evaluation record:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchRecord(id);
    } else {
      setRecord(null);
    }
  }, [id, fetchRecord]);

  return { record, loading, error, refetch: () => id && fetchRecord(id) };
};

// Hook for searching evaluation records
export const useEvaluationRecordsSearch = () => {
  const [results, setResults] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (params: EvaluationRecordSearchParams) => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchEvaluationRecords(params);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search evaluation records');
      console.error('Error searching evaluation records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, error, search, clearResults };
};

// Hook for evaluation records statistics
export const useEvaluationRecordsStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEvaluationRecordsStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch evaluation records statistics');
      console.error('Error fetching evaluation records statistics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

// Hook for updating evaluation records
export const useUpdateEvaluationRecord = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRecord = useCallback(async (id: number, updates: Partial<EvaluationRecord>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedRecord = await updateEvaluationRecord(id, updates);
      return updatedRecord;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update evaluation record';
      setError(errorMessage);
      console.error('Error updating evaluation record:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateRecord, loading, error };
};

// Hook for employee signature approval
export const useEmployeeSignatureApproval = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveWithSignature = useCallback(async (
    recordId: number,
    approvalData: {
      employeeSignature: string;
      employeeName: string;
      employeeEmail: string;
      comments?: string;
    }
  ) => {
    try {
      setLoading(true);
      setError(null);
      const updatedRecord = await addEmployeeSignatureApproval(recordId, approvalData);
      return updatedRecord;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add employee signature approval';
      setError(errorMessage);
      console.error('Error adding employee signature approval:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { approveWithSignature, loading, error };
};

// Hook for evaluator signature approval
export const useEvaluatorSignatureApproval = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveWithSignature = useCallback(async (
    recordId: number,
    approvalData: {
      evaluatorSignature: string;
      evaluatorName: string;
      evaluatorEmail: string;
      comments?: string;
    }
  ) => {
    try {
      setLoading(true);
      setError(null);
      const updatedRecord = await addEvaluatorSignatureApproval(recordId, approvalData);
      return updatedRecord;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add evaluator signature approval';
      setError(errorMessage);
      console.error('Error adding evaluator signature approval:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { approveWithSignature, loading, error };
};

// Hook for approval history
export const useApprovalHistory = (recordId: number | null) => {
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getApprovalHistoryForRecord(id);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approval history');
      console.error('Error fetching approval history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (recordId) {
      fetchHistory(recordId);
    } else {
      setHistory([]);
    }
  }, [recordId, fetchHistory]);

  return { history, loading, error, refetch: () => recordId && fetchHistory(recordId) };
};

// Hook for getting records by employee
export const useEvaluationRecordsByEmployee = (employeeId: number | null) => {
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async (empId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchEvaluationRecords({ employeeId: empId });
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employee evaluation records');
      console.error('Error fetching employee evaluation records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (employeeId) {
      fetchRecords(employeeId);
    } else {
      setRecords([]);
    }
  }, [employeeId, fetchRecords]);

  return { records, loading, error, refetch: () => employeeId && fetchRecords(employeeId) };
};

// Hook for getting records by evaluator
export const useEvaluationRecordsByEvaluator = (evaluatorId: string | null) => {
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async (evalId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchEvaluationRecords({ evaluatorId: evalId });
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch evaluator evaluation records');
      console.error('Error fetching evaluator evaluation records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (evaluatorId) {
      fetchRecords(evaluatorId);
    } else {
      setRecords([]);
    }
  }, [evaluatorId, fetchRecords]);

  return { records, loading, error, refetch: () => evaluatorId && fetchRecords(evaluatorId) };
};

// Hook for getting pending approvals
export const usePendingApprovals = () => {
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchEvaluationRecords({ approvalStatus: 'pending' });
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pending approvals');
      console.error('Error fetching pending approvals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  return { records, loading, error, refetch: fetchPendingApprovals };
};
