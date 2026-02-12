import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface DrillDownFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface DrillDownState {
  widgetId: string;
  objectName: string;
  filters: DrillDownFilter[];
  dateRange?: { start: string; end: string };
  isFullscreen: boolean;
}

export interface UseDashboardDrillDownResult {
  drillDownState: DrillDownState | null;
  startDrillDown: (
    widgetId: string,
    objectName: string,
    filters: DrillDownFilter[],
  ) => void;
  setDateRange: (start: string, end: string) => void;
  clearDateRange: () => void;
  toggleFullscreen: () => void;
  closeDrillDown: () => void;
  fetchDrillDownData: () => Promise<unknown[]>;
  isLoading: boolean;
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for dashboard widget drill-down with filtering.
 *
 * ```ts
 * const { startDrillDown, fetchDrillDownData, isLoading } = useDashboardDrillDown();
 * startDrillDown("widget-1", "tasks", [{ field: "status", operator: "eq", value: "open" }]);
 * const data = await fetchDrillDownData();
 * ```
 */
export function useDashboardDrillDown(): UseDashboardDrillDownResult {
  const client = useClient();
  const [drillDownState, setDrillDownState] = useState<DrillDownState | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startDrillDown = useCallback(
    (widgetId: string, objectName: string, filters: DrillDownFilter[]) => {
      setDrillDownState({
        widgetId,
        objectName,
        filters,
        isFullscreen: false,
      });
      setError(null);
    },
    [],
  );

  const setDateRange = useCallback((start: string, end: string) => {
    setDrillDownState((prev) =>
      prev ? { ...prev, dateRange: { start, end } } : prev,
    );
  }, []);

  const clearDateRange = useCallback(() => {
    setDrillDownState((prev) => {
      if (!prev) return prev;
      const { dateRange: _, ...rest } = prev;
      return { ...rest, dateRange: undefined };
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    setDrillDownState((prev) =>
      prev ? { ...prev, isFullscreen: !prev.isFullscreen } : prev,
    );
  }, []);

  const closeDrillDown = useCallback(() => {
    setDrillDownState(null);
    setError(null);
  }, []);

  const fetchDrillDownData = useCallback(async (): Promise<unknown[]> => {
    if (!drillDownState) return [];
    setIsLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (client as any).api?.query(
        drillDownState.objectName,
        {
          filters: drillDownState.filters,
          dateRange: drillDownState.dateRange,
        },
      );
      return result ?? [];
    } catch (err: unknown) {
      const drillDownError =
        err instanceof Error ? err : new Error("Failed to fetch drill-down data");
      setError(drillDownError);
      throw drillDownError;
    } finally {
      setIsLoading(false);
    }
  }, [client, drillDownState]);

  return {
    drillDownState,
    startDrillDown,
    setDateRange,
    clearDateRange,
    toggleFullscreen,
    closeDrillDown,
    fetchDrillDownData,
    isLoading,
    error,
  };
}
