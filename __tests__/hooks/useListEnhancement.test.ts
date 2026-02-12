/**
 * Tests for useListEnhancement – validates density toggle,
 * record count, view tabs, and row height calculation.
 */
import { renderHook, act } from "@testing-library/react-native";

jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useListEnhancement } from "~/hooks/useListEnhancement";

describe("useListEnhancement", () => {
  it("defaults to comfortable density", () => {
    const { result } = renderHook(() => useListEnhancement());

    expect(result.current.density).toBe("comfortable");
    expect(result.current.recordCount).toBeNull();
    expect(result.current.activeViewTab).toBeNull();
  });

  it("setDensity updates density", () => {
    const { result } = renderHook(() => useListEnhancement());

    act(() => {
      result.current.setDensity("compact");
    });
    expect(result.current.density).toBe("compact");

    act(() => {
      result.current.setDensity("spacious");
    });
    expect(result.current.density).toBe("spacious");
  });

  it("getRowHeight returns correct height for compact", () => {
    const { result } = renderHook(() => useListEnhancement());

    act(() => {
      result.current.setDensity("compact");
    });
    expect(result.current.getRowHeight()).toBe(48);
  });

  it("getRowHeight returns correct height for comfortable", () => {
    const { result } = renderHook(() => useListEnhancement());

    expect(result.current.getRowHeight()).toBe(64);
  });

  it("getRowHeight returns correct height for spacious", () => {
    const { result } = renderHook(() => useListEnhancement());

    act(() => {
      result.current.setDensity("spacious");
    });
    expect(result.current.getRowHeight()).toBe(80);
  });

  it("setRecordCount updates record count", () => {
    const { result } = renderHook(() => useListEnhancement());

    act(() => {
      result.current.setRecordCount(42);
    });
    expect(result.current.recordCount).toBe(42);

    act(() => {
      result.current.setRecordCount(null);
    });
    expect(result.current.recordCount).toBeNull();
  });

  it("setActiveViewTab updates the active tab", () => {
    const { result } = renderHook(() => useListEnhancement());

    act(() => {
      result.current.setActiveViewTab("view-1");
    });
    expect(result.current.activeViewTab).toBe("view-1");

    act(() => {
      result.current.setActiveViewTab(null);
    });
    expect(result.current.activeViewTab).toBeNull();
  });
});
