"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Lightbulb, Pencil, Plus, Trash2, X } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { toastMessages } from "@/lib/toastMessages";
import apiService from "@/lib/apiService";
import AddPositionModal from "@/components/hr/AddPositionModal";
import DeletePositionModal, { Position } from "@/components/hr/DeletePositionModal";
import UpdatePositionModal from "@/components/hr/UpdatePositionModal";
import EvaluationsPagination from "@/components/paginationComponent";
import { cn } from "@/lib/utils";

function isCreatedWithinLast24Hours(createdAt: string | null | undefined): boolean {
  if (createdAt == null || createdAt === "") return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return t >= Date.now() - 24 * 60 * 60 * 1000;
}

/** Splits the last 24h into three 8h bands from newest → oldest: green, blue, orange. */
type RecencyTier = "new" | "mid" | "late";

function getRecency24hTier(createdAt: string | null | undefined): RecencyTier | null {
  if (createdAt == null || createdAt === "") return null;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return null;
  const ageMs = Date.now() - created;
  const ageHours = ageMs / (60 * 60 * 1000);
  if (ageHours < 0) return "new";
  if (ageHours > 24) return null;
  if (ageHours < 8) return "new";
  if (ageHours < 16) return "mid";
  return "late";
}

const RECENCY_TIER_ROW_CLASS: Record<RecencyTier, string> = {
  new: "border-l-green-600 bg-green-50/90",
  mid: "border-l-blue-600 bg-blue-50/90",
  late: "border-l-orange-600 bg-orange-50/90",
};

