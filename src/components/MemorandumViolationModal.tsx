"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Loader2,
  FileWarning,
  X,
  Eye,
  ExternalLink,
  RefreshCw,
  Calendar,
  FileText,
  FileType2,
  Download,
} from "lucide-react";
import { format, parseISO } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { User } from "@/contexts/UserContext";
import apiService from "@/lib/apiService";
import { toastMessages } from "@/lib/toastMessages";
import { CONFIG } from "../../config/config";
import EvaluationsPagination from "@/components/paginationComponent";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";

function localDateInputValue(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function userHasAdminRole(u: User | null | undefined): boolean {
  if (!u?.roles || !Array.isArray(u.roles)) return false;
  return u.roles.some(
    (r: { name?: string }) => String(r?.name ?? "").toLowerCase() === "admin"
  );
}

export type MemorandumSessionRow = {
  id: string;
  title: string;
  violation_date: string;
  summary?: string | null;
  fileName?: string | null;
  /** Present only for same-session uploads; used for download preview. */
  file?: File | null;
  /** From API when loaded from server */
  document_url?: string | null;
  document_path?: string | null;
};

export interface MemorandumViolationModalProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  dialogAnimationClass?: string;
  /** Employee row from HR (optional — omit when picking from branch-scoped list). */
  employee: User | null;
  /**
   * Explicit user id for `/showUserMemorandumViolation/{id}` when `employee.id`
   * is missing but another field (e.g. `user_id`) is present on the row.
   */
  targetEmployeeUserId?: string | number | null;
  branchFilterForEmployeePicker?: string;
  shouldHideAdminUsers?: boolean;
}

/** When total rows exceed this, paginate at `VIOLATIONS_PAGE_SIZE` per page. */
const VIOLATIONS_PAGE_SIZE = 10;

/** Body rows visible on the current page before the table scrolls (header stays sticky). */
const VIOLATIONS_SCROLL_AFTER_ROWS = 7;

/** Auto-dismiss save-success dialog after this many milliseconds. */
const SAVE_SUCCESS_DIALOG_AUTO_CLOSE_MS = 2500;

function mapApiRowToSession(r: Record<string, unknown>): MemorandumSessionRow {
  const id = String(r.id ?? `tmp-${Math.random()}`);
  const vd = String(
    r.violation_date ?? r.date ?? r.violationDate ?? ""
  );
  const violation_date = vd.includes("T") ? vd.split("T")[0] : vd;
  const docStr = (v: unknown) =>
    typeof v === "string" ? v : v != null ? String(v) : null;
  const documentRaw = r.document;
  const documentPath =
    docStr(r.document_path) ??
    docStr(r.support_document) ??
    (typeof documentRaw === "string" ? documentRaw : null) ??
    docStr(r.file_path) ??
    docStr(r.attachment) ??
    null;
  let fileName =
    (r.document_name as string) ??
    (r.file_name as string) ??
    (r.original_name as string) ??
    (r.filename as string) ??
    null;
  if (!fileName && documentPath) {
    const seg = documentPath.split(/[/\\]/).filter(Boolean).pop();
    if (seg) fileName = decodeURIComponent(seg);
  }
  const titleRaw =
    r.title ??
    r.subject ??
    r.violation_title ??
    r["violaion_title"] ??
    r["violation_tittle"];
  return {
    id,
    title: String(titleRaw ?? "—"),
    violation_date,
    summary: docStr(r.summary) ?? docStr(r.violation_summary) ?? docStr(r.description),
    fileName,
    file: undefined,
    document_url: docStr(r.document_url) ?? docStr(r.url) ?? null,
    document_path: documentPath,
  };
}

