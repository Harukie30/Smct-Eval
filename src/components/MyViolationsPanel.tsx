"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Download,
  ExternalLink,
  FileText,
  FileType2,
  FileWarning,
  RefreshCw,
  Search,
  Scale,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import SmctLoadingOverlay from "@/components/SmctLoadingOverlay";
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
import { SanctionTableHeadLabel } from "@/components/violations/SanctionTableHeadLabel";
import { useAuth } from "@/contexts/UserContext";
import { CONFIG } from "../../config/config";
import ViolationRowHighlightLegend from "@/components/ViolationRowHighlightLegend";
import {
  effectiveViolationActivityTimeMs,
  stableViolationRowFingerprint,
  violationRowHighlightVariant,
} from "@/lib/memorandumViolationRowHighlight";

const VIOLATIONS_CACHE_TTL_MS = 30_000;
const MY_VIOLATIONS_SCAN_PER_PAGE = 100;
const MY_VIOLATIONS_SCAN_MAX_PAGES = 20;
const SEARCH_DEBOUNCE_MS = 400;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
/** Matches HR `ViolationSummaryPage` table chrome (padding, type scale, zebra rows). */
const VIOLATION_SUMMARY_TABLE_CLASS =
  "min-w-[52rem] w-full [&_th]:h-auto [&_th]:min-h-8 [&_th]:px-2.5 [&_th]:py-2 [&_th]:align-middle [&_th]:text-[0.6rem] [&_th]:uppercase [&_th]:tracking-wide sm:[&_th]:min-h-9 sm:[&_th]:px-3 sm:[&_th]:py-2.5 sm:[&_th]:text-[0.65rem] [&_td]:min-w-0 [&_td]:px-2.5 [&_td]:py-2 [&_td]:align-top [&_td]:text-xs [&_td]:leading-snug sm:[&_td]:px-3 sm:[&_td]:py-2.5 sm:[&_td]:text-sm sm:[&_td]:leading-snug";

const violationsResponseCache = new Map<
  string,
  { data: unknown; expiresAt: number }
>();
const violationsInFlightRequests = new Map<string, Promise<unknown>>();

function getViolationsRequestKey(params: {
  search?: string;
  month?: string | number;
  year?: string | number;
  page?: number;
  per_page?: number;
}): string {
  return JSON.stringify({
    search: params.search?.trim() ?? "",
    month:
      params.month === undefined || params.month === ""
        ? ""
        : String(params.month),
    year:
      params.year === undefined || params.year === "" ? "" : String(params.year),
    page: params.page ?? 1,
    per_page: params.per_page ?? 10,
  });
}

async function getMyViolationsRequest(
  params: {
    search?: string;
    month?: string | number;
    year?: string | number;
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
  sanction?: string | null;
  document_url?: string | null;
  document_path?: string | null;
  document_name?: string | null;
  /** From API when available — drives “new / updated” row tint. */
  updated_at?: string | null;
  created_at?: string | null;
};

/** YYYY-MM for `/myMemorandumViolations`, which filters `month` as a year-month. */
function selectedYearMonth(month: string, year: string): string {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isFinite(m) || m < 1 || m > 12 || !Number.isFinite(y)) return "";
  return `${y}-${String(m).padStart(2, "0")}`;
}

function violationDateToYearMonth(violationDate: string): string | null {
  const v = violationDate?.trim();
  if (!v) return null;
  const iso = v.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function rowMatchesPeriod(row: MemorandumViolationRow, yearMonth: string): boolean {
  if (!yearMonth) return true;
  return violationDateToYearMonth(row.violation_date) === yearMonth;
}

/** Calendar year from a violation_date string. */
function yearFromViolationDateString(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-\d{2}-\d{2}/);
  if (m) {
    const y = parseInt(m[1], 10);
    if (y >= 1990 && y <= 2100) return y;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const y = new Date(t).getFullYear();
    if (y >= 1990 && y <= 2100) return y;
  }
  return null;
}

function parseYearValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const y = Math.trunc(value);
    if (y >= 1990 && y <= 2100) return y;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const y = parseInt(value.trim(), 10);
    if (Number.isFinite(y) && y >= 1990 && y <= 2100) return y;
  }
  return null;
}

