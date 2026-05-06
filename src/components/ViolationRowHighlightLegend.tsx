import { cn } from "@/lib/utils";

type ViolationRowHighlightLegendProps = {
  className?: string;
};

export default function ViolationRowHighlightLegend({
  className,
}: ViolationRowHighlightLegendProps) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600",
        className
      )}
      role="note"
    >
      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm">
        <span
          className="h-3 w-3 shrink-0 rounded-sm bg-yellow-200 ring-1 ring-yellow-400/70"
          aria-hidden
        />
        <span className="text-slate-700">
          Yellow — new / updated (under 2 min)
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm">
        <span
          className="h-3 w-3 shrink-0 rounded-sm bg-blue-200 ring-1 ring-blue-400/70"
          aria-hidden
        />
        <span className="text-slate-700">
          Blue — recent (2 min to 1 hr)
        </span>
      </span>
    </p>
  );
}
