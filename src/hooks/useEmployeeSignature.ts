// src/hooks/useEmployeeSignature.ts

import { useState, useEffect, useCallback } from 'react';
import {
  getEmployeeSignatureByEvaluation,
  getEmployeeSignatureByEmployee,
  getAllEmployeeSignatures,
  saveEmployeeSignature,
  updateEmployeeSignature,
  deleteEmployeeSignature,
  getSignatureStats,
  EmployeeSignatureData,
  SignatureRetrievalOptions
} from '@/lib/employeeSignatureService';

interface UseEmployeeSignatureByEvaluationResult {
  signature: EmployeeSignatureData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useEmployeeSignatureByEvaluation = (evaluationId: number | null): UseEmployeeSignatureByEvaluationResult => {
  const [signature, setSignature] = useState<EmployeeSignatureData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSignature = useCallback(async () => {
    if (!evaluationId) {
      setSignature(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getEmployeeSignatureByEvaluation(evaluationId);
      setSignature(data);
    } catch (err: any) {
      setError(err.message || `Failed to fetch employee signature for evaluation ${evaluationId}`);
    } finally {
      setLoading(false);
    }
  }, [evaluationId]);

  useEffect(() => {
    loadSignature();
  }, [loadSignature]);

  return { signature, loading, error, refetch: loadSignature };
};

interface UseEmployeeSignaturesByEmployeeResult {
  signatures: EmployeeSignatureData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useEmployeeSignaturesByEmployee = (employeeId: number | null): UseEmployeeSignaturesByEmployeeResult => {
  const [signatures, setSignatures] = useState<EmployeeSignatureData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSignatures = useCallback(async () => {
    if (!employeeId) {
      setSignatures([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getEmployeeSignatureByEmployee(employeeId);
      setSignatures(data);
    } catch (err: any) {
      setError(err.message || `Failed to fetch employee signatures for employee ${employeeId}`);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadSignatures();
  }, [loadSignatures]);

  return { signatures, loading, error, refetch: loadSignatures };
};

interface UseAllEmployeeSignaturesResult {
  signatures: EmployeeSignatureData[];
  loading: boolean;
  error: string | null;
  refetch: (options?: SignatureRetrievalOptions) => void;
}

export const useAllEmployeeSignatures = (initialOptions?: SignatureRetrievalOptions): UseAllEmployeeSignaturesResult => {
  const [signatures, setSignatures] = useState<EmployeeSignatureData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSignatures = useCallback(async (options?: SignatureRetrievalOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllEmployeeSignatures(options);
      setSignatures(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employee signatures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSignatures(initialOptions);
  }, [loadSignatures, initialOptions]);

  return { signatures, loading, error, refetch: loadSignatures };
};

interface UseSignatureStatsResult {
  stats: {
    total: number;
    byDepartment: Record<string, number>;
    byStatus: Record<string, number>;
    recentSignatures: number;
  } | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useSignatureStats = (): UseSignatureStatsResult => {
  const [stats, setStats] = useState<{
    total: number;
    byDepartment: Record<string, number>;
    byStatus: Record<string, number>;
    recentSignatures: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSignatureStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch signature statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, error, refetch: loadStats };
};

interface UseSaveEmployeeSignatureResult {
  saveSignature: (signatureData: Omit<EmployeeSignatureData, 'id'>) => Promise<EmployeeSignatureData | null>;
  loading: boolean;
  error: string | null;
}

export const useSaveEmployeeSignature = (): UseSaveEmployeeSignatureResult => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const saveSignature = useCallback(async (signatureData: Omit<EmployeeSignatureData, 'id'>): Promise<EmployeeSignatureData | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await saveEmployeeSignature(signatureData);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to save employee signature');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { saveSignature, loading, error };
};

interface UseUpdateEmployeeSignatureResult {
  updateSignature: (id: number, updates: Partial<EmployeeSignatureData>) => Promise<EmployeeSignatureData | null>;
  loading: boolean;
  error: string | null;
}

export const useUpdateEmployeeSignature = (): UseUpdateEmployeeSignatureResult => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const updateSignature = useCallback(async (id: number, updates: Partial<EmployeeSignatureData>): Promise<EmployeeSignatureData | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await updateEmployeeSignature(id, updates);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to update employee signature');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateSignature, loading, error };
};

interface UseDeleteEmployeeSignatureResult {
  deleteSignature: (id: number) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const useDeleteEmployeeSignature = (): UseDeleteEmployeeSignatureResult => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSignature = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await deleteEmployeeSignature(id);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to delete employee signature');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteSignature, loading, error };
};
