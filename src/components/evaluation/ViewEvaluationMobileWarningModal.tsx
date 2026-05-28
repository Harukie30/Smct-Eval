"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";

type ViewEvaluationMobileWarningModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  onViewAnywayAction: () => void;
};

export default function ViewEvaluationMobileWarningModal({
  isOpen,
  onCloseAction,
  onViewAnywayAction,
}: ViewEvaluationMobileWarningModalProps) {
  const dialogAnimationClass = useDialogAnimation({ duration: 0.35 });

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent
        className={`w-[min(92vw,24rem)] max-w-md p-0 overflow-hidden ${dialogAnimationClass}`}
      >
        <DialogHeader className="space-y-3 border-b border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50/60 px-4 py-4 text-center sm:px-6 sm:py-5">
          <img
            src="/warning.gif"
            alt=""
            width={160}
            height={120}
            className="mx-auto h-auto w-28 max-w-[70%] object-contain sm:w-36"
            decoding="async"
          />
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-base font-semibold leading-snug text-gray-900 sm:text-lg">
              Mobile view not supported
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-600">
              You are currently on a mobile or small-screen device. Evaluation
              details are best viewed in desktop mode.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-3 px-4 py-4 text-sm leading-relaxed text-gray-700 sm:px-6">
          <p>
            Please switch to <span className="font-medium">desktop mode</span> in
            your browser, or open this page on a computer or tablet in landscape
            with a wider screen.
          </p>
          <p className="text-xs text-gray-500">
            This helps ensure tables, signatures, and print layouts display
            correctly.
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/90 px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer sm:w-auto"
            onClick={onCloseAction}
          >
            OK, got it
          </Button>
          <Button
            type="button"
            className="w-full cursor-pointer bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
            onClick={onViewAnywayAction}
          >
            View anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
