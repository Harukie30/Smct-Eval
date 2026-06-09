"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Skeleton,
  SkeletonButton,
  SkeletonBadge,
} from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RefreshCw, Check, X } from "lucide-react";
import apiService from "@/lib/apiService";
import { useToast } from "@/hooks/useToast";
import EvaluationsPagination from "@/components/paginationComponent";
import { useBranchesForEvaluation } from "@/hooks/useBranchesForEvaluation";
import { getEmployeeBranchCodeDisplay } from "@/components/evaluation/employeeBranchLabel";
import { cn } from "@/lib/utils";

const SIGNATURE_RESET_TABLE_CLASS =
  "min-w-[36rem] sm:min-w-[44rem] md:min-w-[52rem] lg:min-w-0 lg:w-full [&_th]:h-auto [&_th]:min-h-8 [&_th]:whitespace-nowrap [&_th]:px-2 [&_th]:py-2 [&_th]:align-middle [&_th]:text-[0.6rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-600 sm:[&_th]:px-2.5 sm:[&_th]:py-2.5 sm:[&_th]:text-[0.65rem] lg:[&_th]:px-3 lg:[&_th]:text-xs [&_td]:min-w-0 [&_td]:px-2 [&_td]:py-2 [&_td]:align-top [&_td]:text-[0.7rem] [&_td]:leading-snug sm:[&_td]:px-2.5 sm:[&_td]:py-2.5 sm:[&_td]:text-xs lg:[&_td]:px-3 lg:[&_td]:text-sm";

const SIGNATURE_ACTIONS_HEAD_CLASS = cn(
  "w-[3.5rem] min-w-[3.5rem] p-1 text-center sm:min-w-[4.5rem] lg:sticky lg:right-0 lg:z-[4] lg:min-w-[14rem] lg:bg-white lg:text-right lg:shadow-[-6px_0_12px_-4px_rgba(15,23,42,0.12)]"
);

function signatureActionsCellClass() {
  return cn(
    "w-[3.5rem] min-w-[3.5rem] max-w-[3.5rem] p-1 sm:min-w-[4.5rem] sm:max-w-none sm:p-2",
    "lg:sticky lg:right-0 lg:z-[3] lg:min-w-[14rem] lg:w-auto lg:bg-white lg:shadow-[-6px_0_12px_-4px_rgba(15,23,42,0.12)]"
  );
}

type DepartmentOption = { label: string; value: string };

function formatRequestDate(dateString: string): { short: string; full: string } {
  if (!dateString) return { short: "N/A", full: "N/A" };
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return { short: "N/A", full: "N/A" };
  return {
    short: d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    }),
    full: d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/** API returns user rows (flat), not nested `user` + `requested_at`. */
function getSignatureResetRequestedAt(request: Record<string, unknown>): string {
  const candidates = [
    request.requested_at,
    request.signature_reset_requested_at,
    request.requestedAt,
    request.updated_at,
    request.updatedAt,
  ];
  for (const value of candidates) {
    if (value != null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}

function getRequestDepartmentDisplay(
  request: Record<string, unknown>,
  departmentOptions: DepartmentOption[],
  departmentListLoading: boolean
): string {
  const departments = request.departments as Record<string, unknown> | undefined;
  const nested =
    departments?.department_name ||
    departments?.label ||
    departments?.name;
  if (nested != null && String(nested).trim() !== "") {
    return String(nested);
  }

  const direct = request.department;
  if (direct != null && String(direct).trim() !== "") {
    return String(direct);
  }

  const deptId = request.department_id ?? request.departmentId;
  if (deptId != null && String(deptId).trim() !== "") {
    if (departmentListLoading) return "Loading\u2026";
    const match = departmentOptions.find(
      (d) => String(d.value) === String(deptId)
    );
    return match?.label?.trim() || String(deptId);
  }

  return "N/A";
}

function getRequestUserLabel(request: Record<string, unknown>): string {
  const user = request.user as Record<string, unknown> | undefined;
  const fname = String(request.fname ?? user?.fname ?? "").trim();
  const lname = String(request.lname ?? user?.lname ?? "").trim();
  return [fname, lname].filter(Boolean).join(" ").trim() || "Unknown";
}

function SignatureResetRowActions({
  onApprove,
  onReject,
}: {
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:justify-end lg:justify-end lg:gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onApprove}
        aria-label="Accept signature reset request"
        className="h-8 w-8 shrink-0 border-green-300 bg-green-600 text-white hover:bg-green-700 hover:text-white lg:h-9 lg:w-auto lg:px-3 lg:transition-all lg:duration-200 lg:hover:-translate-y-0.5 lg:hover:shadow-md lg:active:translate-y-0"
      >
        <Check className="h-4 w-4 lg:mr-1" />
        <span className="hidden lg:inline cursor-pointer">Accept Request</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onReject}
        aria-label="Reject signature reset request"
        className="h-8 w-8 shrink-0 border-red-300 bg-red-600 text-white hover:bg-red-700 hover:text-white lg:h-9 lg:w-auto lg:px-3 lg:transition-all lg:duration-200 lg:hover:-translate-y-0.5 lg:hover:shadow-md lg:active:translate-y-0"
      >
        <X className="h-4 w-4 lg:mr-1" />
        <span className="hidden lg:inline cursor-pointer">Reject Request</span>
      </Button>
    </div>
  );
}

