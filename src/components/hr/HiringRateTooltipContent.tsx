"use client";

import type { HiringRateStats } from "@/lib/employeeHiringRate";
import { StatPercentRing } from "@/components/hr/StatPercentRing";

type HiringRateTooltipContentProps = {
  stats: HiringRateStats | null;
};

function hiredDetail(hired: number, total: number): string {
  const hiredLabel = hired === 1 ? "1 hired" : `${hired} hired`;
  return `${hiredLabel} out of ${total} total`;
}

export function HiringRateTooltipContent({
  stats,
}: HiringRateTooltipContentProps) {
  if (!stats) {
    return (
      <p className="text-xs text-gray-600">Hiring rate data unavailable.</p>
    );
  }

  return (
    <div className="w-[17.5rem] space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900">Hiring rate</p>
        <p className="text-[0.7rem] leading-snug text-gray-600">
          How many of your{" "}
          <span className="font-medium text-gray-800">
            {stats.total} registered employees
          </span>{" "}
          were hired recently. The % is that share of the total workforce.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
        <StatPercentRing
          percent={stats.monthPercent}
          label="Last 30 days"
          detail={hiredDetail(stats.monthHired, stats.total)}
          color="#2563eb"
        />
        <StatPercentRing
          percent={stats.yearPercent}
          label="Last 12 months"
          detail={hiredDetail(stats.yearHired, stats.total)}
          color="#059669"
        />
      </div>

      <p className="border-t border-gray-100 pt-2 text-[0.65rem] leading-snug text-gray-500">
        Example: {stats.monthPercent}% means {stats.monthHired} of {stats.total}{" "}
        employees joined in the last 30 days.
      </p>
    </div>
  );
}
