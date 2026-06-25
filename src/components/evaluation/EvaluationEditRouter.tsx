"use client";

import { useMemo } from "react";
import { User } from "@/contexts/UserContext";
import { resolveEvaluationEditRoute } from "@/lib/evaluationFormRouting";
import { submissionToEvaluationPayload } from "@/lib/submissionToEvaluationPayload";
import RankNfileHo from "./RankNfileHo";
import BasicHo from "./BasicHo";
import BranchRankNfileEvaluationForm from "./BranchRankNfileEvaluationForm";
import BranchManagerEvaluationForm from "./BranchManagerEvaluationForm";
import AreaManagerEvaluationForm from "./AreaManagerEvaluationForm";
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

  const route = useMemo(
    () => resolveEvaluationEditRoute(submission),
    [submission]
  );

  const editProps: EvaluationFormEditOptions = {
    editSubmissionId: resolvedEditSubmissionId,
    initialFormData,
    hoResubmitType:
      route.form === "basicHo"
        ? ("basic" as const)
        : route.form === "rankNfileHo"
        ? ("rankNfile" as const)
        : route.form === "branchRankNfile"
        ? ("branchRankNfile" as const)
        : route.form === "branchManager"
        ? ("branchBasic" as const)
        : ("branchBasicAreaManager" as const),
  };

  switch (route.form) {
    case "basicHo":
      return (
        <BasicHo
          employee={employee}
          onCloseAction={onCloseAction}
          onCancelAction={onCancelAction}
          {...editProps}
        />
      );
    case "rankNfileHo":
      return (
        <RankNfileHo
          employee={employee}
          onCloseAction={onCloseAction}
          onCancelAction={onCancelAction}
          {...editProps}
        />
      );
    case "branchRankNfile":
      return (
        <BranchRankNfileEvaluationForm
          employee={employee}
          onCloseAction={onCloseAction}
          onCancelAction={onCancelAction}
          {...editProps}
        />
      );
    case "branchManager":
      return (
        <BranchManagerEvaluationForm
          employee={employee}
          onCloseAction={onCloseAction}
          onCancelAction={onCancelAction}
          evaluationType={route.evaluationType}
          {...editProps}
        />
      );
    case "areaManager":
      return (
        <AreaManagerEvaluationForm
          employee={employee}
          onCloseAction={onCloseAction}
          onCancelAction={onCancelAction}
          {...editProps}
        />
      );
    default:
      return null;
  }
}
