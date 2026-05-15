"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toastMessages } from "@/lib/toastMessages";
import { apiService } from "@/lib/apiService";
import { Eye, Info, RefreshCw, Users2, X } from "lucide-react";
import EvaluationsPagination from "@/components/paginationComponent";
import AddEmployeeToEvaluatorModal, {
  AssignEvaluatorTarget,
} from "@/components/hr/AddEmployeeToEvaluatorModal";
import { cn } from "@/lib/utils";

type EvaluatorRow = {
  id: string;
  name: string;
  email: string;
  position: string;
  role: string;
  branch: string;
  branchId?: string;
  departmentId?: string;
};

type StaffRow = {
  id: string;
  name: string;
  email: string;
  position: string;
  branch: string;
  role: string;
  /** Shown in Corresponding Staff table; from API when backend sends it. */
  lastQuarterEvaluated: string | null;
  /** ISO `created_at`; UI shows calendar year only under the quarter label. */
  lastQuarterEvaluatedAt: string | null;
};
const STAFF_MODAL_PER_PAGE = 10;
/** Rows per page for the main evaluators table (requested from the API). */
const SUBORDINATES_TABLE_PER_PAGE = 10;
const EVALUATORS_SEARCH_DEBOUNCE_MS = 400;
/** Minimum time to show the table skeleton when changing pages in the staff modal (client-side pagination). */
const STAFF_MODAL_PAGE_LOAD_MS = 2500;
/** Persist “last quarter changed” highlights in localStorage (survives closing the modal). */
const STAFF_QUARTER_HIGHLIGHT_STORAGE_KEY = "smct-hr-staff-quarter-highlight-until";
const STAFF_QUARTER_HIGHLIGHT_DURATION_MS = 24 * 60 * 60 * 1000;

type QuarterHighlightExpiryStore = Record<string, number>;

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

function getDisplayRole(roles: unknown): string {
  if (!Array.isArray(roles) || roles.length === 0) return "N/A";
  const nonAdmin = (roles as Array<{ name?: string }>).find(
    (r) => String(r?.name ?? "").toLowerCase() !== "admin"
  );
  return String(nonAdmin?.name ?? (roles[0] as { name?: string })?.name ?? "N/A");
}

function normalizeEvaluator(raw: Record<string, unknown>): EvaluatorRow {
  const firstName = String(raw.fname ?? "").trim();
  const lastName = String(raw.lname ?? "").trim();
  const fullName =
    String(raw.full_name ?? "").trim() || `${firstName} ${lastName}`.trim() || "N/A";

  return {
    id: String(raw.id ?? raw.user_id ?? `${fullName}-${raw.email ?? "unknown"}`),
    name: fullName,
    email: String(raw.email ?? "N/A"),
    position: String(
      (raw.positions as { label?: string } | undefined)?.label ?? raw.position ?? "N/A"
    ),
    role: getDisplayRole(raw.roles),
    branch: String(
      (raw.branch as { branch_name?: string; branch_code?: string } | undefined)
        ?.branch_name ??
        raw.branch_name ??
        (raw.branches as { branch_name?: string; branch_code?: string } | undefined)
          ?.branch_name ??
        "Unassigned"
    ),
    branchId:
      raw.branch_id != null && String(raw.branch_id).trim() !== ""
        ? String(raw.branch_id)
        : undefined,
    departmentId:
      raw.department_id != null && String(raw.department_id).trim() !== ""
        ? String(raw.department_id)
        : undefined,
  };
}

