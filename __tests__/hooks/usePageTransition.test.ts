/**
 * Tests for usePageTransition – validates transition type setting,
 * style computation, and reduced-motion handling.
 */
import { renderHook, act } from "@testing-library/react-native";

jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { usePageTransition } from "~/hooks/usePageTransition";

describe("usePageTransition", () => {
  it("returns default config", () => {
    const { result } = renderHook(() => usePageTransition());

    expect(result.current.config.type).toBe("slide");
    expect(result.current.config.duration).toBe(300);
    expect(result.current.config.damping).toBe(20);
    expect(result.current.config.stiffness).toBe(200);
    expect(result.current.isReducedMotion).toBe(false);
  });

  it("setTransitionType changes config type", () => {
    const { result } = renderHook(() => usePageTransition());

    act(() => {
      result.current.setTransitionType("modal");
    });

    expect(result.current.config.type).toBe("modal");
    // Other config values should be preserved
    expect(result.current.config.duration).toBe(300);
  });

  it("getTransitionStyle returns slide style", () => {
    const { result } = renderHook(() => usePageTransition());

    const style = result.current.getTransitionStyle(0);
    expect(style.opacity).toBe(1);
    expect(style.transform).toBe("translateX(100px)");

    const styleHalf = result.current.getTransitionStyle(0.5);
    expect(styleHalf.opacity).toBe(1);
    expect(styleHalf.transform).toBe("translateX(50px)");

    const styleFull = result.current.getTransitionStyle(1);
    expect(styleFull.opacity).toBe(1);
    expect(styleFull.transform).toBe("translateX(0px)");
  });

  it("getTransitionStyle returns modal style", () => {
    const { result } = renderHook(() => usePageTransition());

    act(() => {
      result.current.setTransitionType("modal");
    });

    const style = result.current.getTransitionStyle(0);
    expect(style.opacity).toBe(0);
    expect(style.transform).toBe("translateY(50px)");

    const styleFull = result.current.getTransitionStyle(1);
    expect(styleFull.opacity).toBe(1);
    expect(styleFull.transform).toBe("translateY(0px)");
  });

  it("getTransitionStyle returns fade style", () => {
    const { result } = renderHook(() => usePageTransition());

    act(() => {
      result.current.setTransitionType("fade");
    });

    const style = result.current.getTransitionStyle(0);
    expect(style.opacity).toBe(0);
    expect(style.transform).toBe("translateX(0px)");

    const styleFull = result.current.getTransitionStyle(1);
    expect(styleFull.opacity).toBe(1);
    expect(styleFull.transform).toBe("translateX(0px)");
  });
});
