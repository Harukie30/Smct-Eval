import { useCallback, useState } from "react";

/** Open ViewResults immediately with submissionId; router fetches and shows loading overlay. */
export function useViewEvaluationModalState() {
  const [isOpen, setIsOpen] = useState(false);
  const [submissionId, setSubmissionId] = useState<number | string | null>(
    null
  );

  const openViewEvaluation = useCallback((id: number | string) => {
    setSubmissionId(id);
    setIsOpen(true);
  }, []);

  const closeViewEvaluation = useCallback(() => {
    setIsOpen(false);
    setSubmissionId(null);
  }, []);

  return {
    isViewResultsModalOpen: isOpen,
    viewSubmissionId: submissionId,
    openViewEvaluation,
    closeViewEvaluation,
  };
}
