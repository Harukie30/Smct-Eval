"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastMessages } from "@/lib/toastMessages";
import apiService from "@/lib/apiService";
import LoadingAnimation from "@/components/LoadingAnimation";

export type Position = {
  id: number;
  label: string;
  /** ISO timestamp from API `created_at`, if present */
  createdAt?: string | null;
  /** ISO timestamp from API `updated_at`, if present */
  updatedAt?: string | null;
};

export interface DeletePositionModalProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  positionToDelete: Position | null;
  onDeleted?: () => void | Promise<void>;
  /** Keeps the "Delete" button state in the table in sync. */
  onDeletingChange?: (isDeleting: boolean) => void;
}

export default function DeletePositionModal({
  open,
  onOpenChangeAction,
  positionToDelete,
  onDeleted,
  onDeletingChange,
}: DeletePositionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [deletedLabel, setDeletedLabel] = useState("");
  const [shouldRefreshAfterSuccess, setShouldRefreshAfterSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsDeleting(false);
      onDeletingChange?.(false);
    }
  }, [open, onDeletingChange]);

  useEffect(() => {
    if (open) {
      setIsSuccessDialogOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!isSuccessDialogOpen && shouldRefreshAfterSuccess) {
      setShouldRefreshAfterSuccess(false);
      void (async () => {
        try {
          await onDeleted?.();
        } catch (e) {
          console.error("Failed to refresh positions after delete:", e);
        }
      })();
    }
  }, [isSuccessDialogOpen, shouldRefreshAfterSuccess, onDeleted]);

  useEffect(() => {
    if (!isSuccessDialogOpen) return;
    const id = window.setTimeout(() => {
      setIsSuccessDialogOpen(false);
    }, 3000);
    return () => window.clearTimeout(id);
  }, [isSuccessDialogOpen]);

  const handleDelete = async () => {
    if (!positionToDelete) return;

    setIsDeleting(true);
    onDeletingChange?.(true);
    try {
      await apiService.deletePosition(positionToDelete.id);
      const label = positionToDelete.label;
      toastMessages.generic.success(
        "Position Deleted",
        `"${label}" has been deleted.`
      );
      setDeletedLabel(label);
      setIsSuccessDialogOpen(true);
      setShouldRefreshAfterSuccess(true);
      onOpenChangeAction(false);
    } catch (error: any) {
      const backendMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete position.";
      toastMessages.generic.error("Error", backendMsg);
    } finally {
      setIsDeleting(false);
      onDeletingChange?.(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChangeAction={onOpenChangeAction}>
        <DialogContent className="max-w-md w-[90vw] sm:w-full">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-50 text-red-700 border border-red-100">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Delete Position
                </DialogTitle>
                <DialogDescription className="text-gray-700">
                  {positionToDelete ? (
                    <>
                      This will permanently remove{" "}
                      <span className="font-semibold text-red-700">
                        {positionToDelete.label}
                      </span>{" "}
                      (ID: <span className="font-mono text-xs">{positionToDelete.id}</span>).
                      <span className="block mt-2 text-xs text-gray-500">
                        You cannot undo this action.
                      </span>
                    </>
                  ) : (
                    <>Are you sure you want to delete this position?</>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChangeAction(false)}
              disabled={isDeleting}
              className="px-6 border-gray-200 text-gray-700 bg-blue-500 hover:bg-blue-600 text-white hover:text-white cursor-pointer hover:scale-110 transition-transform duration-200"
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer px-6 hover:scale-110 transition-transform duration-200"
              onClick={handleDelete}
              disabled={isDeleting || !positionToDelete}
            >
              {isDeleting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingAnimation size="sm" variant="spinner" color="white" />
                  Deleting...
                </span>
              ) : (
                "Delete"
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
              Position Deleted
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              <span className="font-semibold text-green-700">{deletedLabel}</span> has been
              removed from the HR Positions list.
            </DialogDescription>
            <p className="text-xs text-gray-500 mt-2">
              This dialog will close automatically in 3 seconds.
            </p>
          </DialogHeader>

          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer px-6 hover:scale-110 transition-all duration-200"
              onClick={() => setIsSuccessDialogOpen(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
