// src/lib/quarterUtils.ts

/**
 * Get quarter from evaluation data based on selected review type
 * This is the correct way to determine quarter - from the review type selection, not submission date
 */
export const getQuarterFromEvaluationData = (evaluationData: any): string => {
  if (!evaluationData) return 'Unknown';
  
  // Determine the year from the evaluation data
  // Try to get year from coverage period first, then submission date
  let year = new Date().getFullYear();
  
  if (evaluationData.coverageFrom) {
    year = new Date(evaluationData.coverageFrom).getFullYear();
  } else if (evaluationData.submittedAt) {
    year = new Date(evaluationData.submittedAt).getFullYear();
  }
  
  // Determine quarter from review type selection
  if (evaluationData.reviewTypeRegularQ1) {
    return `Q1 ${year}`;
  }
  if (evaluationData.reviewTypeRegularQ2) {
    return `Q2 ${year}`;
  }
  if (evaluationData.reviewTypeRegularQ3) {
    return `Q3 ${year}`;
  }
  if (evaluationData.reviewTypeRegularQ4) {
    return `Q4 ${year}`;
  }
  
  // If no regular review type is selected, fall back to date-based calculation
  if (evaluationData.submittedAt) {
    const date = new Date(evaluationData.submittedAt);
    const month = date.getMonth() + 1;
    
    if (month >= 1 && month <= 3) return `Q1 ${year}`;
    if (month >= 4 && month <= 6) return `Q2 ${year}`;
    if (month >= 7 && month <= 9) return `Q3 ${year}`;
    if (month >= 10 && month <= 12) return `Q4 ${year}`;
  }
  
  return 'Unknown';
};

/**
 * Get quarter from date (legacy function for backward compatibility)
 * This should only be used when evaluation data is not available
 */
export const getQuarterFromDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    
    if (month >= 1 && month <= 3) return `Q1 ${year}`;
    if (month >= 4 && month <= 6) return `Q2 ${year}`;
    if (month >= 7 && month <= 9) return `Q3 ${year}`;
    if (month >= 10 && month <= 12) return `Q4 ${year}`;
    
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

/**
 * Chart / table period label from a submission row (matches HR performance reviews table).
 */
export function getPerformanceReviewPeriodLabel(
  submission: {
    reviewTypeRegular?: string | number | null;
    reviewTypeProbationary?: string | number | null;
    created_at?: string | null;
  } | null
  | undefined
): string {
  if (!submission) return "Others";

  const regular = submission.reviewTypeRegular;
  if (regular != null && String(regular).trim() !== "") {
    return String(regular).trim();
  }

  const prob = submission.reviewTypeProbationary;
  if (
    prob != null &&
    String(prob).trim() !== "" &&
    String(prob).trim().toLowerCase() !== "null"
  ) {
    return `M${prob}`;
  }

  if (submission.created_at) {
    const fromDate = getQuarterFromDate(submission.created_at);
    const [period] = fromDate.split(" ");
    return period || fromDate;
  }

  return "Others";
}

const PERFORMANCE_PERIOD_SORT_ORDER: Record<string, number> = {
  M3: 0,
  M5: 1,
  Q1: 2,
  Q2: 3,
  Q3: 4,
  Q4: 5,
  Others: 99,
};

function getPerformancePeriodSortKey(
  submission: Parameters<typeof getPerformanceReviewPeriodLabel>[0]
): number {
  const label = getPerformanceReviewPeriodLabel(submission);
  const quarterMatch = label.match(/^Q[1-4]/);
  if (quarterMatch) return PERFORMANCE_PERIOD_SORT_ORDER[quarterMatch[0]] ?? 50;
  if (label.startsWith("M3")) return PERFORMANCE_PERIOD_SORT_ORDER.M3;
  if (label.startsWith("M5")) return PERFORMANCE_PERIOD_SORT_ORDER.M5;
  return PERFORMANCE_PERIOD_SORT_ORDER.Others;
}

/** Oldest → newest for Performance Trend charts (Q1, then Q2, … left to right). */
export function sortSubmissionsForPerformanceChart<
  T extends {
    created_at?: string | null;
    reviewTypeRegular?: string | number | null;
    reviewTypeProbationary?: string | number | null;
  },
>(submissions: T[]): T[] {
  return [...submissions].sort((a, b) => {
    const periodDiff =
      getPerformancePeriodSortKey(a) - getPerformancePeriodSortKey(b);
    if (periodDiff !== 0) return periodDiff;

    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
      return timeA - timeB;
    }
    return 0;
  });
}

export type PerformanceTrendChartPoint = {
  review: string;
  rating: number | null | undefined;
  quarter: string;
  fullDate: string;
};

export function buildPerformanceTrendChartData(
  submissions: {
    rating?: number | null;
    created_at?: string | null;
    reviewTypeRegular?: string | number | null;
    reviewTypeProbationary?: string | number | null;
  }[]
): PerformanceTrendChartPoint[] {
  return sortSubmissionsForPerformanceChart(submissions).map(
    (submission, index) => ({
      review: `Review ${index + 1}`,
      rating: submission.rating,
      quarter: getPerformanceReviewPeriodLabel(submission),
      fullDate: submission.created_at
        ? new Date(submission.created_at).toLocaleDateString()
        : "—",
    })
  );
}

/**
 * Get quarter color for UI display
 */
export const getQuarterColor = (quarter: string | number | null | undefined) => {
  // Convert to string and handle null/undefined
  const quarterStr = quarter ? String(quarter) : '';
  
  if (!quarterStr) return 'bg-gray-100 text-gray-800';
  
  if (quarterStr.includes('Q1')) return 'bg-blue-100 text-blue-800';
  if (quarterStr.includes('Q2')) return 'bg-green-100 text-green-800';
  if (quarterStr.includes('Q3')) return 'bg-yellow-100 text-yellow-800';
  if (quarterStr.includes('Q4')) return 'bg-purple-100 text-purple-800';
  
  // Handle numeric probationary values (3, 5)
  if (quarterStr === '3' || quarterStr === '5') return 'bg-orange-100 text-orange-800';
  
  return 'bg-gray-100 text-gray-800';
};
