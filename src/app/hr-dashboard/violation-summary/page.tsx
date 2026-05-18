"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import apiService from "@/lib/apiService";
import { toastMessages } from "@/lib/toastMessages";
import { FileType, FileWarning, Loader2, RefreshCw, Search } from "lucide-react";
import EvaluationsPagination from "@/components/paginationComponent";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";

/** Rows requested from the API (server may cap). */
const API_FETCH_PER_PAGE = 100;
/** Pages to pull when exporting a month/year (each page up to `EXPORT_FETCH_PER_PAGE`). */
const EXPORT_FETCH_PER_PAGE = 100;
const EXPORT_MAX_PAGES = 50;
/** Rows shown per page in the table UI. */
const TABLE_PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 400;

type ViolationSummaryRow = {
  id: string;
  employeeName: string;
  violationTitle: string;
  violationDate: string;
  offense: string;
  sanction: string;
};

/** Calendar year from a violation_date / date string in the table row. */
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

/** Strip leading/trailing ISO date-time blobs often appended to API `title` fields. */
function violationTitleWithoutEmbeddedDate(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const isoTail =
    /\s*[-–—|]\s*\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z)?)?\s*$/i;
  const isoHead =
    /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z)?)?\s*[-–—|]\s*/i;
  const isoLooseTail =
    /\s+\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z)?)?\s*$/i;
  const out = t.replace(isoTail, "").replace(isoHead, "").replace(isoLooseTail, "").trim();
  return out || t;
}

function displayNameFromUser(u: Record<string, unknown>): string {
  const fn = String(u.fname ?? "").trim();
  const ln = String(u.lname ?? "").trim();
  const full = String(u.full_name ?? "").trim();
  const email = String(u.email ?? "").trim();
  return full || `${fn} ${ln}`.trim() || email || "Unknown";
}

/** Aligns with `showUserMemorandumViolation` / MyViolations-style payloads. */
function extractViolationRecords(raw: unknown): Record<string, unknown>[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const payload = (root.data ?? root) as Record<string, unknown>;

  if (Array.isArray(root.memos)) return root.memos as Record<string, unknown>[];
  if (root.memos && typeof root.memos === "object" && !Array.isArray(root.memos)) {
    const memos = root.memos as Record<string, unknown>;
    if (Array.isArray(memos.data)) return memos.data as Record<string, unknown>[];
  }
  if (Array.isArray(root.violations)) return root.violations as Record<string, unknown>[];
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (Array.isArray(payload.data)) return payload.data as Record<string, unknown>[];
  return [];
}

function employeeNameFromViolationRow(r: Record<string, unknown>): string {
  const nested =
    r.user && typeof r.user === "object"
      ? (r.user as Record<string, unknown>)
      : null;
  if (nested) return displayNameFromUser(nested);
  const emp =
    r.employee && typeof r.employee === "object"
      ? (r.employee as Record<string, unknown>)
      : null;
  if (emp) return displayNameFromUser(emp);
  const s = String(
    r.employee_name ??
      r.employeeName ??
      r.full_name ??
      r.user_name ??
      r.name ??
      ""
  ).trim();
  return s || "—";
}

function userIdForAggregatedRow(r: Record<string, unknown>): string {
  const uid = r.user_id ?? r.employee_id;
  if (uid != null && String(uid).trim() !== "") return String(uid);
  const nested = r.user;
  if (nested && typeof nested === "object") {
    const id = (nested as Record<string, unknown>).id;
    if (id != null) return String(id);
  }
  const emp = r.employee;
  if (emp && typeof emp === "object") {
    const id = (emp as Record<string, unknown>).id;
    if (id != null) return String(id);
  }
  const vid = r.id ?? r.memo_id ?? r.violation_id;
  return vid != null ? String(vid) : "0";
}

