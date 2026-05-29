"use client";

import { Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EvaluationRecordReview = {
  id: number;
  employee: any;
  evaluator: any;
  reviewTypeProbationary: number | string;
  reviewTypeRegular: number | string;
  reviewTypeOthersImprovement?: boolean | number;
  reviewTypeOthersCustom?: string;
  created_at: string;
  rating: number;
  status: string;
};

export const RATING_DISPLAY_BANDS = [
  {
    maxExclusive: 2.5,
    badgeClass: "bg-red-100 text-red-800",
    legend: "Poor (<2.5)",
  },
  {
    maxExclusive: 3.0,
    badgeClass: "bg-orange-100 text-orange-800",
    legend: "Low (<3.0)",
  },
  {
    maxExclusive: 4.0,
    badgeClass: "bg-blue-100 text-blue-800",
    legend: "Good (3.0–3.9)",
  },
  {
    maxExclusive: Number.POSITIVE_INFINITY,
    badgeClass: "bg-green-100 text-green-800",
    legend: "Excellent (≥4.0)",
  },
] as const;

export const ratingPillClass =
  "inline-flex items-center justify-center rounded-md border border-transparent px-1.5 py-0.5 text-[0.65rem] font-medium whitespace-nowrap sm:px-2 sm:text-xs";

export const EVAL_RECORDS_TABLE_CLASS =
  "min-w-[38rem] sm:min-w-[48rem] md:min-w-[56rem] lg:min-w-[68rem] xl:min-w-0 xl:w-full [&_th]:h-auto [&_th]:min-h-8 [&_th]:whitespace-nowrap [&_th]:px-2 [&_th]:py-2 [&_th]:align-middle [&_th]:text-[0.6rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-600 sm:[&_th]:min-h-9 sm:[&_th]:px-2.5 sm:[&_th]:py-2.5 sm:[&_th]:text-[0.65rem] lg:[&_th]:px-3 lg:[&_th]:text-xs xl:[&_th]:px-4 [&_td]:min-w-0 [&_td]:px-2 [&_td]:py-2 [&_td]:align-top [&_td]:text-[0.7rem] [&_td]:leading-snug sm:[&_td]:px-2.5 sm:[&_td]:py-2.5 sm:[&_td]:text-xs lg:[&_td]:px-3 lg:[&_td]:text-sm lg:[&_td]:leading-snug";

export const EVAL_TABLE_ACTIONS_HEAD_CLASS = cn(
  "w-[3.25rem] min-w-[3.25rem] p-1 text-center sm:min-w-[4.5rem] sm:p-2 lg:sticky lg:right-0 lg:z-[4] lg:min-w-[7rem] lg:bg-white lg:text-left lg:shadow-[-6px_0_12px_-4px_rgba(15,23,42,0.12)]"
);

export function evalTableActionsCellClass(rowClassName: string) {
  return cn(
    "w-[3.25rem] min-w-[3.25rem] max-w-[3.25rem] p-1 sm:w-auto sm:min-w-[4.5rem] sm:max-w-none sm:p-2",
    "lg:sticky lg:right-0 lg:z-[3] lg:min-w-[7rem] lg:w-auto lg:shadow-[-6px_0_12px_-4px_rgba(15,23,42,0.12)]",
    rowClassName.includes("bg-green-50") && "lg:bg-green-50",
    rowClassName.includes("bg-yellow-50") && "lg:bg-yellow-50",
    rowClassName.includes("bg-blue-50") && "lg:bg-blue-50",
    rowClassName.includes("bg-orange-50") && "lg:bg-orange-50",
    !rowClassName.includes("bg-green-50") &&
      !rowClassName.includes("bg-yellow-50") &&
      !rowClassName.includes("bg-blue-50") &&
      !rowClassName.includes("bg-orange-50") &&
      "lg:bg-white"
  );
}

export function parseRatingNumber(
  rating: number | string | null | undefined
): number | null {
  if (rating === null || rating === undefined || rating === "") return null;
  const n = typeof rating === "string" ? parseFloat(rating) : Number(rating);
  return Number.isNaN(n) ? null : n;
}

export function getRatingBadgeClassFromBands(
  rating: number | string | null | undefined
): string {
  const n = parseRatingNumber(rating);
  if (n === null) return "bg-gray-100 text-gray-600";
  for (const band of RATING_DISPLAY_BANDS) {
    if (n < band.maxExclusive) return band.badgeClass;
  }
  return RATING_DISPLAY_BANDS[RATING_DISPLAY_BANDS.length - 1].badgeClass;
}

export function getReviewListRating(
  review: EvaluationRecordReview | null | undefined
): number | null {
  if (!review) return null;
  const extended = review as EvaluationRecordReview & {
    overall_rating?: number | string | null;
    overallRating?: number | string | null;
  };
  const raw =
    extended.rating ?? extended.overall_rating ?? extended.overallRating;
  const n = parseRatingNumber(raw as number | string | null | undefined);
  if (n === null) return null;
  if (n === 0) return null;
  return n;
}

export function formatReviewListDate(createdAt: string): {
  short: string;
  full: string;
} {
  const d = new Date(createdAt);
  return {
    short: d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "2-digit",
    }),
    full: d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function formatReviewStatusLabel(status: string): {
  short: string;
  full: string;
} {
  const s = String(status ?? "");
  if (s === "completed") return { short: "✓ Done", full: `✓ ${s}` };
  if (s === "pending") return { short: "⏳ Pend.", full: `⏳ ${s}` };
  return { short: s, full: s };
}

export function isReviewDeletable(review: EvaluationRecordReview): boolean {
  const status = String(review.status ?? "").toLowerCase();
  return status === "pending";
}

export function formatRatingDisplay(rating: number | null): string {
  if (rating === null) return "—";
  return rating % 1 === 0 ? String(rating) : rating.toFixed(2);
}

export function getQuarterColor(quarter: string): string {
  if (quarter.includes("Q1")) return "bg-blue-100 text-blue-800";
  if (quarter.includes("Q2")) return "bg-green-100 text-green-800";
  if (quarter.includes("Q3")) return "bg-yellow-100 text-yellow-800";
  return "bg-purple-100 text-purple-800";
}

export function getReviewQuarterDisplay(review: EvaluationRecordReview): string {
  const isOthersSelected =
    Boolean(review.reviewTypeOthersImprovement) ||
    (review.reviewTypeOthersCustom &&
      review.reviewTypeOthersCustom.trim() !== "");

  if (
    review.reviewTypeRegular != null &&
    review.reviewTypeRegular !== "" &&
    review.reviewTypeRegular !== "null" &&
    String(review.reviewTypeRegular).trim() !== "" &&
    review.reviewTypeRegular !== 0
  ) {
    return String(review.reviewTypeRegular).trim();
  }

  if (
    review.reviewTypeProbationary != null &&
    review.reviewTypeProbationary !== "" &&
    review.reviewTypeProbationary !== "null" &&
    String(review.reviewTypeProbationary).trim() !== ""
  ) {
    return "M" + String(review.reviewTypeProbationary).trim();
  }

  if (isOthersSelected) {
    if (review.reviewTypeOthersCustom?.trim()) {
      return review.reviewTypeOthersCustom.trim();
    }
    return "Others";
  }

  return "Others";
}

export function getReviewRowClassName(review: EvaluationRecordReview): string {
  const submittedDate = new Date(review.created_at);
  const now = new Date();
  const hoursDiff =
    (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
  const isNew = hoursDiff <= 24;
  const isRecent = hoursDiff > 24 && hoursDiff <= 168;
  const isCompleted = review.status === "completed";
  const isPending = review.status === "pending";

  if (isCompleted) {
    return "bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500 transition-colors";
  }
  if (isNew) {
    return "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500 transition-colors";
  }
  if (isRecent) {
    return "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500 transition-colors";
  }
  if (isPending) {
    return "bg-orange-50 hover:bg-orange-100 border-l-4 border-l-orange-500 transition-colors";
  }
  return "hover:bg-gray-100 transition-colors";
}

export function EvalRecordRowActions({
  review,
  onView,
  onDelete,
  deleting,
}: {
  review: EvaluationRecordReview;
  onView: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  const canDelete = isReviewDeletable(review);

  return (
    <div className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:justify-end lg:flex-wrap lg:justify-start lg:gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onView}
        aria-label="View evaluation"
        className="h-8 w-8 shrink-0 cursor-pointer border-blue-700 bg-blue-600 text-white hover:bg-blue-700 hover:text-white lg:h-8 lg:w-auto lg:px-2 lg:transition-all lg:duration-200 lg:hover:-translate-y-0.5 lg:hover:shadow-md lg:active:translate-y-0"
      >
        <Eye className="h-4 w-4 lg:hidden" />
        <span className="hidden lg:inline">☰ View</span>
      </Button>
      {canDelete ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Delete evaluation"
          title="Delete this evaluation record"
          className="h-8 w-8 shrink-0 cursor-pointer border-red-200 bg-red-100 text-red-700 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 lg:h-8 lg:w-auto lg:px-2 lg:transition-all lg:duration-200 lg:hover:-translate-y-0.5 lg:hover:shadow-md lg:active:translate-y-0"
        >
          {deleting ? (
            <span className="text-xs lg:hidden">…</span>
          ) : (
            <Trash2 className="h-4 w-4 lg:hidden" />
          )}
          <span className="hidden lg:inline">
            {deleting ? "Deleting…" : "❌ Delete"}
          </span>
        </Button>
      ) : null}
    </div>
  );
}
