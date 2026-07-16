"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  X,
  Mail,
  Briefcase,
  Building2,
  User,
  Hash,
  Phone,
  Shield,
  UserCircle,
  Calendar,
  MapPin,
  Users,
} from "lucide-react";
import { User as UserType } from "../contexts/UserContext";
import apiService from "@/lib/apiService";

type SupervisorDisplay = {
  name: string;
  email?: string;
  position?: string;
};

function extractSupervisorFromUnknown(raw: unknown): SupervisorDisplay | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t ? { name: t } : null;
  }
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const fullName =
    String(o.full_name ?? "").trim() ||
    [o.fname, o.lname].filter(Boolean).map(String).join(" ").trim() ||
    String(o.name ?? "").trim();
  if (!fullName) return null;
  const pos =
    String(
      (o.positions as { label?: string } | undefined)?.label ??
        (o.positions as { name?: string } | undefined)?.name ??
        o.position ??
        ""
    ).trim() || undefined;
  const email = String(o.email ?? "").trim() || undefined;
  return { name: fullName, email, position: pos };
}

function pickSupervisorCandidate(raw: unknown): SupervisorDisplay | null {
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const info = extractSupervisorFromUnknown(item);
      if (info) return info;
    }
    return null;
  }
  return extractSupervisorFromUnknown(raw);
}

function getRecordRoot(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    return root.data as Record<string, unknown>;
  }
  return root;
}

function coerceUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getApproverSequence(record: Record<string, unknown>): number | null {
  const pivot =
    record.pivot && typeof record.pivot === "object"
      ? (record.pivot as Record<string, unknown>)
      : null;
  const seq = pivot?.sequence ?? record.sequence;
  if (seq == null || seq === "") return null;
  const n = Number(seq);
  return Number.isFinite(n) ? n : null;
}

function getApproverBySequenceFromArray(
  raw: unknown,
  sequence: 1 | 2
): SupervisorDisplay | null {
  const root = getRecordRoot(raw);
  if (!root) return null;

  const arrays = [
    root.assigned_approver,
    root.assigned_approvers,
    root.assignedApprover,
    root.assignedApprovers,
    root.approvers,
  ];

  for (const arr of arrays) {
    for (const item of coerceUnknownArray(arr)) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      if (getApproverSequence(record) !== sequence) continue;
      const info = extractSupervisorFromUnknown(record);
      if (info) return info;
    }
  }
  return null;
}

function getApproverFromFlatField(
  raw: unknown,
  sequence: 1 | 2
): SupervisorDisplay | null {
  const root = getRecordRoot(raw);
  if (!root) return null;

  const keys =
    sequence === 1
      ? ["approver_1", "approver1", "approver_1_user"]
      : ["approver_2", "approver2", "approver_2_user"];

  for (const k of keys) {
    const info = extractSupervisorFromUnknown(root[k]);
    if (info) return info;
  }
  return null;
}

function pickAssignedEvaluator(raw: unknown): SupervisorDisplay | null {
  const root = getRecordRoot(raw);
  if (!root) return null;

  const keys = [
    "assigned_evaluator",
    "assigned_evaluators",
    "assignedEvaluator",
    "assignedEvaluators",
    "evaluator",
  ];

  for (const k of keys) {
    const info = pickSupervisorCandidate(root[k]);
    if (info) return info;
  }
  return null;
}

/** Approver sequence 2 → sequence 1 → assigned evaluator. */
function pickSupervisorWithApproverPriority(
  raw: unknown
): SupervisorDisplay | null {
  const root = getRecordRoot(raw);
  if (!root) return null;

  const sources: Record<string, unknown>[] = [root];
  for (const k of [
    "assigned_evaluator",
    "assigned_evaluators",
    "assignedEvaluator",
    "assignedEvaluators",
    "evaluator",
  ]) {
    const nested = root[k];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      sources.push(nested as Record<string, unknown>);
    }
  }

  for (const source of sources) {
    const seq2 =
      getApproverBySequenceFromArray(source, 2) ??
      getApproverFromFlatField(source, 2);
    if (seq2) return seq2;
  }

  for (const source of sources) {
    const seq1 =
      getApproverBySequenceFromArray(source, 1) ??
      getApproverFromFlatField(source, 1);
    if (seq1) return seq1;
  }

  return pickAssignedEvaluator(root);
}

