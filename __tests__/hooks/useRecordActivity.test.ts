/**
 * Tests for useRecordActivity – validates activity timeline management,
 * filtering by type/user/date, and sorting.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useRecordActivity, ActivityEntry } from "~/hooks/useRecordActivity";

const sampleActivities: ActivityEntry[] = [
  { id: "a1", type: "update", user: "u1", summary: "Edited name", timestamp: "2025-01-01T10:00:00Z" },
  { id: "a2", type: "create", user: "u2", summary: "Created record", timestamp: "2025-01-02T10:00:00Z" },
  { id: "a3", type: "update", user: "u1", summary: "Changed status", timestamp: "2025-01-03T10:00:00Z" },
  { id: "a4", type: "delete", user: "u3", summary: "Removed item", timestamp: "2025-01-04T10:00:00Z" },
];

describe("useRecordActivity", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useRecordActivity());

    expect(result.current.activities).toEqual([]);
    expect(result.current.filter).toEqual({});
    expect(result.current.sortOrder).toBe("desc");
    expect(result.current.filteredActivities).toEqual([]);
  });

  it("sets activities and sorts descending by default", () => {
    const { result } = renderHook(() => useRecordActivity());

    act(() => {
      result.current.setActivities(sampleActivities);
    });

    expect(result.current.activities).toHaveLength(4);
    expect(result.current.filteredActivities[0].id).toBe("a4");
    expect(result.current.filteredActivities[3].id).toBe("a1");
  });

  it("adds a single activity entry", () => {
    const { result } = renderHook(() => useRecordActivity());

    act(() => {
      result.current.addActivity({ id: "a1", type: "update", user: "u1", summary: "Edited name", timestamp: "2025-01-01T10:00:00Z" });
    });

    expect(result.current.activities).toHaveLength(1);
  });

  it("filters activities by type", () => {
    const { result } = renderHook(() => useRecordActivity());

    act(() => {
      result.current.setActivities(sampleActivities);
    });

    act(() => {
      result.current.setFilter({ type: "update" });
    });

    expect(result.current.filteredActivities).toHaveLength(2);
    expect(result.current.filteredActivities.every((a) => a.type === "update")).toBe(true);
  });

  it("filters activities by user", () => {
    const { result } = renderHook(() => useRecordActivity());

    act(() => {
      result.current.setActivities(sampleActivities);
    });

    act(() => {
      result.current.setFilter({ user: "u1" });
    });

    expect(result.current.filteredActivities).toHaveLength(2);
    expect(result.current.filteredActivities.every((a) => a.user === "u1")).toBe(true);
  });

  it("filters activities by date range", () => {
    const { result } = renderHook(() => useRecordActivity());

    act(() => {
      result.current.setActivities(sampleActivities);
    });

    act(() => {
      result.current.setFilter({ dateRange: { start: "2025-01-02T00:00:00Z", end: "2025-01-03T23:59:59Z" } });
    });

    expect(result.current.filteredActivities).toHaveLength(2);
  });

  it("sorts activities ascending", () => {
    const { result } = renderHook(() => useRecordActivity());

    act(() => {
      result.current.setActivities(sampleActivities);
    });

    act(() => {
      result.current.setSortOrder("asc");
    });

    expect(result.current.filteredActivities[0].id).toBe("a1");
    expect(result.current.filteredActivities[3].id).toBe("a4");
  });
});
