"use client";

import React, { useEffect, useState } from "react";
import apiService from "@/lib/apiService";
import {
  getEvaluatorDisplayName,
  pickSupervisorFromEmployee,
  pickSupervisorFromSubmission,
  pickSupervisorWithApproverPriority,
  submissionHasStoredApprovers,
} from "@/lib/supervisorDisplay";
import ViewResultsModalBranchRankNfile from "./ViewResultsModalBranchRankNfile";
import ViewResultsModalBranchManager from "./ViewResultsModalBranchManager";
import ViewResultsModalAreaManager from "./ViewResultsModalAreaManager";
import ViewResultsModalDefault from "./ViewResultsModalDefault";
import ViewResultsModalBasic from "./ViewResultsModalBasic";
import ViewEvaluationMobileWarningModal from "./ViewEvaluationMobileWarningModal";
import { useMobileViewport } from "@/hooks/useMobileViewport";

export type Submission = {
  id: number;
  employee: any;
  evaluator: any;
  category?: string;
  rating?: number;
  status: string;
  coverageFrom: string;
  coverageTo: string;
  reviewTypeProbationary: number;
  reviewTypeRegular: string;
  reviewTypeOthersImprovement: boolean | number;
  reviewTypeOthersCustom: string;
  priorityArea1: string;
  priorityArea2: string;
  priorityArea3: string;
  remarks: string;
  overallComments: string;
  evaluatorApprovedAt: string;
  employeeApprovedAt: string;
  created_at: string;
  evaluationType?: string; // API evaluation type (e.g., "BranchRankNFile", "HoRankNFile", "BranchBasic", "HoBasic")

  //relations
  job_knowledge: any;
  adaptability: any;
  quality_of_works: any;
  teamworks: any;
  reliabilities: any;
  ethicals: any;
  customer_services: any;
  managerial_skills?: any;
};

export interface ApprovalData {
  id: string;
  approvedAt: string;
  employeeSignature: string;
  employeeName: string;
  employeeEmail: string;
}

export interface ViewResultsModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  submission: Submission | null;
  onApprove?: (submissionId: number) => void;
  isApproved?: boolean;
  approvalData?: ApprovalData | null;
  currentUserName?: string;
  currentUserSignature?: string;
  showApprovalButton?: boolean;
  /** Prioritized immediate supervisor; falls back to evaluator when unset. */
  supervisorName?: string;
}

