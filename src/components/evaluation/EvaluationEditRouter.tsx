"use client";

import { useMemo } from "react";
import { User } from "@/contexts/UserContext";
import {
  isSubmissionHoEditable,
  resolveHoEvaluationEditRoute,
} from "@/lib/evaluationFormRouting";
import { submissionToEvaluationPayload } from "@/lib/submissionToEvaluationPayload";
import RankNfileHo from "./RankNfileHo";
import BasicHo from "./BasicHo";
import { EvaluationFormEditOptions } from "./evaluationFormEdit";

interface EvaluationEditRouterProps extends EvaluationFormEditOptions {
  submission: Record<string, unknown> | null;
  onCloseAction?: () => void;
  onCancelAction?: () => void;
}

export default function EvaluationEditRouter({
  submission,
  onCloseAction,
  onCancelAction,
  editSubmissionId,
  initialFormData: initialFormDataProp,
}: EvaluationEditRouterProps) {
  const employee = (submission?.employee as User | undefined) ?? null;
  const resolvedEditSubmissionId =
    editSubmissionId ?? (Number(submission?.id ?? 0) || undefined);

  const initialFormData = useMemo(() => {
    if (initialFormDataProp) return initialFormDataProp;
    if (!submission) return undefined;
    return submissionToEvaluationPayload(submission);
  }, [initialFormDataProp, submission]);

  const isHoEditable = useMemo(
    () => isSubmissionHoEditable(submission),
    [submission]
  );

  const route = useMemo(
    () => resolveHoEvaluationEditRoute(submission),
    [submission]
  );

  const editProps = {
    editSubmissionId: resolvedEditSubmissionId,
    initialFormData,
  };

  if (!isHoEditable) {
    return (
      <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-semibold text-slate-800">
          Editing is only available for HO evaluations
        </p>
        <p className="max-w-md text-sm text-slate-600">
          This evaluation is not eligible for edit. Rejected branch evaluations
          cannot be edited from this screen.
        </p>
      </div>
    );
  }

  if (route === "basicHo") {
    return (
      <BasicHo
        employee={employee}
        onCloseAction={onCloseAction}
        onCancelAction={onCancelAction}
        {...editProps}
      />
    );
  }

  return (
    <RankNfileHo
      employee={employee}
      onCloseAction={onCloseAction}
      onCancelAction={onCancelAction}
      {...editProps}
    />
  );
}
