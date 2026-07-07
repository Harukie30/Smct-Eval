"use client";

import { useState, useEffect } from "react";
import {
  getCachedBranches,
  peekCachedBranches,
} from "@/lib/referenceDataCache";
import type { BranchOption } from "@/components/evaluation/employeeBranchLabel";

/**
 * Loads branch dropdown options (same as HR/admin) so welcome UIs can resolve
 * branch_id numbers to readable labels.
 */
export function useBranchesForEvaluation(): {
  branchOptions: BranchOption[];
  isLoading: boolean;
} {
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>(() => {
    const cached = peekCachedBranches();
    return Array.isArray(cached) ? (cached as BranchOption[]) : [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    const cached = peekCachedBranches();
    return !Array.isArray(cached) || cached.length === 0;
  });

  useEffect(() => {
    let cancelled = false;

    const cached = peekCachedBranches();
    if (Array.isArray(cached) && cached.length > 0) {
      setBranchOptions(cached as BranchOption[]);
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      try {
        const data = await getCachedBranches();
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
