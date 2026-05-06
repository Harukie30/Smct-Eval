"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Download,
  Eye,
  ExternalLink,
  FileText,
  FileType2,
  FileWarning,
  RefreshCw,
  Search,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import EvaluationsPagination from "@/components/paginationComponent";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiService } from "@/lib/apiService";
import { toastMessages } from "@/lib/toastMessages";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/UserContext";
import { CONFIG } from "../../config/config";
import ViolationRowHighlightLegend from "@/components/ViolationRowHighlightLegend";
import {
  effectiveViolationActivityTimeMs,
  stableViolationRowFingerprint,
  violationRowHighlightVariant,
} from "@/lib/memorandumViolationRowHighlight";

/** Pages to scan when building the month filter (per_page × this ≈ max rows considered). */
const MONTH_FILTER_PER_PAGE = 500;
const MONTH_FILTER_MAX_PAGES = 40;
const VIOLATIONS_CACHE_TTL_MS = 30_000;
const SUMMARY_TABLE_PREVIEW_LEN = 10;

const violationsResponseCache = new Map<
  string,
  { data: unknown; expiresAt: number }
>();
const violationsInFlightRequests = new Map<string, Promise<unknown>>();

function getViolationsRequestKey(params: {
  search?: string;
  month?: string;
  page?: number;
  per_page?: number;
}): string {
  return JSON.stringify({
    search: params.search?.trim() ?? "",
    month: params.month?.trim() ?? "",
    page: params.page ?? 1,
    per_page: params.per_page ?? 10,
  });
}

async function getMyViolationsRequest(
  params: {
    search?: string;
    month?: string;
    page?: number;
    per_page?: number;
  },
  options?: { force?: boolean }
): Promise<unknown> {
  const force = options?.force === true;
  const key = getViolationsRequestKey(params);

  if (!force) {
    const cached = violationsResponseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const inFlight = violationsInFlightRequests.get(key);
    if (inFlight) {
      return inFlight;
    }
  }

  const request = apiService
    .getMyMemorandumViolations(params)
    .then((data) => {
      violationsResponseCache.set(key, {
        data,
        expiresAt: Date.now() + VIOLATIONS_CACHE_TTL_MS,
      });
      return data;
    })
    .finally(() => {
      violationsInFlightRequests.delete(key);
    });

  violationsInFlightRequests.set(key, request);
  return request;
}

export type MemorandumViolationRow = {
  id: number | string;
  title: string;
  violation_date: string;
  summary?: string | null;
  document_url?: string | null;
  document_path?: string | null;
  document_name?: string | null;
  /** From API when available — drives “new / updated” row tint. */
  updated_at?: string | null;
  created_at?: string | null;
};

/** YYYY-MM from violation_date for grouping; null if unparseable. */
function violationDateToYearMonth(violationDate: string): string | null {
  const v = violationDate?.trim();
  if (!v) return null;
  try {
    const iso = v.includes("T") ? v : `${v}T12:00:00`;
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  } catch {
    return null;
  }
}