function mapAggregatedRecordToRow(r: Record<string, unknown>): ViolationSummaryRow | null {
  const vid = r.id ?? r.memo_id ?? r.violation_id;
  if (vid == null) return null;
  const employeeName = employeeNameFromViolationRow(r);
  const userId = userIdForAggregatedRow(r);
  const rawTitle = String(
    r.title ?? r.subject ?? r.violation_title ?? r["violaion_title"] ?? "—"
  ).trim();
  const title =
    violationTitleWithoutEmbeddedDate(rawTitle) || (rawTitle || "—");
  const violationDate = String(r.violation_date ?? r.date ?? "").trim();
  const offense =
    String(r.offense ?? r.summary ?? r.violation_summary ?? r.description ?? "").trim() ||
    "—";
  const sanction =
    String(
      r.sanction ?? r.penalty ?? r.disciplinary_action ?? r.punishment ?? ""
    ).trim() || "—";

  return {
    id: `${userId}-${String(vid)}`,
    employeeName,
    violationTitle: title || "—",
    violationDate,
    offense,
    sanction,
  };
}

function mapMemorandumViolationsResponse(raw: unknown): ViolationSummaryRow[] {
  const records = extractViolationRecords(raw);
  const out: ViolationSummaryRow[] = [];
  for (const rec of records) {
    const row = mapAggregatedRecordToRow(rec);
    if (row) out.push(row);
  }
  out.sort((a, b) => {
    const byName = a.employeeName.localeCompare(b.employeeName);
    if (byName !== 0) return byName;
    return b.violationDate.localeCompare(a.violationDate);
  });
  return out;
}

function extractLastPageFromViolationResponse(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 1;
  const root = raw as Record<string, unknown>;
  const meta =
    root.meta && typeof root.meta === "object" && !Array.isArray(root.meta)
      ? (root.meta as Record<string, unknown>)
      : null;
  const lp = Number(
    root.last_page ?? root.lastPage ?? meta?.last_page ?? meta?.lastPage ?? 1
  );
  return Number.isFinite(lp) && lp >= 1 ? lp : 1;
}

/** Fetches every page for the given calendar month/year (for export). */
async function fetchAllViolationRowsForPeriod(
  month: string,
  year: string,
  perPage: number,
  maxPages: number
): Promise<ViolationSummaryRow[]> {
  const byId = new Map<string, ViolationSummaryRow>();
  let lastPage = 1;
  for (let p = 1; p <= Math.min(lastPage, maxPages); p++) {
    const raw = await apiService.getMemorandumViolations({
      search: "",
      per_page: perPage,
      month,
      year,
      page: p,
    });
    lastPage = extractLastPageFromViolationResponse(raw);
    for (const row of mapMemorandumViolationsResponse(raw)) {
      byId.set(row.id, row);
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const byName = a.employeeName.localeCompare(b.employeeName);
    if (byName !== 0) return byName;
    return b.violationDate.localeCompare(a.violationDate);
  });
}

