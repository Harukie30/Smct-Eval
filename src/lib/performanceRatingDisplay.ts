/** Performance evaluation scores use a 0–5 scale (aligned with evaluation forms). */
export const PERFORMANCE_RATING_SCALE_MAX = 5;

export type PerformanceRatingBand = {
  label: string;
  badgeClassName: string;
  textClassName: string;
  isLowPerformance: boolean;
  isPoorPerformance: boolean;
};

/**
 * Normalize API rating values to 0–5 (handles percentage payloads like 70 → 3.5).
 */
export function normalizeRatingOnFiveScale(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;

  const parsed =
    typeof raw === "string"
      ? Number.parseFloat(raw.replace(/%/g, "").trim())
      : Number(raw);

  if (!Number.isFinite(parsed)) return null;

  if (parsed > PERFORMANCE_RATING_SCALE_MAX && parsed <= 100) {
    return (parsed / 100) * PERFORMANCE_RATING_SCALE_MAX;
  }

  return parsed;
}

/** Minimum score (0–5) for the single positive "GOOD" badge. */
export const PERFORMANCE_GOOD_RATING_MIN = 3.0;

/**
 * Table badge: one positive label (GOOD), plus LOW/POOR for underperformance.
 */
export function getPerformanceRatingBand(raw: unknown): PerformanceRatingBand {
  const ratingNum = normalizeRatingOnFiveScale(raw);

  if (ratingNum === null) {
    return {
      label: "N/A",
      badgeClassName: "bg-gray-100 text-gray-700",
      textClassName: "text-gray-900",
      isLowPerformance: false,
      isPoorPerformance: false,
    };
  }

  if (ratingNum < 2.5) {
    return {
      label: "POOR",
      badgeClassName: "bg-red-100 text-red-800",
      textClassName: "text-red-700",
      isLowPerformance: true,
      isPoorPerformance: true,
    };
  }

  if (ratingNum < PERFORMANCE_GOOD_RATING_MIN) {
    return {
      label: "LOW",
      badgeClassName: "bg-orange-100 text-orange-800",
      textClassName: "text-orange-600",
      isLowPerformance: true,
      isPoorPerformance: false,
    };
  }

  return {
    label: "GOOD",
    badgeClassName: "bg-blue-100 text-blue-800",
    textClassName: "text-gray-900",
    isLowPerformance: false,
    isPoorPerformance: false,
  };
}

function formatRatingNumber(ratingNum: number): string {
  const rounded = Math.round(ratingNum * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatRatingDisplay(raw: unknown): string {
  const ratingNum = normalizeRatingOnFiveScale(raw);
  if (ratingNum === null) return "—";
  return `${formatRatingNumber(ratingNum)}/${PERFORMANCE_RATING_SCALE_MAX}`;
}
