import { isEmployeeHeadOffice } from "@/components/evaluation/employeeBranchLabel";

export type EvaluationEditRoute =
  | { form: "rankNfileHo" }
  | { form: "basicHo" }
  | { form: "branchRankNfile" }
  | { form: "branchManager"; evaluationType: "basic" | "default" }
  | { form: "areaManager" };

type RoutableSubmission = {
  employee?: Record<string, unknown> | null;
  evaluationType?: string;
  evaluation_type?: string;
  type?: string;
  form_type?: string;
  customer_services?: unknown[];
  customerServices?: unknown[];
  managerial_skills?: unknown[];
  managerialSkills?: unknown[];
};

function getEvaluationType(submission: RoutableSubmission | null): string | null {
  if (!submission) return null;

  const evaluationType =
    submission.evaluationType ??
    submission.evaluation_type ??
    submission.type ??
    submission.form_type ??
    null;

  return evaluationType ? String(evaluationType) : null;
}

function isEmployeeHO(submission: RoutableSubmission | null): boolean {
  if (!submission?.employee) return false;
  return isEmployeeHeadOffice(submission.employee as never);
}

function isEmployeeBranch(submission: RoutableSubmission | null): boolean {
  return !isEmployeeHO(submission);
}

function isEmployeeAreaManager(submission: RoutableSubmission | null): boolean {
  const employee = submission?.employee;
  if (!employee?.positions) return false;

  const positions = employee.positions as
    | { label?: string; name?: string }
    | string
    | undefined;
  const positionName = (
    typeof positions === "string"
      ? positions
      : positions?.label ??
        positions?.name ??
        String(employee.position ?? "")
  )
    .toUpperCase()
    .trim();

  return (
    positionName === "AREA MANAGER" || positionName.includes("AREA MANAGER")
  );
}

function hasCustomerService(submission: RoutableSubmission | null): boolean {
  const items =
    submission?.customer_services ?? submission?.customerServices ?? [];
  return Array.isArray(items) && items.length > 0;
}

function hasManagerialSkills(submission: RoutableSubmission | null): boolean {
  const items =
    submission?.managerial_skills ?? submission?.managerialSkills ?? [];
  return Array.isArray(items) && items.length > 0;
}

function normalizeEvalType(evaluationType: string): string {
  return evaluationType.toUpperCase().replace(/[\s_\-]/g, "").trim();
}

export function resolveEvaluationEditRoute(
  submission: RoutableSubmission | null
): EvaluationEditRoute {
  const apiEvaluationType = getEvaluationType(submission);
  const isHOEmp = isEmployeeHO(submission);
  const isBranchEmp = isEmployeeBranch(submission);
  const isEmployeeAreaMgr = isEmployeeAreaManager(submission);
  const hasCS = hasCustomerService(submission);
  const hasMS = hasManagerialSkills(submission);

  if (apiEvaluationType) {
    const evalTypeNormalized = normalizeEvalType(apiEvaluationType);

    if (
      evalTypeNormalized === "BRANCHRANKNFILE" ||
      evalTypeNormalized.includes("BRANCHRANKNFILE") ||
      (evalTypeNormalized.includes("BRANCH") &&
        evalTypeNormalized.includes("RANK") &&
        evalTypeNormalized.includes("FILE"))
    ) {
      if (isHOEmp) return { form: "rankNfileHo" };
      if (isBranchEmp) return { form: "branchRankNfile" };
    }

    if (
      evalTypeNormalized === "HOBASIC" ||
      evalTypeNormalized.includes("HOBASIC") ||
      (evalTypeNormalized.includes("BASIC") && evalTypeNormalized.includes("HO")) ||
      (evalTypeNormalized === "BASIC" && isHOEmp)
    ) {
      if (isHOEmp) return { form: "basicHo" };
    }

    if (
      evalTypeNormalized === "HORANKNFILE" ||
      evalTypeNormalized.includes("HORANKNFILE") ||
      (evalTypeNormalized.includes("HO") &&
        evalTypeNormalized.includes("RANK") &&
        evalTypeNormalized.includes("FILE"))
    ) {
      if (isHOEmp) return { form: "rankNfileHo" };
    }

    if (
      (evalTypeNormalized === "AREAMANAGER" ||
        evalTypeNormalized.includes("AREAMANAGER") ||
        evalTypeNormalized === "BRANCHAREAMANAGER" ||
        evalTypeNormalized.includes("BRANCHAREAMANAGER")) &&
      isEmployeeAreaMgr
    ) {
      return { form: "areaManager" };
    }

    if (
      evalTypeNormalized === "BRANCHBASICAREAMANAGER" ||
      (evalTypeNormalized.includes("BRANCH") &&
        evalTypeNormalized.includes("BASIC") &&
        evalTypeNormalized.includes("AREAMANAGER"))
    ) {
      return { form: "areaManager" };
    }

    if (
      evalTypeNormalized === "BRANCHBASIC" ||
      evalTypeNormalized.includes("BRANCHBASIC") ||
      (evalTypeNormalized.includes("BRANCH") && evalTypeNormalized.includes("BASIC"))
    ) {
      if (isHOEmp) return { form: "basicHo" };
      if (isBranchEmp) {
        if (isEmployeeAreaMgr && !hasCS) return { form: "areaManager" };
        return { form: "branchManager", evaluationType: "basic" };
      }
    }

    if (
      evalTypeNormalized === "BRANCHDEFAULT" ||
      evalTypeNormalized.includes("BRANCHDEFAULT") ||
      (evalTypeNormalized.includes("BRANCH") && evalTypeNormalized.includes("DEFAULT"))
    ) {
      if (isHOEmp) return { form: "rankNfileHo" };
      if (isBranchEmp) return { form: "branchRankNfile" };
    }
  }

  if (isHOEmp) {
    return hasMS ? { form: "basicHo" } : { form: "rankNfileHo" };
  }

  if (isBranchEmp) {
    if (hasMS) {
      if (isEmployeeAreaMgr && !hasCS) return { form: "areaManager" };
      return { form: "branchManager", evaluationType: "basic" };
    }
    return { form: "branchRankNfile" };
  }

  return { form: "rankNfileHo" };
}

export type HoEvaluationEditRoute = "rankNfileHo" | "basicHo";

/** HO-only edit flow: rank-and-file vs basic (managerial skills). */
export function resolveHoEvaluationEditRoute(
  submission: RoutableSubmission | null
): HoEvaluationEditRoute {
  if (!submission || !isEmployeeHO(submission)) {
    return "rankNfileHo";
  }

  const apiEvaluationType = getEvaluationType(submission);
  const hasMS = hasManagerialSkills(submission);

  if (apiEvaluationType) {
    const evalTypeNormalized = normalizeEvalType(apiEvaluationType);

    if (
      evalTypeNormalized === "HOBASIC" ||
      evalTypeNormalized.includes("HOBASIC") ||
      (evalTypeNormalized.includes("BASIC") && evalTypeNormalized.includes("HO")) ||
      evalTypeNormalized === "BASIC"
    ) {
      return "basicHo";
    }

    if (
      evalTypeNormalized === "HORANKNFILE" ||
      evalTypeNormalized.includes("HORANKNFILE") ||
      (evalTypeNormalized.includes("HO") &&
        evalTypeNormalized.includes("RANK") &&
        evalTypeNormalized.includes("FILE"))
    ) {
      return "rankNfileHo";
    }
  }

  return hasMS ? "basicHo" : "rankNfileHo";
}

export function isSubmissionHoEditable(
  submission: RoutableSubmission | null
): boolean {
  return isEmployeeHO(submission);
}
