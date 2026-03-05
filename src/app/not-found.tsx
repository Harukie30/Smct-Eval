"use client";

import RealLoadingScreen from "@/components/RealLoadingScreen";
import { useAuth } from "@/contexts/UserContext";
import Link from "next/link";
import { getUserDashboardPath } from "@/lib/dashboardUtils";

export default function NotFound() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Get user's dashboard based on role, or return to landing page
  // Pass user as profile since it has roles array, and null as user param since user object doesn't have role property
  const dashboardPath = getUserDashboardPath(user as { roles?: { name: string }[] } | null, null, "/") || "/";

  if (isLoading) return <RealLoadingScreen />;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-slate-50">

  {/* Abstract Background */}
  <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-400/30 rounded-full blur-3xl"></div>
  <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-cyan-400/30 rounded-full blur-3xl"></div>
  <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-purple-400/20 rounded-full blur-3xl"></div>

  {/* Content Card */}
  <div className="relative w-full max-w-md rounded-2xl bg-white/90 backdrop-blur shadow-xl border border-gray-100 overflow-hidden">
    <div className="p-10">

      {/* Icon */}
      <div className="flex justify-center mb-6">
  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 overflow-hidden">
    <img
      src="/search-file.gif"
      alt="Not found animation"
      className="w-30 h-30 object-contain"
    />
  </div>
</div>

      {/* Text */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold text-gray-800">
          Oops! Page Not Found
        </h2>

        <p className="text-gray-500 text-sm leading-relaxed">
          The page you're looking for might have been removed, renamed,
          or is temporarily unavailable.
        </p>
      </div>

      {/* Button */}
      <div className="mt-8">
        {isLoading ? null : isAuthenticated ? (
          <Link
            href={dashboardPath}
            className="block w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium text-center shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          >
            Return to Dashboard
          </Link>
        ) : (
          <Link
            href="/"
            className="block w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium text-center shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          >
            Return to Login
          </Link>
        )}
      </div>

    </div>
  </div>
</div>
  );
}
