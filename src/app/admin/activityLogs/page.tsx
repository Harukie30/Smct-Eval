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
import EvaluationsPagination from "@/components/paginationComponent";
import SmctLoadingOverlay from "@/components/SmctLoadingOverlay";
import apiService from "@/lib/apiService";
import { cn } from "@/lib/utils";
import { History, RefreshCw, Search, X } from "lucide-react";

const TABLE_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

type ActivityLogTypeFilter = "all" | "user" | "evaluation";

type ActivityLogRow = {
  id: number;
  action: string;
  subject_type: string;
  subject_id: number | null;
  subject_label: string;
  subject_meta: string | null;
  deleted_by_id: number | null;
  deleted_by_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

function formatLogDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hours since the deletion was logged (`created_at`). */
function hoursSinceDeleted(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60);
}

/** New = within 24h; Recent = 24h–7 days. */
function getDeletionRecency(
  raw: string | null | undefined
): "new" | "recent" | null {
  const hours = hoursSinceDeleted(raw);
  if (hours == null || hours < 0) return null;
  if (hours <= 24) return "new";
  if (hours <= 168) return "recent";
  return null;
}

function getActivityLogRowClassName(log: ActivityLogRow): string {
  const recency = getDeletionRecency(log.created_at);
  if (recency === "new") {
    return "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500 transition-colors";
  }
  if (recency === "recent") {
    return "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500 transition-colors";
  }
  return "border-slate-100 transition-colors hover:bg-blue-50/40";
}

function isUserDeleted(log: ActivityLogRow): boolean {
  return (
    log.action === "user_deleted" ||
    String(log.subject_type ?? "").toLowerCase() === "user"
  );
}

function typeBadge(log: ActivityLogRow) {
  if (isUserDeleted(log)) {
    return (
      <Badge className="border-rose-200/80 bg-rose-50 py-0 text-[0.65rem] font-medium text-rose-800 hover:bg-rose-50 sm:text-xs">
        Deleted User
      </Badge>
    );
  }
  return (
    <Badge className="border-amber-200/80 bg-amber-50 py-0 text-[0.65rem] font-medium text-amber-900 hover:bg-amber-50 sm:text-xs">
      Deleted Evaluation
    </Badge>
  );
}

function detailSummary(log: ActivityLogRow): string {
  const details = log.details ?? {};
  if (isUserDeleted(log)) {
    const email =
      (typeof details.email === "string" && details.email) ||
      log.subject_meta ||
      "";
    const empId =
      typeof details.emp_id === "string" || typeof details.emp_id === "number"
        ? String(details.emp_id)
        : "";
    return [email, empId ? `ID: ${empId}` : ""].filter(Boolean).join(" · ") || "—";
  }

  const employee =
    typeof details.employee_name === "string" ? details.employee_name : "";
  const evaluator =
    typeof details.evaluator_name === "string" ? details.evaluator_name : "";
  const status =
    (typeof details.status === "string" && details.status) ||
    log.subject_meta ||
    "";
  const parts = [
    employee ? `Employee: ${employee}` : "",
    evaluator ? `Evaluator: ${evaluator}` : "",
    status ? `Status: ${status}` : "",
  ].filter(Boolean);
  return parts.join(" · ") || "—";
}

function extractLogsPayload(raw: unknown): {
  rows: ActivityLogRow[];
  total: number;
  lastPage: number;
  perPage: number;
} {
  if (!raw || typeof raw !== "object") {
    return { rows: [], total: 0, lastPage: 1, perPage: TABLE_PAGE_SIZE };
  }
  const root = raw as Record<string, unknown>;
  const logs = (root.logs ?? root.data ?? root) as Record<string, unknown>;

  if (Array.isArray(logs)) {
    return {
      rows: logs as ActivityLogRow[],
      total: logs.length,
      lastPage: 1,
      perPage: TABLE_PAGE_SIZE,
    };
  }

  const data = Array.isArray(logs.data)
    ? (logs.data as ActivityLogRow[])
    : Array.isArray(root.data)
      ? (root.data as ActivityLogRow[])
      : [];

  return {
    rows: data,
    total: Number(logs.total ?? data.length) || 0,
    lastPage: Number(logs.last_page ?? 1) || 1,
    perPage: Number(logs.per_page ?? TABLE_PAGE_SIZE) || TABLE_PAGE_SIZE,
  };
}

