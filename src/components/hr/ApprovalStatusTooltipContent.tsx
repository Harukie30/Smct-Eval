"use client";

import type { ApprovalStatusStats } from "@/lib/evaluationApprovalStats";
import { StatPercentRing } from "@/components/hr/StatPercentRing";

type ApprovalStatusTooltipContentProps = {
  stats: ApprovalStatusStats | null;
};

export function ApprovalStatusTooltipContent({
  stats,
}: ApprovalStatusTooltipContentProps) {
  if (!stats || stats.total <= 0) {
    return (
      <p className="text-xs text-gray-600">Approval breakdown unavailable.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-900">Approval pipeline</p>
        <p className="text-[0.65rem] text-gray-500">
          Share of all evaluations by approval status
        </p>
      </div>
      <div className="flex items-start gap-5">
        <StatPercentRing
          percent={stats.pendingPercent}
          label="Pending"
          detail={`${stats.pending} of ${stats.total} evaluations`}
          color="#ea580c"
        />
        <StatPercentRing
          percent={stats.approvedPercent}
          label="Approved"
          detail={`${stats.approved} of ${stats.total} evaluations`}
          color="#059669"
        />
      </div>
    </div>
  );
}
