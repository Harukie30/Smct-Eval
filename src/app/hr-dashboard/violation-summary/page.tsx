"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import apiService from "@/lib/apiService";
import { toastMessages } from "@/lib/toastMessages";
import { RefreshCw } from "lucide-react";

const DEFAULT_PER_PAGE = 50;
const SEARCH_DEBOUNCE_MS = 400;

type ViolationSummaryRow = {
  id: string;
  employeeName: string;
  violationTitle: string;
  violationDate: string;
  offense: string;
  sanction: string;
};

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
  const title = String(
    r.title ?? r.subject ?? r.violation_title ?? r["violaion_title"] ?? "—"
  ).trim();
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

function yearChoices(): number[] {
  const y = new Date().getFullYear();
  const out: number[] = [];
  for (let i = 0; i < 8; i++) out.push(y - i);
  return out;
}

export default function ViolationSummaryPage() {
  const now = new Date();
  const [rows, setRows] = useState<ViolationSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>(String(now.getMonth() + 1));
  const [yearFilter, setYearFilter] = useState<string>(String(now.getFullYear()));

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
          per_page: DEFAULT_PER_PAGE,
          month: monthFilter,
          year: yearFilter,
        });
        setRows(mapMemorandumViolationsResponse(raw));
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

  useEffect(() => {
    void load(false);
  }, [load]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-slate-200/90 shadow-md">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-xl">Violation Summary</CardTitle>
          <CardDescription>
            Memorandum violations across employees (name, violation title & date, offense,
            sanction). Filter by month and year; search is sent to the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-2xl lg:flex-1 lg:grid-cols-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="violation-summary-search">Search</Label>
                <Input
                  id="violation-summary-search"
                  placeholder="Name, violation, offense, sanction…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="w-full cursor-pointer">
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
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearChoices().map((y) => (
                      <SelectItem
                        key={y}
                        value={String(y)}
                        className="cursor-pointer"
                      >
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={loading || refreshing}
              onClick={() => void load(true)}
              className="shrink-0 cursor-pointer self-start lg:self-end"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <Table
              className="[&_th]:h-auto [&_th]:min-h-11 [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_td]:min-w-0 [&_td]:px-4 [&_td]:py-3.5 [&_td]:align-top [&_td]:leading-relaxed"
              wrapperClassName="max-h-[min(70vh,40rem)] overflow-auto"
            >
              <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)]">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Name</TableHead>
                  <TableHead className="font-semibold text-slate-700">Violation</TableHead>
                  <TableHead className="font-semibold text-slate-700">Offense</TableHead>
                  <TableHead className="font-semibold text-slate-700">Sanction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={`sk-${idx}`}>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-14 text-center text-sm text-slate-500"
                    >
                      No violations found for this month and year, or the list could not be
                      loaded.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50/80">
                      <TableCell className="max-w-[12rem] font-medium text-slate-900">
                        {r.employeeName}
                      </TableCell>
                      <TableCell className="max-w-[20rem]">
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-900">{r.violationTitle}</p>
                          {r.violationDate ? (
                            <p className="text-xs text-slate-500">{r.violationDate}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[18rem] break-words text-slate-800">
                        {r.offense}
                      </TableCell>
                      <TableCell className="max-w-[14rem] break-words text-slate-800">
                        {r.sanction}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && (
            <p className="text-xs text-slate-500">
              Showing {rows.length} violation{rows.length === 1 ? "" : "s"}
              {rows.length >= DEFAULT_PER_PAGE
                ? ` (up to ${DEFAULT_PER_PAGE} per request; increase per_page if your API supports it).`
                : "."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
