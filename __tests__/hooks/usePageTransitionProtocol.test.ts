/**
 * Tests for usePageTransitionProtocol – validates default transition,
 * preset registration, preset application, and current transition tracking.
 */
import { renderHook, act } from "@testing-library/react-native";
import { usePageTransitionProtocol, PageTransitionConfig } from "~/hooks/usePageTransitionProtocol";

const slideRight: PageTransitionConfig = {
  type: "slide",
  direction: "right",
  duration: 250,
  easing: "ease-out",
};

const modalUp: PageTransitionConfig = {
  type: "modal",
  direction: "up",
  duration: 350,
  easing: "ease-in-out",
};

describe("usePageTransitionProtocol", () => {
  it("returns default initial state", () => {
    const { result } = renderHook(() => usePageTransitionProtocol());

    expect(result.current.defaultTransition).toEqual({
      type: "fade",
      duration: 300,
      easing: "ease-in-out",
    });
    expect(result.current.currentTransition).toEqual(result.current.defaultTransition);
    expect(result.current.presets.size).toBe(0);
    expect(result.current.presetNames).toEqual([]);
  });

  it("sets a custom default transition", () => {
    const { result } = renderHook(() => usePageTransitionProtocol());

    act(() => {
      result.current.setDefaultTransition(slideRight);
    });

    expect(result.current.defaultTransition).toEqual(slideRight);
  });

  it("registers and retrieves a preset", () => {
    const { result } = renderHook(() => usePageTransitionProtocol());

    act(() => {
      result.current.registerPreset("slideRight", slideRight);
    });

    expect(result.current.presets.size).toBe(1);
    expect(result.current.getPreset("slideRight")).toEqual({
      name: "slideRight",
      config: slideRight,
    });
    expect(result.current.presetNames).toEqual(["slideRight"]);
  });

  it("removes a preset", () => {
    const { result } = renderHook(() => usePageTransitionProtocol());

    act(() => {
      result.current.registerPreset("slideRight", slideRight);
      result.current.registerPreset("modalUp", modalUp);
    });

    act(() => {
      result.current.removePreset("slideRight");
    });

    expect(result.current.presets.size).toBe(1);
    expect(result.current.getPreset("slideRight")).toBeUndefined();
    expect(result.current.presetNames).toEqual(["modalUp"]);
  });

  it("applies a preset as the current transition", () => {
    const { result } = renderHook(() => usePageTransitionProtocol());

    act(() => {
      result.current.registerPreset("slideRight", slideRight);
    });

    act(() => {
      result.current.applyPreset("slideRight");
    });

    expect(result.current.currentTransition).toEqual(slideRight);
  });

  it("applyPreset does nothing for unknown preset", () => {
    const { result } = renderHook(() => usePageTransitionProtocol());

    const before = result.current.currentTransition;

    act(() => {
      result.current.applyPreset("nonexistent");
    });

    expect(result.current.currentTransition).toEqual(before);
  });

  it("directly sets the current transition", () => {
    const { result } = renderHook(() => usePageTransitionProtocol());

    act(() => {
      result.current.setCurrentTransition(modalUp);
    });

    expect(result.current.currentTransition).toEqual(modalUp);
  });

  it("returns undefined for unregistered preset", () => {
    const { result } = renderHook(() => usePageTransitionProtocol());

    expect(result.current.getPreset("nonexistent")).toBeUndefined();
  });
});
