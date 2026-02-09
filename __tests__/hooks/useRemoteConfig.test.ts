/**
 * Tests for useRemoteConfig – validates reactive remote config hooks
 * that subscribe to config changes via RemoteConfigManager.
 */
import { renderHook, act } from "@testing-library/react-native";
import { createRemoteConfigManager } from "~/lib/remote-config";
import {
  useRemoteConfigValue,
  useRemoteConfig,
} from "~/hooks/useRemoteConfig";

describe("useRemoteConfigValue", () => {
  it("returns fallback when key is missing", () => {
    const mgr = createRemoteConfigManager();
    const { result } = renderHook(() =>
      useRemoteConfigValue<number>("maxRetries", 3, mgr),
    );
    expect(result.current).toBe(3);
  });

  it("returns configured value over fallback", () => {
    const mgr = createRemoteConfigManager({
      defaults: { maxRetries: 5 },
    });
    const { result } = renderHook(() =>
      useRemoteConfigValue<number>("maxRetries", 3, mgr),
    );
    expect(result.current).toBe(5);
  });

  it("updates when config is overridden", () => {
    const mgr = createRemoteConfigManager({
      defaults: { theme: "light" },
    });
    const { result } = renderHook(() =>
      useRemoteConfigValue<string>("theme", "dark", mgr),
    );
    expect(result.current).toBe("light");

    act(() => {
      mgr.overrideConfig({ theme: "dark" });
    });

    expect(result.current).toBe("dark");
  });

  it("cleans up subscription on unmount", () => {
    const mgr = createRemoteConfigManager({
      defaults: { val: 1 },
    });
    const { unmount } = renderHook(() =>
      useRemoteConfigValue<number>("val", 0, mgr),
    );

    unmount();
    // Should not throw
    act(() => {
      mgr.overrideConfig({ val: 99 });
    });
  });
});

describe("useRemoteConfig", () => {
  it("returns all config values", () => {
    const mgr = createRemoteConfigManager({
      defaults: { a: 1, b: "hello" },
    });
    const { result } = renderHook(() => useRemoteConfig(mgr));

    expect(result.current.config).toEqual({ a: 1, b: "hello" });
    expect(typeof result.current.refresh).toBe("function");
  });

  it("updates when config changes", () => {
    const mgr = createRemoteConfigManager({
      defaults: { x: "old" },
    });
    const { result } = renderHook(() => useRemoteConfig(mgr));
    expect(result.current.config.x).toBe("old");

    act(() => {
      mgr.overrideConfig({ x: "new", y: true });
    });

    expect(result.current.config.x).toBe("new");
    expect(result.current.config.y).toBe(true);
  });
});
