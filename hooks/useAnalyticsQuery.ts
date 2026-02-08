import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AnalyticsQueryParams {
  /** Metric / event name or object to query */
  metric: string;
  /** Grouping dimension (e.g. "status", "createdAt") */
  groupBy?: string;
  /** Aggregation function */
  aggregate?: "count" | "sum" | "avg" | "min" | "max";
  /** Field to aggregate on */
  field?: string;
  /** Filter conditions */
  filter?: Record<string, unknown>;
  /** Date range start (ISO 8601) */
  startDate?: string;
  /** Date range end (ISO 8601) */
  endDate?: string;
  /** Maximum number of result rows */
  limit?: number;
  /** Whether the query is enabled */
  enabled?: boolean;
}

export interface AnalyticsDataPoint {
  label: string;
  value: number;
  [key: string]: unknown;
}

export interface AnalyticsQueryResult {
  data: AnalyticsDataPoint[];
  total?: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for querying analytics data via `client.analytics.query()`.
 *
 * Wraps the SDK analytics API with React state management, loading
 * indicators, and error handling.
 *
 * ```ts
 * const { data, isLoading } = useAnalyticsQuery({
 *   metric: "orders",
 *   groupBy: "status",
 *   aggregate: "count",
 * });
 * ```
 */
export function useAnalyticsQuery(params: AnalyticsQueryParams): AnalyticsQueryResult {
  const client = useClient();
  const [data, setData] = useState<AnalyticsDataPoint[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const enabled = params.enabled !== false;

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      const analytics = (client as any).analytics;
      if (!analytics?.query) {
        throw new Error("client.analytics.query() is not available");
      }

      const response = await analytics.query({
        metric: params.metric,
        groupBy: params.groupBy,
        aggregate: params.aggregate,
        field: params.field,
        filter: params.filter,
        startDate: params.startDate,
        endDate: params.endDate,
        limit: params.limit,
      });

      const rows: AnalyticsDataPoint[] = Array.isArray(response)
        ? response
        : response?.data ?? response?.rows ?? response?.results ?? [];

      setData(rows);
      setTotal(response?.total ?? rows.reduce((sum: number, r: AnalyticsDataPoint) => sum + (r.value ?? 0), 0));
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error("Analytics query failed"));
    } finally {
      setIsLoading(false);
    }
  }, [
    client,
    enabled,
    params.metric,
    params.groupBy,
    params.aggregate,
    params.field,
    params.filter,
    params.startDate,
    params.endDate,
    params.limit,
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, total, isLoading, error, refetch: fetchData };
}
