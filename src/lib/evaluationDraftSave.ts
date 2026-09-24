import { apiService } from "@/lib/apiService";
import { getEvaluationQuarterLabel } from "@/lib/evaluationQuarterLabel";
import { toDateInputValue } from "@/lib/dateInputValue";
import {
  type EvaluationEditSession,
  type EvaluationResubmitType,
  isEditSession,
} from "@/lib/evaluationEditTypes";
import { EvaluationPayload } from "@/components/evaluation/types";

export function buildEvaluationSavePayload(
  form: EvaluationPayload,
  extras?: Partial<EvaluationPayload>
): EvaluationPayload {
  const merged = {
    ...form,
    ...extras,
  };

  const hireDate = toDateInputValue(merged.hireDate) || merged.hireDate;
  const coverageFrom =
    toDateInputValue(merged.coverageFrom) || merged.coverageFrom;
  const coverageTo = toDateInputValue(merged.coverageTo) || merged.coverageTo;

  // Send both camelCase and snake_case so draft endpoints that only read
  // coverage_from / hire_date keep the exact day (not month start).
  return {
    ...merged,
    hireDate,
    coverageFrom,
    coverageTo,
    hire_date: hireDate,
    coverage_from: coverageFrom,
    coverage_to: coverageTo,
    quarter: getEvaluationQuarterLabel(merged),
  } as EvaluationPayload;
}

/** Create/new flows and draft edits save on Next. Pending resubmits skip draft POST. */
export function shouldSaveDraftOnNext(
  editSession: EvaluationEditSession | undefined
): boolean {
  if (!isEditSession(editSession)) return true;
  return String(editSession.sourceRecord.status ?? "").toLowerCase() === "draft";
}

export async function saveEvaluationStepDraft(options: {
  employeeId: number | string | null | undefined;
  draftType: EvaluationResubmitType;
  payload: EvaluationPayload | Record<string, unknown>;
  editSession?: EvaluationEditSession;
}): Promise<"saved" | "skipped"> {
  if (!shouldSaveDraftOnNext(options.editSession)) {
    return "skipped";
  }

  if (options.employeeId == null || options.employeeId === "") {
    throw new Error(
      "Missing employee ID. Cannot save this evaluation step as a draft."
    );
  }

  await apiService.postEvaluationDraft(
    options.draftType,
    options.employeeId,
    options.payload
  );
  return "saved";
}
