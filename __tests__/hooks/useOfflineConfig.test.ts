/**
 * Tests for useOfflineConfig – validates offline strategy,
 * cache configuration, and shouldCache logic.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useOfflineConfig } from "~/hooks/useOfflineConfig";

describe("useOfflineConfig", () => {
  it("returns disabled state initially", () => {
    const { result } = renderHook(() => useOfflineConfig());

    expect(result.current.config.enabled).toBe(false);
    expect(result.current.isOfflineEnabled).toBe(false);
  });

  it("sets offline config and computes isOfflineEnabled", () => {
    const { result } = renderHook(() => useOfflineConfig());

    act(() => {
      result.current.setConfig({
        enabled: true,
        strategy: "cache_first",
        maxAge: 3600,
        maxSize: 50,
      });
    });

    expect(result.current.isOfflineEnabled).toBe(true);
  });

  it("shouldCache returns true for cache_first strategy", () => {
    const { result } = renderHook(() => useOfflineConfig());

    act(() => {
      result.current.setConfig({
        enabled: true,
        strategy: "cache_first",
        maxAge: 3600,
        maxSize: 50,
      });
    });

    expect(result.current.shouldCache("/api/accounts")).toBe(true);
  });

  it("shouldCache returns false for network_only strategy", () => {
    const { result } = renderHook(() => useOfflineConfig());

    act(() => {
      result.current.setConfig({
        enabled: true,
        strategy: "network_only",
        maxAge: 3600,
        maxSize: 50,
      });
    });

    expect(result.current.shouldCache("/api/accounts")).toBe(false);
  });

  it("shouldCache returns false when disabled", () => {
    const { result } = renderHook(() => useOfflineConfig());

    expect(result.current.shouldCache("/api/accounts")).toBe(false);
  });

  it("sets cache config and eviction policy", () => {
    const { result } = renderHook(() => useOfflineConfig());

    act(() => {
      result.current.setCacheConfig({
        storage: "sqlite",
        maxEntries: 1000,
        ttl: 3600,
      });
      result.current.setEvictionPolicy({
        type: "lru",
        maxItems: 500,
        maxAge: 7200,
      });
    });

    expect(result.current.cacheConfig.storage).toBe("sqlite");
    expect(result.current.evictionPolicy.type).toBe("lru");
  });
});
