"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useDialogAnimation } from "@/hooks/useDialogAnimation";
import apiService from "@/lib/apiService";
import type { User } from "@/contexts/UserContext";
import { sortUsersAlphabeticallyByName } from "@/lib/sortUsersByName";
import { BarChart2, Download, Loader2, X } from "lucide-react";

/** Evaluation ratings use a 0–5 scale (same as HR user management). */
const PERFORMANCE_RATING_MAX = 5;

function performanceScorePercent(rating: number): string {
  if (rating <= 0 || Number.isNaN(rating)) return "—";
  return `${((rating / PERFORMANCE_RATING_MAX) * 100).toFixed(1)}%`;
}

function normalizePerformanceScore(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const parsed =
    typeof raw === "string"
      ? Number.parseFloat(raw.replace("%", "").trim())
      : Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed <= PERFORMANCE_RATING_MAX
    ? (parsed / PERFORMANCE_RATING_MAX) * 100
    : parsed;
}

function formatScoreWithPercent(
  score: number | null,
  explicitPercent?: number | null
): string {
  if (score == null || Number.isNaN(score)) return "—";
  const percentText =
    explicitPercent != null && Number.isFinite(explicitPercent)
      ? `${explicitPercent.toFixed(1)}%`
      : performanceScorePercent(score);
  return `${score.toFixed(2)} (${percentText})`;
}

function userHasAdminRole(u: User | null | undefined): boolean {
  if (!u?.roles || !Array.isArray(u.roles)) return false;
  return u.roles.some(
    (r: { name?: string }) =>
      String(r?.name ?? "").toLowerCase() === "admin"
  );
}

function buildBranchDisplayHelpers(branchesData: any[]) {
  const getBranchCode = (branch: any): string => {
    if (!branch) return "N/A";
    if (branch.branch_code) return branch.branch_code;
    if (branch.branch_name && branchesData.length > 0) {
      const foundBranch = branchesData.find((b: any) => {
        if (b.label) {
          const labelParts = b.label.split(" /");
          return labelParts[0] === branch.branch_name;
        }
        return false;
      });
      if (foundBranch?.label) {
        const labelParts = foundBranch.label.split(" /");
        return labelParts[1] || labelParts[0] || branch.branch_name;
      }
    }
    const branchId = Number(branch);
    if (!Number.isNaN(branchId) && branchesData.length > 0) {
      const foundBranch = branchesData.find(
        (b: any) => Number(b?.value) === branchId
      );
      if (foundBranch?.label) {
        const labelParts = String(foundBranch.label).split(" /");
        return (labelParts[1] || labelParts[0] || "N/A").trim();
      }
    }
    return branch.branch_name || "N/A";
  };

  const getUserBranchCode = (employee: User | null): string => {
    if (!employee) return "N/A";
    if (employee.branches) {
      const branchData = Array.isArray(employee.branches)
        ? employee.branches[0]
        : employee.branches;
      const codeFromBranches = getBranchCode(branchData);
      if (codeFromBranches !== "N/A") return codeFromBranches;
    }
    const employeeAny = employee as any;
    const branchIdOrValue = employeeAny.branch_id ?? employeeAny.branch;
    if (
      branchIdOrValue !== undefined &&
      branchIdOrValue !== null &&
      branchIdOrValue !== ""
    ) {
      return getBranchCode(branchIdOrValue);
    }
    return "N/A";
  };

  const getEmployeeBranchDisplay = (emp: User | null): string => {
    if (!emp) return "N/A";
    if (emp.branches) {
      const b = Array.isArray(emp.branches)
        ? emp.branches[0]
        : (emp.branches as any);
      if (b) {
        const name = b.branch_name || b.name || "";
        const code = b.branch_code || b.code || getBranchCode(b);
        return code ? `${name || code} (${code})` : name || "N/A";
      }
    }
    const code = getUserBranchCode(emp as any);
    return code !== "N/A" ? code : "N/A";
  };

  const isHOBranchSelected = (branchId: string): boolean => {
    if (!branchId) return false;
    const label =
      branchesData?.find((b: any) => String(b.value) === String(branchId))
        ?.label || "";
    const upper = String(label).toUpperCase();
    const parts = upper.split(" /");
    const name = (parts[0] || "").trim();
    const code = (parts[1] || "").trim();
    return (
      name === "HO" ||
      code === "HO" ||
      name === "HEAD OFFICE" ||
      code === "HEAD OFFICE" ||
      name.includes("HEAD OFFICE") ||
      code.includes("HEAD OFFICE")
    );
  };

  return { getBranchCode, getUserBranchCode, getEmployeeBranchDisplay, isHOBranchSelected };
}

