/**
 * Tests for useComponentAnimation – validates per-component animation
 * registration, removal, partial updates, and computed component list.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useComponentAnimation, ComponentAnimationConfig } from "~/hooks/useComponentAnimation";

const cardConfig: ComponentAnimationConfig = {
  componentId: "card-1",
  enter: { duration: 200, easing: { type: "ease_in" } },
  exit: { duration: 150, easing: { type: "ease_out" } },
};

const buttonConfig: ComponentAnimationConfig = {
  componentId: "btn-1",
  hover: { duration: 100, easing: { type: "linear" } },
  disabled: false,
};

describe("useComponentAnimation", () => {
  it("returns empty initial state", () => {
    const { result } = renderHook(() => useComponentAnimation());

    expect(result.current.componentAnimations.size).toBe(0);
    expect(result.current.registeredComponents).toEqual([]);
  });

  it("sets and retrieves a component animation", () => {
    const { result } = renderHook(() => useComponentAnimation());

    act(() => {
      result.current.setComponentAnimation("card-1", cardConfig);
    });

    expect(result.current.componentAnimations.size).toBe(1);
    expect(result.current.getComponentAnimation("card-1")).toEqual(cardConfig);
    expect(result.current.registeredComponents).toEqual(["card-1"]);
  });

  it("removes a component animation", () => {
    const { result } = renderHook(() => useComponentAnimation());

    act(() => {
      result.current.setComponentAnimation("card-1", cardConfig);
      result.current.setComponentAnimation("btn-1", buttonConfig);
    });

    act(() => {
      result.current.removeComponentAnimation("card-1");
    });

    expect(result.current.componentAnimations.size).toBe(1);
    expect(result.current.getComponentAnimation("card-1")).toBeUndefined();
    expect(result.current.registeredComponents).toEqual(["btn-1"]);
  });

  it("updates only the enter animation", () => {
    const { result } = renderHook(() => useComponentAnimation());

    act(() => {
      result.current.setComponentAnimation("card-1", cardConfig);
    });

    const newEnter = { duration: 400, easing: { type: "spring" as const } };

    act(() => {
      result.current.updateEnterAnimation("card-1", newEnter);
    });

    const updated = result.current.getComponentAnimation("card-1")!;
    expect(updated.enter).toEqual(newEnter);
    expect(updated.exit).toEqual(cardConfig.exit);
  });

  it("updates only the exit animation", () => {
    const { result } = renderHook(() => useComponentAnimation());

    act(() => {
      result.current.setComponentAnimation("card-1", cardConfig);
    });

    const newExit = { duration: 500, easing: { type: "ease_in_out" as const } };

    act(() => {
      result.current.updateExitAnimation("card-1", newExit);
    });

    const updated = result.current.getComponentAnimation("card-1")!;
    expect(updated.exit).toEqual(newExit);
    expect(updated.enter).toEqual(cardConfig.enter);
  });

  it("updateEnterAnimation is a no-op for unregistered component", () => {
    const { result } = renderHook(() => useComponentAnimation());

    act(() => {
      result.current.updateEnterAnimation("unknown", { duration: 100, easing: { type: "linear" } });
    });

    expect(result.current.componentAnimations.size).toBe(0);
  });

  it("returns undefined for unregistered component id", () => {
    const { result } = renderHook(() => useComponentAnimation());

    expect(result.current.getComponentAnimation("nonexistent")).toBeUndefined();
  });

  it("replaces an existing component config", () => {
    const { result } = renderHook(() => useComponentAnimation());

    act(() => {
      result.current.setComponentAnimation("card-1", cardConfig);
    });

    const updated: ComponentAnimationConfig = { ...cardConfig, disabled: true };

    act(() => {
      result.current.setComponentAnimation("card-1", updated);
    });

    expect(result.current.componentAnimations.size).toBe(1);
    expect(result.current.getComponentAnimation("card-1")!.disabled).toBe(true);
  });
});
