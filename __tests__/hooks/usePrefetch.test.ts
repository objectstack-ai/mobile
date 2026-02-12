/**
 * Tests for usePrefetch — prefetching with TTL-based cache
 */
import { renderHook, act } from "@testing-library/react-native";
import { usePrefetch } from "~/hooks/usePrefetch";

describe("usePrefetch", () => {
  it("starts with empty cache and not loading", () => {
    const { result } = renderHook(() => usePrefetch());

    expect(result.current.prefetchedKeys).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("prefetch stores data and makes it retrievable", async () => {
    const { result } = renderHook(() => usePrefetch());

    await act(async () => {
      await result.current.prefetch("key1", async () => ({ id: 1, name: "Test" }));
    });

    expect(result.current.has("key1")).toBe(true);
    expect(result.current.get("key1")).toEqual({ id: 1, name: "Test" });
    expect(result.current.prefetchedKeys).toContain("key1");
  });

  it("get returns null for missing keys", () => {
    const { result } = renderHook(() => usePrefetch());

    expect(result.current.get("nonexistent")).toBeNull();
  });

  it("has returns false for missing keys", () => {
    const { result } = renderHook(() => usePrefetch());

    expect(result.current.has("nonexistent")).toBe(false);
  });

  it("invalidate removes a specific key", async () => {
    const { result } = renderHook(() => usePrefetch());

    await act(async () => {
      await result.current.prefetch("key1", async () => "data1");
      await result.current.prefetch("key2", async () => "data2");
    });

    act(() => {
      result.current.invalidate("key1");
    });

    expect(result.current.has("key1")).toBe(false);
    expect(result.current.has("key2")).toBe(true);
  });

  it("invalidateAll clears the entire cache", async () => {
    const { result } = renderHook(() => usePrefetch());

    await act(async () => {
      await result.current.prefetch("key1", async () => "data1");
      await result.current.prefetch("key2", async () => "data2");
    });

    act(() => {
      result.current.invalidateAll();
    });

    expect(result.current.has("key1")).toBe(false);
    expect(result.current.has("key2")).toBe(false);
    expect(result.current.prefetchedKeys).toEqual([]);
  });

  it("expired entries return null from get", async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => usePrefetch());

    await act(async () => {
      await result.current.prefetch("key1", async () => "data", 1000);
    });

    expect(result.current.get("key1")).toBe("data");

    // Advance past TTL
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(result.current.get("key1")).toBeNull();
    expect(result.current.has("key1")).toBe(false);

    jest.useRealTimers();
  });

  it("prefetch overwrites existing entry", async () => {
    const { result } = renderHook(() => usePrefetch());

    await act(async () => {
      await result.current.prefetch("key1", async () => "old");
    });

    await act(async () => {
      await result.current.prefetch("key1", async () => "new");
    });

    expect(result.current.get("key1")).toBe("new");
  });

  it("handles fetcher errors gracefully", async () => {
    const { result } = renderHook(() => usePrefetch());

    await act(async () => {
      await expect(
        result.current.prefetch("key1", async () => {
          throw new Error("fetch failed");
        }),
      ).rejects.toThrow("fetch failed");
    });

    expect(result.current.has("key1")).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
