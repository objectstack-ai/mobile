import { useCallback, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface PrefetchEntry {
  key: string;
  data: unknown;
  fetchedAt: number;
  ttl: number;
}

export interface UsePrefetchResult {
  /** Prefetch data and cache it under the given key */
  prefetch: (
    key: string,
    fetcher: () => Promise<unknown>,
    ttl?: number,
  ) => Promise<void>;
  /** Retrieve cached data (null if missing or expired) */
  get: (key: string) => unknown | null;
  /** Check if a key exists and is not expired */
  has: (key: string) => boolean;
  /** Invalidate a single cached entry */
  invalidate: (key: string) => void;
  /** Invalidate all cached entries */
  invalidateAll: () => void;
  /** List of currently cached keys */
  prefetchedKeys: string[];
  /** Whether a prefetch is currently in progress */
  isLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_TTL = 30_000;

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for prefetching data (list→detail, tab content, search results).
 *
 * ```ts
 * const { prefetch, get, has } = usePrefetch();
 * await prefetch("detail-123", () => fetchDetail("123"));
 * if (has("detail-123")) console.log(get("detail-123"));
 * ```
 */
export function usePrefetch(): UsePrefetchResult {
  const cacheRef = useRef<Map<string, PrefetchEntry>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [, forceUpdate] = useState(0);

  const isValid = useCallback((entry: PrefetchEntry): boolean => {
    return Date.now() - entry.fetchedAt < entry.ttl;
  }, []);

  const prefetch = useCallback(
    async (
      key: string,
      fetcher: () => Promise<unknown>,
      ttl: number = DEFAULT_TTL,
    ): Promise<void> => {
      setIsLoading(true);
      try {
        const data = await fetcher();
        cacheRef.current.set(key, {
          key,
          data,
          fetchedAt: Date.now(),
          ttl,
        });
        forceUpdate((n) => n + 1);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const get = useCallback(
    (key: string): unknown | null => {
      const entry = cacheRef.current.get(key);
      if (!entry || !isValid(entry)) return null;
      return entry.data;
    },
    [isValid],
  );

  const has = useCallback(
    (key: string): boolean => {
      const entry = cacheRef.current.get(key);
      return entry !== undefined && isValid(entry);
    },
    [isValid],
  );

  const invalidate = useCallback((key: string): void => {
    cacheRef.current.delete(key);
    forceUpdate((n) => n + 1);
  }, []);

  const invalidateAll = useCallback((): void => {
    cacheRef.current.clear();
    forceUpdate((n) => n + 1);
  }, []);

  const prefetchedKeys = Array.from(cacheRef.current.keys());

  return {
    prefetch,
    get,
    has,
    invalidate,
    invalidateAll,
    prefetchedKeys,
    isLoading,
  };
}
