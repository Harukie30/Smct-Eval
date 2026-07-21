/**
 * Utility functions for dashboard routing and role-based navigation
 */

/**
 * Maps user roles to their corresponding dashboard paths
 */
export const ROLE_DASHBOARD_MAP: Record<string, string> = {
  admin: "/admin",
  hr: "/hr-dashboard",
  "hr-manager": "/hr-dashboard",
  evaluator: "/evaluator",
  employee: "/employee-dashboard",
  manager: "/evaluator",
};

/**
 * Gets the dashboard path for a given user role
 * @param role - The user's role (from profile.roles[0].name or user.role)
 * @param fallback - Optional fallback path if role not found (defaults to null)
 * @returns The dashboard path or fallback/null if role not found
 */
export function getDashboardPath(role: unknown, fallback: string | null = null): string | null {
  if (role == null || role === "") return fallback;

  // API may send role as a string, or as an object like { name: "employee" }.
  let roleName = "";
  if (typeof role === "string" || typeof role === "number") {
    roleName = String(role);
  } else if (typeof role === "object") {
    const record = role as { name?: unknown; role?: unknown; slug?: unknown };
    const nested = record.name ?? record.role ?? record.slug;
    if (typeof nested === "string" || typeof nested === "number") {
      roleName = String(nested);
    }
  }

  const normalizedRole = roleName.trim().toLowerCase();
  if (!normalizedRole) return fallback;

  return ROLE_DASHBOARD_MAP[normalizedRole] || fallback;
}

/**
 * Gets the dashboard path for a user from UserProfile or AuthenticatedUser
 * @param profile - UserProfile object (optional)
 * @param user - AuthenticatedUser object (optional)
 * @param fallback - Optional fallback path if role not found (defaults to null)
 * @returns The dashboard path or fallback/null if role not found
 */
export function getUserDashboardPath(
  profile?: { roles?: { name: string }[] } | null,
  user?: { role?: string } | null,
  fallback: string | null = null
): string | null {
  const role = profile?.roles?.[0]?.name || user?.role || null;
  return getDashboardPath(role, fallback);
}

