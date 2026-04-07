"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Eye, FileDown, RefreshCw, Search } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiService } from "@/lib/apiService";
import { toastMessages } from "@/lib/toastMessages";
import { CONFIG } from "../../config/config";

export type MemorandumViolationRow = {
  id: number | string;
  title: string;
  violation_date: string;
  document_url?: string | null;
  document_path?: string | null;
  document_name?: string | null;
};

function buildMonthComboboxOptions() {
  const opts: { value: string; label: string }[] = [
    { value: "all", label: "All dates" },
  ];
  const now = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    opts.push({ value: ym, label });
  }
  return opts;
}

function mapViolationRow(r: Record<string, unknown>): MemorandumViolationRow {
  return {
    id: (r.id as number | string) ?? Math.random(),
    title: String(r.title ?? r.subject ?? "—"),
    violation_date: String(r.violation_date ?? r.date ?? ""),
    document_url: (r.document_url as string) ?? (r.url as string) ?? null,
    document_path:
      (r.document_path as string) ?? (r.document as string) ?? null,
    document_name:
      (r.document_name as string) ??
      (r.file_name as string) ??
      (r.original_name as string) ??
      null,
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

  const monthOptions = useMemo(() => buildMonthComboboxOptions(), []);

  const viewDocumentHref = viewingRow ? resolveDocumentHref(viewingRow) : null;
  const viewFileLabel = useMemo(() => {
    if (!viewingRow || !viewDocumentHref) return "";
    return displayFileName(viewingRow, viewDocumentHref);
  }, [viewingRow, viewDocumentHref]);
  const showImagePreview =
    !!viewDocumentHref && isLikelyImageHref(viewDocumentHref);
  const showPdfPreview =
    !!viewDocumentHref && isLikelyPdfHref(viewDocumentHref);

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
      <Card>
        <CardHeader>
          <CardTitle>My violations</CardTitle>
          <CardDescription>
            Memorandum violations recorded by HR. Use search and month to narrow the list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                placeholder="Pick a month"
                searchPlaceholder="Search month…"
                emptyText="No month found."
                className="w-full min-w-0"
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
                  onClick={() => load({ softRefresh: true })}
                  className="w-full cursor-pointer gap-2 sm:w-auto"
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

          <div className="relative overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="min-w-[10rem]">Title</TableHead>
                  <TableHead className="min-w-[8rem] whitespace-nowrap">
                    Violation date
                  </TableHead>
                  <TableHead className="min-w-[8rem]">Document</TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
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
                      className="py-12 text-center text-muted-foreground"
                    >
                      No violations found
                      {debouncedSearch || monthFilter !== "all"
                        ? " for the current filters."
                        : "."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const href = resolveDocumentHref(row);
                    return (
                      <TableRow key={String(row.id)}>
                        <TableCell className="font-medium text-foreground">
                          {row.title}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatViolationDate(row.violation_date)}
                        </TableCell>
                        <TableCell>
                          {href ? (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1"
                              >
                                Open
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer gap-1"
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
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Violation details</DialogTitle>
              </DialogHeader>
              {viewingRow ? (
                <div className="space-y-4 pt-1 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Title
                    </span>
                    <p className="mt-1 text-foreground">{viewingRow.title}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Violation date
                    </span>
                    <p className="mt-1 text-foreground">
                      {formatViolationDateLong(viewingRow.violation_date)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Supporting file
                    </span>
                    {viewDocumentHref ? (
                      <>
                        <p className="mt-1 break-all text-foreground">
                          {viewFileLabel || "Attachment"}
                        </p>
                        {showImagePreview ? (
                          <img
                            src={viewDocumentHref}
                            alt={viewFileLabel || "Violation attachment"}
                            className="mt-2 max-h-[min(60vh,420px)] w-full max-w-full rounded-md border bg-muted/30 object-contain"
                          />
                        ) : null}
                        {showPdfPreview ? (
                          <iframe
                            title={viewFileLabel || "PDF attachment"}
                            src={viewDocumentHref}
                            className="mt-2 h-[min(70vh,520px)] w-full rounded-md border bg-muted/50"
                          />
                        ) : null}
                        {!showImagePreview && !showPdfPreview ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            In-modal preview isn’t available for this file type.
                            Use <strong>Download</strong> or{" "}
                            <strong>Open in new tab</strong> below.
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="cursor-pointer gap-1.5"
                            asChild
                          >
                            <a
                              href={viewDocumentHref}
                              download={safeDownloadFileName(
                                viewingRow,
                                viewDocumentHref
                              )}
                              className="inline-flex items-center"
                            >
                              <FileDown className="h-4 w-4" />
                              Download
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer gap-1.5"
                            asChild
                          >
                            <a
                              href={viewDocumentHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center"
                            >
                              Open in new tab
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="mt-1 text-muted-foreground">No file on record.</p>
                    )}
                  </div>
                  <div className="flex justify-end border-t pt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setViewingRow(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
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
