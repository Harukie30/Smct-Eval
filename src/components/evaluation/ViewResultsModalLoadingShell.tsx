"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import SmctLoadingOverlay from "@/components/SmctLoadingOverlay";

type ViewResultsModalLoadingShellProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  label?: string;
};

/** Full-screen-style dialog shown while evaluation view data is loading. */
export default function ViewResultsModalLoadingShell({
  isOpen,
  onCloseAction,
  label = "Loading evaluation results...",
}: ViewResultsModalLoadingShellProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChangeAction={(open) => {
        if (!open) onCloseAction();
      }}
    >
      <DialogContent className="relative min-h-[14rem] overflow-hidden border-0 p-0 sm:max-w-md">
        <SmctLoadingOverlay label={label} />
      </DialogContent>
    </Dialog>
  );
}
