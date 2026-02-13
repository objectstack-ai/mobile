/**
 * Tests for useOfflineAnalytics – validates local-first
 * analytics query execution, caching, and cache management.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useOfflineAnalytics } from "~/hooks/useOfflineAnalytics";

describe("useOfflineAnalytics", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useOfflineAnalytics());

    expect(result.current.results.size).toBe(0);
    expect(result.current.cacheEntries).toEqual([]);
    expect(result.current.totalCacheSize).toBe(0);
    expect(result.current.cacheCount).toBe(0);
  });

  it("executes a query and stores result", () => {
    const { result } = renderHook(() => useOfflineAnalytics());

    let queryResult: unknown;
    act(() => {
      queryResult = result.current.executeQuery({
        id: "q1",
        object: "orders",
        measure: "sum:amount",
      });
    });

    expect(queryResult).toMatchObject({ queryId: "q1", data: [], total: 0, isStale: false });
    expect(result.current.results.size).toBe(1);
  });

  it("caches a result with metadata", () => {
    const { result } = renderHook(() => useOfflineAnalytics());

    const queryResult = { queryId: "q1", data: [{ month: "Jan", amount: 5000 }], total: 5000, computedAt: "2026-01-01T00:00:00Z", isStale: false };

    act(() => {
      result.current.cacheResult("q1", queryResult, "2026-01-02T00:00:00Z", 1024);
    });

    expect(result.current.results.get("q1")).toEqual(queryResult);
    expect(result.current.cacheEntries).toHaveLength(1);
    expect(result.current.cacheEntries[0].queryId).toBe("q1");
    expect(result.current.cacheEntries[0].size).toBe(1024);
    expect(result.current.totalCacheSize).toBe(1024);
    expect(result.current.cacheCount).toBe(1);
  });

  it("retrieves a cached result", () => {
    const { result } = renderHook(() => useOfflineAnalytics());

    const queryResult = { queryId: "q1", data: [{ count: 42 }], total: 42, computedAt: "2026-01-01T00:00:00Z", isStale: false };

    act(() => {
      result.current.cacheResult("q1", queryResult, "2026-01-02T00:00:00Z", 512);
    });

    expect(result.current.getCached("q1")).toEqual(queryResult);
    expect(result.current.getCached("nonexistent")).toBeUndefined();
  });

  it("invalidates a cached query", () => {
    const { result } = renderHook(() => useOfflineAnalytics());

    const qr1 = { queryId: "q1", data: [], total: 0, computedAt: "2026-01-01T00:00:00Z", isStale: false };
    const qr2 = { queryId: "q2", data: [], total: 0, computedAt: "2026-01-01T00:00:00Z", isStale: false };

    act(() => {
      result.current.cacheResult("q1", qr1, "2026-01-02T00:00:00Z", 512);
      result.current.cacheResult("q2", qr2, "2026-01-02T00:00:00Z", 256);
    });

    act(() => {
      result.current.invalidate("q1");
    });

    expect(result.current.results.has("q1")).toBe(false);
    expect(result.current.results.has("q2")).toBe(true);
    expect(result.current.cacheEntries).toHaveLength(1);
    expect(result.current.cacheCount).toBe(1);
  });

  it("clears all cache", () => {
    const { result } = renderHook(() => useOfflineAnalytics());

    const qr1 = { queryId: "q1", data: [], total: 0, computedAt: "2026-01-01T00:00:00Z", isStale: false };

    act(() => {
      result.current.cacheResult("q1", qr1, "2026-01-02T00:00:00Z", 512);
    });

    expect(result.current.cacheCount).toBe(1);

    act(() => {
      result.current.clearCache();
    });

    expect(result.current.results.size).toBe(0);
    expect(result.current.cacheEntries).toEqual([]);
    expect(result.current.totalCacheSize).toBe(0);
    expect(result.current.cacheCount).toBe(0);
  });

  it("computes total cache size", () => {
    const { result } = renderHook(() => useOfflineAnalytics());

    const qr1 = { queryId: "q1", data: [], total: 0, computedAt: "2026-01-01T00:00:00Z", isStale: false };
    const qr2 = { queryId: "q2", data: [], total: 0, computedAt: "2026-01-01T00:00:00Z", isStale: false };

    act(() => {
      result.current.cacheResult("q1", qr1, "2026-01-02T00:00:00Z", 1024);
      result.current.cacheResult("q2", qr2, "2026-01-02T00:00:00Z", 2048);
    });

    expect(result.current.totalCacheSize).toBe(3072);
  });

  it("replaces cache entry on re-cache", () => {
    const { result } = renderHook(() => useOfflineAnalytics());

    const qr1 = { queryId: "q1", data: [], total: 0, computedAt: "2026-01-01T00:00:00Z", isStale: false };
    const qr1Updated = { queryId: "q1", data: [{ v: 1 }], total: 1, computedAt: "2026-01-02T00:00:00Z", isStale: false };

    act(() => {
      result.current.cacheResult("q1", qr1, "2026-01-02T00:00:00Z", 512);
    });

    act(() => {
      result.current.cacheResult("q1", qr1Updated, "2026-01-03T00:00:00Z", 768);
    });

    expect(result.current.cacheEntries).toHaveLength(1);
    expect(result.current.totalCacheSize).toBe(768);
    expect(result.current.results.get("q1")).toEqual(qr1Updated);
  });
});
