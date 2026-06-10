import { useMemo } from "react";
import { useQuery } from "@objectstack/client-react";
import { mongoFilterToAst } from "~/lib/query-builder";
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
/** Upper bound on rows pulled for a client-side field aggregate (sum/avg/…). */
const AGGREGATE_PAGE_SIZE = 500;

/** Widget types that render a chart from `categoryField`-grouped buckets. */
const CHART_TYPES = new Set([
  "bar",
  "column",
  "line",
  "area",
  "donut",
  "pie",
  "funnel",
]);

/** Max category buckets surfaced in a chart (largest first). */
const MAX_CHART_BUCKETS = 8;

/** ISO date / datetime prefix — used to bucket date categories by month. */
const ISO_DATE_RE = /^(\d{4})-(\d{2})/;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Epoch-ms range that denotes a real date timestamp (≈1973 … ≈2286). */
const EPOCH_MS_MIN = 1e11;
const EPOCH_MS_MAX = 1e13;

/** Format a Date into a `{ key: "YYYY-MM", label: "Mon YY" }` month bucket. */
function monthBucket(d: Date): { key: string; label: string } {
  const yyyy = d.getFullYear();
  const mm = d.getMonth();
  const key = `${yyyy}-${String(mm + 1).padStart(2, "0")}`;
  return { key, label: `${MONTH_LABELS[mm]} ${String(yyyy).slice(2)}` };
}

/** Bucket key + display label for a category value (months for date values). */
function categoryKey(value: unknown): { key: string; label: string; isDate: boolean } {
  if (value == null || value === "") return { key: "—", label: "—", isDate: false };

  // Epoch-millisecond timestamp (how date/datetime fields are stored).
  if (typeof value === "number" && value >= EPOCH_MS_MIN && value < EPOCH_MS_MAX) {
    return { ...monthBucket(new Date(value)), isDate: true };
  }

  const str = String(value);
  const m = ISO_DATE_RE.exec(str);
  if (m) {
    const monthIdx = Number(m[2]) - 1;
    const label = `${MONTH_LABELS[monthIdx] ?? m[2]} ${m[1].slice(2)}`;
    return { key: `${m[1]}-${m[2]}`, label, isDate: true };
  }
  return { key: str, label: str, isDate: false };
}

/** Apply an aggregate operator to a bucket's collected numbers. */
function applyAggregate(
  agg: "count" | "sum" | "avg" | "min" | "max",
  nums: number[],
): number {
  if (agg === "count") return nums.length;
  if (nums.length === 0) return 0;
  switch (agg) {
    case "sum":
      return nums.reduce((a, b) => a + b, 0);
    case "avg":
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
    default:
      return nums.reduce((a, b) => a + b, 0);
  }
}

/**
 * Group `records` by `categoryField` and aggregate `valueField` per bucket,
 * producing the `{ label, value }[]` series a chart widget renders.
 *
 * Date categories are bucketed by month and returned in chronological order;
 * categorical buckets are sorted by value (largest first) and capped.
 */
function buildChartData(
  records: Record<string, unknown>[],
  categoryField: string | undefined,
  valueField: string | undefined,
  aggregate: "count" | "sum" | "avg" | "min" | "max",
): Array<{ label: string; value: number }> {
  if (!categoryField || records.length === 0) return [];

  const buckets = new Map<string, { label: string; nums: number[] }>();
  let isDateCategory = false;

  for (const rec of records) {
    const { key, label, isDate } = categoryKey(rec[categoryField]);
    if (isDate) isDateCategory = true;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { label, nums: [] };
      buckets.set(key, bucket);
    }
    if (valueField) {
      const n = Number(rec[valueField]);
      if (!isNaN(n)) bucket.nums.push(n);
    }
  }

  const series = Array.from(buckets.entries()).map(([key, b]) => ({
    key,
    label: b.label,
    value: applyAggregate(aggregate, b.nums),
  }));

  if (isDateCategory) {
    // Chronological order for time series.
    series.sort((a, b) => a.key.localeCompare(b.key));
    return series.map(({ label, value }) => ({ label, value }));
  }

  series.sort((a, b) => b.value - a.value);
  return series.slice(0, MAX_CHART_BUCKETS).map(({ label, value }) => ({ label, value }));
}

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
  const type = widget.type ?? "metric";
  const isList = type === "list" || type === "table";
  const isChart = CHART_TYPES.has(type);
  const isMetric = type === "metric" || type === "kpi";
  // Metrics, field aggregates and charts are all computed client-side from the
  // fetched rows, so they need a wide window: the API's `total` reflects the
  // returned *page* size (top=1 ⇒ total=1), not the full match count, so a
  // single row would undercount. A list shows just one page.
  const top =
    isMetric || isChart || (!!widget.valueField && !!widget.aggregate)
      ? AGGREGATE_PAGE_SIZE
      : isList
        ? DEFAULT_LIST_PAGE_SIZE
        : 1;

  // Metadata filters are Mongo-style objects; translate to the array AST the
  // data API parses (a raw nested object is mangled to `[object Object]`).
  // Stable string key keeps `useQuery` from refetching on every render.
  const filterKey = widget.filter ? JSON.stringify(widget.filter) : "";
  const astFilter = useMemo(
    () => mongoFilterToAst(widget.filter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey],
  );

  const { data, isLoading } = useQuery(widget.object, {
    top,
    filters: astFilter,
    enabled: !!widget.object,
  });

  return useMemo(() => {
    const records: Record<string, unknown>[] = data?.records ?? [];

    if (isLoading) {
      return { isLoading: true };
    }

    switch (type) {
      case "metric":
      case "kpi": {
        // Derive a numeric value from the aggregate hint
        const agg = widget.aggregate ?? "count";
        const field = widget.valueField;
        let value: number | string;

        if (agg === "count") {
          // `total` caps at the fetched page size, so count the rows we pulled.
          value = records.length;
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
          value = records.length;
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

      default: {
        // Chart and other types — group into a `{label,value}[]` series so the
        // renderer can draw a real chart, plus a headline total.
        const agg = widget.aggregate ?? "sum";
        const chartData = buildChartData(
          records,
          widget.categoryField,
          widget.valueField,
          agg,
        );
        const value = chartData.reduce((sum, p) => sum + p.value, 0);
        return {
          records,
          chartData,
          value,
          isLoading: false,
        };
      }
    }
  }, [data, isLoading, widget, type]);
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
