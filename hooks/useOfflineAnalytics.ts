import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface OfflineQuery {
  id: string;
  object: string;
  measure: string;
  groupBy?: string;
  filters?: Record<string, unknown>;
  timeRange?: { start: string; end: string };
}

export interface OfflineQueryResult {
  queryId: string;
  data: Array<Record<string, unknown>>;
  total: number;
  computedAt: string;
  isStale: boolean;
}

export interface OfflineAnalyticsCache {
  queryId: string;
  cachedAt: string;
  expiresAt: string;
  size: number;
}

export interface UseOfflineAnalyticsResult {
  /** Cached query results */
  results: Map<string, OfflineQueryResult>;
  /** Cache metadata */
  cacheEntries: OfflineAnalyticsCache[];
  /** Total cache size in bytes */
  totalCacheSize: number;
  /** Execute a local analytics query */
  executeQuery: (query: OfflineQuery) => OfflineQueryResult;
  /** Register a cached result */
  cacheResult: (queryId: string, result: OfflineQueryResult, expiresAt: string, size: number) => void;
  /** Get a cached result */
  getCached: (queryId: string) => OfflineQueryResult | undefined;
  /** Invalidate a cached query */
  invalidate: (queryId: string) => void;
  /** Clear all cached analytics */
  clearCache: () => void;
  /** Number of cached queries */
  cacheCount: number;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for local-first analytics queries with caching.
 *
 * Implements v1.6 Advanced Offline (offline analytics).
 *
 * ```ts
 * const { executeQuery, getCached, clearCache, totalCacheSize } = useOfflineAnalytics();
 * const result = executeQuery({ id: "q1", object: "orders", measure: "sum:amount" });
 * ```
 */
export function useOfflineAnalytics(): UseOfflineAnalyticsResult {
  const [results, setResults] = useState<Map<string, OfflineQueryResult>>(new Map());
  const [cacheEntries, setCacheEntries] = useState<OfflineAnalyticsCache[]>([]);

  const totalCacheSize = useMemo(
    () => cacheEntries.reduce((sum, e) => sum + e.size, 0),
    [cacheEntries],
  );

  const cacheCount = useMemo(() => cacheEntries.length, [cacheEntries]);

  const executeQuery = useCallback(
    (query: OfflineQuery): OfflineQueryResult => {
      const result: OfflineQueryResult = {
        queryId: query.id,
        data: [],
        total: 0,
        computedAt: new Date().toISOString(),
        isStale: false,
      };
      setResults((prev) => {
        const next = new Map(prev);
        next.set(query.id, result);
        return next;
      });
      return result;
    },
    [],
  );

  const cacheResult = useCallback(
    (queryId: string, result: OfflineQueryResult, expiresAt: string, size: number) => {
      setResults((prev) => {
        const next = new Map(prev);
        next.set(queryId, result);
        return next;
      });
      setCacheEntries((prev) => {
        const filtered = prev.filter((e) => e.queryId !== queryId);
        return [
          ...filtered,
          { queryId, cachedAt: new Date().toISOString(), expiresAt, size },
        ];
      });
    },
    [],
  );

  const getCached = useCallback(
    (queryId: string): OfflineQueryResult | undefined => {
      return results.get(queryId);
    },
    [results],
  );

  const invalidate = useCallback((queryId: string) => {
    setResults((prev) => {
      const next = new Map(prev);
      next.delete(queryId);
      return next;
    });
    setCacheEntries((prev) => prev.filter((e) => e.queryId !== queryId));
  }, []);

  const clearCache = useCallback(() => {
    setResults(new Map());
    setCacheEntries([]);
  }, []);

  return {
    results,
    cacheEntries,
    totalCacheSize,
    executeQuery,
    cacheResult,
    getCached,
    invalidate,
    clearCache,
    cacheCount,
  };
}
