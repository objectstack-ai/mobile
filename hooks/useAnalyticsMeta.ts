import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AnalyticsMetric {
  name: string;
  label?: string;
  description?: string;
  type?: string;
  fields?: string[];
  aggregates?: string[];
}

export interface AnalyticsMetaResult {
  /** Available analytics metrics / event types */
  metrics: AnalyticsMetric[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for fetching analytics metadata via `client.analytics.meta()`.
 *
 * Returns the list of available metrics, dimensions, and aggregation
 * options that can be passed to `useAnalyticsQuery()`.
 *
 * ```ts
 * const { metrics, isLoading } = useAnalyticsMeta();
 * ```
 */
export function useAnalyticsMeta(): AnalyticsMetaResult {
  const client = useClient();
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMeta = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analytics = (client as any).analytics;
      if (!analytics?.meta) {
        throw new Error("client.analytics.meta() is not available");
      }

      const response = await analytics.meta();

      const items: AnalyticsMetric[] = Array.isArray(response)
        ? response
        : response?.metrics ?? response?.data ?? [];

      setMetrics(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error("Failed to fetch analytics metadata"));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  return { metrics, isLoading, error, refetch: fetchMeta };
}
