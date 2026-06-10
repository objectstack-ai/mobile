/**
 * Tests for useDashboardData – validates the widget data
 * transformation logic that powers live dashboard widgets.
 */
import { renderHook } from "@testing-library/react-native";

/* ---- Mock useQuery from SDK ---- */
const mockUseQuery = jest.fn();

jest.mock("@objectstack/client-react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { resolveDatasetWidget, useWidgetQuery } from "~/hooks/useDashboardData";
import type {
  DashboardWidgetMeta,
  DatasetMeta,
} from "~/components/renderers/types";

beforeEach(() => {
  mockUseQuery.mockReset();
});

describe("useWidgetQuery", () => {
  it("returns isLoading when query is loading", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: true });
    const widget: DashboardWidgetMeta = {
      name: "w1",
      object: "tasks",
      type: "metric",
    };
    const { result } = renderHook(() => useWidgetQuery(widget));
    expect(result.current.isLoading).toBe(true);
  });

  it("computes count for metric widget (default aggregate)", () => {
    mockUseQuery.mockReturnValue({
      data: { records: [{ id: "1" }, { id: "2" }, { id: "3" }], total: 3 },
      isLoading: false,
    });
    const widget: DashboardWidgetMeta = {
      name: "total",
      object: "tasks",
      type: "metric",
    };
    const { result } = renderHook(() => useWidgetQuery(widget));
    expect(result.current.value).toBe(3);
    expect(result.current.isLoading).toBe(false);
  });

  it("computes sum for metric widget with valueField", () => {
    mockUseQuery.mockReturnValue({
      data: {
        records: [
          { id: "1", amount: 10 },
          { id: "2", amount: 20 },
          { id: "3", amount: 30 },
        ],
        total: 3,
      },
      isLoading: false,
    });
    const widget: DashboardWidgetMeta = {
      name: "total_amount",
      object: "orders",
      type: "metric",
      aggregate: "sum",
      valueField: "amount",
    };
    const { result } = renderHook(() => useWidgetQuery(widget));
    expect(result.current.value).toBe(60);
  });

  it("computes avg for metric widget with valueField", () => {
    mockUseQuery.mockReturnValue({
      data: {
        records: [
          { id: "1", score: 80 },
          { id: "2", score: 100 },
        ],
      },
      isLoading: false,
    });
    const widget: DashboardWidgetMeta = {
      name: "avg_score",
      object: "reviews",
      type: "metric",
      aggregate: "avg",
      valueField: "score",
    };
    const { result } = renderHook(() => useWidgetQuery(widget));
    expect(result.current.value).toBe(90);
  });

  it("returns records for list widget", () => {
    const records = [{ id: "1", name: "A" }, { id: "2", name: "B" }];
    mockUseQuery.mockReturnValue({
      data: { records },
      isLoading: false,
    });
    const widget: DashboardWidgetMeta = {
      name: "recent",
      object: "tasks",
      type: "list",
    };
    const { result } = renderHook(() => useWidgetQuery(widget));
    expect(result.current.records).toEqual(records);
    expect(result.current.isLoading).toBe(false);
  });

  it("returns card data from first record", () => {
    mockUseQuery.mockReturnValue({
      data: { records: [{ id: "1", name: "Active Users", label: "Today" }] },
      isLoading: false,
    });
    const widget: DashboardWidgetMeta = {
      name: "active_card",
      object: "stats",
      type: "card",
      valueField: "name",
      categoryField: "label",
    };
    const { result } = renderHook(() => useWidgetQuery(widget));
    expect(result.current.value).toBe("Active Users");
    expect(result.current.label).toBe("Today");
  });

  it("computes min/max for metric widget", () => {
    mockUseQuery.mockReturnValue({
      data: {
        records: [
          { id: "1", price: 5 },
          { id: "2", price: 50 },
          { id: "3", price: 15 },
        ],
      },
      isLoading: false,
    });
    const minWidget: DashboardWidgetMeta = {
      name: "min_price",
      object: "products",
      type: "kpi",
      aggregate: "min",
      valueField: "price",
    };
    const maxWidget: DashboardWidgetMeta = {
      name: "max_price",
      object: "products",
      type: "kpi",
      aggregate: "max",
      valueField: "price",
    };
    const { result: minResult } = renderHook(() => useWidgetQuery(minWidget));
    expect(minResult.current.value).toBe(5);
    const { result: maxResult } = renderHook(() => useWidgetQuery(maxWidget));
    expect(maxResult.current.value).toBe(50);
  });

  it("returns a terminal empty state (never loading) when there is no object", () => {
    // A dataset widget whose metadata failed to resolve leaves `object`
    // undefined; `useQuery` is disabled and its `isLoading` stays true forever,
    // so the hook must short-circuit rather than spin.
    mockUseQuery.mockReturnValue({ data: null, isLoading: true });
    const widget: DashboardWidgetMeta = { name: "orphan", type: "metric" };
    const { result } = renderHook(() => useWidgetQuery(widget));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.value).toBeUndefined();
  });

  it("counts rows per bucket for a count-aggregate chart (no valueField)", () => {
    // The common dataset case: a `count` measure has no source field, so chart
    // buckets must count rows — not aggregate an absent value field (→ all 0).
    mockUseQuery.mockReturnValue({
      data: {
        records: [
          { id: "1", status: "open" },
          { id: "2", status: "open" },
          { id: "3", status: "done" },
        ],
      },
      isLoading: false,
    });
    const widget: DashboardWidgetMeta = {
      name: "by_status",
      object: "tasks",
      type: "bar",
      aggregate: "count",
      categoryField: "status",
    };
    const { result } = renderHook(() => useWidgetQuery(widget));
    const series = result.current.chartData ?? [];
    const open = series.find((p) => p.label === "open");
    const done = series.find((p) => p.label === "done");
    expect(open?.value).toBe(2);
    expect(done?.value).toBe(1);
  });
});

