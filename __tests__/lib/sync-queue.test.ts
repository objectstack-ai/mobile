/**
 * Tests for sync-queue — write-ahead queue for offline mutations
 */
import * as SQLite from "expo-sqlite";
import {
  bootstrapSyncQueue,
  enqueueMutation,
  getPendingEntries,
  getAllQueueEntries,
  getConflictEntries,
  getPendingCount,
  markInProgress,
  markCompleted,
  markFailed,
  markConflict,
  resetEntry,
  discardEntry,
  clearSyncQueue,
} from "~/lib/sync-queue";

const mockDb = (SQLite.openDatabaseSync as jest.Mock)("test");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("bootstrapSyncQueue", () => {
  it("creates sync_queue table without error", () => {
    expect(() => bootstrapSyncQueue()).not.toThrow();
    expect(mockDb.execSync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS sync_queue"),
    );
  });
});

describe("enqueueMutation", () => {
  it("inserts a pending mutation", () => {
    enqueueMutation("tasks", "rec_1", "create", { name: "New" });
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_queue"),
      expect.arrayContaining(["tasks", "rec_1", "create"]),
    );
  });

  it("uses empty payload when none provided", () => {
    enqueueMutation("tasks", "rec_2", "delete");
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_queue"),
      expect.arrayContaining(["tasks", "rec_2", "delete", "{}"]),
    );
  });
});

describe("getPendingEntries", () => {
  it("returns empty array when no pending entries", () => {
    (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([]);
    expect(getPendingEntries()).toEqual([]);
  });

  it("maps rows to SyncQueueEntry objects", () => {
    (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([
      {
        id: 1,
        object_name: "tasks",
        record_id: "r1",
        operation: "create",
        payload: "{}",
        status: "pending",
        retries: 0,
        error_message: null,
        created_at: 1000,
        updated_at: 1000,
      },
    ]);
    const entries = getPendingEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].objectName).toBe("tasks");
    expect(entries[0].recordId).toBe("r1");
    expect(entries[0].operation).toBe("create");
    expect(entries[0].status).toBe("pending");
  });
});

describe("getAllQueueEntries", () => {
  it("returns all entries", () => {
    (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([
      {
        id: 1, object_name: "t", record_id: "r", operation: "update",
        payload: "{}", status: "failed", retries: 1, error_message: "err",
        created_at: 1000, updated_at: 2000,
      },
    ]);
    const entries = getAllQueueEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].errorMessage).toBe("err");
  });
});

describe("getConflictEntries", () => {
  it("returns conflict entries", () => {
    (mockDb.getAllSync as jest.Mock).mockReturnValueOnce([]);
    expect(getConflictEntries()).toEqual([]);
  });
});

describe("getPendingCount", () => {
  it("returns count from query", () => {
    (mockDb.getFirstSync as jest.Mock).mockReturnValueOnce({ cnt: 5 });
    expect(getPendingCount()).toBe(5);
  });

  it("returns 0 when row is null", () => {
    (mockDb.getFirstSync as jest.Mock).mockReturnValueOnce(null);
    expect(getPendingCount()).toBe(0);
  });
});

describe("status update functions", () => {
  it("markInProgress updates status", () => {
    markInProgress(1);
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining("in_progress"),
      expect.arrayContaining([1]),
    );
  });

  it("markCompleted deletes the entry", () => {
    markCompleted(2);
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE"),
      [2],
    );
  });

  it("markFailed updates status and error message", () => {
    markFailed(3, "timeout");
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining("failed"),
      expect.arrayContaining(["timeout", 3]),
    );
  });

  it("markConflict updates status", () => {
    markConflict(4, "409 conflict");
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining("conflict"),
      expect.arrayContaining(["409 conflict", 4]),
    );
  });

  it("resetEntry sets status back to pending", () => {
    resetEntry(5);
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining("pending"),
      expect.arrayContaining([5]),
    );
  });

  it("discardEntry deletes the entry", () => {
    discardEntry(6);
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE"),
      [6],
    );
  });
});

describe("clearSyncQueue", () => {
  it("deletes all entries", () => {
    clearSyncQueue();
    expect(mockDb.execSync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM sync_queue"),
    );
  });
});
