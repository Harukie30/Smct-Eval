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
import { toastMessages } from "@/lib/toastMessages";
import { apiService } from "@/lib/apiService";
import { pickApiTimestamp } from "@/lib/parseApiTimestamp";
import { Eye, RefreshCw, Users2 } from "lucide-react";
import EvaluationsPagination from "@/components/paginationComponent";
import AddEmployeeToEvaluatorModal, {
  AssignEvaluatorTarget,
} from "@/components/hr/AddEmployeeToEvaluatorModal";
import CorrespondingStaffModal, {
  type CorrespondingStaffRow,
} from "@/components/hr/CorrespondingStaffModal";

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

/** Rows per page for the main evaluators table (requested from the API). */
const SUBORDINATES_TABLE_PER_PAGE = 10;
const EVALUATORS_SEARCH_DEBOUNCE_MS = 400;

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

function pickLastQuarterEvaluatedAt(raw: Record<string, unknown>): string | null {
  const empLast =
    raw.employee_last_evaluation && typeof raw.employee_last_evaluation === "object"
      ? (raw.employee_last_evaluation as Record<string, unknown>)
      : null;
  const nested =
    raw.last_evaluation && typeof raw.last_evaluation === "object"
      ? (raw.last_evaluation as Record<string, unknown>)
      : null;

  const timestampKeys = [
    "created_at",
    "createdAt",
    "updated_at",
    "updatedAt",
    "submitted_at",
    "submittedAt",
    "evaluated_at",
    "evaluatedAt",
    "completed_at",
    "completedAt",
  ] as const;

  return (
    pickApiTimestamp(empLast, timestampKeys) ??
    pickApiTimestamp(nested, timestampKeys) ??
    pickApiTimestamp(raw, [
      "last_quarter_evaluated_at",
      "lastQuarterEvaluatedAt",
      "last_evaluated_at",
      "lastEvaluatedAt",
      "last_evaluation_at",
      "lastEvaluationAt",
      ...timestampKeys,
    ])
  );
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

function normalizeStaff(raw: Record<string, unknown>): CorrespondingStaffRow {
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
  const [staffRows, setStaffRows] = useState<CorrespondingStaffRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);

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
    setLoadingStaff(true);
    setStaffRows([]);
    setSelectedEvaluator(evaluator);
    setIsStaffModalOpen(true);
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
        .sort((a: CorrespondingStaffRow, b: CorrespondingStaffRow) =>
          a.name.localeCompare(b.name)
        );

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
  }, []);

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

      <CorrespondingStaffModal
        open={isStaffModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsStaffModalOpen(false);
            setSelectedEvaluator(null);
            setStaffRows([]);
          }
        }}
        evaluator={
          selectedEvaluator
            ? { id: selectedEvaluator.id, name: selectedEvaluator.name }
            : null
        }
        staffRows={staffRows}
        loadingStaff={loadingStaff}
        onAddEmployee={() => setIsAddEmployeeModalOpen(true)}
      />

      <AddEmployeeToEvaluatorModal
        open={isAddEmployeeModalOpen}
        onOpenChangeAction={setIsAddEmployeeModalOpen}
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