/** Accepts many Laravel / JSON shapes: raw array, { data }, { violations }, paginator, single row. */
function extractViolationRowsFromApi(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;

  /** Backend: `{ memos: [...] }` — plain array (not Laravel paginator). */
  if (Array.isArray(root.memos)) return root.memos;

  /** Backend: `{ memos: { data: [...], current_page, ... } }` */
  const memosRoot = root.memos;
  if (memosRoot && typeof memosRoot === "object" && !Array.isArray(memosRoot)) {
    const m = memosRoot as Record<string, unknown>;
    if (Array.isArray(m.data)) return m.data;
  }

  const tryArrays = [
    root.data,
    root.violations,
    root.violation,
    root.memorandum_violations,
    root.memorandumViolations,
    root.memorandum_violation,
    root.items,
    root.records,
    root.results,
  ];

  for (const c of tryArrays) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  for (const c of tryArrays) {
    if (Array.isArray(c)) return c;
  }

  // Laravel paginator: { data: { data: [...] } } or { data: [...] }
  const d = root.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    const inner = d as Record<string, unknown>;
    if (Array.isArray(inner.data)) return inner.data;
    if (Array.isArray(inner.violations)) return inner.violations;
  }

  // success: true, payload nested
  if (Array.isArray(root.payload)) return root.payload as unknown[];

  // Single violation object
  if (
    root.id != null &&
    (root.violation_date != null ||
      root.title != null ||
      root["violaion_title"] != null)
  ) {
    return [raw];
  }

  return [];
}

function normalizeViolationsListFromApi(raw: unknown): MemorandumSessionRow[] {
  const rowsRaw = extractViolationRowsFromApi(raw);
  return rowsRaw.map((x) =>
    mapApiRowToSession(
      x && typeof x === "object" ? (x as Record<string, unknown>) : {}
    )
  );
}

