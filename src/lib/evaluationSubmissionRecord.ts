/**
 * API shape for GET /submissions/:id → response.data.user_eval
 * (nested relations + snake_case / camelCase variants).
 *
 * Form editing uses EvaluationPayload — map with submissionToEvaluationPayload().
 */

import {
  isEvaluationStatusEditableByEvaluator,
  normalizeEvaluationStatus,
} from "@/lib/evaluationStatus";

export interface EvaluationScoreItem {
  id?: number;
  users_evaluation_id?: number;
  question_number?: number;
  questionNumber?: number;
  q?: number;
  score?: number;
  value?: number;
  comment?: string;
  comments?: string;
  explanation?: string;
}

/** Employee nested on a submission record. */
export interface EvaluationSubmissionEmployee {
  id?: number | string;
  fname?: string;
  lname?: string;
  email?: string;
  position?: string;
  branch?: unknown;
  branches?: unknown;
  branch_id?: number | string;
  branchId?: number | string;
  positions?: { label?: string; name?: string } | string;
  departments?: { department_name?: string; name?: string };
  roles?: Array<{ name?: string }> | { name?: string };
}

/** Flat evaluation fields that may live on the record or evaluation_data. */
export interface EvaluationSubmissionData {
  hireDate?: string;
  hire_date?: string;
  rating?: number | string;
  performanceScore?: number | string;
  performance_score?: number | string;
  coverageFrom?: string;
  coverage_from?: string;
  coverageTo?: string;
  coverage_to?: string;
  reviewTypeProbationary?: number | string;
  review_type_probationary?: number | string;
  reviewTypeRegular?: string;
  review_type_regular?: string;
  reviewTypeOthersImprovement?: boolean | number;
  review_type_others_improvement?: boolean | number;
  reviewTypeOthersCustom?: string;
  review_type_others_custom?: string;
  priorityArea1?: string;
  priority_area_1?: string;
  priorityArea2?: string;
  priority_area_2?: string;
  priorityArea3?: string;
  priority_area_3?: string;
  remarks?: string;
  overallComments?: string;
  overall_comments?: string;
  created_at?: string;
  job_knowledge?: EvaluationScoreItem[];
  quality_of_works?: EvaluationScoreItem[];
  qualityOfWorks?: EvaluationScoreItem[];
  adaptabilities?: EvaluationScoreItem[];
  adaptability?: EvaluationScoreItem[];
  teamworks?: EvaluationScoreItem[];
  teamwork?: EvaluationScoreItem[];
  reliabilities?: EvaluationScoreItem[];
  reliability?: EvaluationScoreItem[];
  ethicals?: EvaluationScoreItem[];
  ethical?: EvaluationScoreItem[];
  customer_services?: EvaluationScoreItem[];
  customerServices?: EvaluationScoreItem[];
  managerial_skills?: EvaluationScoreItem[];
  managerialSkills?: EvaluationScoreItem[];
}

export interface EvaluationSubmissionRecord extends EvaluationSubmissionData {
  id?: number | string;
  status?: string;
  noteIfRejected?: string | null;
  note_if_rejected?: string | null;
  rejection_note?: string | null;
  evaluationType?: string;
  evaluation_type?: string;
  type?: string;
  form_type?: string;
  employee?: EvaluationSubmissionEmployee | null;
  evaluationData?: EvaluationSubmissionData;
  evaluation_data?: EvaluationSubmissionData;
}

/** Narrow unknown API JSON to a submission record (non-throwing). */
export function asEvaluationSubmissionRecord(
  value: unknown
): EvaluationSubmissionRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as EvaluationSubmissionRecord;
}

export function getSubmissionRecordId(
  record: EvaluationSubmissionRecord | null | undefined
): number | undefined {
  if (!record?.id) return undefined;
  const id = Number(record.id);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

function isPresentApproverId(value: unknown): boolean {
  if (value == null) return false;
  const s = String(value).trim();
  return s !== "" && s !== "0" && s.toLowerCase() !== "null";
}

/** True when the evaluation record has at least one assigned approver. */
export function recordHasApprover(
  record: EvaluationSubmissionRecord | Record<string, unknown>
): boolean {
  const extended = record as Record<string, unknown>;

  const scalarCandidates = [
    extended.approver_id,
    extended.approverId,
    extended.current_approver_id,
    extended.currentApproverId,
    extended.pending_approver_id,
    extended.pendingApproverId,
  ];

  for (const value of scalarCandidates) {
    if (isPresentApproverId(value)) return true;
  }

  const objectCandidates = [
    extended.approver,
    extended.approver1,
    extended.approver_1,
    extended.approver2,
    extended.approver_2,
    extended.current_approver,
    extended.currentApprover,
    extended.pending_approver,
    extended.pendingApprover,
  ];

  for (const value of objectCandidates) {
    if (!value || typeof value !== "object") continue;
    const item = value as Record<string, unknown>;
    if (isPresentApproverId(item.id ?? item.user_id ?? item.approver_id)) {
      return true;
    }
  }

  const arrayCandidates = [
    extended.approvers,
    extended.assigned_approver,
    extended.assigned_approvers,
    extended.assignedApprover,
    extended.assignedApprovers,
  ];

  for (const value of arrayCandidates) {
    if (!Array.isArray(value) || value.length === 0) continue;
    for (const item of value) {
      if (item == null) continue;
      if (typeof item === "object") {
        const row = item as Record<string, unknown>;
        if (isPresentApproverId(row.id ?? row.user_id ?? row.approver_id)) {
          return true;
        }
        continue;
      }
      if (isPresentApproverId(item)) return true;
    }
  }

  return false;
}

/** Status + approver gate for resubmit (draft uses a separate submit path). */
export function isSubmissionResubmitAllowed(
  record: EvaluationSubmissionRecord | null | undefined
): boolean {
  if (!record) return false;

  const status = normalizeEvaluationStatus(record.status);
  if (status === "draft") return true;

  return isEvaluationStatusEditableByEvaluator(status, recordHasApprover(record));
}
