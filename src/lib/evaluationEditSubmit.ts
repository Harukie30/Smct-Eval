import { apiService } from "@/lib/apiService";
import {
  type EvaluationEditSession,
  isEditSession,
} from "@/lib/evaluationEditTypes";
import { buildResubmitJsonPayload } from "@/lib/evaluationResubmitPayload";
import { EvaluationPayload } from "@/components/evaluation/types";

export type { EvaluationResubmitType as HoResubmitType } from "@/lib/evaluationEditTypes";

/**
 * Create flow: calls submitNew() (POST create endpoints).
 * Edit flow: POST /{type}/resubmit/:submissionId using editSession.resubmitType.
 */
export async function submitEvaluationForm(
  editSession: EvaluationEditSession | undefined,
  form: EvaluationPayload,
  submitNew: () => Promise<void>
): Promise<void> {
  if (!isEditSession(editSession)) {
    await submitNew();
    return;
  }

  await apiService.resubmitEvaluation(
    editSession.submissionId,
    buildResubmitJsonPayload(form, editSession.sourceRecord),
    editSession.resubmitType
  );
}

/** @deprecated Use submitEvaluationForm with editSession instead. */
export async function submitEvaluationWithOptionalEdit(
  editSubmissionId: number | undefined,
  form: EvaluationPayload,
  submitNew: () => Promise<void>,
  hoResubmitType?: EvaluationEditSession["resubmitType"]
): Promise<void> {
  if (!editSubmissionId) {
    await submitNew();
    return;
  }

  if (!hoResubmitType) {
    throw new Error("Cannot resubmit: missing evaluation type.");
  }

  await apiService.resubmitEvaluation(
    editSubmissionId,
    form,
    hoResubmitType
  );
}
