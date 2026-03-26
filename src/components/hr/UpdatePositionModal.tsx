"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Pencil } from "lucide-react";
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
import type { Position } from "@/components/hr/DeletePositionModal";

export interface UpdatePositionModalProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  positionToEdit: Position | null;
  onUpdated?: () => void | Promise<void>;
  onUpdatingChange?: (isUpdating: boolean) => void;
}

export default function UpdatePositionModal({
  open,
  onOpenChangeAction,
  positionToEdit,
  onUpdated,
  onUpdatingChange,
}: UpdatePositionModalProps) {
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successLabel, setSuccessLabel] = useState("");
  const [shouldRefreshAfterSuccess, setShouldRefreshAfterSuccess] = useState(false);
  const [isNameTakenDialogOpen, setIsNameTakenDialogOpen] = useState(false);
  const [nameTakenMessage, setNameTakenMessage] = useState("");

  useEffect(() => {
    if (open && positionToEdit) {
      setLabel(positionToEdit.label ?? "");
      setIsSuccessDialogOpen(false);
      setShouldRefreshAfterSuccess(false);
    }
    if (!open) {
      setLabel("");
      setIsSubmitting(false);
      onUpdatingChange?.(false);
    }
  }, [open, positionToEdit, onUpdatingChange]);

  useEffect(() => {
    if (!isSuccessDialogOpen && shouldRefreshAfterSuccess) {
      setShouldRefreshAfterSuccess(false);
      void (async () => {
        try {
          await onUpdated?.();
        } catch (e) {
          console.error("Failed to refresh positions after update:", e);
        }
      })();
    }
  }, [isSuccessDialogOpen, shouldRefreshAfterSuccess, onUpdated]);

  useEffect(() => {
    if (!isSuccessDialogOpen) return;
    const id = window.setTimeout(() => {
      setIsSuccessDialogOpen(false);
    }, 3000);
    return () => window.clearTimeout(id);
  }, [isSuccessDialogOpen]);

  const handleUpdate = async () => {
    if (!positionToEdit) return;
    const trimmed = label.trim();
    if (!trimmed) {
      toastMessages.generic.error("Error", "Position label is required.");
      return;
    }

    setIsSubmitting(true);
    onUpdatingChange?.(true);
    try {
      await apiService.updatePosition(positionToEdit.id, trimmed);
      // Keep the user experience consistent: show "Saving" for a minimum time.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toastMessages.generic.success(
        "Position Updated",
        `"${trimmed}" has been updated.`
      );
      setSuccessLabel(trimmed);
      setShouldRefreshAfterSuccess(true);
      setIsSuccessDialogOpen(true);
      onOpenChangeAction(false);
    } catch (error: any) {
      const backendMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update position.";

      const msg = String(backendMsg ?? "");
      const looksLikeDuplicate =
        /already\s+exists|already\s+taken|duplicate|name\s+exists|taken|exists/i.test(msg) ||
        /409/i.test(String(error?.response?.status ?? ""));

      if (looksLikeDuplicate) {
        setNameTakenMessage(
          msg || "This position name is already taken. Please choose a different name."
        );
        setIsNameTakenDialogOpen(true);
        return;
      }

      toastMessages.generic.error("Error", msg || "Failed to update position.");
    } finally {
      setIsSubmitting(false);
      onUpdatingChange?.(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChangeAction={onOpenChangeAction}>
        <DialogContent className="max-w-md w-[90vw] sm:w-full px-6 py-6">
          <DialogHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                <Pencil className="h-5 w-5" aria-hidden />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Update Position
                </DialogTitle>
                <DialogDescription className="text-gray-700">
                  Update the position label and save your changes.
                </DialogDescription>
                {positionToEdit?.label && (
                  <p className="mt-2 text-xs text-gray-500">
                    Current:{" "}
                    <span className="font-medium text-gray-700">
                      {positionToEdit.label}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2">
            <label
              htmlFor="position_update_label"
              className="text-sm font-medium text-gray-700"
            >
              Position label <span className="text-red-600">*</span>
            </label>
            <Input
              id="position_update_label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Branch Manager"
              autoFocus
              autoComplete="off"
            />
          </div>

          <DialogFooter className="border-t border-gray-200 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChangeAction(false)}
              disabled={isSubmitting}
              className="px-6 border-amber-200 text-gray-700 hover:bg-amber-50 hover:text-amber-900"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isSubmitting || !positionToEdit}
              className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer px-6 hover:scale-110 transition-transform duration-200"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingAnimation
                    size="sm"
                    variant="spinner"
                    color="white"
                    showText={false}
                  />
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success animation dialog (same style as other confirmations) */}
      <Dialog
        open={isSuccessDialogOpen}
        onOpenChangeAction={setIsSuccessDialogOpen}
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
              Position Updated
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              <span className="font-semibold text-green-700">
                {successLabel}
              </span>{" "}
              has been updated.
            </DialogDescription>
            <p className="mt-2 text-xs text-gray-500">
              This will close automatically.
            </p>
          </DialogHeader>

          <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-center">
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Name-taken error dialog */}
      <Dialog
        open={isNameTakenDialogOpen}
        onOpenChangeAction={(open) => {
          setIsNameTakenDialogOpen(open);
          if (!open) setNameTakenMessage("");
        }}
      >
        <DialogContent className="max-w-sm w-[90vw] px-6 py-5">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <img
                src="/oops.gif"
                alt="Error animation"
                className="w-24 h-auto object-contain"
              />
            </div>
            <DialogTitle className="text-lg font-bold text-red-600">
              Can't update position
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              {nameTakenMessage ||
                "This position name is already taken. Please choose a different name."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="border-t border-gray-200 pt-4">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer px-6 hover:scale-110 transition-all duration-200"
              onClick={() => setIsNameTakenDialogOpen(false)}
              disabled={isSubmitting}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

