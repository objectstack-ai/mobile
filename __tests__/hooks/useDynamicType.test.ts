/**
 * Tests for useDynamicType — dynamic type / text scaling support
 */
import { renderHook, act } from "@testing-library/react-native";
import { useDynamicType } from "~/hooks/useDynamicType";

describe("useDynamicType", () => {
  it("starts with scale 1.0 and base category", () => {
    const { result } = renderHook(() => useDynamicType());

    expect(result.current.scale).toBe(1.0);
    expect(result.current.textScaleCategory).toBe("base");
    expect(result.current.isLargeText).toBe(false);
  });

  it("setScale updates scale value", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(1.5);
    });

    expect(result.current.scale).toBe(1.5);
  });

  it("clamps scale to minimum 0.8", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(0.5);
    });

    expect(result.current.scale).toBe(0.8);
  });

  it("clamps scale to maximum 2.0", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(3.0);
    });

    expect(result.current.scale).toBe(2.0);
  });

  it("getScaledSize multiplies base by scale", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(1.5);
    });

    expect(result.current.getScaledSize(16)).toBe(24);
    expect(result.current.getScaledSize(12)).toBe(18);
  });

  it("getScaledSize rounds the result", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(1.1);
    });

    // 16 * 1.1 = 17.6 → 18
    expect(result.current.getScaledSize(16)).toBe(18);
  });

  it("derives xs category for scale < 0.85", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(0.8);
    });

    expect(result.current.textScaleCategory).toBe("xs");
  });

  it("derives sm category for scale 0.85–0.95", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(0.9);
    });

    expect(result.current.textScaleCategory).toBe("sm");
  });

  it("derives lg category for scale 1.1–1.3", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(1.2);
    });

    expect(result.current.textScaleCategory).toBe("lg");
  });

  it("derives xl category for scale 1.3–1.5", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(1.4);
    });

    expect(result.current.textScaleCategory).toBe("xl");
  });

  it("derives 2xl category for scale 1.5–1.8", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(1.6);
    });

    expect(result.current.textScaleCategory).toBe("2xl");
  });

  it("derives 3xl category for scale >= 1.8", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(1.9);
    });

    expect(result.current.textScaleCategory).toBe("3xl");
  });

  it("isLargeText is true when scale >= 1.3", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(1.3);
    });

    expect(result.current.isLargeText).toBe(true);
  });

  it("isLargeText is false when scale < 1.3", () => {
    const { result } = renderHook(() => useDynamicType());

    act(() => {
      result.current.setScale(1.29);
    });

    expect(result.current.isLargeText).toBe(false);
  });
});
