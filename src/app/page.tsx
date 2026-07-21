"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import RealLoadingScreen from "@/components/RealLoadingScreen";
import InstantLoadingScreen from "@/components/InstantLoadingScreen";
import GoogleLoginModal from "@/components/GoogleLoginModal";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { toastMessages } from "@/lib/toastMessages";
import { getDashboardPath, getDashboardPathFromAuthPayload } from "@/lib/dashboardUtils";
import { apiService } from "@/lib/apiService";
// Removed clientDataService import - forceRefreshAccounts is no longer needed with pure API approach
import ContactDevsModal from "@/components/ContactDevsModal";
import { HowItWorksModal } from "@/components/HowItWorksModal";
import { LoginRegistrationGuideModal } from "@/components/LoginRegistrationGuideModal";
import { api } from "@/lib/api";
import { withPublicPage } from "@/hoc";
import { CONFIG } from "../../config/config";

function LandingLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [showGoogleLoginModal, setShowGoogleLoginModal] = useState(false);
  const [showIncorrectPasswordDialog, setShowIncorrectPasswordDialog] =
    useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showContactDevsModal, setShowContactDevsModal] = useState(false);
  const [showRegistrationHelpModal, setShowRegistrationHelpModal] =
    useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showLoginGuideModal, setShowLoginGuideModal] = useState(false);
  const [showLoginGuideModalFromLink, setShowLoginGuideModalFromLink] = useState(false);
  const [showServerErrorDialog, setShowServerErrorDialog] = useState(false);
  const [serverErrorTitle, setServerErrorTitle] = useState("Something went wrong");
  const [serverErrorDescription, setServerErrorDescription] = useState(
    "We couldn't complete your request. Please try again later."
  );

  const { login, isLoading, user } = useUser();
  const router = useRouter();
  // Removed forceRefreshAccounts - no longer needed with pure API approach

  useEffect(() => {
    if (isAboutModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isAboutModalOpen]);

  // Check server availability when page is ready (after initial auth check)
  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;
    api.get("/profile").catch((err: any) => {
      if (cancelled) return;
      const isServerUnreachable =
        err?.code === "ERR_NETWORK" ||
        err?.message === "Network Error" ||
        !err?.response;
      if (isServerUnreachable) {
        setServerErrorTitle("Server not found");
        setServerErrorDescription(
          "We couldn't reach the server. Please check your connection and try again."
        );
        setShowServerErrorDialog(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading]);

  // Remove automatic redirect - let users stay on login page even if authenticated
  // This allows users to see the login form and choose to log in again or navigate elsewhere

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoginError("");
    setShowLoadingScreen(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const result = await login(username, password);

      if (result?.error) {
        setLoginError(result.error);
        toastMessages.login.error(result.error);
        setShowLoadingScreen(false);
        if (result?.isServerUnreachable) {
          setServerErrorTitle("Server not found");
          setServerErrorDescription(
            "We couldn't reach the server. Please check your connection and try again."
          );
        } else {
          setServerErrorTitle("Something went wrong");
          setServerErrorDescription(
            result.error || "We couldn't complete your request. Please try again later."
          );
        }
        setShowServerErrorDialog(true);
        return;
      }

      if (result) {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith("welcomeModal_")) {
            sessionStorage.removeItem(key);
          }
        });

        let dashboardPath =
          getDashboardPathFromAuthPayload(result) ||
          getDashboardPath(result?.role) ||
          "";

        if (!dashboardPath) {
          try {
            const profileRes = await apiService.authUser();
            dashboardPath = getDashboardPathFromAuthPayload(profileRes) || "";
          } catch (profileError) {
            console.error("Login redirect profile lookup failed:", profileError);
          }
        }

        console.log("🚀 Redirecting to:", dashboardPath, { role: result?.role, result });
        toastMessages.login.success(username);
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (dashboardPath) {
          router.push(dashboardPath);
          return;
        }

        setShowLoadingScreen(false);
        toastMessages.generic.info(
          "Signed in",
          "We couldn't determine your dashboard role. Please refresh or contact support."
        );
      } else {
        setLoginError("Invalid Credentials");
        setShowLoadingScreen(false);
      }
    } catch (error: any) {
      console.log(error);
      setLoginError(error.message || "Something went wrong");
      toastMessages.login.error(error.message);
      setShowLoadingScreen(false);
      setServerErrorTitle("Something went wrong");
      setServerErrorDescription(
        error.message || "We couldn't complete your request. Please try again later."
      );
      setShowServerErrorDialog(true);
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <RealLoadingScreen
          message="Initializing System..."
          onComplete={() => setShowLoadingScreen(false)}
        />
      </PageTransition>
    );
  }

  // Remove automatic redirect screen - show login form even if authenticated

  // Show instant loading screen during login process
  if (showLoadingScreen) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 9999,
        }}
      >
        <InstantLoadingScreen
          message="Authenticating..."
          onComplete={() => setShowLoadingScreen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Main Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-blue-50 to-blue-600"></div>

      {/* Single Geometric Pattern Overlay - Gradient from left to right */}
      <div className="absolute inset-0">
        <svg
          className="w-full h-full"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Gradient mask for fading effect */}
            <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                style={{ stopColor: "rgba(255,255,255,0)", stopOpacity: 0 }}
              />
              <stop
                offset="30%"
                style={{ stopColor: "rgba(255,255,255,0)", stopOpacity: 0 }}
              />
              <stop
                offset="60%"
                style={{ stopColor: "rgba(255,255,255,0.3)", stopOpacity: 0.3 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: "rgba(255,255,255,1)", stopOpacity: 1 }}
              />
            </linearGradient>

            {/* Single hexagon pattern */}
            <pattern
              id="hexagons"
              x="0"
              y="0"
              width="100"
              height="87"
              patternUnits="userSpaceOnUse"
            >
              <polygon
                points="50,8 75,25 75,62 50,79 25,62 25,25"
                fill="rgba(59, 130, 246, 0.12)"
                stroke="rgba(59, 130, 246, 0.3)"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>

          {/* Apply single pattern with gradient mask */}
          <rect
            width="100%"
            height="100%"
            fill="url(#hexagons)"
            mask="url(#patternMask)"
          />

          {/* Create mask for gradient effect */}
          <mask id="patternMask">
            <rect width="100%" height="100%" fill="url(#fadeGradient)" />
          </mask>
        </svg>
      </div>

      {/* Single Geometric Elements - Hexagons only */}
      <div className="absolute top-20 right-20 hidden h-24 w-24 opacity-30 lg:block">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,10 80,30 80,70 50,90 20,70 20,30"
            fill="rgba(59, 130, 246, 0.2)"
            stroke="rgba(59, 130, 246, 0.4)"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="absolute bottom-32 right-40 hidden h-20 w-20 opacity-35 xl:block">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,5 85,25 85,75 50,95 15,75 15,25"
            fill="rgba(59, 130, 246, 0.15)"
            stroke="rgba(59, 130, 246, 0.3)"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="absolute top-40 left-20 w-16 h-16 opacity-5">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,15 75,35 75,65 50,85 25,65 25,35"
            fill="rgba(59, 130, 246, 0.08)"
            stroke="rgba(59, 130, 246, 0.15)"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {/* Right side additional hexagons */}
      <div className="absolute top-1/2 right-10 w-12 h-12 opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,10 80,30 80,70 50,90 20,70 20,30"
            fill="rgba(59, 130, 246, 0.1)"
            stroke="rgba(59, 130, 246, 0.25)"
            strokeWidth="0.8"
          />
        </svg>
      </div>

      <div className="absolute bottom-1/2 right-20 w-10 h-10 opacity-25">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,10 80,30 80,70 50,90 20,70 20,30"
            fill="rgba(59, 130, 246, 0.12)"
            stroke="rgba(59, 130, 246, 0.2)"
            strokeWidth="0.6"
          />
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center space-x-3">
          <img
            src="/smct.png"
            alt="SMCT Group of Companies"
            className="h-10 w-auto sm:h-12 lg:h-14"
          />
        </div>
        <nav className="hidden items-center rounded-full bg-white/10 px-3 py-2 backdrop-blur-sm sm:flex sm:space-x-4 lg:space-x-6 lg:px-4">
          <button
            onClick={() => setIsAboutModalOpen(true)}
            className="text-white font-semibold hover:underline-offset-4 hover:underline hover:text-blue-100 transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => setShowLoginGuideModal(true)}
            className="text-white font-semibold hover:underline-offset-4 hover:underline hover:text-blue-100 transition-colors cursor-pointer"
          >
            Get Started
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
          {/* Left Column - Landing Content */}
          <div className="group relative flex flex-col justify-center space-y-6 lg:space-y-8">
            {/* Subtle backdrop for better text readability */}

            <div className="relative z-10 animate-fade-in-up">
              <h1
                className="animate-fade-in-up text-3xl font-bold text-gray-800 sm:text-4xl lg:text-4xl xl:text-5xl"
                style={{ animationDelay: "0.1s" }}
              >
                Streamline Your{" "}
                <span className="text-blue-600 transition-colors duration-300 hover:text-blue-700">
                  Performance Reviews
                </span>
              </h1>
              <p
                className="animate-fade-in-up text-base text-gray-600 sm:text-lg"
                style={{ animationDelay: "0.2s" }}
              >
                Our platform helps organizations conduct meaningful performance
                evaluations, track employee progress, and foster professional
                growth with intuitive tools and analytics.
              </p>

              <div
                className="space-y-4 animate-fade-in-up"
                style={{ animationDelay: "0.3s" }}
              >
                <div className="flex items-center group/item hover:translate-x-2 transition-transform duration-300 cursor-default">
                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3 group-hover/item:bg-indigo-200 group-hover/item:scale-110 transition-all duration-300">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  </div>
                  <span className="text-gray-700 group-hover/item:text-gray-800 transition-colors duration-300">
                  HR-defined evaluation templates
                  </span>
                </div>
                <div className="flex items-center group/item hover:translate-x-2 transition-transform duration-300 cursor-default">
                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3 group-hover/item:bg-indigo-200 group-hover/item:scale-110 transition-all duration-300">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  </div>
                  <span className="text-gray-700 group-hover/item:text-gray-800 transition-colors duration-300">
                    Real-time feedback and analytics
                  </span>
                </div>
                <div className="flex items-center group/item hover:translate-x-2 transition-transform duration-300 cursor-default">
                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3 group-hover/item:bg-indigo-200 group-hover/item:scale-110 transition-all duration-300">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  </div>
                  <span className="text-gray-700 group-hover/item:text-gray-800 transition-colors duration-300">
                    Goal tracking and progress monitoring
                  </span>
                </div>
              </div>

              <div
                className="bg-white/90 backdrop-blur-md p-6 rounded-lg border border-white/30 shadow-lg animate-fade-in-up hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                style={{ animationDelay: "0.4s" }}
              >
                <p className="text-gray-800 font-medium">
                  "This platform transformed your review process, saving hours
                  of administrative work and providing meaningful insights."
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-center lg:justify-end lg:pr-2 xl:pr-6">
            <PageTransition>
              <Card className="w-full max-w-sm border-gray-500/20 bg-white shadow-lg backdrop-blur-sm transition-shadow duration-300 hover:shadow-xl sm:max-w-md lg:max-w-[22rem] xl:max-w-md">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl text-center text-gray-900">
                    Sign in to your account
                  </CardTitle>
                  <CardDescription className="text-center">
                    Enter your credentials to access your performance evaluation
                    dashboard
                  </CardDescription>
                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLoginGuideModalFromLink(true);
                        setShowLoginGuideModal(true);
                      }}
                      className="text-sm text-blue-600 hover:underline font-medium cursor-pointer"
                    >
                      New here? Get Started
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleLogin}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          <button
                            type="button"
                            onClick={() => setShowForgotPasswordModal(true)}
                            className="text-sm text-indigo-600 hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>

                      {loginError && (
                        <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                          {loginError}
                        </div>
                      )}
                      <Button
                        type="submit"
                        className="w-full bg-blue-600 text-white hover:bg-blue-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                        disabled={isLoggingIn}
                      >
                        {isLoggingIn ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 cursor-pointer"></div>
                            Signing in...
                          </>
                        ) : (
                          "Sign in"
                        )}
                      </Button>
                    </div>
                  </form>

                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setShowRegistrationHelpModal(true)}
                        className="text-blue-600 hover:underline font-medium cursor-pointer"
                      >
                        Contact HR
                      </button>
                    </p>
                  </div>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowGoogleLoginModal(true)}
                      className="w-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 relative overflow-hidden group"
                      style={{
                        backgroundImage: "url('/chrome.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      <div className="absolute inset-0 bg-white opacity-100 group-hover:opacity-30 transition-opacity duration-300" />
                      <div className="relative z-10 flex items-center">
                        <svg
                          className="mr-2 h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 488 512"
                        >
                          <path
                            fill="currentColor"
                            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                          />
                        </svg>
                        Continue with Google
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </PageTransition>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-12 bg-blue-600 py-8 sm:mt-16 lg:mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src="/smct.png"
                  alt="SMCT Group of Companies"
                  className="h-10 w-auto"
                />
              </div>
              <p className="text-white text-justify ">
              Empowering SMCT with a modern performance evaluation system <br />
              that drives growth, accountability, and continuous improvement. <br />
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    onClick={() => setShowLoginGuideModal(true)}
                    className="text-white hover:text-yellow-300 cursor-pointer"
                  >
                    Getting Started Guide
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={() => setShowContactDevsModal(true)}
                    className="text-white hover:text-yellow-300 cursor-pointer"
                  >
                    Help Center
                  </a>
                </li>
              </ul>
            </div>

            {/* Portal CTA */}
            <div className="flex flex-col items-start gap-3 md:items-end">
              <h3 className="font-semibold text-white">Quick Access</h3>
              <p className="text-sm text-blue-200 md:text-right">
                Manage all SMCT apps in one place.
              </p>
              <a
                href="https://portal-2.smctgroup.ph/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-xl border border-yellow-400/50 bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 px-5 py-2.5 text-sm font-bold text-yellow-300 shadow-lg shadow-yellow-900/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-yellow-300 hover:from-yellow-400/30 hover:to-yellow-500/20 hover:shadow-yellow-400/20 active:translate-y-0"
              >
                {/* SMCT logo */}
                <img
                  src="/smct.png"
                  alt="SMCT"
                  className="h-5 w-5 shrink-0 object-contain transition-transform duration-200 group-hover:scale-110"
                />
                SMCT App Portal
                {/* External link arrow */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </div>
          <div className="border-t border-blue-500 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white text-sm">
              © 2026 SMCT Group of Companies. All rights reserved.
            </p>

            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-white hover:text-yellow-300 cursor-pointer">
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        {/* Clear Session Button */}
        <div className="mt-4 flex justify-end px-4">
          <Button
            size="lg"
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="text-base text-white bg-blue-600 hover:text-white hover:bg-blue-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          >
            🔄 Clear Session & Start Fresh
          </Button>
        </div>
      </footer>

      {/* About Modal */}
      <Dialog open={isAboutModalOpen} onOpenChangeAction={setIsAboutModalOpen}>
        <DialogContent
          className="max-w-4xl max-h-[85vh] mx-4 my-8 p-0 animate-in zoom-in-95 duration-300 flex flex-col relative"
          style={{
            animation: isAboutModalOpen
              ? "modalPopup 0.3s ease-out"
              : "modalPopdown 0.3s ease-in",
          }}
        >
          <style jsx>{`
            @keyframes modalPopup {
              0% {
                transform: scale(0.8) translateY(20px);
                opacity: 0;
              }
              50% {
                transform: scale(1.05) translateY(-5px);
                opacity: 0.9;
              }
              100% {
                transform: scale(1) translateY(0);
                opacity: 1;
              }
            }
            @keyframes modalPopdown {
              0% {
                transform: scale(1) translateY(0);
                opacity: 1;
              }
              100% {
                transform: scale(0.8) translateY(20px);
                opacity: 0;
              }
            }

            @keyframes aboutContentReveal {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .about-modal-stack > :global(*) {
              animation: aboutContentReveal 0.45s cubic-bezier(0.22, 1, 0.36, 1)
                backwards;
            }
            .about-modal-stack > :global(*:nth-child(1)) {
              animation-delay: 0.04s;
            }
            .about-modal-stack > :global(*:nth-child(2)) {
              animation-delay: 0.1s;
            }
            .about-modal-stack > :global(*:nth-child(3)) {
              animation-delay: 0.16s;
            }
            .about-modal-stack > :global(*:nth-child(4)) {
              animation-delay: 0.22s;
            }
            .about-modal-stack > :global(*:nth-child(5)) {
              animation-delay: 0.28s;
            }

            @media (prefers-reduced-motion: reduce) {
              .about-modal-stack > :global(*) {
                animation: none !important;
                opacity: 1 !important;
                transform: none !important;
              }
            }

            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }

            .custom-scrollbar::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 10px;
            }

            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: linear-gradient(180deg, #3b82f6, #1d4ed8);
              border-radius: 10px;
              border: 2px solid #f1f5f9;
            }

            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(180deg, #2563eb, #1e40af);
            }

            .custom-scrollbar::-webkit-scrollbar-thumb:active {
              background: linear-gradient(180deg, #1d4ed8, #1e3a8a);
            }

            /* Firefox scrollbar */
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: #3b82f6 #f1f5f9;
            }
          `}</style>
          
          {/* Fixed Close Button - Always Visible */}
          <button
            onClick={() => setIsAboutModalOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 bg-white hover:bg-gray-100 rounded-full transition-colors cursor-pointer shadow-lg border border-gray-200"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
          
          {/* Header */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-600 mb-1 pr-8">
                About SMCT Performance Evaluation System
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Empowering organizations with comprehensive performance
                management solutions
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-3">
            <div className="space-y-4 about-modal-stack">
            {/* What is the Evaluation App */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-md border border-blue-100">
              <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center">
                <span className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center mr-2">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </span>
                What is the SMCT Evaluation App?
              </h3>
              <p className="text-gray-700 leading-relaxed text-xs">
                The SMCT Performance Evaluation System is a comprehensive
                digital platform designed to streamline and enhance the
                performance review process within organizations. Our system
                transforms traditional paper-based evaluations into an
                efficient, data-driven approach that benefits both employees and
                managers.
              </p>
            </div>

            {/* Key Features */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center mr-2">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </span>
                Key Features
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="group bg-white p-3 rounded-md border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200/70">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                      <span className="text-base">📋</span>
                  </div>
                    <div className="flex-1">
                     <h4 className="font-medium text-gray-800 mb-1 text-sm">
                        Company-Specific Templates
                     </h4>
                        <p className="text-gray-600 text-xs">
                          Predefined evaluation templates designed for the company, with separate
                          formats for branch offices and the head office.
                        </p>
                    </div>
                  </div>
                </div>
                <div className="group bg-white p-3 rounded-md border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200/70">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                      <span className="text-base">📊</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1 text-sm">
                        Performance Analytics
                      </h4>
                      <p className="text-gray-600 text-xs">
                        Track rating trends over time and review summaries from
                        completed evaluations.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="group bg-white p-3 rounded-md border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200/70">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                      <span className="text-base">🎯</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1 text-sm">
                        Job Targets &amp; Priority Areas
                      </h4>
                      <p className="text-gray-600 text-xs">
                        Record job targets (including branch metrics where
                        applicable) and priority development areas within each
                        evaluation cycle.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="group bg-white p-3 rounded-md border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200/70">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                      <span className="text-base">📝</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1 text-sm">
                        Structured Evaluations
                      </h4>
                      <p className="text-gray-600 text-xs">
                        Standardized criteria and step-by-step workflows so
                        designated evaluators complete consistent, auditable
                        reviews.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center mr-2">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </span>
                Benefits for Organizations
              </h3>
              <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <svg
                        className="w-2 h-2 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    </div>
                    <p className="text-gray-700 text-sm">
                      Reduce administrative burden and save time on manual
                      processes
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <svg
                        className="w-2 h-2 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    </div>
                    <p className="text-gray-700 text-sm">
                      Improve accuracy and consistency in performance
                      assessments
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <svg
                        className="w-2 h-2 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    </div>
                    <p className="text-gray-700 text-sm">
                      Enhance employee engagement and development through
                      regular feedback
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <svg
                        className="w-2 h-2 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    </div>
                    <p className="text-gray-700 text-sm">
                      Make data-driven decisions for promotions and career
                      development
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* How it Works */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center mr-2">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    ></path>
                  </svg>
                </span>
                How It Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="group text-center p-3 bg-white rounded-md border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200/70">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 transition-transform duration-200 group-hover:scale-105">
                    <span className="text-white font-bold text-xs">1</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-1 text-xs">
                    Setup & Configuration
                  </h4>
                  <p className="text-gray-600 text-xs">
                    Configure evaluation criteria and templates for your
                    organization
                  </p>
                </div>
                <div className="group text-center p-3 bg-white rounded-md border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200/70">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 transition-transform duration-200 group-hover:scale-105">
                    <span className="text-white font-bold text-xs">2</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-1 text-xs">
                    Evaluation Process
                  </h4>
                  <p className="text-gray-600 text-xs">
                    Conduct evaluations with structured forms and real-time
                    feedback
                  </p>
                </div>
                <div className="group text-center p-3 bg-white rounded-md border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200/70">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 transition-transform duration-200 group-hover:scale-105">
                    <span className="text-white font-bold text-xs">3</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-1 text-xs">
                    Analysis & Insights
                  </h4>
                  <p className="text-gray-600 text-xs">
                    Generate reports and insights to drive organizational growth
                  </p>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-md shadow-lg">
              <div className="flex items-center space-x-3 mb-3">
                <img
                  src="/smct.png"
                  alt="SMCT Group of Companies"
                  className="h-10 w-auto"
                />
                <div>
                  <h3 className="text-lg font-bold">SMCT Group of Companies</h3>
                  <p className="text-blue-100 text-sm">
                    Empowering organizations through innovative solutions
                  </p>
                </div>
              </div>
              <p className="text-blue-100 text-xs leading-relaxed">
                As a leading provider of business solutions, we understand the
                challenges organizations face in managing performance
                evaluations. Our platform is built with years of experience in
                HR technology and organizational development, ensuring that
                every feature serves a real business need.
              </p>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Login Modal */}
      <GoogleLoginModal
        isOpen={showGoogleLoginModal}
        onCloseAction={() => setShowGoogleLoginModal(false)}
        onSuccess={(user) => {
          console.log("Google login successful:", user);
          // The modal will handle the login and redirect
        }}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onCloseAction={() => setShowForgotPasswordModal(false)}
        initialEmail={username}
        onSuccessAction={async ({ role, result }) => {
          setShowForgotPasswordModal(false);
          setShowLoadingScreen(true);
          try {
            let dashboardPath =
              getDashboardPathFromAuthPayload(result) ||
              getDashboardPath(role) ||
              "";

            // Last resort: read role from the refreshed session profile.
            if (!dashboardPath) {
              try {
                const profileRes = await apiService.authUser();
                dashboardPath =
                  getDashboardPathFromAuthPayload(profileRes) || "";
              } catch (profileError) {
                console.error("OTP redirect profile lookup failed:", profileError);
              }
            }

            console.log("🚀 OTP login redirecting to:", dashboardPath, {
              role,
              result,
            });

            await new Promise((resolve) => setTimeout(resolve, 600));

            if (dashboardPath) {
              router.push(dashboardPath);
              return;
            }

            setShowLoadingScreen(false);
            toastMessages.generic.info(
              "Signed in",
              "We couldn't determine your dashboard role. Please refresh or contact support."
            );
          } catch (error: any) {
            setShowLoadingScreen(false);
            toastMessages.generic.error(
              "Redirect failed",
              error?.message || "Signed in, but we couldn't open your dashboard."
            );
          }
        }}
      />

      {/* Contact Developers Modal */}
      <ContactDevsModal
        isOpen={showContactDevsModal}
        onCloseAction={() => setShowContactDevsModal(false)}
      />

      {/* Registration help modal (HR/Devs) */}
      <Dialog
        open={showRegistrationHelpModal}
        onOpenChangeAction={setShowRegistrationHelpModal}
      >
        <DialogContent className="w-[92vw] max-w-md overflow-hidden p-0">
          <div className="border-b border-blue-100 bg-gradient-to-br from-blue-600/10 via-indigo-500/10 to-cyan-400/10 px-6 py-5">
            <DialogHeader className="border-none px-0 py-0">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
                  <img
                    src="/phone-contact.gif"
                    alt="Contact support"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-semibold text-slate-900">
                    Registration is managed by HR
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm leading-relaxed text-slate-600">
                    To create your account, please contact HR and share your
                    full name, role, and department.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-3 px-6 py-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Please coordinate with HR for account creation and access approval.
            </div>

            <Button
              type="button"
              className="w-full cursor-pointer bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              onClick={() => setShowRegistrationHelpModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={showHowItWorksModal}
        onCloseAction={() => setShowHowItWorksModal(false)}
      />

      {/* Login & Registration Guide Modal */}
      <LoginRegistrationGuideModal
        isOpen={showLoginGuideModal}
        onCloseAction={() => {
          setShowLoginGuideModal(false);
          setShowLoginGuideModalFromLink(false); // Reset when modal closes
        }}
        initialSlide={showLoginGuideModalFromLink ? 1 : 0} // Slide 1 = Registration (0-indexed)
      />

      {/* Incorrect Password Dialog */}
      <Dialog
        open={showIncorrectPasswordDialog}
        onOpenChangeAction={setShowIncorrectPasswordDialog}
      >
        <DialogContent className="max-w-sm w-[90vw] sm:w-full px-6 py-6">
          <div className="space-y-3 fade-in-scale">
            <div className="flex justify-center mt-1">
              <div className="w-16 h-16 flex items-center justify-center p-1">
                <svg viewBox="0 0 52 52" className="w-12 h-12 overflow-visible">
                  <circle
                    className="error-circle"
                    cx="26"
                    cy="26"
                    r="24"
                    fill="none"
                  />
                  <path
                    className="error-x-line1"
                    fill="none"
                    d="M16 16 l20 20"
                  />
                  <path
                    className="error-x-line2"
                    fill="none"
                    d="M36 16 l-20 20"
                  />
                </svg>
              </div>
            </div>
            <style jsx>{`
              .fade-in-scale {
                animation: fadeInScale 200ms ease-out both;
              }
              @keyframes fadeInScale {
                from {
                  opacity: 0;
                  transform: scale(0.98);
                }
                to {
                  opacity: 1;
                  transform: scale(1);
                }
              }
              .error-circle {
                stroke: #dc2626;
                stroke-width: 3;
                stroke-linecap: round;
                stroke-dasharray: 160;
                stroke-dashoffset: 160;
                animation: draw-error-circle 0.6s ease-out forwards;
              }
              .error-x-line1 {
                stroke: #dc2626;
                stroke-width: 4;
                stroke-linecap: round;
                stroke-linejoin: round;
                stroke-dasharray: 30;
                stroke-dashoffset: 30;
                animation: draw-x-line1 0.4s ease-out 0.3s forwards;
              }
              .error-x-line2 {
                stroke: #dc2626;
                stroke-width: 4;
                stroke-linecap: round;
                stroke-linejoin: round;
                stroke-dasharray: 30;
                stroke-dashoffset: 30;
                animation: draw-x-line2 0.4s ease-out 0.5s forwards;
              }
              @keyframes draw-error-circle {
                to {
                  stroke-dashoffset: 0;
                }
              }
              @keyframes draw-x-line1 {
                to {
                  stroke-dashoffset: 0;
                }
              }
              @keyframes draw-x-line2 {
                to {
                  stroke-dashoffset: 0;
                }
              }
            `}</style>
            <p className="text-lg font-medium text-gray-900 text-center">
              Incorrect Password
            </p>
            <p className="text-sm text-gray-600 text-center">
              Please try again with the correct password.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Server / connection error dialog */}
      <Dialog
        open={showServerErrorDialog}
        onOpenChangeAction={setShowServerErrorDialog}
      >
        <DialogContent className="max-w-lg p-0 overflow-hidden border border-red-100 shadow-2xl rounded-xl bg-white">
          <div className="px-6 py-4 bg-gradient-to-r from-red-500/15 via-amber-500/10 to-orange-500/15 border-b border-red-100">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-xl bg-red-50 border border-red-200">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              </div>

              <div className="flex-1">
                <DialogHeader className="pb-0">
                  <DialogTitle className="text-red-700 text-lg font-bold">
                    {serverErrorTitle}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-red-800/90">
                    {serverErrorDescription}
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
          </div>

          <div className="px-1 py-1">
            <div className=" bg-gradient-to-b from-red-50/30 to-white p-4">
              {/* Replace `/question.png` with your GIF in `public/` */}
              <div className="flex items-center justify-center">
                <img
                  src="/no-data2.gif"
                  alt="Illustration placeholder"
                  className="w-full max-w-[200px] h-auto rounded-lg bg-gray-100 object-contain"
                />
              </div>
              
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-0">
            <Button
              type="button"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              onClick={() => setShowServerErrorDialog(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrap with HOC for public page with transitions
// redirectIfAuthenticated: false allows authenticated users to access the landing page
// Users can still log in again or navigate to their dashboard manually
export default withPublicPage(LandingLoginPage, {
  redirectIfAuthenticated: false,
});
