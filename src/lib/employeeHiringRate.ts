export type HiringRateStats = {
  monthHired: number;
  yearHired: number;
  total: number;
  monthPercent: number;
  yearPercent: number;
};

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function parseDateHired(user: Record<string, unknown>): Date | null {
  const raw = user.date_hired ?? user.dateHired ?? user.hireDate;
  if (!raw) return null;
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPercent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export function computeHiringRateStats(
  users: Array<Record<string, unknown>>,
  totalEmployees: number
): HiringRateStats {
  const total = totalEmployees > 0 ? totalEmployees : users.length;
  const now = Date.now();
  let monthHired = 0;
  let yearHired = 0;

  for (const user of users) {
    const hiredAt = parseDateHired(user);
    if (!hiredAt) continue;
    const ageMs = now - hiredAt.getTime();
    if (ageMs < 0) continue;
    if (ageMs <= MONTH_MS) monthHired += 1;
    if (ageMs <= YEAR_MS) yearHired += 1;
  }

  return {
    monthHired,
    yearHired,
    total,
    monthPercent: toPercent(monthHired, total),
    yearPercent: toPercent(yearHired, total),
  };
}

/** Normalize /getAllActiveUsers (and similar) responses into a user list. */
export function normalizeActiveUsersList(response: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(response)) {
    return response as Array<Record<string, unknown>>;
  }
  if (!response || typeof response !== "object") {
    return [];
  }

  const obj = response as Record<string, unknown>;
  if (Array.isArray(obj.data)) {
    return obj.data as Array<Record<string, unknown>>;
  }
  if (Array.isArray(obj.users)) {
    return obj.users as Array<Record<string, unknown>>;
  }
  return [];
}

function dashboardHasHiringRateFields(
  dashboard: Record<string, unknown> | null | undefined
): boolean {
  if (!dashboard) return false;
  return (
    dashboard.hiring_rate_month != null ||
    dashboard.hiringRateMonth != null ||
    dashboard.hiring_rate_year != null ||
    dashboard.hiringRateYear != null
  );
}

/** Load hiring stats from /hrDashboard fields or by scanning active users. */
export async function resolveHiringRateStats(
  dashboard: Record<string, unknown>,
  fetchActiveUsers: () => Promise<unknown>
): Promise<HiringRateStats> {
  const employeeTotal = Number(dashboard.total_users ?? 0);
  const empty = computeHiringRateStats([], employeeTotal);

  if (dashboardHasHiringRateFields(dashboard)) {
    return mergeHiringRateStatsFromDashboard(dashboard, empty);
  }

  try {
    const response = await fetchActiveUsers();
    const users = normalizeActiveUsersList(response);
    const computed = computeHiringRateStats(users, employeeTotal);
    return mergeHiringRateStatsFromDashboard(dashboard, computed);
  } catch (error) {
    console.error("Error loading hiring rate stats:", error);
    return mergeHiringRateStatsFromDashboard(dashboard, empty);
  }
}

/** Prefer explicit API fields from /hrDashboard when the backend provides them. */
export function mergeHiringRateStatsFromDashboard(
  dashboard: Record<string, unknown> | null | undefined,
  computed: HiringRateStats
): HiringRateStats {
  if (!dashboard) return computed;

  const monthPercent = dashboard.hiring_rate_month ?? dashboard.hiringRateMonth;
  const yearPercent = dashboard.hiring_rate_year ?? dashboard.hiringRateYear;
  const monthHired = dashboard.hired_this_month ?? dashboard.hiredThisMonth;
  const yearHired = dashboard.hired_this_year ?? dashboard.hiredThisYear;

  const hasApiRates = monthPercent != null || yearPercent != null;

  if (!hasApiRates) return computed;

  return {
    total: computed.total,
    monthHired:
      monthHired != null ? Number(monthHired) : computed.monthHired,
    yearHired: yearHired != null ? Number(yearHired) : computed.yearHired,
    monthPercent:
      monthPercent != null ? Number(monthPercent) : computed.monthPercent,
    yearPercent:
      yearPercent != null ? Number(yearPercent) : computed.yearPercent,
  };
}
