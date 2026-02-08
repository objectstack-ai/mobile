/**
 * Tests for offline-storage — SQLite-based local record cache
 */
import * as SQLite from "expo-sqlite";
import {
  getDatabase,
  bootstrapOfflineDatabase,
  upsertLocalRecord,
  upsertLocalRecords,
  getLocalRecord,
  getLocalRecords,
  deleteLocalRecord,
  clearLocalRecords,
  clearAllLocalData,
  needsSchemaMigration,
  applySchemaVersion,
} from "~/lib/offline-storage";

const mockDb = (SQLite.openDatabaseSync as jest.Mock).mock.results[0]?.value ??
  (SQLite.openDatabaseSync as jest.Mock)("test");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getDatabase", () => {
  it("returns a database instance", () => {
    const db = getDatabase();
    expect(db).toBeDefined();
  });
});

describe("bootstrapOfflineDatabase", () => {
  it("creates system tables without error", () => {
    expect(() => bootstrapOfflineDatabase()).not.toThrow();
  });
});

describe("upsertLocalRecord", () => {
  it("calls runSync with correct parameters", () => {
    upsertLocalRecord("tasks", "rec_1", { name: "A" });
    const db = getDatabase();
    expect(db.runSync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE"),
      expect.arrayContaining(["tasks", "rec_1"]),
    );
  });
});

describe("upsertLocalRecords", () => {
  it("calls withTransactionSync for batch upsert", () => {
    const records = [
      { id: "r1", name: "A" },
      { id: "r2", name: "B" },
    ];
    upsertLocalRecords("tasks", records);
    const db = getDatabase();
    expect(db.withTransactionSync).toHaveBeenCalled();
  });
});

describe("getLocalRecord", () => {
  it("returns null when record does not exist", () => {
    const result = getLocalRecord("tasks", "unknown");
    expect(result).toBeNull();
  });

  it("parses and returns record data when found", () => {
    const db = getDatabase();
    (db.getFirstSync as jest.Mock).mockReturnValueOnce({
      data: JSON.stringify({ id: "r1", name: "Test" }),
    });
    const result = getLocalRecord("tasks", "r1");
    expect(result).toEqual({ id: "r1", name: "Test" });
  });

  it("returns null for invalid JSON", () => {
    const db = getDatabase();
    (db.getFirstSync as jest.Mock).mockReturnValueOnce({
      data: "not-json",
    });
    const result = getLocalRecord("tasks", "r1");
    expect(result).toBeNull();
  });
});

describe("getLocalRecords", () => {
  it("returns empty array when no records", () => {
    const result = getLocalRecords("tasks");
    expect(result).toEqual([]);
  });

  it("returns parsed records", () => {
    const db = getDatabase();
    (db.getAllSync as jest.Mock).mockReturnValueOnce([
      { data: JSON.stringify({ id: "r1" }) },
      { data: JSON.stringify({ id: "r2" }) },
    ]);
    const result = getLocalRecords("tasks");
    expect(result).toEqual([{ id: "r1" }, { id: "r2" }]);
  });

  it("filters out invalid JSON entries", () => {
    const db = getDatabase();
    (db.getAllSync as jest.Mock).mockReturnValueOnce([
      { data: JSON.stringify({ id: "r1" }) },
      { data: "bad-json" },
    ]);
    const result = getLocalRecords("tasks");
    expect(result).toEqual([{ id: "r1" }]);
  });
});

describe("deleteLocalRecord", () => {
  it("calls runSync with DELETE", () => {
    deleteLocalRecord("tasks", "rec_1");
    const db = getDatabase();
    expect(db.runSync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE"),
      ["tasks", "rec_1"],
    );
  });
});

describe("clearLocalRecords", () => {
  it("clears records for a specific object", () => {
    clearLocalRecords("tasks");
    const db = getDatabase();
    expect(db.runSync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE"),
      ["tasks"],
    );
  });
});

describe("clearAllLocalData", () => {
  it("clears both tables", () => {
    clearAllLocalData();
    const db = getDatabase();
    expect(db.execSync).toHaveBeenCalledTimes(2);
  });
});

describe("needsSchemaMigration", () => {
  it("returns true when no schema version exists", () => {
    const db = getDatabase();
    (db.getFirstSync as jest.Mock).mockReturnValueOnce(null);
    expect(needsSchemaMigration("tasks", "[]")).toBe(true);
  });

  it("returns false when fields match", () => {
    const db = getDatabase();
    (db.getFirstSync as jest.Mock).mockReturnValueOnce({
      object_name: "tasks",
      version: 1,
      fields_json: "[\"name\"]",
    });
    expect(needsSchemaMigration("tasks", "[\"name\"]")).toBe(false);
  });

  it("returns true when fields differ", () => {
    const db = getDatabase();
    (db.getFirstSync as jest.Mock).mockReturnValueOnce({
      object_name: "tasks",
      version: 1,
      fields_json: "[\"name\"]",
    });
    expect(needsSchemaMigration("tasks", "[\"name\",\"status\"]")).toBe(true);
  });
});

describe("applySchemaVersion", () => {
  it("creates version 1 for new object", () => {
    const db = getDatabase();
    (db.getFirstSync as jest.Mock).mockReturnValueOnce(null);
    applySchemaVersion("tasks", "[\"name\"]");
    expect(db.runSync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE"),
      expect.arrayContaining(["tasks", 1, "[\"name\"]"]),
    );
  });

  it("increments version for existing object", () => {
    const db = getDatabase();
    (db.getFirstSync as jest.Mock).mockReturnValueOnce({
      object_name: "tasks",
      version: 2,
      fields_json: "[]",
    });
    applySchemaVersion("tasks", "[\"name\"]");
    expect(db.runSync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE"),
      expect.arrayContaining(["tasks", 3, "[\"name\"]"]),
    );
  });
});
