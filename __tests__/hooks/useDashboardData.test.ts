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

import { useWidgetQuery } from "~/hooks/useDashboardData";
import type { DashboardWidgetMeta } from "~/components/renderers/types";

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
});
