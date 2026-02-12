/**
 * Tests for useGlobalSearch – validates search execution,
 * recent search tracking, and error handling.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockSearch = jest.fn();

const mockClient = {
  api: {
    search: mockSearch,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useGlobalSearch } from "~/hooks/useGlobalSearch";

beforeEach(() => {
  mockSearch.mockReset();
});

describe("useGlobalSearch", () => {
  it("search fetches and stores results", async () => {
    const searchResults = [
      {
        id: "sr-1",
        object: "tasks",
        recordId: "task-1",
        title: "Quarterly Report",
        subtitle: "Q1 2026",
        score: 0.95,
        highlight: "<em>Quarterly</em> Report",
      },
      {
        id: "sr-2",
        object: "documents",
        recordId: "doc-1",
        title: "Quarterly Summary",
        score: 0.8,
      },
    ];
    mockSearch.mockResolvedValue(searchResults);

    const { result } = renderHook(() => useGlobalSearch());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.search("quarterly");
    });

    expect(mockSearch).toHaveBeenCalledWith("quarterly", undefined);
    expect(returned).toEqual(searchResults);
    expect(result.current.results).toEqual(searchResults);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("search with options (limit, object)", async () => {
    const searchResults = [
      {
        id: "sr-3",
        object: "tasks",
        recordId: "task-2",
        title: "Budget Report",
        score: 0.9,
      },
    ];
    mockSearch.mockResolvedValue(searchResults);

    const { result } = renderHook(() => useGlobalSearch());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.search("budget", { limit: 5, object: "tasks" });
    });

    expect(mockSearch).toHaveBeenCalledWith("budget", { limit: 5, object: "tasks" });
    expect(returned).toEqual(searchResults);
    expect(result.current.results).toEqual(searchResults);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("tracks recent searches (max 10, no duplicates)", async () => {
    mockSearch.mockResolvedValue([]);

    const { result } = renderHook(() => useGlobalSearch());

    // Perform multiple searches
    for (let i = 0; i < 12; i++) {
      await act(async () => {
        await result.current.search(`query-${i}`);
      });
    }

    expect(result.current.recentSearches).toHaveLength(10);
    expect(result.current.recentSearches[0]).toBe("query-11");
    expect(result.current.recentSearches[9]).toBe("query-2");

    // Search a duplicate – it should move to front
    await act(async () => {
      await result.current.search("query-5");
    });

    expect(result.current.recentSearches[0]).toBe("query-5");
    expect(result.current.recentSearches).toHaveLength(10);
  });

  it("clearRecent clears all recent searches", async () => {
    mockSearch.mockResolvedValue([]);

    const { result } = renderHook(() => useGlobalSearch());

    await act(async () => {
      await result.current.search("test");
    });
    expect(result.current.recentSearches).toHaveLength(1);

    act(() => {
      result.current.clearRecent();
    });

    expect(result.current.recentSearches).toEqual([]);
  });

  it("handles search error", async () => {
    mockSearch.mockRejectedValue(new Error("Search service unavailable"));

    const { result } = renderHook(() => useGlobalSearch());

    await act(async () => {
      await expect(result.current.search("broken")).rejects.toThrow("Search service unavailable");
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Search service unavailable");
  });
});
