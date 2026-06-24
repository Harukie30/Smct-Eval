import { apiService, type ResubmitEvaluationType } from "@/lib/apiService";
import { EvaluationPayload } from "@/components/evaluation/types";

export type HoResubmitType = ResubmitEvaluationType;

/**
 * Create flow: calls submitNew() (POST /HoRankNFile/:employeeId or /HoBasic/:employeeId).
 * Edit flow: routes to the matching resubmit endpoint based on form type.
 */
export async function submitEvaluationWithOptionalEdit(
  editSubmissionId: number | undefined,
  form: EvaluationPayload,
  submitNew: () => Promise<void>,
  hoResubmitType?: HoResubmitType
): Promise<void> {
  if (!editSubmissionId) {
    await submitNew();
    return;
  }

  if (hoResubmitType) {
    await apiService.resubmitEvaluation(editSubmissionId, form, hoResubmitType);
    return;
  }

  throw new Error(
    "Cannot resubmit: missing evaluation type."
  );
}
