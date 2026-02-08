/**
 * Tests for sync-store — Zustand store for sync state
 */
import { useSyncStore } from "~/stores/sync-store";
import type { SyncQueueEntry } from "~/lib/sync-queue";

describe("sync-store", () => {
  beforeEach(() => {
    // Reset to initial state
    useSyncStore.setState({
      isSyncing: false,
      pendingCount: 0,
      lastSyncedAt: null,
      conflicts: [],
    });
  });

  it("has correct initial state", () => {
    const state = useSyncStore.getState();
    expect(state.isSyncing).toBe(false);
    expect(state.pendingCount).toBe(0);
    expect(state.lastSyncedAt).toBeNull();
    expect(state.conflicts).toEqual([]);
  });

  it("setSyncing updates isSyncing", () => {
    useSyncStore.getState().setSyncing(true);
    expect(useSyncStore.getState().isSyncing).toBe(true);

    useSyncStore.getState().setSyncing(false);
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  it("setPendingCount updates pendingCount", () => {
    useSyncStore.getState().setPendingCount(5);
    expect(useSyncStore.getState().pendingCount).toBe(5);
  });

  it("setLastSyncedAt updates timestamp", () => {
    const ts = Date.now();
    useSyncStore.getState().setLastSyncedAt(ts);
    expect(useSyncStore.getState().lastSyncedAt).toBe(ts);
  });

  it("setConflicts updates conflicts array", () => {
    const conflicts: SyncQueueEntry[] = [
      {
        id: 1,
        objectName: "tasks",
        recordId: "r1",
        operation: "update",
        payload: "{}",
        status: "conflict",
        retries: 0,
        errorMessage: "409",
        createdAt: 1000,
        updatedAt: 2000,
      },
    ];
    useSyncStore.getState().setConflicts(conflicts);
    expect(useSyncStore.getState().conflicts).toHaveLength(1);
    expect(useSyncStore.getState().conflicts[0].recordId).toBe("r1");
  });
});