interface SignatureResetRequest {
  id: number;
  user_id?: number;
  user: {
    id?: number;
    fname: string;
    lname: string;
    email: string;
    username: string;
    position?: string;
    department?: string;
    branch?: string;
  };
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  processed_at?: string;
  processed_by?: number;
}

function SmctLoadingOverlay({ label }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 z-[70] flex items-center justify-center rounded-lg bg-white/55 backdrop-blur-[1px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none flex flex-col items-center gap-3 rounded-lg bg-white/90 px-8 py-6 shadow-lg ring-1 ring-gray-200/80">
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
        <p className="text-sm font-medium text-gray-600">{label ?? "Loading..."}</p>
      </div>
    </div>
  );
}

export default function SignatureResetRequestsTab() {
  const [requests, setRequests] = useState<SignatureResetRequest[]>([]);
  const [refresh, setRefresh] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [statusFilter, setStatusFilter] = useState("0"); // Default to "All Requests"
  const [debouncedStatusFilter, setDebouncedStatusFilter] =
    useState(statusFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(0);

  const { branchOptions, isLoading: branchListLoading } =
    useBranchesForEvaluation();
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>(
    []
  );
  const [departmentListLoading, setDepartmentListLoading] = useState(true);

  // Modal states
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<SignatureResetRequest | null>(null);

  const { success, error: showError } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const signatureResetFetchKeyRef = useRef<string | null>(null);
  const signatureResetFetchPromiseRef = useRef<Promise<SignatureResetRequest[]> | null>(
    null
  );
  const prevSearchDebouncedRef = useRef<string | null>(null);
  const prevStatusDebouncedRef = useRef<string | null>(null);
  const prevPageRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const departments = await apiService.getDepartments();
        if (!cancelled) {
          setDepartmentOptions(departments);
        }
      } catch (err) {
        console.error("Error loading departments for signature reset list:", err);
      } finally {
        if (!cancelled) {
          setDepartmentListLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Date filter options for combobox
  const statusOptions = [
    { value: "0", label: "All Requests" },
    { value: "new", label: "New" },
    { value: "recent", label: "Recent" },
    { value: "old", label: "Old" },
  ];

  const fetchSignatureResetList = async (
    searchValue: string
  ): Promise<SignatureResetRequest[]> => {
    const key = searchValue;
    if (
      signatureResetFetchKeyRef.current === key &&
      signatureResetFetchPromiseRef.current
    ) {
      return signatureResetFetchPromiseRef.current;
    }

    const requestPromise = (async () => {
      try {
        const response = await apiService.getSignatureResetRequests(searchValue);

        let allRequests: SignatureResetRequest[] = [];

        if (response) {
          if (response.data && Array.isArray(response.data)) {
            allRequests = response.data;
          } else if (Array.isArray(response)) {
            allRequests = response;
          }
        }

        return allRequests;
      } finally {
        if (signatureResetFetchKeyRef.current === key) {
          signatureResetFetchKeyRef.current = null;
          signatureResetFetchPromiseRef.current = null;
        }
      }
    })();

    signatureResetFetchKeyRef.current = key;
    signatureResetFetchPromiseRef.current = requestPromise;
    return requestPromise;
  };

  const loadRequests = async (
    searchValue: string,
    statusFilterValue: string,
    isPageChange: boolean = false
  ) => {
    try {
      if (isPageChange) {
        setIsPageLoading(true);
      }
      const allRequests = await fetchSignatureResetList(searchValue);

      // Apply client-side filtering
      let filteredRequests = allRequests;

      // Filter by search term
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        filteredRequests = filteredRequests.filter((request) => {
          const row = request as unknown as Record<string, unknown>;
          const user = row.user as Record<string, unknown> | undefined;
          const fullName = getRequestUserLabel(row).toLowerCase();
          const email = String(row.email ?? user?.email ?? "").toLowerCase();
          const username = String(row.username ?? user?.username ?? "").toLowerCase();
          return (
            fullName.includes(searchLower) ||
            email.includes(searchLower) ||
            username.includes(searchLower)
          );
        });
      }

      // Filter by date (convert "0" to empty string for "All Requests")
      const dateFilterForFiltering =
        statusFilterValue === "0" ? "" : statusFilterValue;
      if (dateFilterForFiltering) {
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        filteredRequests = filteredRequests.filter((request) => {
          const requestedAt = getSignatureResetRequestedAt(
            request as unknown as Record<string, unknown>
          );
          if (!requestedAt) return false;
          const requestDate = new Date(requestedAt);
          const requestDateOnly = new Date(
            requestDate.getFullYear(),
            requestDate.getMonth(),
            requestDate.getDate()
          );

          switch (dateFilterForFiltering) {
            case "new":
              // New: Today's requests
              return requestDateOnly.getTime() === today.getTime();
            case "recent":
              // Recent: Last 7 days (including today)
              return requestDate >= oneWeekAgo && requestDate <= now;
            case "old":
              // Old: Older than 7 days
              return requestDate < oneWeekAgo;
            default:
              return true;
          }
        });
      }

      // Apply client-side pagination
      const total = filteredRequests.length;
      const lastPage = Math.ceil(total / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

      setRequests(paginatedRequests);
      setTotalItems(total);
      setTotalPages(lastPage);
      setPerPage(itemsPerPage);
    } catch (err) {
      console.error("Error loading signature reset requests:", err);
      showError("Failed to load signature reset requests");
    } finally {
      setRefresh(false);
      if (isPageChange) {
        setIsPageLoading(false);
      }
    }
  };

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      if (
        prevSearchDebouncedRef.current !== null &&
        prevSearchDebouncedRef.current !== searchTerm
      ) {
        setCurrentPage(1);
      }
      prevSearchDebouncedRef.current = searchTerm;
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Debounce status filter
  useEffect(() => {
    const handler = setTimeout(() => {
      if (
        prevStatusDebouncedRef.current !== null &&
        prevStatusDebouncedRef.current !== statusFilter
      ) {
        setCurrentPage(1);
      }
      prevStatusDebouncedRef.current = statusFilter;
      setDebouncedStatusFilter(statusFilter);
    }, 300);
    return () => clearTimeout(handler);
  }, [statusFilter]);

  // Single fetch path: debounced filters + page (no duplicate mount load)
  useEffect(() => {
    const pageChanged =
      prevPageRef.current !== null && prevPageRef.current !== currentPage;
    prevPageRef.current = currentPage;

    const fetchData = async () => {
      try {
        await loadRequests(
          debouncedSearchTerm,
          debouncedStatusFilter,
          pageChanged
        );
      } catch (err) {
        console.error(err);
      }
    };
    void fetchData();
  }, [debouncedSearchTerm, debouncedStatusFilter, currentPage]);

  const handleRefresh = async () => {
    setRefresh(true);
    await loadRequests(debouncedSearchTerm, debouncedStatusFilter);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    // The API returns user objects directly, so the user ID is in the id field
    const userId =
      (selectedRequest as any).id ||
      selectedRequest.user_id ||
      selectedRequest.user?.id;

    if (!userId) {
      console.error(
        "User ID not found. Full request object:",
        JSON.stringify(selectedRequest, null, 2)
      );
      showError("User ID not found in request data.");
      return;
    }

    try {
      await apiService.approveSignatureReset(userId);
      success("Signature reset request approved successfully!");
      setIsApproveModalOpen(false);
      setSelectedRequest(null);
      await loadRequests(debouncedSearchTerm, debouncedStatusFilter);
    } catch (err: any) {
      console.error("Error approving request:", err);
      showError(err.response?.data?.message || "Failed to approve request");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    // The API returns user objects directly, so the user ID is in the id field
    const userId =
      (selectedRequest as any).id ||
      selectedRequest.user_id ||
      selectedRequest.user?.id;

    if (!userId) {
      console.error(
        "User ID not found. Full request object:",
        JSON.stringify(selectedRequest, null, 2)
      );
      showError("User ID not found in request data.");
      return;
    }

    try {
      await apiService.rejectSignatureReset(userId);
      success("Signature reset request rejected successfully!");
      setIsRejectModalOpen(false);
      setSelectedRequest(null);
      await loadRequests(debouncedSearchTerm, debouncedStatusFilter);
    } catch (err: any) {
      console.error("Error rejecting request:", err);
      showError(err.response?.data?.message || "Failed to reject request");
    }
  };

  const openApproveModal = (request: SignatureResetRequest) => {
    setSelectedRequest(request);
    setIsApproveModalOpen(true);
  };

  const openRejectModal = (request: SignatureResetRequest) => {
    setSelectedRequest(request);
    setIsRejectModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative min-h-[400px] overflow-y-auto pr-0 sm:pr-2">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">
                Signature Reset Requests
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage signature reset requests from users
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refresh || isPageLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white hover:text-white border-blue-600 hover:border-blue-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {refresh || isPageLoading ? (
                <span className="flex items-center gap-2">
                  <span className="relative h-8 w-8 shrink-0">
                    <span className="absolute inset-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
                  </span>
                  <span>{refresh ? "Refreshing..." : "Loading..."}</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </span>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative p-4 sm:p-6">
          {(refresh || isPageLoading) && (
            <SmctLoadingOverlay
              label={
                isPageLoading && !refresh
                  ? "Loading page..."
                  : "Updating signature reset requests..."
              }
            />
          )}
          {/* Filters */}
          <div
            className={cn(
              "mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4",
              (refresh || isPageLoading) && "pointer-events-none opacity-40"
            )}
          >
            <Input
              placeholder="Search by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-w-0 sm:flex-1"
            />
            <Combobox
              options={statusOptions}
              value={statusFilter}
              onValueChangeAction={(value) => setStatusFilter(value as string)}
              placeholder="All Requests"
              searchPlaceholder="Search status..."
              emptyText="No status found."
              className="w-full cursor-pointer sm:w-[180px] sm:shrink-0"
            />
          </div>

          <p className="mb-2 text-[0.65rem] text-muted-foreground lg:hidden">
            Swipe horizontally to view all columns.
          </p>

          {/* Table */}
          <div
            className={cn(
              "overflow-hidden rounded-md border",
              (refresh || isPageLoading) &&
                "min-h-[280px] border-blue-100 bg-gray-50/40"
            )}
          >
            <div
              className="relative max-h-[min(70vh,32rem)] overflow-x-auto overflow-y-auto sm:max-h-[min(75vh,36rem)] lg:max-h-[600px] [-webkit-overflow-scrolling:touch]"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#cbd5e1 #f1f5f9",
              }}
            >
            <Table
              className={SIGNATURE_RESET_TABLE_CLASS}
              wrapperClassName="overflow-visible"
            >
              <TableHeader className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="min-w-[7rem] sm:min-w-[8.5rem]">
                    User
                  </TableHead>
                  <TableHead className="hidden min-w-[8rem] md:table-cell">
                    Email
                  </TableHead>
                  <TableHead className="hidden min-w-[6rem] lg:table-cell">
                    Position
                  </TableHead>
                  <TableHead className="hidden min-w-[6rem] lg:table-cell">
                    Department
                  </TableHead>
                  <TableHead className="hidden min-w-[4rem] sm:table-cell">
                    Branch
                  </TableHead>
                  <TableHead className="hidden min-w-[5rem] sm:table-cell">
                    Requested
                  </TableHead>
                  <TableHead className={SIGNATURE_ACTIONS_HEAD_CLASS}>
                    <span className="lg:hidden" aria-hidden>
                      ⋮
                    </span>
                    <span className="hidden lg:inline">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refresh || isPageLoading ? (
                  Array.from({ length: itemsPerPage }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className={signatureActionsCellClass()}>
                        <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-end">
                          <SkeletonButton size="sm" className="h-8 w-8 rounded-md lg:w-24" />
                          <SkeletonButton size="sm" className="h-8 w-8 rounded-md lg:w-24" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center sm:py-12">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <img
                          src="/not-found.gif"
                          alt="No data"
                          className="w-25 h-25 object-contain"
                          draggable="false"
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                          }}
                          onDrag={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                          }}
                          onDragEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                          }}
                          onMouseDown={(e) => {
                            // Prevent default behavior on mouse down to prevent dragging
                            if (e.button === 0) {
                              // Left mouse button
                              e.preventDefault();
                            }
                          }}
                          style={
                            {
                              imageRendering: "auto",
                              willChange: "auto",
                              transform: "translateZ(0)",
                              backfaceVisibility: "hidden",
                              WebkitBackfaceVisibility: "hidden",
                            } as React.CSSProperties
                          }
                        />
                        <div className="text-gray-500">
                          {searchTerm || statusFilter !== "0" ? (
                            <>
                              <p className="text-base font-medium mb-1">
                                No signature reset requests found
                              </p>
                              <p className="text-sm">
                                Try adjusting your search or date filter
                                criteria
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-base font-medium mb-1">
                                No signature reset requests
                              </p>
                              <p className="text-sm">
                                Requests will appear here when users request
                                signature resets
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request: any) => {
                    const row = request as Record<string, unknown>;
                    const requestedAt = formatRequestDate(
                      getSignatureResetRequestedAt(row)
                    );
                    const branchDisplay = getEmployeeBranchCodeDisplay(
                      request,
                      branchOptions,
                      branchListLoading
                    );
                    const departmentDisplay = getRequestDepartmentDisplay(
                      row,
                      departmentOptions,
                      departmentListLoading
                    );
                    return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-gray-900">
                            {getRequestUserLabel(row)}
                          </div>
                          <div className="truncate text-[0.65rem] text-gray-500 sm:text-xs">
                            @{String(request.username ?? "—")}
                          </div>
                          <div className="mt-1 truncate text-[0.65rem] text-gray-600 md:hidden">
                            {request.email}
                          </div>
                          <div className="mt-0.5 text-[0.65rem] text-gray-500 sm:hidden">
                            {branchDisplay}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-[10rem] truncate md:table-cell">
                        {request.email}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="block max-w-[8rem] truncate">
                          {request.positions?.label || request.position || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="block max-w-[8rem] truncate">
                          {departmentDisplay}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="block max-w-[5rem] truncate sm:max-w-none">
                          {branchDisplay}
                        </span>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-gray-600 sm:table-cell">
                        <span className="md:hidden">{requestedAt.short}</span>
                        <span className="hidden md:inline">{requestedAt.full}</span>
                      </TableCell>
                      <TableCell className={signatureActionsCellClass()}>
                        <SignatureResetRowActions
                          onApprove={() => openApproveModal(request)}
                          onReject={() => openRejectModal(request)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* Pagination */}
          {!refresh && !isPageLoading && totalPages > 1 && (
            <div className="mt-4">
              <EvaluationsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={totalItems}
                perPage={perPage}
                onPageChange={(page) => {
                  setCurrentPage(page);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Confirmation Modal */}
      <Dialog
        open={isApproveModalOpen}
        onOpenChangeAction={setIsApproveModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Signature Reset Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve the signature reset request for{" "}
              <strong>
                {selectedRequest
                  ? getRequestUserLabel(
                      selectedRequest as unknown as Record<string, unknown>
                    )
                  : "this user"}
              </strong>
              ? This will allow them to clear their signature.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveModalOpen(false)}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsApproving(true);

                try {
                  await handleApprove();
                } finally {
                  setIsApproving(false);
                }
              }}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700 cursor-pointer flex items-center gap-2 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 font-medium"
            >
              {isApproving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isApproving ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Modal */}
      <Dialog
        open={isRejectModalOpen}
        onOpenChangeAction={setIsRejectModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Signature Reset Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject the signature reset request for{" "}
              <strong>
                {selectedRequest
                  ? getRequestUserLabel(
                      selectedRequest as unknown as Record<string, unknown>
                    )
                  : "this user"}
              </strong>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectModalOpen(false)}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsRejecting(true);

                try {
                  await handleReject();
                } finally {
                  setIsRejecting(false);
                }
              }}
              disabled={isRejecting}
              variant="destructive"
              className="cursor-pointer flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 font-medium"
            >
              {isRejecting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              {isRejecting ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
