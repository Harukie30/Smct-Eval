/**
 * API shape for GET /submissions/:id → response.data.user_eval
 * (nested relations + snake_case / camelCase variants).
 *
 * Form editing uses EvaluationPayload — map with submissionToEvaluationPayload().
 */

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
