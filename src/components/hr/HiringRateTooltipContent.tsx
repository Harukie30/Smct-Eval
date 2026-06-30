"use client";

import type { HiringRateStats } from "@/lib/employeeHiringRate";
import { StatPercentRing } from "@/components/hr/StatPercentRing";

type HiringRateTooltipContentProps = {
  stats: HiringRateStats | null;
};

export function HiringRateTooltipContent({
  stats,
}: HiringRateTooltipContentProps) {
  if (!stats) {
    return (
      <p className="text-xs text-gray-600">Hiring rate data unavailable.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-900">Hiring rate</p>
        <p className="text-[0.65rem] text-gray-500">
          Share of employees hired in each period
        </p>
      </div>
      <div className="flex items-start gap-5">
        <StatPercentRing
          percent={stats.monthPercent}
          label="Past month"
          detail={`${stats.monthHired} of ${stats.total} employees`}
          color="#2563eb"
        />
        <StatPercentRing
          percent={stats.yearPercent}
          label="Past year"
          detail={`${stats.yearHired} of ${stats.total} employees`}
          color="#059669"
        />
      </div>
    </div>
  );
}
