import { useEffect, type Dispatch, type SetStateAction } from "react";
import { EvaluationPayload } from "./types";
import {
  type EvaluationEditSession,
  isEditSession,
} from "@/lib/evaluationEditTypes";

export interface EvaluationFormSessionProps {
  /** Present when editing an existing evaluation (e.g. rejected resubmit). */
  editSession?: EvaluationEditSession;
}

export type { EvaluationEditSession } from "@/lib/evaluationEditTypes";

export function useApplyInitialFormData(
  setForm: Dispatch<SetStateAction<EvaluationPayload>>,
  editSession?: EvaluationEditSession
) {
  useEffect(() => {
    if (!isEditSession(editSession)) return;
    setForm((prev) => ({ ...prev, ...editSession.initialData }));
  }, [editSession, setForm]);
}
