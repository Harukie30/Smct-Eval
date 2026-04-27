"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiService } from "@/lib/apiService";
import { toastMessages } from "@/lib/toastMessages";

export type AssignEvaluatorTarget = {
  id: string;
  name: string;
  branchId?: string;
  departmentId?: string;
};

type CandidateEmployee = {
  id: string;
  name: string;
  email: string;
  position: string;
  role: string;
};

interface AddEmployeeToEvaluatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluator: AssignEvaluatorTarget | null;
  onAssigned?: () => void;
}

const ASSIGN_SUCCESS_DIALOG_AUTO_CLOSE_MS = 2800;

function pickRoleName(rawRoles: unknown): string {
  if (!Array.isArray(rawRoles) || rawRoles.length === 0) return "N/A";
  const nonAdmin = (rawRoles as Array<{ name?: string }>).find(
    (r) => String(r?.name ?? "").toLowerCase() !== "admin"
  );
  return String(nonAdmin?.name ?? (rawRoles[0] as { name?: string })?.name ?? "N/A");
}

function isEmployeeRole(rawRoles: unknown): boolean {
  const role = pickRoleName(rawRoles).toLowerCase();
  return role === "employee";
}

function normalizeCandidate(raw: Record<string, unknown>): CandidateEmployee {
  const firstName = String(raw.fname ?? "").trim();
  const lastName = String(raw.lname ?? "").trim();
  const fullName =
    String(raw.full_name ?? "").trim() || `${firstName} ${lastName}`.trim() || "N/A";

  return {
    id: String(raw.id ?? raw.user_id ?? `${fullName}-${raw.email ?? "unknown"}`),
    name: fullName,
    email: String(raw.email ?? "N/A"),
    position: String(
      (raw.positions as { label?: string } | undefined)?.label ?? raw.position ?? "N/A"
    ),
    role: pickRoleName(raw.roles),
  };
}

export default function AddEmployeeToEvaluatorModal({
  open,
  onOpenChange,
  evaluator,
  onAssigned,
}: AddEmployeeToEvaluatorModalProps) {
  const [rows, setRows] = useState<CandidateEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const loadCandidates = useCallback(async () => {
    if (!evaluator) return;
    setLoading(true);
    try {
      const response = await apiService.getActiveRegistrations(
        "",
        "0",
        1,
        2000,
        evaluator.branchId ?? "",
        evaluator.departmentId ?? ""
      );
      const list = Array.isArray(response)
        ? response
        : (response as { data?: unknown[]; users?: unknown[] })?.data ||
          (response as { users?: unknown[] })?.users ||
          [];

      const normalized = list
        .filter(
          (item) =>
            item &&
            typeof item === "object" &&
            isEmployeeRole((item as Record<string, unknown>).roles)
        )
        .map((item) =>
          normalizeCandidate(
            item && typeof item === "object" ? (item as Record<string, unknown>) : {}
          )
        )
        .sort((a: CandidateEmployee, b: CandidateEmployee) =>
          a.name.localeCompare(b.name)
        );

      setRows(normalized);
    } catch (error) {
      console.error("Failed to load candidate employees:", error);
      setRows([]);
      toastMessages.generic.error(
        "Failed to load employees",
        "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [evaluator]);

  useEffect(() => {
    if (!open || !evaluator) return;
    setSelectedIds(new Set());
    setSearch("");
    void loadCandidates();
  }, [open, evaluator, loadCandidates]);

  useEffect(() => {
    if (!isSuccessDialogOpen) return;
    const timeoutId = window.setTimeout(() => {
      setIsSuccessDialogOpen(false);
    }, ASSIGN_SUCCESS_DIALOG_AUTO_CLOSE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isSuccessDialogOpen]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.position.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (!evaluator) return;
    if (selectedIds.size === 0) {
      toastMessages.generic.warning(
        "No employee selected",
        "Select at least one employee to assign."
      );
      return;
    }

    setSaving(true);
    try {
      for (const employeeId of selectedIds) {
        const formData = new FormData();
        formData.append("evaluator_id", evaluator.id);
        formData.append("assigned_evaluator_id", evaluator.id);
        await apiService.updateEmployee(formData, employeeId);
      }

      setSuccessMessage(
        `${selectedIds.size} employee(s) assigned to ${evaluator.name}.`
      );
      onAssigned?.();
      onOpenChange(false);
      setIsSuccessDialogOpen(true);
    } catch (error) {
      console.error("Failed assigning employees:", error);
      toastMessages.generic.error(
        "Assignment failed",
        "Please confirm backend supports evaluator assignment on update user."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChangeAction={onOpenChange}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-blue-50/60">
            <DialogTitle className="flex items-center gap-2 text-blue-900">
              <UserPlus className="h-5 w-5" />
              Add Employees to Evaluator
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              {evaluator
                ? `Assign employees under ${evaluator.name}`
                : "Select employees to assign"}
              <Badge variant="outline" className="bg-white">
                Selected: {selectedIds.size}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-3">
            <Input
              placeholder="Search employee by name, email, or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading || saving}
              className="w-full sm:max-w-md"
            />

            <div className="border rounded-lg bg-white max-h-[55vh] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading employees...
                </div>
              ) : (
                <Table wrapperClassName="rounded-lg">
                  <TableHeader className="sticky top-0 z-10 bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[64px]">Pick</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-sm text-slate-500">
                          No employees found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-blue-50/40">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(row.id)}
                              onChange={() => handleToggleSelect(row.id)}
                              className="h-4 w-4 cursor-pointer"
                              disabled={saving}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell>{row.position}</TableCell>
                          <TableCell className="capitalize">{row.role}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-2 border-t bg-gray-50/95">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="cursor-pointer min-w-24"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={saving || loading || selectedIds.size === 0}
              className="cursor-pointer min-w-32 bg-blue-600 text-white hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSuccessDialogOpen} onOpenChangeAction={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-sm w-[90vw] px-6 py-6">
          <DialogHeader className="text-center sm:text-center border-0 pb-0">
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
              {successMessage || "Employees assigned successfully."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center" />
        </DialogContent>
      </Dialog>
    </>
  );
}