export default function PositionsTab() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showRecent24h, setShowRecent24h] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [positionToEdit, setPositionToEdit] = useState<Position | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const positionsInFlightPromiseRef = useRef<Promise<void> | null>(null);
  const hasLoadedPositionsOnceRef = useRef(false);
  const prevFilterSnapshotForPageRef = useRef<string | null>(null);

  const loadPositions = async () => {
    if (positionsInFlightPromiseRef.current) {
      await positionsInFlightPromiseRef.current;
      return;
    }

    const requestPromise = (async () => {
      const showInitialSkeleton = !hasLoadedPositionsOnceRef.current;
      if (showInitialSkeleton) {
        setLoading(true);
      }
      try {
        const res = await apiService.getPositions();
        const list = Array.isArray(res) ? res : [];
        const normalized: Position[] = list.map((p: any) => ({
          id: Number(p.value),
          label: String(p.label ?? ""),
          createdAt: p.created_at != null ? String(p.created_at) : null,
          updatedAt: p.updated_at != null ? String(p.updated_at) : null,
        }));
        setPositions(normalized);
      } catch (error) {
        console.error("Error loading positions:", error);
        setPositions([]);
      } finally {
        if (showInitialSkeleton) {
          setLoading(false);
        }
        hasLoadedPositionsOnceRef.current = true;
        positionsInFlightPromiseRef.current = null;
      }
    })();

    positionsInFlightPromiseRef.current = requestPromise;
    await requestPromise;
  };

  const refreshPositions = async () => {
    setIsRefreshing(true);
    try {
      await loadPositions();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadPositions();
  }, []);

  const filteredPositions = useMemo(() => {
    let list = positions;
    if (showRecent24h) {
      list = list.filter((p) => isCreatedWithinLast24Hours(p.createdAt));
    }
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => p.label?.toLowerCase().includes(q) || String(p.id) === q);
    }
    if (showRecent24h) {
      list = [...list].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
    }
    return list;
  }, [positions, searchTerm, showRecent24h]);

  const total = filteredPositions.length;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filteredPositions.slice(startIndex, startIndex + itemsPerPage);

  const emptyStateMessage = useMemo(() => {
    if (filteredPositions.length > 0) {
      return "";
    }
    if (positions.length === 0) {
      return "No positions found.";
    }
    const q = searchTerm.trim();
    if (showRecent24h && q) {
      return "No positions match your search in the last 24 hours.";
    }
    if (showRecent24h && !q) {
      return "No positions were added in the last 24 hours.";
    }
    if (q) {
      return "No positions match your search.";
    }
    return "No positions found.";
  }, [
    filteredPositions.length,
    positions.length,
    searchTerm,
    showRecent24h,
  ]);

  useEffect(() => {
    const snapshot = JSON.stringify({ searchTerm, showRecent24h });
    if (
      prevFilterSnapshotForPageRef.current !== null &&
      prevFilterSnapshotForPageRef.current !== snapshot
    ) {
      setCurrentPage(1);
    }
    prevFilterSnapshotForPageRef.current = snapshot;
  }, [searchTerm, showRecent24h]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  if (loading) {
    return (
      <div className="relative overflow-y-auto pr-2 min-h-[400px]">
        <Card>
          <CardHeader>
            <CardTitle>Positions</CardTitle>
            <CardDescription>Loading positions...</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: itemsPerPage }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative overflow-y-auto pr-2 min-h-[400px]">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-4">
            <div className="w-1/2">
              <div className="flex items-center gap-2">
                <CardTitle>Positions</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-blue-300 bg-blue-100 text-blue-800 shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-200 hover:text-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      aria-label="Tips for using this list"
                    >
                      <Lightbulb className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    className="max-w-sm px-3 py-2.5 text-sm leading-snug text-balance"
                  >
                    <span className="font-semibold">Tip:</span> Use{" "}
                    <span className="font-medium">Last 24 hours</span> to show only
                    positions from the past day (newest first). Rows are tinted by age:
                    green (0–8h), blue (8–16h), orange (16–24h). In the full list, recent
                    rows use the same colors and a{" "}
                    <span className="font-medium">New</span> badge.
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>Manage job positions</CardDescription>
              <div className="relative flex-1 mt-4">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">🔎</span>
                <Input
                  placeholder="Search by position label"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${searchTerm ? "pr-10" : "pr-4"}`}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                    className="absolute inset-y-0 right-2 flex items-center justify-center text-red-400 hover:text-red-600  transition-colors"
                  >
                    <X className="h-7 w-7" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={showRecent24h ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowRecent24h((v) => !v)}
                  className={
                    showRecent24h
                      ? "bg-amber-600 text-white hover:bg-amber-700 border-amber-600 cursor-pointer hover:scale-110 transition-transform duration-200"
                      : "border-amber-200 text-amber-900 hover:bg-amber-50 cursor-pointer hover:scale-110 transition-transform duration-200"
                  }
                >
                  <Clock className="h-4 w-4" />
                  Last 24 hours
                </Button>
                {showRecent24h && (
                  <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                    <span>
                      Showing positions created in the last 24 hours (newest first).
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-900" />
                        0–8h
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                        8–16h
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-600" />
                        16–24h
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 cursor-pointer hover:scale-110 transition-transform duration-200"
              >
                <Plus className="h-5 w-5" />
                Add Position
              </Button>
              <Button
                variant="outline"
                onClick={refreshPositions}
                disabled={isRefreshing}
                className="flex items-center gap-2 bg-blue-600 text-white hover:text-white hover:bg-blue-700 cursor-pointer hover:scale-110 transition-transform duration-200"
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isRefreshing && (
            <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center pointer-events-none z-10">
              <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {paginated.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                {filteredPositions.length === 0
                  ? emptyStateMessage
                  : null}
              </div>
            ) : (
              paginated.map((p) => {
                const tier = getRecency24hTier(p.createdAt);
                return (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3",
                    tier && ["border-l-4 pl-3", RECENCY_TIER_ROW_CLASS[tier]]
                  )}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{p.label || "N/A"}</span>
                      {!showRecent24h && isCreatedWithinLast24Hours(p.createdAt) && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          New
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">ID: {p.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setPositionToEdit(p);
                        setIsUpdateModalOpen(true);
                      }}
                      className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white cursor-pointer hover:scale-110 transition-transform duration-200"
                      disabled={isDeleting || isUpdating}
                    >
                      <Pencil className="h-4 w-4" />
                      Update
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setPositionToDelete(p);
                        setIsDeleteModalOpen(true);
                      }}
                      className="flex items-center gap-2 cursor-pointer hover:scale-110 transition-transform duration-200"
                      disabled={isDeleting || isUpdating}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
              })
            )}
          </div>

          {totalPages > 1 && (
            <EvaluationsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              perPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
            />
          )}
        </CardContent>
      </Card>

      <AddPositionModal
        open={isAddModalOpen}
        onOpenChangeAction={setIsAddModalOpen}
        onAdded={refreshPositions}
      />

      <DeletePositionModal
        open={isDeleteModalOpen}
        onOpenChangeAction={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) setPositionToDelete(null);
        }}
        positionToDelete={positionToDelete}
        onDeleted={async () => {
          setPositionToDelete(null);
          await refreshPositions();
        }}
        onDeletingChange={setIsDeleting}
      />

      <UpdatePositionModal
        open={isUpdateModalOpen}
        onOpenChangeAction={(open) => {
          setIsUpdateModalOpen(open);
          if (!open) setPositionToEdit(null);
        }}
        positionToEdit={positionToEdit}
        onUpdated={refreshPositions}
        onUpdatingChange={setIsUpdating}
      />
    </div>
  );
}