/** Parse API `years` list, e.g. `[{ "years": 2026 }]`. */
function extractYearsFromViolationResponse(raw: unknown): number[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const payload =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;

  const sources = [root.years, payload.years, root.available_years, payload.available_years];
  const found = new Set<number>();

  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      if (item == null) continue;
      if (typeof item === "object") {
        const row = item as Record<string, unknown>;
        const y = parseYearValue(row.years ?? row.year ?? row.value);
        if (y !== null) found.add(y);
        continue;
      }
      const y = parseYearValue(item);
      if (y !== null) found.add(y);
    }
  }

  return Array.from(found).sort((a, b) => b - a);
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
  const sanction =
    (r.sanction as string | undefined) ??
    (r.penalty as string | undefined) ??
    (r.disciplinary_action as string | undefined) ??
    (r.punishment as string | undefined) ??
    null;
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
      (r.offense as string) ??
      (r.summary as string) ??
      (r.violation_summary as string) ??
      (r.description as string) ??
      null,
    sanction,
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

async function loadMyViolationsForPeriod(params: {
  search: string;
  yearMonth: string;
  page: number;
  perPage: number;
  force?: boolean;
}): Promise<{
  raw: unknown;
  rows: MemorandumViolationRow[];
  total: number;
  lastPage: number;
}> {
  const filteredRaw = await getMyViolationsRequest(
    {
      search: params.search,
      month: params.yearMonth,
      page: params.page,
      per_page: params.perPage,
    },
    { force: params.force }
  );
  const filtered = normalizeViolationsResponse(filteredRaw);
  const inPeriod = filtered.rows.filter((row) =>
    rowMatchesPeriod(row, params.yearMonth)
  );
  const serverHonoredPeriod =
    filtered.rows.length === 0 || inPeriod.length === filtered.rows.length;

  if (serverHonoredPeriod && (filtered.rows.length > 0 || filtered.total > 0)) {
    return {
      raw: filteredRaw,
      rows: inPeriod,
      total: filtered.total,
      lastPage: filtered.lastPage,
    };
  }

  const matched: MemorandumViolationRow[] = [];
  let scanPage = 1;
  let scanLast = 1;
  let scanRaw: unknown = filteredRaw;
  do {
    const raw = await getMyViolationsRequest(
      {
        search: params.search,
        month: "",
        page: scanPage,
        per_page: MY_VIOLATIONS_SCAN_PER_PAGE,
      },
      { force: params.force }
    );
    scanRaw = raw;
    const pageResult = normalizeViolationsResponse(raw);
    scanLast = Math.max(1, pageResult.lastPage);
    for (const row of pageResult.rows) {
      if (rowMatchesPeriod(row, params.yearMonth)) matched.push(row);
    }
    if (pageResult.rows.length === 0 || pageResult.lastPage <= 1) break;
    scanPage += 1;
  } while (scanPage <= scanLast && scanPage <= MY_VIOLATIONS_SCAN_MAX_PAGES);

  const page = Math.max(1, params.page);
  const start = (page - 1) * params.perPage;
  return {
    raw: scanRaw,
    rows: matched.slice(start, start + params.perPage),
    total: matched.length,
    lastPage: Math.max(1, Math.ceil(matched.length / params.perPage)),
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
  const [monthFilter, setMonthFilter] = useState<string>(() =>
    String(new Date().getMonth() + 1)
  );
  const [yearFilter, setYearFilter] = useState<string>(() =>
    String(new Date().getFullYear())
  );
  const [apiYears, setApiYears] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewingRow, setViewingRow] = useState<MemorandumViolationRow | null>(
    null
  );
  const itemsPerPage = 10;

  const listContextKey = useMemo(
    () =>
      `${currentPage}|${debouncedSearch}|${monthFilter}|${yearFilter}|${itemsPerPage}`,
    [currentPage, debouncedSearch, monthFilter, yearFilter, itemsPerPage]
  );

  const periodLabel = useMemo(() => {
    const m = Number(monthFilter);
    const name =
      Number.isFinite(m) && m >= 1 && m <= 12 ? MONTH_NAMES[m - 1] : "Selected month";
    return `${name} ${yearFilter}`;
  }, [monthFilter, yearFilter]);

  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    for (const y of apiYears) set.add(y);
    const yf = Number(yearFilter);
    if (Number.isFinite(yf) && yf >= 1990 && yf <= 2100) set.add(yf);
    for (const row of rows) {
      const y = yearFromViolationDateString(row.violation_date);
      if (y !== null) set.add(y);
    }
    if (apiYears.length === 0) {
      const current = new Date().getFullYear();
      for (let y = current; y >= current - 5; y--) set.add(y);
    }
    const list = Array.from(set).sort((a, b) => b - a);
    return list.length > 0 ? list : [new Date().getFullYear()];
  }, [apiYears, rows, yearFilter]);

  const isSearchPending = searchTerm.trim() !== debouncedSearch;

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

  const loadRequestIdRef = useRef(0);
  const clientActivityAtRef = useRef<Map<string, number>>(new Map());
  const previousRowsByIdRef = useRef<Map<string, string>>(new Map());
  const lastListContextRef = useRef<string | null>(null);
  const [highlightRev, setHighlightRev] = useState(0);

  const listBusy = loading || refreshing;
  const showInitialSkeleton = loading && !refreshing;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  const load = useCallback(
    async (options?: { softRefresh?: boolean }) => {
      const soft = options?.softRefresh === true;
      const requestId = ++loadRequestIdRef.current;
      let keepBusyForYearAdjust = false;
      if (soft) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const yearMonth = selectedYearMonth(monthFilter, yearFilter);
        const loaded = await loadMyViolationsForPeriod({
          search: debouncedSearch,
          yearMonth,
          page: currentPage,
          perPage: itemsPerPage,
          force: soft,
        });
        if (requestId !== loadRequestIdRef.current) return;
        const yearsFromApi = extractYearsFromViolationResponse(loaded.raw);
        if (yearsFromApi.length > 0) {
          setApiYears(yearsFromApi);
          const requestedYear = Number(yearFilter);
          if (!yearsFromApi.includes(requestedYear)) {
            keepBusyForYearAdjust = true;
            setYearFilter(String(yearsFromApi[0]));
            return;
          }
        }
        const { rows: next, total: tot, lastPage } = loaded;
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
        if (requestId !== loadRequestIdRef.current || keepBusyForYearAdjust) {
          return;
        }
        if (soft) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [debouncedSearch, monthFilter, yearFilter, currentPage]
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
                Memorandum violations recorded by HR for{" "}
                <span className="font-medium text-white">{periodLabel}</span>. Search
                by title, or choose a month and year. Click a row to open full
                details and attachments.
              </CardDescription>
            </div>
          </div>
        </div>
        <CardContent className="relative space-y-4 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white pt-6">
          {listBusy ? (
            <SmctLoadingOverlay
              label={
                refreshing && !loading
                  ? "Refreshing violations…"
                  : "Loading violations…"
              }
            />
          ) : null}
          <div
            className={cn(
              "space-y-4",
              listBusy && "pointer-events-none opacity-40"
            )}
          >
          <div className="rounded-lg border border-slate-200/80 bg-white/90 p-2.5 shadow-sm backdrop-blur-sm sm:rounded-xl sm:p-3">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between lg:gap-3">
              <div className="grid w-full min-w-0 flex-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-12 lg:items-end">
                <div className="space-y-1 sm:col-span-2 lg:col-span-5">
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor="violations-search"
                      className="text-[0.7rem] font-medium text-slate-700 sm:text-xs"
                    >
                      Search
                    </Label>
                    {isSearchPending ? (
                      <span className="text-[0.6rem] text-muted-foreground sm:text-[0.65rem]">
                        Updating…
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:left-2.5"
                      aria-hidden
                    />
                    <Input
                      id="violations-search"
                      placeholder="Title, offense…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 w-full min-w-0 pl-7 pr-7 text-xs sm:h-9 sm:pl-8 sm:pr-8 sm:text-sm"
                      autoComplete="off"
                    />
                    {searchTerm ? (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
                        onClick={() => setSearchTerm("")}
                        aria-label="Clear search"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-1 lg:col-span-3">
                  <Label className="text-[0.7rem] font-medium text-slate-700 sm:text-xs">
                    Month
                  </Label>
                  <Select
                    value={monthFilter}
                    onValueChange={(v) => {
                      setMonthFilter(v);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full cursor-pointer bg-white text-xs sm:h-9 sm:text-sm">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, idx) => (
                        <SelectItem
                          key={name}
                          value={String(idx + 1)}
                          className="cursor-pointer"
                        >
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-[0.7rem] font-medium text-slate-700 sm:text-xs">
                    Year
                  </Label>
                  <Select
                    value={yearFilter}
                    onValueChange={(v) => {
                      setYearFilter(v);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full cursor-pointer bg-white text-xs sm:h-9 sm:text-sm">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)} className="cursor-pointer">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-1 lg:w-auto lg:items-end">
                <Label className="text-[0.7rem] font-medium text-slate-700 sm:text-xs lg:sr-only">
                  Actions
                </Label>
                <Button
                  type="button"
                  disabled={listBusy}
                  onClick={() => load({ softRefresh: true })}
                  className="h-8 w-full cursor-pointer gap-1.5 bg-blue-600 px-3 text-xs text-white shadow-sm hover:bg-blue-700 hover:text-white lg:w-auto sm:h-9 sm:gap-2 sm:px-4 sm:text-sm disabled:opacity-70"
                  title="Reload violation list"
                >
                  <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                  {listBusy && loading ? "Loading…" : "Refresh"}
                </Button>
              </div>
            </div>
          </div>

          <ViolationRowHighlightLegend />

          <div
            className={cn(
              "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm sm:rounded-xl",
              listBusy && "min-h-[280px] border-blue-100 bg-slate-50/40"
            )}
          >
            <Table
              className={VIOLATION_SUMMARY_TABLE_CLASS}
              wrapperClassName="overflow-x-auto"
            >
              <TableHeader className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/95 shadow-[inset_0_-1px_0_0_rgb(226_232_240)] backdrop-blur-sm">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="min-w-[9rem] font-semibold text-slate-600 sm:min-w-[12rem]">
                    Title
                  </TableHead>
                  <TableHead className="min-w-[8rem] whitespace-nowrap font-semibold text-slate-600 sm:min-w-[10rem]">
                    Violation date
                  </TableHead>
                  <TableHead className="min-w-[8rem] font-semibold text-slate-600 sm:min-w-[11rem]">
                    Offense
                  </TableHead>
                  <TableHead className="min-w-[7rem] font-semibold sm:min-w-[9rem]">
                    <SanctionTableHeadLabel />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                className="[&_tr:nth-child(even)]:bg-slate-50/40"
                aria-busy={showInitialSkeleton}
              >
                {showInitialSkeleton ? (
                  Array.from({ length: itemsPerPage }).map((_, i) => (
                    <TableRow key={`sk-${i}`} className="border-0 hover:bg-transparent">
                      <TableCell>
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-44" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="p-0">
                      <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 text-center sm:gap-2 sm:py-5">
                        <img
                          src="/not-found.gif"
                          alt=""
                          width={112}
                          height={67}
                          className="mx-auto h-auto w-20 max-w-[26vw] object-contain drop-shadow sm:w-24"
                          decoding="async"
                        />
                        <div className="max-w-sm space-y-0.5 sm:max-w-md">
                          <p className="text-xs font-medium text-slate-800 sm:text-sm">
                            No records for {periodLabel}
                          </p>
                          <p className="text-[0.65rem] leading-relaxed text-slate-500 sm:text-xs">
                            Try another period, clear search, or refresh.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    void highlightRev;
                    const fullOffense = row.summary?.trim() ?? "";
                    const fullSanction = row.sanction?.trim() ?? "";
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
                        role="button"
                        tabIndex={0}
                        onClick={() => setViewingRow(row)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setViewingRow(row);
                          }
                        }}
                        className={cn(
                          "cursor-pointer border-slate-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2",
                          hl === "yellow" &&
                            "!bg-yellow-100/95 hover:!bg-yellow-100",
                          hl === "blue" &&
                            "!bg-blue-100/75 hover:!bg-blue-100/90",
                          hl === null && "hover:bg-blue-50/40"
                        )}
                      >
                        <TableCell className="max-w-[22rem] align-top">
                          <p className="font-medium leading-snug text-slate-900 sm:text-sm">
                            {row.title}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-[11rem] whitespace-nowrap align-top text-xs tabular-nums text-slate-600 sm:text-sm">
                          {formatViolationDate(row.violation_date)}
                        </TableCell>
                        <TableCell className="max-w-[20rem] break-words text-xs text-slate-700 sm:text-sm">
                          {fullOffense || "—"}
                        </TableCell>
                        <TableCell className="max-w-[16rem] break-words text-xs text-slate-700 sm:text-sm">
                          {fullSanction || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {!loading && !refreshing && total > 0 ? (
              <div className="border-t border-slate-100 bg-slate-50/50 px-1 py-1 sm:px-2">
                <EvaluationsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  total={total}
                  perPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            ) : null}
          </div>
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
                        Title, violation date, offense, sanction, and supporting document
                        for this memorandum record.
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
                          Offense
                        </div>
                        <div className="mt-3 rounded-xl border border-amber-100/90 bg-gradient-to-br from-amber-50/80 to-white px-4 py-4 ring-1 ring-amber-100/40">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                            {viewingRow.summary?.trim() || "No offense recorded."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-8 border-t border-slate-100 pt-8">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200/90">
                            <Scale className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          Sanction
                        </div>
                        <div className="mt-3 rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white px-4 py-4 ring-1 ring-slate-200/60">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                            {viewingRow.sanction?.trim() || "No sanction recorded."}
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
        </CardContent>
      </Card>
    </div>
  );
}
