"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SmctLoadingOverlay from "@/components/SmctLoadingOverlay";
import { cn } from "@/lib/utils";

type ManagementPageShellProps = {
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  /** Optional override; defaults from path (`HR` / `Admin`). */
  badge?: string;
  /** Search / filters / primary actions shown under the hero. */
  toolbar?: ReactNode;
  busy?: boolean;
  busyLabel?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function ManagementPageShell({
  title,
  description,
  icon: Icon,
  badge,
  toolbar,
  busy = false,
  busyLabel = "Loading…",
  children,
  className,
  contentClassName,
}: ManagementPageShellProps) {
  const pathname = usePathname();
  const roleBadge =
    badge ?? (pathname?.includes("/hr-dashboard") ? "HR" : "Admin");

  return (
    <div className={cn("relative space-y-2 pb-4 sm:space-y-3 sm:pb-5", className)}>
      <Card className="overflow-hidden border-slate-200/90 shadow-sm">
        <div
          className="relative overflow-hidden px-3 py-3.5 text-white sm:px-5 sm:py-4"
          style={{
            backgroundImage: "url(/smct.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/92 via-blue-900/90 to-blue-800/93" />
          <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/95 shadow ring-1 ring-white/20 backdrop-blur-sm sm:h-10 sm:w-10 sm:rounded-lg">
              <Icon
                className="h-4 w-4 text-white sm:h-[1.125rem] sm:w-[1.125rem]"
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <CardTitle className="border-0 text-base font-semibold tracking-tight text-white shadow-none sm:text-lg">
                  {title}
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="border-white/20 bg-white/15 py-0 text-[0.6rem] font-medium leading-tight text-white backdrop-blur-sm hover:bg-white/20 sm:text-[0.65rem]"
                >
                  {roleBadge}
                </Badge>
              </div>
              <CardDescription className="max-w-xl text-xs leading-snug text-blue-50/95 sm:text-sm">
                {description}
              </CardDescription>
            </div>
          </div>
        </div>

        <CardContent
          className={cn(
            "relative space-y-3 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white pt-3 sm:space-y-3.5 sm:pt-4",
            contentClassName
          )}
        >
          {busy ? <SmctLoadingOverlay label={busyLabel} /> : null}
          <div
            className={cn(
              "space-y-3 sm:space-y-3.5",
              busy && "pointer-events-none opacity-40"
            )}
          >
            {toolbar ? (
              <div className="rounded-lg border border-slate-200/80 bg-white/90 p-2.5 shadow-sm backdrop-blur-sm sm:rounded-xl sm:p-3">
                {toolbar}
              </div>
            ) : null}
            {children}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Shared table chrome matching Activity Logs / Violation Summary. */
export const MANAGEMENT_TABLE_CLASS =
  "[&_th]:h-auto [&_th]:min-h-8 [&_th]:px-2.5 [&_th]:py-2 [&_th]:align-middle [&_th]:text-[0.6rem] [&_th]:uppercase [&_th]:tracking-wide sm:[&_th]:min-h-9 sm:[&_th]:px-3 sm:[&_th]:py-2.5 sm:[&_th]:text-[0.65rem] [&_td]:min-w-0 [&_td]:px-2.5 [&_td]:py-2 [&_td]:align-middle [&_td]:text-xs [&_td]:leading-snug sm:[&_td]:px-3 sm:[&_td]:py-2.5 sm:[&_td]:text-sm sm:[&_td]:leading-snug";

export const MANAGEMENT_TABLE_WRAP_CLASS =
  "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm sm:rounded-xl";

export const MANAGEMENT_TABLE_HEADER_CLASS =
  "sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/95 shadow-[inset_0_-1px_0_0_rgb(226_232_240)] backdrop-blur-sm";
