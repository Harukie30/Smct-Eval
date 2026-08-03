"use client";

import type { LateSubmissionStats } from "@/lib/lateSubmissionStats";
import { StatPercentRing } from "@/components/hr/StatPercentRing";
import { QUARTER_EVALUATION_SCHEDULE_HINT } from "@/lib/quarterUtils";

type LateSubmissionTooltipContentProps = {
  stats: LateSubmissionStats | null;
};

function lateDetail(late: number, total: number): string {
  if (total <= 0) return "No evaluations to compare yet";
  const lateLabel = late === 1 ? "1 late" : `${late} late`;
  return `${lateLabel} out of ${total} evaluations`;
}

export function LateSubmissionTooltipContent({
  stats,
}: LateSubmissionTooltipContentProps) {
  if (!stats) {
    return (
      <p className="text-xs text-gray-600">Late submission data unavailable.</p>
    );
  }

  const newLabel =
    stats.newCount === 1
      ? "1 submission in the last 24 hours"
      : `${stats.newCount} submissions in the last 24 hours`;

  return (
    <div className="w-[17.5rem] space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900">New & late submissions</p>
        <p className="text-[0.7rem] leading-snug text-gray-600">
          <span className="font-medium text-yellow-700">{newLabel}</span>
          {" · "}
          Late means a quarterly review was submitted after its due month.
        </p>
      </div>

      <div className="flex justify-center border-t border-gray-100 pt-3">
        <StatPercentRing
          percent={stats.latePercent}
          label="Late submissions"
          detail={lateDetail(stats.lateCount, stats.total)}
          color="#dc2626"
        />
      </div>

      <p className="border-t border-gray-100 pt-2 text-[0.65rem] leading-snug text-gray-500">
        {QUARTER_EVALUATION_SCHEDULE_HINT}
      </p>
    </div>
  );
}
