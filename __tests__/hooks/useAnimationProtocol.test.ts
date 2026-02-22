/**
 * Tests for useAnimationProtocol – validates animation and transition
 * registration, removal, retrieval, and reduced-motion awareness.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useAnimationProtocol, AnimationConfig, TransitionConfig } from "~/hooks/useAnimationProtocol";

const fadeIn: AnimationConfig = {
  type: "fade",
  duration: 300,
  delay: 0,
  easing: "ease-in-out",
  iterations: 1,
};

const slideUp: TransitionConfig = {
  property: "translateY",
  from: 100,
  to: 0,
  duration: 250,
  easing: "ease-out",
};

describe("useAnimationProtocol", () => {
  it("returns default initial state", () => {
    const { result } = renderHook(() => useAnimationProtocol());

    expect(result.current.animations.size).toBe(0);
    expect(result.current.transitions.size).toBe(0);
    expect(result.current.motionConfig).toEqual({
      reducedMotion: false,
      prefersContrast: false,
      animationScale: 1,
    });
    expect(result.current.isReduced).toBe(false);
  });

  it("registers and retrieves an animation", () => {
    const { result } = renderHook(() => useAnimationProtocol());

    act(() => {
      result.current.registerAnimation("fadeIn", fadeIn);
    });

    expect(result.current.animations.size).toBe(1);
    expect(result.current.getAnimation("fadeIn")).toEqual(fadeIn);
  });

  it("removes an animation", () => {
    const { result } = renderHook(() => useAnimationProtocol());

    act(() => {
      result.current.registerAnimation("fadeIn", fadeIn);
    });

    act(() => {
      result.current.removeAnimation("fadeIn");
    });

    expect(result.current.animations.size).toBe(0);
    expect(result.current.getAnimation("fadeIn")).toBeUndefined();
  });

  it("registers and retrieves a transition", () => {
    const { result } = renderHook(() => useAnimationProtocol());

    act(() => {
      result.current.registerTransition("slideUp", slideUp);
    });

    expect(result.current.transitions.size).toBe(1);
    expect(result.current.getTransition("slideUp")).toEqual(slideUp);
  });

  it("removes a transition", () => {
    const { result } = renderHook(() => useAnimationProtocol());

    act(() => {
      result.current.registerTransition("slideUp", slideUp);
    });

    act(() => {
      result.current.removeTransition("slideUp");
    });

    expect(result.current.transitions.size).toBe(0);
    expect(result.current.getTransition("slideUp")).toBeUndefined();
  });

  it("sets motion config and computes isReduced", () => {
    const { result } = renderHook(() => useAnimationProtocol());

    act(() => {
      result.current.setMotionConfig({
        reducedMotion: true,
        prefersContrast: true,
        animationScale: 0.5,
      });
    });

    expect(result.current.isReduced).toBe(true);
    expect(result.current.motionConfig.animationScale).toBe(0.5);
  });

  it("returns undefined for unregistered ids", () => {
    const { result } = renderHook(() => useAnimationProtocol());

    expect(result.current.getAnimation("nonexistent")).toBeUndefined();
    expect(result.current.getTransition("nonexistent")).toBeUndefined();
  });

  it("replaces an existing animation config", () => {
    const { result } = renderHook(() => useAnimationProtocol());

    act(() => {
      result.current.registerAnimation("fadeIn", fadeIn);
    });

    const updated: AnimationConfig = { ...fadeIn, duration: 500 };

    act(() => {
      result.current.registerAnimation("fadeIn", updated);
    });

    expect(result.current.animations.size).toBe(1);
    expect(result.current.getAnimation("fadeIn")!.duration).toBe(500);
  });
});
