"use client";

import { useCallback, useRef, useState } from "react";
import { EvaluationPayload } from "@/components/evaluation/types";
import { getEvaluationApiErrorMessage } from "@/components/evaluation/evaluationRecordsShared";
import {
  type EvaluationEditSession,
  type EvaluationResubmitType,
} from "@/lib/evaluationEditTypes";
import {
  buildEvaluationSavePayload,
  saveEvaluationStepDraft,
} from "@/lib/evaluationDraftSave";
import { toastMessages } from "@/lib/toastMessages";

export function useEvaluationDraftOnNext(options: {
  employeeId: number | string | null | undefined;
  form: EvaluationPayload;
  draftType: EvaluationResubmitType;
  editSession?: EvaluationEditSession;
  buildPayload?: (form: EvaluationPayload) => EvaluationPayload;
  onAdvance: () => void;
}) {
  const {
    employeeId,
    form,
    draftType,
    editSession,
    buildPayload,
    onAdvance,
  } = options;
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const savingRef = useRef(false);

  const saveAndNext = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSavingDraft(true);
    try {
      const payload = buildPayload
        ? buildPayload(form)
        : buildEvaluationSavePayload(form);
      await saveEvaluationStepDraft({
        employeeId,
        draftType,
        payload,
        editSession,
      });
      onAdvance();
    } catch (error) {
      console.error("Evaluation step draft save failed:", error);
      toastMessages.generic.error(
        "Could not save progress",
        getEvaluationApiErrorMessage(
          error,
          "Failed to save this step as a draft. Please try again."
        )
      );
    } finally {
      savingRef.current = false;
      setIsSavingDraft(false);
    }
  }, [buildPayload, draftType, editSession, employeeId, form, onAdvance]);

  return { saveAndNext, isSavingDraft };
}