export type BranchQuarterTableRow = {
  employeeId: number;
  name: string;
  branch: string;
  position: string;
  department: string;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  average: number | null;
  q1Performance?: number | null;
  q2Performance?: number | null;
  q3Performance?: number | null;
  q4Performance?: number | null;
  averagePerformance?: number | null;
};

export type BranchQuarterUserExportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchesData: any[];
  departmentData: any[];
  /** HR: true to hide admin-role users from the quarterly table. Admin: typically false. */
  shouldHideAdminUsers: boolean;
};

export function BranchQuarterUserExportModal({
  open,
  onOpenChange,
  branchesData,
  departmentData,
  shouldHideAdminUsers,
}: BranchQuarterUserExportModalProps) {
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });

  const [recordedYearsForBranchQuarter, setRecordedYearsForBranchQuarter] =
    useState<{ year: number }[]>([]);
  const [loadingRecordedYearsForBranchQuarter, setLoadingRecordedYearsForBranchQuarter] =
    useState(false);
  const [branchQuarterYear, setBranchQuarterYear] = useState<string>("");
  const [branchQuarterBranchId, setBranchQuarterBranchId] = useState<string>("");
  const [branchQuarterDepartmentId, setBranchQuarterDepartmentId] =
    useState<string>("");
  const [showExportMissingDataWarning, setShowExportMissingDataWarning] =
    useState(false);
  const [loadingBranchQuarterTable, setLoadingBranchQuarterTable] =
    useState(false);
  const [branchQuarterTableRows, setBranchQuarterTableRows] = useState<
    BranchQuarterTableRow[] | null
  >(null);

  const branchQuarterItemsPerPage = 10;
  const branchQuarterLoadingDurationMs = 2500;
  const [branchQuarterCurrentPage, setBranchQuarterCurrentPage] = useState(1);
  const [loadingBranchQuarterPage, setLoadingBranchQuarterPage] =
    useState(false);
  const branchQuarterPagingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const [showNoDataAlert, setShowNoDataAlert] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showBranchQuarterExportSuccess, setShowBranchQuarterExportSuccess] =
    useState(false);
  const [showExportError, setShowExportError] = useState(false);

  const helpers = useMemo(
    () => buildBranchDisplayHelpers(branchesData),
    [branchesData]
  );

  const showDepartmentInBranchQuarter = helpers.isHOBranchSelected(
    branchQuarterBranchId
  );

  const handleBranchQuarterPageChange = (page: number) => {
    if (page === branchQuarterCurrentPage) return;
    setBranchQuarterCurrentPage(page);
    setLoadingBranchQuarterPage(true);
    if (branchQuarterPagingTimerRef.current) {
      clearTimeout(branchQuarterPagingTimerRef.current);
    }
    branchQuarterPagingTimerRef.current = setTimeout(() => {
      setLoadingBranchQuarterPage(false);
      branchQuarterPagingTimerRef.current = null;
    }, branchQuarterLoadingDurationMs);
  };

  const branchQuarterPageSkeletonRows = useMemo(() => {
    if (!branchQuarterTableRows?.length) return branchQuarterItemsPerPage;
    const sliceStart =
      (branchQuarterCurrentPage - 1) * branchQuarterItemsPerPage;
    const n = Math.min(
      branchQuarterItemsPerPage,
      Math.max(0, branchQuarterTableRows.length - sliceStart)
    );
    return Math.max(1, n);
  }, [
    branchQuarterTableRows,
    branchQuarterCurrentPage,
    branchQuarterItemsPerPage,
  ]);

  const loadBranchQuarterTable = useCallback(async () => {
    const targetYear = branchQuarterYear;
    const targetBranchId = branchQuarterBranchId;
    const targetDepartmentId = branchQuarterDepartmentId;

    if (!targetYear || !targetBranchId) return;

    const loadStartedAt = Date.now();
    setLoadingBranchQuarterTable(true);
    setLoadingBranchQuarterPage(false);
    if (branchQuarterPagingTimerRef.current) {
      clearTimeout(branchQuarterPagingTimerRef.current);
      branchQuarterPagingTimerRef.current = null;
    }
    setBranchQuarterTableRows(null);

    const showDept = helpers.isHOBranchSelected(targetBranchId);

    try {
      const userResp = await apiService.getActiveRegistrations(
        "",
        "0",
        1,
        2000,
        targetBranchId,
        showDept ? targetDepartmentId : ""
      );

      const usersList: any[] = Array.isArray(userResp)
        ? userResp
        : userResp?.data || userResp?.users || [];

      const allowedRoleNames = new Set(["employee", "hr", "evaluator"]);
      const employeesList = sortUsersAlphabeticallyByName(
        usersList.filter((u: any) => {
          if (shouldHideAdminUsers && userHasAdminRole(u)) return false;
          const rolesArr = u?.roles && Array.isArray(u.roles) ? u.roles : [];
          return rolesArr.some((r: { name?: string }) =>
            allowedRoleNames.has(String(r?.name || "").toLowerCase())
          );
        })
      );

      const evalResp = await apiService.getSubmissions(
        "",
        1,
        5000,
        "",
        "",
        targetYear,
        "",
        targetBranchId
      );

      const evaluationsList: any[] = Array.isArray(evalResp)
        ? evalResp
        : evalResp?.data || [];

      const quarterMap: Record<
        number,
        {
          q1: number | null;
          q2: number | null;
          q3: number | null;
          q4: number | null;
          q1Performance: number | null;
          q2Performance: number | null;
          q3Performance: number | null;
          q4Performance: number | null;
        }
      > = {};

      const getQuarter = (ev: any): "Q1" | "Q2" | "Q3" | "Q4" | null => {
        const regular = ev?.reviewTypeRegular;
        if (typeof regular === "string") {
          if (regular.includes("Q1")) return "Q1";
          if (regular.includes("Q2")) return "Q2";
          if (regular.includes("Q3")) return "Q3";
          if (regular.includes("Q4")) return "Q4";
        }
        const dt = ev?.created_at || ev?.submittedAt || ev?.createdAt;
        if (!dt) return null;
        const d = new Date(dt);
        if (isNaN(d.getTime())) return null;
        const month = d.getMonth() + 1;
        if (month >= 1 && month <= 3) return "Q1";
        if (month >= 4 && month <= 6) return "Q2";
        if (month >= 7 && month <= 9) return "Q3";
        return "Q4";
      };

      const ensureBucket = (employeeId: number) => {
        if (!quarterMap[employeeId]) {
          quarterMap[employeeId] = {
            q1: null,
            q2: null,
            q3: null,
            q4: null,
            q1Performance: null,
            q2Performance: null,
            q3Performance: null,
            q4Performance: null,
          };
        }
        return quarterMap[employeeId];
      };

      const allowedEmployeeIds = new Set(
        employeesList
          .map((u: any) => (u?.id != null ? Number(u.id) : NaN))
          .filter((id: number) => Number.isFinite(id))
      );

      evaluationsList.forEach((ev: any) => {
        const emp = ev?.employee || {};
        const idRaw =
          emp?.id ?? ev?.employee_id ?? ev?.employeeId ?? ev?.emp_id;
        const employeeId = idRaw != null ? Number(idRaw) : NaN;
        if (!Number.isFinite(employeeId)) return;
        if (!allowedEmployeeIds.has(employeeId)) return;

        const quarter = getQuarter(ev);
        if (!quarter) return;

        const ratingVal = Number(ev?.rating);
        if (!Number.isFinite(ratingVal) || ratingVal <= 0) return;
        const performanceVal = normalizePerformanceScore(
          ev?.performanceScore ?? ev?.performance_score
        );

        const bucket = ensureBucket(employeeId);
        if (quarter === "Q1") {
          bucket.q1 = ratingVal;
          bucket.q1Performance = performanceVal;
        }
        if (quarter === "Q2") {
          bucket.q2 = ratingVal;
          bucket.q2Performance = performanceVal;
        }
        if (quarter === "Q3") {
          bucket.q3 = ratingVal;
          bucket.q3Performance = performanceVal;
        }
        if (quarter === "Q4") {
          bucket.q4 = ratingVal;
          bucket.q4Performance = performanceVal;
        }
      });

      const rows: BranchQuarterTableRow[] = employeesList.map((emp: any) => {
        const employeeId = emp?.id != null ? Number(emp.id) : NaN;
        const bucket =
          quarterMap[Number.isFinite(employeeId) ? employeeId : -1] || {
            q1: null,
            q2: null,
            q3: null,
            q4: null,
            q1Performance: null,
            q2Performance: null,
            q3Performance: null,
            q4Performance: null,
          };

        const ratings = [bucket.q1, bucket.q2, bucket.q3, bucket.q4].filter(
          (v): v is number => typeof v === "number" && !isNaN(v)
        );
        const averageVal =
          ratings.length > 0
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : null;
        const availablePerformance = [
          bucket.q1Performance,
          bucket.q2Performance,
          bucket.q3Performance,
          bucket.q4Performance,
        ].filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
        const averagePerformanceVal =
          availablePerformance.length > 0
            ? availablePerformance.reduce((a, b) => a + b, 0) /
              availablePerformance.length
            : averageVal != null
              ? Number.parseFloat(
                  performanceScorePercent(averageVal).replace("%", "")
                )
              : null;

        return {
          employeeId,
          name: `${emp?.fname || ""} ${emp?.lname || ""}`.trim(),
          branch: helpers.getEmployeeBranchDisplay(emp as User),
          position:
            emp?.positions?.label ||
            emp?.position ||
            emp?.positions?.name ||
            "N/A",
          department:
            emp?.departments?.department_name ||
            emp?.departments?.label ||
            emp?.department ||
            "N/A",
          q1: bucket.q1,
          q2: bucket.q2,
          q3: bucket.q3,
          q4: bucket.q4,
          average:
            averageVal != null ? Number(averageVal.toFixed(2)) : null,
          q1Performance: bucket.q1Performance,
          q2Performance: bucket.q2Performance,
          q3Performance: bucket.q3Performance,
          q4Performance: bucket.q4Performance,
          averagePerformance:
            averagePerformanceVal != null
              ? Number(averagePerformanceVal.toFixed(1))
              : null,
        };
      });

      setBranchQuarterTableRows(rows);
    } catch (error) {
      console.error("Error loading branch quarter table:", error);
      setBranchQuarterTableRows([]);
    } finally {
      const elapsed = Date.now() - loadStartedAt;
      await new Promise((r) =>
        setTimeout(r, Math.max(0, branchQuarterLoadingDurationMs - elapsed))
      );
      setLoadingBranchQuarterTable(false);
    }
  }, [
    branchQuarterYear,
    branchQuarterBranchId,
    branchQuarterDepartmentId,
    helpers,
    shouldHideAdminUsers,
  ]);

  useEffect(() => {
    if (!open) {
      setRecordedYearsForBranchQuarter([]);
      setBranchQuarterYear("");
      setBranchQuarterBranchId("");
      setBranchQuarterDepartmentId("");
      setBranchQuarterTableRows(null);
      setBranchQuarterCurrentPage(1);
      setShowBranchQuarterExportSuccess(false);
      setShowExportMissingDataWarning(false);
      setShowNoDataAlert(false);
      setShowExportError(false);
      setLoadingBranchQuarterTable(false);
      setLoadingBranchQuarterPage(false);
      if (branchQuarterPagingTimerRef.current) {
        clearTimeout(branchQuarterPagingTimerRef.current);
        branchQuarterPagingTimerRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (branchesData?.length) {
      setBranchQuarterBranchId((id) =>
        id || String(branchesData[0].value)
      );
    }
  }, [open, branchesData]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoadingRecordedYearsForBranchQuarter(true);
    apiService
      .getAllYears()
      .then((years: { year: number }[]) => {
        if (cancelled || !Array.isArray(years)) return;
        const sorted = [...years].sort((a, b) => b.year - a.year);
        setRecordedYearsForBranchQuarter(sorted);

        const currentYear = new Date().getFullYear();
        const match = sorted.find((y) => Number(y.year) === currentYear);
        setBranchQuarterYear(match ? String(match.year) : "");
      })
      .catch(() => {
        if (!cancelled) setRecordedYearsForBranchQuarter([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecordedYearsForBranchQuarter(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!showDepartmentInBranchQuarter && branchQuarterDepartmentId) {
      setBranchQuarterDepartmentId("");
    }
  }, [showDepartmentInBranchQuarter, branchQuarterDepartmentId]);

  useEffect(() => {
    if (!open) return;
    setBranchQuarterCurrentPage(1);
  }, [
    open,
    branchQuarterYear,
    branchQuarterBranchId,
    branchQuarterDepartmentId,
    showDepartmentInBranchQuarter,
  ]);

  useEffect(() => {
    if (!open) return;
    const totalRows = branchQuarterTableRows?.length ?? 0;
    const totalPages = Math.max(
      1,
      Math.ceil(totalRows / branchQuarterItemsPerPage)
    );
    setBranchQuarterCurrentPage((p) => Math.min(p, totalPages));
  }, [open, branchQuarterTableRows?.length, branchQuarterItemsPerPage]);

  useEffect(() => {
    if (!open) return;
    if (!branchQuarterYear || !branchQuarterBranchId) return;
    void loadBranchQuarterTable();
  }, [
    open,
    branchQuarterYear,
    branchQuarterBranchId,
    branchQuarterDepartmentId,
    showDepartmentInBranchQuarter,
    loadBranchQuarterTable,
  ]);

  useEffect(() => {
    if (!showBranchQuarterExportSuccess) return;
    const id = window.setTimeout(
      () => setShowBranchQuarterExportSuccess(false),
      3000
    );
    return () => window.clearTimeout(id);
  }, [showBranchQuarterExportSuccess]);

  const performBranchQuarterExport = async () => {
    if (!branchQuarterTableRows || branchQuarterTableRows.length === 0) return;
    setShowExportMissingDataWarning(false);
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const branchLabel =
        branchesData?.find(
          (b: any) => String(b.value) === String(branchQuarterBranchId)
        )?.label || branchQuarterBranchId || "Branch";
      const safeYear = branchQuarterYear || "Year";
      const csvRows: string[][] = [
        showDepartmentInBranchQuarter
          ? [
              "Name",
              "Branch",
              "Department",
              "Position",
              "Q1",
              "Q2",
              "Q3",
              "Q4",
              "Average",
            ]
          : ["Name", "Branch", "Position", "Q1", "Q2", "Q3", "Q4", "Average"],
        ...branchQuarterTableRows.map((row) =>
          showDepartmentInBranchQuarter
            ? [
                row.name,
                row.branch,
                row.department,
                row.position,
                row.q1 != null
                  ? formatScoreWithPercent(row.q1, row.q1Performance)
                  : "-",
                row.q2 != null
                  ? formatScoreWithPercent(row.q2, row.q2Performance)
                  : "-",
                row.q3 != null
                  ? formatScoreWithPercent(row.q3, row.q3Performance)
                  : "-",
                row.q4 != null
                  ? formatScoreWithPercent(row.q4, row.q4Performance)
                  : "-",
                row.average != null
                  ? formatScoreWithPercent(
                      row.average,
                      row.averagePerformance
                    )
                  : "-",
              ]
            : [
                row.name,
                row.branch,
                row.position,
                row.q1 != null
                  ? formatScoreWithPercent(row.q1, row.q1Performance)
                  : "-",
                row.q2 != null
                  ? formatScoreWithPercent(row.q2, row.q2Performance)
                  : "-",
                row.q3 != null
                  ? formatScoreWithPercent(row.q3, row.q3Performance)
                  : "-",
                row.q4 != null
                  ? formatScoreWithPercent(row.q4, row.q4Performance)
                  : "-",
                row.average != null
                  ? formatScoreWithPercent(
                      row.average,
                      row.averagePerformance
                    )
                  : "-",
              ]
        ),
      ];
      const escapeCell = (cell: string) => {
        const str = String(cell ?? "");
        return `"${str.replace(/"/g, '""')}"`;
      };
      const csvContent = csvRows
        .map((row) => row.map(escapeCell).join(","))
        .join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filenameSafe = `${branchLabel.replace(/\s+/g, "_")}_QuarterSummary_${safeYear}`.replace(
        /[<>:"/\\|?*]+/g,
        ""
      );
      link.download = `${filenameSafe}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setShowBranchQuarterExportSuccess(true);
    } catch (error) {
      console.error("Error exporting branch quarter CSV:", error);
      setShowExportError(true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBranchQuarterCSV = () => {
    if (!branchQuarterTableRows || branchQuarterTableRows.length === 0) {
      setShowNoDataAlert(true);
      return;
    }
    const hasEmployeesWithMissingData = branchQuarterTableRows.some(
      (row) =>
        row.q1 == null || row.q2 == null || row.q3 == null || row.q4 == null
    );
    if (hasEmployeesWithMissingData) {
      setShowExportMissingDataWarning(true);
      return;
    }
    void performBranchQuarterExport();
  };

  const closeModal = () => {
    onOpenChange(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChangeAction={(next) => {
          if (!next) closeModal();
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
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-blue-700/90 backdrop-blur-[1px]" />
            <div className="absolute top-3 right-3 z-20">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={closeModal}
                className="cursor-pointer hover:bg-white/20 text-white h-8 w-8 rounded-full shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative z-10 pr-12 sm:pr-14">
              <DialogHeader className="pb-0 text-left">
                <DialogTitle className="flex items-center gap-3 text-xl text-white drop-shadow-md">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-lg">
                    <BarChart2 className="h-5 w-5 text-white" />
                  </div>
                  <span>Branch Quarterly Report</span>
                </DialogTitle>
                <p className="mt-2 text-sm text-white/90 leading-snug">
                  Select Year and Branch to export
                </p>
              </DialogHeader>
            </div>
          </div>

          <div className="relative overflow-y-auto p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium cursor-pointer text-gray-700 whitespace-nowrap">
                  Year:
                </Label>
                {loadingRecordedYearsForBranchQuarter ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <Combobox
                    options={recordedYearsForBranchQuarter.map((y) => ({
                      value: String(y.year),
                      label: String(y.year),
                    }))}
                    value={branchQuarterYear}
                    onValueChangeAction={(value) => {
                      setBranchQuarterYear(String(value));
                    }}
                    placeholder="Select year"
                    searchPlaceholder="Search years..."
                    emptyText="No years found."
                    className="w-32"
                  />
                )}
              </div>

              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Branch:
                </Label>
                <Combobox
                  options={branchesData.map((b: any) => ({
                    value: String(b.value),
                    label: b.label,
                  }))}
                  value={branchQuarterBranchId}
                  onValueChangeAction={(value) => {
                    setBranchQuarterBranchId(String(value));
                  }}
                  placeholder="Select branch"
                  searchPlaceholder="Search branches..."
                  emptyText="No branches found."
                  className="w-64"
                />
              </div>

              {showDepartmentInBranchQuarter && (
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Department:
                  </Label>
                  <Combobox
                    options={departmentData.map((d: any) => ({
                      value: String(d.value),
                      label: d.label,
                    }))}
                    value={branchQuarterDepartmentId}
                    onValueChangeAction={(value) => {
                      setBranchQuarterDepartmentId(String(value));
                    }}
                    placeholder="All departments"
                    searchPlaceholder="Search departments..."
                    emptyText="No departments found."
                    className="w-64"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-wrap">
              <span className="text-sm font-medium text-gray-700">
                Indicators:
              </span>
              <div className="flex items-center gap-3 flex-wrap text-sm text-gray-600">
                <span className="inline-flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white border border-gray-200 font-mono text-gray-800">
                    —
                  </span>
                  No evaluation for that quarter
                </span>
                <span className="text-gray-300">|</span>
                <span>Average is computed from available quarters only</span>
              </div>
            </div>

            {branchQuarterTableRows &&
              !loadingBranchQuarterTable &&
              !loadingBranchQuarterPage && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleExportBranchQuarterCSV}
                    disabled={isExporting}
                    className="cursor-pointer bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              )}

            {!branchQuarterYear || !branchQuarterBranchId ? (
              <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Select a year and branch</p>
                <p className="text-xs mt-1">
                  Then the table will load automatically
                </p>
              </div>
            ) : null}

            {loadingBranchQuarterTable ? (
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
                        <TableHead className="font-semibold text-blue-800">
                          Name
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Position
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Branch
                        </TableHead>
                        {showDepartmentInBranchQuarter && (
                          <TableHead className="font-semibold text-blue-800">
                            Department
                          </TableHead>
                        )}
                        <TableHead className="font-semibold text-blue-800">
                          Q1
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Q2
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Q3
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Q4
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Average
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-transparent">
                          <TableCell>
                            <Skeleton className="h-4 w-36 max-w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-28 max-w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24 max-w-full" />
                          </TableCell>
                          {showDepartmentInBranchQuarter && (
                            <TableCell>
                              <Skeleton className="h-4 w-28 max-w-full" />
                            </TableCell>
                          )}
                          <TableCell>
                            <Skeleton className="h-4 w-10" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-10" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-10" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-10" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-12" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            {branchQuarterTableRows && !loadingBranchQuarterTable ? (
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
                        <TableHead className="font-semibold text-blue-800">
                          Name
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Position
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Branch
                        </TableHead>
                        {showDepartmentInBranchQuarter && (
                          <TableHead className="font-semibold text-blue-800">
                            Department
                          </TableHead>
                        )}
                        <TableHead className="font-semibold text-blue-800">
                          Q1
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Q2
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Q3
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Q4
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800">
                          Average
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {branchQuarterTableRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={showDepartmentInBranchQuarter ? 9 : 8}
                            className="text-center text-gray-500 py-8"
                          >
                            No employees found for this branch/year.
                          </TableCell>
                        </TableRow>
                      ) : loadingBranchQuarterPage ? (
                        Array.from({ length: branchQuarterPageSkeletonRows }).map(
                          (_, i) => (
                            <TableRow
                              key={`bq-skel-${i}`}
                              className="hover:bg-transparent"
                            >
                              <TableCell>
                                <Skeleton className="h-4 w-36 max-w-full" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-28 max-w-full" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-24 max-w-full" />
                              </TableCell>
                              {showDepartmentInBranchQuarter && (
                                <TableCell>
                                  <Skeleton className="h-4 w-28 max-w-full" />
                                </TableCell>
                              )}
                              <TableCell>
                                <Skeleton className="h-4 w-10" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-10" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-10" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-10" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-12" />
                              </TableCell>
                            </TableRow>
                          )
                        )
                      ) : (
                        branchQuarterTableRows
                          .slice(
                            (branchQuarterCurrentPage - 1) *
                              branchQuarterItemsPerPage,
                            branchQuarterCurrentPage * branchQuarterItemsPerPage
                          )
                          .map((row) => (
                            <TableRow
                              key={row.employeeId}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <TableCell className="font-medium text-gray-800">
                                {row.name}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {row.position}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {row.branch}
                              </TableCell>
                              {showDepartmentInBranchQuarter && (
                                <TableCell className="text-gray-700">
                                  {row.department}
                                </TableCell>
                              )}
                              <TableCell>
                                {row.q1 != null
                                  ? formatScoreWithPercent(
                                      row.q1,
                                      row.q1Performance
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {row.q2 != null
                                  ? formatScoreWithPercent(
                                      row.q2,
                                      row.q2Performance
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {row.q3 != null
                                  ? formatScoreWithPercent(
                                      row.q3,
                                      row.q3Performance
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {row.q4 != null
                                  ? formatScoreWithPercent(
                                      row.q4,
                                      row.q4Performance
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {row.average != null
                                  ? formatScoreWithPercent(
                                      row.average,
                                      row.averagePerformance
                                    )
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {branchQuarterTableRows.length > branchQuarterItemsPerPage && (
                  <div
                    className={
                      loadingBranchQuarterPage
                        ? "pointer-events-none opacity-60"
                        : ""
                    }
                  >
                    <EvaluationsPagination
                      currentPage={branchQuarterCurrentPage}
                      totalPages={Math.max(
                        1,
                        Math.ceil(
                          branchQuarterTableRows.length /
                            branchQuarterItemsPerPage
                        )
                      )}
                      total={branchQuarterTableRows.length}
                      perPage={branchQuarterItemsPerPage}
                      onPageChange={handleBranchQuarterPageChange}
                    />
                  </div>
                )}
              </div>
            ) : null}

            {(loadingBranchQuarterTable || loadingBranchQuarterPage) && (
              <div
                className="absolute inset-0 z-50 flex items-center justify-center rounded-b-lg bg-white/75 backdrop-blur-[2px]"
                aria-busy="true"
                aria-live="polite"
              >
                <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-8 py-6 shadow-lg">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-gray-700">
                    {loadingBranchQuarterTable
                      ? "Loading quarterly data..."
                      : "Loading page..."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showExportMissingDataWarning}
        onOpenChangeAction={(o) => {
          if (!o) setShowExportMissingDataWarning(false);
        }}
      >
        <DialogContent className="max-w-md p-8 text-center">
          <div className="flex flex-col  items-center space-y-4">
            <div className="mb-2">
              <img
                src="/no%20expo.gif"
                alt="Missing data"
                className="w-40 h-40 object-contain"
              />
            </div>
            <h2 className="text-lg font-bold text-red-800">Missing data</h2>
            <p className="text-gray-600 text-sm">
              Will you wish to proceed with export? Some of your employees are
              missing their data or evaluations.
            </p>
            <div className="flex gap-3 w-full justify-center">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowExportMissingDataWarning(false)}
                className="cursor-pointer bg-red-600 hover:bg-red-700 hover:text-white text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void performBranchQuarterExport()}
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
              >
                Proceed
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showNoDataAlert}
        onOpenChangeAction={(o) => {
          if (!o) setShowNoDataAlert(false);
        }}
      >
        <DialogContent className="max-w-md p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <img
                src="/no-data.gif"
                alt="No data"
                className="w-40 h-40 object-contain"
              />
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">
              No Data to Export
            </h2>
            <p className="text-gray-600 text-sm mb-6 max-w-xs">
              There are no evaluations recorded for the selected year and branch.
              Please select a different year/branch with available data.
            </p>
            <Button
              type="button"
              onClick={() => setShowNoDataAlert(false)}
              className="px-8 py-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isExporting} onOpenChangeAction={() => {}}>
        <DialogContent className="max-w-xs p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <img
                src="/smct.png"
                alt="SMCT Logo"
                className="w-24 h-auto object-contain"
              />
            </div>
            <div className="mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Exporting Data
            </h2>
            <p className="text-gray-500 text-sm">
              Please wait while we prepare your file...
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showBranchQuarterExportSuccess}
        onOpenChangeAction={setShowBranchQuarterExportSuccess}
      >
        <DialogContent className="max-w-sm w-[90vw] px-6 py-6 text-center">
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
              Export Successful
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              Your branch quarter summary CSV has been downloaded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center">
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showExportError}
        onOpenChangeAction={(o) => {
          if (!o) setShowExportError(false);
        }}
      >
        <DialogContent className="max-w-sm p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <img
                src="/no-data2.gif"
                alt="Error"
                className="w-32 h-32 object-contain"
              />
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">
              Something Went Wrong
            </h2>
            <p className="text-gray-600 text-sm mb-6 max-w-xs">
              We encountered an error while exporting your data. Please try again
              later.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
