import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface WidgetData {
  id: string;
  type: "kpi" | "recent-items" | "favorites" | "notifications";
  title: string;
  data: Record<string, unknown>;
  updatedAt: string;
}

export interface UseWidgetKitResult {
  /** Registered widgets */
  widgets: WidgetData[];
  /** Register a new widget */
  registerWidget: (widget: WidgetData) => void;
  /** Update data for an existing widget */
  updateWidget: (id: string, data: Record<string, unknown>) => void;
  /** Remove a widget by id */
  removeWidget: (id: string) => void;
  /** Refresh all widget data */
  refreshAll: () => Promise<void>;
  /** Whether native WidgetKit is supported */
  isSupported: boolean;
  /** Whether a refresh is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for Widget Kit bridge to iOS/Android home screen widgets.
 * Manages widget data that would be passed to native WidgetKit / AppWidgets.
 *
 * ```ts
 * const { widgets, registerWidget, updateWidget, refreshAll } = useWidgetKit();
 * ```
 */
export function useWidgetKit(): UseWidgetKitResult {
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const registerWidget = useCallback((widget: WidgetData) => {
    setWidgets((prev) => {
      const exists = prev.some((w) => w.id === widget.id);
      if (exists) return prev.map((w) => (w.id === widget.id ? widget : w));
      return [...prev, widget];
    });
  }, []);

  const updateWidget = useCallback(
    (id: string, data: Record<string, unknown>) => {
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === id
            ? { ...w, data: { ...w.data, ...data }, updatedAt: new Date().toISOString() }
            : w,
        ),
      );
    },
    [],
  );

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate widget data refresh – in production this would
      // push data to native WidgetKit / AppWidgets bridge.
      setWidgets((prev) =>
        prev.map((w) => ({ ...w, updatedAt: new Date().toISOString() })),
      );
    } catch (err: unknown) {
      const refreshError =
        err instanceof Error ? err : new Error("Failed to refresh widgets");
      setError(refreshError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    widgets,
    registerWidget,
    updateWidget,
    removeWidget,
    refreshAll,
    isSupported: false,
    isLoading,
    error,
  };
}