function pickSupervisorFromEmployee(
  emp: UserType | null
): SupervisorDisplay | null {
  if (!emp) return null;
  return pickSupervisorWithApproverPriority(emp);
}

type BranchLike = {
  branch_name?: string;
  branch?: string;
  name?: string;
  acronym?: string;
  branch_code?: string;
};

/** API may send `branch` (object), `branches` (array/object), or flat `branch_name`. */
function pickEmployeeBranchLabel(emp: UserType | null): string {
  if (!emp) return "";
  const e = emp as unknown as Record<string, unknown>;

  const fromBranchObject = (raw: unknown): string => {
    if (!raw || typeof raw !== "object") return "";
    const o = raw as BranchLike;
    return (
      String(o.branch_name ?? "").trim() ||
      String(o.branch ?? "").trim() ||
      String(o.name ?? "").trim() ||
      String(o.acronym ?? "").trim() ||
      String(o.branch_code ?? "").trim()
    );
  };

  if (typeof e.branch === "string" && String(e.branch).trim()) {
    return String(e.branch).trim();
  }

  const fromSingular = fromBranchObject(e.branch);
  if (fromSingular) return fromSingular;

  const branches = e.branches;
  if (Array.isArray(branches)) {
    for (const item of branches) {
      const label =
        typeof item === "string"
          ? item.trim()
          : fromBranchObject(item);
      if (label) return label;
    }
  } else {
    const fromPlural = fromBranchObject(branches);
    if (fromPlural) return fromPlural;
  }

  return String(e.branch_name ?? "").trim();
}

function pickSupervisorFromDashboard(
  dashboard: unknown
): SupervisorDisplay | null {
  return pickSupervisorWithApproverPriority(dashboard);
}

interface ViewEmployeeModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  employee: UserType | null;
  onStartEvaluationAction: (employee: UserType) => void;
  onViewSubmissionAction: (submission: any) => void;
  designVariant?: "default" | "admin"; // New prop for design variant
}

