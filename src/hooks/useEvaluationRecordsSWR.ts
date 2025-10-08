// src/hooks/useEvaluationRecordsSWR.ts
// Reverb-style architecture with SWR for automatic revalidation

import useSWR, { mutate, SWRConfiguration } from 'swr';
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

// SWR Configuration for Reverb-style behavior
const swrConfig: SWRConfiguration = {
  refreshInterval: 30000, // Auto-refresh every 30 seconds
  revalidateOnFocus: true, // Refresh when user focuses tab
  revalidateOnReconnect: true, // Refresh when connection restored
  dedupingInterval: 10000, // Dedupe requests within 10 seconds
  errorRetryCount: 3, // Retry failed requests 3 times
  errorRetryInterval: 5000, // Wait 5 seconds between retries
};

// Fetcher functions for SWR
const fetchers = {
  allRecords: () => getAllEvaluationRecords(),
  recordById: (id: number) => getEvaluationRecordById(id),
  searchRecords: (params: EvaluationRecordSearchParams) => searchEvaluationRecords(params),
  stats: () => getEvaluationRecordsStats(),
  approvalHistory: (recordId: number) => getApprovalHistoryForRecord(recordId),
};

// Hook for getting all evaluation records with Reverb-style revalidation
export const useEvaluationRecordsSWR = () => {
  const { data, error, isLoading, mutate: mutateRecords } = useSWR(
    'evaluation-records',
    fetchers.allRecords,
    swrConfig
  );

  return {
    records: data || [],
    loading: isLoading,
    error: error?.message || null,
    refetch: () => mutateRecords(),
    mutate: mutateRecords,
  };
};

// Hook for getting a single evaluation record
export const useEvaluationRecordSWR = (id: number | null) => {
  const { data, error, isLoading, mutate: mutateRecord } = useSWR(
    id ? `evaluation-record-${id}` : null,
    () => id ? fetchers.recordById(id) : null,
    swrConfig
  );

  return {
    record: data || null,
    loading: isLoading,
    error: error?.message || null,
    refetch: () => mutateRecord(),
    mutate: mutateRecord,
  };
};

// Hook for searching evaluation records
export const useEvaluationRecordsSearchSWR = (params: EvaluationRecordSearchParams | null) => {
  const { data, error, isLoading, mutate: mutateSearch } = useSWR(
    params ? `evaluation-records-search-${JSON.stringify(params)}` : null,
    () => params ? fetchers.searchRecords(params) : null,
    {
      ...swrConfig,
      refreshInterval: 0, // Don't auto-refresh search results
    }
  );

  return {
    results: data || [],
    loading: isLoading,
    error: error?.message || null,
    refetch: () => mutateSearch(),
    mutate: mutateSearch,
  };
};

// Hook for evaluation records statistics
export const useEvaluationRecordsStatsSWR = () => {
  const { data, error, isLoading, mutate: mutateStats } = useSWR(
    'evaluation-records-stats',
    fetchers.stats,
    swrConfig
  );

  return {
    stats: data || null,
    loading: isLoading,
    error: error?.message || null,
    refetch: () => mutateStats(),
    mutate: mutateStats,
  };
};

// Hook for approval history
export const useApprovalHistorySWR = (recordId: number | null) => {
  const { data, error, isLoading, mutate: mutateHistory } = useSWR(
    recordId ? `approval-history-${recordId}` : null,
    () => recordId ? fetchers.approvalHistory(recordId) : null,
    swrConfig
  );

  return {
    history: data || [],
    loading: isLoading,
    error: error?.message || null,
    refetch: () => mutateHistory(),
    mutate: mutateHistory,
  };
};

// Optimistic update hooks with Reverb-style behavior
export const useOptimisticEvaluationUpdate = () => {
  const { mutate: mutateAll } = useEvaluationRecordsSWR();

  const updateRecordOptimistic = async (
    id: number, 
    updates: Partial<EvaluationRecord>,
    optimisticData?: EvaluationRecord
  ) => {
    // Optimistic update - immediately update UI
    if (optimisticData) {
      mutateAll(
        (currentData) => 
          currentData?.map(record => 
            record.id === id ? { ...record, ...optimisticData } : record
          ),
        false // Don't revalidate immediately
      );
    }

    try {
      // Perform actual update
      const updatedRecord = await updateEvaluationRecord(id, updates);
      
      // Revalidate to get server state
      mutateAll();
      
      return updatedRecord;
    } catch (error) {
      // Revert optimistic update on error
      mutateAll();
      throw error;
    }
  };

  return { updateRecordOptimistic };
};

