"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Inbox,
  Loader2,
  Plus,
  Search,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiService } from "@/lib/apiService";
import { toastMessages } from "@/lib/toastMessages";

export type AssignEvaluatorTarget = {
  id: string;
  name: string;
  branchId?: string;
  departmentId?: string;
};

type CandidateEmployee = {
  id: string;
  name: string;
  email: string;
  position: string;
  branch: string;
  role: string;
};

interface AddEmployeeToEvaluatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluator: AssignEvaluatorTarget | null;
  onAssigned?: () => void;
}

const ASSIGN_SUCCESS_DIALOG_AUTO_CLOSE_MS = 2800;
const TABLE_ROW_HIGHLIGHT_MS = 20000;

function pickRoleName(rawRoles: unknown): string {
  if (!Array.isArray(rawRoles) || rawRoles.length === 0) return "N/A";
  const nonAdmin = (rawRoles as Array<{ name?: string }>).find(
    (r) => String(r?.name ?? "").toLowerCase() !== "admin"
  );
  return String(nonAdmin?.name ?? (rawRoles[0] as { name?: string })?.name ?? "N/A");
}

/** Include employees and evaluators in assignable directory; exclude other roles (e.g. admin-only). */
function isAssignableStaffRole(rawRoles: unknown): boolean {
  const role = pickRoleName(rawRoles).toLowerCase();
  return (
    role === "employee" ||
    role === "evaluator" ||
    role === "evaluation" ||
    role.includes("evaluator")
  );
}

function normalizeCandidate(raw: Record<string, unknown>): CandidateEmployee {
  const firstName = String(raw.fname ?? "").trim();
  const lastName = String(raw.lname ?? "").trim();
  const fullName =
    String(raw.full_name ?? "").trim() || `${firstName} ${lastName}`.trim() || "N/A";

  return {
    // assignEmployees expects user record `id` (not profile `emp_id`).
    id: String(
      raw.id ??
        raw.user_id ??
        raw.employee_id ??
        raw.employeeId ??
        `${fullName}-${raw.email ?? "unknown"}`
    ),
    name: fullName,
    email: String(raw.email ?? "N/A"),
    position: String(
      (raw.positions as { label?: string } | undefined)?.label ?? raw.position ?? "N/A"
    ),
    branch: String(
      (raw.branch as { branch_name?: string } | undefined)?.branch_name ??
        raw.branch_name ??
        (raw.branches as { branch_name?: string } | undefined)?.branch_name ??
        "Unassigned"
    ),
    role: pickRoleName(raw.roles),
  };
}

function extractEmployees(raw: unknown): unknown[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "object") return [];

  const root = raw as Record<string, unknown>;

  const candidates: unknown[] = [
    root.employees,
    (root.employees as Record<string, unknown> | undefined)?.data,
    root.assignedEmployees,
    (root.assignedEmployees as Record<string, unknown> | undefined)?.data,
    root.assigned_employees,
    (root.assigned_employees as Record<string, unknown> | undefined)?.data,
    root.users,
    (root.users as Record<string, unknown> | undefined)?.data,
    root.data,
    (root.data as Record<string, unknown> | undefined)?.employees,
    (root.data as Record<string, unknown> | undefined)?.assignedEmployees,
    (root.data as Record<string, unknown> | undefined)?.assigned_employees,
    (root.data as Record<string, unknown> | undefined)?.users,
    (root.data as Record<string, unknown> | undefined)?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function sortCandidatesByName(a: CandidateEmployee, b: CandidateEmployee) {
  return a.name.localeCompare(b.name);
}

function getRoleBadgeClass(role: string): string {
  const normalized = role.toLowerCase();
  if (normalized === "employee") {
    return "border-blue-200 bg-blue-50/90 text-blue-700";
  }
  if (
    normalized === "evaluator" ||
    normalized === "evaluation" ||
    normalized.includes("evaluator")
  ) {
    return "border-emerald-200 bg-emerald-50/90 text-emerald-700";
  }
  return "border-slate-200 bg-slate-50/90 text-slate-700";
}

function normalizeAssignableStaffList(list: unknown[]): CandidateEmployee[] {
  return list
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        isAssignableStaffRole((item as Record<string, unknown>).roles)
    )
    .map((item) =>
      normalizeCandidate(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : ({} as Record<string, unknown>)
      )
    )
    .sort(sortCandidatesByName);
}