// Helper function to check if employee is HO (Head Office)
const isEmployeeHO = (submission: Submission | null): boolean => {
  if (!submission?.employee) return false;

  const employee = submission.employee as any;

  const isHoBranchObj = (branchObj: unknown): boolean => {
    if (!branchObj || typeof branchObj !== "object") return false;
    const b = branchObj as any;

    const branchName = String(b.branch_name ?? b.name ?? "")
      .toUpperCase()
      .trim();
    const branchCode = String(
      b.branch_code ?? b.code ?? b.acronym ?? ""
    )
      .toUpperCase()
      .trim();

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

  // 1) Prefer direct `employee.branch` object/value
  const branchVal = employee.branch;
  if (branchVal !== undefined && branchVal !== null && branchVal !== "") {
    if (isHoBranchObj(branchVal)) return true;
    const s = String(branchVal).toUpperCase().trim();
    return (
      s === "HO" || s === "126" || s === "HEAD OFFICE" || s.includes("HEAD OFFICE")
    );
  }

  // 2) If `employee.branches` exists, scan it for an HO entry
  const branchesVal = employee.branches;
  if (Array.isArray(branchesVal)) {
    return branchesVal.some((b: unknown) => isHoBranchObj(b));
  }
  if (branchesVal && typeof branchesVal === "object") {
    return isHoBranchObj(branchesVal);
  }

  // 3) Legacy: `branch_id` / `branchId`
  const branchIdOrValue = employee.branch_id ?? employee.branchId;
  if (
    branchIdOrValue !== undefined &&
    branchIdOrValue !== null &&
    branchIdOrValue !== ""
  ) {
    const s = String(branchIdOrValue).toUpperCase().trim();
    return (
      s === "HO" ||
      s === "126" ||
      s === "HEAD OFFICE" ||
      s.includes("HEAD OFFICE")
    );
  }

  return false;
};

// Helper function to check if employee is branch (not HO)
const isEmployeeBranch = (submission: Submission | null): boolean => {
  return !isEmployeeHO(submission);
};

// Helper function to check if employee is Area Manager
const isEmployeeAreaManager = (submission: Submission | null): boolean => {
  if (!submission?.employee?.positions) return false;
  
  const positionName = (
    submission.employee.positions?.label || 
    submission.employee.positions?.name || 
    submission.employee.position ||
    ""
  ).toUpperCase().trim();
  
  return (
    positionName === 'AREA MANAGER' ||
    positionName.includes('AREA MANAGER')
  );
};

// Helper function to check if employee is a Manager or Supervisor (any manager position in branch)
const isEmployeeBranchManagerOrSupervisor = (submission: Submission | null): boolean => {
  if (!submission?.employee?.positions) return false;
  
  const position = submission.employee.positions;
  const positionLabel = typeof position === 'string' 
    ? position.toUpperCase() 
    : (position as any)?.label?.toUpperCase() || '';
  
  // Check for any manager position (excluding Area Manager which is handled separately)
  const isManager = positionLabel.includes('MANAGER') && !positionLabel.includes('AREA MANAGER');
  const isSupervisor = positionLabel.includes('SUPERVISOR');
  
  return isManager || isSupervisor;
};

// Helper function to get evaluationType from submission (check multiple possible field names)
const getEvaluationType = (submission: Submission | null): string | null => {
  if (!submission) return null;
  
  // Check multiple possible field names
  const evaluationType = 
    (submission as any).evaluationType ||
    (submission as any).evaluation_type ||
    (submission as any).evaluationTypeId ||
    (submission as any).evaluation_type_id ||
    (submission as any).type ||
    (submission as any).evaluation_category ||
    submission.evaluationType; // Check the typed field last
  
  if (!evaluationType) return null;
  
  const normalized = String(evaluationType).trim();
  return normalized || null;
};

// Determine evaluation type and route to appropriate component
export default function ViewResultsModalRouter({
  isOpen,
  onCloseAction,
  submission,
  onApprove,
  isApproved = false,
  approvalData = null,
  currentUserName,
  currentUserSignature,
  showApprovalButton = false,
}: ViewResultsModalProps) {
  const isMobileViewport = useMobileViewport();
  const [bypassMobileWarning, setBypassMobileWarning] = useState(false);
  const [supervisorName, setSupervisorName] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setBypassMobileWarning(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!submission) {
      setSupervisorName("");
      return;
    }

    const fallback = getEvaluatorDisplayName(submission.evaluator);
    const fromSubmission = pickSupervisorFromSubmission(submission);
    const syncName =
      fromSubmission?.name ??
      (submission.employee
        ? pickSupervisorFromEmployee(submission.employee)?.name
        : null) ??
      fallback;
    setSupervisorName(syncName);

    if (submissionHasStoredApprovers(submission) || fromSubmission) {
      return;
    }

    const employeeId = submission.employee?.id;
    if (!employeeId) return;

    let cancelled = false;
    const loadSupervisor = async () => {
      try {
        const dashboard = await apiService.employeeDashboard2(Number(employeeId));
        if (cancelled) return;
        const prioritized =
          pickSupervisorWithApproverPriority(dashboard)?.name ??
          (submission.employee
            ? pickSupervisorFromEmployee(submission.employee)?.name
            : null) ??
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
  }, [submission]);

  if (!submission) return null;

  const modalProps = {
    isOpen,
    onCloseAction,
    submission,
    onApprove,
    isApproved,
    approvalData,
    currentUserName,
    currentUserSignature,
    showApprovalButton,
    supervisorName,
  };

  if (isOpen && isMobileViewport && !bypassMobileWarning) {
    return (
      <ViewEvaluationMobileWarningModal
        isOpen={isOpen}
        onCloseAction={onCloseAction}
        onViewAnywayAction={() => setBypassMobileWarning(true)}
      />
    );
  }

  // Get evaluationType from API response (primary routing method)
  // Check multiple possible field names
  const apiEvaluationType = getEvaluationType(submission);

  // Check employee's branch and position (not evaluator)
  const isHOEmp = isEmployeeHO(submission);
  const isBranchEmp = isEmployeeBranch(submission);
  const isEmployeeAreaMgr = isEmployeeAreaManager(submission);
  const isEmployeeBranchMgrOrSup = isEmployeeBranchManagerOrSupervisor(submission);

  // Fallback: Determine evaluation type based on submission data (if evaluationType not available)
  const hasCustomerService = submission.customer_services && 
    Array.isArray(submission.customer_services) && 
    submission.customer_services.length > 0;
  const hasManagerialSkills = submission.managerial_skills && 
    Array.isArray(submission.managerial_skills) && 
    submission.managerial_skills.length > 0;

  // Debug logging - helpful for troubleshooting routing issues
  // This will show in development mode (and can be enabled in production if needed)
  const debugInfo = {
    id: submission.id,
    evaluationType: apiEvaluationType,
    hasCustomerService,
    hasManagerialSkills,
    employeeBranch: submission.employee?.branches?.[0]?.branch_name || submission.employee?.branches?.branch_name,
    employeePosition: submission.employee?.positions?.label || submission.employee?.positions?.name || submission.employee?.position,
    isHOEmp,
    isBranchEmp,
  };
  
  // Log in development mode (always helpful for debugging)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 ViewResultsModalRouter - Submission data:', debugInfo);
  }

  // Track which component will be rendered (for debugging)
  let selectedComponent = 'Unknown';

  // Priority 1: Route based on evaluationType from API response (primary source of truth)
  if (apiEvaluationType) {
    // Normalize: remove spaces, underscores, hyphens, and convert to uppercase for comparison
    const evalTypeNormalized = apiEvaluationType
      .toUpperCase()
      .replace(/[\s_\-]/g, '')
      .trim();
    
    // BranchRankNFile / BranchRankNfile / branch_rank_n_file → ViewResultsModalBranchRankNfile
    if (
      evalTypeNormalized === "BRANCHRANKNFILE" || 
      evalTypeNormalized.includes("BRANCHRANKNFILE") ||
      (evalTypeNormalized.includes("BRANCH") && evalTypeNormalized.includes("RANK") && evalTypeNormalized.includes("FILE"))
    ) {
      selectedComponent = "ViewResultsModalBranchRankNfile (Branch RankNFile)";
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Routing to:", selectedComponent);
      }
      return (
        <ViewResultsModalBranchRankNfile
          {...modalProps}
        />
      );
    }
    
    // HoBasic / ho_basic → ViewResultsModalBasic
    if (
      evalTypeNormalized === "HOBASIC" || 
      evalTypeNormalized.includes("HOBASIC") || 
      (evalTypeNormalized.includes("BASIC") && evalTypeNormalized.includes("HO")) ||
      (evalTypeNormalized === "BASIC" && isHOEmp)
    ) {
      selectedComponent = "ViewResultsModalBasic (HO Basic)";
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Routing to:", selectedComponent);
      }
      return (
        <ViewResultsModalBasic
          {...modalProps}
        />
      );
    }
    
    // HoRankNFile / HoRankNfile / ho_rank_n_file → ViewResultsModalDefault (HO rankNfile)
    if (
      evalTypeNormalized === "HORANKNFILE" || 
      evalTypeNormalized.includes("HORANKNFILE") ||
      (evalTypeNormalized.includes("HO") && evalTypeNormalized.includes("RANK") && evalTypeNormalized.includes("FILE"))
    ) {
      selectedComponent = "ViewResultsModalDefault (HO RankNFile)";
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Routing to:", selectedComponent);
      }
      return (
        <ViewResultsModalDefault
          {...modalProps}
        />
      );
    }
    
    // AreaManager / BranchAreaManager → ViewResultsModalAreaManager (AVP evaluating Area Manager, no Customer Service)
    if (
      (evalTypeNormalized === "AREAMANAGER" || evalTypeNormalized.includes("AREAMANAGER") ||
       evalTypeNormalized === "BRANCHAREAMANAGER" || evalTypeNormalized.includes("BRANCHAREAMANAGER"))
    ) {
      selectedComponent = 'ViewResultsModalAreaManager (Area Manager)';
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Routing to:', selectedComponent);
      }
      return (
        <ViewResultsModalAreaManager
          {...modalProps}
        />
      );
    }

    // BranchBasicAreaManager → always ViewResultsModalAreaManager
    // This evaluationType is specifically for AVP evaluating Area Managers on the branch-basic form.
    // Route directly to the Area Manager view without extra guards so it cannot fall through to BranchBasic.
    if (
      evalTypeNormalized === "BRANCHBASICAREAMANAGER" ||
      (evalTypeNormalized.includes("BRANCH") &&
        evalTypeNormalized.includes("BASIC") &&
        evalTypeNormalized.includes("AREAMANAGER"))
    ) {
      selectedComponent =
        "ViewResultsModalAreaManager (BranchBasicAreaManager explicit)";
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Routing to:", selectedComponent);
      }
      return (
        <ViewResultsModalAreaManager
          {...modalProps}
        />
      );
    }
    
    // BranchBasic / branch_basic → ViewResultsModalBranchManager (branch manager evaluations)
    if (
      evalTypeNormalized === "BRANCHBASIC" || 
      evalTypeNormalized.includes("BRANCHBASIC") ||
      (evalTypeNormalized.includes("BRANCH") && evalTypeNormalized.includes("BASIC"))
    ) {
      selectedComponent = "ViewResultsModalBranchManager (Branch Basic)";
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Routing to:", selectedComponent);
      }
      return (
        <ViewResultsModalBranchManager
          {...modalProps}
        />
      );
    }
    
    // BranchDefault / branch_default → ViewResultsModalBranchRankNfile (branch rank and file evaluations)
    if (
      evalTypeNormalized === "BRANCHDEFAULT" || 
      evalTypeNormalized.includes("BRANCHDEFAULT") ||
      (evalTypeNormalized.includes("BRANCH") && evalTypeNormalized.includes("DEFAULT"))
    ) {
      selectedComponent = "ViewResultsModalBranchRankNfile (Branch Default)";
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Routing to:", selectedComponent);
      }
      return (
        <ViewResultsModalBranchRankNfile
          {...modalProps}
        />
      );
    }
  }

  // Fallback Priority 4: HO Employees (if evaluationType not available)
  // If HO employee has Managerial Skills → Basic HO → ViewResultsModalBasic
  // If HO employee has NO Managerial Skills → RankNfile HO → ViewResultsModalDefault
  if (isHOEmp) {
    if (hasManagerialSkills) {
      // Basic HO - has Managerial Skills, no Customer Service
      return (
        <ViewResultsModalBasic
          {...modalProps}
        />
      );
    } else {
      // RankNfile HO - no Managerial Skills, no Customer Service
      return (
        <ViewResultsModalDefault
          {...modalProps}
        />
      );
    }
  }

  // Fallback Priority 5: Branch evaluations (if evaluationType not available)
  // Branch employees with Customer Service → BranchDefault → ViewResultsModalBranchRankNfile
  // Branch employees with Managerial Skills → BranchBasic → ViewResultsModalBranchManager (or Area Manager if no Customer Service)
  if (isBranchEmp) {
    if (hasManagerialSkills) {
      // Area Manager: has Managerial Skills but no Customer Service data
      if (isEmployeeAreaMgr && !hasCustomerService) {
        return (
          <ViewResultsModalAreaManager
            {...modalProps}
          />
        );
      }
      // BranchBasic - has Managerial Skills (branch manager)
      return (
        <ViewResultsModalBranchManager
          {...modalProps}
        />
      );
    } else if (hasCustomerService) {
      // BranchDefault - has Customer Service (branch rank and file)
      return (
        <ViewResultsModalBranchRankNfile
          {...modalProps}
        />
      );
    } else {
      // BranchRankNfile - no Customer Service, no Managerial Skills
      return (
        <ViewResultsModalBranchRankNfile
          {...modalProps}
        />
      );
    }
  }

  // Default fallback: Should only be reached for HO evaluations without evaluationType
  // This is a safety fallback
  return (
    <ViewResultsModalDefault
      {...modalProps}
    />
  );
}

