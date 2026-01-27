"use client";

import EvaluationForm from "./index";
import BranchRankNfileEvaluationForm from "./BranchRankNfileEvaluationForm";
import { User } from "../../contexts/UserContext";

interface BranchEvaluationFormProps {
  branch?: {
    id: number;
    name: string;
    branchCode?: string;
    location?: string;
  } | null;
  employee?: User | null;
  onCloseAction?: () => void;
  onCancelAction?: () => void;
  evaluationType?: 'rankNfile' | 'basic' | 'default';
}

export default function BranchEvaluationForm({
  branch,
  employee,
  onCloseAction,
  onCancelAction,
  evaluationType = 'default',
}: BranchEvaluationFormProps) {
  // Route to dedicated BranchRankNfileEvaluationForm for rankNfile evaluations
  // This provides cleaner, more maintainable code with specific validation logic
  if (evaluationType === 'rankNfile') {
    return (
      <BranchRankNfileEvaluationForm
        employee={employee}
        onCloseAction={onCloseAction}
        onCancelAction={onCancelAction}
      />
    );
  }

  // For other evaluation types, use the main EvaluationForm
  return (
    <EvaluationForm
      employee={employee}
      onCloseAction={onCloseAction}
      onCancelAction={onCancelAction}
      evaluationType={evaluationType}
    />
  );
}

