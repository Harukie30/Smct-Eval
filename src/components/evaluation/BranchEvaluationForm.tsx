"use client";

import BranchRankNfileEvaluationForm from "./BranchRankNfileEvaluationForm";
import BranchManagerEvaluationForm from "./BranchManagerEvaluationForm";
import { User } from "../../contexts/UserContext";

interface BranchEvaluationFormProps {
  branch?: {
    id: number;
    name: string;
    branchCode?: string;
    location?: string;
  } | null;
  employee?: User | null;
  onCloseAction?: () => void;
  onCancelAction?: () => void;
  evaluationType?: 'rankNfile' | 'basic' | 'default';
}

// Helper function to check if employee is HO (Head Office)
const isEmployeeHO = (employee: User | null | undefined): boolean => {
  if (!employee) return false;

  const isHoBranchObj = (branchObj: unknown): boolean => {
    if (!branchObj || typeof branchObj !== "object") return false;
    const b = branchObj as any;
    const branchName = String(b.branch_name ?? b.name ?? "").toUpperCase().trim();
    const branchCode = String(b.branch_code ?? b.code ?? b.acronym ?? "").toUpperCase().trim();
    return (
      branchName === "HO" ||
      branchCode === "HO" ||
      branchCode === "126" ||
      branchName === "HEAD OFFICE" ||
      branchCode === "HEAD OFFICE" ||
      branchName.includes("HEAD OFFICE") ||
      branchCode.includes("HEAD OFFICE")
    );
  };

  // Prefer `employee.branch` (the API shape you showed)
  const branchVal = (employee as any).branch;
  if (branchVal !== undefined && branchVal !== null && branchVal !== "") {
    if (isHoBranchObj(branchVal)) return true;
    const s = String(branchVal).toUpperCase().trim();
    return s === "HO" || s === "126" || s === "HEAD OFFICE" || s.includes("HEAD OFFICE");
  }

  // Scan `employee.branches`
  const branchesVal = (employee as any).branches;
  if (Array.isArray(branchesVal)) {
    return branchesVal.some((b: any) => isHoBranchObj(b));
  }
  if (branchesVal && typeof branchesVal === "object") {
    return isHoBranchObj(branchesVal);
  }

  // Legacy: branch_id / branchId
  const branchIdOrValue = (employee as any).branch_id ?? (employee as any).branchId;
  if (branchIdOrValue !== undefined && branchIdOrValue !== null && branchIdOrValue !== "") {
    const s = String(branchIdOrValue).toUpperCase().trim();
    return s === "HO" || s === "126" || s === "HEAD OFFICE" || s.includes("HEAD OFFICE");
  }

  return false;
};

export default function BranchEvaluationForm({
  branch,
  employee,
  onCloseAction,
  onCancelAction,
  evaluationType = 'default',
}: BranchEvaluationFormProps) {
  // Check if employee is Branch (not HO)
  const isBranch = !isEmployeeHO(employee);
  
  // If employee is HO, this component shouldn't be used (HO forms are handled separately)
  if (!isBranch) {
    console.warn("BranchEvaluationForm: Employee is HO, should use HO-specific forms");
    return null;
  }
  
  // For Branch employees, route based on evaluationType:
  // - rankNfile → BranchRankNfileEvaluationForm (branch employees)
  // - default or basic → BranchManagerEvaluationForm (branch managers)
  if (evaluationType === 'rankNfile') {
    return (
      <BranchRankNfileEvaluationForm
        employee={employee}
        onCloseAction={onCloseAction}
        onCancelAction={onCancelAction}
      />
    );
  }
  
  // For default or basic evaluation types, use BranchManagerEvaluationForm
  return (
    <BranchManagerEvaluationForm
      employee={employee}
      onCloseAction={onCloseAction}
      onCancelAction={onCancelAction}
      evaluationType={evaluationType}
    />
  );
}

