import apiService from "@/lib/apiService";

const REFERENCE_DATA_CACHE_TTL_MS = 5 * 60 * 1000;
const EMPLOYEE_DASHBOARD_CACHE_TTL_MS = 30 * 1000;

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

type CachedFetcher<T> = {
  get: (options?: { force?: boolean }) => Promise<T>;
  peek: () => T | null;
};

function createReferenceDataFetcher<T>(
  fetcher: () => Promise<T>,
  ttlMs = REFERENCE_DATA_CACHE_TTL_MS
): CachedFetcher<T> {
  let cache: CacheEntry<T> | null = null;
  let inFlight: Promise<T> | null = null;

  const get = async (options?: { force?: boolean }): Promise<T> => {
    const force = options?.force === true;

    if (!force && cache && cache.expiresAt > Date.now()) {
      return cache.data;
    }

    if (!force && inFlight) {
      return inFlight;
    }

    inFlight = fetcher()
      .then((data) => {
        cache = {
          data,
          expiresAt: Date.now() + ttlMs,
        };
        return data;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };

  const peek = (): T | null => {
    if (cache && cache.expiresAt > Date.now()) {
      return cache.data;
    }
    return null;
  };

  return { get, peek };
}

const branchesFetcher = createReferenceDataFetcher(() =>
  apiService.getBranches()
);

const yearsFetcher = createReferenceDataFetcher(() => apiService.getAllYears());

const positionsFetcher = createReferenceDataFetcher(() =>
  apiService.getPositions()
);

const rolesFetcher = createReferenceDataFetcher(() => apiService.getAllRoles());

const departmentsFetcher = createReferenceDataFetcher(() =>
  apiService.getDepartments()
);

const employeeDashboardFetcher = createReferenceDataFetcher(
  () => apiService.employeeDashboard(),
  EMPLOYEE_DASHBOARD_CACHE_TTL_MS
);

export const getCachedBranches = branchesFetcher.get;
export const peekCachedBranches = branchesFetcher.peek;

export const getCachedYears = yearsFetcher.get;
export const peekCachedYears = yearsFetcher.peek;

export const getCachedPositions = positionsFetcher.get;
export const peekCachedPositions = positionsFetcher.peek;

export const getCachedRoles = rolesFetcher.get;
export const peekCachedRoles = rolesFetcher.peek;

export const getCachedDepartments = departmentsFetcher.get;
export const peekCachedDepartments = departmentsFetcher.peek;

export const getCachedEmployeeDashboard = employeeDashboardFetcher.get;
export const peekCachedEmployeeDashboard = employeeDashboardFetcher.peek;

/**
 * Collapses identical requests that are in flight at the same time (e.g. React
 * Strict Mode double-mount) into a single network call. Unlike the cached
 * fetchers above it keeps no result cache, so data is always freshly fetched
 * once the previous request settles.
 */
export function createInFlightDeduper<Args extends unknown[], Result>(
  fetcher: (...args: Args) => Promise<Result>,
  buildKey: (...args: Args) => string
): (...args: Args) => Promise<Result> {
  const inFlight = new Map<string, Promise<Result>>();

  return (...args: Args): Promise<Result> => {
    const key = buildKey(...args);
    const existing = inFlight.get(key);
    if (existing) return existing;

    const request = fetcher(...args).finally(() => {
      inFlight.delete(key);
    });

    inFlight.set(key, request);
    return request;
  };
}
