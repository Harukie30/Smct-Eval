"use client";

import { useMemo } from "react";
import { User } from "@/contexts/UserContext";
import { buildEditSession } from "@/lib/evaluationEditTypes";
import {
  asEvaluationSubmissionRecord,
  type EvaluationSubmissionRecord,
  getSubmissionRecordId,
} from "@/lib/evaluationSubmissionRecord";
import RankNfileHo from "./RankNfileHo";
import BasicHo from "./BasicHo";
import BranchRankNfileEvaluationForm from "./BranchRankNfileEvaluationForm";
import BranchManagerEvaluationForm from "./BranchManagerEvaluationForm";
import AreaManagerEvaluationForm from "./AreaManagerEvaluationForm";
import { EvaluationFormSessionProps } from "./evaluationFormEdit";

interface EvaluationEditRouterProps extends EvaluationFormSessionProps {
  submission: EvaluationSubmissionRecord | null;
  onCloseAction?: () => void;
  onCancelAction?: () => void;
  /** Override submission id when not on submission.id */
  editSubmissionId?: number;
}

export default function EvaluationEditRouter({
  submission,
  onCloseAction,
  onCancelAction,                                                                                                                                                                                                     
  editSubmissionId,
  editSession: editSessionProp,
}: EvaluationEditRouterProps) {
  const employee = (submission?.employee as User | undefined) ?? null;

  const editSession = useMemo(() => {
    if (editSessionProp) return editSessionProp;
    const submissionId =
      editSubmissionId ?? getSubmissionRecordId(submission);
    if (!submissionId) return undefined;
    return buildEditSession(submissionId, submission);
  }, [editSessionProp, editSubmissionId, submission]);

  if (!editSession) return null;

  const sessionProps = { editSession };

  switch (editSession.variant) {
    case "hoBasic":
      return (
        <BasicHo
          employee={employee}
          onCloseAction={onCloseAction}
          onCancelAction={onCancelAction}
          {...sessionProps}
        />
      );
    case "hoRankNfile":
      return (
        <RankNfileHo
          employee={employee}
          onCloseAction={onCloseAction}
          onCancelAction={onCancelAction}
          {...sessionProps}
        />
      );
    case "branchRankNfile":
      return (
        <BranchRankNfileEvaluationForm
          employee={employee}
          onCloseAction={onCloseAction}
          onCancelAction={onCancelAction}
          {...sessionProps}
        />
      );
    case "branchManager":
      return (
        <BranchManagerEvaluationForm
          employee={employee}
          onCloseAction={onCloseAction}
          onCancelAction={onCancelAction}
          evaluationType={editSession.branchEvaluationType ?? "basic"}
          {...sessionProps}
        />
      );
    case "areaManager":
      return (
        <AreaManagerEvaluationForm
          employee={employee}
          onCloseAction={onCloseAction}
          onCancelAction={onCancelAction}
          {...sessionProps}
        />
      );
    default:
      return null;
  }
}
