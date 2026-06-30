"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitBranch, Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiService } from "@/lib/apiService";
import { toastMessages } from "@/lib/toastMessages";
import { cn } from "@/lib/utils";

export type ApprovalFlowEvaluator = {
  id: string;
  name: string;
};

type RequiresApprovalValue = "yes" | "no" | "";

type ApproverOption = {
  value: string;
  label: string;
};

type ApproverRow = {
  key: string;
  value: string | number;
};

function createApproverRow(): ApproverRow {
  return {
    key: `approver-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    value: "",
  };
}

const APPROVAL_FLOW_SUCCESS_AUTO_CLOSE_MS = 2800;
const APPROVAL_FLOW_SAVE_MIN_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export interface ApprovalFlowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluator: ApprovalFlowEvaluator | null;
}

function getDisplayRole(roles: unknown): string {
  if (!Array.isArray(roles) || roles.length === 0) return "N/A";
  const nonAdmin = (roles as Array<{ name?: string }>).find(
    (r) => String(r?.name ?? "").toLowerCase() !== "admin"
  );
  return String(nonAdmin?.name ?? (roles[0] as { name?: string })?.name ?? "N/A");
}

function normalizeApproverOption(raw: Record<string, unknown>): ApproverOption | null {
  const firstName = String(raw.fname ?? "").trim();
  const lastName = String(raw.lname ?? "").trim();
  const fullName =
    String(raw.full_name ?? "").trim() || `${firstName} ${lastName}`.trim();
  const id = raw.id ?? raw.user_id;
  if (id == null || fullName === "") return null;

  const role = getDisplayRole(raw.roles);
  const email = String(raw.email ?? "").trim();

  return {
    value: String(id),
    label: email ? `${fullName} (${email}) · ${role}` : `${fullName} · ${role}`,
  };
}

function extractEvaluatorOptions(raw: unknown): ApproverOption[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;

  const data =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null;

  const lists: unknown[] = [];
  const candidates = [
    root.evaluators,
    root.evaluators_by_branch,
    root.evaluatorsByBranch,
    root.users,
    root.data,
    data?.evaluators,
    data?.evaluators_by_branch,
    data?.evaluatorsByBranch,
    data?.users,
    data?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      lists.push(candidate);
      continue;
    }
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const nested = (candidate as Record<string, unknown>).data;
      if (Array.isArray(nested)) lists.push(nested);
    }
  }

  const seen = new Set<string>();
  const options: ApproverOption[] = [];

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const option = normalizeApproverOption(item as Record<string, unknown>);
      if (!option || seen.has(option.value)) continue;
      seen.add(option.value);
      options.push(option);
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export default function ApprovalFlowModal({
  open,
  onOpenChange,
  evaluator,
}: ApprovalFlowModalProps) {
  const [requiresApproval, setRequiresApproval] = useState<RequiresApprovalValue>("");
  const [approverRows, setApproverRows] = useState<ApproverRow[]>([createApproverRow()]);
  const [approverOptions, setApproverOptions] = useState<ApproverOption[]>([]);
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const resetApprovalForm = useCallback(() => {
    setRequiresApproval("");
    setApproverRows([createApproverRow()]);
    setLoadingApprovers(false);
    setSaving(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetApprovalForm();
        setApproverOptions([]);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetApprovalForm]
  );

  useEffect(() => {
    if (!open || !evaluator?.id) return;

    let cancelled = false;
    setLoadingApprovers(true);

    void (async () => {
      try {
        const response = await apiService.getEvaluatorsByBranch(evaluator.id);
        if (cancelled) return;
        const options = extractEvaluatorOptions(response).filter(
          (option) => option.value !== evaluator.id
        );
        setApproverOptions(options);
      } catch (error) {
        console.error("Failed to load branch evaluators:", error);
        if (!cancelled) {
          setApproverOptions([]);
          toastMessages.generic.error(
            "Failed to load approvers",
            "Could not load evaluators for this branch. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoadingApprovers(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, evaluator?.id]);

  useEffect(() => {
    if (!isSuccessDialogOpen) return;
    const timeoutId = window.setTimeout(() => {
      setIsSuccessDialogOpen(false);
    }, APPROVAL_FLOW_SUCCESS_AUTO_CLOSE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isSuccessDialogOpen]);

  useEffect(() => {
    if (!isSuccessDialogOpen) {
      setSuccessMessage("");
    }
  }, [isSuccessDialogOpen]);

  useEffect(() => {
    if (requiresApproval !== "yes") {
      setApproverRows([createApproverRow()]);
    }
  }, [requiresApproval]);

  const comboboxDisabled =
    requiresApproval !== "yes" || loadingApprovers || saving;

  const comboboxPlaceholder = useMemo(() => {
    if (requiresApproval !== "yes") return "Select Yes to choose approvers";
    if (loadingApprovers) return "Loading approvers...";
    return "Select approver...";
  }, [requiresApproval, loadingApprovers]);

  const getOptionsForRow = useCallback(
    (rowKey: string, rowValue: string | number) => {
      const selectedElsewhere = new Set(
        approverRows
          .filter((row) => row.key !== rowKey && row.value !== "")
          .map((row) => String(row.value))
      );

      return approverOptions.filter((option) => {
        const optionValue = String(option.value);
        if (optionValue === String(rowValue)) return true;
        return !selectedElsewhere.has(optionValue);
      });
    },
    [approverOptions, approverRows]
  );

  const handleApproverChange = useCallback((rowKey: string, value: string | number) => {
    setApproverRows((prev) =>
      prev.map((row) => (row.key === rowKey ? { ...row, value } : row))
    );
  }, []);

  const handleAddApproverRow = useCallback(() => {
    setApproverRows((prev) => [...prev, createApproverRow()]);
  }, []);

  const handleRemoveApproverRow = useCallback((rowKey: string) => {
    setApproverRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.key !== rowKey);
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!evaluator?.id) return;

    if (requiresApproval === "") {
      toastMessages.generic.error(
        "Requires approval is required",
        "Choose Yes or No before saving."
      );
      return;
    }

    if (requiresApproval === "yes") {
      const selectedApproverIds = approverRows
        .map((row) => row.value)
        .filter((value) => value !== "");

      if (selectedApproverIds.length === 0) {
        toastMessages.generic.error(
          "Approver is required",
          "Select at least one approver when approval is required."
        );
        return;
      }

      const uniqueIds = new Set(selectedApproverIds.map((id) => String(id)));
      if (uniqueIds.size !== selectedApproverIds.length) {
        toastMessages.generic.error(
          "Duplicate approvers",
          "Each approver can only be selected once."
        );
        return;
      }
    }

    setSaving(true);
    const saveStartedAt = Date.now();
    try {
      // API wiring will be added when backend endpoint is available.
      const approverCount = approverRows.filter((row) => row.value !== "").length;
      const message =
        requiresApproval === "yes"
          ? `Approval flow saved for ${evaluator.name}${
              approverCount > 0
                ? ` with ${approverCount} approver${approverCount === 1 ? "" : "s"}.`
                : "."
            }`
          : `Approval is not required for ${evaluator.name}.`;

      const elapsed = Date.now() - saveStartedAt;
      if (elapsed < APPROVAL_FLOW_SAVE_MIN_MS) {
        await delay(APPROVAL_FLOW_SAVE_MIN_MS - elapsed);
      }

      setSuccessMessage(message);
      resetApprovalForm();
      setApproverOptions([]);
      onOpenChange(false);
      setIsSuccessDialogOpen(true);
    } finally {
      setSaving(false);
    }
  }, [
    evaluator,
    requiresApproval,
    approverRows,
    resetApprovalForm,
    onOpenChange,
  ]);

  return (
    <>
      <Dialog open={open} onOpenChangeAction={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-full max-w-[min(100vw-2rem,32rem)] flex-col overflow-hidden p-0">
        <DialogHeader className="relative shrink-0 overflow-hidden border-b border-emerald-500/60 bg-emerald-600 px-4 py-4 text-white sm:px-6 sm:py-5">
          <div
            className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.12]"
            style={{ backgroundImage: "url('/smct.png')", backgroundSize: "100%" }}
            aria-hidden
          />
          <div className="relative min-w-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/20 ring-1 ring-white/30">
                <GitBranch className="h-4.5 w-4.5" />
              </div>
              {evaluator
                ? `Approval flow for "${evaluator.name}"`
                : "Approval flow"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-emerald-50">
              Configure whether subordinate assignments require approval and who
              approves them.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 bg-gradient-to-b from-slate-50/80 to-white px-4 py-5 sm:px-6">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-800">
              Requires approval?
            </legend>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="approval-flow-yes"
                  name="requiresApproval"
                  value="yes"
                  checked={requiresApproval === "yes"}
                  disabled={saving}
                  onChange={() => setRequiresApproval("yes")}
                  className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label
                  htmlFor="approval-flow-yes"
                  className="cursor-pointer font-normal text-slate-700"
                >
                  Yes
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="approval-flow-no"
                  name="requiresApproval"
                  value="no"
                  checked={requiresApproval === "no"}
                  disabled={saving}
                  onChange={() => setRequiresApproval("no")}
                  className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label
                  htmlFor="approval-flow-no"
                  className="cursor-pointer font-normal text-slate-700"
                >
                  No
                </Label>
              </div>
            </div>
          </fieldset>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label
                className={cn(
                  "text-slate-800",
                  requiresApproval !== "yes" && "text-slate-500"
                )}
              >
                Approvers
              </Label>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Add approver"
                title="Add approver"
                disabled={comboboxDisabled}
                className="h-8 w-8 shrink-0 cursor-pointer border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                onClick={handleAddApproverRow}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {approverRows.map((row, index) => (
                <div key={row.key} className="flex items-start gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Combobox
                      options={getOptionsForRow(row.key, row.value)}
                      value={row.value}
                      onValueChangeAction={(value) =>
                        handleApproverChange(row.key, value)
                      }
                      placeholder={comboboxPlaceholder}
                      searchPlaceholder="Search approvers..."
                      emptyText={
                        loadingApprovers
                          ? "Loading approvers..."
                          : "No approvers found."
                      }
                      disabled={comboboxDisabled}
                      className="border-slate-200 bg-white shadow-sm"
                    />
                    {loadingApprovers && index === 0 ? (
                      <Loader2
                        className="pointer-events-none absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  {approverRows.length > 1 ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label={`Remove approver ${index + 1}`}
                      title="Remove approver"
                      disabled={comboboxDisabled}
                      className="h-10 w-10 shrink-0 cursor-pointer border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleRemoveApproverRow(row.key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-white px-4 py-3 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            className="cursor-pointer bg-red-600 text-white hover:bg-red-700 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || !evaluator}
            className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            onClick={() => {
              void handleSave();
            }}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Saving...
              </span>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <Dialog open={isSuccessDialogOpen} onOpenChangeAction={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-sm w-[90vw] px-6 py-6">
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
              {successMessage || "Approval flow saved successfully."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center">
            <Button
              type="button"
              onClick={() => setIsSuccessDialogOpen(false)}
              className="cursor-pointer rounded-lg bg-green-600 px-8 py-2 font-medium text-white transition-colors hover:bg-green-700"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