describe("resolveDatasetWidget", () => {
  const dataset: DatasetMeta = {
    name: "task_metrics",
    object: "todo_task",
    dimensions: [{ name: "status", field: "status", type: "string" }],
    measures: [
      { name: "task_count", aggregate: "count" },
      { name: "est_hours", aggregate: "sum", field: "estimated_hours", format: "0.0" },
    ],
  };

  it("passes a non-dataset widget through unchanged", () => {
    const widget: DashboardWidgetMeta = { name: "w", object: "tasks", type: "metric" };
    expect(resolveDatasetWidget(widget, undefined)).toBe(widget);
  });

  it("resolves a count-measure metric to the base object", () => {
    const widget: DashboardWidgetMeta = {
      name: "total",
      type: "metric",
      dataset: "task_metrics",
      values: ["task_count"],
      layout: { w: 3 },
      options: { color: "#3B82F6" },
    };
    const resolved = resolveDatasetWidget(widget, dataset);
    expect(resolved.object).toBe("todo_task");
    expect(resolved.aggregate).toBe("count");
    // A count measure has no source field — counts rows instead.
    expect(resolved.valueField).toBeUndefined();
    expect(resolved.span).toBe(1);
    expect(resolved.chartConfig?.colors).toEqual(["#3B82F6"]);
  });

  it("resolves a sum measure + dimension and maps a wide layout to span 2", () => {
    const widget: DashboardWidgetMeta = {
      name: "hours_by_status",
      type: "bar",
      dataset: "task_metrics",
      values: ["est_hours"],
      dimensions: ["status"],
      layout: { w: 8 },
    };
    const resolved = resolveDatasetWidget(widget, dataset);
    expect(resolved.object).toBe("todo_task");
    expect(resolved.aggregate).toBe("sum");
    expect(resolved.valueField).toBe("estimated_hours");
    expect(resolved.categoryField).toBe("status");
    expect(resolved.span).toBe(2);
    expect(resolved.chartConfig?.format).toBe("0.0");
  });
});
