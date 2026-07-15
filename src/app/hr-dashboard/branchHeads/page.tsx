"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiService } from "@/lib/apiService";
import { toastMessages } from "@/lib/toastMessages";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch?: string;
  role: string;
  isActive?: boolean;
}

/** Faint SMCT logo behind dialog body — same pattern as other HR branch/department modals. */
function SmctDialogBackdrop({
  layout,
}: {
  layout: "scrollable" | "centered";
}) {
  const isScrollable = layout === "scrollable";
  return (
    <div
      className={
        isScrollable
          ? "pointer-events-none absolute left-4 right-4 top-[6.75rem] bottom-4 z-0 bg-center bg-no-repeat opacity-[0.08]"
          : "pointer-events-none absolute inset-0 z-0 bg-center bg-no-repeat opacity-[0.08]"
      }
      style={{
        backgroundImage: "url('/smct.png')",
        backgroundSize: isScrollable ? "55%" : "42%",
      }}
      aria-hidden
    />
  );
}

/** Spinner + SMCT logo while modal content loads (matches Positions/Branches refresh overlay). */
function SmctLoadingOverlay({ label }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 z-[70] flex items-center justify-center rounded-lg bg-white/55 backdrop-blur-[1px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white/90 px-8 py-6 shadow-lg ring-1 ring-gray-200/80 pointer-events-none">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
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
        <p className="text-sm font-medium text-gray-600">
          {label ?? "Loading..."}
        </p>
      </div>
    </div>
  );
}

