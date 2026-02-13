/**
 * Tests for useSelectiveSync – validates selective sync
 * configuration, status tracking, and priority sorting.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useSelectiveSync, SyncObjectConfig } from "~/hooks/useSelectiveSync";

const sampleConfigs: SyncObjectConfig[] = [
  { object: "accounts", enabled: true, priority: "high", recordCount: 500 },
  { object: "contacts", enabled: true, priority: "medium", recordCount: 2000 },
  { object: "tasks", enabled: false, priority: "low", recordCount: 10000 },
  { object: "orders", enabled: true, priority: "high", recordCount: 300 },
];

describe("useSelectiveSync", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useSelectiveSync());

    expect(result.current.configs).toEqual([]);
    expect(result.current.statuses).toEqual([]);
    expect(result.current.overallProgress).toBe(0);
    expect(result.current.syncingCount).toBe(0);
    expect(result.current.enabledObjects).toEqual([]);
  });

  it("sets configs and computes enabled objects", () => {
    const { result } = renderHook(() => useSelectiveSync());

    act(() => {
      result.current.setConfigs(sampleConfigs);
    });

    expect(result.current.configs).toHaveLength(4);
    expect(result.current.enabledObjects).toHaveLength(3);
  });

  it("sorts enabled objects by priority", () => {
    const { result } = renderHook(() => useSelectiveSync());

    act(() => {
      result.current.setConfigs(sampleConfigs);
    });

    const priorities = result.current.enabledObjects.map((c) => c.priority);
    expect(priorities).toEqual(["high", "high", "medium"]);
  });

  it("enables sync for an object", () => {
    const { result } = renderHook(() => useSelectiveSync());

    act(() => {
      result.current.setConfigs(sampleConfigs);
    });

    expect(result.current.enabledObjects).toHaveLength(3);

    act(() => {
      result.current.enableSync("tasks");
    });

    expect(result.current.enabledObjects).toHaveLength(4);
    expect(result.current.configs.find((c) => c.object === "tasks")?.enabled).toBe(true);
  });

  it("disables sync for an object", () => {
    const { result } = renderHook(() => useSelectiveSync());

    act(() => {
      result.current.setConfigs(sampleConfigs);
    });

    act(() => {
      result.current.disableSync("accounts");
    });

    expect(result.current.enabledObjects).toHaveLength(2);
    expect(result.current.configs.find((c) => c.object === "accounts")?.enabled).toBe(false);
  });

  it("updates sync status for an object", () => {
    const { result } = renderHook(() => useSelectiveSync());

    act(() => {
      result.current.updateStatus({ object: "accounts", status: "syncing", progress: 50, recordsSynced: 250, recordsTotal: 500 });
    });

    expect(result.current.statuses).toHaveLength(1);
    expect(result.current.statuses[0].progress).toBe(50);
    expect(result.current.syncingCount).toBe(1);
  });

  it("replaces status for existing object", () => {
    const { result } = renderHook(() => useSelectiveSync());

    act(() => {
      result.current.updateStatus({ object: "accounts", status: "syncing", progress: 50, recordsSynced: 250, recordsTotal: 500 });
    });
    act(() => {
      result.current.updateStatus({ object: "accounts", status: "synced", progress: 100, recordsSynced: 500, recordsTotal: 500 });
    });

    expect(result.current.statuses).toHaveLength(1);
    expect(result.current.statuses[0].status).toBe("synced");
    expect(result.current.statuses[0].progress).toBe(100);
  });

  it("computes overall progress", () => {
    const { result } = renderHook(() => useSelectiveSync());

    act(() => {
      result.current.setStatuses([
        { object: "accounts", status: "synced", progress: 100, recordsSynced: 500, recordsTotal: 500 },
        { object: "contacts", status: "syncing", progress: 50, recordsSynced: 1000, recordsTotal: 2000 },
      ]);
    });

    expect(result.current.overallProgress).toBe(75);
  });

  it("counts syncing objects", () => {
    const { result } = renderHook(() => useSelectiveSync());

    act(() => {
      result.current.setStatuses([
        { object: "accounts", status: "syncing", progress: 50, recordsSynced: 250, recordsTotal: 500 },
        { object: "contacts", status: "syncing", progress: 30, recordsSynced: 600, recordsTotal: 2000 },
        { object: "orders", status: "synced", progress: 100, recordsSynced: 300, recordsTotal: 300 },
      ]);
    });

    expect(result.current.syncingCount).toBe(2);
  });
});
