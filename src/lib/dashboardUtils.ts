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

/** Pull a dashboard role string from login / profile / OTP API payloads. */
export function resolveAuthRole(payload: unknown): string | null {
  const asRoleString = (value: unknown): string | null => {
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      return text || null;
    }
    if (value && typeof value === "object") {
      const record = value as {
        name?: unknown;
        role?: unknown;
        slug?: unknown;
      };
      return asRoleString(record.name ?? record.role ?? record.slug);
    }
    return null;
  };

  if (payload == null) return null;
  if (typeof payload === "string" || typeof payload === "number") {
    return asRoleString(payload);
  }
  if (typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null;
  const userCandidate =
    (root.user && typeof root.user === "object"
      ? (root.user as Record<string, unknown>)
      : null) ||
    (data?.user && typeof data.user === "object"
      ? (data.user as Record<string, unknown>)
      : null);

  const candidates: unknown[] = [
    root.role,
    data?.role,
    userCandidate?.role,
    Array.isArray(userCandidate?.roles) ? userCandidate.roles[0] : null,
    Array.isArray(root.roles) ? root.roles[0] : null,
    Array.isArray(data?.roles) ? data.roles[0] : null,
    userCandidate,
    data,
    root,
  ];

  for (const candidate of candidates) {
    const role = asRoleString(candidate);
    if (role) return role;
  }

  return null;
}

/** Resolve dashboard path from any auth/login/OTP response or user object. */
export function getDashboardPathFromAuthPayload(
  payload: unknown,
  fallback: string | null = null
): string | null {
  return getDashboardPath(resolveAuthRole(payload), fallback);
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