function exportViolationSummaryRowsToCsv(
  rows: readonly ViolationSummaryRow[],
  fileBaseName: string
): void {
  const rowsJson = rows.map((r) => ({
    Employee: r.employeeName,
    Violation: r.violationTitle,
    Offense: r.offense,
    Sanction: r.sanction,
  }));
  const ws = XLSX.utils.json_to_sheet(rowsJson);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const safe = fileBaseName.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 48);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe || "violation-summary"}_${stamp}.csv`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

export default function ViolationSummaryPage() {
  const now = new Date();
  const [rows, setRows] = useState<ViolationSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>(String(now.getMonth() + 1));
  const [yearFilter, setYearFilter] = useState<string>(String(now.getFullYear()));
  const [page, setPage] = useState(1);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportModalMonth, setExportModalMonth] = useState(String(now.getMonth() + 1));
  const [exportModalYear, setExportModalYear] = useState(String(now.getFullYear()));
  const [exportBusy, setExportBusy] = useState(false);
  const violationExportSuccessDialogAnimationClass = useDialogAnimation({
    duration: 0.4,
  });
  const [showViolationExportSuccess, setShowViolationExportSuccess] = useState(false);
  const [violationExportSuccessDescription, setViolationExportSuccessDescription] =
    useState("");

  const periodLabel = useMemo(() => {
    const m = Number(monthFilter);
    const name =
      Number.isFinite(m) && m >= 1 && m <= 12 ? MONTH_NAMES[m - 1] : "Selected month";
    return `${name} ${yearFilter}`;
  }, [monthFilter, yearFilter]);

  const yearsFromTable = useMemo(() => {
    const set = new Set<number>();
    const yf = Number(yearFilter);
    if (Number.isFinite(yf) && yf >= 1990 && yf <= 2100) {
      set.add(yf);
    }
    for (const r of rows) {
      const y = yearFromViolationDateString(r.violationDate);
      if (y !== null) set.add(y);
    }
    const list = Array.from(set).sort((a, b) => b - a);
    return list.length > 0 ? list : [new Date().getFullYear()];
  }, [rows, yearFilter]);

  const isSearchPending = search.trim() !== debouncedSearch;
  const listBusy = loading || refreshing;

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / TABLE_PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (page - 1) * TABLE_PAGE_SIZE;
    return rows.slice(start, start + TABLE_PAGE_SIZE);
  }, [rows, page]);

  useEffect(() => {
    setPage((p) => (p > totalPages ? totalPages : p < 1 ? 1 : p));
  }, [totalPages]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (soft: boolean) => {
      if (!soft) setLoading(true);
      else setRefreshing(true);
      try {
        const raw = await apiService.getMemorandumViolations({
          search: debouncedSearch,
          per_page: API_FETCH_PER_PAGE,
          month: monthFilter,
          year: yearFilter,
        });
        const next = mapMemorandumViolationsResponse(raw);
        setRows(next);
        setPage(1);
      } catch (e) {
        console.error(e);
        setRows([]);
        toastMessages.generic.error(
          "Could not load violation summary",
          "Please try again or check your connection."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, monthFilter, yearFilter]
  );

  const openExportModal = useCallback(() => {
    setShowViolationExportSuccess(false);
    setExportModalMonth(monthFilter);
    setExportModalYear(yearFilter);
    setExportModalOpen(true);
  }, [monthFilter, yearFilter]);

  useEffect(() => {
    if (!showViolationExportSuccess) return;
    const id = window.setTimeout(() => setShowViolationExportSuccess(false), 3000);
    return () => window.clearTimeout(id);
  }, [showViolationExportSuccess]);

  const runExportCsv = useCallback(async () => {
    setExportBusy(true);
    try {
      const allRows = await fetchAllViolationRowsForPeriod(
        exportModalMonth,
        exportModalYear,
        EXPORT_FETCH_PER_PAGE,
        EXPORT_MAX_PAGES
      );
      const mNum = Number(exportModalMonth);
      const monthLabel =
        Number.isFinite(mNum) && mNum >= 1 && mNum <= 12 ? MONTH_NAMES[mNum - 1] : exportModalMonth;
      if (allRows.length === 0) {
        toastMessages.generic.warning(
          "No records",
          `No memorandum violations were found for ${monthLabel} ${exportModalYear}.`
        );
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const mm = exportModalMonth.padStart(2, "0");
      const base = `violations_${exportModalYear}_${mm}`;
      exportViolationSummaryRowsToCsv(allRows, base);
      setViolationExportSuccessDescription(
        `${allRows.length} row${allRows.length === 1 ? "" : "s"} for ${monthLabel} ${exportModalYear} have been downloaded.`
      );
      setExportModalOpen(false);
      setShowViolationExportSuccess(true);
    } catch (e) {
      console.error(e);
      toastMessages.generic.error(
        "Export failed",
        "Could not load all pages or create the file. Try again."
      );
    } finally {
      setExportBusy(false);
    }
  }, [exportModalMonth, exportModalYear]);

  useEffect(() => {
    void load(false);
  }, [load]);

  return (
    <div className="relative space-y-2 pb-4 sm:space-y-3 sm:pb-5">
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
              <FileWarning className="h-4 w-4 text-white sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <CardTitle className="border-0 text-base font-semibold tracking-tight text-white shadow-none sm:text-lg">
                  Violation summary
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="border-white/20 bg-white/15 py-0 text-[0.6rem] font-medium leading-tight text-white backdrop-blur-sm hover:bg-white/20 sm:text-[0.65rem]"
                >
                  HR
                </Badge>
              </div>
              <CardDescription className="max-w-xl text-xs leading-snug text-blue-50/95 sm:text-sm">
                Memorandum records for{" "}
                <span className="font-medium text-white">{periodLabel}</span>. Change filters
                below; each load replaces the list from the server.
              </CardDescription>
            </div>
          </div>
        </div>

        <CardContent className="space-y-3 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white pt-3 sm:space-y-3.5 sm:pt-4">
          <div className="rounded-lg border border-slate-200/80 bg-white/90 p-2.5 shadow-sm backdrop-blur-sm sm:rounded-xl sm:p-3">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between lg:gap-3">
              <div className="grid w-full min-w-0 flex-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-12 lg:items-end">
                <div className="space-y-1 sm:col-span-2 lg:col-span-5">
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor="violation-summary-search"
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
                      id="violation-summary-search"
                      placeholder="Name, title, offense…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 w-full min-w-0 pl-7 pr-7 text-xs sm:h-9 sm:pl-8 sm:pr-8 sm:text-sm"
                      autoComplete="off"
                    />
                    {search ? (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
                        onClick={() => setSearch("")}
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
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
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
                  <Label className="text-[0.7rem] font-medium text-slate-700 sm:text-xs">Year</Label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="h-8 w-full cursor-pointer bg-white text-xs sm:h-9 sm:text-sm">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearsFromTable.map((y) => (
                        <SelectItem key={y} value={String(y)} className="cursor-pointer">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-1 lg:w-auto lg:items-end">
                <Label className="text-[0.7rem] font-medium text-slate-700 lg:sr-only sm:text-xs">
                  Actions
                </Label>
                <div className="flex w-full gap-2 lg:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={openExportModal}
                    className="h-8 flex-1 cursor-pointer gap-1.5 border-slate-200 bg-green-600 text-white px-2 text-xs hover:bg-slate-50 lg:flex-initial hover:bg-green-700 hover:text-whitea lg:px-3 sm:h-9 sm:gap-2 sm:text-sm"
                    title="Export memorandum violations to CSV"
                  >
                    <FileType className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                   Export File
                  </Button>
                  <Button
                    type="button"
                    disabled={listBusy}
                    onClick={() => void load(true)}
                    className="h-8 flex-1 cursor-pointer gap-1.5 bg-blue-600 px-3 text-xs text-white shadow-sm hover:bg-blue-700 hover:text-white lg:flex-initial sm:h-9 sm:gap-2 sm:px-4 sm:text-sm disabled:opacity-70"
                    title="Reload violation list"
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", refreshing ? "animate-spin" : "")}
                      aria-hidden
                    />
                    {listBusy && loading ? "Loading…" : refreshing ? "Refreshing…" : "Refresh"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm sm:rounded-xl">
            {refreshing && !loading && rows.length > 0 ? (
              <div
                className="pointer-events-none absolute inset-0 z-[5] bg-white/50 backdrop-blur-[1px]"
                aria-hidden
              />
            ) : null}
            <Table
              className="[&_th]:h-auto [&_th]:min-h-8 [&_th]:px-2.5 [&_th]:py-2 [&_th]:align-middle [&_th]:text-[0.6rem] [&_th]:uppercase [&_th]:tracking-wide sm:[&_th]:min-h-9 sm:[&_th]:px-3 sm:[&_th]:py-2.5 sm:[&_th]:text-[0.65rem] [&_td]:min-w-0 [&_td]:px-2.5 [&_td]:py-2 [&_td]:align-top [&_td]:text-xs [&_td]:leading-snug sm:[&_td]:px-3 sm:[&_td]:py-2.5 sm:[&_td]:text-sm sm:[&_td]:leading-snug"
              wrapperClassName="overflow-x-auto"
            >
              <TableHeader className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/95 shadow-[inset_0_-1px_0_0_rgb(226_232_240)] backdrop-blur-sm">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="w-[min(11rem,24%)] font-semibold text-slate-600 sm:w-[min(14rem,22%)]">
                    Employee
                  </TableHead>
                  <TableHead className="min-w-[9rem] font-semibold text-slate-600 sm:min-w-[12rem]">
                    Violation
                  </TableHead>
                  <TableHead className="min-w-[8rem] font-semibold text-slate-600 sm:min-w-[11rem]">
                    Offense
                  </TableHead>
                  <TableHead className="min-w-[7rem] font-semibold text-slate-600 sm:min-w-[9rem]">
                    Sanction
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:nth-child(even)]:bg-slate-50/40">
                {loading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={`sk-${idx}`} className="hover:bg-transparent">
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-52" />
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
                          alt="No records found"
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
                  pageRows.map((r) => (
                    <TableRow
                      key={r.id}
                      className="border-slate-100 transition-colors hover:bg-blue-50/40"
                    >
                      <TableCell className="max-w-[14rem] align-top text-xs font-medium text-slate-900 sm:text-sm">
                        {r.employeeName}
                      </TableCell>
                      <TableCell className="max-w-[22rem] align-top">
                        <p className="font-medium leading-snug text-slate-900 sm:text-sm">
                          {r.violationTitle}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[20rem] break-words text-xs text-slate-700 sm:text-sm">
                        {r.offense}
                      </TableCell>
                      <TableCell className="max-w-[16rem] break-words text-xs text-slate-700 sm:text-sm">
                        {r.sanction}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {!loading && rows.length > 0 && totalPages > 1 ? (
              <div className="border-t border-slate-100 bg-slate-50/50 px-1 py-1 sm:px-2">
                <EvaluationsPagination
                  currentPage={page}
                  totalPages={totalPages}
                  total={totalRows}
                  perPage={TABLE_PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </div>

          {!loading ? (
            <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.65rem] leading-snug text-slate-500 sm:text-xs">
                {totalRows >= API_FETCH_PER_PAGE
                  ? `Up to ${API_FETCH_PER_PAGE} loaded from the server; more may exist. ${TABLE_PAGE_SIZE} per page.`
                  : totalRows === 0
                    ? "No rows in this result set."
                    : totalPages > 1
                      ? `${totalRows} memorandum${totalRows === 1 ? "" : "s"}, ${totalPages} pages (${TABLE_PAGE_SIZE}/page).`
                      : `${totalRows} memorandum${totalRows === 1 ? "" : "s"} (${TABLE_PAGE_SIZE}/page).`}
              </p>
              {rows.length > 0 ? (
                <Badge
                  variant="outline"
                  className="self-start border-slate-200 py-0 text-[0.65rem] sm:self-auto sm:text-xs"
                >
                  {totalRows} total
                </Badge>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={exportModalOpen} onOpenChangeAction={setExportModalOpen}>
        <DialogContent className="max-w-md overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <DialogTitle className="text-base sm:text-lg">Export File to xlsx</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed sm:text-sm">
              Choose month and year. 
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 sm:text-sm">Month</Label>
                <Select
                  value={exportModalMonth}
                  onValueChange={setExportModalMonth}
                  disabled={exportBusy}
                >
                  <SelectTrigger className="h-9 w-full bg-white text-sm">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, idx) => (
                      <SelectItem key={name} value={String(idx + 1)} className="cursor-pointer">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 sm:text-sm">Year</Label>
                <Select
                  value={exportModalYear}
                  onValueChange={setExportModalYear}
                  disabled={exportBusy}
                >
                  <SelectTrigger className="h-9 w-full bg-white text-sm">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearsFromTable.map((y) => (
                      <SelectItem key={y} value={String(y)} className="cursor-pointer">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto bg-red-600 text-white hover:bg-red-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:text-white active:translate-y-0"
              disabled={exportBusy}
              onClick={() => setExportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:text-white sm:w-auto"
              disabled={exportBusy}
              onClick={async () => {
                await runExportCsv();
              }}
            >
              {exportBusy ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <FileType className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {exportBusy ? "Working…" : "Download xlsx"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exporting overlay — same pattern as HR user management CSV export */}
      <Dialog open={exportBusy} onOpenChangeAction={() => {}}>
        <DialogContent className="max-w-xs p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <img
                src="/smct.png"
                alt="SMCT Logo"
                className="h-auto w-24 object-contain"
              />
            </div>
            <div className="mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-800">Exporting Data</h2>
            <p className="text-sm text-gray-500">
              Please wait while we prepare your file...
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV export success — same check animation as HR user management / memorandum save */}
      <Dialog
        open={showViolationExportSuccess}
        onOpenChangeAction={setShowViolationExportSuccess}
      >
        <DialogContent
          className={`max-w-sm w-[90vw] px-6 py-6 text-center ${violationExportSuccessDialogAnimationClass}`}
        >
          <DialogHeader className="border-0 pb-0 text-center sm:text-center">
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
              Export Successful
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              Your violation summary CSV has been downloaded.
              {violationExportSuccessDescription
                ? ` ${violationExportSuccessDescription}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center">
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
