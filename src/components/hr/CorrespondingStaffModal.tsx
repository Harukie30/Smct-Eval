"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Info, Loader2, Users2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import EvaluationsPagination from "@/components/paginationComponent";
import { apiService } from "@/lib/apiService";
import { parseApiTimestampMs } from "@/lib/parseApiTimestamp";
import { toastMessages } from "@/lib/toastMessages";
import { cn } from "@/lib/utils";

export type CorrespondingStaffRow = {
  id: string;
  name: string;
  email: string;
  position: string;
  branch: string;
  role: string;
  lastQuarterEvaluated: string | null;
  lastQuarterEvaluatedAt: string | null;
  /** Whether this employee is a direct subordinate of the evaluator. */
  isDirect?: boolean | null;
};

export type CorrespondingStaffEvaluator = {
  id: string;
  name: string;
};

const STAFF_MODAL_PER_PAGE = 10;
const STAFF_MODAL_PAGE_LOAD_MS = 2500;
const STAFF_QUARTER_HIGHLIGHT_STORAGE_KEY = "smct-hr-staff-quarter-highlight-until";
const STAFF_QUARTER_SNAPSHOT_STORAGE_KEY = "smct-hr-staff-quarter-snapshot";
const STAFF_QUARTER_HIGHLIGHT_DURATION_MS = 24 * 60 * 60 * 1000;

type QuarterHighlightExpiryStore = Record<string, number>;
type QuarterSnapshotStore = Record<string, string>;

function readQuarterHighlightStore(): QuarterHighlightExpiryStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STAFF_QUARTER_HIGHLIGHT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as QuarterHighlightExpiryStore;
  } catch {
    return {};
  }
}

function pruneQuarterHighlightStore(
  store: QuarterHighlightExpiryStore
): QuarterHighlightExpiryStore {
  const now = Date.now();
  const next: QuarterHighlightExpiryStore = {};
  for (const [id, exp] of Object.entries(store)) {
    if (typeof exp === "number" && exp > now) next[id] = exp;
  }
  return next;
}

function writePrunedQuarterHighlightStore(store: QuarterHighlightExpiryStore) {
  if (typeof window === "undefined") return;
  const pruned = pruneQuarterHighlightStore(store);
  try {
    if (Object.keys(pruned).length === 0) {
      window.localStorage.removeItem(STAFF_QUARTER_HIGHLIGHT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        STAFF_QUARTER_HIGHLIGHT_STORAGE_KEY,
        JSON.stringify(pruned)
      );
    }
  } catch {
    /* ignore quota */
  }
}

function readQuarterSnapshotStore(): QuarterSnapshotStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STAFF_QUARTER_SNAPSHOT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as QuarterSnapshotStore;
  } catch {
    return {};
  }
}

function writeQuarterSnapshotStore(store: QuarterSnapshotStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STAFF_QUARTER_SNAPSHOT_STORAGE_KEY,
      JSON.stringify(store)
    );
  } catch {
    /* ignore quota */
  }
}

