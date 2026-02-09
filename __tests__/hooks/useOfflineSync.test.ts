/**
 * Tests for useOfflineSync – validates offline sync cycle including
 * queue draining, conflict detection, and retry logic.
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockClient = {
  data: {
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

/* ---- Mock sync-queue ---- */
const mockGetPendingEntries = jest.fn();
const mockGetPendingCount = jest.fn();
const mockGetConflictEntries = jest.fn();
const mockMarkInProgress = jest.fn();
const mockMarkCompleted = jest.fn();
const mockMarkFailed = jest.fn();
const mockMarkConflict = jest.fn();

jest.mock("~/lib/sync-queue", () => ({
  getPendingEntries: (...args: any[]) => mockGetPendingEntries(...args),
  getPendingCount: (...args: any[]) => mockGetPendingCount(...args),
  getConflictEntries: (...args: any[]) => mockGetConflictEntries(...args),
  markInProgress: (...args: any[]) => mockMarkInProgress(...args),
  markCompleted: (...args: any[]) => mockMarkCompleted(...args),
  markFailed: (...args: any[]) => mockMarkFailed(...args),
  markConflict: (...args: any[]) => mockMarkConflict(...args),
}));

/* ---- Mock stores ---- */
let mockAppStoreState = { isOffline: true };
const mockSetSyncing = jest.fn();
const mockSetPendingCount = jest.fn();
const mockSetLastSyncedAt = jest.fn();
const mockSetConflicts = jest.fn();

jest.mock("~/stores/app-store", () => ({
  useAppStore: (selector: any) => selector(mockAppStoreState),
}));

jest.mock("~/stores/sync-store", () => ({
  useSyncStore: () => ({
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    conflicts: [],
    setSyncing: mockSetSyncing,
    setPendingCount: mockSetPendingCount,
    setLastSyncedAt: mockSetLastSyncedAt,
    setConflicts: mockSetConflicts,
  }),
}));

import { useOfflineSync } from "~/hooks/useOfflineSync";

beforeEach(() => {
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockGetPendingEntries.mockReset();
  mockGetPendingCount.mockReset().mockReturnValue(0);
  mockGetConflictEntries.mockReset().mockReturnValue([]);
  mockMarkInProgress.mockReset();
  mockMarkCompleted.mockReset();
  mockMarkFailed.mockReset();
  mockMarkConflict.mockReset();
  mockSetSyncing.mockReset();
  mockSetPendingCount.mockReset();
  mockSetLastSyncedAt.mockReset();
  mockSetConflicts.mockReset();
  mockAppStoreState = { isOffline: true };
});

describe("useOfflineSync", () => {
  it("returns sync state and functions", () => {
    const { result } = renderHook(() => useOfflineSync());

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.lastSyncedAt).toBeNull();
    expect(result.current.conflicts).toEqual([]);
    expect(typeof result.current.sync).toBe("function");
    expect(typeof result.current.refreshCounts).toBe("function");
  });

  it("refreshes counts on mount", () => {
    renderHook(() => useOfflineSync());

    expect(mockGetPendingCount).toHaveBeenCalled();
    expect(mockGetConflictEntries).toHaveBeenCalled();
  });

  it("does not sync when offline", async () => {
    mockAppStoreState = { isOffline: true };
    mockGetPendingEntries.mockReturnValue([]);

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.sync();
    });

    // Should not have started syncing
    expect(mockSetSyncing).not.toHaveBeenCalledWith(true);
  });

  it("syncs create operations when online", async () => {
    mockAppStoreState = { isOffline: false };
    const entry = {
      id: 1,
      objectName: "tasks",
      recordId: "",
      operation: "create",
      payload: JSON.stringify({ name: "New Task" }),
      status: "pending",
      retries: 0,
      errorMessage: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockGetPendingEntries.mockReturnValue([entry]);
    mockCreate.mockResolvedValue({ id: "created-1" });

    const { result } = renderHook(() => useOfflineSync());

    // The hook auto-syncs on mount when online
    await waitFor(() => {
      expect(mockMarkCompleted).toHaveBeenCalledWith(1);
    });
  });

  it("syncs update operations", async () => {
    mockAppStoreState = { isOffline: false };
    const entry = {
      id: 2,
      objectName: "tasks",
      recordId: "rec-1",
      operation: "update",
      payload: JSON.stringify({ name: "Updated Task" }),
      status: "pending",
      retries: 0,
      errorMessage: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockGetPendingEntries.mockReturnValue([entry]);
    mockUpdate.mockResolvedValue({ id: "rec-1" });

    renderHook(() => useOfflineSync());

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("tasks", "rec-1", {
        name: "Updated Task",
      });
      expect(mockMarkCompleted).toHaveBeenCalledWith(2);
    });
  });

  it("syncs delete operations", async () => {
    mockAppStoreState = { isOffline: false };
    const entry = {
      id: 3,
      objectName: "tasks",
      recordId: "rec-2",
      operation: "delete",
      payload: JSON.stringify({}),
      status: "pending",
      retries: 0,
      errorMessage: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockGetPendingEntries.mockReturnValue([entry]);
    mockDelete.mockResolvedValue(undefined);

    renderHook(() => useOfflineSync());

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("tasks", "rec-2");
      expect(mockMarkCompleted).toHaveBeenCalledWith(3);
    });
  });

  it("handles conflict (409) responses", async () => {
    mockAppStoreState = { isOffline: false };
    const entry = {
      id: 4,
      objectName: "tasks",
      recordId: "rec-3",
      operation: "update",
      payload: JSON.stringify({ name: "Conflict Task" }),
      status: "pending",
      retries: 0,
      errorMessage: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockGetPendingEntries.mockReturnValue([entry]);
    mockUpdate.mockRejectedValue(new Error("409 Conflict"));

    renderHook(() => useOfflineSync());

    await waitFor(() => {
      expect(mockMarkConflict).toHaveBeenCalledWith(4, "409 Conflict");
    });
  });

  it("marks as failed after max retries", async () => {
    mockAppStoreState = { isOffline: false };
    const entry = {
      id: 5,
      objectName: "tasks",
      recordId: "rec-4",
      operation: "update",
      payload: JSON.stringify({ name: "Failing" }),
      status: "pending",
      retries: 5, // >= MAX_RETRIES
      errorMessage: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockGetPendingEntries.mockReturnValue([entry]);
    mockUpdate.mockRejectedValue(new Error("Server error"));

    renderHook(() => useOfflineSync());

    await waitFor(() => {
      expect(mockMarkFailed).toHaveBeenCalledWith(
        5,
        expect.stringContaining("Max retries exceeded"),
      );
    });
  });
});
