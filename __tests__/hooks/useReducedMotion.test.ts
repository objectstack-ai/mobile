/**
 * Tests for useReducedMotion — respect user's reduced motion preference
 */
import { renderHook, act } from "@testing-library/react-native";
import { useReducedMotion } from "~/hooks/useReducedMotion";

describe("useReducedMotion", () => {
  it("starts with reduced motion disabled", () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current.isReducedMotion).toBe(false);
    expect(result.current.shouldAnimate).toBe(true);
  });

  it("setReducedMotion enables reduced motion", () => {
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      result.current.setReducedMotion(true);
    });

    expect(result.current.isReducedMotion).toBe(true);
    expect(result.current.shouldAnimate).toBe(false);
  });

  it("setReducedMotion can disable reduced motion", () => {
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      result.current.setReducedMotion(true);
    });
    act(() => {
      result.current.setReducedMotion(false);
    });

    expect(result.current.isReducedMotion).toBe(false);
    expect(result.current.shouldAnimate).toBe(true);
  });

  it("getAnimationDuration returns baseDuration when not reduced", () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current.getAnimationDuration(300)).toBe(300);
    expect(result.current.getAnimationDuration(500)).toBe(500);
  });

  it("getAnimationDuration returns 0 when reduced", () => {
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      result.current.setReducedMotion(true);
    });

    expect(result.current.getAnimationDuration(300)).toBe(0);
    expect(result.current.getAnimationDuration(500)).toBe(0);
  });

  it("getTransitionConfig returns full duration when not reduced", () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current.getTransitionConfig()).toEqual({
      duration: 300,
      useNativeDriver: true,
    });
  });

  it("getTransitionConfig returns zero duration when reduced", () => {
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      result.current.setReducedMotion(true);
    });

    expect(result.current.getTransitionConfig()).toEqual({
      duration: 0,
      useNativeDriver: true,
    });
  });
});
