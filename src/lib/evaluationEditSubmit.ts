import { apiService } from "@/lib/apiService";
import { EvaluationPayload } from "@/components/evaluation/types";

export async function submitEvaluationWithOptionalEdit(
  editSubmissionId: number | undefined,
  form: EvaluationPayload,
  submitNew: () => Promise<void>
): Promise<void> {
  if (editSubmissionId) {
    await apiService.updateSubmission(editSubmissionId, form);
    return;
  }

  await submitNew();
}