function typeFilterLabel(filter: ActivityLogTypeFilter): string {
  if (filter === "user") return "deleted users";
  if (filter === "evaluation") return "deleted evaluations";
  return "all deletions";
}

export default function AdminActivityLogsPage() {
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityLogTypeFilter>("all");
  const [page, setPage] = useState(1);
  const [serverLastPage, setServerLastPage] = useState(1);
  const [serverTotal, setServerTotal] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isSearchPending = search.trim() !== debouncedSearch;
  const listBusy = loading || refreshing;

  const totalPages = Math.max(1, serverLastPage);
  const totalRows =
    serverTotal > 0
      ? serverTotal
      : rows.length > 0
        ? (serverLastPage - 1) * TABLE_PAGE_SIZE + rows.length
        : 0;

  useEffect(() => {
    setPage((p) => (p > totalPages ? totalPages : p < 1 ? 1 : p));
  }, [totalPages]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  const load = useCallback(
    async (soft: boolean) => {
      if (!soft) setLoading(true);
      else setRefreshing(true);
      setFetchError(null);
      try {
        const response = await apiService.getActivityLogs({
          search: debouncedSearch,
          type: typeFilter,
          page,
          per_page: TABLE_PAGE_SIZE,
        });
        const parsed = extractLogsPayload(response);
        setRows(parsed.rows);
        setServerLastPage(Math.max(1, parsed.lastPage));
        setServerTotal(parsed.total);
      } catch (err) {
        console.error("Failed to load activity logs", err);
        setRows([]);
        setServerLastPage(1);
        setServerTotal(0);
        setFetchError(
          "Unable to load activity logs. Make sure the API migration has been run."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, page, typeFilter]
  );

  useEffect(() => {
    void load(page > 1);
  }, [load, page]);

  const emptyTitle = useMemo(() => {
    if (fetchError) return "Could not load activity logs";
    if (debouncedSearch || typeFilter !== "all") {
      return "No matching deletion logs";
    }
    return "No deletion activity yet";
  }, [debouncedSearch, fetchError, typeFilter]);

  const emptyHint = useMemo(() => {
    if (fetchError) {
      return "Check your connection or confirm the activity_logs migration has been applied.";
    }
    if (debouncedSearch || typeFilter !== "all") {
      return "Try another filter, clear search, or refresh.";
    }
    return "Deleted users and evaluations will appear here after they are removed.";
  }, [debouncedSearch, fetchError, typeFilter]);

  const newCountOnPage = useMemo(
    () =>
      rows.filter((log) => getDeletionRecency(log.created_at) === "new").length,
    [rows]
  );
  const recentCountOnPage = useMemo(
    () =>
      rows.filter((log) => getDeletionRecency(log.created_at) === "recent")
        .length,
    [rows]
  );

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
              <History
                className="h-4 w-4 text-white sm:h-[1.125rem] sm:w-[1.125rem]"
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <CardTitle className="border-0 text-base font-semibold tracking-tight text-white shadow-none sm:text-lg">
                  Activity logs
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="border-white/20 bg-white/15 py-0 text-[0.6rem] font-medium leading-tight text-white backdrop-blur-sm hover:bg-white/20 sm:text-[0.65rem]"
                >
                  Admin
                </Badge>
              </div>
              <CardDescription className="max-w-xl text-xs leading-snug text-blue-50/95 sm:text-sm">
                Deleted users and evaluations for{" "}
                <span className="font-medium text-white">
                  {typeFilterLabel(typeFilter)}
                </span>
                . Filters and each table page reload data from the server.
              </CardDescription>
            </div>
          </div>
        </div>

        <CardContent className="relative space-y-3 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white pt-3 sm:space-y-3.5 sm:pt-4">
          {listBusy ? (
            <SmctLoadingOverlay
              label={
                refreshing && !loading
                  ? "Refreshing activity logs…"
                  : "Loading activity logs…"
              }
            />
          ) : null}
          <div
            className={cn(
              "space-y-3 sm:space-y-3.5",
              listBusy && "pointer-events-none opacity-40"
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {newCountOnPage > 0 ? (
                <Badge className="animate-pulse bg-yellow-500 text-white hover:bg-yellow-500">
                  {newCountOnPage} NEW
                </Badge>
              ) : null}
              {recentCountOnPage > 0 ? (
                <Badge className="bg-blue-500 text-white hover:bg-blue-500">
                  {recentCountOnPage} RECENT
                </Badge>
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-200/80 bg-slate-50/90 p-2.5 sm:p-3">
              <div className="flex flex-wrap items-center gap-2 text-[0.65rem] sm:gap-3 sm:text-xs">
                <span className="mr-1 w-full text-xs font-medium text-slate-700 sm:mr-2 sm:w-auto sm:text-sm">
                  Indicators:
                </span>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded border-l-2 border-l-yellow-500 bg-yellow-100" />
                  <Badge className="bg-yellow-200 text-xs text-yellow-800 hover:bg-yellow-200">
                    New
                  </Badge>
                  <span className="text-slate-500">≤ 24h</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded border-l-2 border-l-blue-500 bg-blue-50" />
                  <Badge className="bg-blue-300 text-xs text-blue-800 hover:bg-blue-300">
                    Recent
                  </Badge>
                  <span className="text-slate-500">≤ 7 days</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded border-l-2 border-l-rose-500 bg-rose-50" />
                  <Badge className="bg-rose-100 text-xs text-rose-800 hover:bg-rose-100">
                    Deleted User
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded border-l-2 border-l-amber-500 bg-amber-50" />
                  <Badge className="bg-amber-100 text-xs text-amber-900 hover:bg-amber-100">
                    Deleted Evaluation
                  </Badge>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200/80 bg-white/90 p-2.5 shadow-sm backdrop-blur-sm sm:rounded-xl sm:p-3">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between lg:gap-3">
                <div className="grid w-full min-w-0 flex-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-12 lg:items-end">
                  <div className="space-y-1 sm:col-span-2 lg:col-span-7">
                    <div className="flex items-center justify-between gap-2">
                      <Label
                        htmlFor="activity-logs-search"
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
                        id="activity-logs-search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, email, deleted by…"
                        className="h-8 w-full min-w-0 pl-7 pr-7 text-xs sm:h-9 sm:pl-8 sm:pr-8 sm:text-sm"
                      />
                      {search ? (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
                          onClick={() => setSearch("")}
                          aria-label="Clear search"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-1 lg:col-span-3">
                    <Label className="text-[0.7rem] font-medium text-slate-700 sm:text-xs">
                      Type
                    </Label>
                    <Select
                      value={typeFilter}
                      onValueChange={(v) =>
                        setTypeFilter((v as ActivityLogTypeFilter) || "all")
                      }
                    >
                      <SelectTrigger className="h-8 w-full cursor-pointer bg-white text-xs sm:h-9 sm:text-sm">
                        <SelectValue placeholder="Filter type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="cursor-pointer">
                          All deletions
                        </SelectItem>
                        <SelectItem value="user" className="cursor-pointer">
                          Deleted users
                        </SelectItem>
                        <SelectItem
                          value="evaluation"
                          className="cursor-pointer"
                        >
                          Deleted evaluations
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-1 lg:w-auto lg:items-end">
                  <Label className="text-[0.7rem] font-medium text-slate-700 lg:sr-only sm:text-xs">
                    Actions
                  </Label>
                  <Button
                    type="button"
                    onClick={() => void load(true)}
                    disabled={listBusy}
                    className="h-8 w-full cursor-pointer gap-1.5 bg-blue-600 px-3 text-xs text-white shadow-sm hover:bg-blue-700 hover:text-white lg:w-auto sm:h-9 sm:gap-2 sm:px-4 sm:text-sm disabled:opacity-70"
                  >
                    <RefreshCw
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      aria-hidden
                    />
                    {listBusy && loading ? "Loading…" : "Refresh"}
                  </Button>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm sm:rounded-xl",
                listBusy && "min-h-[280px] border-blue-100 bg-slate-50/40"
              )}
            >
              <Table
                className="[&_th]:h-auto [&_th]:min-h-8 [&_th]:px-2.5 [&_th]:py-2 [&_th]:align-middle [&_th]:text-[0.6rem] [&_th]:uppercase [&_th]:tracking-wide sm:[&_th]:min-h-9 sm:[&_th]:px-3 sm:[&_th]:py-2.5 sm:[&_th]:text-[0.65rem] [&_td]:min-w-0 [&_td]:px-2.5 [&_td]:py-2 [&_td]:align-top [&_td]:text-xs [&_td]:leading-snug sm:[&_td]:px-3 sm:[&_td]:py-2.5 sm:[&_td]:text-sm sm:[&_td]:leading-snug"
                wrapperClassName="overflow-x-auto"
              >
                <TableHeader className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/95 shadow-[inset_0_-1px_0_0_rgb(226_232_240)] backdrop-blur-sm">
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead className="min-w-[8rem] font-semibold text-slate-600 sm:min-w-[9rem]">
                      Type
                    </TableHead>
                    <TableHead className="min-w-[11rem] font-semibold text-slate-600 sm:min-w-[14rem]">
                      Subject
                    </TableHead>
                    <TableHead className="min-w-[12rem] font-semibold text-slate-600 sm:min-w-[16rem]">
                      Details
                    </TableHead>
                    <TableHead className="min-w-[8rem] font-semibold text-slate-600 sm:min-w-[10rem]">
                      Deleted By
                    </TableHead>
                    <TableHead className="min-w-[9rem] font-semibold text-slate-600 sm:min-w-[11rem]">
                      Deleted At
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, idx) => (
                      <TableRow
                        key={`sk-${idx}`}
                        className="hover:bg-transparent"
                      >
                        <TableCell>
                          <Skeleton className="h-5 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-52" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-32" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="p-0">
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
                            <p
                              className={cn(
                                "text-xs font-medium sm:text-sm",
                                fetchError ? "text-red-700" : "text-slate-800"
                              )}
                            >
                              {emptyTitle}
                            </p>
                            <p className="text-[0.65rem] leading-relaxed text-slate-500 sm:text-xs">
                              {emptyHint}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((log) => {
                      const recency = getDeletionRecency(log.created_at);
                      return (
                        <TableRow
                          key={log.id}
                          className={getActivityLogRowClassName(log)}
                        >
                          <TableCell className="align-top">
                            {typeBadge(log)}
                          </TableCell>
                          <TableCell className="max-w-[16rem] align-top text-xs font-medium text-slate-900 sm:text-sm">
                            {log.subject_label || "—"}
                          </TableCell>
                          <TableCell className="max-w-[22rem] break-words align-top text-xs text-slate-700 sm:text-sm">
                            {detailSummary(log)}
                          </TableCell>
                          <TableCell className="max-w-[12rem] align-top text-xs text-slate-700 sm:text-sm">
                            {log.deleted_by_name || "—"}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col gap-1">
                              <span className="whitespace-nowrap text-xs text-slate-600 sm:text-sm">
                                {formatLogDate(log.created_at)}
                              </span>
                              {recency === "new" ? (
                                <Badge className="w-fit bg-yellow-200 py-0 text-[0.6rem] text-yellow-800 hover:bg-yellow-200">
                                  New
                                </Badge>
                              ) : null}
                              {recency === "recent" ? (
                                <Badge className="w-fit bg-blue-200 py-0 text-[0.6rem] text-blue-800 hover:bg-blue-200">
                                  Recent
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {!loading && rows.length > 0 ? (
                <div className="border-t border-slate-100 bg-slate-50/50 px-1 py-2 sm:px-2">
                  <EvaluationsPagination
                    currentPage={page}
                    totalPages={Math.max(totalPages, 1)}
                    total={Math.max(totalRows, rows.length)}
                    perPage={TABLE_PAGE_SIZE}
                    onPageChange={setPage}
                  />
                </div>
              ) : null}
            </div>

            {!loading ? (
              <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[0.65rem] leading-snug text-slate-500 sm:text-xs">
                  {totalRows === 0
                    ? "No rows in this result set."
                    : totalPages > 1
                      ? `Page ${page} of ${totalPages} · ${totalRows} log${totalRows === 1 ? "" : "s"} (${TABLE_PAGE_SIZE}/page, server-loaded).`
                      : `${totalRows} log${totalRows === 1 ? "" : "s"} on this page (${TABLE_PAGE_SIZE}/page).`}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {newCountOnPage > 0 ? (
                    <Badge className="border-yellow-200 bg-yellow-50 py-0 text-[0.65rem] text-yellow-800 hover:bg-yellow-50">
                      {newCountOnPage} new
                    </Badge>
                  ) : null}
                  {recentCountOnPage > 0 ? (
                    <Badge className="border-blue-200 bg-blue-50 py-0 text-[0.65rem] text-blue-800 hover:bg-blue-50">
                      {recentCountOnPage} recent
                    </Badge>
                  ) : null}
                  {totalRows > 0 ? (
                    <Badge
                      variant="outline"
                      className="self-start border-slate-200 py-0 text-[0.65rem] sm:self-auto sm:text-xs"
                    >
                      {totalRows} total
                    </Badge>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
