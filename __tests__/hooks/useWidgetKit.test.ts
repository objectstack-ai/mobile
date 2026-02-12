/**
 * Tests for useWidgetKit – validates widget registration,
 * update, removal, and refresh.
 */
import { renderHook, act } from "@testing-library/react-native";

import { useWidgetKit, type WidgetData } from "~/hooks/useWidgetKit";

const makeWidget = (overrides?: Partial<WidgetData>): WidgetData => ({
  id: "w-1",
  type: "kpi",
  title: "Revenue",
  data: { value: 1000 },
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("useWidgetKit", () => {
  it("starts with empty widgets and not loading", () => {
    const { result } = renderHook(() => useWidgetKit());

    expect(result.current.widgets).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSupported).toBe(false);
  });

  it("registerWidget adds a new widget", () => {
    const { result } = renderHook(() => useWidgetKit());
    const widget = makeWidget();

    act(() => {
      result.current.registerWidget(widget);
    });

    expect(result.current.widgets).toHaveLength(1);
    expect(result.current.widgets[0].id).toBe("w-1");
  });

  it("registerWidget updates existing widget with same id", () => {
    const { result } = renderHook(() => useWidgetKit());

    act(() => {
      result.current.registerWidget(makeWidget());
    });

    act(() => {
      result.current.registerWidget(makeWidget({ title: "Updated Revenue" }));
    });

    expect(result.current.widgets).toHaveLength(1);
    expect(result.current.widgets[0].title).toBe("Updated Revenue");
  });

  it("updateWidget merges data for matching id", () => {
    const { result } = renderHook(() => useWidgetKit());

    act(() => {
      result.current.registerWidget(makeWidget());
    });

    act(() => {
      result.current.updateWidget("w-1", { value: 2000, trend: "up" });
    });

    expect(result.current.widgets[0].data.value).toBe(2000);
    expect(result.current.widgets[0].data.trend).toBe("up");
  });

  it("removeWidget removes by id", () => {
    const { result } = renderHook(() => useWidgetKit());

    act(() => {
      result.current.registerWidget(makeWidget({ id: "w-1" }));
      result.current.registerWidget(makeWidget({ id: "w-2", title: "Leads" }));
    });

    act(() => {
      result.current.removeWidget("w-1");
    });

    expect(result.current.widgets).toHaveLength(1);
    expect(result.current.widgets[0].id).toBe("w-2");
  });

  it("refreshAll updates timestamps on all widgets", async () => {
    const { result } = renderHook(() => useWidgetKit());

    act(() => {
      result.current.registerWidget(makeWidget());
    });

    const before = result.current.widgets[0].updatedAt;

    await act(async () => {
      await result.current.refreshAll();
    });

    expect(result.current.widgets[0].updatedAt).not.toBe(before);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
