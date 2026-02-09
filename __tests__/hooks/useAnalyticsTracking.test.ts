/**
 * Tests for useAnalyticsTracking – validates page view and action
 * tracking hooks wrapping the analytics tracker.
 */
import { renderHook } from "@testing-library/react-native";
import { createAnalyticsTracker } from "~/lib/analytics";
import { usePageView, useTrackAction } from "~/hooks/useAnalyticsTracking";

describe("usePageView", () => {
  it("tracks a page view on mount", () => {
    const tracker = createAnalyticsTracker();
    const spy = jest.spyOn(tracker, "trackPageView");

    renderHook(() => usePageView("HomeScreen", undefined, tracker));

    expect(spy).toHaveBeenCalledWith("HomeScreen", undefined);
  });

  it("tracks with additional properties", () => {
    const tracker = createAnalyticsTracker();
    const spy = jest.spyOn(tracker, "trackPageView");

    renderHook(() =>
      usePageView("DetailScreen", { recordId: "123" }, tracker),
    );

    expect(spy).toHaveBeenCalledWith("DetailScreen", { recordId: "123" });
  });

  it("re-tracks when screen name changes", () => {
    const tracker = createAnalyticsTracker();
    const spy = jest.spyOn(tracker, "trackPageView");

    const { rerender } = renderHook(
      ({ screen }: { screen: string }) =>
        usePageView(screen, undefined, tracker),
      { initialProps: { screen: "ScreenA" } },
    );

    expect(spy).toHaveBeenCalledTimes(1);

    rerender({ screen: "ScreenB" });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith("ScreenB", undefined);
  });

  it("does not re-track when other props change", () => {
    const tracker = createAnalyticsTracker();
    const spy = jest.spyOn(tracker, "trackPageView");

    const { rerender } = renderHook(
      ({ screen }: { screen: string }) =>
        usePageView(screen, undefined, tracker),
      { initialProps: { screen: "ScreenA" } },
    );

    rerender({ screen: "ScreenA" }); // Same screen name

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("useTrackAction", () => {
  it("returns trackAction and track functions", () => {
    const tracker = createAnalyticsTracker();
    const { result } = renderHook(() => useTrackAction(tracker));

    expect(typeof result.current.trackAction).toBe("function");
    expect(typeof result.current.track).toBe("function");
  });

  it("trackAction calls tracker.trackAction()", () => {
    const tracker = createAnalyticsTracker();
    const spy = jest.spyOn(tracker, "trackAction");
    const { result } = renderHook(() => useTrackAction(tracker));

    result.current.trackAction("button_click", { buttonId: "save" });

    expect(spy).toHaveBeenCalledWith("button_click", { buttonId: "save" });
  });

  it("track calls tracker.track()", () => {
    const tracker = createAnalyticsTracker();
    const spy = jest.spyOn(tracker, "track");
    const { result } = renderHook(() => useTrackAction(tracker));

    result.current.track("custom_event", { key: "value" });

    expect(spy).toHaveBeenCalledWith("custom_event", { key: "value" });
  });
});
