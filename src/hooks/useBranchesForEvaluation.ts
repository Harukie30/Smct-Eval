"use client";

import { useState, useEffect } from "react";
import apiService from "@/lib/apiService";
import type { BranchOption } from "@/components/evaluation/employeeBranchLabel";

/**
 * Loads branch dropdown options (same as HR/admin) so welcome UIs can resolve
 * branch_id numbers to readable labels.
 */
export function useBranchesForEvaluation(): {
  branchOptions: BranchOption[];
  isLoading: boolean;
} {
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await apiService.getBranches();
        if (!cancelled && Array.isArray(data)) {
          setBranchOptions(data as BranchOption[]);
        }
      } catch {
        if (!cancelled) setBranchOptions([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { branchOptions, isLoading };
}
