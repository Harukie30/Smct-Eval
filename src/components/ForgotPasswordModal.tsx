"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/UserContext";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";
import { apiService } from "@/lib/apiService";
import {
  getDashboardPath,
  getDashboardPathFromAuthPayload,
  resolveAuthRole,
} from "@/lib/dashboardUtils";
import { toastMessages } from "@/lib/toastMessages";
import { cn } from "@/lib/utils";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  /** Pre-fill from the login field when available. */
  initialEmail?: string;
  /**
   * Called after OTP verify + session login succeed.
   * Parent (login page) should redirect to the role dashboard.
   */
  onSuccessAction?: (payload: {
    email: string;
    role: string | null;
    result: unknown;
  }) => void | Promise<void>;
}

type ForgotPasswordStep = "email" | "otp";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  const error = err as {
    response?: {
      data?: { message?: string; errors?: Record<string, string[]> };
    };
    message?: string;
  };
  const validation =
    error.response?.data?.errors &&
    Object.values(error.response.data.errors).flat().join(" ");
  return (
    error.response?.data?.message ||
    validation ||
    error.message ||
    fallback
  );
}

const STEP_LABELS: Record<ForgotPasswordStep, string> = {
  email: "Email",
  otp: "Verify & sign in",
};

export default function ForgotPasswordModal({
  isOpen,
  onCloseAction,
  initialEmail = "",
  onSuccessAction,
}: ForgotPasswordModalProps) {
  const router = useRouter();
  const { loginWithPasswordResetOtp } = useAuth();
  const dialogAnimationClass = useDialogAnimation({ duration: 0.35 });
  const [step, setStep] = useState<ForgotPasswordStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successEmail, setSuccessEmail] = useState("");
  const submittingRef = useRef(false);
  const pendingSuccessRef = useRef<{
    email: string;
    role: string | null;
    result: unknown;
    dashboardPath: string | null;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep("email");
    setEmail(initialEmail.trim());
    setOtp("");
    setSubmitting(false);
    submittingRef.current = false;
    setShowSuccessDialog(false);
    setSuccessEmail("");
    pendingSuccessRef.current = null;
    setResendCooldown(0);
  }, [isOpen, initialEmail]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!showSuccessDialog) return;

    const styleId = "forgot-password-success-animations";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes forgotSuccessScale {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes forgotDrawCheckmark {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes forgotSuccessRipple {
          0% { transform: scale(1); opacity: 0.45; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        .forgot-animate-success-scale {
          animation: forgotSuccessScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .forgot-animate-draw-checkmark {
          animation: forgotDrawCheckmark 0.5s ease-out 0.3s forwards;
        }
        .forgot-animate-success-ripple {
          animation: forgotSuccessRipple 1s ease-out 0.2s;
        }
      `;
      document.head.appendChild(style);
    }

    const timer = window.setTimeout(() => {
      const pending = pendingSuccessRef.current;
      setShowSuccessDialog(false);
      if (!pending) return;

      void (async () => {
        if (onSuccessAction) {
          await onSuccessAction({
            email: pending.email,
            role: pending.role,
            result: pending.result,
          });
          return;
        }

        if (pending.dashboardPath) {
          router.push(pending.dashboardPath);
        } else {
          toastMessages.generic.info(
            "Signed in",
            "Your account was verified. Redirecting to your dashboard."
          );
          router.push("/");
        }
      })();
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [showSuccessDialog, onSuccessAction, router]);

  const handleClose = () => {
    onCloseAction();
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toastMessages.form.validationError();
      return;
    }
    if (!isValidEmail(trimmed)) {
      toastMessages.generic.error(
        "Invalid email",
        "Enter a valid email address where we can send your verification code."
      );
      return;
    }

    setSubmitting(true);
    try {
      await apiService.sendPasswordResetOtp(trimmed);
      setStep("otp");
      setOtp("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toastMessages.generic.success(
        "Verification code sent",
        `Enter the ${OTP_LENGTH}-digit code sent to ${trimmed}.`
      );
    } catch (err: unknown) {
      toastMessages.generic.error(
        "Could not send code",
        getApiErrorMessage(err, "Please try again in a moment.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || submitting) return;
    const trimmed = email.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await apiService.sendPasswordResetOtp(trimmed);
      setOtp("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toastMessages.generic.success(
        "Code resent",
        `A new verification code was sent to ${trimmed}.`
      );
    } catch (err: unknown) {
      toastMessages.generic.error(
        "Could not resend code",
        getApiErrorMessage(err, "Please try again in a moment.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtpAndLogin = useCallback(
    async (code?: string, e?: React.FormEvent) => {
      e?.preventDefault();
      if (submittingRef.current) return;

      const trimmed = email.trim();
      const otpValue = (code ?? otp).trim();
      if (otpValue.length !== OTP_LENGTH) {
        toastMessages.generic.error(
          "Incomplete code",
          `Enter the full ${OTP_LENGTH}-digit verification code.`
        );
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      try {
        const result = await loginWithPasswordResetOtp(trimmed, otpValue);

        if (result?.error) {
          toastMessages.generic.error("Verification failed", result.error);
          return;
        }

        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith("welcomeModal_")) {
            sessionStorage.removeItem(key);
          }
        });

        const role = resolveAuthRole(result);
        const dashboardPath =
          getDashboardPathFromAuthPayload(result) || getDashboardPath(role);

        pendingSuccessRef.current = {
          email: trimmed,
          role,
          result,
          dashboardPath,
        };
        setSuccessEmail(trimmed);
        onCloseAction();
        setShowSuccessDialog(true);
      } catch (err: unknown) {
        toastMessages.generic.error(
          "Verification failed",
          getApiErrorMessage(
            err,
            "The code is invalid or has expired. Please try again."
          )
        );
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [email, otp, loginWithPasswordResetOtp, onCloseAction, onSuccessAction, router]
  );

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === OTP_LENGTH && !submittingRef.current) {
      void handleVerifyOtpAndLogin(value);
    }
  };

  const isVerifyingOtp = step === "otp" && submitting;

  const headerTitle =
    step === "otp" ? "Verify your email" : "Reset your password";

  const headerDescription =
    step === "otp"
      ? `Enter the ${OTP_LENGTH}-digit code. Once it is correct, you will be signed in automatically.`
      : "Enter the email linked to your account. We will send a verification code first.";

  const progressSteps: ForgotPasswordStep[] = ["email", "otp"];

  return (
    <>
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
                <KeyRound className="h-6 w-6 text-white sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100/95">
                  Account recovery
                </p>
                <DialogTitle className="mt-1 text-xl font-bold leading-tight text-white sm:text-2xl">
                  {headerTitle}
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-relaxed text-blue-50/95">
                  {headerDescription}
                </DialogDescription>
              </div>
            </div>

            <ol className="relative flex items-center justify-between gap-2 px-1">
              {progressSteps.map((progressStep, index) => {
                const currentIndex = progressSteps.indexOf(step);
                const isComplete = index < currentIndex;
                const isActive = progressStep === step;

                return (
                  <li
                    key={progressStep}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ring-2 transition-colors",
                        isComplete || isActive
                          ? "bg-white text-indigo-700 ring-white/80"
                          : "bg-white/15 text-blue-100 ring-white/25"
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-center text-[10px] font-medium uppercase tracking-wide",
                        isActive ? "text-white" : "text-blue-100/80"
                      )}
                    >
                      {STEP_LABELS[progressStep]}
                    </span>
                  </li>
                );
              })}
            </ol>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50/95 to-white px-5 py-5 sm:px-6 sm:py-6">
          {step === "email" ? (
            <form
              id="forgot-password-email-form"
              onSubmit={handleSendOtp}
              className="space-y-5"
            >
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-950/[0.03] sm:p-5">
                <Label
                  htmlFor="forgot-password-email"
                  className="text-sm font-semibold text-slate-900"
                >
                  Email address
                </Label>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  We will send a one-time verification code to this email. After
                  you verify it, you will be signed in automatically.
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
          ) : (
            <form
              id="forgot-password-otp-form"
              onSubmit={(e) => handleVerifyOtpAndLogin(undefined, e)}
              className="space-y-5"
            >
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-950/[0.03] sm:p-5">
                <Label className="text-sm font-semibold text-slate-900">
                  Verification code
                </Label>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Code sent to{" "}
                  <span className="font-medium text-slate-700">{email.trim()}</span>
                  . Signing in starts automatically when the code is complete.
                </p>
                <div className="mt-4 flex justify-center">
                  <InputOTP
                    maxLength={OTP_LENGTH}
                    value={otp}
                    onChange={handleOtpChange}
                    onComplete={(value) => {
                      void handleVerifyOtpAndLogin(value);
                    }}
                    disabled={submitting}
                    autoFocus
                  >
                    <InputOTPGroup>
                      {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} className="h-11 w-10" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={submitting || resendCooldown > 0}
                    className={cn(
                      "text-sm font-medium",
                      resendCooldown > 0
                        ? "cursor-not-allowed text-slate-400"
                        : "cursor-pointer text-indigo-600 hover:text-indigo-700 hover:underline"
                    )}
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Resend code"}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                }}
                disabled={submitting}
                className="mx-auto flex cursor-pointer items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Change email
              </button>
            </form>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-slate-200/90 bg-slate-50/95 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          {step === "email" ? (
            <Button
              type="submit"
              form="forgot-password-email-form"
              disabled={submitting || !email.trim()}
              className="h-10 w-full cursor-pointer bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 sm:w-auto sm:min-w-[150px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send verification code"
              )}
            </Button>
          ) : (
            <Button
              type="submit"
              form="forgot-password-otp-form"
              disabled={submitting || otp.length !== OTP_LENGTH}
              className="h-10 w-full cursor-pointer bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 sm:w-auto sm:min-w-[170px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Verify & sign in"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <Dialog open={isVerifyingOtp} onOpenChangeAction={() => {}}>
        <DialogContent
          portalClassName="z-[100]"
          className="max-w-[min(100%,20rem)] overflow-hidden border-indigo-200/70 p-0 shadow-2xl shadow-indigo-950/20 sm:max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-6 py-8 sm:px-8 sm:py-10">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-200/40 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-blue-200/40 blur-2xl"
              aria-hidden
            />
            <div
              className="relative flex flex-col items-center justify-center space-y-4 text-center"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src="/smct.png"
                    alt=""
                    className="h-8 w-8 object-contain"
                    width={32}
                    height={32}
                    decoding="async"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold text-slate-800 sm:text-lg">
                  Confirming OTP…
                </p>
                <p className="text-sm leading-relaxed text-slate-500">
                  Please wait while we verify your code and sign you in.
                </p>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChangeAction={() => {}}>
        <DialogContent
          portalClassName="z-[110]"
          className="max-w-[min(100%,22rem)] overflow-hidden border-green-200/80 p-0 shadow-2xl shadow-green-950/10 sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative overflow-hidden bg-gradient-to-b from-green-50/90 to-white px-6 py-8 sm:px-8 sm:py-10">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-green-200/50 blur-2xl"
              aria-hidden
            />
            <div className="relative flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="forgot-animate-success-scale flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <svg
                    className="h-12 w-12 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                      strokeDasharray="20"
                      strokeDashoffset="20"
                      className="forgot-animate-draw-checkmark"
                    />
                  </svg>
                </div>
                <div className="forgot-animate-success-ripple absolute inset-0 rounded-full bg-green-200 opacity-0" />
              </div>

              <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Login Successful!
                </DialogTitle>
                <DialogDescription className="text-base text-gray-600">
                  Welcome back
                  {successEmail ? (
                    <>
                      ,{" "}
                      <span className="font-semibold text-gray-800">
                        {successEmail}
                      </span>
                    </>
                  ) : null}
                  . Redirecting you to your dashboard…
                </DialogDescription>
                <p className="pt-1 text-sm text-gray-500">
                  Closing automatically...
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