function extractEvaluatorsPaginated(
  raw: unknown,
  perPage: number
): { rows: EvaluatorRow[]; total: number; lastPage: number } {
  const empty = { rows: [] as EvaluatorRow[], total: 0, lastPage: 1 };

  const normalizeList = (items: unknown[]): EvaluatorRow[] =>
    items
      .map((item) =>
        normalizeEvaluator(
          item && typeof item === "object" ? (item as Record<string, unknown>) : {}
        )
      )
      .sort((a, b) => a.name.localeCompare(b.name));

  const fromPaginator = (
    p: Record<string, unknown> | null
  ): { items: unknown[]; total: number; lastPage: number } | null => {
    if (!p || Array.isArray(p)) return null;
    if (!Array.isArray(p.data)) return null;
    const items = p.data as unknown[];
    const pp = Number(p.per_page ?? perPage) || perPage;
    const total = Number(p.total ?? items.length);
    const lastPage = Number(p.last_page ?? Math.max(1, Math.ceil(total / pp)));
    return { items, total, lastPage: Math.max(1, lastPage) };
  };

  if (!raw || typeof raw !== "object") return empty;
  const root = raw as Record<string, unknown>;

  const ev = root.evaluators;
  if (ev && typeof ev === "object" && !Array.isArray(ev)) {
    const pg = fromPaginator(ev as Record<string, unknown>);
    if (pg) {
      return {
        rows: normalizeList(pg.items),
        total: pg.total,
        lastPage: pg.lastPage,
      };
    }
  }

  if (Array.isArray(ev)) {
    const total = Number(root.total ?? ev.length);
    const pp = Number(root.per_page ?? perPage) || perPage;
    const lastPage = Number(
      root.last_page ?? Math.max(1, Math.ceil(total / pp))
    );
    return {
      rows: normalizeList(ev),
      total,
      lastPage: Math.max(1, lastPage),
    };
  }

  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    const ev2 = d.evaluators;
    if (ev2 && typeof ev2 === "object" && !Array.isArray(ev2)) {
      const pg = fromPaginator(ev2 as Record<string, unknown>);
      if (pg) {
        return {
          rows: normalizeList(pg.items),
          total: pg.total,
          lastPage: pg.lastPage,
        };
      }
    }
    if (Array.isArray(ev2)) {
      const total = Number(d.total ?? root.total ?? ev2.length);
      const pp = Number(d.per_page ?? root.per_page ?? perPage) || perPage;
      const lastPage = Number(
        d.last_page ?? root.last_page ?? Math.max(1, Math.ceil(total / pp))
      );
      return {
        rows: normalizeList(ev2),
        total,
        lastPage: Math.max(1, lastPage),
      };
    }
  }

  return empty;
}

/** Probationary month labels: show as M3, M5, etc. when API sends a bare number. */
function formatProbationaryQuarterLabel(value: string): string {
  const t = value.trim();
  if (t === "") return t;
  if (/^m\d/i.test(t)) return t;
  if (/^\d+$/.test(t)) return `M${t}`;
  return t;
}

/** Calendar year from `created_at` only (no month, day, or time of day). */
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

function pickLastQuarterEvaluatedAt(raw: Record<string, unknown>): string | null {
  const empLast =
    raw.employee_last_evaluation && typeof raw.employee_last_evaluation === "object"
      ? (raw.employee_last_evaluation as Record<string, unknown>)
      : null;
  const nested =
    raw.last_evaluation && typeof raw.last_evaluation === "object"
      ? (raw.last_evaluation as Record<string, unknown>)
      : null;
  const v =
    empLast?.created_at ??
    empLast?.createdAt ??
    nested?.created_at ??
    nested?.createdAt;
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" || s.toLowerCase() === "null" ? null : s;
}

function pickLastQuarterEvaluated(raw: Record<string, unknown>): string | null {
  const asTrimmed = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    return s === "" || s.toLowerCase() === "null" ? null : s;
  };

  const empLast =
    raw.employee_last_evaluation && typeof raw.employee_last_evaluation === "object"
      ? (raw.employee_last_evaluation as Record<string, unknown>)
      : null;
  if (empLast) {
    const regular = asTrimmed(empLast.reviewTypeRegular ?? empLast.review_type_regular);
    if (regular) return regular;

    const probationary = asTrimmed(
      empLast.reviewTypeProbationary ?? empLast.review_type_probationary
    );
    if (probationary) return formatProbationaryQuarterLabel(probationary);
  }

  const nested =
    raw.last_evaluation && typeof raw.last_evaluation === "object"
      ? (raw.last_evaluation as Record<string, unknown>)
      : null;
  const sources: unknown[] = [
    raw.last_quarter_evaluated,
    raw.lastQuarterEvaluated,
    raw.last_evaluated_quarter,
    raw.lastEvaluatedQuarter,
    raw.last_completed_quarter,
    raw.lastCompletedQuarter,
    raw.evaluation_quarter,
    raw.evaluated_quarter,
    nested?.quarter,
    nested?.evaluation_quarter,
    nested?.label,
  ];
  for (const v of sources) {
    const s = asTrimmed(v);
    if (s) return s;
  }
  return null;
}

