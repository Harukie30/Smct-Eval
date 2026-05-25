"use client";

import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";

type SanctionTableHeadLabelProps = {
  className?: string;
  theme?: "slate" | "amber";
};

/** Column header label for Sanction (icon + text only). */
export function SanctionTableHeadLabel({
  className,
  theme = "slate",
}: SanctionTableHeadLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        theme === "amber" ? "text-amber-900" : "text-slate-600",
        className
      )}
    >
      <Scale className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      Sanction
    </span>
  );
}
