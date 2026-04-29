"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toastMessages } from "@/lib/toastMessages";
import { apiService } from "@/lib/apiService";
import { Eye, RefreshCw, Users2 } from "lucide-react";
import AddEmployeeToEvaluatorModal, {
  AssignEvaluatorTarget,
} from "@/components/hr/AddEmployeeToEvaluatorModal";

type EvaluatorRow = {
  id: string;
  name: string;
  email: string;
  position: string;
  role: string;
  branch: string;
  branchId?: string;
  departmentId?: string;
};

type StaffRow = {
  id: string;
  name: string;
  email: string;
  position: string;
  branch: string;
  role: string;
};

function getDisplayRole(roles: unknown): string {
  if (!Array.isArray(roles) || roles.length === 0) return "N/A";
  const nonAdmin = (roles as Array<{ name?: string }>).find(
    (r) => String(r?.name ?? "").toLowerCase() !== "admin"
  );
  return String(nonAdmin?.name ?? (roles[0] as { name?: string })?.name ?? "N/A");
}

function normalizeEvaluator(raw: Record<string, unknown>): EvaluatorRow {
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
    role: getDisplayRole(raw.roles),
    branch: String(
      (raw.branch as { branch_name?: string; branch_code?: string } | undefined)
        ?.branch_name ??
        raw.branch_name ??
        (raw.branches as { branch_name?: string; branch_code?: string } | undefined)
          ?.branch_name ??
        "Unassigned"
    ),
    branchId:
      raw.branch_id != null && String(raw.branch_id).trim() !== ""
        ? String(raw.branch_id)
        : undefined,
    departmentId:
      raw.department_id != null && String(raw.department_id).trim() !== ""
        ? String(raw.department_id)
        : undefined,
  };
}

function normalizeStaff(raw: Record<string, unknown>): StaffRow {
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
    branch: String(
      (raw.branch as { branch_name?: string; branch_code?: string } | undefined)
        ?.branch_name ??
        raw.branch_name ??
        (raw.branches as { branch_name?: string; branch_code?: string } | undefined)
          ?.branch_name ??
        "Unassigned"
    ),
    role: getDisplayRole(raw.roles),
  };
}