// Optimistic approval hooks
export const useOptimisticEmployeeApproval = () => {
  const { mutate: mutateAll } = useEvaluationRecordsSWR();

  const approveWithSignatureOptimistic = async (
    recordId: number,
    approvalData: {
      employeeSignature: string;
      employeeName: string;
      employeeEmail: string;
      comments?: string;
    }
  ) => {
    // Optimistic update
    mutateAll(
      (currentData) => 
        currentData?.map(record => 
          record.id === recordId 
            ? { 
                ...record, 
                employeeSignature: approvalData.employeeSignature,
                employeeSignatureDate: new Date().toISOString(),
                employeeApprovedAt: new Date().toISOString(),
                employeeApprovedBy: approvalData.employeeName,
                employeeEmail: approvalData.employeeEmail,
                approvalStatus: 'employee_approved' as const,
                approvalComments: approvalData.comments || record.approvalComments,
                lastModified: new Date().toISOString()
              }
            : record
        ),
      false
    );

    try {
      const updatedRecord = await addEmployeeSignatureApproval(recordId, approvalData);
      mutateAll(); // Revalidate to get server state
      return updatedRecord;
    } catch (error) {
      mutateAll(); // Revert on error
      throw error;
    }
  };

  return { approveWithSignatureOptimistic };
};

export const useOptimisticEvaluatorApproval = () => {
  const { mutate: mutateAll } = useEvaluationRecordsSWR();

  const approveWithSignatureOptimistic = async (
    recordId: number,
    approvalData: {
      evaluatorSignature: string;
      evaluatorName: string;
      evaluatorEmail: string;
      comments?: string;
    }
  ) => {
    // Optimistic update
    mutateAll(
      (currentData) => 
        currentData?.map(record => 
          record.id === recordId 
            ? { 
                ...record, 
                evaluatorSignature: approvalData.evaluatorSignature,
                evaluatorSignatureDate: new Date().toISOString(),
                evaluatorApprovedAt: new Date().toISOString(),
                evaluatorApprovedBy: approvalData.evaluatorName,
                evaluatorId: approvalData.evaluatorEmail,
                approvalStatus: 'fully_approved' as const,
                approvalComments: approvalData.comments || record.approvalComments,
                lastModified: new Date().toISOString()
              }
            : record
        ),
      false
    );

    try {
      const updatedRecord = await addEvaluatorSignatureApproval(recordId, approvalData);
      mutateAll(); // Revalidate to get server state
      return updatedRecord;
    } catch (error) {
      mutateAll(); // Revert on error
      throw error;
    }
  };

  return { approveWithSignatureOptimistic };
};

// Global revalidation functions
export const revalidateAllEvaluationData = () => {
  mutate('evaluation-records');
  mutate('evaluation-records-stats');
  // Invalidate all search caches
  mutate((key) => typeof key === 'string' && key.startsWith('evaluation-records-search-'));
};

export const revalidateEvaluationRecord = (id: number) => {
  mutate(`evaluation-record-${id}`);
  mutate('evaluation-records'); // Also revalidate the list
  mutate('evaluation-records-stats'); // And stats
};

// Real-time updates hook (for future WebSocket integration)
export const useRealtimeEvaluationUpdates = () => {
  const { mutate: mutateAll } = useEvaluationRecordsSWR();

  // This would be connected to WebSocket in production
  const handleRealtimeUpdate = (update: {
    type: 'created' | 'updated' | 'deleted';
    record: EvaluationRecord;
  }) => {
    switch (update.type) {
      case 'created':
      case 'updated':
        // Update the specific record
        mutateAll(
          (currentData) => {
            if (!currentData) return currentData;
            
            const existingIndex = currentData.findIndex(r => r.id === update.record.id);
            if (existingIndex >= 0) {
              // Update existing record
              const newData = [...currentData];
              newData[existingIndex] = update.record;
              return newData;
            } else {
              // Add new record
              return [...currentData, update.record];
            }
          },
          false // Don't trigger revalidation
        );
        break;
      case 'deleted':
        // Remove the record
        mutateAll(
          (currentData) => 
            currentData?.filter(record => record.id !== update.record.id),
          false
        );
        break;
    }
  };

  return { handleRealtimeUpdate };
};
