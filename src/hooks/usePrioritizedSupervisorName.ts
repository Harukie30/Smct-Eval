"use client";

import { useEffect, useState } from "react";
import { User } from "@/contexts/UserContext";
import apiService from "@/lib/apiService";
import {
  getEvaluatorDisplayName,
  pickSupervisorFromEmployee,
  pickSupervisorWithApproverPriority,
} from "@/lib/supervisorDisplay";

/** Approver sequence 2 -> sequence 1 -> assigned evaluator -> optional fallback. */
export function usePrioritizedSupervisorName(
  employee?: User | null,
  fallbackEvaluator?: unknown
): string {
  const [supervisorName, setSupervisorName] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fallback = getEvaluatorDisplayName(fallbackEvaluator);

    if (!employee) {
      setSupervisorName(fallback);
      return;
    }

    const syncName = pickSupervisorFromEmployee(employee)?.name ?? fallback;
    setSupervisorName(syncName);

    if (!employee.id) return;

    const loadSupervisor = async () => {
      try {
        const dashboard = await apiService.employeeDashboard2(Number(employee.id));
        if (cancelled) return;
        const prioritized =
          pickSupervisorWithApproverPriority(dashboard)?.name ??
          pickSupervisorFromEmployee(employee)?.name ??
          fallback;
        setSupervisorName(prioritized);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load prioritized supervisor:", error);
        setSupervisorName(syncName);
      }
    };

    loadSupervisor();
    return () => {
      cancelled = true;
    };
  }, [employee, fallbackEvaluator]);

  return supervisorName;
}
