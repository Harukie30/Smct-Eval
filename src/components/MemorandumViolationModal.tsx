"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, FileWarning, X, Eye, Upload } from "lucide-react";
import { format, parseISO } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  fileName?: string | null;
  /** Present only for same-session uploads; used for download preview. */
  file?: File | null;
};

export interface MemorandumViolationModalProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  dialogAnimationClass?: string;
  employee: User | null;
  branchFilterForEmployeePicker?: string;
  shouldHideAdminUsers?: boolean;
}

/** Image or PDF only (required attachment). */
const ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,image/bmp,.jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,application/pdf";

function isAllowedAttachmentFile(f: File): boolean {
  const lower = f.name.toLowerCase();
  const extOk = /\.(jpe?g|png|gif|webp|bmp|pdf)$/i.test(lower);
  const typeOk =
    f.type.startsWith("image/") ||
    f.type === "application/pdf" ||
    f.type === "";
  return extOk && typeOk;
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

export default function MemorandumViolationModal({
  open,
  onOpenChangeAction,
  dialogAnimationClass = "",
  employee,
  branchFilterForEmployeePicker,
  shouldHideAdminUsers = true,
}: MemorandumViolationModalProps) {
  const [pickerUsers, setPickerUsers] = useState<User[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [sessionRows, setSessionRows] = useState<MemorandumSessionRow[]>([]);
  const [viewingRow, setViewingRow] = useState<MemorandumSessionRow | null>(
    null
  );

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDateStr, setAddDateStr] = useState(() => localDateInputValue());
  const [addFile, setAddFile] = useState<File | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  /** Brief loading after file chooser closes (attachment handling). */
  const [fileHandling, setFileHandling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAddForm = useCallback(() => {
    setAddTitle("");
    setAddDateStr(localDateInputValue());
    setAddFile(null);
    setFileHandling(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = useCallback(() => {
    onOpenChangeAction(false);
    setPickerUsers([]);
    setSelectedEmployeeId("");
    setSessionRows([]);
    setViewingRow(null);
    setAddModalOpen(false);
    resetAddForm();
  }, [onOpenChangeAction, resetAddForm]);

  useEffect(() => {
    if (!open) return;

    if (employee?.id != null) {
      setSelectedEmployeeId(String(employee.id));
      setSessionRows([]);
      return;
    }

    setSelectedEmployeeId("");
    setSessionRows([]);
  }, [open, employee]);

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
    if (employee?.id != null) return employee;
    if (!selectedEmployeeId) return null;
    return (
      pickerUsers.find((u) => String(u.id) === String(selectedEmployeeId)) ||
      null
    );
  };

  const handleAddViolationSubmit = async () => {
    const target = resolveTargetUser();
    if (!target?.id) {
      toastMessages.form.validationError();
      return;
    }
    const t = addTitle.trim();
    if (!t || !addDateStr || !addFile) {
      toastMessages.form.validationError();
      return;
    }
    const violation_date = addDateStr;

    setSubmittingAdd(true);
    try {
      const fd = new FormData();
      fd.append("user_id", String(target.id));
      fd.append("violation_date", violation_date);
      fd.append("title", t);
      fd.append("document", addFile);

      await apiService.addMemorandumViolation(fd);

      const name = `${target.fname || ""} ${target.lname || ""}`.trim();
      toastMessages.generic.success(
        "Memorandum violation recorded",
        `${name}: violation has been saved.`
      );

      setSessionRows((prev) => [
        {
          id: `local-${Date.now()}`,
          title: t,
          violation_date,
          fileName: addFile?.name ?? null,
          file: addFile,
        },
        ...prev,
      ]);
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
  const pickerOptions = pickerUsers.map((u) => ({
    value: String(u.id),
    label: `${u.fname || ""} ${u.lname || ""} (${u.email || "no email"})`.trim(),
  }));

  const employeeSubtitle = employee
    ? `${employee.fname} ${employee.lname}`
    : "Select an employee and manage memorandum violations";

  const addViolationDisabled =
    submittingAdd ||
    (showEmployeePicker && (!selectedEmployeeId || loadingPicker));

  const viewFileUrl =
    viewingRow?.file && viewingRow.file instanceof File
      ? URL.createObjectURL(viewingRow.file)
      : null;

  useEffect(() => {
    return () => {
      if (viewFileUrl) URL.revokeObjectURL(viewFileUrl);
    };
  }, [viewFileUrl]);

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
                <p className="mt-2 text-sm text-white/90 leading-snug">
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

            <div className="flex justify-end">
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-amber-50 to-amber-100">
                      <TableHead className="font-semibold text-amber-900 min-w-[140px]">
                        Title
                      </TableHead>
                      <TableHead className="font-semibold text-amber-900 min-w-[120px] whitespace-nowrap">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-amber-900 w-[120px] text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-gray-500 py-10"
                        >
                          No violations yet. Use Add Violation to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sessionRows.map((row) => (
                        <TableRow
                          key={row.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="text-gray-900 text-sm font-medium">
                            {row.title}
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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
                  Enter a title, the violation date, and one supporting file (image
                  or PDF). All fields are required.
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
                      Supporting file{" "}
                      <span className="text-red-500" aria-hidden>
                        *
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Upload one image (JPG, PNG, GIF, WebP, BMP) or a PDF.
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ATTACHMENT_ACCEPT}
                  className="hidden"
                  disabled={submittingAdd || fileHandling}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) {
                      setAddFile(null);
                      return;
                    }
                    setFileHandling(true);
                    try {
                      await new Promise((r) => setTimeout(r, 500));
                      if (!isAllowedAttachmentFile(f)) {
                        toastMessages.generic.warning(
                          "Unsupported file",
                          "Please choose an image (e.g. JPG, PNG) or a PDF."
                        );
                        e.target.value = "";
                        setAddFile(null);
                        return;
                      }
                      setAddFile(f);
                    } finally {
                      setFileHandling(false);
                    }
                  }}
                />
                <div className="relative ml-0 rounded-xl border-2 border-dashed border-amber-200/90 bg-amber-50/40 p-5 sm:ml-9">
                  {fileHandling && (
                    <div
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[inherit] bg-white/80 backdrop-blur-[1px]"
                      aria-busy="true"
                      aria-live="polite"
                    >
                      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-200 bg-amber-50 shadow-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                      </div>
                      <p className="text-sm font-medium text-amber-900">
                        Processing attachment…
                      </p>
                      <p className="mt-1 max-w-[14rem] text-center text-xs text-gray-600">
                        Please wait while the file is checked.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        Image or PDF
                      </p>
                      <p className="text-xs text-gray-500">
                        One file — required to save
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submittingAdd || fileHandling}
                      className="cursor-pointer shrink-0 border-amber-300 bg-white hover:bg-amber-50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose file
                    </Button>
                  </div>
                  {addFile && !fileHandling ? (
                    <p className="mt-3 truncate text-sm text-amber-900">
                      <span className="font-medium">Selected:</span> {addFile.name}
                    </p>
                  ) : !fileHandling ? (
                    <p className="mt-3 text-xs text-amber-800/90">
                      No file selected — attach an image or PDF to continue.
                    </p>
                  ) : null}
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
                !addFile
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

      {/* View details */}
      <Dialog
        open={!!viewingRow}
        onOpenChangeAction={(next) => {
          if (!next) setViewingRow(null);
        }}
      >
        <DialogContent className={`max-w-md p-6 ${dialogAnimationClass}`}>
          <DialogHeader>
            <DialogTitle className="text-lg">Memorandum</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm">
            <div>
              <span className="font-medium text-gray-600">Title</span>
              <p className="mt-1 text-gray-900">{viewingRow?.title}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Date</span>
              <p className="mt-1 text-gray-900">
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
            {viewingRow?.fileName ? (
              <div>
                <span className="font-medium text-gray-600">Supporting file</span>
                <p className="mt-1 text-gray-900">{viewingRow.fileName}</p>
                {viewFileUrl &&
                  viewingRow.file?.type?.startsWith("image/") && (
                    <img
                      src={viewFileUrl}
                      alt=""
                      className="mt-2 max-h-52 w-auto max-w-full rounded-md border border-gray-200 object-contain"
                    />
                  )}
                {viewFileUrl && (
                  <a
                    href={viewFileUrl}
                    download={viewingRow.fileName}
                    className="inline-block mt-2 text-amber-700 underline text-sm"
                  >
                    Download file
                  </a>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              className="cursor-pointer"
              onClick={() => setViewingRow(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
