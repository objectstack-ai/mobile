/**
 * Tests for useRecentItems – validates tracking, removal,
 * clearing, and max-item enforcement.
 */
import { renderHook, act } from "@testing-library/react-native";

jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useRecentItems } from "~/hooks/useRecentItems";

describe("useRecentItems", () => {
  it("trackAccess adds an item", () => {
    const { result } = renderHook(() => useRecentItems());

    act(() => {
      result.current.trackAccess({
        id: "r-1",
        object: "tasks",
        recordId: "task-1",
        title: "My Task",
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe("r-1");
    expect(result.current.items[0].title).toBe("My Task");
    expect(result.current.items[0].accessedAt).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("trackAccess moves duplicate to front", () => {
    const { result } = renderHook(() => useRecentItems());

    act(() => {
      result.current.trackAccess({ id: "r-1", object: "tasks", recordId: "t-1", title: "First" });
    });
    act(() => {
      result.current.trackAccess({ id: "r-2", object: "tasks", recordId: "t-2", title: "Second" });
    });
    act(() => {
      result.current.trackAccess({ id: "r-1", object: "tasks", recordId: "t-1", title: "First" });
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].id).toBe("r-1");
    expect(result.current.items[1].id).toBe("r-2");
  });

  it("enforces max 50 items", () => {
    const { result } = renderHook(() => useRecentItems());

    act(() => {
      for (let i = 0; i < 55; i++) {
        result.current.trackAccess({
          id: `r-${i}`,
          object: "tasks",
          recordId: `t-${i}`,
          title: `Item ${i}`,
        });
      }
    });

    expect(result.current.items).toHaveLength(50);
    expect(result.current.items[0].id).toBe("r-54");
  });

  it("removeItem removes a specific item", () => {
    const { result } = renderHook(() => useRecentItems());

    act(() => {
      result.current.trackAccess({ id: "r-1", object: "tasks", recordId: "t-1", title: "First" });
      result.current.trackAccess({ id: "r-2", object: "tasks", recordId: "t-2", title: "Second" });
    });

    act(() => {
      result.current.removeItem("r-1");
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe("r-2");
  });

  it("clearRecent removes all items", () => {
    const { result } = renderHook(() => useRecentItems());

    act(() => {
      result.current.trackAccess({ id: "r-1", object: "tasks", recordId: "t-1", title: "First" });
      result.current.trackAccess({ id: "r-2", object: "tasks", recordId: "t-2", title: "Second" });
    });
    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.clearRecent();
    });

    expect(result.current.items).toEqual([]);
  });
});
