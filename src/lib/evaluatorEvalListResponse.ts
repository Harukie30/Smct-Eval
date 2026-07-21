export type EvaluatorEvalListPage = {
  data: unknown[];
  total: number;
  last_page: number;
  per_page: number;
};

export type PendingApprovalEvaluationsResponse = {
  pending_approvals: EvaluatorEvalListPage;
  /** All Records tab badge count (evaluator records excluding approval-tab rows). */
  myEval_as_Evaluator_count: number;
};

function readPaginatedBlock(
  value: unknown
): EvaluatorEvalListPage | null {
  if (Array.isArray(value)) {
    return {
      data: value,
      total: value.length,
      last_page: 1,
      per_page: value.length || 10,
    };
  }
  if (!value || typeof value !== "object") {
    return null;
  }

  const block = value as Record<string, unknown>;
  const data = Array.isArray(block.data)
    ? block.data
    : Array.isArray(block.items)
      ? block.items
      : [];

  return {
    data,
    total: Number(block.total ?? data.length) || 0,
    last_page: Number(block.last_page ?? block.lastPage ?? 1) || 1,
    per_page: Number(block.per_page ?? block.perPage ?? 10) || 10,
  };
}

function readNumericCount(value: unknown): number | null {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) {
    return null;
  }
  return count;
}

/** Read All Records badge count from pending-approval / evaluator list payloads. */
export function getMyEvalAsEvaluatorCount(response: unknown): number | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const root = response as Record<string, unknown>;
  return (
    readNumericCount(root.myEval_as_Evaluator_count) ??
    readNumericCount(root.myEvalAsEvaluatorCount) ??
    readNumericCount(root.my_eval_as_evaluator_count)
  );
}

/**
 * Normalizes GET `/getPendingApprovalEvaluations` payloads.
 *
 * Expected backend shape:
 * {
 *   pending_approvals: { data, total, last_page, per_page },
 *   myEval_as_Evaluator_count: number
 * }
 */
export function normalizePendingApprovalEvaluationsResponse(
  payload: unknown
): PendingApprovalEvaluationsResponse {
  const empty: EvaluatorEvalListPage = {
    data: [],
    total: 0,
    last_page: 1,
    per_page: 10,
  };

  if (!payload || typeof payload !== "object") {
    return {
      pending_approvals: empty,
      myEval_as_Evaluator_count: 0,
    };
  }

  const root = payload as Record<string, unknown>;
  const pendingBlock =
    readPaginatedBlock(
      root.pending_approvals ??
        root.pendingApprovals ??
        root.myEval_as_Evaluator ??
        root.my_eval_as_evaluator
    ) ?? empty;

  return {
    pending_approvals: pendingBlock,
    myEval_as_Evaluator_count: getMyEvalAsEvaluatorCount(root) ?? 0,
  };
}
