/**
 * Tests for useGestureProtocol – validates gesture registration,
 * unregistration, active gesture tracking, and touch-target configuration.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useGestureProtocol, GestureConfig } from "~/hooks/useGestureProtocol";

const swipeLeft: GestureConfig = {
  type: "swipe",
  enabled: true,
  swipe: { direction: "left", threshold: 50, velocity: 0.3 },
};

const pinchZoom: GestureConfig = {
  type: "pinch",
  enabled: true,
  pinch: { minScale: 0.5, maxScale: 3 },
};

describe("useGestureProtocol", () => {
  it("returns default initial state", () => {
    const { result } = renderHook(() => useGestureProtocol());

    expect(result.current.gestures.size).toBe(0);
    expect(result.current.activeGesture).toBeNull();
    expect(result.current.touchTargetConfig).toEqual({ minSize: 44, padding: 8 });
    expect(result.current.activeGestureIds).toEqual([]);
  });

  it("registers and retrieves a gesture", () => {
    const { result } = renderHook(() => useGestureProtocol());

    act(() => {
      result.current.registerGesture("swipeLeft", swipeLeft);
    });

    expect(result.current.gestures.size).toBe(1);
    expect(result.current.getGesture("swipeLeft")).toEqual(swipeLeft);
    expect(result.current.activeGestureIds).toEqual(["swipeLeft"]);
  });

  it("replaces an existing gesture config", () => {
    const { result } = renderHook(() => useGestureProtocol());

    act(() => {
      result.current.registerGesture("swipeLeft", swipeLeft);
    });

    const updated: GestureConfig = { ...swipeLeft, enabled: false };

    act(() => {
      result.current.registerGesture("swipeLeft", updated);
    });

    expect(result.current.gestures.size).toBe(1);
    expect(result.current.getGesture("swipeLeft")!.enabled).toBe(false);
  });

  it("unregisters a gesture", () => {
    const { result } = renderHook(() => useGestureProtocol());

    act(() => {
      result.current.registerGesture("swipeLeft", swipeLeft);
      result.current.registerGesture("pinch", pinchZoom);
    });

    act(() => {
      result.current.unregisterGesture("swipeLeft");
    });

    expect(result.current.gestures.size).toBe(1);
    expect(result.current.getGesture("swipeLeft")).toBeUndefined();
    expect(result.current.activeGestureIds).toEqual(["pinch"]);
  });

  it("sets and clears active gesture", () => {
    const { result } = renderHook(() => useGestureProtocol());

    act(() => {
      result.current.setActiveGesture("swipeLeft");
    });

    expect(result.current.activeGesture).toBe("swipeLeft");

    act(() => {
      result.current.setActiveGesture(null);
    });

    expect(result.current.activeGesture).toBeNull();
  });

  it("updates touch target configuration", () => {
    const { result } = renderHook(() => useGestureProtocol());

    act(() => {
      result.current.setTouchTargetConfig({ minSize: 48, padding: 12 });
    });

    expect(result.current.touchTargetConfig).toEqual({ minSize: 48, padding: 12 });
  });

  it("returns undefined for unregistered gesture id", () => {
    const { result } = renderHook(() => useGestureProtocol());

    expect(result.current.getGesture("nonexistent")).toBeUndefined();
  });

  it("tracks multiple gesture ids in registration order", () => {
    const { result } = renderHook(() => useGestureProtocol());

    act(() => {
      result.current.registerGesture("swipeLeft", swipeLeft);
      result.current.registerGesture("pinch", pinchZoom);
    });

    expect(result.current.activeGestureIds).toEqual(["swipeLeft", "pinch"]);
  });
});
