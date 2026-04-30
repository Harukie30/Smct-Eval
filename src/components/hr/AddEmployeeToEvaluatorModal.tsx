"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
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
  role: string;
};

interface AddEmployeeToEvaluatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluator: AssignEvaluatorTarget | null;
  onAssigned?: () => void;
}

const ASSIGN_SUCCESS_DIALOG_AUTO_CLOSE_MS = 2800;

function pickRoleName(rawRoles: unknown): string {
  if (!Array.isArray(rawRoles) || rawRoles.length === 0) return "N/A";
  const nonAdmin = (rawRoles as Array<{ name?: string }>).find(
    (r) => String(r?.name ?? "").toLowerCase() !== "admin"
  );
  return String(nonAdmin?.name ?? (rawRoles[0] as { name?: string })?.name ?? "N/A");
}

function isEmployeeRole(rawRoles: unknown): boolean {
  const role = pickRoleName(rawRoles).toLowerCase();
  return role === "employee";
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

function normalizeEmployeeList(list: unknown[]): CandidateEmployee[] {
  return list
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        isEmployeeRole((item as Record<string, unknown>).roles)
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
  const [assignedRows, setAssignedRows] = useState<CandidateEmployee[]>([]);
  const [unassignedRows, setUnassignedRows] = useState<CandidateEmployee[]>([]);
  /** Smaller request — show “Already assigned” as soon as this finishes. */
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  /** Larger pool — bottom table fills when this finishes. */
  const [loadingPool, setLoadingPool] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [unassigningIds, setUnassigningIds] = useState<Set<string>>(new Set());
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const loadEmployees = useCallback(async (options?: { silent?: boolean }) => {
    if (!evaluator) return;
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
        evaluator.id,
        { page: 1, per_page: 500 }
      );
      const assignedList = extractEmployees(assignedResponse);
      const normalizedAssigned = normalizeEmployeeList(assignedList);
      setAssignedRows(normalizedAssigned);
      if (!silent) {
        setLoadingAssigned(false);
      }

      const unassignedResponse = await apiService.getAllEvaluatorEmployees(
        evaluator.id,
        { page: 1, per_page: 2000 }
      );
      const unassignedList = extractEmployees(unassignedResponse);
      const assignedIdSet = new Set(normalizedAssigned.map((x) => x.id));
      const normalizedUnassignedAll = normalizeEmployeeList(unassignedList);
      const normalizedUnassigned = normalizedUnassignedAll.filter(
        (x) => !assignedIdSet.has(x.id)
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
  }, [evaluator]);

  useEffect(() => {
    if (!open || !evaluator) return;
    setSelectedIds(new Set());
    setSearch("");
    void loadEmployees();
  }, [open, evaluator, loadEmployees]);

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
        row.position.toLowerCase().includes(q)
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
        row.position.toLowerCase().includes(q)
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
    if (!evaluator) return;
    const unassignedIdSet = new Set(unassignedRows.map((x) => x.id));

    const idsToAssign = Array.from(selectedIds).filter((id) => unassignedIdSet.has(id));

    if (idsToAssign.length === 0) {
      toastMessages.generic.warning(
        "No employee selected",
        "Select at least one employee to assign."
      );
      return;
    }

    setSaving(true);
    try {
      // Backend replaces the evaluator’s assignment set with this list — not an “add” merge.
      // Include everyone already assigned plus the new selections so existing rows stay.
      const employeeIds = Array.from(
        new Set([...assignedRows.map((r) => r.id), ...idsToAssign])
      );

      await apiService.assignEmployees(evaluator.id, {
        employeeIds,
        action: "assign",
      });

      setSuccessMessage(
        `${idsToAssign.length} employee(s) assigned to ${evaluator.name}.`
      );
      onAssigned?.();
      onOpenChange(false);
      setIsSuccessDialogOpen(true);
    } catch (error) {
      console.error("Failed assigning employees:", error);
      toastMessages.generic.error(
        "Assignment failed",
        "Please confirm backend supports employee assignment."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = useCallback(
    async (employeeId: string) => {
      if (!evaluator) return;

      setUnassigningIds((prev) => {
        const next = new Set(prev);
        next.add(employeeId);
        return next;
      });

      try {
        // Sync model: payload lists only who should **stay** assigned. The unchecked
        // employee is omitted entirely (not sent as unassign / not in employee_ids).
        const remainingIds = assignedRows
          .filter((r) => r.id !== employeeId)
          .map((r) => r.id);

        if (remainingIds.length === 0) {
          await apiService.assignEmployeesBlank(evaluator.id);
        } else {
          await apiService.assignEmployees(evaluator.id, {
            employeeIds: remainingIds,
            action: "assign",
          });
        }

        const removed = assignedRows.find((r) => r.id === employeeId);
        setAssignedRows((prev) =>
          prev.filter((r) => r.id !== employeeId).sort(sortCandidatesByName)
        );
        if (removed) {
          setUnassignedRows((prev) =>
            [...prev, removed].sort(sortCandidatesByName)
          );
        }

        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(employeeId);
          return next;
        });
        setUnassigningIds(new Set());
      } catch (error) {
        console.error("Failed to unassign employee:", error);
        toastMessages.generic.error("Unassign failed", "Please try again.");
        setUnassigningIds(new Set());
        void loadEmployees({ silent: true });
      }
    },
    [evaluator, assignedRows, loadEmployees]
  );

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
              <div className="relative px-6 py-2.5 sm:px-8 sm:py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between lg:gap-5">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-100">
                      HR · Staff assignment
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-200/80 bg-white/95 shadow-md shadow-blue-900/5 ring-1 ring-blue-900/[0.04]"
                        aria-hidden
                      >
                        <UserPlus className="h-5 w-5 text-blue-800" strokeWidth={1.7} />
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <DialogTitle className="bg-gradient-to-r from-blue-950 to-indigo-950 bg-clip-text text-xl font-bold tracking-tight text-white sm:text-[1.35rem] sm:leading-snug">
                          Assign employees
                        </DialogTitle>
                        {evaluator ? (
                          <div className="space-y-1.5">
                            <p className="text-xs text-white sm:text-sm">
                              Link staff to this evaluator so they appear in coverage and
                              reporting.
                            </p>
                            <div className="flex max-w-xl flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
                              <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-white">
                                Evaluator
                              </span>
                              <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-blue-200/70 bg-white/90 px-3 py-2 shadow-sm shadow-blue-900/5 backdrop-blur-sm">
                                <div
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-semibold text-white shadow-inner"
                                  aria-hidden
                                >
                                  {(evaluator.name.trim().charAt(0) || "?").toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                                    {evaluator.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
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

                  <div className="flex shrink-0 flex-col justify-center border-t border-blue-300/40 pt-3 sm:pt-0 lg:min-w-[180px] lg:border-l lg:border-t-0 lg:border-blue-300/40 lg:pl-6 lg:pt-0">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100/90 lg:text-right">
                      At a glance
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:grid lg:max-w-[200px]">
                      <div className="rounded-lg border border-blue-200/60 bg-white/90 px-3 py-2 text-center shadow-sm shadow-blue-900/5 backdrop-blur-sm sm:flex-1 lg:min-w-0">
                        <p className="text-xl font-bold tabular-nums text-blue-950">
                          {loadingAssigned ? "—" : assignedRows.length}
                        </p>
                        <p className="text-[11px] font-medium text-blue-900/55">On team</p>
                      </div>
                      <div className="rounded-lg border border-indigo-200/60 bg-white/90 px-3 py-2 text-center shadow-sm shadow-indigo-900/5 backdrop-blur-sm sm:flex-1 lg:min-w-0">
                        <p className="text-xl font-bold tabular-nums text-indigo-950">
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
                placeholder="Search by name, email, or position…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={saving}
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
                        Uncheck to remove from this evaluator&apos;s team
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 border border-slate-200/80 bg-white font-normal text-slate-700 shadow-sm"
                  >
                    {loadingAssigned ? "…" : `${filteredAssignedRows.length} shown`}
                  </Badge>
                </div>
                <div className="max-h-[22vh] min-h-[132px] overflow-auto">
                  {loadingAssigned ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-14 text-sm text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      <span>Loading current team…</span>
                    </div>
                  ) : (
                    <Table wrapperClassName="">
                      <TableHeader className="sticky top-0 z-10 border-b border-slate-100 bg-white shadow-[0_1px_0_0_rgb(241_245_249)]">
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
                          <TableHead className="pr-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                            Role
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssignedRows.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="py-12 text-center">
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
                              className="border-slate-100 transition-colors hover:bg-slate-50/80"
                            >
                              <TableCell className="pl-4">
                                <input
                                  type="checkbox"
                                  checked={!unassigningIds.has(row.id)}
                                  onChange={(e) => {
                                    if (!e.target.checked) {
                                      void handleUnassign(row.id);
                                    }
                                  }}
                                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 accent-slate-800 focus:ring-2 focus:ring-slate-400/40"
                                  disabled={saving || unassigningIds.has(row.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium text-slate-900">
                                {row.name}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-slate-600">
                                {row.email}
                              </TableCell>
                              <TableCell className="text-slate-600">{row.position}</TableCell>
                              <TableCell className="pr-4">
                                <Badge
                                  variant="outline"
                                  className="border-slate-200 bg-slate-50/90 font-normal capitalize text-slate-700"
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
                        Staff not on this evaluator&apos;s team — select to add
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 border border-slate-200/80 bg-white font-normal text-slate-700 shadow-sm"
                  >
                    {loadingPool ? "…" : `${filteredUnassignedRows.length} shown`}
                  </Badge>
                </div>
                <div className="max-h-[30vh] min-h-[132px] overflow-auto">
                  {loadingPool ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      <span>Loading directory…</span>
                    </div>
                  ) : (
                    <Table wrapperClassName="">
                      <TableHeader className="sticky top-0 z-10 border-b border-slate-100 bg-white shadow-[0_1px_0_0_rgb(241_245_249)]">
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
                          <TableHead className="pr-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                            Role
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUnassignedRows.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="py-12 text-center">
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
                              className="border-slate-100 transition-colors hover:bg-slate-50/80"
                            >
                              <TableCell className="pl-4">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(row.id)}
                                  onChange={() => handleToggleSelect(row.id)}
                                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 accent-slate-800 focus:ring-2 focus:ring-slate-400/40"
                                  disabled={saving}
                                />
                              </TableCell>
                              <TableCell className="font-medium text-slate-900">
                                {row.name}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-slate-600">
                                {row.email}
                              </TableCell>
                              <TableCell className="text-slate-600">{row.position}</TableCell>
                              <TableCell className="pr-4">
                                <Badge
                                  variant="outline"
                                  className="border-slate-200 bg-slate-50/90 font-normal capitalize text-slate-700"
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
              disabled={saving}
              className="min-w-[100px] border-slate-200 text-white bg-red-600 hover:bg-red-700 cursor-pointer shadow-sm hover:text-white hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={saving || loadingPool || selectedIds.size === 0}
              className="min-w-[140px] bg-blue-600 text-white shadow-sm hover:bg-blue-800 cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning…
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Employee                </>
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