function normalizeStaff(raw: Record<string, unknown>): StaffRow {
  const firstName = String(raw.fname ?? "").trim();
  const lastName = String(raw.lname ?? "").trim();
  const fullName =
    String(raw.full_name ?? "").trim() || `${firstName} ${lastName}`.trim() || "N/A";

  return {
    id: String(raw.id ?? raw.user_id ?? `${fullName}-${raw.email ?? "unknown"}`),
    name: fullName,
    email: String(raw.email ?? "N/A"),
    position: String(
      (raw.positions as { label?: string } | undefined)?.label ?? raw.position ?? "N/A"
    ),
    branch: String(
      (raw.branch as { branch_name?: string; branch_code?: string } | undefined)
        ?.branch_name ??
        raw.branch_name ??
        (raw.branches as { branch_name?: string; branch_code?: string } | undefined)
          ?.branch_name ??
        "Unassigned"
    ),
    role: getDisplayRole(raw.roles),
    lastQuarterEvaluated: pickLastQuarterEvaluated(raw),
    lastQuarterEvaluatedAt: pickLastQuarterEvaluatedAt(raw),
  };
}

/** Used to detect quarter column changes (label or raw `created_at` from API). */
function staffQuarterHighlightSnapshot(row: StaffRow): string {
  return `${row.lastQuarterEvaluated ?? ""}\u001f${row.lastQuarterEvaluatedAt ?? ""}`;
}

function extractAssignedEmployees(raw: unknown): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;

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
    data?.employees,
    (data?.employees as Record<string, unknown> | undefined)?.data,
    data?.assignedEmployees,
    (data?.assignedEmployees as Record<string, unknown> | undefined)?.data,
    data?.assigned_employees,
    (data?.assigned_employees as Record<string, unknown> | undefined)?.data,
    data?.users,
    (data?.users as Record<string, unknown> | undefined)?.data,
    data?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

/** Spinner + SMCT logo over card content while table loads or refreshes. */
function SmctLoadingOverlay({ label }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 z-[70] flex items-center justify-center rounded-lg bg-white/55 backdrop-blur-[1px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none flex flex-col items-center gap-3 rounded-lg bg-white/90 px-8 py-6 shadow-lg ring-1 ring-gray-200/80">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/smct.png"
              alt=""
              className="h-10 w-10 object-contain"
              width={40}
              height={40}
              decoding="async"
            />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-600">{label ?? "Loading..."}</p>
      </div>
    </div>
  );
}

