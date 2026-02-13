"use client";

import React from "react";
import ViewResultsModalBranchRankNfile from "./ViewResultsModalBranchRankNfile";
import ViewResultsModalBranchManager from "./ViewResultsModalBranchManager";
import ViewResultsModalDefault from "./ViewResultsModalDefault";
import ViewResultsModalBasic from "./ViewResultsModalBasic";

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
}

// Helper function to check if employee is HO (Head Office)
const isEmployeeHO = (submission: Submission | null): boolean => {
  if (!submission?.employee) return false;
  
  // Handle branches as array
  if (Array.isArray(submission.employee.branches)) {
    const branch = submission.employee.branches[0];
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
  if (typeof submission.employee.branches === 'object') {
    const branchName = (submission.employee.branches as any)?.branch_name?.toUpperCase() || "";
    const branchCode = (submission.employee.branches as any)?.branch_code?.toUpperCase() || "";
    return (
      branchName === "HO" || 
      branchCode === "HO" || 
      branchName.includes("HEAD OFFICE") ||
      branchCode.includes("HEAD OFFICE") ||
      branchName === "HEAD OFFICE" ||
      branchCode === "HEAD OFFICE"
    );
  }
  
  // Fallback: check if branch field exists directly
  if ((submission.employee as any).branch) {
    const branchName = String((submission.employee as any).branch).toUpperCase();
    return (
      branchName === "HO" || 
      branchName === "HEAD OFFICE" ||
      branchName.includes("HEAD OFFICE") ||
      branchName.includes("/HO")
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
  if (!submission) return null;

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
    // BUT: If employee is HO, route to HO RankNFile (ViewResultsModalDefault) instead
    if (
      evalTypeNormalized === "BRANCHRANKNFILE" || 
      evalTypeNormalized.includes("BRANCHRANKNFILE") ||
      (evalTypeNormalized.includes("BRANCH") && evalTypeNormalized.includes("RANK") && evalTypeNormalized.includes("FILE"))
    ) {
      // If employee is HO but evaluationType says Branch, treat as HO RankNFile
      if (isHOEmp) {
        selectedComponent = 'ViewResultsModalDefault (HO RankNFile - corrected from BranchRankNFile)';
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Routing to:', selectedComponent);
        }
    return (
          <ViewResultsModalDefault
        isOpen={isOpen}
        onCloseAction={onCloseAction}
        submission={submission}
        onApprove={onApprove}
        isApproved={isApproved}
        approvalData={approvalData}
        currentUserName={currentUserName}
        currentUserSignature={currentUserSignature}
        showApprovalButton={showApprovalButton}
      />
    );
  }
      // Only route to BranchRankNfile if employee is actually a branch employee
      if (isBranchEmp) {
      return (
        <ViewResultsModalBranchRankNfile
          isOpen={isOpen}
          onCloseAction={onCloseAction}
          submission={submission}
          onApprove={onApprove}
          isApproved={isApproved}
          approvalData={approvalData}
          currentUserName={currentUserName}
          currentUserSignature={currentUserSignature}
          showApprovalButton={showApprovalButton}
        />
      );
    }
    }
    
    // HoBasic / HoBasic / ho_basic → ViewResultsModalBasic
    if (
      evalTypeNormalized === "HOBASIC" || 
      evalTypeNormalized.includes("HOBASIC") || 
      (evalTypeNormalized.includes("BASIC") && evalTypeNormalized.includes("HO")) ||
      (evalTypeNormalized === "BASIC" && isHOEmp)
    ) {
      // Only route to Basic if it's HO
      if (isHOEmp) {
        selectedComponent = 'ViewResultsModalBasic (HO Basic)';
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Routing to:', selectedComponent);
        }
        return (
          <ViewResultsModalBasic
            isOpen={isOpen}
            onCloseAction={onCloseAction}
            submission={submission}
            onApprove={onApprove}
            isApproved={isApproved}
            approvalData={approvalData}
            currentUserName={currentUserName}
            currentUserSignature={currentUserSignature}
            showApprovalButton={showApprovalButton}
          />
        );
      }
    }
    
    // HoRankNFile / HoRankNfile / ho_rank_n_file → ViewResultsModalDefault (HO rankNfile)
    if (
      evalTypeNormalized === "HORANKNFILE" || 
      evalTypeNormalized.includes("HORANKNFILE") ||
      (evalTypeNormalized.includes("HO") && evalTypeNormalized.includes("RANK") && evalTypeNormalized.includes("FILE"))
    ) {
      if (isHOEmp) {
        selectedComponent = 'ViewResultsModalDefault (HO RankNFile)';
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Routing to:', selectedComponent);
        }
        return (
          <ViewResultsModalDefault
            isOpen={isOpen}
            onCloseAction={onCloseAction}
            submission={submission}
            onApprove={onApprove}
            isApproved={isApproved}
            approvalData={approvalData}
            currentUserName={currentUserName}
            currentUserSignature={currentUserSignature}
            showApprovalButton={showApprovalButton}
          />
        );
      }
    }
    
    // BranchBasic / branch_basic → ViewResultsModalBranchManager (branch manager evaluations)
    // BUT: If employee is HO, route to HO Basic (ViewResultsModalBasic) instead
    if (
      evalTypeNormalized === "BRANCHBASIC" || 
      evalTypeNormalized.includes("BRANCHBASIC") ||
      (evalTypeNormalized.includes("BRANCH") && evalTypeNormalized.includes("BASIC"))
    ) {
      // If employee is HO but evaluationType says BranchBasic, treat as HO Basic
      if (isHOEmp) {
        selectedComponent = 'ViewResultsModalBasic (HO Basic - corrected from BranchBasic)';
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Routing to:', selectedComponent);
        }
        return (
          <ViewResultsModalBasic
            isOpen={isOpen}
            onCloseAction={onCloseAction}
            submission={submission}
            onApprove={onApprove}
            isApproved={isApproved}
            approvalData={approvalData}
            currentUserName={currentUserName}
            currentUserSignature={currentUserSignature}
            showApprovalButton={showApprovalButton}
          />
        );
      }
      // Only route to BranchManager if employee is actually a branch employee
      if (isBranchEmp) {
        selectedComponent = 'ViewResultsModalBranchManager (Branch Basic)';
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Routing to:', selectedComponent);
        }
        return (
          <ViewResultsModalBranchManager
            isOpen={isOpen}
            onCloseAction={onCloseAction}
            submission={submission}
            onApprove={onApprove}
            isApproved={isApproved}
            approvalData={approvalData}
            currentUserName={currentUserName}
            currentUserSignature={currentUserSignature}
            showApprovalButton={showApprovalButton}
          />
        );
      }
    }
    
    // BranchDefault / branch_default → ViewResultsModalBranchRankNfile (branch rank and file evaluations)
    // BUT: If employee is HO, route to HO RankNFile (ViewResultsModalDefault) instead
    if (
      evalTypeNormalized === "BRANCHDEFAULT" || 
      evalTypeNormalized.includes("BRANCHDEFAULT") ||
      (evalTypeNormalized.includes("BRANCH") && evalTypeNormalized.includes("DEFAULT"))
    ) {
      // If employee is HO but evaluationType says BranchDefault, treat as HO RankNFile
      if (isHOEmp) {
        selectedComponent = 'ViewResultsModalDefault (HO RankNFile - corrected from BranchDefault)';
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Routing to:', selectedComponent);
        }
        return (
          <ViewResultsModalDefault
            isOpen={isOpen}
            onCloseAction={onCloseAction}
            submission={submission}
            onApprove={onApprove}
            isApproved={isApproved}
            approvalData={approvalData}
            currentUserName={currentUserName}
            currentUserSignature={currentUserSignature}
            showApprovalButton={showApprovalButton}
          />
        );
      }
      // Only route to BranchRankNfile if employee is actually a branch employee
      if (isBranchEmp) {
        selectedComponent = 'ViewResultsModalBranchRankNfile (Branch Default)';
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Routing to:', selectedComponent);
        }
        return (
          <ViewResultsModalBranchRankNfile
            isOpen={isOpen}
            onCloseAction={onCloseAction}
            submission={submission}
            onApprove={onApprove}
            isApproved={isApproved}
            approvalData={approvalData}
            currentUserName={currentUserName}
            currentUserSignature={currentUserSignature}
            showApprovalButton={showApprovalButton}
          />
        );
      }
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
          isOpen={isOpen}
          onCloseAction={onCloseAction}
          submission={submission}
          onApprove={onApprove}
          isApproved={isApproved}
          approvalData={approvalData}
          currentUserName={currentUserName}
          currentUserSignature={currentUserSignature}
          showApprovalButton={showApprovalButton}
        />
      );
    } else {
      // RankNfile HO - no Managerial Skills, no Customer Service
      return (
        <ViewResultsModalDefault
          isOpen={isOpen}
          onCloseAction={onCloseAction}
          submission={submission}
          onApprove={onApprove}
          isApproved={isApproved}
          approvalData={approvalData}
          currentUserName={currentUserName}
          currentUserSignature={currentUserSignature}
          showApprovalButton={showApprovalButton}
        />
      );
    }
  }

  // Fallback Priority 5: Branch evaluations (if evaluationType not available)
  // Branch employees with Customer Service → BranchDefault → ViewResultsModalBranchRankNfile
  // Branch employees with Managerial Skills → BranchBasic → ViewResultsModalBranchManager
  if (isBranchEmp) {
    if (hasManagerialSkills) {
      // BranchBasic - has Managerial Skills (branch manager)
      return (
        <ViewResultsModalBranchManager
          isOpen={isOpen}
          onCloseAction={onCloseAction}
          submission={submission}
          onApprove={onApprove}
          isApproved={isApproved}
          approvalData={approvalData}
          currentUserName={currentUserName}
          currentUserSignature={currentUserSignature}
          showApprovalButton={showApprovalButton}
        />
      );
    } else if (hasCustomerService) {
      // BranchDefault - has Customer Service (branch rank and file)
      return (
        <ViewResultsModalBranchRankNfile
          isOpen={isOpen}
          onCloseAction={onCloseAction}
          submission={submission}
          onApprove={onApprove}
          isApproved={isApproved}
          approvalData={approvalData}
          currentUserName={currentUserName}
          currentUserSignature={currentUserSignature}
          showApprovalButton={showApprovalButton}
        />
      );
    } else {
      // BranchRankNfile - no Customer Service, no Managerial Skills
      return (
        <ViewResultsModalBranchRankNfile
          isOpen={isOpen}
          onCloseAction={onCloseAction}
          submission={submission}
          onApprove={onApprove}
          isApproved={isApproved}
          approvalData={approvalData}
          currentUserName={currentUserName}
          currentUserSignature={currentUserSignature}
          showApprovalButton={showApprovalButton}
        />
      );
    }
  }

  // Default fallback: Should only be reached for HO evaluations without evaluationType
  // This is a safety fallback
  return (
    <ViewResultsModalDefault
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      submission={submission}
      onApprove={onApprove}
      isApproved={isApproved}
      approvalData={approvalData}
      currentUserName={currentUserName}
      currentUserSignature={currentUserSignature}
      showApprovalButton={showApprovalButton}
    />
  );
}