export default function ViewEmployeeModal({
  isOpen,
  onCloseAction,
  employee,
  onStartEvaluationAction,
  designVariant = "default",
}: ViewEmployeeModalProps) {
  const [totalEvaluations, setTotalEvaluations] = useState<any>(0);
  const [average, setAverage] = useState<any>(0);
  const [highestRating, setHighestRating] = useState<any>(0);
  const [recentEvaluation, setRecentEvaluation] = useState<any>([]);
  const [supervisorInfo, setSupervisorInfo] = useState<SupervisorDisplay | null>(
    null
  );

  useEffect(() => {
    if (!isOpen || !employee) {
      setSupervisorInfo(null);
      return;
    }
    setSupervisorInfo(pickSupervisorFromEmployee(employee));
    const loadDashboard = async () => {
      try {
        const dashboard = await apiService.employeeDashboard2(
          Number(employee?.id)
        );
        setHighestRating(dashboard.highest_rating);
        setTotalEvaluations(dashboard.total_evaluations);
        setAverage(dashboard.average);
        setRecentEvaluation(dashboard.recent_evaluation);
        const fromDash = pickSupervisorFromDashboard(dashboard);
        setSupervisorInfo(
          fromDash ?? pickSupervisorFromEmployee(employee)
        );
      } catch (error) {
        console.error("Failed to load employee dashboard:", error);
        setSupervisorInfo(pickSupervisorFromEmployee(employee));
      }
    };
    loadDashboard();
  }, [isOpen, employee]);

  const employeeIdValue =
    (employee as any)?.emp_id ||
    (employee as any)?.employeeId ||
    (employee as any)?.employee_id;

  const empId =
    employeeIdValue != null && String(employeeIdValue).trim() !== ""
      ? String(employeeIdValue).trim()
      : "";

  const branchLabel = pickEmployeeBranchLabel(employee);

  const getEmployeePerformanceMetrics = (employeeData: any[]) => {
    if (!employeeData || employeeData.length === 0) {
      return {
        totalEvaluations: 0,
        averageRating: 0,
        highestRating: 0,
        lowestRating: 0,
        categories: [],
        quarterlyBreakdown: {},
        performanceTrend: "stable",
      };
    }

    const ratings = employeeData
      .map((sub) => sub.rating || 0)
      .filter((r) => r > 0);
    const categories = [
      ...new Set(employeeData.map((sub) => sub.category).filter(Boolean)),
    ];

    // Calculate quarterly breakdown
    const quarterlyBreakdown = employeeData.reduce((acc, submission) => {
      const date = new Date(submission.submittedAt);
      const quarter = `Q${Math.ceil(
        (date.getMonth() + 1) / 3
      )} ${date.getFullYear()}`;

      if (!acc[quarter]) {
        acc[quarter] = { count: 0, totalRating: 0, submissions: [] };
      }

      acc[quarter].count += 1;
      acc[quarter].totalRating += submission.rating || 0;
      acc[quarter].submissions.push(submission);

      return acc;
    }, {});

    // Calculate performance trend
    const sortedByDate = employeeData.sort(
      (a, b) =>
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );

    let performanceTrend = "stable";
    if (sortedByDate.length >= 2) {
      const recent = sortedByDate.slice(-3).map((s) => s.rating || 0);
      const older = sortedByDate.slice(0, -3).map((s) => s.rating || 0);

      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

        if (recentAvg > olderAvg + 0.5) performanceTrend = "improving";
        else if (recentAvg < olderAvg - 0.5) performanceTrend = "declining";
      }
    }

    return {
      totalEvaluations: employeeData.length,
      averageRating:
        ratings.length > 0
          ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
          : 0,
      highestRating: Math.max(...ratings, 0),
      lowestRating: Math.min(...ratings, 5),
      categories,
      quarterlyBreakdown,
      performanceTrend,
    };
  };

  if (!employee) return null;

  // Design variant styles
  const isAdminVariant = designVariant === "admin";

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent
        className={`max-w-3xl max-h-[80vh] p-0 animate-popup relative overflow-hidden ${
          isAdminVariant
            ? "bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100"
            : "bg-gradient-to-br from-blue-100 to-indigo-100"
        }`}
      >
        {/* Fade Background Logo - Fixed position, won't scroll */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <img
            src="/smct.png"
            alt="SMCT Logo"
            className="w-145 h-145 object-contain opacity-11"
          />
        </div>

        {/* Scrollable content wrapper */}
        <div className="relative z-10 max-h-[80vh] overflow-y-auto p-6">
        {/* Sticky Close Button - Stays at top when scrolling */}
        <div className="sticky top-0 z-50 flex justify-end mb-4 -mt-6 -mr-6 pt-6 pr-6">
          <Button
            onClick={onCloseAction}
            className={`bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${
              isAdminVariant ? "bg-red-500 hover:bg-red-600" : ""
            }`}
            size="sm"
          >
            <X className="w-4 h-4 mr-1" />
            Close
          </Button>
        </div>

        <DialogHeader
          className={`pb-6 ${
            isAdminVariant
              ? "border-b-2 border-slate-300"
              : "border-b border-gray-200"
          }`}
        >
          <DialogTitle
            className={`text-2xl font-bold flex items-center gap-2 ${
              isAdminVariant ? "text-slate-800" : "text-gray-900"
            }`}
          >
            <User
              className={`w-6 h-6 ${
                isAdminVariant ? "text-slate-700" : "text-blue-600"
              }`}
            />
            Employee Profile
          </DialogTitle>
          <DialogDescription
            className={`text-base mt-2 ${
              isAdminVariant ? "text-slate-600" : "text-gray-600"
            }`}
          >
            Complete employee information and evaluation history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Employee Header Card */}
          <Card
            className={`${
              isAdminVariant
                ? "bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-400 shadow-xl"
                : "bg-white border-2 border-blue-200 shadow-lg"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <h2
                    className={`text-3xl font-bold mb-2 ${
                      isAdminVariant ? "text-slate-800" : "text-black"
                    }`}
                  >
                    {employee.fname + " " + employee.lname || "Not Assigned"}
                  </h2>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <Badge
                      variant="outline"
                      className={`text-base px-3 py-1 ${
                        isAdminVariant
                          ? "bg-slate-100 text-slate-800 border-slate-400"
                          : "bg-blue-50 text-blue-700 border-blue-300"
                      }`}
                    >
                      <Briefcase className="w-4 h-4 mr-1.5" />
                      {employee.positions?.label ||
                        employee.positions?.name ||
                        "Not Assigned"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-base px-3 py-1 ${
                        isAdminVariant
                          ? "bg-slate-200 text-slate-800 border-slate-500"
                          : "bg-purple-50 text-purple-700 border-purple-300"
                      }`}
                    >
                      <Building2 className="w-4 h-4 mr-1.5" />
                      {employee.departments?.department_name || "Not Assigned"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-base px-3 py-1 ${
                        isAdminVariant
                          ? "bg-slate-300 text-slate-900 border-slate-600"
                          : "bg-green-50 text-green-700 border-green-300"
                      }`}
                    >
                      <Shield className="w-4 h-4 mr-1.5" />
                      {(Array.isArray(employee.roles) &&
                        employee.roles[0]?.name) ||
                        employee.roles?.name ||
                        "Not Assigned"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Employee Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Immediate head / Supervisor */}
            <Card
              className={`${
                isAdminVariant
                  ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                  : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
              } transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isAdminVariant ? "bg-slate-200" : "bg-indigo-100"
                    }`}
                  >
                    <Users
                      className={`w-5 h-5 ${
                        isAdminVariant ? "text-slate-700" : "text-indigo-600"
                      }`}
                      aria-hidden
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label
                      className={`text-xs font-medium uppercase tracking-wide ${
                        isAdminVariant ? "text-slate-600" : "text-gray-500"
                      }`}
                    >
                      Immediate head / Supervisor
                    </Label>
                    {supervisorInfo ? (
                      <>
                        <p
                          className={`text-lg font-semibold mt-1 truncate ${
                            isAdminVariant ? "text-slate-800" : "text-black"
                          }`}
                        >
                          {supervisorInfo.name}
                        </p>
                        {(supervisorInfo.position || supervisorInfo.email) && (
                          <p
                            className={`text-sm font-medium mt-1 truncate ${
                              isAdminVariant ? "text-slate-600" : "text-gray-600"
                            }`}
                          >
                            {[supervisorInfo.position, supervisorInfo.email]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </>
                    ) : (
                      <p
                        className={`text-lg font-semibold mt-1 ${
                          isAdminVariant ? "text-slate-800" : "text-black"
                        }`}
                      >
                        Not Assigned
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employee ID Card */}
            <Card
              className={`${
                isAdminVariant
                  ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                  : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
              } transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isAdminVariant ? "bg-slate-200" : "bg-blue-100"
                    }`}
                  >
                    <Hash
                      className={`w-5 h-5 ${
                        isAdminVariant ? "text-slate-700" : "text-blue-600"
                      }`}
                    />
                  </div>
                  <div>
                    <Label
                      className={`text-xs font-medium uppercase tracking-wide ${
                        isAdminVariant ? "text-slate-600" : "text-gray-500"
                      }`}
                    >
                      Employee ID
                    </Label>
                    <p
                      className={`text-lg font-semibold mt-1 ${
                        isAdminVariant ? "text-slate-800" : "text-black"
                      }`}
                    >
                      {empId || "Not Assigned"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Card */}
            <Card
              className={`${
                isAdminVariant
                  ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                  : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
              } transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isAdminVariant ? "bg-slate-200" : "bg-green-100"
                    }`}
                  >
                    <Mail
                      className={`w-5 h-5 ${
                        isAdminVariant ? "text-slate-700" : "text-green-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label
                      className={`text-xs font-medium uppercase tracking-wide ${
                        isAdminVariant ? "text-slate-600" : "text-gray-500"
                      }`}
                    >
                      Email Address
                    </Label>
                    <p
                      className={`text-sm font-medium mt-1 truncate ${
                        isAdminVariant ? "text-slate-800" : "text-black"
                      }`}
                    >
                      {employee.email || "Not Assigned"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Username Card */}
            {employee.username && (
              <Card
                className={`${
                  isAdminVariant
                    ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                    : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
                } transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isAdminVariant ? "bg-slate-200" : "bg-indigo-100"
                      }`}
                    >
                      <UserCircle
                        className={`w-5 h-5 ${
                          isAdminVariant ? "text-slate-700" : "text-indigo-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label
                        className={`text-xs font-medium uppercase tracking-wide ${
                          isAdminVariant ? "text-slate-600" : "text-gray-500"
                        }`}
                      >
                        Username
                      </Label>
                      <p
                        className={`text-sm font-medium mt-1 ${
                          isAdminVariant ? "text-slate-800" : "text-black"
                        }`}
                      >
                        {employee.username}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Card */}
            {employee.contact && (
              <Card
                className={`${
                  isAdminVariant
                    ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                    : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
                } transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isAdminVariant ? "bg-slate-200" : "bg-teal-100"
                      }`}
                    >
                      <Phone
                        className={`w-5 h-5 ${
                          isAdminVariant ? "text-slate-700" : "text-teal-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label
                        className={`text-xs font-medium uppercase tracking-wide ${
                          isAdminVariant ? "text-slate-600" : "text-gray-500"
                        }`}
                      >
                        Contact Number
                      </Label>
                      <p
                        className={`text-sm font-medium mt-1 ${
                          isAdminVariant ? "text-slate-800" : "text-black"
                        }`}
                      >
                        {employee.contact}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Position Card */}
            <Card
              className={`${
                isAdminVariant
                  ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                  : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
              } transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isAdminVariant ? "bg-slate-200" : "bg-orange-100"
                    }`}
                  >
                    <Briefcase
                      className={`w-5 h-5 ${
                        isAdminVariant ? "text-slate-700" : "text-orange-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label
                      className={`text-xs font-medium uppercase tracking-wide ${
                        isAdminVariant ? "text-slate-600" : "text-gray-500"
                      }`}
                    >
                      Position
                    </Label>
                    <p
                      className={`text-sm font-medium mt-1 ${
                        isAdminVariant ? "text-slate-800" : "text-black"
                      }`}
                    >
                      {employee.positions?.label ||
                        employee.positions?.name ||
                        "Not Assigned"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Card */}
            <Card
              className={`${
                isAdminVariant
                  ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                  : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
              } transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isAdminVariant ? "bg-slate-200" : "bg-purple-100"
                    }`}
                  >
                    <Building2
                      className={`w-5 h-5 ${
                        isAdminVariant ? "text-slate-700" : "text-purple-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label
                      className={`text-xs font-medium uppercase tracking-wide ${
                        isAdminVariant ? "text-slate-600" : "text-gray-500"
                      }`}
                    >
                      Department
                    </Label>
                    <p
                      className={`text-sm font-medium mt-1 ${
                        isAdminVariant ? "text-slate-800" : "text-black"
                      }`}
                    >
                      {employee.departments?.department_name || "Not Assigned"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Branch Card */}
            {branchLabel ? (
              <Card
                className={`${
                  isAdminVariant
                    ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                    : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
                } transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isAdminVariant ? "bg-slate-200" : "bg-cyan-100"
                      }`}
                    >
                      <MapPin
                        className={`w-5 h-5 ${
                          isAdminVariant ? "text-slate-700" : "text-cyan-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label
                        className={`text-xs font-medium uppercase tracking-wide ${
                          isAdminVariant ? "text-slate-600" : "text-gray-500"
                        }`}
                      >
                        Branch
                      </Label>
                      <p
                        className={`text-sm font-medium mt-1 ${
                          isAdminVariant ? "text-slate-800" : "text-black"
                        }`}
                      >
                        {branchLabel}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Date Hired Card */}
            {((employee as any).date_hired || (employee as any).dateHired || (employee as any).hireDate) && (
              <Card
                className={`${
                  isAdminVariant
                    ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                    : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
                } transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isAdminVariant ? "bg-slate-200" : "bg-amber-100"
                      }`}
                    >
                      <Calendar
                        className={`w-5 h-5 ${
                          isAdminVariant ? "text-slate-700" : "text-amber-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label
                        className={`text-xs font-medium uppercase tracking-wide ${
                          isAdminVariant ? "text-slate-600" : "text-gray-500"
                        }`}
                      >
                        Date Hired
                      </Label>
                      <p
                        className={`text-sm font-medium mt-1 ${
                          isAdminVariant ? "text-slate-800" : "text-black"
                        }`}
                      >
                        {(() => {
                          const dateHired = (employee as any).date_hired || (employee as any).dateHired || (employee as any).hireDate;
                          if (!dateHired) return "Not Assigned";
                          try {
                            const date = new Date(dateHired);
                            if (isNaN(date.getTime())) return "Not Assigned";
                            return date.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            });
                          } catch {
                            return "Not Assigned";
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          {/* Performance Metrics Section */}
          
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
