"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Loader2,
  FileWarning,
  X,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  RefreshCw,
  Calendar,
  FileText,
  FileType2,
  Download,
  Scale,
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
import ViolationRowHighlightLegend from "@/components/ViolationRowHighlightLegend";
import { SanctionTableHeadLabel } from "@/components/violations/SanctionTableHeadLabel";
import {
  effectiveViolationActivityTimeMs,
  stableViolationRowFingerprint,
  violationRowHighlightVariant,
} from "@/lib/memorandumViolationRowHighlight";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";

function localDateInputValue(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normalize API date strings to `YYYY-MM-DD` for `<input type="date" />`. */
function violationDateToInputValue(raw: string): string {
  if (!raw?.trim()) return localDateInputValue();
  const v = raw.trim();
  const ymd = v.includes("T") ? (v.split("T")[0] ?? v) : v;
  if (/^\d{4}-\d{2}-\d{2}/.test(ymd)) return ymd.slice(0, 10);
  return localDateInputValue();
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
  /** Disciplinary action / penalty text when provided by API or HR. */
  sanction?: string | null;
  fileName?: string | null;
  /** Present only for same-session uploads; used for download preview. */
  file?: File | null;
  /** From API when loaded from server */
  document_url?: string | null;
  document_path?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
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
  /** Hide "Add Violation" button for read-only usage. */
  hideAddViolationButton?: boolean;
  /** Show delete action in the violations table (HR dashboard only). */
  allowDeleteViolation?: boolean;
}

/** When total rows exceed this, paginate at `VIOLATIONS_PAGE_SIZE` per page. */
const VIOLATIONS_PAGE_SIZE = 10;

/** Body rows visible on the current page before the table scrolls (header stays sticky). */
const VIOLATIONS_SCROLL_AFTER_ROWS = 7;

/** Auto-dismiss save-success dialog after this many milliseconds. */
const SAVE_SUCCESS_DIALOG_AUTO_CLOSE_MS = 2500;

/** Preview length for Offense / Sanction columns in the violations table. */
const TABLE_CELL_PREVIEW_LEN = 14;

function truncateCellPreview(
  text: string | null | undefined,
  maxLen = TABLE_CELL_PREVIEW_LEN
): string {
  const t = text?.trim() ?? "";
  if (!t) return "—";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

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
  const sanctionRaw =
    docStr(r.sanction) ??
    docStr(r.penalty) ??
    docStr(r.disciplinary_action) ??
    docStr(r.punishment);
  return {
    id,
    title: String(titleRaw ?? "—"),
    violation_date,
    summary:
      docStr(r.offense) ??
      docStr(r.summary) ??
      docStr(r.violation_summary) ??
      docStr(r.description),
    sanction: sanctionRaw,
    fileName,
    file: undefined,
    document_url: docStr(r.document_url) ?? docStr(r.url) ?? null,
    document_path: documentPath,
    updated_at:
      docStr(r.updated_at) ??
      docStr(r.updatedAt) ??
      docStr(r.modified_at) ??
      null,
    created_at: docStr(r.created_at) ?? docStr(r.createdAt) ?? null,
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
  hideAddViolationButton = false,
  allowDeleteViolation = false,
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
  const [addSanction, setAddSanction] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [editingSummaryRow, setEditingSummaryRow] =
    useState<MemorandumSessionRow | null>(null);
  const [editTitleDraft, setEditTitleDraft] = useState("");
  const [editDateDraft, setEditDateDraft] = useState("");
  const [editSummaryDraft, setEditSummaryDraft] = useState("");
  const [editSanctionDraft, setEditSanctionDraft] = useState("");
  const [savingSummaryEdit, setSavingSummaryEdit] = useState(false);
  const [violationToDelete, setViolationToDelete] =
    useState<MemorandumSessionRow | null>(null);
  const [deletingViolationId, setDeletingViolationId] = useState<string | null>(
    null
  );

  const clientActivityAtRef = useRef<Map<string, number>>(new Map());
  const previousRowsByIdRef = useRef<Map<string, string>>(new Map());
  const lastListContextRef = useRef<string | null>(null);
  const [highlightRev, setHighlightRev] = useState(0);

  /** Same entrance animation as Branch Quarterly Report / user-management modals. */
  const saveSuccessDialogAnimationClass = useDialogAnimation({ duration: 0.4 });
  const [showSaveSuccessDialog, setShowSaveSuccessDialog] = useState(false);
  const [saveSuccessEmployeeLabel, setSaveSuccessEmployeeLabel] = useState("");
  /** When true, success dialog copy reflects an edit vs a new memorandum. */
  const [saveSuccessIsEdit, setSaveSuccessIsEdit] = useState(false);

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
    setAddSanction("");
  }, []);

  const handleClose = useCallback(() => {
    onOpenChangeAction(false);
    setPickerUsers([]);
    setSelectedEmployeeId("");
    setSessionRows([]);
    setViolationsPage(1);
    setShowSaveSuccessDialog(false);
    setSaveSuccessEmployeeLabel("");
    setSaveSuccessIsEdit(false);
    setLoadingViolations(false);
    setViewingRow(null);
    setAddModalOpen(false);
    resetAddForm();
    setEditingSummaryRow(null);
    setEditTitleDraft("");
    setEditDateDraft("");
    setEditSummaryDraft("");
    setEditSanctionDraft("");
    setSavingSummaryEdit(false);
    setViolationToDelete(null);
    setDeletingViolationId(null);
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

  const fetchViolationsForUser = useCallback(
    async (userId: string): Promise<MemorandumSessionRow[]> => {
      if (!userId) {
        setSessionRows([]);
        return [];
      }
      setLoadingViolations(true);
      try {
        const raw = await apiService.getUserMemorandumViolations(userId);
        const rows = normalizeViolationsListFromApi(raw);
        setSessionRows(rows);
        return rows;
      } catch (e: unknown) {
        console.error(e);
        setSessionRows([]);
        const msg =
          e && typeof e === "object" && "response" in e
            ? (e as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            : undefined;
        toastMessages.generic.error(
          "Could not load memorandum violations",
          msg ?? "Check the network or your session and try again."
        );
        return [];
      } finally {
        setLoadingViolations(false);
      }
    },
    []
  );

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

  const highlightListContextKey = useMemo(
    () => effectiveFetchUserId || "none",
    [effectiveFetchUserId]
  );

  useEffect(() => {
    if (!open) {
      clientActivityAtRef.current = new Map();
      previousRowsByIdRef.current = new Map();
      lastListContextRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const ctx = highlightListContextKey;
    const prevCtx = lastListContextRef.current;
    const sameList = prevCtx === ctx;
    lastListContextRef.current = ctx;

    const prevById = previousRowsByIdRef.current;
    const actMap = clientActivityAtRef.current;
    const now = Date.now();

    if (!sameList) {
      previousRowsByIdRef.current = new Map(
        sessionRows.map((r) => [
          String(r.id),
          stableViolationRowFingerprint(r),
        ])
      );
      setHighlightRev((x) => x + 1);
      return;
    }

    for (const row of sessionRows) {
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
  }, [open, sessionRows, highlightListContextKey]);

  useEffect(() => {
    const id = window.setInterval(
      () => setHighlightRev((x) => x + 1),
      15_000
    );
    return () => window.clearInterval(id);
  }, []);

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
      /** POST /addMemorandumViolation — FormData: id, violation_date, title, offense, sanction */
      const fd = new FormData();
      fd.append("id", targetUid);
      fd.append("violation_date", violation_date);
      fd.append("title", t);
      fd.append("offense", s);
      fd.append("sanction", addSanction.trim());
      await apiService.addMemorandumViolation(fd);

      const name = `${target.fname || ""} ${target.lname || ""}`.trim();
      setSaveSuccessIsEdit(false);
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

  const canEditSummary = !hideAddViolationButton;
  const canDeleteViolation = allowDeleteViolation && canEditSummary;

  const isDeletableViolationId = (id: string): boolean => {
    const trimmed = id.trim();
    return trimmed !== "" && !trimmed.startsWith("tmp-");
  };

  const openDeleteConfirm = (row: MemorandumSessionRow) => {
    if (!isDeletableViolationId(String(row.id))) return;
    setViolationToDelete(row);
  };

  const handleDeleteViolation = async () => {
    if (!violationToDelete || !effectiveFetchUserId) return;
    const violationId = String(violationToDelete.id);
    if (!isDeletableViolationId(violationId)) return;

    setDeletingViolationId(violationId);
    try {
      await apiService.deleteMemorandumViolation(violationId);

      if (
        editingSummaryRow &&
        String(editingSummaryRow.id) === violationId
      ) {
        resetEditViolationForm();
      }
      if (viewingRow && String(viewingRow.id) === violationId) {
        setViewingRow(null);
      }

      setSessionRows((prev) =>
        prev.filter((r) => String(r.id) !== violationId)
      );
      await fetchViolationsForUser(effectiveFetchUserId);
      setViolationToDelete(null);
      toastMessages.generic.success(
        "Violation deleted",
        "The memorandum violation has been removed."
      );
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Could not delete the violation.";
      toastMessages.generic.error("Delete failed", msg);
    } finally {
      setDeletingViolationId(null);
    }
  };

  const openEditSummary = (row: MemorandumSessionRow) => {
    setEditingSummaryRow(row);
    setEditTitleDraft(row.title?.trim() ?? "");
    setEditDateDraft(violationDateToInputValue(row.violation_date));
    setEditSummaryDraft(row.summary?.trim() ?? "");
    setEditSanctionDraft(row.sanction?.trim() ?? "");
  };

  const resetEditViolationForm = useCallback(() => {
    setEditingSummaryRow(null);
    setEditTitleDraft("");
    setEditDateDraft("");
    setEditSummaryDraft("");
    setEditSanctionDraft("");
  }, []);

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

  const handleSaveViolationEdit = async () => {
    if (!editingSummaryRow || !effectiveFetchUserId) return;
    const title = editTitleDraft.trim();
    const offense = editSummaryDraft.trim();
    const sanction = editSanctionDraft.trim();
    if (!title || !editDateDraft || !offense) {
      toastMessages.form.validationError();
      return;
    }
    setSavingSummaryEdit(true);
    try {
      await apiService.updateMemorandumViolation({
        id: editingSummaryRow.id,
        title,
        violation_date: editDateDraft,
        offense,
        sanction,
      });
      setSessionRows((prev) =>
        prev.map((r) =>
          String(r.id) === String(editingSummaryRow.id)
            ? {
                ...r,
                title,
                violation_date: editDateDraft,
                summary: offense,
                sanction: sanction || null,
              }
            : r
        )
      );
      await fetchViolationsForUser(effectiveFetchUserId);
      setViewingRow((v) =>
        v && String(v.id) === String(editingSummaryRow.id)
          ? {
              ...v,
              title,
              violation_date: editDateDraft,
              summary: offense,
              sanction: sanction || null,
            }
          : v
      );
      resetEditViolationForm();
      setSaveSuccessIsEdit(true);
      setSaveSuccessEmployeeLabel(headerEmployeeName.trim());
      setShowSaveSuccessDialog(true);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Could not update the violation.";
      toastMessages.generic.error("Update failed", msg);
    } finally {
      setSavingSummaryEdit(false);
    }
  };

  const employeeSubtitle = headerEmployeeName
    ? "Memorandum violations for this employee"
    : hideAddViolationButton
      ? "Select an employee to view memorandum violations"
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
          className={`relative max-h-[95vh] w-[min(100%,calc(100vw-2rem))] max-w-5xl overflow-x-hidden overflow-y-hidden p-0 ${dialogAnimationClass}`}
        >
          <div
            className="relative overflow-hidden px-4 py-4 sm:px-6 sm:py-5"
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
                <DialogTitle className="flex items-center gap-2 text-lg text-white drop-shadow-md sm:gap-3 sm:text-xl">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-lg">
                    <FileWarning className="h-5 w-5 text-white" />
                  </div>
                  <span>Memorandum Violation</span>
                </DialogTitle>
                {headerEmployeeName ? (
                  <p className="mt-3 break-words text-lg font-bold leading-snug text-white/90 sm:mt-4 sm:text-xl">
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

          <div className="relative min-w-0 space-y-4 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
            {showEmployeePicker && (
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <Label className="text-sm font-medium text-gray-700">
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
                    className="min-w-0 w-full max-w-full flex-1 sm:min-w-[280px] sm:max-w-xl"
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
              {!hideAddViolationButton && (
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
              )}
            </div>

            <div className="space-y-3">
              {!loadingViolations && sessionRows.length > 0 ? (
                <ViolationRowHighlightLegend className="text-gray-700" />
              ) : null}
              <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                <div
                  className={cn(
                    "min-w-0 overflow-x-auto",
                    violationsDisplayedRows.length > VIOLATIONS_SCROLL_AFTER_ROWS &&
                      "max-h-[min(23rem,48vh)] overflow-y-auto"
                  )}
                >
                <Table
                  wrapperClassName="min-w-0 overflow-visible"
                >
                  <TableHeader
                    className={cn(
                      violationsDisplayedRows.length > VIOLATIONS_SCROLL_AFTER_ROWS &&
                        "sticky top-0 z-10 shadow-[0_1px_0_0_rgb(229_231_235)] bg-gradient-to-r from-amber-50 to-amber-100"
                    )}
                  >
                    <TableRow className="bg-gradient-to-r from-amber-50 to-amber-100">
                      <TableHead className="min-w-0 font-semibold text-amber-900">
                        Title
                      </TableHead>
                      <TableHead className="hidden min-w-[5.5rem] whitespace-nowrap font-semibold text-amber-900 md:table-cell">
                        Date
                      </TableHead>
                      <TableHead className="hidden min-w-[5rem] font-semibold text-amber-900 lg:table-cell">
                        Offense
                      </TableHead>
                      <TableHead className="hidden min-w-[5rem] font-semibold lg:table-cell">
                        <SanctionTableHeadLabel theme="amber" />
                      </TableHead>
                      <TableHead className="w-[1%] min-w-[6.5rem] whitespace-nowrap text-right font-semibold text-amber-900">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingViolations ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-gray-600"
                        >
                          <Loader2 className="mr-2 inline h-5 w-5 animate-spin text-amber-600" />
                          Loading violations…
                        </TableCell>
                      </TableRow>
                    ) : sessionRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-gray-500 py-10"
                        >
                          No violations yet. Use Add Violation to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      violationsDisplayedRows.map((row) => {
                        void highlightRev;
                        const fullOffense = row.summary?.trim() ?? "";
                        const offensePreview = truncateCellPreview(row.summary);
                        const fullSanction = row.sanction?.trim() ?? "";
                        const sanctionPreview = truncateCellPreview(row.sanction);
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
                          key={row.id}
                          className={cn(
                            "transition-colors",
                            hl === "yellow" &&
                              "bg-yellow-100/95 hover:bg-yellow-100",
                            hl === "blue" &&
                              "bg-blue-100/75 hover:bg-blue-100/90",
                            hl === null && "hover:bg-gray-50"
                          )}
                        >
                          <TableCell className="min-w-0 max-w-[14rem] text-sm font-medium text-gray-900">
                            <span className="line-clamp-2" title={row.title}>
                              {row.title}
                            </span>
                            <div className="mt-1 space-y-0.5 text-[0.65rem] leading-snug text-gray-600 md:hidden">
                              <p className="tabular-nums">
                                {formatViolationDateCell(row)}
                              </p>
                              {fullOffense ? (
                                <p className="line-clamp-2" title={fullOffense}>
                                  <span className="font-medium text-gray-700">
                                    Offense:{" "}
                                  </span>
                                  {offensePreview}
                                </p>
                              ) : null}
                              {fullSanction ? (
                                <p className="line-clamp-2" title={fullSanction}>
                                  <span className="font-medium text-gray-700">
                                    Sanction:{" "}
                                  </span>
                                  {sanctionPreview}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap text-sm text-gray-700 md:table-cell">
                            {formatViolationDateCell(row)}
                          </TableCell>
                          <TableCell
                            className="hidden max-w-[7rem] text-sm text-gray-700 lg:table-cell"
                            title={
                              fullOffense
                                ? fullOffense
                                : "No offense recorded"
                            }
                          >
                            {offensePreview}
                          </TableCell>
                          <TableCell
                            className="hidden max-w-[7rem] text-sm text-gray-700 lg:table-cell"
                            title={
                              fullSanction
                                ? fullSanction
                                : "No sanction recorded"
                            }
                          >
                            {sanctionPreview}
                          </TableCell>
                          <TableCell className="w-[1%] min-w-[6.5rem] whitespace-nowrap text-right align-middle">
                            <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                              {canEditSummary ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 cursor-pointer border-amber-300 bg-white text-amber-900 hover:bg-amber-50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                                  aria-label="Edit violation"
                                  title="Edit violation"
                                  onClick={() => openEditSummary(row)}
                                >
                                  <Pencil className="h-4 w-4" aria-hidden />
                                </Button>
                              ) : null}
                              {canDeleteViolation &&
                              isDeletableViolationId(String(row.id)) ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 cursor-pointer border-red-200 bg-red-50 text-red-700 hover:bg-red-500 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label="Delete violation"
                                  title="Delete violation"
                                  disabled={deletingViolationId === String(row.id)}
                                  onClick={() => openDeleteConfirm(row)}
                                >
                                  {deletingViolationId === String(row.id) ? (
                                    <Loader2
                                      className="h-4 w-4 animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <Trash2 className="h-4 w-4" aria-hidden />
                                  )}
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0 cursor-pointer bg-amber-600 text-white hover:bg-amber-700 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                                aria-label="View details"
                                title="View details"
                                onClick={() => openView(row)}
                              >
                                <Eye className="h-4 w-4" aria-hidden />
                              </Button>
                            </div>
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
            "relative flex max-h-[min(88dvh,640px)] w-[min(92vw,24rem)] max-w-md flex-col overflow-x-hidden overflow-y-hidden border-amber-200/50 p-0 shadow-xl sm:max-h-[min(92dvh,800px)] sm:w-full sm:max-w-lg",
            dialogAnimationClass
          )}
        >
          {submittingAdd && (
            <div
              className="absolute inset-0 z-[100] flex flex-col items-center justify-center rounded-lg bg-white/80 backdrop-blur-[2px]"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="pointer-events-none mb-5 flex flex-col items-center gap-3 rounded-xl bg-white/95 px-8 py-6 shadow-lg ring-1 ring-amber-200/80">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
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
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-amber-900">
                    Saving violation…
                  </h2>
                  <p className="mt-1 max-w-[260px] text-sm text-gray-600">
                    Please wait while your memorandum is being saved.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div
            className="relative shrink-0 border-b border-amber-100/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 px-3 py-3 sm:px-6 sm:py-5"
            style={{
              backgroundImage: "url(/smct.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/88 to-amber-50/85" />
            <div className="relative flex gap-2.5 sm:gap-4">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white shadow-md ring-2 ring-amber-100 sm:h-12 sm:w-12 sm:rounded-xl"
                aria-hidden
              >
                <FileWarning className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <DialogHeader className="min-w-0 flex-1 space-y-0.5 text-left sm:space-y-1.5">
                <DialogTitle className="text-sm font-semibold leading-snug tracking-tight text-gray-900 break-words sm:text-xl">
                  Add violation
                </DialogTitle>
                <DialogDescription className="hidden text-sm leading-relaxed text-gray-600 sm:block">
                  Enter title, violation date, and offense (required). Sanction is
                  optional.
                </DialogDescription>
                {headerEmployeeName ? (
                  <p className="mt-1 truncate rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-1 text-[0.65rem] font-medium text-amber-950 sm:mt-2 sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs">
                    <span className="text-amber-800/90">For:</span>{" "}
                    <span className="font-semibold">{headerEmployeeName}</span>
                  </p>
                ) : null}
              </DialogHeader>
            </div>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3 sm:max-h-none sm:px-6 sm:py-6">
            <ol className="memorandum-violation-form min-w-0 space-y-4 sm:space-y-6">
              <li className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-0 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white sm:mt-1 sm:h-7 sm:w-7 sm:text-xs"
                  aria-hidden
                >
                  1
                </span>
                <div className="min-w-0 space-y-1.5 sm:space-y-2">
                  <Label
                    htmlFor="add-violation-title"
                    className="block text-xs font-semibold leading-snug text-gray-900 sm:text-base"
                  >
                    Violation title{" "}
                    <span className="text-red-500" aria-hidden>
                      *
                    </span>
                  </Label>
                  <p className="hidden text-xs leading-relaxed text-gray-500 sm:block">
                    Shown in the table. Example: “Uniform policy — first notice”.
                  </p>
                  <Input
                    id="add-violation-title"
                    placeholder="Short title"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    disabled={submittingAdd}
                    className="h-9 w-full min-w-0 bg-white text-sm sm:h-11 sm:text-base"
                    autoComplete="off"
                    aria-required
                  />
                </div>
              </li>

              <li className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              <li className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-0 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white sm:mt-1 sm:h-7 sm:w-7 sm:text-xs"
                  aria-hidden
                >
                  2
                </span>
                <div className="min-w-0 space-y-1.5 sm:space-y-2">
                  <Label
                    htmlFor="add-violation-date"
                    className="block text-xs font-semibold leading-snug text-gray-900 sm:text-base"
                  >
                    Violation date{" "}
                    <span className="text-red-500" aria-hidden>
                      *
                    </span>
                  </Label>
                  <Input
                    id="add-violation-date"
                    type="date"
                    value={addDateStr}
                    onChange={(e) => setAddDateStr(e.target.value)}
                    disabled={submittingAdd}
                    className="h-9 w-full min-w-0 max-w-full bg-white text-sm sm:h-11 sm:max-w-xs"
                    aria-required
                  />
                </div>
              </li>

              <li className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              <li className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-0 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white sm:mt-1 sm:h-7 sm:w-7 sm:text-xs"
                  aria-hidden
                >
                  3
                </span>
                <div className="min-w-0 space-y-1.5 sm:space-y-2">
                  <Label
                    htmlFor="add-violation-offense"
                    className="block text-xs font-semibold leading-snug text-gray-900 sm:text-base"
                  >
                    Offense{" "}
                    <span className="text-red-500" aria-hidden>
                      *
                    </span>
                  </Label>
                  <Textarea
                    id="add-violation-offense"
                    placeholder="e.g. Unauthorized absence"
                    value={addSummary}
                    onChange={(e) => setAddSummary(e.target.value)}
                    disabled={submittingAdd}
                    className="min-h-[3.5rem] w-full min-w-0 resize-y bg-white text-sm sm:min-h-[5.5rem]"
                    rows={3}
                    aria-required
                  />
                </div>
              </li>

              <li className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              <li className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-0 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white sm:mt-1 sm:h-7 sm:w-7 sm:text-xs"
                  aria-hidden
                >
                  4
                </span>
                <div className="min-w-0 space-y-1.5 sm:space-y-2">
                  <Label
                    htmlFor="add-violation-sanction"
                    className="block text-xs font-semibold leading-snug text-gray-900 sm:text-base"
                  >
                    Sanction{" "}
                    <span className="font-normal text-gray-500">(optional)</span>
                  </Label>
                  <Input
                    id="add-violation-sanction"
                    placeholder="e.g. Written warning…"
                    value={addSanction}
                    onChange={(e) => setAddSanction(e.target.value)}
                    disabled={submittingAdd}
                    className="h-9 w-full min-w-0 bg-white text-sm sm:h-11 sm:text-base"
                    autoComplete="off"
                  />
                </div>
              </li>
            </ol>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/90 px-3 py-2.5 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
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
              className="cursor-pointer w-full bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
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

      {/* Edit violation — HR / managers who can add violations */}
      <Dialog
        open={!!editingSummaryRow}
        onOpenChangeAction={(next) => {
          if (!next) {
            if (savingSummaryEdit) return;
            resetEditViolationForm();
          }
        }}
      >
        <DialogContent
          className={cn(
            "relative flex max-h-[min(88dvh,640px)] w-[min(86vw,20rem)] max-w-sm flex-col overflow-x-hidden overflow-y-hidden border-amber-200/50 p-0 shadow-xl sm:max-h-[min(92dvh,800px)] sm:w-full sm:max-w-md",
            dialogAnimationClass
          )}
        >
          {savingSummaryEdit && (
            <div
              className="absolute inset-0 z-[100] flex flex-col items-center justify-center rounded-lg bg-white/85 backdrop-blur-[2px]"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-200 bg-amber-50 shadow-md">
                <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-amber-800">
                Saving changes…
              </h2>
              <p className="mb-2 max-w-xs text-center text-sm text-gray-600">
                Please wait while the memorandum is being updated.
              </p>
            </div>
          )}
          <div
            className="relative shrink-0 border-b border-amber-100/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 px-3 py-3 sm:px-6 sm:py-5"
            style={{
              backgroundImage: "url(/smct.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/88 to-amber-50/85" />
            <div className="relative flex gap-2.5 sm:gap-4">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white shadow-md ring-2 ring-amber-100 sm:h-12 sm:w-12 sm:rounded-xl"
                aria-hidden
              >
                <Pencil className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <DialogHeader className="min-w-0 flex-1 space-y-0.5 text-left sm:space-y-1.5">
                <DialogTitle className="text-sm font-semibold leading-snug tracking-tight text-gray-900 break-words sm:text-xl">
                  Edit violation
                </DialogTitle>
                <DialogDescription className="hidden text-sm leading-relaxed text-gray-600 sm:block">
                  Update title, violation date, and offense (required). Sanction is
                  optional.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-6">
            <ol className="memorandum-violation-form min-w-0 space-y-4 sm:space-y-6">
              <li className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-0 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white sm:mt-1 sm:h-7 sm:w-7 sm:text-xs"
                  aria-hidden
                >
                  1
                </span>
                <div className="min-w-0 space-y-1.5 sm:space-y-2">
                  <Label
                    htmlFor="edit-violation-title"
                    className="block text-xs font-semibold leading-snug text-gray-900 sm:text-base"
                  >
                    Violation title{" "}
                    <span className="text-red-500" aria-hidden>
                      *
                    </span>
                  </Label>
                  <Input
                    id="edit-violation-title"
                    placeholder="Short title"
                    value={editTitleDraft}
                    onChange={(e) => setEditTitleDraft(e.target.value)}
                    disabled={savingSummaryEdit}
                    className="h-9 w-full min-w-0 bg-white text-sm sm:h-11 sm:text-base"
                    autoComplete="off"
                    aria-required
                  />
                </div>
              </li>

              <li className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              <li className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-0 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white sm:mt-1 sm:h-7 sm:w-7 sm:text-xs"
                  aria-hidden
                >
                  2
                </span>
                <div className="min-w-0 space-y-1.5 sm:space-y-2">
                  <Label
                    htmlFor="edit-violation-date"
                    className="block text-xs font-semibold leading-snug text-gray-900 sm:text-base"
                  >
                    Violation date{" "}
                    <span className="text-red-500" aria-hidden>
                      *
                    </span>
                  </Label>
                  <Input
                    id="edit-violation-date"
                    type="date"
                    value={editDateDraft}
                    onChange={(e) => setEditDateDraft(e.target.value)}
                    disabled={savingSummaryEdit}
                    className="h-9 w-full min-w-0 bg-white text-sm sm:h-11 sm:max-w-xs"
                    aria-required
                  />
                </div>
              </li>

              <li className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              <li className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-0 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white sm:mt-1 sm:h-7 sm:w-7 sm:text-xs"
                  aria-hidden
                >
                  3
                </span>
                <div className="min-w-0 space-y-1.5 sm:space-y-2">
                  <Label
                    htmlFor="edit-violation-offense"
                    className="block text-xs font-semibold leading-snug text-gray-900 sm:text-base"
                  >
                    Offense{" "}
                    <span className="text-red-500" aria-hidden>
                      *
                    </span>
                  </Label>
                  <Textarea
                    id="edit-violation-offense"
                    placeholder="e.g. Unauthorized absence"
                    value={editSummaryDraft}
                    onChange={(e) => setEditSummaryDraft(e.target.value)}
                    disabled={savingSummaryEdit}
                    className="min-h-[3.5rem] w-full min-w-0 resize-y bg-white text-sm sm:min-h-[5.5rem]"
                    rows={3}
                    aria-required
                  />
                </div>
              </li>

              <li className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              <li className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-0 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white sm:mt-1 sm:h-7 sm:w-7 sm:text-xs"
                  aria-hidden
                >
                  4
                </span>
                <div className="min-w-0 space-y-1.5 sm:space-y-2">
                  <Label
                    htmlFor="edit-violation-sanction"
                    className="block text-xs font-semibold leading-snug text-gray-900 sm:text-base"
                  >
                    Sanction{" "}
                    <span className="font-normal text-gray-500">(optional)</span>
                  </Label>
                  <Input
                    id="edit-violation-sanction"
                    placeholder="e.g. Written warning…"
                    value={editSanctionDraft}
                    onChange={(e) => setEditSanctionDraft(e.target.value)}
                    disabled={savingSummaryEdit}
                    className="h-9 w-full min-w-0 bg-white text-sm sm:h-11 sm:text-base"
                    autoComplete="off"
                  />
                </div>
              </li>
            </ol>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/90 px-3 py-2.5 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
            <Button
              type="button"
              variant="outline"
              disabled={savingSummaryEdit}
              className="cursor-pointer w-full sm:w-auto"
              onClick={() => resetEditViolationForm()}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                savingSummaryEdit ||
                !editTitleDraft.trim() ||
                !editDateDraft ||
                !editSummaryDraft.trim()
              }
              className="cursor-pointer w-full bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
              onClick={() => void handleSaveViolationEdit()}
            >
              {savingSummaryEdit ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
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
          className={cn(
            "flex max-h-[min(92dvh,900px)] w-[min(100%,calc(100vw-1rem))] max-w-2xl flex-col gap-0 overflow-hidden p-0 shadow-2xl shadow-slate-900/15 sm:max-w-3xl",
            dialogAnimationClass
          )}
        >
          <div
            className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white sm:px-8 sm:pb-7 sm:pt-7"
            style={{
              backgroundImage: "url(/smct.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/96 via-orange-600/93 to-amber-900/96" />
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-white/10 blur-3xl sm:-right-20 sm:-top-24 sm:h-56 sm:w-56"
              aria-hidden
            />
            <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
              <div className="flex min-w-0 gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner ring-1 ring-white/35 backdrop-blur-sm sm:h-14 sm:w-14 sm:rounded-2xl">
                  <FileWarning
                    className="h-5 w-5 text-white sm:h-7 sm:w-7"
                    strokeWidth={1.75}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-100/95 sm:text-[10px] sm:tracking-[0.22em]">
                    Memorandum violation
                  </p>
                  <DialogTitle className="text-left text-xl font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.65rem] sm:leading-tight">
                    Record details
                  </DialogTitle>
                  <DialogDescription className="text-left text-xs leading-relaxed text-amber-50/98 sm:text-sm">
                    Title, violation date, offense, sanction, and supporting document
                    for this memorandum record.
                  </DialogDescription>
                </div>
              </div>
              {headerEmployeeName ? (
                <div className="w-full min-w-0 shrink-0 rounded-xl border border-white/25 bg-white/15 px-3 py-2.5 text-left shadow-sm backdrop-blur-md sm:max-w-[220px] sm:px-4 sm:py-3 sm:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-100/90">
                    Employee
                  </p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-white sm:mt-1">
                    {headerEmployeeName}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain border-t border-slate-100 bg-gradient-to-b from-slate-50/95 to-white px-4 py-4 sm:px-8 sm:py-6">
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-950/[0.04] sm:rounded-2xl sm:p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-10">
                <div className="min-w-0 space-y-2 sm:pr-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                      <FileText className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    Title
                  </div>
                  <p className="break-words text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                    {viewingRow?.title ?? "—"}
                  </p>
                </div>
                <div className="min-w-0 space-y-2 border-t border-slate-100 pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200/90">
                      <Calendar className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    Violation date
                  </div>
                  <p className="text-base font-semibold tabular-nums text-slate-900 sm:text-lg">
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

              <div className="mt-6 border-t border-slate-100 pt-6 sm:mt-8 sm:pt-8">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  Offense
                </div>
                <div className="mt-3 rounded-lg border border-amber-100/90 bg-gradient-to-br from-amber-50/80 to-white px-3 py-3 ring-1 ring-amber-100/40 sm:rounded-xl sm:px-4 sm:py-4">
                  <p className="break-words whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {viewingRow?.summary?.trim() || "No offense recorded."}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6 sm:mt-8 sm:pt-8">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200/90">
                    <Scale className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  Sanction
                </div>
                <div className="mt-3 rounded-lg border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white px-3 py-3 ring-1 ring-slate-200/60 sm:rounded-xl sm:px-4 sm:py-4">
                  <p className="break-words whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {viewingRow?.sanction?.trim() || "No sanction recorded."}
                  </p>
                </div>
              </div>

              {viewingRow?.fileName || viewFileUrl ? (
                <div className="mt-6 overflow-hidden rounded-lg border border-slate-200/90 bg-slate-50/40 shadow-inner ring-1 ring-slate-950/[0.03] sm:mt-8 sm:rounded-xl">
                  <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-3 py-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:px-5 sm:py-3.5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Supporting document
                      </p>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                        {viewingRow?.fileName || "Attachment"}
                      </p>
                    </div>
                    {viewFileUrl ? (
                      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-full cursor-pointer border-amber-200 bg-white text-amber-900 hover:bg-amber-50 sm:w-auto"
                          asChild
                        >
                          <a
                            href={viewFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                          >
                            <ExternalLink className="h-4 w-4 shrink-0" />
                            Open
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9 w-full cursor-pointer sm:w-auto"
                          asChild
                        >
                          <a
                            href={viewFileUrl}
                            download={viewingRow?.fileName || undefined}
                            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                          >
                            <Download className="h-4 w-4 shrink-0" />
                            Download
                          </a>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <div className="bg-white px-3 py-4 sm:px-5 sm:py-5">
                    {!viewFileUrl && viewingRow?.fileName ? (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-600">
                        Preview link unavailable for this attachment.
                      </p>
                    ) : null}
                    {viewFileUrl && viewAttachmentKind === "image" ? (
                      <div className="overflow-hidden rounded-lg bg-slate-100/90 ring-1 ring-slate-200/70 sm:rounded-xl">
                        <img
                          src={viewFileUrl}
                          alt=""
                          className="mx-auto max-h-[min(240px,40dvh)] w-full object-contain sm:max-h-[min(340px,52vh)]"
                        />
                      </div>
                    ) : null}
                    {viewFileUrl && viewAttachmentKind === "pdf" ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-amber-200/95 bg-gradient-to-b from-amber-50/90 to-white px-4 py-8 text-center sm:gap-4 sm:rounded-xl sm:px-6 sm:py-10">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-amber-100">
                          <FileType2 className="h-8 w-8 text-amber-700" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-slate-900">
                            PDF document
                          </p>
                          <p className="max-w-sm text-xs leading-relaxed text-slate-600">
                            Use Open or Download above to view this file in your browser or
                            save a copy.
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {viewFileUrl && viewAttachmentKind === "other" ? (
                      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm text-slate-700">
                        <FileType2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                        <span>
                          Preview isn&apos;t available for this file type — use Open or
                          Download above.
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200/90 bg-slate-50/95 px-4 py-3 sm:flex-row sm:justify-end sm:px-8 sm:py-4">
            <Button
              type="button"
              className="h-10 w-full cursor-pointer bg-amber-600 text-white shadow-sm hover:bg-amber-700 sm:min-w-[120px] sm:w-auto"
              onClick={() => setViewingRow(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete violation confirmation */}
      <Dialog
        open={!!violationToDelete}
        onOpenChangeAction={(next) => {
          if (!next && !deletingViolationId) {
            setViolationToDelete(null);
          }
        }}
      >
        <DialogContent
          className={cn("max-w-md p-6", dialogAnimationClass)}
        >
          <DialogHeader className="pb-4 text-left">
            <DialogTitle className="flex items-center gap-2 text-red-800">
              <Trash2 className="h-5 w-5 shrink-0" aria-hidden />
              Delete violation
            </DialogTitle>
            <DialogDescription className="text-red-700">
              This action cannot be undone. Are you sure you want to permanently
              delete this memorandum violation?
            </DialogDescription>
          </DialogHeader>

          {violationToDelete ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-medium">{violationToDelete.title}</p>
              <p className="mt-1 text-red-800">
                {formatViolationDateCell(violationToDelete)}
              </p>
            </div>
          ) : null}

          <DialogFooter className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={!!deletingViolationId}
              className="cursor-pointer w-full sm:w-auto"
              onClick={() => setViolationToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!!deletingViolationId}
              className="cursor-pointer w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
              onClick={() => void handleDeleteViolation()}
            >
              {deletingViolationId ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete violation"
              )}
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
              {saveSuccessIsEdit ? "Updated successfully" : "Saved successfully"}
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              {saveSuccessIsEdit
                ? saveSuccessEmployeeLabel
                  ? `${saveSuccessEmployeeLabel}: your changes to this memorandum have been saved.`
                  : "Your changes to this memorandum have been saved."
                : saveSuccessEmployeeLabel
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
