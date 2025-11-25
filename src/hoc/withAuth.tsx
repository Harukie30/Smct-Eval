"use client";

import { ComponentType, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/UserContext";

interface WithAuthOptions {
  requiredRole?: string | string[];
  fallbackPath?: string;
  redirectOnRoleMismatch?: boolean;
}

/**
 * Higher-Order Component for authentication and authorization
 *
 * Usage:
 * export default withAuth(YourPage, { requiredRole: 'admin' });
 *
 * @param Component - The page component to wrap
 * @param options - Authentication options
 */
export function withAuth<P extends object>(
  Component: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const {
    requiredRole,
    fallbackPath = "/",
    redirectOnRoleMismatch = true,
  } = options;

  return function WithAuthComponent(props: P) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [waitTimeout, setWaitTimeout] = useState(false);

    // Give auth state time to stabilize before checking
    useEffect(() => {
      setIsCheckingAuth(true);
      const timer = setTimeout(() => {
        setIsCheckingAuth(false);
      }, 500); // 500ms grace period for auth state to settle

      return () => clearTimeout(timer);
    }, [isAuthenticated]); // Reset when auth state changes

    // Timeout fallback: if waiting too long for context sync, force redirect
    useEffect(() => {
      if (!isLoading && !isCheckingAuth && !isAuthenticated) {
        const storedUser =
          typeof window !== "undefined"
            ? localStorage.getItem("authenticatedUser")
            : null;

        if (storedUser) {
          // Give context 3 seconds to sync before forcing redirect
          const timeout = setTimeout(() => {
            console.log("⚠️ withAuth: Context sync timeout, forcing redirect");
            setWaitTimeout(true);
          }, 3000);

          return () => clearTimeout(timeout);
        }
      }
    }, [isLoading, isCheckingAuth, isAuthenticated]);

    // Handle authentication redirect
    useEffect(() => {
      if (!isLoading && !isCheckingAuth && !isAuthenticated) {
        const storedUser =
          typeof window !== "undefined"
            ? localStorage.getItem("authenticatedUser")
            : null;

        if (!storedUser || waitTimeout) {
          if (waitTimeout) {
            console.log(
              "⏱️ withAuth: Context sync timeout, clearing stale data"
            );
            localStorage.removeItem("authenticatedUser");
          }
          console.log(
            "🔒 withAuth: Not authenticated, redirecting to",
            fallbackPath
          );
          router.push(fallbackPath);
        } else {
          console.log(
            "⏳ withAuth: Context says not auth, but localStorage has user?. Waiting for sync..."
          );
        }
      }
    }, [isAuthenticated, isLoading, isCheckingAuth, router, waitTimeout]);

    // Handle role-based redirect
    useEffect(() => {
      if (
        !isLoading &&
        isAuthenticated &&
        requiredRole &&
        user &&
        redirectOnRoleMismatch
      ) {
        // Get user's role from user object (AuthenticatedUser only has role, not roles array)
        const userRole = user?.role || "";
        const normalizedUserRole = userRole.toLowerCase();
        
        // Check if user has required role (handle both string and array)
        const requiredRoles = Array.isArray(requiredRole) 
          ? requiredRole.map(r => r.toLowerCase())
          : [requiredRole.toLowerCase()];
        
        const hasRequiredRole = requiredRoles.includes(normalizedUserRole);

        if (!hasRequiredRole) {
          // Redirect to appropriate dashboard based on user role
          const roleDashboards: Record<string, string> = {
            admin: "/admin",
            hr: "/hr-dashboard",
            evaluator: "/evaluator",
            employee: "/employee-dashboard",
            manager: "/evaluator",
          };

          const dashboardPath = roleDashboards[normalizedUserRole];
          
          if (dashboardPath) {
            console.log(
              `🔀 withAuth: User role "${userRole}" doesn't match required "${requiredRole}", redirecting to ${dashboardPath}`
            );
            router.push(dashboardPath);
          } else {
            console.warn(
              `⚠️ withAuth: No dashboard path found for role "${userRole}", redirecting to /employee-dashboard as fallback`
            );
            router.push("/employee-dashboard");
          }
        } else {
          console.log(
            `✅ withAuth: User role "${userRole}" matches required "${requiredRole}", allowing access`
          );
        }
      }
    }, [
      isAuthenticated,
      isLoading,
      user,
      requiredRole,
      router,
      redirectOnRoleMismatch,
    ]);

    // Show loading screen during auth check
    if (isLoading || isCheckingAuth) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {isLoading ? "Loading..." : "Verifying authentication..."}
            </p>
          </div>
        </div>
      );
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      const storedUser =
        typeof window !== "undefined"
          ? localStorage.getItem("authenticatedUser")
          : null;

      if (storedUser && !waitTimeout) {
        // User exists in localStorage but context hasn't synced yet
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Syncing authentication...</p>
              <p className="text-xs text-gray-400 mt-2">Please wait...</p>
            </div>
          </div>
        );
      }

      // No stored user or timeout occurred - will redirect in useEffect
      return null;
    }

    // Check role if required
    if (requiredRole && user) {
      // Get user's role (AuthenticatedUser only has role, not roles array)
      const userRole = user?.role || "";
      const normalizedUserRole = userRole.toLowerCase();
      
      // Check if user has required role (handle both string and array)
      const requiredRoles = Array.isArray(requiredRole) 
        ? requiredRole.map(r => r.toLowerCase())
        : [requiredRole.toLowerCase()];
      
      const hasRequiredRole = requiredRoles.includes(normalizedUserRole);

      if (!hasRequiredRole && redirectOnRoleMismatch) {
        // Will redirect in useEffect - show loading
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Redirecting...</p>
            </div>
          </div>
        );
      }
    }

    // Render the component
    return <Component {...props} />;
  };
}

/**
 * Simpler HOC if backend is handling all auth
 * Just checks if user is logged in, no role checking
 */
export function withSimpleAuth<P extends object>(
  Component: ComponentType<P>,
  fallbackPath: string = "/"
) {
  return function WithSimpleAuthComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        console.log(
          "🔒 withSimpleAuth: Not authenticated, redirecting to",
          fallbackPath
        );
        router.push(fallbackPath);
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will redirect in useEffect
    }

    return <Component {...props} />;
  };
}
