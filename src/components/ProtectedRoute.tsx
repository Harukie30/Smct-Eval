// 'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/UserContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  fallbackPath?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  fallbackPath = "/login",
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Give auth state time to stabilize before checking
  useEffect(() => {
    const timer = setTimeout(() => setIsCheckingAuth(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // 🔒 Redirect if not authenticated after load
  useEffect(() => {
    if (!isLoading && !isCheckingAuth && !isAuthenticated) {
      console.log("🔒 Not authenticated, redirecting to", fallbackPath);
      router.push(fallbackPath);
    }
  }, [isAuthenticated, isLoading, isCheckingAuth, router, fallbackPath]);

  // 👤 Role-based access control
  useEffect(() => {
    if (!isLoading && isAuthenticated && requiredRole) {
      const hasRequiredRole = Array.isArray(requiredRole)
        ? requiredRole.includes(user?.roles[0] || "")
        : user?.role === requiredRole;

      if (!hasRequiredRole) {
        const roleDashboards: Record<string, string> = {
          admin: "/admin",
          hr: "/hr-dashboard",
          "hr-manager": "/hr-dashboard",
          evaluator: "/evaluator",
          employee: "/employee-dashboard",
          manager: "/evaluator",
        };

        const dashboardPath = roleDashboards[user?.role || "employee"] || "/";
        console.log("⚠️ Unauthorized role, redirecting to", dashboardPath);
        router.push(dashboardPath);
      }
    }
  }, [isAuthenticated, isLoading, user?.role, requiredRole, router]);

  // 🌀 Loading screen while waiting for user or session check
  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoading ? "Loading session..." : "Verifying authentication..."}
          </p>
        </div>
      </div>
    );
  }

  // ⛔️ Not authenticated — will redirect
  if (!isAuthenticated) return null;

  // 🛑 Role mismatch — will redirect
  if (requiredRole) {
    const hasRequiredRole = Array.isArray(requiredRole)
      ? requiredRole.includes(user?.role || "")
      : user?.role === requiredRole;

    if (!hasRequiredRole) return null;
  }

  // ✅ Authenticated + correct role → render page
  return <>{children}</>;
}
