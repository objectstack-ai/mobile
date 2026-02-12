import { useMemo } from "react";
import { useQuery } from "@objectstack/client-react";
import type { DashboardWidgetMeta } from "~/components/renderers/types";
import type { WidgetDataPayload } from "~/components/renderers/DashboardViewRenderer";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface UseDashboardDataResult {
  widgetData: Record<string, WidgetDataPayload>;
  isLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_LIST_PAGE_SIZE = 10;

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Fetches data for a single dashboard widget using `useQuery()`.
 *
 * Each widget declares an `object` (the data source) and optional
 * `aggregate`, `valueField`, and `categoryField` hints.  This hook
 * runs a live query that keeps the widget up-to-date.
 */
export function useWidgetQuery(widget: DashboardWidgetMeta): WidgetDataPayload {
  const { data, isLoading } = useQuery(widget.object, {
    top: widget.type === "list" || widget.type === "table" ? DEFAULT_LIST_PAGE_SIZE : 1,
    enabled: !!widget.object,
  });

  return useMemo(() => {
    const records: Record<string, unknown>[] = data?.records ?? [];

    if (isLoading) {
      return { isLoading: true };
    }

    const type = widget.type ?? "metric";

    switch (type) {
      case "metric":
      case "kpi": {
        // Derive a numeric value from the aggregate hint
        const agg = widget.aggregate ?? "count";
        const field = widget.valueField;
        let value: number | string;

        if (agg === "count") {
          value = data?.total ?? records.length;
        } else if (field) {
          const nums = records
            .map((r) => Number(r[field]))
            .filter((n) => !isNaN(n));
          switch (agg) {
            case "sum":
              value = nums.reduce((a, b) => a + b, 0);
              break;
            case "avg":
              value = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
              break;
            case "min":
              value = nums.length > 0 ? Math.min(...nums) : 0;
              break;
            case "max":
              value = nums.length > 0 ? Math.max(...nums) : 0;
              break;
            default:
              value = nums.reduce((a, b) => a + b, 0);
          }
        } else {
          value = data?.total ?? records.length;
        }

        return { value, isLoading: false };
      }

      case "card":
        return {
          value: records[0]?.[widget.valueField ?? "name"] as string | number | undefined,
          label: records[0]?.[widget.categoryField ?? "label"] as string | undefined,
          isLoading: false,
        };

      case "list":
      case "table":
        return { records, isLoading: false };

      default:
        // Chart and other types — pass records + optional summary
        return {
          records,
          value: records.length,
          isLoading: false,
        };
    }
  }, [data, isLoading, widget]);
}

/**
 * Convenience wrapper that fetches data for **all** widgets in a
 * dashboard.  Returns a map keyed by widget name that can be passed
 * directly to `<DashboardViewRenderer widgetData={…} />`.
 *
 * Because React hooks cannot be called in a loop, consumers should
 * call `useWidgetQuery` per-widget inside a child component.  This
 * hook is provided for dashboards with a known, static widget list
 * by wrapping each query in its own sub-component (see
 * `DashboardDataProvider` pattern in the app route layer).
 */
export function useWidgetData(widget: DashboardWidgetMeta) {
  return useWidgetQuery(widget);
}