export default function AddEmployeeToEvaluatorModal({
  open,
  onOpenChange,
  evaluator,
  onAssigned,
}: AddEmployeeToEvaluatorModalProps) {
  const evaluatorId = evaluator?.id ?? null;
  const [assignedRows, setAssignedRows] = useState<CandidateEmployee[]>([]);
  const [unassignedRows, setUnassignedRows] = useState<CandidateEmployee[]>([]);
  /** Smaller request — show “Already assigned” as soon as this finishes. */
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  /** Larger pool — bottom table fills when this finishes. */
  const [loadingPool, setLoadingPool] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);
  const [savingUnassign, setSavingUnassign] = useState(false);
  const [tableActionLoading, setTableActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingUnassignIds, setPendingUnassignIds] = useState<Set<string>>(
    new Set()
  );
  const [recentlyAssignedIds, setRecentlyAssignedIds] = useState<Set<string>>(
    new Set()
  );
  const [recentlyUnassignedIds, setRecentlyUnassignedIds] = useState<Set<string>>(
    new Set()
  );
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const assignedHighlightTimeoutRef = useRef<number | null>(null);
  const unassignedHighlightTimeoutRef = useRef<number | null>(null);
  const isAnySaving = savingAssign || savingUnassign;

  const clearHighlightTimer = useCallback((kind: "assigned" | "unassigned") => {
    if (kind === "assigned" && assignedHighlightTimeoutRef.current !== null) {
      window.clearTimeout(assignedHighlightTimeoutRef.current);
      assignedHighlightTimeoutRef.current = null;
    }
    if (kind === "unassigned" && unassignedHighlightTimeoutRef.current !== null) {
      window.clearTimeout(unassignedHighlightTimeoutRef.current);
      unassignedHighlightTimeoutRef.current = null;
    }
  }, []);

  const markRecentlyAssigned = useCallback(
    (ids: string[]) => {
      clearHighlightTimer("assigned");
      setRecentlyAssignedIds(new Set(ids));
      assignedHighlightTimeoutRef.current = window.setTimeout(() => {
        setRecentlyAssignedIds(new Set());
        assignedHighlightTimeoutRef.current = null;
      }, TABLE_ROW_HIGHLIGHT_MS);
    },
    [clearHighlightTimer]
  );

  const markRecentlyUnassigned = useCallback(
    (ids: string[]) => {
      clearHighlightTimer("unassigned");
      setRecentlyUnassignedIds(new Set(ids));
      unassignedHighlightTimeoutRef.current = window.setTimeout(() => {
        setRecentlyUnassignedIds(new Set());
        unassignedHighlightTimeoutRef.current = null;
      }, TABLE_ROW_HIGHLIGHT_MS);
    },
    [clearHighlightTimer]
  );

  const loadEmployees = useCallback(async (options?: { silent?: boolean }) => {
    if (!evaluatorId) return;
    const silent = options?.silent === true;
    if (!silent) {
      setAssignedRows([]);
      setUnassignedRows([]);
      setLoadingAssigned(true);
      setLoadingPool(true);
    }
    try {
      // Sequential: assigned payload is small — user sees the top table sooner; then load the big pool.
      const assignedResponse = await apiService.getAllEvaluatorAssignedEmployees(
        evaluatorId,
        { page: 1, per_page: 500 }
      );
      const assignedList = extractEmployees(assignedResponse);
      const normalizedAssigned = normalizeAssignableStaffList(assignedList);
      setAssignedRows(normalizedAssigned);
      if (!silent) {
        setLoadingAssigned(false);
      }

      const unassignedResponse = await apiService.getAllEvaluatorEmployees(
        evaluatorId,
        { page: 1, per_page: 2000 }
      );
      const unassignedList = extractEmployees(unassignedResponse);
      const assignedIdSet = new Set(normalizedAssigned.map((x) => x.id));
      const evaluatorIdStr = String(evaluatorId);
      const normalizedUnassignedAll = normalizeAssignableStaffList(unassignedList);
      const normalizedUnassigned = normalizedUnassignedAll.filter(
        (x) => x.id !== evaluatorIdStr && !assignedIdSet.has(x.id)
      );
      setUnassignedRows(normalizedUnassigned);
    } catch (error) {
      console.error("Failed to load evaluator employees:", error);
      setAssignedRows([]);
      setUnassignedRows([]);
      toastMessages.generic.error(
        "Failed to load employees",
        "Please try again."
      );
    } finally {
      if (!silent) {
        setLoadingAssigned(false);
        setLoadingPool(false);
      }
    }
  }, [evaluatorId]);

  useEffect(() => {
    if (!open || !evaluatorId) return;
    setSelectedIds(new Set());
    setPendingUnassignIds(new Set());
    setRecentlyAssignedIds(new Set());
    setRecentlyUnassignedIds(new Set());
    clearHighlightTimer("assigned");
    clearHighlightTimer("unassigned");
    setSearch("");
    void loadEmployees();
  }, [open, evaluatorId, loadEmployees, clearHighlightTimer]);

  useEffect(() => {
    return () => {
      clearHighlightTimer("assigned");
      clearHighlightTimer("unassigned");
    };
  }, [clearHighlightTimer]);

  useEffect(() => {
    if (!isSuccessDialogOpen) return;
    const timeoutId = window.setTimeout(() => {
      setIsSuccessDialogOpen(false);
    }, ASSIGN_SUCCESS_DIALOG_AUTO_CLOSE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isSuccessDialogOpen]);

  const deferredSearch = useDeferredValue(search);

  const filteredAssignedRows = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return assignedRows;
    return assignedRows.filter((row) => {
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.position.toLowerCase().includes(q) ||
        row.branch.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
      );
    });
  }, [assignedRows, deferredSearch]);

  const filteredUnassignedRows = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return unassignedRows;
    return unassignedRows.filter((row) => {
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.position.toLowerCase().includes(q) ||
        row.branch.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
      );
    });
  }, [unassignedRows, deferredSearch]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (!evaluatorId || !evaluator) return;
    const unassignedIdSet = new Set(unassignedRows.map((x) => x.id));

    const idsToAssign = Array.from(selectedIds).filter((id) => unassignedIdSet.has(id));

    if (idsToAssign.length === 0) {
      toastMessages.generic.warning(
        "No one selected",
        "Select at least one employee or evaluator to assign."
      );
      return;
    }

    setSavingAssign(true);
    setTableActionLoading(true);
    try {
      // Backend replaces the evaluator’s assignment set with this list — not an “add” merge.
      // Include everyone already assigned plus the new selections so existing rows stay.
      const employeeIds = Array.from(
        new Set([...assignedRows.map((r) => r.id), ...idsToAssign])
      );

      await apiService.assignEmployees(evaluatorId, {
        employeeIds,
        action: "assign",
      });

      const idsToAssignSet = new Set(idsToAssign);
      const movedRows = unassignedRows.filter((row) => idsToAssignSet.has(row.id));
      if (movedRows.length > 0) {
        setAssignedRows((prev) => [...prev, ...movedRows].sort(sortCandidatesByName));
      }
      setUnassignedRows((prev) =>
        prev.filter((row) => !idsToAssignSet.has(row.id)).sort(sortCandidatesByName)
      );
      setSelectedIds(new Set());

      setSuccessMessage(
        `${idsToAssign.length} team member(s) assigned to ${evaluator.name}.`
      );
      onAssigned?.();
      setPendingUnassignIds(new Set());
      markRecentlyAssigned(idsToAssign);
      setIsSuccessDialogOpen(true);
    } catch (error) {
      console.error("Failed assigning employees:", error);
      toastMessages.generic.error(
        "Assignment failed",
        "Please confirm backend supports employee assignment."
      );
    } finally {
      setSavingAssign(false);
      setTableActionLoading(false);
    }
  };

  const handleTogglePendingUnassign = (employeeId: string) => {
    setPendingUnassignIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  const handleSaveUnassign = useCallback(async () => {
    if (!evaluatorId || !evaluator) return;
    const idsToUnassign = Array.from(pendingUnassignIds);
    if (idsToUnassign.length === 0) return;

    setSavingUnassign(true);
    setTableActionLoading(true);
    try {
      // Sync model: backend stores the full assigned set.
      const remainingIds = assignedRows
        .filter((r) => !pendingUnassignIds.has(r.id))
        .map((r) => r.id);

      if (remainingIds.length === 0) {
        await apiService.assignEmployeesBlank(evaluatorId);
      } else {
        await apiService.assignEmployees(evaluatorId, {
          employeeIds: remainingIds,
          action: "assign",
        });
      }

      const removedRows = assignedRows.filter((r) => pendingUnassignIds.has(r.id));
      setAssignedRows((prev) =>
        prev.filter((r) => !pendingUnassignIds.has(r.id)).sort(sortCandidatesByName)
      );
      if (removedRows.length > 0) {
        setUnassignedRows((prev) =>
          [...prev, ...removedRows].sort(sortCandidatesByName)
        );
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of pendingUnassignIds) next.delete(id);
        return next;
      });
      setPendingUnassignIds(new Set());
      markRecentlyUnassigned(idsToUnassign);

      setSuccessMessage(
        `${idsToUnassign.length} team member(s) unassigned from ${evaluator.name}.`
      );
      setIsSuccessDialogOpen(true);
      onAssigned?.();
    } catch (error) {
      console.error("Failed to unassign employees:", error);
      toastMessages.generic.error("Unassign failed", "Please try again.");
      void loadEmployees({ silent: true });
      setPendingUnassignIds(new Set());
    } finally {
      setSavingUnassign(false);
      setTableActionLoading(false);
    }
  }, [
    evaluatorId,
    evaluator,
    pendingUnassignIds,
    assignedRows,
    loadEmployees,
    onAssigned,
    markRecentlyUnassigned,
  ]);

  return (
    <>
      <Dialog open={open} onOpenChangeAction={onOpenChange}>
        <DialogContent
          className="relative max-h-[90vh] max-w-5xl gap-0 overflow-hidden border-slate-200/80 p-0 shadow-2xl sm:rounded-xl"
          style={{
            backgroundImage: "url(/smct.png)",
            backgroundSize: "85%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-blue-100/95 to-indigo-100/95"
            aria-hidden
          />
          <div className="relative z-10 flex max-h-[90vh] min-h-0 flex-col overflow-y-auto">
          <DialogHeader className="space-y-0 border-0 p-0 text-left">
            <div className="relative overflow-hidden border-b border-blue-400/60 bg-blue-600">
              <div
                className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-[0_1px_0_0_rgba(255,255,255,0.35)_inset]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.12]"
                style={{ backgroundImage: "url('/smct.png')", backgroundSize: "110%" }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl"
                aria-hidden
              />
              <div className="relative px-4 py-1.5 sm:px-5 sm:py-2">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:justify-between lg:gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-100">
                      HR · Staff assignment
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2.5">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200/80 bg-white/95 shadow-md shadow-blue-900/5 ring-1 ring-blue-900/[0.04]"
                        aria-hidden
                      >
                        <UserPlus className="h-4 w-4 text-blue-800" strokeWidth={1.7} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <DialogTitle className="bg-gradient-to-r from-blue-950 to-indigo-950 bg-clip-text text-base font-bold tracking-tight text-white sm:text-[1.02rem] sm:leading-snug">
                          Assign employees
                        </DialogTitle>
                        {evaluator ? (
                          <div className="space-y-1">
                            <p className="text-[10px] text-white/95 sm:text-[11px]">
                              Link staff to this evaluator so they appear in coverage and
                              reporting.
                            </p>
                            <div className="flex max-w-xl flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
                              <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-white">
                                Evaluator
                              </span>
                              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-blue-200/70 bg-white/90 px-2.5 py-1.5 shadow-sm shadow-blue-900/5 backdrop-blur-sm">
                                <div
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-[11px] font-semibold text-white shadow-inner"
                                  aria-hidden
                                >
                                  {(evaluator.name.trim().charAt(0) || "?").toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-slate-900">
                                    {evaluator.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    Current team and available staff are listed below
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600">
                            Choose who this evaluator can manage.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col justify-center border-t border-blue-300/40 pt-2 sm:pt-0 lg:min-w-[152px] lg:border-l lg:border-t-0 lg:border-blue-300/40 lg:pl-3 lg:pt-0">
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-100/90 lg:text-right">
                      At a glance
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap lg:grid lg:max-w-[180px]">
                      <div className="rounded-lg border border-blue-200/60 bg-white/90 px-2.5 py-1 text-center shadow-sm shadow-blue-900/5 backdrop-blur-sm sm:flex-1 lg:min-w-0">
                        <p className="text-base font-bold tabular-nums text-blue-950">
                          {loadingAssigned ? "—" : assignedRows.length}
                        </p>
                        <p className="text-[11px] font-medium text-blue-900/55">On team</p>
                      </div>
                      <div className="rounded-lg border border-indigo-200/60 bg-white/90 px-2.5 py-1 text-center shadow-sm shadow-indigo-900/5 backdrop-blur-sm sm:flex-1 lg:min-w-0">
                        <p className="text-base font-bold tabular-nums text-indigo-950">
                          {selectedIds.size}
                        </p>
                        <p className="text-[11px] font-medium text-indigo-900/55">To add</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogDescription className="sr-only">
              {evaluator
                ? `Assign employees under ${evaluator.name}. Use the current assignments and available lists.`
                : "Select employees to assign to the evaluator."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 bg-gradient-to-b from-blue-50/25 to-indigo-50/20 px-6 py-4">
            <div className="relative max-w-lg">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <Input
                placeholder="Search by name, email, position, branch, or role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={isAnySaving}
                className="h-10 border-slate-200 bg-white pl-9 shadow-sm placeholder:text-slate-400 focus-visible:ring-slate-400/30"
              />
            </div>

            <div className="space-y-5">
              <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-950/5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-slate-500" strokeWidth={1.75} aria-hidden />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Current assignments
                      </h3>
                      <p className="text-xs text-slate-500">
                        Uncheck and click Unassign to remove from this team
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 border border-slate-200/80 bg-white font-normal text-slate-700 shadow-sm"
                  >
                    {loadingAssigned || tableActionLoading
                      ? "…"
                      : `${filteredAssignedRows.length} shown`}
                  </Badge>
                </div>
                <div className="max-h-[22vh] min-h-[132px] overflow-auto">
                  {loadingAssigned || tableActionLoading ? (
                    <div className="space-y-2 p-4">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <div
                          key={`assigned-sk-${idx}`}
                          className="grid grid-cols-[56px_1.1fr_1.2fr_1fr_1fr_110px] items-center gap-3 rounded-md border border-slate-100 px-3 py-2"
                        >
                          <Skeleton className="h-4 w-4 rounded-sm" />
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-4 w-44" />
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Table wrapperClassName="">
                      <TableHeader className="sticky top-0 z-10 border-b border-slate-100 bg-white shadow-[0_1px_0_0_rgb(241_245_249)] [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500">
                        <TableRow className="border-slate-100 hover:bg-transparent">
                          <TableHead className="w-14 pl-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                            On
                          </TableHead>
                          <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Name
                          </TableHead>
                          <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Email
                          </TableHead>
                          <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Position
                          </TableHead>
                          <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Branch
                          </TableHead>
                          <TableHead className="pr-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                            Role
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssignedRows.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="py-12 text-center">
                              <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                  <Inbox className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                                </div>
                                <p className="text-sm font-medium text-slate-700">
                                  No one assigned yet
                                </p>
                                <p className="text-xs text-slate-500">
                                  Select people below and click Assign to add them to this
                                  evaluator&apos;s team.
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAssignedRows.map((row) => (
                            <TableRow
                              key={row.id}
                              className={`border-slate-100 transition-colors hover:bg-slate-50/80 ${
                                pendingUnassignIds.has(row.id)
                                  ? "bg-red-50/70"
                                  : recentlyAssignedIds.has(row.id)
                                    ? "bg-yellow-200/70"
                                    : ""
                              }`}
                            >
                              <TableCell className="pl-4">
                                <input
                                  type="checkbox"
                                  checked={!pendingUnassignIds.has(row.id)}
                                  onChange={() => handleTogglePendingUnassign(row.id)}
                                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 accent-slate-800 focus:ring-2 focus:ring-slate-400/40"
                                  disabled={isAnySaving}
                                />
                              </TableCell>
                              <TableCell className="font-medium text-slate-900">
                                {row.name}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-slate-600">
                                {row.email}
                              </TableCell>
                              <TableCell className="text-slate-600">{row.position}</TableCell>
                              <TableCell className="text-slate-600">{row.branch}</TableCell>
                              <TableCell className="pr-4">
                                <Badge
                                  variant="outline"
                                  className={`font-normal capitalize ${getRoleBadgeClass(
                                    row.role
                                  )}`}
                                >
                                  {row.role}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-950/5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <UsersRound className="h-4 w-4 text-slate-500" strokeWidth={1.75} aria-hidden />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Available to assign
                      </h3>
                      <p className="text-xs text-slate-500">
                        Employees and evaluators not on this team — select to add
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 border border-slate-200/80 bg-white font-normal text-slate-700 shadow-sm"
                  >
                    {loadingPool || tableActionLoading
                      ? "…"
                      : `${filteredUnassignedRows.length} shown`}
                  </Badge>
                </div>
                <div className="max-h-[22vh] min-h-[132px] overflow-auto">
                  {loadingPool || tableActionLoading ? (
                    <div className="space-y-2 p-4">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <div
                          key={`pool-sk-${idx}`}
                          className="grid grid-cols-[56px_1.1fr_1.2fr_1fr_1fr_110px] items-center gap-3 rounded-md border border-slate-100 px-3 py-2"
                        >
                          <Skeleton className="h-4 w-4 rounded-sm" />
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-4 w-44" />
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Table wrapperClassName="">
                      <TableHeader className="sticky top-0 z-10 border-b border-slate-100 bg-white shadow-[0_1px_0_0_rgb(241_245_249)] [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500">
                        <TableRow className="border-slate-100 hover:bg-transparent">
                          <TableHead className="w-14 pl-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                            Add
                          </TableHead>
                          <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Name
                          </TableHead>
                          <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Email
                          </TableHead>
                          <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Position
                          </TableHead>
                          <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Branch
                          </TableHead>
                          <TableHead className="pr-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                            Role
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUnassignedRows.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="py-12 text-center">
                              <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                  <Search className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                                </div>
                                <p className="text-sm font-medium text-slate-700">
                                  No matches
                                </p>
                                <p className="text-xs text-slate-500">
                                  Try another search, or everyone may already be assigned.
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUnassignedRows.map((row) => (
                            <TableRow
                              key={row.id}
                              className={`border-slate-100 transition-colors hover:bg-slate-50/80 ${
                                recentlyUnassignedIds.has(row.id) ? "bg-yellow-200/70" : ""
                              }`}
                            >
                              <TableCell className="pl-4">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(row.id)}
                                  onChange={() => handleToggleSelect(row.id)}
                                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 accent-slate-800 focus:ring-2 focus:ring-slate-400/40"
                                  disabled={isAnySaving}
                                />
                              </TableCell>
                              <TableCell className="font-medium text-slate-900">
                                {row.name}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-slate-600">
                                {row.email}
                              </TableCell>
                              <TableCell className="text-slate-600">{row.position}</TableCell>
                              <TableCell className="text-slate-600">{row.branch}</TableCell>
                              <TableCell className="pr-4">
                                <Badge
                                  variant="outline"
                                  className={`font-normal capitalize ${getRoleBadgeClass(
                                    row.role
                                  )}`}
                                >
                                  {row.role}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 border-t border-blue-200/50 bg-white/90 px-6 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAnySaving}
              className="min-w-[100px] border-slate-200 text-white bg-red-600 hover:bg-red-700 cursor-pointer shadow-sm hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleSaveUnassign();
              }}
              disabled={isAnySaving || loadingAssigned || pendingUnassignIds.size === 0}
              className="min-w-[120px] border-amber-200 text-white bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-sm hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              {savingUnassign ? "Saving..." : "Unassign"}
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={isAnySaving || loadingPool || selectedIds.size === 0}
              className="min-w-[140px] bg-blue-600 text-white shadow-sm hover:bg-blue-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              {savingAssign ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning…
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign
                </>
              )}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSuccessDialogOpen} onOpenChangeAction={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-sm w-[90vw] px-6 py-6">
          <DialogHeader className="text-center sm:text-center border-0 pb-0">
            <div className="relative mx-auto mb-5 flex h-[5.75rem] w-[5.75rem] items-center justify-center">
              <span
                className="absolute inset-0 rounded-full bg-emerald-400/30 motion-safe:animate-ping"
                style={{ animationDuration: "2.4s" }}
                aria-hidden
              />
              <div
                className="absolute inset-[3px] rounded-full bg-gradient-to-br from-emerald-100/90 to-green-50 blur-[1px]"
                aria-hidden
              />
              <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-700 shadow-[0_12px_40px_-8px_rgba(16,185,129,0.55)] ring-4 ring-white animate-success-badge-pop">
                <svg
                  className="h-11 w-11 text-white drop-shadow-sm"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    className="animate-success-check-draw"
                    d="M6.5 12.5l3.8 3.8L17.8 8.8"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Saved successfully
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              {successMessage || "Employees assigned successfully."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center" />
        </DialogContent>
      </Dialog>
    </>
  );
}
