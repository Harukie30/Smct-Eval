export type ApprovalStatusStats = {
  pending: number;
  approved: number;
  total: number;
  pendingPercent: number;
  approvedPercent: number;
};

function toCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function toPercent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export function resolveApprovalStatusStats(
  dashboard: Record<string, unknown> | null | undefined
): ApprovalStatusStats {
  if (!dashboard) {
    return {
      pending: 0,
      approved: 0,
      total: 0,
      pendingPercent: 0,
      approvedPercent: 0,
    };
  }

  const pending = toCount(
    dashboard.pending_eval ??
      dashboard.pending_evaluations ??
      dashboard.total_pending_evaluations
  );
  const approved = toCount(
    dashboard.completed_eval ??
      dashboard.completed_evaluations ??
      dashboard.total_completed_evaluations
  );
  const newEval = toCount(dashboard.new_eval);
  const draft = toCount(dashboard.draft_eval ?? dashboard.draft_evaluations);
  const rejected = toCount(
    dashboard.rejected_eval ?? dashboard.rejected_evaluations
  );

  const explicitTotal = toCount(dashboard.total_evaluations);
  const summedTotal = pending + approved + newEval + draft + rejected;
  const total = explicitTotal > 0 ? explicitTotal : summedTotal;

  const pendingPercentRaw =
    dashboard.pending_approval_percent ?? dashboard.pendingApprovalPercent;
  const approvedPercentRaw =
    dashboard.approved_percent ?? dashboard.approvedPercent;

  return {
    pending,
    approved,
    total,
    pendingPercent:
      pendingPercentRaw != null
        ? toCount(pendingPercentRaw)
        : toPercent(pending, total),
    approvedPercent:
      approvedPercentRaw != null
        ? toCount(approvedPercentRaw)
        : toPercent(approved, total),
  };
}