export default function BranchHeadsTab() {
  const { withErrorHandling } = useErrorHandler({
    showToast: true,
    logToConsole: true,
  });
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBranchHead, setSelectedBranchHead] = useState<Employee | null>(
    null
  );
  const [selectedBranches, setSelectedBranches] = useState<
    { id: string; name: string; code: string }[]
  >([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successData, setSuccessData] = useState<{
    branchHead: Employee | null;
    branches: { id: string; name: string; code: string }[];
  }>({ branchHead: null, branches: [] });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [branchHeadToEdit, setBranchHeadToEdit] = useState<Employee | null>(
    null
  );
  const [editSelectedBranches, setEditSelectedBranches] = useState<
    { id: string; name: string; code: string }[]
  >([]);
  const [showEditSuccessDialog, setShowEditSuccessDialog] = useState(false);
  const [editSuccessData, setEditSuccessData] = useState<{
    branchHead: Employee | null;
    branches: { id: string; name: string; code: string }[];
  }>({ branchHead: null, branches: [] });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchHeadToDelete, setBranchHeadToDelete] = useState<Employee | null>(
    null
  );
  /** True while opening Branches modal from list — branches API is in flight. */
  const [isAssignBranchesLoading, setIsAssignBranchesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchHeadsPage, setBranchHeadsPage] = useState(1);
  const [branchHeadsData, setBranchHeadsData] = useState<Employee[]>([]);
  const [loadingBranchHeads, setLoadingBranchHeads] = useState(true);
  const [branchHeadsRefreshing, setBranchHeadsRefreshing] = useState(false);
  const itemsPerPage = 8;
  const [isSaving, setIsSaving] = useState(false);
  const [editBranchSearchTerm, setEditBranchSearchTerm] = useState("");
  const branchHeadsInFlightPromiseRef = useRef<Promise<void> | null>(null);
  const branchesInFlightPromiseRef = useRef<
    Promise<{ id: string; name: string; code: string }[]>
    | null
  >(null);
  const prevSearchTermForPageRef = useRef<string | null>(null);

  // Use dialog animation hook (0.4s to match EditUserModal speed)
  const dialogAnimationClass = useDialogAnimation({ duration: 0.4 });

  // Helper function to normalize branch head data
  const normalizeBranchHeadData = (data: any[]): Employee[] => {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: any) => {
      // Handle branches - API returns branches array
      let branchValue = "";

      // Extract a single branch token (code/name/id) into a string.
      // This supports multiple API shapes, including the new nested:
      //   branch: { branch_code, branch_name, acronym, id, ... }
      const extractBranchToken = (b: any): string => {
        if (b === null || b === undefined || b === "") return "";
        if (typeof b === "string" || typeof b === "number") return String(b).trim();
        if (typeof b !== "object") return "";

        const nested = b.branch && typeof b.branch === "object" ? b.branch : null;
        const src = nested ?? b;

        const code = String(src.branch_code ?? src.code ?? src.acronym ?? "").trim();
        const name = String(src.branch_name ?? src.name ?? src.label ?? "").trim();
        const id = String(src.id ?? src.branch_id ?? "").trim();

        return code || name || id || "";
      };

      if (item.branches && Array.isArray(item.branches)) {
        const extracted = item.branches
          .map((b: any) => extractBranchToken(b))
          .filter((b: any) => b)
          .join(", ");
        if (extracted) branchValue = extracted;
      }

      if (!branchValue && item.branch) {
        if (Array.isArray(item.branch)) {
          branchValue = item.branch
            .map((b: any) => extractBranchToken(b))
            .filter((b: any) => b)
            .join(", ");
        } else if (typeof item.branch === "object") {
          branchValue = extractBranchToken(item.branch);
        } else {
          branchValue = String(item.branch).trim();
        }
      }

      if (
        !branchValue &&
        (
        item.branch_id !== undefined ||
        item.branchId !== undefined ||
        item.branch_code !== undefined ||
        item.branchCode !== undefined ||
        item.acronym !== undefined
        )
      ) {
        // Root-level branch data (id/code/acronym) fallback
        const rootBranchId = item.branch_id ?? item.branchId;
        if (
          rootBranchId !== undefined &&
          rootBranchId !== null &&
          rootBranchId !== ""
        ) {
          branchValue = String(rootBranchId);
        } else {
          const rootCode = (item.branch_code ?? item.branchCode ?? item.acronym ?? "").toString().trim();
          const rootName = (item.branch_name ?? item.branchName ?? "").toString().trim();
          branchValue = rootCode || rootName || "";
        }
      }

      // Handle position - API returns positions object with label
      let positionValue = "";
      if (item.positions && typeof item.positions === "object") {
        positionValue =
          item.positions.label ||
          item.positions.name ||
          item.positions.value ||
          "";
      } else if (item.position) {
        if (typeof item.position === "object") {
          positionValue =
            item.position.label ||
            item.position.name ||
            item.position.value ||
            "";
        } else {
          positionValue = String(item.position);
        }
      } else if (item.position_id) {
        positionValue = String(item.position_id);
      }

      // Handle department - API returns departments object with department_name
      let departmentValue = "";
      if (item.departments && typeof item.departments === "object") {
        departmentValue =
          item.departments.department_name ||
          item.departments.name ||
          item.departments.label ||
          "";
      } else if (item.department) {
        if (typeof item.department === "object") {
          departmentValue =
            item.department.department_name ||
            item.department.name ||
            item.department.label ||
            "";
        } else {
          departmentValue = String(item.department);
        }
      } else if (item.department_id) {
        departmentValue = String(item.department_id);
      }

      // Handle role - API returns roles array with name
      let roleValue = "";
      if (item.roles && Array.isArray(item.roles)) {
        roleValue = item.roles
          .map((r: any) => r.name || r.label || r)
          .filter((r: any) => r) // Remove empty values
          .join(", ");
      } else if (item.role) {
        if (Array.isArray(item.role)) {
          roleValue = item.role
            .map((r: any) => r.name || r.label || r)
            .join(", ");
        } else if (typeof item.role === "object") {
          roleValue = item.role.name || item.role.label || "";
        } else {
          roleValue = String(item.role);
        }
      }

      // Handle name - construct from fname/lname to ensure proper spacing
      let nameValue = "";
      const fname = item.fname || "";
      const lname = item.lname || "";
      if (fname || lname) {
        nameValue = `${fname} ${lname}`.trim();
      } else if (item.full_name) {
        // If full_name exists but fname/lname don't, use full_name
        nameValue = item.full_name;
      } else if (item.name) {
        nameValue = item.name;
      } else {
        nameValue = item.username || "";
      }

      // Handle isActive - API returns is_active as string "active" or boolean
      let isActiveValue = true;
      if (item.isActive !== undefined) {
        isActiveValue = item.isActive;
      } else if (item.is_active !== undefined) {
        if (typeof item.is_active === "string") {
          isActiveValue = item.is_active.toLowerCase() === "active";
        } else {
          isActiveValue = Boolean(item.is_active);
        }
      } else if (item.status !== undefined) {
        isActiveValue = item.status !== "inactive";
      }

      return {
        id: item.id || item.employeeId || item.user_id || item.emp_id,
        name: nameValue,
        email: item.email || "",
        position: positionValue,
        department: departmentValue,
        branch: branchValue,
        contact: item.contact || item.phone || item.contact_number || "",
        role: roleValue,
        isActive: isActiveValue,
      };
    });
  };

  // Load branch heads from API
  const loadBranchHeads = async () => {
    if (branchHeadsInFlightPromiseRef.current) {
      await branchHeadsInFlightPromiseRef.current;
      return;
    }

    const requestPromise = (async () => {
      setLoadingBranchHeads(true);
      try {
        const data = await apiService.getAllBranchHeads();
        // Ensure data is an array before mapping
        const normalizedData = normalizeBranchHeadData(data);
        setBranchHeadsData(normalizedData);
      } catch (error) {
        console.error("Error loading branch heads:", error);
        // Set empty array if API fails - no fallback needed
        setBranchHeadsData([]);
      } finally {
        setLoadingBranchHeads(false);
        branchHeadsInFlightPromiseRef.current = null;
      }
    })();

    branchHeadsInFlightPromiseRef.current = requestPromise;
    await requestPromise;
  };

  // Load branch heads on mount
  useEffect(() => {
    loadBranchHeads();
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setBranchHeadsRefreshing(true);
    try {
      await loadBranchHeads();
    } finally {
      setBranchHeadsRefreshing(false);
    }
  };

  // Memoized branch heads (use API data)
  const branchHeads = useMemo(() => {
    return branchHeadsData;
  }, [branchHeadsData]);

  // Helper function to get branch code from branch name/code string
  const getBranchCode = (branchValue: string): string => {
    if (!branchValue || branches.length === 0) return branchValue;
    
    // Try to find matching branch by name or code
    const foundBranch = branches.find(
      (b) =>
        b.name === branchValue.trim() ||
        b.code === branchValue.trim() ||
        String(b.id) === branchValue.trim()
    );
    
    // Return code if found, otherwise return the original value
    return foundBranch?.code || foundBranch?.name || branchValue;
  };

  // Filter branch heads based on search term
  const filteredBranchHeads = useMemo(() => {
    if (!searchTerm) return branchHeads;

    const searchLower = searchTerm.toLowerCase();
    return branchHeads.filter((head: Employee) => {
      const nameMatch = head.name?.toLowerCase().includes(searchLower);
      const branchMatch = head.branch?.toLowerCase().includes(searchLower);
      return nameMatch || branchMatch;
    });
  }, [branchHeads, searchTerm]);

  // Pagination calculations
  const branchHeadsTotal = filteredBranchHeads.length;
  const branchHeadsTotalPages = Math.ceil(branchHeadsTotal / itemsPerPage);
  const branchHeadsStartIndex = (branchHeadsPage - 1) * itemsPerPage;
  const branchHeadsEndIndex = branchHeadsStartIndex + itemsPerPage;
  const branchHeadsPaginated = filteredBranchHeads.slice(
    branchHeadsStartIndex,
    branchHeadsEndIndex
  );

  // Reset to page 1 only when search text actually changes (skip first run)
  useEffect(() => {
    if (
      prevSearchTermForPageRef.current !== null &&
      prevSearchTermForPageRef.current !== searchTerm
    ) {
      setBranchHeadsPage(1);
    }
    prevSearchTermForPageRef.current = searchTerm;
  }, [searchTerm]);

  // Filter branches for edit modal based on search term
  const filteredBranchesForEdit = useMemo(() => {
    if (!editBranchSearchTerm) return branches;

    const searchLower = editBranchSearchTerm.toLowerCase();
    return branches.filter((branch) => {
      const nameMatch = branch.name?.toLowerCase().includes(searchLower);
      const codeMatch = branch.code?.toLowerCase().includes(searchLower);
      const idMatch = String(branch.id || "").toLowerCase().includes(searchLower);
      return nameMatch || codeMatch || idMatch;
    });
  }, [branches, editBranchSearchTerm]);

  // Load branches data
  const loadBranches = async (): Promise<{ id: string; name: string; code: string }[]> => {
    // Don't reload if branches are already loaded
    if (branches.length > 0 && !branchesLoading) {
      return branches;
    }

    if (branchesInFlightPromiseRef.current) {
      return branchesInFlightPromiseRef.current;
    }

    const requestPromise = (async () => {
      setBranchesLoading(true);
      try {
        const branchesData = await apiService.getBranches();
        // Normalize the data format - handle both {id, name} and {value, label} formats
        const normalizedBranches = branchesData.map((branch: any) => {
          if ("id" in branch && "name" in branch) {
            return {
              id: branch.id,
              name: branch.name,
              code: branch.code || branch.branch_code || ""
            };
          } else if ("value" in branch && "label" in branch) {
            // Extract branch name and code from label if it contains " /"
            const labelParts = branch.label.split(" /");
            return {
              id: branch.value,
              name: labelParts[0] || branch.label,
              code: labelParts[1] || labelParts[0] || branch.label, // Use code if available, fallback to name
            };
          }
          return {
            id: String(branch.id || branch.value || ""),
            name: String(branch.name || branch.label || ""),
            code: String(branch.code || branch.branch_code || branch.name || branch.label || ""),
          };
        });
        setBranches(normalizedBranches);
        return normalizedBranches;
      } catch (error) {
        console.error("Error loading branches:", error);
        setBranches([]);
        return [];
      } finally {
        setBranchesLoading(false);
        branchesInFlightPromiseRef.current = null;
      }
    })();

    branchesInFlightPromiseRef.current = requestPromise;
    return requestPromise;
  };

  // Preload branch catalog so the table can map ids / names to branch codes
  useEffect(() => {
    void loadBranches();
  }, []);

  // Auto-close success dialog after 2 seconds
  useEffect(() => {
    if (showSuccessDialog) {
      const timer = setTimeout(() => {
        setShowSuccessDialog(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showSuccessDialog]);

  // Auto-close edit success dialog after 2 seconds
  useEffect(() => {
    if (showEditSuccessDialog) {
      const timer = setTimeout(() => {
        setShowEditSuccessDialog(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showEditSuccessDialog]);

  // Add custom CSS for success dialog content animations (checkmark, ripple, etc.)
  // Note: Container animations are now handled by useDialogAnimation hook
  useEffect(() => {
    const styleId = "branch-heads-success-animations";
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      return; // Styles already injected
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      /* Success Dialog Content Animations */
      @keyframes successScale {
        0% {
          transform: scale(0);
          opacity: 0;
        }
        50% {
          transform: scale(1.1);
          opacity: 1;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      
      @keyframes drawCheckmark {
        0% {
          stroke-dashoffset: 20;
        }
        100% {
          stroke-dashoffset: 0;
        }
      }
      
      @keyframes successRipple {
        0% {
          transform: scale(1);
          opacity: 0.5;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }
      
      .animate-success-scale {
        animation: successScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }
      
      .animate-success-checkmark {
        animation: drawCheckmark 0.5s ease-out 0.3s forwards;
      }
      
      .animate-success-ripple {
        animation: successRipple 1s ease-out 0.2s;
      }
      
      .animate-draw-checkmark {
        animation: drawCheckmark 0.5s ease-out 0.3s forwards;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Branch Heads</CardTitle>
              <CardDescription>
                List of all branch heads in the organization
              </CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={branchHeadsRefreshing || loadingBranchHeads}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
              title="Refresh branch heads data"
            >
              {branchHeadsRefreshing ? (
                <div className="flex items-center space-x-2">
                  <div className="relative h-8 w-8 shrink-0">
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <img
                        src="/smct.png"
                        alt=""
                        className="h-4 w-4 object-contain opacity-95"
                        width={16}
                        height={16}
                        decoding="async"
                      />
                    </span>
                  </div>
                  <span>Refreshing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span aria-hidden>🔄</span>
                  <span>Refresh</span>
                </div>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {(loadingBranchHeads || branchHeadsRefreshing) && (
            <SmctLoadingOverlay
              label={
                branchHeadsRefreshing && !loadingBranchHeads
                  ? "Refreshing branch heads..."
                  : "Loading branch heads..."
              }
            />
          )}
          {/* Search Bar */}
          <div
            className={`mb-6 ${loadingBranchHeads || branchHeadsRefreshing ? "pointer-events-none opacity-40" : ""}`}
          >
            <div className="relative w-full md:w-1/3">
              <Label
                htmlFor="branch-heads-search"
                className="text-sm font-medium mb-2 block cursor-pointer"
              >
                Search
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <Input
                  id="branch-heads-search"
                  placeholder="Search by name or branch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                    aria-label="Clear search"
                    type="button"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div
            className={`relative max-h-[600px] min-h-[280px] overflow-y-auto rounded-lg border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 ${loadingBranchHeads || branchHeadsRefreshing ? "border-blue-100 bg-gray-50/40" : ""}`}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white shadow-sm [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-600">
                <TableRow>
                  <TableHead className="w-1/3">Name</TableHead>
                  <TableHead className="w-1/3 text-center">Branch</TableHead>
                  <TableHead className="w-1/3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingBranchHeads || branchHeadsRefreshing ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell className="py-4">
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex flex-wrap justify-center gap-2">
                          <Skeleton className="h-6 w-24" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex justify-end space-x-2">
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-16" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : branchHeadsPaginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <img
                          src="/not-found.gif"
                          alt="No data"
                          className="w-25 h-25 object-contain"
                          style={{
                            imageRendering: "auto",
                            willChange: "auto",
                            transform: "translateZ(0)",
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                          }}
                        />
                        <div className="text-gray-500">
                          {searchTerm ? (
                            <>
                              <p className="text-base font-medium mb-1">
                                No branch heads found matching "{searchTerm}"
                              </p>
                              <p className="text-sm text-gray-400">
                                Try adjusting your search term
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-base font-medium mb-1">
                                No branch heads found
                              </p>
                              <p className="text-sm text-gray-400">
                                Branch heads will appear here once added
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  branchHeadsPaginated.map((head: Employee) => {
                    // Parse branches from comma-separated string
                    const branchList = head.branch
                      ? head.branch.split(", ").filter((b: string) => b.trim())
                      : [];

                    return (
                      <TableRow key={head.id}>
                        <TableCell className="font-medium py-4">
                          {head.name}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          {branchList.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-2">
                              {branchList.map(
                                (branch: string, index: number) => {
                                  const branchCode = getBranchCode(branch);
                                  return (
                                    <Badge
                                      key={index}
                                      className="bg-blue-600 text-white"
                                    >
                                      {branchCode}
                                    </Badge>
                                  );
                                }
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white bg-blue-600 hover:text-white hover:bg-blue-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                              onClick={async () => {
                                setBranchHeadToEdit(head);
                                setIsEditModalOpen(true);
                                // Load branches first and wait for them
                                const loadedBranches = await loadBranches();
                                // Then parse existing branches after branches are loaded
                                if (head.branch && loadedBranches) {
                                  const existingBranches = head.branch
                                    .split(", ")
                                    .map((name: string) => {
                                      // Try to find matching branch from loaded branches (match by name or code)
                                      const branch = loadedBranches.find(
                                        (b: { id: string; name: string; code: string }) =>
                                          b.name === name.trim() || b.code === name.trim()
                                      );
                                      return (
                                        branch || { id: "", name: name.trim(), code: name.trim() }
                                      );
                                    })
                                    .filter(
                                      (b: { id: string; name: string; code: string }) =>
                                        b.id || b.name
                                    );
                                  setEditSelectedBranches(existingBranches);
                                } else {
                                  setEditSelectedBranches([]);
                                }
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white bg-red-600 hover:text-white hover:bg-red-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                              onClick={() => {
                                setBranchHeadToDelete(head);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              Delete
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

          {/* Pagination Controls */}
          {!branchHeadsRefreshing && branchHeadsTotal > itemsPerPage && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-gray-600">
                Showing {branchHeadsStartIndex + 1} to{" "}
                {Math.min(branchHeadsEndIndex, branchHeadsTotal)} of{" "}
                {branchHeadsTotal} branch heads
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setBranchHeadsPage((prev) => Math.max(1, prev - 1));
                      }}
                      className={
                        branchHeadsPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                      }
                    />
                  </PaginationItem>
                  {(() => {
                    const pages: (number | "ellipsis")[] = [];
                    if (branchHeadsTotalPages <= 7) {
                      for (let i = 1; i <= branchHeadsTotalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      if (branchHeadsPage <= 3) {
                        for (let i = 1; i <= 5; i++) {
                          pages.push(i);
                        }
                        pages.push("ellipsis");
                        pages.push(branchHeadsTotalPages);
                      } else if (branchHeadsPage >= branchHeadsTotalPages - 2) {
                        pages.push(1);
                        pages.push("ellipsis");
                        for (
                          let i = branchHeadsTotalPages - 4;
                          i <= branchHeadsTotalPages;
                          i++
                        ) {
                          pages.push(i);
                        }
                      } else {
                        pages.push(1);
                        pages.push("ellipsis");
                        pages.push(branchHeadsPage - 1);
                        pages.push(branchHeadsPage);
                        pages.push(branchHeadsPage + 1);
                        pages.push("ellipsis");
                        pages.push(branchHeadsTotalPages);
                      }
                    }
                    return pages.map((page, index) => {
                      if (page === "ellipsis") {
                        return (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setBranchHeadsPage(page);
                            }}
                            isActive={branchHeadsPage === page}
                            className={
                              branchHeadsPage === page
                                ? "cursor-pointer bg-blue-700 text-white hover:bg-blue-800 hover:text-white"
                                : "cursor-pointer bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                            }
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    });
                  })()}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setBranchHeadsPage((prev) =>
                          Math.min(branchHeadsTotalPages, prev + 1)
                        );
                      }}
                      className={
                        branchHeadsPage === branchHeadsTotalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer bg-blue-500 text-white hover:bg-blue-700 hover:text-white"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branch Heads List Modal */}
      <Dialog open={isListModalOpen} onOpenChangeAction={setIsListModalOpen}>
        <DialogContent
          className={`relative overflow-hidden max-w-xl max-h-[90vh] p-4 flex flex-col ${dialogAnimationClass}`}
        >
          <SmctDialogBackdrop layout="scrollable" />
          <DialogHeader className="relative z-10 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Branch Heads List</DialogTitle>
                <DialogDescription>
                  Complete list of all branch heads in the organization
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsListModalOpen(false)}
                className="h-10 w-10 p-0 hover:bg-gray-100 bg-blue-600 text-white rounded-full hover:text-white hover:bg-red-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </div>
          </DialogHeader>

          <div className="relative z-10 flex-1 min-h-[280px] min-h-0 flex flex-col">
            {(loadingBranchHeads || isAssignBranchesLoading) && (
              <SmctLoadingOverlay
                label={
                  isAssignBranchesLoading
                    ? "Loading branches..."
                    : "Loading branch heads..."
                }
              />
            )}
            {!(
              loadingBranchHeads ||
              isAssignBranchesLoading
            ) &&
              (branchHeads.length === 0 ? (
                <div className="flex flex-col flex-1 items-center justify-center py-12 text-gray-500">
                  <img
                    src="/not-found.gif"
                    alt="No data"
                    className="w-25 h-25 object-contain mb-4"
                    style={{
                      imageRendering: "auto",
                      willChange: "auto",
                      transform: "translateZ(0)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                  />
                  <p className="text-base font-medium mb-1">
                    No branch heads found
                  </p>
                  <p className="text-sm text-gray-400">
                    Branch heads will appear here once added
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col overflow-hidden border rounded-lg">
                  <div className="max-h-[60vh] min-h-0 flex-1 overflow-y-auto">
                    <Table className="w-full">
                      <TableHeader className="bg-gray-50 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-600">
                        <TableRow>
                          <TableHead className="w-2/3 px-6">Name</TableHead>
                          <TableHead className="w-1/3 text-center px-6">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {branchHeads.map((head: Employee) => (
                          <TableRow key={head.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium py-3 px-6">
                              {head.name}
                            </TableCell>
                            <TableCell className="py-3 text-center px-6">
                              <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                size="sm"
                                disabled={isAssignBranchesLoading}
                                onClick={async () => {
                                  setSelectedBranchHead(head);
                                  setIsAssignBranchesLoading(true);
                                  try {
                                    await loadBranches();
                                    setIsListModalOpen(false);
                                    requestAnimationFrame(() => {
                                      requestAnimationFrame(() => {
                                        setIsBranchesModalOpen(true);
                                      });
                                    });
                                  } finally {
                                    setIsAssignBranchesLoading(false);
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Branches List Modal */}
      <Dialog
        open={isBranchesModalOpen}
        onOpenChangeAction={setIsBranchesModalOpen}
      >
        <DialogContent
          className={`relative overflow-hidden max-w-xl max-h-[90vh] p-4 flex flex-col ${dialogAnimationClass}`}
        >
          <SmctDialogBackdrop layout="scrollable" />
          <DialogHeader className="relative z-10 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Branches List</DialogTitle>
                <DialogDescription>
                  Complete list of all branches in the organization
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsBranchesModalOpen(false);
                  setShowConfirmation(false);
                  setSelectedBranches([]);
                }}
                className="h-10 w-10 p-0 hover:bg-gray-100 bg-blue-600 text-white rounded-full hover:text-white hover:bg-red-700 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </div>
          </DialogHeader>

          <div className="relative z-10 flex flex-1 flex-col min-h-[280px] min-h-0">
            {branchesLoading && (
              <SmctLoadingOverlay label="Loading branches..." />
            )}
            {!branchesLoading && (
              <div className="flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto">
            {/* Confirmation Indicator */}
            {showConfirmation &&
              selectedBranches.length > 0 &&
              selectedBranchHead && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        Branch Assignment Ready
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        <span className="font-semibold">
                          {selectedBranchHead.name}
                        </span>{" "}
                        will be assigned to:
                      </p>
                      <div className="mt-2 space-y-1">
                        {selectedBranches.map((branch) => (
                          <div
                            key={branch.id}
                            className="flex items-center gap-2"
                          >
                            <span className="text-xs text-blue-600">•</span>
                            <span className="text-sm text-blue-700 font-medium">
                              {branch.code || branch.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedBranches([]);
                        setShowConfirmation(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                      onClick={async () => {
                        if (
                          !selectedBranchHead ||
                          selectedBranches.length === 0
                        )
                          return;

                        await withErrorHandling(
                          async () => {
                            // Store data for success message
                            setSuccessData({
                              branchHead: selectedBranchHead,
                              branches: [...selectedBranches],
                            });

                            // Update user branch assignments using dedicated API endpoint
                            const formData = new FormData();
                            // Add each branch ID to the form data
                            selectedBranches.forEach((branch) => {
                              formData.append("branch_ids[]", branch.id);
                            });

                            // Use updateUserBranch API endpoint for branch assignments
                            await apiService.updateUserBranch(
                              selectedBranchHead.id,
                              formData
                            );

                            // Close the branches modal after confirmation
                            setIsBranchesModalOpen(false);
                            setShowConfirmation(false);
                            // Show success dialog
                            setShowSuccessDialog(true);
                            // Clear selections after a delay
                            setTimeout(() => {
                              setSelectedBranches([]);
                            }, 100);

                            // Show success toast
                            toastMessages.generic.success(
                              "Branch Assignment Successful",
                              `${
                                selectedBranchHead.name
                              } has been assigned to ${
                                selectedBranches.length
                              } ${
                                selectedBranches.length === 1
                                  ? "branch"
                                  : "branches"
                              }.`
                            );

                            // Reload branch heads data to update the table
                            const reloadedData =
                              await apiService.getAllBranchHeads();
                            const normalizedData =
                              normalizeBranchHeadData(reloadedData);
                            setBranchHeadsData(normalizedData);
                          },
                          {
                            errorTitle: "Assignment Failed",
                            errorMessage:
                              "Failed to assign branches. Please try again.",
                            showSuccessToast: false, // We show custom success toast above
                          }
                        );
                      }}
                    >
                      Confirm ({selectedBranches.length})
                    </Button>
                  </div>
                </div>
              )}

            {branches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No branches found
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-gray-50 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-600">
                      <TableRow>
                        <TableHead className="w-2/5">Branch Code</TableHead>
                        <TableHead className="w-2/5 text-center">
                          Branch Name
                        </TableHead>
                        <TableHead className="w-1/5 text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((branch) => (
                        <TableRow key={branch.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium py-3">
                            {branch.code || branch.name}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            {branch.id}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <div className="flex justify-center">
                              <Button
                                className={`${
                                  selectedBranches.some(
                                    (b) => b.id === branch.id
                                  )
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                }`}
                                size="sm"
                                onClick={() => {
                                  // Check if branch is already selected
                                  const isSelected = selectedBranches.some(
                                    (b) => b.id === branch.id
                                  );

                                  if (isSelected) {
                                    // Remove from selection
                                    setSelectedBranches(
                                      selectedBranches.filter(
                                        (b) => b.id !== branch.id
                                      )
                                    );
                                    if (selectedBranches.length === 1) {
                                      setShowConfirmation(false);
                                    }
                                  } else {
                                    // Add to selection
                                    setSelectedBranches([
                                      ...selectedBranches,
                                      branch,
                                    ]);
                                    setShowConfirmation(true);
                                  }
                                }}
                              >
                                {selectedBranches.some(
                                  (b) => b.id === branch.id
                                )
                                  ? "Added"
                                  : "Add"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onOpenChangeAction={setShowSuccessDialog}
      >
        <DialogContent
          className={`max-w-sm w-[90vw] px-6 py-6 text-center ${dialogAnimationClass}`}
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
              Success!
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              {successData.branchHead && successData.branches.length > 0 ? (
                <>
                  <span className="font-semibold text-green-700">
                    {successData.branchHead.name}
                  </span>{" "}
                  has been successfully assigned to{" "}
                  {successData.branches.length}{" "}
                  {successData.branches.length === 1 ? "branch" : "branches"}.
                </>
              ) : (
                "Branch assignment completed successfully."
              )}
            </DialogDescription>
            <p className="mt-2 text-xs text-gray-500">
              This dialog will close automatically in 2 seconds.
            </p>
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer px-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              onClick={() => setShowSuccessDialog(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Head Modal */}
      <Dialog open={isEditModalOpen} onOpenChangeAction={setIsEditModalOpen}>
        <DialogContent
          className={`relative overflow-hidden max-w-xl max-h-[90vh] p-4 flex flex-col ${dialogAnimationClass}`}
        >
          <DialogHeader className="relative z-10 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Edit Branch Assignment</DialogTitle>
                <DialogDescription>
                  Update branch assignments for {branchHeadToEdit?.name}
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setBranchHeadToEdit(null);
                  setEditSelectedBranches([]);
                  setEditBranchSearchTerm("");
                }}
                className="h-10 w-10 p-0 cursor-pointer bg-blue-600 text-white rounded-full hover:text-white hover:bg-red-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </div>
          </DialogHeader>

          <div className="relative z-10 flex flex-1 flex-col min-h-[320px] min-h-0">
            {branchesLoading && (
              <SmctLoadingOverlay label="Loading branches..." />
            )}
            {!branchesLoading && (
            <div className="flex min-h-0 flex-1 flex-col space-y-2">
            {/* Current Assignment Display */}
            {branchHeadToEdit && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex-shrink-0">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Current Assignment:
                </p>
                <p className="text-sm text-gray-600">
                  {branchHeadToEdit.branch || "No branches assigned"}
                </p>
              </div>
            )}

            {/* Search Bar for Branches */}
            <div className="flex-shrink-0">
              <div className="relative w-full">
                <Label
                  htmlFor="edit-branch-search"
                  className="text-sm font-medium mb-2 block"
                >
                  Search Branches
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </span>
                  <Input
                    id="edit-branch-search"
                    placeholder="Search by branch code, name, or ID..."
                    value={editBranchSearchTerm}
                    onChange={(e) => setEditBranchSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-10"
                  />
                  {editBranchSearchTerm && (
                    <button
                      onClick={() => setEditBranchSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear search"
                      aria-label="Clear search"
                      type="button"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Branches Selection */}
            {branches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No branches found
              </div>
            ) : filteredBranchesForEdit.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No branches found matching "{editBranchSearchTerm}"
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-gray-50 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-600">
                      <TableRow>
                        <TableHead className="w-2/5">Branch Code</TableHead>
                        <TableHead className="w-2/5 text-center">
                          Branch ID
                        </TableHead>
                        <TableHead className="w-1/5 text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBranchesForEdit.map((branch) => {
                        const isSelected = editSelectedBranches.some(
                          (b) => b.id === branch.id
                        );
                        return (
                          <TableRow
                            key={branch.id}
                            className="hover:bg-gray-50"
                          >
                            <TableCell className="font-medium py-3">
                              {branch.code || branch.name}
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              {branch.name || "N/A"}
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <div className="flex justify-center">
                                <Button
                                  className={`${
                                    isSelected
                                      ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                                      : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                                  }`}
                                  size="sm"
                                  onClick={() => {
                                    if (isSelected) {
                                      setEditSelectedBranches(
                                        editSelectedBranches.filter(
                                          (b) => b.id !== branch.id
                                        )
                                      );
                                    } else {
                                      setEditSelectedBranches([
                                        ...editSelectedBranches,
                                        branch,
                                      ]);
                                    }
                                  }}
                                >
                                  {isSelected ? "Selected" : "Select"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Selected Branches Summary */}
            {editSelectedBranches.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-shrink-0">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Selected Branches ({editSelectedBranches.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {editSelectedBranches.map((branch) => (
                    <Badge key={branch.id} className="bg-blue-600 text-white">
                      {branch.code || branch.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="relative z-10 flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="bg-red-600 text-white hover:bg-red-700 hover:text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              onClick={() => {
                setIsEditModalOpen(false);
                setBranchHeadToEdit(null);
                setEditSelectedBranches([]);
                setEditBranchSearchTerm("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              disabled={isSaving || branchesLoading}
              onClick={async () => {
                if (!branchHeadToEdit) {
                  toastMessages.generic.error(
                    "Validation Error",
                    "No branch head selected."
                  );
                  return;
                }

                setIsSaving(true);

                try {
                  await withErrorHandling(
                    async () => {
                      // Remove existing branches
                      await apiService.removeUserBranches(branchHeadToEdit.id);

                      // Add selected branches
                      if (editSelectedBranches.length > 0) {
                        const formData = new FormData();
                        editSelectedBranches.forEach((branch) => {
                          formData.append("branch_ids[]", String(branch.id));
                        });

                        await apiService.updateUserBranch(
                          branchHeadToEdit.id,
                          formData
                        );
                      }

                      // Update UI immediately
                      const branchNames =
                        editSelectedBranches.length > 0
                          ? editSelectedBranches.map((b) => b.name).join(", ")
                          : "";

                      setBranchHeadsData((prevData) =>
                        prevData.map((head) =>
                          head.id === branchHeadToEdit.id
                            ? { ...head, branch: branchNames }
                            : head
                        )
                      );

                      // Reload in background
                      apiService
                        .getAllBranchHeads()
                        .then((reloadedData) => {
                          setBranchHeadsData(
                            normalizeBranchHeadData(reloadedData)
                          );
                        })
                        .catch(() => {});

                      setEditSuccessData({
                        branchHead: branchHeadToEdit,
                        branches: [...editSelectedBranches],
                      });

                      setIsEditModalOpen(false);
                      setBranchHeadToEdit(null);
                      setEditSelectedBranches([]);
                      setEditBranchSearchTerm("");
                      setShowEditSuccessDialog(true);

                      toastMessages.generic.success(
                        "Branch Assignment Updated",
                        `${branchHeadToEdit.name}'s branch assignment has been updated.`
                      );
                    },
                    {
                      errorTitle: "Update Failed",
                      errorMessage:
                        "Failed to update branch assignment. Please try again.",
                      showSuccessToast: false,
                    }
                  );
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              {isSaving && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Success Dialog */}
      <Dialog
        open={showEditSuccessDialog}
        onOpenChangeAction={setShowEditSuccessDialog}
      >
        <DialogContent
          className={`max-w-sm w-[90vw] px-6 py-6 text-center ${dialogAnimationClass}`}
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
              Updated!
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              {editSuccessData.branchHead && editSuccessData.branches.length > 0 ? (
                <>
                  <span className="font-semibold text-green-700">
                    {editSuccessData.branchHead.name}
                  </span>
                  {"'s"} branch assignment has been updated to{" "}
                  {editSuccessData.branches.length}{" "}
                  {editSuccessData.branches.length === 1 ? "branch" : "branches"}.
                </>
              ) : (
                "Branch assignment updated successfully."
              )}
            </DialogDescription>
            <p className="mt-2 text-xs text-gray-500">
              This dialog will close automatically in 2 seconds.
            </p>
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center">
            
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Branch Head Dialog */}
      <Dialog
        open={isDeleteModalOpen}
        onOpenChangeAction={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setBranchHeadToDelete(null);
          }
        }}
      >
        <DialogContent
          className={`relative overflow-hidden max-w-md p-6 ${dialogAnimationClass}`}
        >
          <SmctDialogBackdrop layout="centered" />
          <DialogHeader className="relative z-10 pb-4 bg-red-50 rounded-lg">
            <DialogTitle className="text-red-800 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Delete Branch Assignment
            </DialogTitle>
            <DialogDescription className="text-red-700">
              This action cannot be undone. Are you sure you want to permanently
              remove branch assignments for {branchHeadToDelete?.name}?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-6 px-2">
            <div className="flex justify-end space-x-4 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setBranchHeadToDelete(null);
                }}
                className="text-white bg-blue-600 hover:text-white hover:bg-blue-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                onClick={async () => {
                  if (!branchHeadToDelete) return;

                  // Proceed with deletion using error handler
                  await withErrorHandling(
                    async () => {
                      // Remove all branch assignments using dedicated API endpoint
                      await apiService.removeUserBranches(
                        branchHeadToDelete.id
                      );

                      // Reload branch heads data to update the table
                      const reloadedData = await apiService.getAllBranchHeads();
                      const normalizedData =
                        normalizeBranchHeadData(reloadedData);
                      setBranchHeadsData(normalizedData);

                      // Show success message
                      toastMessages.generic.success(
                        "Branch Assignment Removed",
                        `${branchHeadToDelete.name}'s branch assignment has been removed.`
                      );

                      // Close modal and reset
                      setIsDeleteModalOpen(false);
                      setBranchHeadToDelete(null);
                    },
                    {
                      errorTitle: "Delete Failed",
                      errorMessage:
                        "Failed to remove branch assignment. Please try again.",
                      showSuccessToast: false, // We show custom success toast above
                    }
                  );
                }}
              >
                🗑️ Delete Permanently
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
