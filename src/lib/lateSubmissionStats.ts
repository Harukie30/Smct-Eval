import {
  isReviewQuarterLate,
  type EvaluationRecordReview,
} from "@/components/evaluation/evaluationRecordsShared";

export type LateSubmissionStats = {
  /** Evaluations submitted after the quarter due window. */
  lateCount: number;
  /** Total evaluations counted (same pool as late check). */
  total: number;
  latePercent: number;
  /** Submissions in the last 24 hours (from dashboard). */
  newCount: number;
};

function toCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function toPercent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function countLateFromReviews(
  reviews: EvaluationRecordReview[]
): Pick<LateSubmissionStats, "lateCount" | "total"> {
  const total = reviews.length;
  const lateCount = reviews.filter((review) =>
    isReviewQuarterLate(review)
  ).length;
  return { lateCount, total };
}

/** Normalize /allEvaluations list responses into review rows. */
export function normalizeEvaluationsList(response: unknown): EvaluationRecordReview[] {
  if (!response || typeof response !== "object") {
    return [];
  }
  const obj = response as Record<string, unknown>;
  const data = obj.data;
  if (Array.isArray(data)) {
    return data as EvaluationRecordReview[];
  }
  return [];
}

export function mergeLateSubmissionStatsFromDashboard(
  dashboard: Record<string, unknown> | null | undefined,
  computed: LateSubmissionStats
): LateSubmissionStats {
  if (!dashboard) return computed;

  const lateCountRaw =
    dashboard.late_eval ??
    dashboard.late_evaluations ??
    dashboard.late_submissions ??
    dashboard.lateSubmissions;
  const totalRaw =
    dashboard.total_evaluations ?? dashboard.totalEvaluations ?? computed.total;
  const newCountRaw = dashboard.new_eval ?? dashboard.newEval ?? computed.newCount;

  if (lateCountRaw == null) return computed;

  const lateCount = toCount(lateCountRaw);
  const total = toCount(totalRaw) > 0 ? toCount(totalRaw) : computed.total;

  return {
    lateCount,
    total,
    latePercent: toPercent(lateCount, total),
    newCount: toCount(newCountRaw),
  };
}

/** Load late submission stats from /hrDashboard or by scanning evaluations. */
export async function resolveLateSubmissionStats(
  dashboard: Record<string, unknown>,
  fetchEvaluations: () => Promise<unknown>
): Promise<LateSubmissionStats> {
  const newCount = toCount(dashboard.new_eval ?? dashboard.newEval);
  const empty: LateSubmissionStats = {
    lateCount: 0,
    total: 0,
    latePercent: 0,
    newCount,
  };

  if (
    dashboard.late_eval != null ||
    dashboard.late_evaluations != null ||
    dashboard.late_submissions != null ||
    dashboard.lateSubmissions != null
  ) {
    return mergeLateSubmissionStatsFromDashboard(dashboard, empty);
  }

  try {
    const response = await fetchEvaluations();
    const reviews = normalizeEvaluationsList(response);
    const { lateCount, total } = countLateFromReviews(reviews);
    const computed: LateSubmissionStats = {
      lateCount,
      total,
      latePercent: toPercent(lateCount, total),
      newCount,
    };
    return mergeLateSubmissionStatsFromDashboard(dashboard, computed);
  } catch (error) {
    console.error("Error loading late submission stats:", error);
    return mergeLateSubmissionStatsFromDashboard(dashboard, empty);
  }
}
