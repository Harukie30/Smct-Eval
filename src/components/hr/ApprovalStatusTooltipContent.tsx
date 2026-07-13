"use client";

import type { ApprovalStatusStats } from "@/lib/evaluationApprovalStats";
import { StatPercentRing } from "@/components/hr/StatPercentRing";

type ApprovalStatusTooltipVariant = "pending" | "approved";

type ApprovalStatusTooltipContentProps = {
  stats: ApprovalStatusStats | null;
  /** Which status card this tooltip belongs to. */
  variant: ApprovalStatusTooltipVariant;
};

export function ApprovalStatusTooltipContent({
  stats,
  variant,
}: ApprovalStatusTooltipContentProps) {
  if (!stats || stats.total <= 0) {
    return (
      <p className="text-xs text-gray-600">Approval breakdown unavailable.</p>
    );
  }

  if (variant === "pending") {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Pending approvals</p>
          <p className="text-[0.65rem] text-gray-500">
            Share of evaluations still waiting for review
          </p>
        </div>
        <div className="flex justify-center">
          <StatPercentRing
            percent={stats.pendingPercent}
            label="Pending"
            detail={`${stats.pending} of ${stats.total} evaluations`}
            color="#ea580c"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-900">Approved reviews</p>
        <p className="text-[0.65rem] text-gray-500">
          Share of evaluations that are fully completed
        </p>
      </div>
      <div className="flex justify-center">
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