function resolveDocumentHrefForRow(row: MemorandumSessionRow): string | null {
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

/** Formatted violation date for the Date column. */
function formatViolationDateCell(row: MemorandumSessionRow): string {
  if (!row.violation_date) return "—";
  try {
    return format(parseISO(row.violation_date), "MMM d, yyyy");
  } catch {
    return row.violation_date;
  }
}

/** Same idea as Employee Average modal: stable id from list row (`id`, `user_id`, …). */
function resolveUserRecordId(u: User | null | undefined): string | null {
  if (!u) return null;
  const o = u as unknown as Record<string, unknown>;
  const alt = o.id ?? o.user_id ?? o.userId;
  if (alt === undefined || alt === null || String(alt).trim() === "")
    return null;
  return String(alt);
}

export default function MemorandumViolationModal({
  open,
  onOpenChangeAction,
  dialogAnimationClass = "",
  employee,
  targetEmployeeUserId = null,
  branchFilterForEmployeePicker,
  shouldHideAdminUsers = true,
}: MemorandumViolationModalProps) {
  const [pickerUsers, setPickerUsers] = useState<User[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [sessionRows, setSessionRows] = useState<MemorandumSessionRow[]>([]);
  /** 1-based page index when `sessionRows.length` exceeds `VIOLATIONS_PAGE_SIZE`. */
  const [violationsPage, setViolationsPage] = useState(1);
  const [loadingViolations, setLoadingViolations] = useState(false);
  const [viewingRow, setViewingRow] = useState<MemorandumSessionRow | null>(
    null
  );

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDateStr, setAddDateStr] = useState(() => localDateInputValue());
  const [addSummary, setAddSummary] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  /** Same entrance animation as Branch Quarterly Report / user-management modals. */
  const saveSuccessDialogAnimationClass = useDialogAnimation({ duration: 0.4 });
  const [showSaveSuccessDialog, setShowSaveSuccessDialog] = useState(false);
  const [saveSuccessEmployeeLabel, setSaveSuccessEmployeeLabel] = useState("");

  useEffect(() => {
    if (!showSaveSuccessDialog) return;
    const id = window.setTimeout(() => {
      setShowSaveSuccessDialog(false);
    }, SAVE_SUCCESS_DIALOG_AUTO_CLOSE_MS);
    return () => window.clearTimeout(id);
  }, [showSaveSuccessDialog]);

  const resetAddForm = useCallback(() => {
    setAddTitle("");
    setAddDateStr(localDateInputValue());
    setAddSummary("");
  }, []);

  const handleClose = useCallback(() => {
    onOpenChangeAction(false);
    setPickerUsers([]);
    setSelectedEmployeeId("");
    setSessionRows([]);
    setViolationsPage(1);
    setShowSaveSuccessDialog(false);
    setSaveSuccessEmployeeLabel("");
    setLoadingViolations(false);
    setViewingRow(null);
    setAddModalOpen(false);
    resetAddForm();
  }, [onOpenChangeAction, resetAddForm]);

  const violationsUsePagination = sessionRows.length > VIOLATIONS_PAGE_SIZE;
  const violationsTotalPages = Math.max(
    1,
    Math.ceil(sessionRows.length / VIOLATIONS_PAGE_SIZE)
  );

  const violationsDisplayedRows = useMemo(() => {
    if (!violationsUsePagination) return sessionRows;
    const start = (violationsPage - 1) * VIOLATIONS_PAGE_SIZE;
    return sessionRows.slice(start, start + VIOLATIONS_PAGE_SIZE);
  }, [sessionRows, violationsPage, violationsUsePagination]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(sessionRows.length / VIOLATIONS_PAGE_SIZE));
    setViolationsPage((p) => Math.min(p, tp));
  }, [sessionRows.length]);

  const fetchViolationsForUser = useCallback(async (userId: string) => {
    if (!userId) {
      setSessionRows([]);
      return;
    }
    setLoadingViolations(true);
    try {
      const raw = await apiService.getUserMemorandumViolations(userId);
      const rows = normalizeViolationsListFromApi(raw);
      setSessionRows(rows);
    } catch (e: unknown) {
      console.error(e);
      setSessionRows([]);
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      toastMessages.generic.error(
        "Could not load memorandum violations",
        msg ?? "Check the network or your session and try again."
      );
    } finally {
      setLoadingViolations(false);
    }
  }, []);

  /** Who to load violations for — mirrors Employee Average’s “this employee only” behavior. */
  const effectiveFetchUserId = useMemo(() => {
    const explicit =
      targetEmployeeUserId != null &&
      String(targetEmployeeUserId).trim() !== ""
        ? String(targetEmployeeUserId).trim()
        : "";
    if (explicit) return explicit;
    const fromEmployee = resolveUserRecordId(employee);
    if (fromEmployee) return fromEmployee;
    if (selectedEmployeeId.trim()) return selectedEmployeeId.trim();
    return "";
  }, [targetEmployeeUserId, employee, selectedEmployeeId]);

  useEffect(() => {
    if (!open) return;
    if (employee) {
      const id = resolveUserRecordId(employee);
      if (id) setSelectedEmployeeId(id);
    } else {
      setSelectedEmployeeId("");
    }
  }, [open, employee]);

  useEffect(() => {
    if (!open) return;
    const uid = effectiveFetchUserId;
    if (!uid) {
      setSessionRows([]);
      return;
    }
    void fetchViolationsForUser(uid);
  }, [open, effectiveFetchUserId, fetchViolationsForUser]);

  useEffect(() => {
    if (!open || employee) return;

    let cancelled = false;
    const branch =
      branchFilterForEmployeePicker === undefined ||
      branchFilterForEmployeePicker === ""
        ? ""
        : String(branchFilterForEmployeePicker);

    (async () => {
      setLoadingPicker(true);
      try {
        const userResp = await apiService.getActiveRegistrations(
          "",
          "0",
          1,
          2000,
          branch,
          ""
        );
        const usersList: User[] = Array.isArray(userResp)
          ? userResp
          : (userResp as { data?: User[]; users?: User[] })?.data ||
            (userResp as { users?: User[] })?.users ||
            [];
        const filtered = usersList.filter((u) => {
          if (shouldHideAdminUsers && userHasAdminRole(u)) return false;
          return true;
        });
        if (!cancelled) {
          setPickerUsers(filtered);
        }
      } catch {
        if (!cancelled) setPickerUsers([]);
      } finally {
        if (!cancelled) setLoadingPicker(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, employee, branchFilterForEmployeePicker, shouldHideAdminUsers]);

  const resolveTargetUser = (): User | null => {
    if (employee) return employee;
    if (!selectedEmployeeId) return null;
    return (
      pickerUsers.find(
        (u) => resolveUserRecordId(u) === selectedEmployeeId
      ) || null
    );
  };

  const handleAddViolationSubmit = async () => {
    const target = resolveTargetUser();
    const targetUid = target ? resolveUserRecordId(target) : null;
    if (!target || !targetUid) {
      toastMessages.form.validationError();
      return;
    }
    const t = addTitle.trim();
    const s = addSummary.trim();
    if (!t || !addDateStr || !s) {
      toastMessages.form.validationError();
      return;
    }
    const violation_date = addDateStr;

    setSubmittingAdd(true);
    try {
      const fd = new FormData();
      fd.append("user_id", targetUid);
      fd.append("violation_date", violation_date);
      fd.append("title", t);
      fd.append("summary", s);
      fd.append("document", s);
      await apiService.addMemorandumViolation(fd);

      const name = `${target.fname || ""} ${target.lname || ""}`.trim();
      setSaveSuccessEmployeeLabel(name);
      setShowSaveSuccessDialog(true);

      await fetchViolationsForUser(targetUid);
      setAddModalOpen(false);
      resetAddForm();
    } catch (e: unknown) {
      const err = e as {
        response?: {
          data?: { message?: string; errors?: Record<string, string[]> };
        };
        message?: string;
      };
      const validation =
        err.response?.data?.errors &&
        Object.values(err.response.data.errors).flat().join(" ");
      const msg =
        err.response?.data?.message ||
        validation ||
        err.message ||
        "Could not save the memorandum violation.";
      toastMessages.generic.error("Failed to save", msg);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const openView = (row: MemorandumSessionRow) => {
    setViewingRow(row);
  };

  const showEmployeePicker = !employee;
  const pickerOptions = pickerUsers
    .map((u) => {
      const vid = resolveUserRecordId(u);
      if (!vid) return null;
      return {
        value: vid,
        label: `${u.fname || ""} ${u.lname || ""} (${u.email || "no email"})`.trim(),
      };
    })
    .filter((o): o is { value: string; label: string } => o != null);

  const selectedPickerUser = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return (
      pickerUsers.find((u) => resolveUserRecordId(u) === selectedEmployeeId) ??
      null
    );
  }, [pickerUsers, selectedEmployeeId]);

  const headerEmployeeName = employee
    ? `${employee.fname || ""} ${employee.lname || ""}`.trim()
    : selectedPickerUser
      ? `${selectedPickerUser.fname || ""} ${selectedPickerUser.lname || ""}`.trim()
      : "";

  const employeeSubtitle = headerEmployeeName
    ? "Memorandum violations for this employee"
    : "Select an employee to load and manage memorandum violations";

  const addViolationDisabled =
    submittingAdd ||
    (showEmployeePicker && (!selectedEmployeeId || loadingPicker));

  const viewFileUrl = useMemo(() => {
    if (!viewingRow) return null;
    if (viewingRow.file instanceof File) {
      return URL.createObjectURL(viewingRow.file);
    }
    return resolveDocumentHrefForRow(viewingRow);
  }, [viewingRow]);

  useEffect(() => {
    if (!viewingRow?.file || !(viewingRow.file instanceof File)) return;
    const url = viewFileUrl;
    return () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [viewingRow, viewFileUrl]);

  const viewAttachmentKind = useMemo((): "image" | "pdf" | "other" | null => {
    if (!viewingRow) return null;
    const f = viewingRow.file;
    if (f instanceof File) {
      if (f.type.startsWith("image/")) return "image";
      if (f.type === "application/pdf") return "pdf";
    }
    if (!viewFileUrl) return null;
    if (isLikelyImageHref(viewFileUrl)) return "image";
    if (isLikelyPdfHref(viewFileUrl)) return "pdf";
    return "other";
  }, [viewingRow, viewFileUrl]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChangeAction={(next) => {
          if (!next) handleClose();
        }}
      >
        <DialogContent
          className={`p-0 ${dialogAnimationClass} max-w-5xl max-h-[95vh] overflow-hidden relative`}
        >
          <div
            className="relative overflow-hidden px-6 py-5"
            style={{
              backgroundImage: "url(/smct.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/90 to-orange-700/90 backdrop-blur-[1px]" />
            <div className="absolute top-3 right-3 z-20">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={handleClose}
                className="cursor-pointer hover:bg-white/20 text-white h-8 w-8 rounded-full shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative z-10 pr-12 sm:pr-14">
              <DialogHeader className="pb-0 text-left">
                <DialogTitle className="flex items-center gap-3 text-xl text-white drop-shadow-md">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-lg">
                    <FileWarning className="h-5 w-5 text-white" />
                  </div>
                  <span>Memorandum Violation</span>
                </DialogTitle>
                {headerEmployeeName ? (
                  <p className="mt-4 text-xl font-bold text-white/90 leading-snug">
                    {headerEmployeeName}
                  </p>
                ) : null}
                <p
                  className={`text-sm text-white/90 leading-snug ${headerEmployeeName ? "mt-2" : "mt-4"}`}
                >
                  {employeeSubtitle}
                </p>
              </DialogHeader>
            </div>
          </div>

          <div className="relative overflow-y-auto p-6 space-y-4">
            {showEmployeePicker && (
              <div className="flex flex-wrap items-center gap-4">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Employee:
                </Label>
                {loadingPicker ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading employees…
                  </div>
                ) : (
                  <Combobox
                    options={pickerOptions}
                    value={selectedEmployeeId}
                    onValueChangeAction={(v) => setSelectedEmployeeId(String(v))}
                    placeholder="Select employee"
                    searchPlaceholder="Search employees…"
                    emptyText="No employees found."
                    className="min-w-[280px] flex-1 max-w-xl"
                  />
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!effectiveFetchUserId || loadingViolations}
                onClick={() => {
                  if (effectiveFetchUserId) {
                    void fetchViolationsForUser(effectiveFetchUserId);
                  }
                }}
                className="cursor-pointer border-amber-300 bg-white hover:bg-amber-50"
                title="Reload violations for this employee from the server"
              >
                <RefreshCw
                  className={`mr-2 inline h-4 w-4 ${loadingViolations ? "animate-spin" : ""}`}
                />
                Refresh list
              </Button>
              <Button
                type="button"
                onClick={() => {
                  resetAddForm();
                  setAddModalOpen(true);
                }}
                disabled={addViolationDisabled}
                className="cursor-pointer bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileWarning className="h-4 w-4 mr-2 inline" />
                Add Violation
              </Button>
            </div>

            <div className="space-y-3">
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div
                  className={cn(
                    violationsDisplayedRows.length > VIOLATIONS_SCROLL_AFTER_ROWS &&
                      "max-h-[min(23rem,48vh)] overflow-y-auto overflow-x-auto"
                  )}
                >
                <Table
                  wrapperClassName={
                    violationsDisplayedRows.length > VIOLATIONS_SCROLL_AFTER_ROWS
                      ? "overflow-visible"
                      : undefined
                  }
                >
                  <TableHeader
                    className={cn(
                      violationsDisplayedRows.length > VIOLATIONS_SCROLL_AFTER_ROWS &&
                        "sticky top-0 z-10 shadow-[0_1px_0_0_rgb(229_231_235)] bg-gradient-to-r from-amber-50 to-amber-100"
                    )}
                  >
                    <TableRow className="bg-gradient-to-r from-amber-50 to-amber-100">
                      <TableHead className="font-semibold text-amber-900 min-w-[min(40%,12rem)]">
                        Title
                      </TableHead>
                      <TableHead className="font-semibold text-amber-900 min-w-[7.5rem] whitespace-nowrap">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-amber-900 w-[1%] whitespace-nowrap text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingViolations ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-10 text-center text-gray-600"
                        >
                          <Loader2 className="mr-2 inline h-5 w-5 animate-spin text-amber-600" />
                          Loading violations…
                        </TableCell>
                      </TableRow>
                    ) : sessionRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-gray-500 py-10"
                        >
                          No violations yet. Use Add Violation to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      violationsDisplayedRows.map((row) => {
                        return (
                        <TableRow
                          key={row.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="max-w-[14rem] text-gray-900 text-sm font-medium">
                            <span className="line-clamp-2" title={row.title}>
                              {row.title}
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-700 text-sm whitespace-nowrap">
                            {formatViolationDateCell(row)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => openView(row)}
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
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
              </div>
              {violationsUsePagination && !loadingViolations && sessionRows.length > 0 ? (
                <EvaluationsPagination
                  currentPage={violationsPage}
                  totalPages={violationsTotalPages}
                  total={sessionRows.length}
                  perPage={VIOLATIONS_PAGE_SIZE}
                  onPageChange={setViolationsPage}
                />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Violation — nested modal */}
      <Dialog
        open={addModalOpen}
        onOpenChangeAction={(next) => {
          if (!next) {
            if (submittingAdd) return;
            setAddModalOpen(false);
            resetAddForm();
          }
        }}
      >
        <DialogContent
          className={cn(
            "relative max-w-xl p-0 overflow-hidden border-amber-200/50 shadow-xl",
            dialogAnimationClass
          )}
        >
          {submittingAdd && (
            <div
              className="absolute inset-0 z-[100] flex flex-col items-center justify-center rounded-lg bg-white/85 backdrop-blur-[2px]"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-200 bg-amber-50 shadow-md">
                <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-amber-800">
                Saving violation…
              </h2>
              <p className="mb-2 max-w-xs text-center text-sm text-gray-600">
                Please wait while your memorandum is being saved.
              </p>
            </div>
          )}
          <div
            className="relative border-b border-amber-100/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 px-6 py-5"
            style={{
              backgroundImage: "url(/smct.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/88 to-amber-50/85" />
            <div className="relative flex gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md ring-2 ring-amber-100"
                aria-hidden
              >
                <FileWarning className="h-6 w-6" />
              </div>
              <DialogHeader className="flex-1 space-y-1.5 text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight text-gray-900">
                  Add memorandum violation
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-gray-600">
                  Enter a title, the violation date, and a summary for the
                  violation. All fields are required.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="max-h-[min(70vh,560px)] overflow-y-auto px-6 py-6">
            <ol className="space-y-6">
              <li className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white"
                    aria-hidden
                  >
                    1
                  </span>
                  <div>
                    <Label
                      htmlFor="add-violation-title"
                      className="text-base font-semibold text-gray-900"
                    >
                      Violation title{" "}
                      <span className="text-red-500" aria-hidden>
                        *
                      </span>
                    </Label>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Shown in the table. Example: “Uniform policy — first notice”.
                    </p>
                  </div>
                </div>
                <Input
                  id="add-violation-title"
                  placeholder="Enter a short, descriptive title"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  disabled={submittingAdd}
                  className="h-11 text-base"
                  autoComplete="off"
                  aria-required
                />
              </li>

              <li className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              <li className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white"
                    aria-hidden
                  >
                    2
                  </span>
                  <div>
                    <Label
                      htmlFor="add-violation-date"
                      className="text-base font-semibold text-gray-900"
                    >
                      Violation date{" "}
                      <span className="text-red-500" aria-hidden>
                        *
                      </span>
                    </Label>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Use the calendar control to pick the date of the violation.
                    </p>
                  </div>
                </div>
                <div className="sm:ml-9">
                  <Input
                    id="add-violation-date"
                    type="date"
                    value={addDateStr}
                    onChange={(e) => setAddDateStr(e.target.value)}
                    disabled={submittingAdd}
                    className="h-11 max-w-full sm:max-w-xs bg-white"
                    aria-required
                  />
                </div>
              </li>

              <li className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              <li className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white"
                    aria-hidden
                  >
                    3
                  </span>
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      Violation summary{" "}
                      <span className="text-red-500" aria-hidden>
                        *
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Add a clear summary of what happened.
                    </p>
                  </div>
                </div>
                <div className="ml-0 sm:ml-9">
                  <Textarea
                    id="add-violation-summary"
                    placeholder="Enter the details and summary of this violation"
                    value={addSummary}
                    onChange={(e) => setAddSummary(e.target.value)}
                    disabled={submittingAdd}
                    className="min-h-[120px] bg-white text-sm"
                    aria-required
                  />
                </div>
              </li>
            </ol>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/90 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={submittingAdd}
              className="cursor-pointer w-full sm:w-auto"
              onClick={() => {
                setAddModalOpen(false);
                resetAddForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                submittingAdd ||
                !addTitle.trim() ||
                !addDateStr ||
                !addSummary.trim()
              }
              className="cursor-pointer w-full bg-amber-600 hover:bg-amber-700 text-white sm:w-auto min-w-[160px]"
              onClick={handleAddViolationSubmit}
            >
              {submittingAdd ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                  Saving…
                </>
              ) : (
                "Save violation"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View details — memorandum preview */}
      <Dialog
        open={!!viewingRow}
        onOpenChangeAction={(next) => {
          if (!next) setViewingRow(null);
        }}
      >
        <DialogContent
          className={`max-w-lg gap-0 overflow-hidden p-0 sm:max-w-xl ${dialogAnimationClass}`}
        >
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
                  Memorandum details
                </DialogTitle>
                <DialogDescription className="text-left text-sm leading-relaxed text-amber-50/95">
                  Violation title, date, and supporting document for this record.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-gradient-to-b from-slate-50/90 to-white px-6 py-5">
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
                    {viewingRow?.title ?? "—"}
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
                    {viewingRow?.violation_date
                      ? (() => {
                          try {
                            return format(
                              parseISO(viewingRow.violation_date),
                              "MMMM d, yyyy"
                            );
                          } catch {
                            return viewingRow.violation_date;
                          }
                        })()
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Summary
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {viewingRow?.summary?.trim() || "No summary provided."}
                  </p>
                </div>
              </div>
            </div>

            {viewingRow?.fileName || viewFileUrl ? (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Supporting document
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-slate-800">
                    {viewingRow?.fileName || "Attachment"}
                  </p>
                </div>
                <div className="p-4">
                  {!viewFileUrl && viewingRow?.fileName ? (
                    <p className="text-sm text-slate-600">
                      Preview link unavailable for this attachment.
                    </p>
                  ) : null}
                  {viewFileUrl && viewAttachmentKind === "image" ? (
                    <div className="overflow-hidden rounded-lg bg-slate-100/80 ring-1 ring-slate-200/60">
                      <img
                        src={viewFileUrl}
                        alt=""
                        className="mx-auto max-h-[min(320px,50vh)] w-full object-contain"
                      />
                    </div>
                  ) : null}
                  {viewFileUrl && viewAttachmentKind === "pdf" ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-amber-200/90 bg-amber-50/50 px-4 py-8 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-amber-100">
                        <FileType2 className="h-7 w-7 text-amber-700" />
                      </div>
                      <p className="text-sm font-medium text-slate-800">
                        PDF document
                      </p>
                      <p className="max-w-xs text-xs text-slate-600">
                        Open in a new tab to view or use download to save a copy.
                      </p>
                    </div>
                  ) : null}
                  {viewFileUrl && viewAttachmentKind === "other" ? (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                      <FileType2 className="h-5 w-5 shrink-0 text-slate-500" />
                      <span>Preview not available — open or download the file.</span>
                    </div>
                  ) : null}
                  {viewFileUrl ? (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
                        asChild
                      >
                        <a
                          href={viewFileUrl}
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
                          href={viewFileUrl}
                          download={viewingRow?.fileName || undefined}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
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
        </DialogContent>
      </Dialog>

      {/* Save success — same pattern as Branch Quarterly Report CSV export success (userManagement) */}
      <Dialog
        open={showSaveSuccessDialog}
        onOpenChangeAction={setShowSaveSuccessDialog}
      >
        <DialogContent
          className={`max-w-sm w-[90vw] px-6 py-6 text-center ${saveSuccessDialogAnimationClass}`}
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
              Saved successfully
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              {saveSuccessEmployeeLabel
                ? `${saveSuccessEmployeeLabel}: the memorandum violation has been saved.`
                : "The memorandum violation has been saved."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center">
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
