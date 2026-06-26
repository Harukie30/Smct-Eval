import type { EvaluationPayload } from "@/components/evaluation/types";
import {
  resolveEvaluationEditRoute,
  type EvaluationEditRoute,
} from "@/lib/evaluationFormRouting";
import { submissionToEvaluationPayload } from "@/lib/submissionToEvaluationPayload";
import {
  type EvaluationSubmissionRecord,
} from "@/lib/evaluationSubmissionRecord";

/** Backend resubmit path segment (maps to POST /{endpoint}/resubmit/:id). */
export type EvaluationResubmitType =
  | "rankNfile"
  | "basic"
  | "branchRankNfile"
  | "branchBasic"
  | "branchBasicAreaManager";

/** Which evaluation form UI handles this record. */
export type EvaluationFormVariant =
  | "hoRankNfile"
  | "hoBasic"
  | "branchRankNfile"
  | "branchManager"
  | "areaManager";

export interface EvaluationEditSession {
  mode: "edit";
  submissionId: number;
  variant: EvaluationFormVariant;
  resubmitType: EvaluationResubmitType;
  initialData: Partial<EvaluationPayload>;
  /** Original GET /submissions/:id record — used to keep score row ids on resubmit. */
  sourceRecord: EvaluationSubmissionRecord;
  /** Branch manager form only — drives create-style UI config when needed. */
  branchEvaluationType?: "rankNfile" | "basic" | "default";
}

export function isEditSession(
  session: EvaluationEditSession | undefined | null
): session is EvaluationEditSession {
  return session != null && session.mode === "edit" && session.submissionId > 0;
}

export function variantFromEditRoute(
  route: EvaluationEditRoute
): EvaluationFormVariant {
  switch (route.form) {
    case "basicHo":
      return "hoBasic";
    case "rankNfileHo":
      return "hoRankNfile";
    case "branchRankNfile":
      return "branchRankNfile";
    case "branchManager":
      return "branchManager";
    case "areaManager":
      return "areaManager";
    default:
      return "hoRankNfile";
  }
}

export function resubmitTypeFromEditRoute(
  route: EvaluationEditRoute
): EvaluationResubmitType {
  switch (route.form) {
    case "basicHo":
      return "basic";
    case "rankNfileHo":
      return "rankNfile";
    case "branchRankNfile":
      return "branchRankNfile";
    case "branchManager":
      return "branchBasic";
    case "areaManager":
      return "branchBasicAreaManager";
    default:
      return "rankNfile";
  }
}

export function buildEditSession(
  submissionId: number,
  submission: EvaluationSubmissionRecord | null,
  initialFormData?: Partial<EvaluationPayload>
): EvaluationEditSession {
  const route = resolveEvaluationEditRoute(submission);
  const sourceRecord = submission ?? {};
  return {
    mode: "edit",
    submissionId,
    variant: variantFromEditRoute(route),
    resubmitType: resubmitTypeFromEditRoute(route),
    initialData:
      initialFormData ?? submissionToEvaluationPayload(sourceRecord),
    sourceRecord,
    branchEvaluationType:
      route.form === "branchManager" ? route.evaluationType : undefined,
  };
}