function isEvaluationDateToday(iso: string | null): boolean {
  const ms = parseApiTimestampMs(iso);
  if (ms == null) return false;
  const d = new Date(ms);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function extendQuarterHighlightsForStaffIds(staffIds: string[]) {
  if (typeof window === "undefined" || staffIds.length === 0) return;
  const merged = { ...readQuarterHighlightStore() };
  const pruned = pruneQuarterHighlightStore(merged);
  const until = Date.now() + STAFF_QUARTER_HIGHLIGHT_DURATION_MS;
  for (const rawId of staffIds) {
    const id = String(rawId);
    const prev = pruned[id];
    pruned[id] = Math.max(typeof prev === "number" ? prev : 0, until);
  }
  writePrunedQuarterHighlightStore(pruned);
}

function getStaffRoleBadgeClass(role: string): string {
  const normalized = role.trim().toLowerCase();
  if (normalized === "employee") {
    return "border-blue-200 bg-blue-100 text-blue-800";
  }
  if (
    normalized === "evaluator" ||
    normalized === "evaluation" ||
    normalized.includes("evaluator")
  ) {
    return "border-green-200 bg-green-100 text-green-800";
  }
  if (
    normalized === "hr" ||
    normalized === "human resources" ||
    normalized === "human resource"
  ) {
    return "border-green-800 bg-green-800 text-green-50";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function formatEvaluationYearOnly(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(d);
  } catch {
    const y = d.getFullYear();
    return Number.isNaN(y) ? null : String(y);
  }
}

function staffQuarterHighlightSnapshot(row: CorrespondingStaffRow): string {
  return `${row.lastQuarterEvaluated ?? ""}\u001f${row.lastQuarterEvaluatedAt ?? ""}`;
}

export interface CorrespondingStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluator: CorrespondingStaffEvaluator | null;
  staffRows: CorrespondingStaffRow[];
  loadingStaff: boolean;
  onAddEmployee: () => void;
  onStaffDirectStatusChange?: (employeeId: string, isDirect: boolean) => void;
}

export default function CorrespondingStaffModal({
  open,
  onOpenChange,
  evaluator,
  staffRows,
  loadingStaff,
  onAddEmployee,
  onStaffDirectStatusChange,
}: CorrespondingStaffModalProps) {
  const [staffSearch, setStaffSearch] = useState("");
  const [staffCurrentPage, setStaffCurrentPage] = useState(1);
  const [staffPageLoading, setStaffPageLoading] = useState(false);
  const [updatingDirectEmployeeId, setUpdatingDirectEmployeeId] = useState<
    string | null
  >(null);
  const staffPageMinLoadTimeoutRef = useRef<number | null>(null);
  const lastStaffLoadEvaluatorIdRef = useRef<string | null>(null);
  const prevStaffSearchRef = useRef<string | null>(null);
  const [quarterHighlightStorageTick, setQuarterHighlightStorageTick] = useState(0);

  const clearStaffPageLoadTimer = useCallback(() => {
    if (staffPageMinLoadTimeoutRef.current !== null) {
      window.clearTimeout(staffPageMinLoadTimeoutRef.current);
      staffPageMinLoadTimeoutRef.current = null;
    }
  }, []);

  const stopStaffPageSkeleton = useCallback(() => {
    clearStaffPageLoadTimer();
    setStaffPageLoading(false);
  }, [clearStaffPageLoadTimer]);

  const beginStaffPageSkeletonMinDelay = useCallback(() => {
    clearStaffPageLoadTimer();
    setStaffPageLoading(true);
    staffPageMinLoadTimeoutRef.current = window.setTimeout(() => {
      setStaffPageLoading(false);
      staffPageMinLoadTimeoutRef.current = null;
    }, STAFF_MODAL_PAGE_LOAD_MS);
  }, [clearStaffPageLoadTimer]);

  const handleStaffModalPageChange = useCallback(
    (page: number) => {
      setStaffCurrentPage(page);
      beginStaffPageSkeletonMinDelay();
    },
    [beginStaffPageSkeletonMinDelay]
  );

  const handleDirectStatusChange = useCallback(
    async (employeeId: string, isDirect: boolean) => {
      if (!evaluator?.id) return;
      if (updatingDirectEmployeeId === employeeId) return;

      setUpdatingDirectEmployeeId(employeeId);
      try {
        await apiService.setEvaluatorEmployeeDirectStatus(
          evaluator.id,
          [employeeId],
          isDirect
        );
        onStaffDirectStatusChange?.(employeeId, isDirect);
        toastMessages.generic.success(
          isDirect ? "Marked as direct" : "Marked as indirect",
          "Subordinate status updated."
        );
      } catch (error) {
        console.error("Failed to update direct status:", error);
        toastMessages.generic.error(
          "Unable to update direct status",
          "Please try again."
        );
      } finally {
        setUpdatingDirectEmployeeId(null);
      }
    },
    [evaluator?.id, onStaffDirectStatusChange, updatingDirectEmployeeId]
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        stopStaffPageSkeleton();
        prevStaffSearchRef.current = null;
        lastStaffLoadEvaluatorIdRef.current = null;
        setStaffSearch("");
        setStaffCurrentPage(1);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, stopStaffPageSkeleton]
  );

  useEffect(() => {
    if (!open) return;
    if (evaluator?.id && lastStaffLoadEvaluatorIdRef.current !== evaluator.id) {
      lastStaffLoadEvaluatorIdRef.current = evaluator.id;
      setStaffSearch("");
      setStaffCurrentPage(1);
    }
  }, [open, evaluator?.id]);

  useEffect(() => {
    if (!open || loadingStaff || staffRows.length === 0) return;

    const snapshotStore = readQuarterSnapshotStore();
    const toHighlight: string[] = [];

    for (const staff of staffRows) {
      const id = String(staff.id);
      const curr = staffQuarterHighlightSnapshot(staff);
      const old = snapshotStore[id];

      if (old !== undefined && old !== curr) {
        toHighlight.push(id);
      } else if (isEvaluationDateToday(staff.lastQuarterEvaluatedAt)) {
        toHighlight.push(id);
      }

      snapshotStore[id] = curr;
    }

    writeQuarterSnapshotStore(snapshotStore);

    if (toHighlight.length === 0) return;

    extendQuarterHighlightsForStaffIds(toHighlight);
    setQuarterHighlightStorageTick((t) => t + 1);
  }, [staffRows, loadingStaff, open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setQuarterHighlightStorageTick((t) => t + 1);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  const filteredStaffRows = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffRows;
    return staffRows.filter((row) => {
      const quarter = (row.lastQuarterEvaluated ?? "").toLowerCase();
      const atRaw = (row.lastQuarterEvaluatedAt ?? "").toLowerCase();
      const yearStr = (formatEvaluationYearOnly(row.lastQuarterEvaluatedAt) ?? "").toLowerCase();
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.position.toLowerCase().includes(q) ||
        row.branch.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q) ||
        quarter.includes(q) ||
        atRaw.includes(q) ||
        yearStr.includes(q)
      );
    });
  }, [staffRows, staffSearch]);

  const staffTotalPages = Math.max(
    1,
    Math.ceil(filteredStaffRows.length / STAFF_MODAL_PER_PAGE)
  );

  const paginatedStaffRows = useMemo(() => {
    const start = (staffCurrentPage - 1) * STAFF_MODAL_PER_PAGE;
    return filteredStaffRows.slice(start, start + STAFF_MODAL_PER_PAGE);
  }, [filteredStaffRows, staffCurrentPage]);

  const staffQuarterHighlightState = useMemo(() => {
    const empty = {
      activeIds: new Set<string>(),
      visibleCount: 0,
    };
    if (typeof window === "undefined" || !open || staffRows.length === 0) {
      return empty;
    }
    const store = pruneQuarterHighlightStore(readQuarterHighlightStore());
    const now = Date.now();
    const activeIds = new Set<string>();
    for (const s of staffRows) {
      const id = String(s.id);
      const exp = store[id];
      if (typeof exp === "number" && exp > now) activeIds.add(id);
      if (isEvaluationDateToday(s.lastQuarterEvaluatedAt)) activeIds.add(id);
    }
    let visibleCount = 0;
    for (const s of filteredStaffRows) {
      if (activeIds.has(String(s.id))) visibleCount += 1;
    }
    return { activeIds, visibleCount };
  }, [staffRows, filteredStaffRows, quarterHighlightStorageTick, open]);

  useEffect(() => {
    const prev = prevStaffSearchRef.current;
    prevStaffSearchRef.current = staffSearch;

    setStaffCurrentPage(1);

    const searchEmptied =
      open &&
      !loadingStaff &&
      prev !== null &&
      prev.trim() !== "" &&
      staffSearch.trim() === "";

    if (searchEmptied) {
      beginStaffPageSkeletonMinDelay();
    }
  }, [staffSearch, open, loadingStaff, beginStaffPageSkeletonMinDelay]);

  useEffect(() => {
    if (staffCurrentPage > staffTotalPages) {
      setStaffCurrentPage(staffTotalPages);
    }
  }, [staffCurrentPage, staffTotalPages]);

  useEffect(() => {
    return () => clearStaffPageLoadTimer();
  }, [clearStaffPageLoadTimer]);

  return (
    <Dialog open={open} onOpenChangeAction={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-full max-w-[min(100vw-2rem,64rem)] flex-col overflow-hidden p-0">
        <DialogHeader className="relative shrink-0 overflow-hidden border-b border-blue-400/60 bg-blue-600 px-4 py-4 text-white sm:px-6 sm:py-5">
          <div
            className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.12]"
            style={{ backgroundImage: "url('/smct.png')", backgroundSize: "100%" }}
            aria-hidden
          />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/20 ring-1 ring-white/30">
                  <Users2 className="h-4.5 w-4.5" />
                </div>
                Corresponding Staff
              </DialogTitle>
              <DialogDescription className="mt-1 text-blue-100">
                {evaluator
                  ? `Staff list linked to evaluator: ${evaluator.name}`
                  : "Staff list for selected evaluator."}
              </DialogDescription>
            </div>
            <div className="shrink-0 rounded-full border border-white/35 bg-white/20 px-3 py-1 text-xs font-medium text-white">
              Total: {loadingStaff ? "..." : filteredStaffRows.length}
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-50/80 to-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full items-center gap-2 sm:max-w-md">
              <Input
                placeholder="Search staff by name, email, position, branch, role, or last quarter evaluated..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                disabled={loadingStaff}
                className="w-full flex-1 border-slate-200 bg-white shadow-sm"
              />
              {staffSearch.trim() !== "" && (
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer shrink-0 border-slate-200 bg-red-600 text-white hover:bg-red-700 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                  onClick={() => setStaffSearch("")}
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {loadingStaff
                ? "Loading staff..."
                : staffPageLoading
                  ? "Switching page…"
                  : `Showing ${paginatedStaffRows.length} on this page`}
            </div>
          </div>

          <div
            className="mb-3 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200/90 bg-slate-50/95 px-3 py-2.5 text-xs text-slate-600 shadow-sm"
            role="note"
          >
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <Info className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
              Role
            </span>
            <span className="inline-flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-100 px-1.5 py-0 text-[10px] font-medium capitalize text-blue-800"
              >
                Employee
              </Badge>
              <Badge
                variant="outline"
                className="border-green-200 bg-green-100 px-1.5 py-0 text-[10px] font-medium capitalize text-green-800"
              >
                Evaluator
              </Badge>
              <Badge
                variant="outline"
                className="border-green-800 bg-green-800 px-1.5 py-0 text-[10px] font-medium capitalize text-green-50"
              >
                HR
              </Badge>
            </span>
            <span className="hidden h-3 w-px shrink-0 bg-slate-300 sm:inline-block" aria-hidden />
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              Last quarter column
            </span>
            <span className="hidden h-3 w-px shrink-0 bg-slate-300 sm:inline-block" aria-hidden />
            <span className="inline-flex min-w-0 items-center gap-1.5 leading-snug">
              <span
                className="inline-block h-3 w-5 shrink-0 rounded-sm bg-amber-100 ring-1 ring-amber-200/90"
                aria-hidden
              />
              <span>Amber marks evaluations updated today or a changed quarter after refresh.</span>
            </span>
            {staffQuarterHighlightState.visibleCount > 0 ? (
              <>
                <span className="hidden h-3 w-px shrink-0 bg-slate-300 sm:inline-block" aria-hidden />
                <span
                  className="inline-flex items-center gap-1.5 font-medium text-amber-900"
                  aria-live="polite"
                >
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  </span>
                  Showing{" "}
                  {staffQuarterHighlightState.visibleCount === 1
                    ? "1 highlighted row"
                    : `${staffQuarterHighlightState.visibleCount} highlighted rows`}{" "}
                  in this list
                </span>
              </>
            ) : null}
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-950/[0.03]">
            <Table
              wrapperClassName="min-h-0 flex-1 overflow-auto overscroll-contain"
              className="min-w-[52rem] [&_th]:h-auto [&_th]:min-h-10 [&_th]:px-3 [&_th]:py-2.5 sm:[&_th]:px-4 [&_th]:align-middle [&_td]:min-w-0 [&_td]:px-3 [&_td]:py-2.5 sm:[&_td]:px-4 [&_td]:align-middle [&_td]:text-sm [&_td]:leading-snug"
            >
              <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)] [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-600">
                <TableRow>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Email
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Position
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Branch
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Role
                  </TableHead>
                  <TableHead className="text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-600 whitespace-normal sm:text-xs">
                    Last Quarter Evaluated
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStaff || staffPageLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={`staff-sk-${idx}`}>
                      <TableCell>
                        <Skeleton className="h-5 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-44" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <div className="mx-auto flex w-full max-w-[11rem] flex-col items-center gap-1 py-0.5">
                          <Skeleton className="h-3.5 w-16" />
                          <Skeleton className="h-3 w-10" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="mx-auto h-8 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredStaffRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center text-sm text-slate-500">
                      No corresponding staff found for this evaluator.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStaffRows.map((staff) => (
                    <TableRow
                      key={staff.id}
                      className="odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/60"
                    >
                      <TableCell className="max-w-[10rem] min-w-0 break-words font-medium text-slate-900 sm:max-w-[14rem]">
                        {staff.name}
                      </TableCell>
                      <TableCell className="max-w-[180px] min-w-0 break-words sm:max-w-[220px] lg:max-w-[260px]">
                        {staff.email}
                      </TableCell>
                      <TableCell className="max-w-[9rem] min-w-0 break-words sm:max-w-[11rem]">
                        {staff.position}
                      </TableCell>
                      <TableCell className="max-w-[8rem] min-w-0 break-words sm:max-w-[10rem]">
                        {staff.branch}
                      </TableCell>
                      <TableCell className="max-w-[7rem] min-w-0 break-words sm:max-w-[9rem]">
                        <Badge
                          variant="outline"
                          className={cn(
                            "max-w-full truncate font-medium capitalize",
                            getStaffRoleBadgeClass(staff.role)
                          )}
                        >
                          {staff.role}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center align-middle transition-colors duration-500",
                          staffQuarterHighlightState.activeIds.has(String(staff.id))
                            ? "bg-amber-100/95 ring-1 ring-inset ring-amber-200/90"
                            : "text-slate-900"
                        )}
                      >
                        {(() => {
                          const highlighted = staffQuarterHighlightState.activeIds.has(
                            String(staff.id)
                          );
                          const label = staff.lastQuarterEvaluated?.trim();
                          const yearStr = formatEvaluationYearOnly(staff.lastQuarterEvaluatedAt);
                          if (!label && !yearStr) {
                            return (
                              <span
                                className={cn(
                                  "text-sm font-normal",
                                  highlighted ? "text-amber-950" : "text-slate-500"
                                )}
                              >
                                —
                              </span>
                            );
                          }
                          return (
                            <div className="mx-auto flex w-full min-w-0 max-w-[9.5rem] flex-col items-center gap-0.5 py-0.5 leading-tight sm:max-w-[11rem]">
                              {label ? (
                                <span
                                  className={cn(
                                    "text-sm font-semibold",
                                    highlighted ? "text-amber-950" : "text-slate-900"
                                  )}
                                >
                                  {label}
                                </span>
                              ) : null}
                              {yearStr ? (
                                <span
                                  className={cn(
                                    "text-[11px] tabular-nums sm:text-xs",
                                    highlighted ? "text-amber-900/85" : "text-slate-500"
                                  )}
                                  title={staff.lastQuarterEvaluatedAt ?? undefined}
                                >
                                  {yearStr}
                                </span>
                              ) : null}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        {(() => {
                          const isUpdating = updatingDirectEmployeeId === staff.id;
                          const directLabel =
                            staff.isDirect === true
                              ? "Yes"
                              : staff.isDirect === false
                              ? "No"
                              : "—";

                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isUpdating || !evaluator?.id}
                                  className="cursor-pointer gap-1 border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : null}
                                  <span>Direct: {directLabel}</span>
                                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[8rem]">
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  disabled={isUpdating}
                                  onClick={() => {
                                    void handleDirectStatusChange(staff.id, true);
                                  }}
                                >
                                  Yes
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  disabled={isUpdating}
                                  onClick={() => {
                                    void handleDirectStatusChange(staff.id, false);
                                  }}
                                >
                                  No
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loadingStaff && filteredStaffRows.length > 0 && (
            <div className="mt-3 shrink-0">
              <EvaluationsPagination
                currentPage={staffCurrentPage}
                totalPages={staffTotalPages}
                total={filteredStaffRows.length}
                perPage={STAFF_MODAL_PER_PAGE}
                onPageChange={handleStaffModalPageChange}
              />
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-white px-4 py-3 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer bg-red-600 hover:bg-red-700 text-white hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            onClick={() => handleOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            onClick={onAddEmployee}
          >
            Add Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
