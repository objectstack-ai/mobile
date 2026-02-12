/**
 * Tests for useOnboarding – validates slide navigation,
 * onboarding completion, and tooltip management.
 */
import { renderHook, act } from "@testing-library/react-native";

jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useOnboarding } from "~/hooks/useOnboarding";

describe("useOnboarding", () => {
  it("returns default state with 4 slides", () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.isComplete).toBe(false);
    expect(result.current.currentSlide).toBe(0);
    expect(result.current.slides).toHaveLength(4);
    expect(result.current.slides[0].id).toBe("welcome");
    expect(result.current.slides[1].id).toBe("objects");
    expect(result.current.slides[2].id).toBe("views");
    expect(result.current.slides[3].id).toBe("ai");
  });

  it("nextSlide advances the slide index", () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.nextSlide();
    });
    expect(result.current.currentSlide).toBe(1);

    act(() => {
      result.current.nextSlide();
    });
    expect(result.current.currentSlide).toBe(2);
  });

  it("nextSlide does not go past last slide", () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.nextSlide();
      result.current.nextSlide();
      result.current.nextSlide();
    });
    expect(result.current.currentSlide).toBe(3);

    act(() => {
      result.current.nextSlide();
    });
    expect(result.current.currentSlide).toBe(3);
  });

  it("previousSlide goes back", () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.nextSlide();
      result.current.nextSlide();
    });
    expect(result.current.currentSlide).toBe(2);

    act(() => {
      result.current.previousSlide();
    });
    expect(result.current.currentSlide).toBe(1);
  });

  it("previousSlide does not go below 0", () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.previousSlide();
    });
    expect(result.current.currentSlide).toBe(0);
  });

  it("skipOnboarding marks complete", () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.skipOnboarding();
    });
    expect(result.current.isComplete).toBe(true);
  });

  it("completeOnboarding marks complete", () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.completeOnboarding();
    });
    expect(result.current.isComplete).toBe(true);
  });

  it("resetOnboarding restores initial state", () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.nextSlide();
      result.current.nextSlide();
      result.current.completeOnboarding();
      result.current.dismissTooltip("tip1");
    });

    act(() => {
      result.current.resetOnboarding();
    });

    expect(result.current.isComplete).toBe(false);
    expect(result.current.currentSlide).toBe(0);
    expect(result.current.showTooltip("tip1")).toBe(true);
  });

  it("showTooltip returns true for undismissed key", () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.showTooltip("tip1")).toBe(true);
  });

  it("dismissTooltip hides a tooltip", () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.dismissTooltip("tip1");
    });

    expect(result.current.showTooltip("tip1")).toBe(false);
    expect(result.current.showTooltip("tip2")).toBe(true);
  });
});
