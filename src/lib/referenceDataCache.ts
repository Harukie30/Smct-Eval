import apiService from "@/lib/apiService";

const REFERENCE_DATA_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

function createReferenceDataFetcher<T>(fetcher: () => Promise<T>) {
  let cache: CacheEntry<T> | null = null;
  let inFlight: Promise<T> | null = null;

  return async (options?: { force?: boolean }): Promise<T> => {
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
          expiresAt: Date.now() + REFERENCE_DATA_CACHE_TTL_MS,
        };
        return data;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };
}

export const getCachedBranches = createReferenceDataFetcher(() =>
  apiService.getBranches()
);

export const getCachedYears = createReferenceDataFetcher(() =>
  apiService.getAllYears()
);
