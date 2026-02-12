/**
 * Tests for useDashboardDrillDown – validates dashboard widget
 * drill-down with filtering and data fetching.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockQuery = jest.fn();

const mockClient = {
  api: { query: mockQuery },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useDashboardDrillDown } from "~/hooks/useDashboardDrillDown";

beforeEach(() => {
  mockQuery.mockReset();
});

describe("useDashboardDrillDown", () => {
  it("starts with null drill-down state", () => {
    const { result } = renderHook(() => useDashboardDrillDown());
    expect(result.current.drillDownState).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("startDrillDown sets state correctly", () => {
    const { result } = renderHook(() => useDashboardDrillDown());
    const filters = [{ field: "status", operator: "eq", value: "open" }];

    act(() => {
      result.current.startDrillDown("widget-1", "tasks", filters);
    });

    expect(result.current.drillDownState).toEqual({
      widgetId: "widget-1",
      objectName: "tasks",
      filters,
      isFullscreen: false,
    });
  });

  it("setDateRange updates the date range", () => {
    const { result } = renderHook(() => useDashboardDrillDown());

    act(() => {
      result.current.startDrillDown("w1", "tasks", []);
    });
    act(() => {
      result.current.setDateRange("2026-01-01", "2026-01-31");
    });

    expect(result.current.drillDownState?.dateRange).toEqual({
      start: "2026-01-01",
      end: "2026-01-31",
    });
  });

  it("clearDateRange removes the date range", () => {
    const { result } = renderHook(() => useDashboardDrillDown());

    act(() => {
      result.current.startDrillDown("w1", "tasks", []);
    });
    act(() => {
      result.current.setDateRange("2026-01-01", "2026-01-31");
    });
    act(() => {
      result.current.clearDateRange();
    });

    expect(result.current.drillDownState?.dateRange).toBeUndefined();
  });

  it("toggleFullscreen toggles fullscreen state", () => {
    const { result } = renderHook(() => useDashboardDrillDown());

    act(() => {
      result.current.startDrillDown("w1", "tasks", []);
    });

    expect(result.current.drillDownState?.isFullscreen).toBe(false);

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(result.current.drillDownState?.isFullscreen).toBe(true);

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(result.current.drillDownState?.isFullscreen).toBe(false);
  });

  it("closeDrillDown clears state", () => {
    const { result } = renderHook(() => useDashboardDrillDown());

    act(() => {
      result.current.startDrillDown("w1", "tasks", []);
    });
    act(() => {
      result.current.closeDrillDown();
    });

    expect(result.current.drillDownState).toBeNull();
  });

  it("fetchDrillDownData queries and returns results", async () => {
    const data = [{ id: "1", name: "Task 1" }];
    mockQuery.mockResolvedValue(data);

    const { result } = renderHook(() => useDashboardDrillDown());
    const filters = [{ field: "status", operator: "eq", value: "open" }];

    act(() => {
      result.current.startDrillDown("w1", "tasks", filters);
    });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.fetchDrillDownData();
    });

    expect(mockQuery).toHaveBeenCalledWith("tasks", {
      filters,
      dateRange: undefined,
    });
    expect(returned).toEqual(data);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetchDrillDownData returns empty array when no state", async () => {
    const { result } = renderHook(() => useDashboardDrillDown());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.fetchDrillDownData();
    });

    expect(returned).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("handles fetchDrillDownData error", async () => {
    mockQuery.mockRejectedValue(new Error("Query failed"));

    const { result } = renderHook(() => useDashboardDrillDown());

    act(() => {
      result.current.startDrillDown("w1", "tasks", []);
    });

    await act(async () => {
      await expect(result.current.fetchDrillDownData()).rejects.toThrow(
        "Query failed",
      );
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Query failed");
  });
});
