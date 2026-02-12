/**
 * Tests for useChartInteraction – validates chart interaction
 * state management including drill-down and zoom.
 */
import { renderHook, act } from "@testing-library/react-native";

jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useChartInteraction, ChartDataPoint } from "~/hooks/useChartInteraction";

describe("useChartInteraction", () => {
  const point1: ChartDataPoint = { label: "Q1", value: 100 };
  const point2: ChartDataPoint = { label: "Q2", value: 200 };
  const point3: ChartDataPoint = { label: "January", value: 50, metadata: { month: 1 } };

  it("starts with default state", () => {
    const { result } = renderHook(() => useChartInteraction());
    expect(result.current.selectedPoint).toBeNull();
    expect(result.current.drillDownStack).toEqual([]);
    expect(result.current.zoomLevel).toBe(1);
    expect(result.current.isAnimating).toBe(false);
  });

  it("selectPoint highlights a data point", () => {
    const { result } = renderHook(() => useChartInteraction());

    act(() => {
      result.current.selectPoint(point1);
    });

    expect(result.current.selectedPoint).toEqual(point1);
  });

  it("selectPoint with null clears selection", () => {
    const { result } = renderHook(() => useChartInteraction());

    act(() => {
      result.current.selectPoint(point1);
    });
    act(() => {
      result.current.selectPoint(null);
    });

    expect(result.current.selectedPoint).toBeNull();
  });

  it("drillDown pushes onto drill-down stack", () => {
    const { result } = renderHook(() => useChartInteraction());

    act(() => {
      result.current.drillDown(point1);
    });

    expect(result.current.drillDownStack).toEqual([point1]);
    expect(result.current.selectedPoint).toEqual(point1);

    act(() => {
      result.current.drillDown(point3);
    });

    expect(result.current.drillDownStack).toEqual([point1, point3]);
    expect(result.current.selectedPoint).toEqual(point3);
  });

  it("goBack pops from drill-down stack", () => {
    const { result } = renderHook(() => useChartInteraction());

    act(() => {
      result.current.drillDown(point1);
    });
    act(() => {
      result.current.drillDown(point2);
    });

    expect(result.current.drillDownStack).toEqual([point1, point2]);

    act(() => {
      result.current.goBack();
    });

    expect(result.current.drillDownStack).toEqual([point1]);
    expect(result.current.selectedPoint).toEqual(point1);

    act(() => {
      result.current.goBack();
    });

    expect(result.current.drillDownStack).toEqual([]);
    expect(result.current.selectedPoint).toBeNull();
  });

  it("goBack on empty stack is a no-op", () => {
    const { result } = renderHook(() => useChartInteraction());

    act(() => {
      result.current.goBack();
    });

    expect(result.current.drillDownStack).toEqual([]);
    expect(result.current.selectedPoint).toBeNull();
  });

  it("setZoomLevel updates zoom", () => {
    const { result } = renderHook(() => useChartInteraction());

    act(() => {
      result.current.setZoomLevel(3);
    });

    expect(result.current.zoomLevel).toBe(3);
  });

  it("setIsAnimating updates animation state", () => {
    const { result } = renderHook(() => useChartInteraction());

    act(() => {
      result.current.setIsAnimating(true);
    });

    expect(result.current.isAnimating).toBe(true);

    act(() => {
      result.current.setIsAnimating(false);
    });

    expect(result.current.isAnimating).toBe(false);
  });
});
