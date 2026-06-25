import { useEffect, type Dispatch, type SetStateAction } from "react";
import { EvaluationPayload } from "./types";
import type { HoResubmitType } from "@/lib/evaluationEditSubmit";

export interface EvaluationFormEditOptions {
  editSubmissionId?: number;
  initialFormData?: Partial<EvaluationPayload>;
  /** Required when resubmitting an edited evaluation */
  hoResubmitType?: HoResubmitType;
}

export function useApplyInitialFormData(
  setForm: Dispatch<SetStateAction<EvaluationPayload>>,
  editSubmissionId?: number,
  initialFormData?: Partial<EvaluationPayload>
) {
  useEffect(() => {
    if (!editSubmissionId || !initialFormData) return;
    setForm((prev) => ({ ...prev, ...initialFormData }));
  }, [editSubmissionId, initialFormData, setForm]);
}
