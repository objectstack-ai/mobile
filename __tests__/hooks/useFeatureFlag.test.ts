/**
 * Tests for useFeatureFlag – validates reactive feature flag hooks
 * that subscribe to flag changes via FeatureFlagManager.
 */
import { renderHook, act } from "@testing-library/react-native";
import { createFeatureFlagManager } from "~/lib/feature-flags";
import {
  useFeatureFlag,
  useFeatureFlagPayload,
  useFeatureFlags,
} from "~/hooks/useFeatureFlag";

describe("useFeatureFlag", () => {
  it("returns false for unknown flags", () => {
    const mgr = createFeatureFlagManager();
    const { result } = renderHook(() => useFeatureFlag("nonexistent", mgr));
    expect(result.current).toBe(false);
  });

  it("returns true for enabled flags", () => {
    const mgr = createFeatureFlagManager({
      defaults: [{ key: "dark_mode", enabled: true }],
    });
    const { result } = renderHook(() => useFeatureFlag("dark_mode", mgr));
    expect(result.current).toBe(true);
  });

  it("returns false for disabled flags", () => {
    const mgr = createFeatureFlagManager({
      defaults: [{ key: "beta", enabled: false }],
    });
    const { result } = renderHook(() => useFeatureFlag("beta", mgr));
    expect(result.current).toBe(false);
  });

  it("re-renders when flags are overridden", () => {
    const mgr = createFeatureFlagManager({
      defaults: [{ key: "feature_x", enabled: false }],
    });
    const { result } = renderHook(() => useFeatureFlag("feature_x", mgr));
    expect(result.current).toBe(false);

    act(() => {
      mgr.overrideFlags([{ key: "feature_x", enabled: true }]);
    });

    expect(result.current).toBe(true);
  });

  it("cleans up subscription on unmount", () => {
    const mgr = createFeatureFlagManager({
      defaults: [{ key: "test", enabled: true }],
    });
    const { unmount } = renderHook(() => useFeatureFlag("test", mgr));

    // Should not throw after unmount
    unmount();
    act(() => {
      mgr.overrideFlags([{ key: "test", enabled: false }]);
    });
  });
});

describe("useFeatureFlagPayload", () => {
  it("returns undefined for flags without payload", () => {
    const mgr = createFeatureFlagManager({
      defaults: [{ key: "basic", enabled: true }],
    });
    const { result } = renderHook(() => useFeatureFlagPayload("basic", mgr));
    expect(result.current).toBeUndefined();
  });

  it("returns the payload for a flag", () => {
    const mgr = createFeatureFlagManager({
      defaults: [
        {
          key: "experiment",
          enabled: true,
          payload: { variant: "B", color: "blue" },
        },
      ],
    });
    const { result } = renderHook(() =>
      useFeatureFlagPayload("experiment", mgr),
    );
    expect(result.current).toEqual({ variant: "B", color: "blue" });
  });

  it("updates when payload changes", () => {
    const mgr = createFeatureFlagManager({
      defaults: [
        { key: "exp", enabled: true, payload: { version: 1 } },
      ],
    });
    const { result } = renderHook(() => useFeatureFlagPayload("exp", mgr));
    expect(result.current).toEqual({ version: 1 });

    act(() => {
      mgr.overrideFlags([
        { key: "exp", enabled: true, payload: { version: 2 } },
      ]);
    });

    expect(result.current).toEqual({ version: 2 });
  });
});

describe("useFeatureFlags", () => {
  it("returns all flags", () => {
    const mgr = createFeatureFlagManager({
      defaults: [
        { key: "a", enabled: true },
        { key: "b", enabled: false },
      ],
    });
    const { result } = renderHook(() => useFeatureFlags(mgr));

    expect(result.current.flags).toEqual([
      { key: "a", enabled: true },
      { key: "b", enabled: false },
    ]);
    expect(typeof result.current.refresh).toBe("function");
  });

  it("updates when flags change", () => {
    const mgr = createFeatureFlagManager({
      defaults: [{ key: "x", enabled: false }],
    });
    const { result } = renderHook(() => useFeatureFlags(mgr));
    expect(result.current.flags).toHaveLength(1);

    act(() => {
      mgr.overrideFlags([
        { key: "x", enabled: true },
        { key: "y", enabled: true },
      ]);
    });

    expect(result.current.flags).toHaveLength(2);
    expect(result.current.flags[0].enabled).toBe(true);
  });
});