function formatYearMonthLabel(ym: string): string {
  const parts = ym.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function mapViolationRow(r: Record<string, unknown>): MemorandumViolationRow {
  const path =
    (r.document_path as string) ??
    (r.document as string) ??
    (r.support_document as string) ??
    null;
  const docName =
    (r.document_name as string) ??
    (r.file_name as string) ??
    (r.original_name as string) ??
    null;
  const fileFromPath =
    path && !docName
      ? decodeURIComponent(path.split(/[/\\]/).filter(Boolean).pop() ?? "")
      : null;
  const updatedRaw =
    (r.updated_at as string | undefined) ??
    (r.updatedAt as string | undefined) ??
    (r.modified_at as string | undefined);
  const createdRaw =
    (r.created_at as string | undefined) ??
    (r.createdAt as string | undefined);
  return {
    id: (r.id as number | string) ?? Math.random(),
    title: String(
      r.title ??
        r.subject ??
        r.violation_title ??
        r["violaion_title"] ??
        "—"
    ),
    violation_date: String(r.violation_date ?? r.date ?? ""),
    summary:
      (r.summary as string) ??
      (r.violation_summary as string) ??
      (r.description as string) ??
      (r.document as string) ??
      null,
    document_url: (r.document_url as string) ?? (r.url as string) ?? null,
    document_path: path,
    document_name: docName || fileFromPath || null,
    updated_at: updatedRaw?.trim() || null,
    created_at: createdRaw?.trim() || null,
  };
}

function normalizeViolationsResponse(raw: unknown): {
  rows: MemorandumViolationRow[];
  total: number;
  lastPage: number;
  perPage: number;
} {
  const empty = {
    rows: [] as MemorandumViolationRow[],
    total: 0,
    lastPage: 1,
    perPage: 10,
  };
  if (raw == null || typeof raw !== "object") return empty;

  const root = raw as Record<string, unknown>;
  const payload = (root.data ?? root) as Record<string, unknown>;

  let rowsRaw: unknown[] = [];
  let total = 0;
  let lastPage = 1;
  let perPage = 10;

  if (Array.isArray(root.memos)) {
    rowsRaw = root.memos;
    total = rowsRaw.length;
    lastPage = 1;
    perPage = Math.max(rowsRaw.length, 10);
    return {
      rows: rowsRaw.map((x) =>
        mapViolationRow(
          x && typeof x === "object" ? (x as Record<string, unknown>) : {}
        )
      ),
      total,
      lastPage,
      perPage,
    };
  }

  if (
    root.memos &&
    typeof root.memos === "object" &&
    !Array.isArray(root.memos)
  ) {
    const memos = root.memos as Record<string, unknown>;
    if (Array.isArray(memos.data)) {
      rowsRaw = memos.data as unknown[];
      total = Number(memos.total ?? rowsRaw.length);
      lastPage = Number(memos.last_page ?? 1);
      perPage = Number(memos.per_page ?? 10);
      return {
        rows: rowsRaw.map((x) =>
          mapViolationRow(
            x && typeof x === "object" ? (x as Record<string, unknown>) : {}
          )
        ),
        total,
        lastPage: Math.max(1, lastPage),
        perPage,
      };
    }
  }

  if (Array.isArray(root.violations)) {
    rowsRaw = root.violations as unknown[];
    total = Number(root.total ?? rowsRaw.length);
    lastPage = Number(root.last_page ?? 1);
    perPage = Number(root.per_page ?? 10);
  } else if (Array.isArray(payload)) {
    rowsRaw = payload;
    total = rowsRaw.length;
    lastPage = 1;
    perPage = rowsRaw.length || 10;
  } else if (Array.isArray(payload.data)) {
    rowsRaw = payload.data as unknown[];
    total = Number(payload.total ?? rowsRaw.length);
    lastPage = Number(
      payload.last_page ?? Math.max(1, Math.ceil(total / Number(payload.per_page ?? 10)))
    );
    perPage = Number(payload.per_page ?? 10);
  } else {
    return empty;
  }

  return {
    rows: rowsRaw.map((x) =>
      mapViolationRow(x && typeof x === "object" ? (x as Record<string, unknown>) : {})
    ),
    total,
    lastPage: Math.max(1, lastPage),
    perPage,
  };
}

function formatViolationDate(value: string): string {
  if (!value) return "—";
  try {
    return format(parseISO(value.includes("T") ? value : `${value}T12:00:00`), "MMM d, yyyy");
  } catch {
    try {
      return format(new Date(value), "MMM d, yyyy");
    } catch {
      return value;
    }
  }
}

function formatViolationDateLong(value: string): string {
  if (!value) return "—";
  try {
    return format(
      parseISO(value.includes("T") ? value : `${value}T12:00:00`),
      "MMMM d, yyyy"
    );
  } catch {
    try {
      return format(new Date(value), "MMMM d, yyyy");
    } catch {
      return value;
    }
  }
}

function truncateSummaryPreview(
  summary: string | null | undefined,
  maxLen = SUMMARY_TABLE_PREVIEW_LEN
): string {
  const t = summary?.trim() ?? "";
  if (!t) return "—";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

function resolveDocumentHrefForRow(row: MemorandumViolationRow): string | null {
  const u = row.document_url?.trim();
  if (u) {
    if (/^https?:\/\//i.test(u)) return u;
    const base = CONFIG.API_URL?.replace(/\/$/, "") ?? "";
    return `${base}${u.startsWith("/") ? u : `/${u}`}`;
  }
  const p = row.document_path?.trim();
  if (p) {
    const storage = (CONFIG.API_URL_STORAGE ?? CONFIG.API_URL)?.replace(
      /\/$/,
      ""
    );
    return `${storage}/${p.replace(/^\//, "")}`;
  }
  return null;
}

function isLikelyImageHref(href: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(href);
}

function isLikelyPdfHref(href: string): boolean {
  return /\.pdf(\?|$)/i.test(href);
}

export default function MyViolationsPanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MemorandumViolationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewingRow, setViewingRow] = useState<MemorandumViolationRow | null>(
    null
  );
  const itemsPerPage = 10;

  const listContextKey = useMemo(
    () =>
      `${currentPage}|${debouncedSearch}|${monthFilter}|${itemsPerPage}`,
    [currentPage, debouncedSearch, monthFilter, itemsPerPage]
  );

  const viewerDisplayName = useMemo(() => {
    if (!user) return null;
    const full = `${String(user.fname ?? "").trim()} ${String(user.lname ?? "").trim()}`.trim();
    return full || null;
  }, [user]);

  const viewFileUrl = useMemo(() => {
    if (!viewingRow) return null;
    return resolveDocumentHrefForRow(viewingRow);
  }, [viewingRow]);

  const viewAttachmentKind = useMemo((): "image" | "pdf" | "other" | null => {
    if (!viewFileUrl) return null;
    if (isLikelyImageHref(viewFileUrl)) return "image";
    if (isLikelyPdfHref(viewFileUrl)) return "pdf";
    return "other";
  }, [viewFileUrl]);

  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [monthsLoading, setMonthsLoading] = useState(true);
  const loadRequestIdRef = useRef(0);
  const clientActivityAtRef = useRef<Map<string, number>>(new Map());
  const previousRowsByIdRef = useRef<Map<string, string>>(new Map());
  const lastListContextRef = useRef<string | null>(null);
  const [highlightRev, setHighlightRev] = useState(0);

  const fetchAvailableMonths = useCallback(async (options?: { force?: boolean }) => {
    setMonthsLoading(true);
    try {
      const ymSet = new Set<string>();
      let page = 1;
      let lastPage = 1;
      do {
        const raw = await getMyViolationsRequest(
          {
            search: "",
            month: "",
            page,
            per_page: MONTH_FILTER_PER_PAGE,
          },
          options
        );
        const { rows: pageRows, lastPage: lp } =
          normalizeViolationsResponse(raw);
        lastPage = Math.max(1, lp);
        for (const r of pageRows) {
          const ym = violationDateToYearMonth(r.violation_date);
          if (ym) ymSet.add(ym);
        }
        page++;
        if (page > MONTH_FILTER_MAX_PAGES) break;
      } while (page <= lastPage);
      setAvailableMonths(
        Array.from(ymSet).sort((a, b) => b.localeCompare(a))
      );
    } catch (e) {
      console.error(e);
      setAvailableMonths([]);
    } finally {
      setMonthsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAvailableMonths();
  }, [fetchAvailableMonths]);

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "all", label: "All dates" },
    ];
    for (const ym of availableMonths) {
      opts.push({ value: ym, label: formatYearMonthLabel(ym) });
    }
    return opts;
  }, [availableMonths]);

  useEffect(() => {
    if (monthFilter === "all") return;
    if (monthsLoading) return;
    if (availableMonths.length === 0) {
      setMonthFilter("all");
      return;
    }
    if (!availableMonths.includes(monthFilter)) {
      setMonthFilter("all");
    }
  }, [monthFilter, availableMonths, monthsLoading]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, monthFilter]);

  const load = useCallback(
    async (options?: { softRefresh?: boolean }) => {
      const soft = options?.softRefresh === true;
      const requestId = ++loadRequestIdRef.current;
      if (soft) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const raw = await getMyViolationsRequest(
          {
            search: debouncedSearch,
            month: monthFilter === "all" ? "" : monthFilter,
            page: currentPage,
            per_page: itemsPerPage,
          },
          { force: soft }
        );
        if (requestId !== loadRequestIdRef.current) return;
        const { rows: next, total: tot, lastPage } =
          normalizeViolationsResponse(raw);
        setRows(next);
        setTotal(tot);
        setTotalPages(lastPage);
      } catch (e: unknown) {
        if (requestId !== loadRequestIdRef.current) return;
        console.error(e);
        if (!soft) {
          setRows([]);
          setTotal(0);
          setTotalPages(1);
        }
        const msg =
          e && typeof e === "object" && "response" in e
            ? (e as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            : undefined;
        toastMessages.generic.error(
          "Could not load violations",
          msg ?? "Please try again later."
        );
      } finally {
        if (soft) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [debouncedSearch, monthFilter, currentPage]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ctx = listContextKey;
    const prevCtx = lastListContextRef.current;
    const sameList = prevCtx === ctx;
    lastListContextRef.current = ctx;

    const prevById = previousRowsByIdRef.current;
    const actMap = clientActivityAtRef.current;
    const now = Date.now();

    if (!sameList) {
      previousRowsByIdRef.current = new Map(
        rows.map((r) => [String(r.id), stableViolationRowFingerprint(r)])
      );
      setHighlightRev((x) => x + 1);
      return;
    }

    for (const row of rows) {
      const id = String(row.id);
      const fp = stableViolationRowFingerprint(row);
      const oldFp = prevById.get(id);
      if (oldFp !== undefined && oldFp !== fp) {
        actMap.set(id, now);
      }
      if (oldFp === undefined && prevById.size > 0) {
        actMap.set(id, now);
      }
      prevById.set(id, fp);
    }
    previousRowsByIdRef.current = new Map(prevById);

    setHighlightRev((x) => x + 1);
  }, [rows, listContextKey]);

  useEffect(() => {
    const id = window.setInterval(
      () => setHighlightRev((x) => x + 1),
      15_000
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-[400px] space-y-4 pb-8">
      <Card className="overflow-hidden border-slate-200/90 shadow-md">
        <div
          className="relative overflow-hidden px-6 py-6 text-white"
          style={{
            backgroundImage: "url(/smct.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/95 via-blue-600/92 to-blue-800/95" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-500/90 shadow-inner ring-1 ring-white/30 backdrop-blur-sm">
              <FileWarning className="h-7 w-7  text-white" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <CardTitle className="border-0 text-2xl font-semibold tracking-tight text-blue-50/95 shadow-none">
                My violations
              </CardTitle>
              <CardDescription className="text-base leading-relaxed text-white">
                Memorandum violations recorded by HR. Search by title or pick a
                month—only months that already have a violation are listed.
              </CardDescription>
            </div>
          </div>
        </div>
        <CardContent className="space-y-4 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="min-w-0 w-full flex-1 space-y-2 lg:max-w-md">
              <Label htmlFor="violations-search" className="text-sm font-medium">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="violations-search"
                  placeholder="Search by title…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full min-w-0 pl-9 pr-9"
                  autoComplete="off"
                  disabled={loading || refreshing}
                />
                {searchTerm ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
            <div className="w-full min-w-0 space-y-2 lg:w-auto lg:min-w-[14rem]">
              <Label className="text-sm font-medium">Violation month</Label>
              <Combobox
                options={monthOptions}
                value={monthFilter}
                onValueChangeAction={(v) => setMonthFilter(String(v))}
                placeholder={
                  monthsLoading ? "Loading months…" : "Pick a month"
                }
                searchPlaceholder="Search month…"
                emptyText="No month with violations."
                className="w-full min-w-0"
                disabled={monthsLoading || loading || refreshing}
              />
            </div>
            <div className="flex w-full items-end justify-end lg:w-auto lg:shrink-0">
              <div className="space-y-2">
                <Label className="text-sm font-medium sr-only lg:not-sr-only">
                  Refresh list
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || refreshing}
                  onClick={() => {
                    void fetchAvailableMonths({ force: true });
                    load({ softRefresh: true });
                  }}
                  className="w-full cursor-pointer bg-blue-500 text-white hover:bg-blue-600 hover:text-white gap-2 lg:w-auto"
                  title="Refresh violations list"
                >
                  <RefreshCw
                    className={`h-4 w-4 shrink-0 ${refreshing ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  {refreshing ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
            </div>
          </div>

          <ViolationRowHighlightLegend />

          <div className="relative overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            {loading ? (
              <div
                className="px-4 py-6 sm:px-6"
                aria-busy="true"
                role="status"
                aria-live="polite"
              >
                <span className="sr-only">Loading violations list</span>
                <Table className="min-w-[760px] w-full">
                  <TableHeader>
                    <TableRow className="border-b border-blue-900/10 bg-gradient-to-r from-blue-600 to-blue-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700">
                      <TableHead className="min-w-[10rem] font-semibold text-white">
                        Title
                      </TableHead>
                      <TableHead className="min-w-[8rem] whitespace-nowrap font-semibold text-white">
                        Violation date
                      </TableHead>
                      <TableHead className="min-w-[7rem] font-semibold text-white">
                        Summary
                      </TableHead>
                      <TableHead className="w-[1%] whitespace-nowrap text-right font-semibold text-white">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={`sk-load-${i}`} className="border-slate-100">
                        <TableCell>
                          <Skeleton className="h-5 w-full max-w-[240px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-20" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-8 w-20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="relative min-h-[200px]">
                {refreshing ? (
                  <div
                    className="absolute inset-0 z-10 overflow-auto rounded-xl bg-white/85 px-4 py-6 backdrop-blur-[2px] sm:px-6"
                    aria-busy="true"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="sr-only">Refreshing violations list</span>
                    <Table className="min-w-[760px] w-full">
                      <TableHeader>
                        <TableRow className="border-b border-blue-900/10 bg-gradient-to-r from-blue-600 to-blue-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700">
                          <TableHead className="min-w-[10rem] font-semibold text-white">
                            Title
                          </TableHead>
                          <TableHead className="min-w-[8rem] whitespace-nowrap font-semibold text-white">
                            Violation date
                          </TableHead>
                          <TableHead className="min-w-[7rem] font-semibold text-white">
                            Summary
                          </TableHead>
                          <TableHead className="w-[1%] whitespace-nowrap text-right font-semibold text-white">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <TableRow
                            key={`sk-refresh-${i}`}
                            className="border-slate-100"
                          >
                            <TableCell>
                              <Skeleton className="h-5 w-full max-w-[240px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-20" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="ml-auto h-8 w-20" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
                <Table className="min-w-[760px] w-full">
                  <TableHeader>
                    <TableRow className="border-b border-blue-900/10 bg-gradient-to-r from-blue-600 to-blue-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700">
                      <TableHead className="min-w-[10rem] font-semibold text-white">
                        Title
                      </TableHead>
                      <TableHead className="min-w-[8rem] whitespace-nowrap font-semibold text-white">
                        Violation date
                      </TableHead>
                      <TableHead className="min-w-[7rem] font-semibold text-white">
                        Summary
                      </TableHead>
                      <TableHead className="w-[1%] whitespace-nowrap text-right font-semibold text-white">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-14 text-center"
                        >
                          <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                            <img
                              src="/not-found.gif"
                              alt=""
                              width={140}
                              height={140}
                              className="mx-auto max-h-36 w-auto max-w-[120px] object-contain select-none"
                              decoding="async"
                            />
                            <p className="text-sm font-medium text-slate-700">
                              No violations found
                              {debouncedSearch || monthFilter !== "all"
                                ? " for the current filters."
                                : "."}
                            </p>
                            <p className="text-xs text-slate-500">
                              Try adjusting search or month, or refresh the list.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        void highlightRev;
                        const fullSummary = row.summary?.trim() ?? "";
                        const previewSummary = truncateSummaryPreview(row.summary);
                        const now = Date.now();
                        const hl = violationRowHighlightVariant(
                          effectiveViolationActivityTimeMs(
                            row,
                            clientActivityAtRef.current
                          ),
                          now
                        );
                        return (
                          <TableRow
                            key={String(row.id)}
                            className={cn(
                              "border-slate-100 transition-colors",
                              hl === "yellow" &&
                                "bg-yellow-100/95 hover:bg-yellow-100",
                              hl === "blue" &&
                                "bg-blue-100/75 hover:bg-blue-100/90",
                              hl === null && "hover:bg-blue-50/50"
                            )}
                          >
                            <TableCell className="max-w-[20rem] font-medium text-slate-900">
                              <span className="line-clamp-2">{row.title}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-slate-600">
                              {formatViolationDate(row.violation_date)}
                            </TableCell>
                            <TableCell
                              className="max-w-[7rem] text-slate-700"
                              title={fullSummary || "No summary"}
                            >
                              {previewSummary}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="cursor-pointer hover:scale-110 transition-transform duration-200 bg-blue-500 text-white gap-1.5 hover:bg-blue-600 hover:text-white hover:bg-red-500"
                                onClick={() => setViewingRow(row)}
                              >
                                <Eye className="h-4 w-4" />
                                View Summary
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <Dialog
            open={!!viewingRow}
            onOpenChangeAction={(open) => {
              if (!open) setViewingRow(null);
            }}
          >
            <DialogContent
              className={cn(
                "max-h-[min(92vh,900px)] max-w-2xl gap-0 overflow-hidden p-0 shadow-2xl shadow-slate-900/15 sm:max-w-3xl"
              )}
            >
              <div
                className="relative overflow-hidden px-6 pt-7 pb-6 text-white sm:px-8 sm:pb-7"
                style={{
                  backgroundImage: "url(/smct.png)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/96 via-orange-600/93 to-amber-900/96" />
                <div
                  className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-white/10 blur-3xl"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner ring-1 ring-white/35 backdrop-blur-sm">
                      <FileWarning
                        className="h-7 w-7 text-white"
                        strokeWidth={1.75}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100/95">
                        Memorandum violation
                      </p>
                      <DialogTitle className="text-left text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.65rem] sm:leading-tight">
                        Record details
                      </DialogTitle>
                      <DialogDescription className="text-left text-sm leading-relaxed text-amber-50/98">
                        Title, violation date, summary, and supporting document for this
                        memorandum record.
                      </DialogDescription>
                    </div>
                  </div>
                  {viewerDisplayName ? (
                    <div className="w-full shrink-0 rounded-xl border border-white/25 bg-white/15 px-4 py-3 text-left shadow-sm backdrop-blur-md sm:max-w-[220px] sm:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-100/90">
                        Your account
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-white">
                        {viewerDisplayName}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {viewingRow ? (
                <>
                  <div className="max-h-[min(58vh,560px)] overflow-y-auto border-t border-slate-100 bg-gradient-to-b from-slate-50/95 to-white px-6 py-6 sm:px-8">
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-950/[0.04] sm:p-6">
                      <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
                        <div className="space-y-2 sm:pr-2">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                              <FileText className="h-3.5 w-3.5" aria-hidden />
                            </span>
                            Title
                          </div>
                          <p className="text-lg font-semibold leading-snug text-slate-900">
                            {viewingRow.title ?? "—"}
                          </p>
                        </div>
                        <div className="space-y-2 border-t border-slate-100 pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200/90">
                              <Calendar className="h-3.5 w-3.5" aria-hidden />
                            </span>
                            Violation date
                          </div>
                          <p className="text-lg font-semibold tabular-nums text-slate-900">
                            {formatViolationDateLong(viewingRow.violation_date)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-8 border-t border-slate-100 pt-8">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                            <FileText className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          Summary
                        </div>
                        <div className="mt-3 rounded-xl border border-amber-100/90 bg-gradient-to-br from-amber-50/80 to-white px-4 py-4 ring-1 ring-amber-100/40">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                            {viewingRow.summary?.trim() || "No summary provided."}
                          </p>
                        </div>
                      </div>

                      {viewingRow.document_name?.trim() || viewFileUrl ? (
                        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/40 shadow-inner ring-1 ring-slate-950/[0.03]">
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-4 py-3.5 sm:px-5">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Supporting document
                              </p>
                              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                                {viewingRow.document_name?.trim() || "Attachment"}
                              </p>
                            </div>
                            {viewFileUrl ? (
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="cursor-pointer border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
                                  asChild
                                >
                                  <a
                                    href={viewFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2"
                                  >
                                    <ExternalLink className="h-4 w-4 shrink-0" />
                                    Open
                                  </a>
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="cursor-pointer"
                                  asChild
                                >
                                  <a
                                    href={viewFileUrl}
                                    download={
                                      viewingRow.document_name?.trim() || undefined
                                    }
                                    className="inline-flex items-center gap-2"
                                  >
                                    <Download className="h-4 w-4 shrink-0" />
                                    Download
                                  </a>
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <div className="bg-white px-4 py-5 sm:px-5">
                            {!viewFileUrl &&
                            viewingRow.document_name?.trim() ? (
                              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-600">
                                Preview link unavailable for this attachment.
                              </p>
                            ) : null}
                            {viewFileUrl && viewAttachmentKind === "image" ? (
                              <div className="overflow-hidden rounded-xl bg-slate-100/90 ring-1 ring-slate-200/70">
                                <img
                                  src={viewFileUrl}
                                  alt=""
                                  className="mx-auto max-h-[min(340px,52vh)] w-full object-contain"
                                />
                              </div>
                            ) : null}
                            {viewFileUrl && viewAttachmentKind === "pdf" ? (
                              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-amber-200/95 bg-gradient-to-b from-amber-50/90 to-white px-6 py-10 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-amber-100">
                                  <FileType2 className="h-8 w-8 text-amber-700" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-base font-semibold text-slate-900">
                                    PDF document
                                  </p>
                                  <p className="max-w-sm text-xs leading-relaxed text-slate-600">
                                    Use Open or Download above to view this file in your
                                    browser or save a copy.
                                  </p>
                                </div>
                              </div>
                            ) : null}
                            {viewFileUrl && viewAttachmentKind === "other" ? (
                              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm text-slate-700">
                                <FileType2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                                <span>
                                  Preview isn&apos;t available for this file type — use Open
                                  or Download above.
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <DialogFooter className="flex flex-col-reverse gap-2 border-t border-slate-200/90 bg-slate-50/95 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
                    <Button
                      type="button"
                      className="cursor-pointer min-w-[120px] bg-amber-600 text-white shadow-sm hover:bg-amber-700"
                      onClick={() => setViewingRow(null)}
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </>
              ) : null}
            </DialogContent>
          </Dialog>

          {!loading && !refreshing && total > 0 ? (
            <EvaluationsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              perPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
