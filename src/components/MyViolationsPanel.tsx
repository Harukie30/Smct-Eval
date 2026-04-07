"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Download,
  ExternalLink,
  Eye,
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
import { CONFIG } from "../../config/config";
import { memorandumDocumentTypeLabel } from "@/lib/memorandumDocumentType";

/** Pages to scan when building the month filter (per_page × this ≈ max rows considered). */
const MONTH_FILTER_PER_PAGE = 500;
const MONTH_FILTER_MAX_PAGES = 40;

export type MemorandumViolationRow = {
  id: number | string;
  title: string;
  violation_date: string;
  document_url?: string | null;
  document_path?: string | null;
  document_name?: string | null;
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
    document_url: (r.document_url as string) ?? (r.url as string) ?? null,
    document_path: path,
    document_name: docName || fileFromPath || null,
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

function resolveDocumentHref(row: MemorandumViolationRow): string | null {
  const u = row.document_url?.trim();
  if (u) {
    if (/^https?:\/\//i.test(u)) return u;
    const base = CONFIG.API_URL?.replace(/\/$/, "") ?? "";
    return `${base}${u.startsWith("/") ? u : `/${u}`}`;
  }
  const p = row.document_path?.trim();
  if (p) {
    const storage = (CONFIG.API_URL_STORAGE ?? CONFIG.API_URL)?.replace(/\/$/, "") ?? "";
    return `${storage}/${p.replace(/^\//, "")}`;
  }
  return null;
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

function displayFileName(row: MemorandumViolationRow, href: string | null): string {
  if (row.document_name?.trim()) return row.document_name.trim();
  if (!href) return "";
  try {
    const u = new URL(href, "https://example.com");
    const seg = u.pathname.split("/").filter(Boolean).pop();
    return seg ? decodeURIComponent(seg) : href;
  } catch {
    const seg = href.split("/").filter(Boolean).pop();
    return seg ? decodeURIComponent(seg) : href;
  }
}

function isLikelyImageHref(href: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(href);
}

function isLikelyPdfHref(href: string): boolean {
  return /\.pdf(\?|#|$)/i.test(href);
}

function safeDownloadFileName(
  row: MemorandumViolationRow,
  href: string
): string {
  const raw = displayFileName(row, href).trim() || "memorandum-attachment";
  const cleaned = raw.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ");
  return cleaned.slice(0, 180) || "download";
}

export default function MyViolationsPanel() {
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

  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [monthsLoading, setMonthsLoading] = useState(true);

  const fetchAvailableMonths = useCallback(async () => {
    setMonthsLoading(true);
    try {
      const ymSet = new Set<string>();
      let page = 1;
      let lastPage = 1;
      do {
        const raw = await apiService.getMyMemorandumViolations({
          search: "",
          month: "",
          page,
          per_page: MONTH_FILTER_PER_PAGE,
        });
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

  const viewDocumentHref = viewingRow ? resolveDocumentHref(viewingRow) : null;
  const viewFileLabel = useMemo(() => {
    if (!viewingRow || !viewDocumentHref) return "";
    return displayFileName(viewingRow, viewDocumentHref);
  }, [viewingRow, viewDocumentHref]);
  const viewAttachmentKind = useMemo((): "image" | "pdf" | "other" | null => {
    if (!viewDocumentHref) return null;
    if (isLikelyImageHref(viewDocumentHref)) return "image";
    if (isLikelyPdfHref(viewDocumentHref)) return "pdf";
    return "other";
  }, [viewDocumentHref]);

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
      if (soft) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const raw = await apiService.getMyMemorandumViolations({
          search: debouncedSearch,
          month: monthFilter === "all" ? "" : monthFilter,
          page: currentPage,
          per_page: itemsPerPage,
        });
        const { rows: next, total: tot, lastPage } =
          normalizeViolationsResponse(raw);
        setRows(next);
        setTotal(tot);
        setTotalPages(lastPage);
      } catch (e: unknown) {
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
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 w-full flex-1 space-y-2 sm:max-w-md">
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
            <div className="w-full min-w-0 space-y-2 sm:w-auto sm:min-w-[14rem]">
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
                disabled={monthsLoading}
              />
            </div>
            <div className="flex w-full items-end justify-end sm:w-auto sm:shrink-0">
              <div className="space-y-2">
                <Label className="text-sm font-medium sr-only sm:not-sr-only">
                  Refresh list
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || refreshing}
                  onClick={() => {
                    void fetchAvailableMonths();
                    load({ softRefresh: true });
                  }}
                  className="w-full cursor-pointer bg-blue-500 text-white hover:bg-blue-600 hover:text-white gap-2 sm:w-auto"
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

          <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-blue-900/10 bg-gradient-to-r from-blue-600 to-blue-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700">
                  <TableHead className="min-w-[10rem] font-semibold text-white">
                    Title
                  </TableHead>
                  <TableHead className="min-w-[8rem] whitespace-nowrap font-semibold text-white">
                    Violation date
                  </TableHead>
                  <TableHead className="min-w-[6rem] font-semibold text-white">
                    Type
                  </TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-right font-semibold text-white">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`} className="border-slate-100">
                      <TableCell>
                        <Skeleton className="h-5 w-full max-w-[240px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-8 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-14 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <FileWarning className="h-6 w-6" />
                        </div>
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
                    const href = resolveDocumentHref(row);
                    const docType = memorandumDocumentTypeLabel(
                      row.document_name,
                      row.document_path,
                      row.document_url,
                      href
                    );
                    return (
                      <TableRow
                        key={String(row.id)}
                        className="border-slate-100 transition-colors hover:bg-blue-50/50"
                      >
                        <TableCell className="max-w-[20rem] font-medium text-slate-900">
                          <span className="line-clamp-2">{row.title}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-slate-600">
                          {formatViolationDate(row.violation_date)}
                        </TableCell>
                        <TableCell className="text-slate-800">
                          <span className="text-sm font-medium">{docType}</span>
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
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <Dialog
            open={!!viewingRow}
            onOpenChangeAction={(open) => {
              if (!open) setViewingRow(null);
            }}
          >
            <DialogContent className="max-h-[90vh] max-w-lg gap-0 overflow-hidden p-0 sm:max-w-xl">
              <div
                className="relative overflow-hidden px-6 pt-6 pb-5 text-white"
                style={{
                  backgroundImage: "url(/smct.png)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/95 via-orange-600/92 to-amber-800/95" />
                <div className="relative flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner ring-1 ring-white/30 backdrop-blur-sm">
                    <FileWarning className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <DialogTitle className="text-left text-xl font-semibold tracking-tight text-white drop-shadow-sm">
                      Violation details
                    </DialogTitle>
                    <DialogDescription className="text-left text-sm leading-relaxed text-amber-50/95">
                      Title, date, and supporting document for this memorandum.
                    </DialogDescription>
                  </div>
                </div>
              </div>

              {viewingRow ? (
                <>
                  <div className="max-h-[min(70vh,calc(90vh-12rem))] space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50/90 to-white px-6 py-5">
                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <div className="flex gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Title
                          </p>
                          <p className="mt-1 text-base font-semibold leading-snug text-slate-900">
                            {viewingRow.title}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <div className="flex gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Violation date
                          </p>
                          <p className="mt-1 text-base font-semibold text-slate-900">
                            {formatViolationDateLong(viewingRow.violation_date)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {viewFileLabel || viewDocumentHref ? (
                      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Supporting document
                          </p>
                          <p className="mt-0.5 truncate text-sm font-medium text-slate-800">
                            {viewFileLabel || "Attachment"}
                          </p>
                        </div>
                        <div className="p-4">
                          {!viewDocumentHref && viewFileLabel ? (
                            <p className="text-sm text-slate-600">
                              Preview link unavailable for this attachment.
                            </p>
                          ) : null}
                          {viewDocumentHref && viewAttachmentKind === "image" ? (
                            <div className="overflow-hidden rounded-lg bg-slate-100/80 ring-1 ring-slate-200/60">
                              <img
                                src={viewDocumentHref}
                                alt={viewFileLabel || "Violation attachment"}
                                className="mx-auto max-h-[min(320px,45vh)] w-full object-contain"
                              />
                            </div>
                          ) : null}
                          {viewDocumentHref && viewAttachmentKind === "pdf" ? (
                            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-amber-200/90 bg-amber-50/50 px-4 py-8 text-center">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-amber-100">
                                <FileType2 className="h-7 w-7 text-amber-700" />
                              </div>
                              <p className="text-sm font-medium text-slate-800">
                                PDF document
                              </p>
                              <p className="max-w-xs text-xs text-slate-600">
                                Open in a new tab to view or download a copy.
                              </p>
                            </div>
                          ) : null}
                          {viewDocumentHref && viewAttachmentKind === "other" ? (
                            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                              <FileType2 className="h-5 w-5 shrink-0 text-slate-500" />
                              <span>
                                Preview not available — open or download the
                                file.
                              </span>
                            </div>
                          ) : null}
                          {viewDocumentHref ? (
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                              <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
                                asChild
                              >
                                <a
                                  href={viewDocumentHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Open in new tab
                                </a>
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="cursor-pointer"
                                asChild
                              >
                                <a
                                  href={viewDocumentHref}
                                  download={safeDownloadFileName(
                                    viewingRow,
                                    viewDocumentHref
                                  )}
                                >
                                  <Download className="h-4 w-4" />
                                  Download
                                </a>
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-600">
                        No supporting file on record for this violation.
                      </div>
                    )}
                  </div>

                  <DialogFooter className="border-t border-slate-200/80 bg-slate-50/90 px-6 py-4">
                    <Button
                      type="button"
                      className="cursor-pointer bg-amber-600 text-white hover:bg-amber-700"
                      onClick={() => setViewingRow(null)}
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </>
              ) : null}
            </DialogContent>
          </Dialog>

          {!loading && total > 0 ? (
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
