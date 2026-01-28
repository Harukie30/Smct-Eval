"use client";

import EvaluationForm from "./index";
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
  if (!employee?.branches) return false;
  
  // Handle branches as array
  if (Array.isArray(employee.branches)) {
    const branch = employee.branches[0];
    if (branch) {
      const branchName = branch.branch_name?.toUpperCase() || "";
      const branchCode = branch.branch_code?.toUpperCase() || "";
      return (
        branchName === "HO" || 
        branchCode === "HO" || 
        branchName.includes("HEAD OFFICE") ||
        branchCode.includes("HEAD OFFICE") ||
        branchName === "HEAD OFFICE" ||
        branchCode === "HEAD OFFICE"
      );
    }
  }
  
  // Handle branches as object
  if (typeof employee.branches === 'object') {
    const branchName = (employee.branches as any)?.branch_name?.toUpperCase() || "";
    const branchCode = (employee.branches as any)?.branch_code?.toUpperCase() || "";
    return (
      branchName === "HO" || 
      branchCode === "HO" || 
      branchName.includes("HEAD OFFICE") ||
      branchCode.includes("HEAD OFFICE") ||
      branchName === "HEAD OFFICE" ||
      branchCode === "HEAD OFFICE"
    );
  }
  
  return false;
};

// Helper function to check if employee is a Manager or Supervisor (any manager position in branch)
const isEmployeeBranchManagerOrSupervisor = (employee: User | null | undefined): boolean => {
  if (!employee?.positions) return false;
  
  const positionLabel = (
    employee.positions?.label || 
    employee.positions?.name || 
    (employee as any).position ||
    ""
  ).toUpperCase().trim();
  
  // Check for any manager position (excluding Area Manager which is handled separately)
  const isManager = positionLabel.includes('MANAGER') && !positionLabel.includes('AREA MANAGER');
  const isSupervisor = positionLabel.includes('SUPERVISOR');
  
  return isManager || isSupervisor;
};

// Helper function to check if employee is Area Manager
const isEmployeeAreaManager = (employee: User | null | undefined): boolean => {
  if (!employee?.positions) return false;
  
  const positionLabel = (
    employee.positions?.label || 
    employee.positions?.name || 
    (employee as any).position ||
    ""
  ).toUpperCase().trim();
  
  return (
    positionLabel === 'AREA MANAGER' ||
    positionLabel.includes('AREA MANAGER')
  );
};

export default function BranchEvaluationForm({
  branch,
  employee,
  onCloseAction,
  onCancelAction,
  evaluationType = 'default',
}: BranchEvaluationFormProps) {
  // Route to dedicated BranchRankNfileEvaluationForm for rankNfile evaluations
  // This provides cleaner, more maintainable code with specific validation logic
  if (evaluationType === 'rankNfile') {
    return (
      <BranchRankNfileEvaluationForm
        employee={employee}
        onCloseAction={onCloseAction}
        onCancelAction={onCancelAction}
      />
    );
  }

  // Check employee's branch and position to determine routing
  const isHO = isEmployeeHO(employee);
  const isEmployeeBranchMgrOrSup = isEmployeeBranchManagerOrSupervisor(employee);
  const isEmployeeAreaMgr = isEmployeeAreaManager(employee);
  
  // Route to BranchManagerEvaluationForm if:
  // - Employee is Branch Manager/Supervisor (not HO, not Area Manager)
  if (!isHO && !isEmployeeAreaMgr && isEmployeeBranchMgrOrSup) {
    return (
      <BranchManagerEvaluationForm
        employee={employee}
        onCloseAction={onCloseAction}
        onCancelAction={onCancelAction}
        evaluationType={evaluationType}
      />
    );
  }

  // For other evaluation types, use the main EvaluationForm
  return (
    <EvaluationForm
      employee={employee}
      onCloseAction={onCloseAction}
      onCancelAction={onCancelAction}
      evaluationType={evaluationType}
    />
  );
}