function extractAssignedEmployees(raw: unknown): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;

  const candidates: unknown[] = [
    root.employees,
    (root.employees as Record<string, unknown> | undefined)?.data,
    root.assignedEmployees,
    (root.assignedEmployees as Record<string, unknown> | undefined)?.data,
    root.assigned_employees,
    (root.assigned_employees as Record<string, unknown> | undefined)?.data,
    root.users,
    (root.users as Record<string, unknown> | undefined)?.data,
    root.data,
    data?.employees,
    (data?.employees as Record<string, unknown> | undefined)?.data,
    data?.assignedEmployees,
    (data?.assignedEmployees as Record<string, unknown> | undefined)?.data,
    data?.assigned_employees,
    (data?.assigned_employees as Record<string, unknown> | undefined)?.data,
    data?.users,
    (data?.users as Record<string, unknown> | undefined)?.data,
    data?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

export default function HRSubordinatesPage() {
  const [rows, setRows] = useState<EvaluatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedEvaluator, setSelectedEvaluator] = useState<EvaluatorRow | null>(null);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);

  const loadEvaluators = useCallback(async (softRefresh = false) => {
    if (softRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await apiService.getAllEvaluators({
        page: 1,
        per_page: 1000,
      });

      const evaluatorsRaw = Array.isArray(response?.evaluators)
        ? response.evaluators
        : Array.isArray(response?.evaluators?.data)
          ? response.evaluators.data
          : Array.isArray(response?.data?.evaluators)
            ? response.data.evaluators
            : Array.isArray(response?.data?.evaluators?.data)
              ? response.data.evaluators.data
              : [];

      const normalized = evaluatorsRaw
        .map((item: unknown) =>
          normalizeEvaluator(
            item && typeof item === "object" ? (item as Record<string, unknown>) : {}
          )
        )
        .sort((a: EvaluatorRow, b: EvaluatorRow) => a.name.localeCompare(b.name));

      setRows(normalized);
    } catch (error) {
      console.error("Failed to load evaluators:", error);
      setRows([]);
      toastMessages.generic.error(
        "Failed to load evaluators",
        "Please try refreshing the list."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEvaluators();
  }, [loadEvaluators]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.position.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const loadStaffForEvaluator = useCallback(async (evaluator: EvaluatorRow) => {
    setLoadingStaff(true);
    setStaffRows([]);
    setSelectedEvaluator(evaluator);
    setIsStaffModalOpen(true);
    try {
      const response = await apiService.getAllEvaluatorAssignedEmployees(
        evaluator.id,
        {
          page: 1,
          per_page: 500,
        }
      );
      const employeesRaw = extractAssignedEmployees(response);

      const normalized = employeesRaw
        .map((item: unknown) =>
          normalizeStaff(
            item && typeof item === "object" ? (item as Record<string, unknown>) : {}
          )
        )
        .sort((a: StaffRow, b: StaffRow) => a.name.localeCompare(b.name));

      setStaffRows(normalized);
    } catch (error) {
      console.error("Failed to load corresponding staff:", error);
      toastMessages.generic.error(
        "Failed to load staff list",
        "Please try again."
      );
      setStaffRows([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-slate-200/90 shadow-md">
        <div
          className="relative overflow-hidden px-6 py-6 text-white"
          style={{
            backgroundImage: "url(/smct.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/95 via-blue-600/92 to-indigo-800/95" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/30 backdrop-blur-sm">
                <Users2 className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <CardTitle className="border-0 text-2xl font-semibold tracking-tight text-blue-50/95 shadow-none">
                  Subordinates
                </CardTitle>
                <CardDescription className="max-w-2xl text-base leading-relaxed text-blue-50/90">
                  Review evaluator accounts and open each staff list to manage the
                  employees assigned under them.
                </CardDescription>
              </div>
            </div>
         
          </div>
        </div>
        
        <CardContent className="space-y-4 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white pt-6">
          <Input
            placeholder="Search evaluator by name, email, position, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-md"
            
          />
         
          <Button
              type="button"
              disabled={loading || refreshing}
              onClick={() => {
                void loadEvaluators(true);
              }}
              className="cursor-pointer bg-blue-500 text-white hover:bg-blue-600 hover:text-white hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
        
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/80">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={`sk-${idx}`}>
                      <TableCell>
                        <Skeleton className="h-5 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-8 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-slate-500">
                      No evaluators found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.position}</TableCell>
                      <TableCell>{row.branch}</TableCell>
                      <TableCell>{row.role}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="cursor-pointer bg-blue-500 text-white hover:bg-blue-600 hover:text-white hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
                          onClick={() => {
                            void loadStaffForEvaluator(row);
                          }}
                        >
                          <Eye className="mr-1.5 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isStaffModalOpen}
        onOpenChangeAction={(open) => {
          if (!open) {
            setIsStaffModalOpen(false);
            setSelectedEvaluator(null);
            setStaffRows([]);
          }
        }}
      >
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
            <DialogTitle className="text-xl font-semibold text-white">
              Corresponding Staff
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              {selectedEvaluator
                ? `Staff list linked to evaluator: ${selectedEvaluator.name}`
                : "Staff list for selected evaluator."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 bg-slate-50/60">
          <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/90">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStaff ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={`staff-sk-${idx}`}>
                      <TableCell>
                        <Skeleton className="h-5 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-44" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : staffRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                      No corresponding staff found.
                    </TableCell>
                  </TableRow>
                ) : (
                  staffRows.map((staff) => (
                    <TableRow key={staff.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-medium text-slate-900">{staff.name}</TableCell>
                      <TableCell>{staff.email}</TableCell>
                      <TableCell>{staff.position}</TableCell>
                      <TableCell>{staff.branch}</TableCell>
                      <TableCell>{staff.role}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          </div>

          <DialogFooter className="border-t bg-white px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setIsStaffModalOpen(false);
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              className="cursor-pointer bg-blue-500 text-white hover:bg-blue-600 hover:text-white hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => {
                setIsAddEmployeeModalOpen(true);
              }}
            >
              Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddEmployeeToEvaluatorModal
        open={isAddEmployeeModalOpen}
        onOpenChange={setIsAddEmployeeModalOpen}
        evaluator={
          selectedEvaluator
            ? ({
                id: selectedEvaluator.id,
                name: selectedEvaluator.name,
                branchId: selectedEvaluator.branchId,
                departmentId: selectedEvaluator.departmentId,
              } as AssignEvaluatorTarget)
            : null
        }
        onAssigned={() => {
          if (selectedEvaluator) {
            void loadStaffForEvaluator(selectedEvaluator);
          }
        }}
      />
    </div>
  );
}
