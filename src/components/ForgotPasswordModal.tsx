"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";
import { apiService } from "@/lib/apiService";
import { toastMessages } from "@/lib/toastMessages";
import { cn } from "@/lib/utils";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  /** Pre-fill from the login field when available. */
  initialEmail?: string;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ForgotPasswordModal({
  isOpen,
  onCloseAction,
  initialEmail = "",
}: ForgotPasswordModalProps) {
  const dialogAnimationClass = useDialogAnimation({ duration: 0.35 });
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(initialEmail.trim());
    setSent(false);
    setSubmitting(false);
  }, [isOpen, initialEmail]);

  const handleClose = () => {
    onCloseAction();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toastMessages.form.validationError();
      return;
    }
    if (!isValidEmail(trimmed)) {
      toastMessages.generic.error(
        "Invalid email",
        "Enter a valid email address where we can send reset instructions."
      );
      return;
    }

    setSubmitting(true);
    try {
      await apiService.requestPasswordReset(trimmed);
      setSent(true);
      toastMessages.generic.success(
        "Reset email sent",
        `If an account exists for ${trimmed}, password reset instructions are on the way.`
      );
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: { message?: string; errors?: Record<string, string[]> };
        };
        message?: string;
      };
      const validation =
        error.response?.data?.errors &&
        Object.values(error.response.data.errors).flat().join(" ");
      const msg =
        error.response?.data?.message ||
        validation ||
        error.message ||
        "Could not send the reset email. Please try again.";
      toastMessages.generic.error("Request failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChangeAction={(open) => {
        if (!open && !submitting) handleClose();
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[min(92dvh,640px)] w-[min(100%,calc(100vw-1.5rem))] max-w-md flex-col gap-0 overflow-hidden border-indigo-200/60 p-0 shadow-2xl shadow-indigo-950/10",
          dialogAnimationClass
        )}
      >
        <div
          className="relative shrink-0 overflow-hidden px-5 pb-5 pt-6 text-white sm:px-6 sm:pb-6 sm:pt-7"
          style={{
            backgroundImage: "url(/smct.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/95 via-indigo-600/92 to-blue-800/95" />
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <DialogHeader className="relative space-y-0 text-left">
            <div className="mb-4 flex items-start gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-lg ring-1 ring-white/30 backdrop-blur-sm sm:h-14 sm:w-14">
                {sent ? (
                  <CheckCircle2 className="h-6 w-6 text-white sm:h-7 sm:w-7" />
                ) : (
                  <KeyRound className="h-6 w-6 text-white sm:h-7 sm:w-7" />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100/95">
                  Account recovery
                </p>
                <DialogTitle className="mt-1 text-xl font-bold leading-tight text-white sm:text-2xl">
                  {sent ? "Check your email" : "Reset your password"}
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-relaxed text-blue-50/95">
                  {sent
                    ? "We sent password reset instructions to the email below."
                    : "Enter the email linked to your account and we will send reset instructions there."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50/95 to-white px-5 py-5 sm:px-6 sm:py-6">
          {sent ? (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-2xl border border-emerald-200/90 bg-white shadow-sm ring-1 ring-emerald-100/60">
                <div className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50 to-green-50/80 px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80">
                      <Mail className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">
                        Reset link sent to
                      </p>
                      <p className="mt-0.5 break-all text-sm font-semibold text-emerald-950">
                        {email.trim()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 px-4 py-4 text-sm text-slate-600 sm:px-5">
                  <p className="leading-relaxed">
                    Open the email and follow the link to choose a new password.
                    If you do not see it within a few minutes, check your spam or
                    junk folder.
                  </p>
                  <ul className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-xs leading-relaxed text-slate-600">
                    <li className="flex items-start gap-2">
                      <ShieldCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500"
                        aria-hidden
                      />
                      <span>Reset links expire after a short time for security.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ShieldCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500"
                        aria-hidden
                      />
                      <span>
                        Did not request this? You can ignore the email safely.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <form id="forgot-password-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-950/[0.03] sm:p-5">
                <Label
                  htmlFor="forgot-password-email"
                  className="text-sm font-semibold text-slate-900"
                >
                  Email address
                </Label>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Use the same email you registered with. The reset link will be
                  sent to this address.
                </p>
                <div className="relative mt-3">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <Input
                    id="forgot-password-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                    className="h-11 border-slate-200 bg-white pl-10 shadow-sm focus-visible:ring-indigo-400/30"
                  />
                </div>
              </div>

              <p className="text-center text-sm text-slate-500">
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex cursor-pointer items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Back to login
                </button>
              </p>
            </form>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-slate-200/90 bg-slate-50/95 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          {sent ? (
            <Button
              type="button"
              className="h-10 w-full cursor-pointer bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 sm:w-auto sm:min-w-[140px]"
              onClick={handleClose}
            >
              Back to login
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                className="h-10 w-full cursor-pointer border-slate-200 bg-white sm:w-auto"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="forgot-password-form"
                disabled={submitting || !email.trim()}
                className="h-10 w-full cursor-pointer bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 sm:w-auto sm:min-w-[150px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