export default function HRSubordinatesPage() {
  const [rows, setRows] = useState<EvaluatorRow[]>([]);
  const [evaluatorsTotal, setEvaluatorsTotal] = useState(0);
  const [evaluatorsLastPage, setEvaluatorsLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [evaluatorsTablePage, setEvaluatorsTablePage] = useState(1);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedEvaluator, setSelectedEvaluator] = useState<EvaluatorRow | null>(null);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffCurrentPage, setStaffCurrentPage] = useState(1);
  const [staffPageLoading, setStaffPageLoading] = useState(false);
  /** Browser timeout id (`window.setTimeout` is a number; Node’s `setTimeout` type would conflict in CI). */
  const staffPageMinLoadTimeoutRef = useRef<number | null>(null);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);

  const prevStaffQuarterByIdRef = useRef<Map<string, string>>(new Map());
  const lastStaffLoadEvaluatorIdRef = useRef<string | null>(null);
  /** Bumps when localStorage quarter highlights change so cells re-read expiry. */
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

  /** Tracks prior staff search string so we can detect “cleared” without firing on every keystroke. */
  const prevStaffSearchRef = useRef<string | null>(null);

  const prevEvaluatorsDebouncedRef = useRef<string | null>(null);
  const evaluatorsFirstLoadDoneRef = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, EVALUATORS_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchEvaluatorsPage = useCallback(
    async (page: number, softRefresh = false) => {
      if (!evaluatorsFirstLoadDoneRef.current && !softRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        const response = await apiService.getAllEvaluators({
          page,
          per_page: SUBORDINATES_TABLE_PER_PAGE,
          search: debouncedSearch || undefined,
        });
        const parsed = extractEvaluatorsPaginated(
          response,
          SUBORDINATES_TABLE_PER_PAGE
        );
        setRows(parsed.rows);
        setEvaluatorsTotal(parsed.total);
        setEvaluatorsLastPage(parsed.lastPage);
      } catch (error) {
        console.error("Failed to load evaluators:", error);
        setRows([]);
        setEvaluatorsTotal(0);
        setEvaluatorsLastPage(1);
        toastMessages.generic.error(
          "Failed to load evaluators",
          "Please try refreshing the list."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        evaluatorsFirstLoadDoneRef.current = true;
      }
    },
    [debouncedSearch]
  );

  useEffect(() => {
    const isFirstMount = prevEvaluatorsDebouncedRef.current === null;
    if (isFirstMount) {
      prevEvaluatorsDebouncedRef.current = debouncedSearch;
      void fetchEvaluatorsPage(evaluatorsTablePage, false);
      return;
    }

    const searchChanged =
      prevEvaluatorsDebouncedRef.current !== debouncedSearch;
    prevEvaluatorsDebouncedRef.current = debouncedSearch;

    if (searchChanged && evaluatorsTablePage !== 1) {
      setEvaluatorsTablePage(1);
      return;
    }

    void fetchEvaluatorsPage(evaluatorsTablePage, false);
  }, [evaluatorsTablePage, debouncedSearch, fetchEvaluatorsPage]);

  useEffect(() => {
    if (evaluatorsTablePage > evaluatorsLastPage && evaluatorsLastPage >= 1) {
      setEvaluatorsTablePage(evaluatorsLastPage);
    }
  }, [evaluatorsTablePage, evaluatorsLastPage]);

  const loadStaffForEvaluator = useCallback(async (evaluator: EvaluatorRow) => {
    stopStaffPageSkeleton();
    setLoadingStaff(true);
    setStaffRows([]);
    setStaffSearch("");
    setStaffCurrentPage(1);
    setSelectedEvaluator(evaluator);
    setIsStaffModalOpen(true);
    if (lastStaffLoadEvaluatorIdRef.current !== evaluator.id) {
      prevStaffQuarterByIdRef.current.clear();
    }
    lastStaffLoadEvaluatorIdRef.current = evaluator.id;
    try {
      const response = await apiService.getAllEvaluatorAssignedEmployees(
        evaluator.id,
        {
          page: 1,
          per_page: 500,
        }
      );
      const employeesRaw = extractAssignedEmployees(response);

      const normalized = employeesRaw
        .map((item: unknown) =>
          normalizeStaff(
            item && typeof item === "object" ? (item as Record<string, unknown>) : {}
          )
        )
        .sort((a: StaffRow, b: StaffRow) => a.name.localeCompare(b.name));

      setStaffRows(normalized);
    } catch (error) {
      console.error("Failed to load corresponding staff:", error);
      toastMessages.generic.error(
        "Failed to load staff list",
        "Please try again."
      );
      setStaffRows([]);
    } finally {
      setLoadingStaff(false);
    }
  }, [stopStaffPageSkeleton]);

  useEffect(() => {
    if (!isStaffModalOpen || loadingStaff || staffRows.length === 0) return;

    const prev = prevStaffQuarterByIdRef.current;
    const changed: string[] = [];

    for (const staff of staffRows) {
      const id = String(staff.id);
      const curr = staffQuarterHighlightSnapshot(staff);
      const old = prev.get(id);
      if (old !== undefined && old !== curr) {
        changed.push(id);
      }
      prev.set(id, curr);
    }

    const alive = new Set(staffRows.map((s) => String(s.id)));
    for (const key of [...prev.keys()]) {
      if (!alive.has(key)) prev.delete(key);
    }

    if (changed.length === 0) return;

    extendQuarterHighlightsForStaffIds(changed);
    setQuarterHighlightStorageTick((t) => t + 1);
  }, [staffRows, loadingStaff, isStaffModalOpen]);

  useEffect(() => {
    if (!isStaffModalOpen) return;
    const id = window.setInterval(() => {
      setQuarterHighlightStorageTick((t) => t + 1);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [isStaffModalOpen]);

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
    if (typeof window === "undefined" || !isStaffModalOpen || staffRows.length === 0) {
      return empty;
    }
    const store = pruneQuarterHighlightStore(readQuarterHighlightStore());
    const now = Date.now();
    const activeIds = new Set<string>();
    for (const s of staffRows) {
      const id = String(s.id);
      const exp = store[id];
      if (typeof exp === "number" && exp > now) activeIds.add(id);
    }
    let visibleCount = 0;
    for (const s of filteredStaffRows) {
      if (activeIds.has(String(s.id))) visibleCount += 1;
    }
    return { activeIds, visibleCount };
  }, [
    staffRows,
    filteredStaffRows,
    quarterHighlightStorageTick,
    isStaffModalOpen,
  ]);

  useEffect(() => {
    const prev = prevStaffSearchRef.current;
    prevStaffSearchRef.current = staffSearch;

    setStaffCurrentPage(1);

    const searchEmptied =
      isStaffModalOpen &&
      !loadingStaff &&
      prev !== null &&
      prev.trim() !== "" &&
      staffSearch.trim() === "";

    if (searchEmptied) {
      beginStaffPageSkeletonMinDelay();
    }
  }, [
    staffSearch,
    isStaffModalOpen,
    loadingStaff,
    beginStaffPageSkeletonMinDelay,
  ]);

  useEffect(() => {
    if (staffCurrentPage > staffTotalPages) {
      setStaffCurrentPage(staffTotalPages);
    }
  }, [staffCurrentPage, staffTotalPages]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-slate-200/90 shadow-md">
        <div
          className="relative overflow-hidden px-6 py-6 text-white"
          style={{
            backgroundImage: "url(/smct.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/95 via-blue-600/92 to-indigo-800/95" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/30 backdrop-blur-sm">
                <Users2 className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <CardTitle className="border-0 text-2xl font-semibold tracking-tight text-blue-50/95 shadow-none">
                  Subordinates
                </CardTitle>
                <CardDescription className="max-w-2xl text-base leading-relaxed text-blue-50/90">
                  Review evaluator accounts and open each staff list to manage the
                  employees assigned under them.
                </CardDescription>
              </div>
            </div>
         
          </div>
        </div>
        
        <CardContent className="relative space-y-4 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white pt-6">
          {(loading || refreshing) && (
            <SmctLoadingOverlay
              label={
                refreshing && !loading
                  ? "Refreshing evaluators..."
                  : "Loading evaluators..."
              }
            />
          )}
          <div
            className={`space-y-4 ${loading || refreshing ? "pointer-events-none opacity-40" : ""}`}
          >
            <Input
              placeholder="Search evaluator by name, email, position, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:max-w-md"
            />

            <Button
              type="button"
              disabled={loading || refreshing}
              onClick={() => {
                void fetchEvaluatorsPage(evaluatorsTablePage, true);
              }}
              className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading || refreshing ? (
                <span className="flex items-center space-x-2">
                  <span className="relative h-8 w-8 shrink-0">
                    <span className="absolute inset-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <img
                        src="/smct.png"
                        alt=""
                        className="h-4 w-4 object-contain opacity-95"
                        width={16}
                        height={16}
                        decoding="async"
                      />
                    </span>
                  </span>
                  <span>{refreshing ? "Refreshing..." : "Loading..."}</span>
                </span>
              ) : (
                <span className="flex items-center">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </span>
              )}
            </Button>
          </div>

          <div
            className={`rounded-xl border border-slate-200/80 bg-white shadow-sm ${loading || refreshing ? "min-h-[280px] border-blue-100 bg-slate-50/40" : ""}`}
          >
            <Table className="[&_th]:h-auto [&_th]:min-h-10 [&_th]:px-3 [&_th]:py-2.5 sm:[&_th]:px-4 [&_th]:align-middle [&_td]:px-3 [&_td]:py-2.5 sm:[&_td]:px-4 [&_td]:align-middle [&_td]:text-sm [&_td]:leading-snug">
              <TableHeader>
                <TableRow className="bg-slate-100/80">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || refreshing ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={`sk-${idx}`}>
                      <TableCell>
                        <Skeleton className="h-5 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-8 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center text-sm text-slate-500">
                      No evaluators found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                      <TableCell className="max-w-[220px] break-words">{row.email}</TableCell>
                      <TableCell>{row.position}</TableCell>
                      <TableCell>{row.branch}</TableCell>
                      <TableCell>{row.role}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                          onClick={() => {
                            void loadStaffForEvaluator(row);
                          }}
                        >
                          <Eye className="mr-1.5 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && !refreshing && evaluatorsTotal > 0 && (
            <EvaluationsPagination
              currentPage={evaluatorsTablePage}
              totalPages={evaluatorsLastPage}
              total={evaluatorsTotal}
              perPage={SUBORDINATES_TABLE_PER_PAGE}
              onPageChange={setEvaluatorsTablePage}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isStaffModalOpen}
        onOpenChangeAction={(open) => {
          if (!open) {
            stopStaffPageSkeleton();
            prevStaffSearchRef.current = null;
            prevStaffQuarterByIdRef.current.clear();
            lastStaffLoadEvaluatorIdRef.current = null;
            setIsStaffModalOpen(false);
            setSelectedEvaluator(null);
            setStaffRows([]);
            setStaffSearch("");
            setStaffCurrentPage(1);
          }
        }}
      >
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
                  {selectedEvaluator
                    ? `Staff list linked to evaluator: ${selectedEvaluator.name}`
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
              Last quarter column
            </span>
            <span className="hidden h-3 w-px shrink-0 bg-slate-300 sm:inline-block" aria-hidden />
            <span className="inline-flex min-w-0 items-center gap-1.5 leading-snug">
              <span
                className="inline-block h-3 w-5 shrink-0 rounded-sm bg-amber-100 ring-1 ring-amber-200/90"
                aria-hidden
              />
              <span>
                Amber means the quarter value changed after a refresh. The smaller line is the
                evaluation year (from the record date, no month/day/time). Highlights stay for 24 hours,
                including after you close this window.
              </span>
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
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Position</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Branch</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Role</TableHead>
                  <TableHead className="text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-600 whitespace-normal sm:text-xs">
                    Last Quarter Evaluated
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
                    </TableRow>
                  ))
                ) : filteredStaffRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center text-sm text-slate-500">
                      No corresponding staff found for this evaluator.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStaffRows.map((staff) => (
                    <TableRow key={staff.id} className="odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/60">
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
                        {staff.role}
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
              onClick={() => {
                setIsStaffModalOpen(false);
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              onClick={() => {
                setIsAddEmployeeModalOpen(true);
              }}
            >
              Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddEmployeeToEvaluatorModal
        open={isAddEmployeeModalOpen}
        onOpenChange={setIsAddEmployeeModalOpen}
        evaluator={
          selectedEvaluator
            ? ({
                id: selectedEvaluator.id,
                name: selectedEvaluator.name,
                branchId: selectedEvaluator.branchId,
                departmentId: selectedEvaluator.departmentId,
              } as AssignEvaluatorTarget)
            : null
        }
        onAssigned={() => {
          if (selectedEvaluator) {
            void loadStaffForEvaluator(selectedEvaluator);
          }
        }}
      />
    </div>
  );
}
