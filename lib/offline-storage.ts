/**
 * Offline-first local storage backend using expo-sqlite.
 *
 * Provides a generic key/value store for caching records locally and a
 * structured schema-migration strategy driven by object metadata.
 */

import * as SQLite from "expo-sqlite";

/* ------------------------------------------------------------------ */
/*  Database singleton                                                  */
/* ------------------------------------------------------------------ */

let _db: SQLite.SQLiteDatabase | null = null;

/** Open (or return existing) database instance */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync("objectstack_offline.db");
    _db.execSync("PRAGMA journal_mode = WAL;");
  }
  return _db;
}

/* ------------------------------------------------------------------ */
/*  Bootstrap — create system tables                                    */
/* ------------------------------------------------------------------ */

/**
 * Ensure the core offline tables exist.
 * Call this once at app startup.
 */
export function bootstrapOfflineDatabase(): void {
  const db = getDatabase();

  db.execSync(`
    CREATE TABLE IF NOT EXISTS offline_records (
      object_name TEXT NOT NULL,
      record_id   TEXT NOT NULL,
      data        TEXT NOT NULL,
      updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      PRIMARY KEY (object_name, record_id)
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS offline_schema_versions (
      object_name TEXT PRIMARY KEY,
      version     INTEGER NOT NULL DEFAULT 1,
      fields_json TEXT NOT NULL,
      updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
}

/* ------------------------------------------------------------------ */
/*  Record CRUD helpers                                                 */
/* ------------------------------------------------------------------ */

/** Upsert a single record into the local cache */
export function upsertLocalRecord(
  objectName: string,
  recordId: string,
  data: Record<string, unknown>,
): void {
  const db = getDatabase();
  db.runSync(
    `INSERT OR REPLACE INTO offline_records (object_name, record_id, data, updated_at)
     VALUES (?, ?, ?, ?)`,
    [objectName, recordId, JSON.stringify(data), Date.now()],
  );
}

/** Upsert multiple records in a single transaction */
export function upsertLocalRecords(
  objectName: string,
  records: Record<string, unknown>[],
): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    for (const record of records) {
      const id = String(record.id ?? record._id ?? "");
      if (!id) continue;
      db.runSync(
        `INSERT OR REPLACE INTO offline_records (object_name, record_id, data, updated_at)
         VALUES (?, ?, ?, ?)`,
        [objectName, id, JSON.stringify(record), Date.now()],
      );
    }
  });
}

/** Get a single local record */
export function getLocalRecord(
  objectName: string,
  recordId: string,
): Record<string, unknown> | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ data: string }>(
    "SELECT data FROM offline_records WHERE object_name = ? AND record_id = ?",
    [objectName, recordId],
  );
  if (!row) return null;
  try {
    return JSON.parse(row.data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Get all local records for an object */
export function getLocalRecords(
  objectName: string,
): Record<string, unknown>[] {
  const db = getDatabase();
  const rows = db.getAllSync<{ data: string }>(
    "SELECT data FROM offline_records WHERE object_name = ? ORDER BY updated_at DESC",
    [objectName],
  );
  return rows
    .map((row) => {
      try {
        return JSON.parse(row.data) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Record<string, unknown>[];
}

/** Delete a local record */
export function deleteLocalRecord(objectName: string, recordId: string): void {
  const db = getDatabase();
  db.runSync(
    "DELETE FROM offline_records WHERE object_name = ? AND record_id = ?",
    [objectName, recordId],
  );
}

/** Clear all local records for an object */
export function clearLocalRecords(objectName: string): void {
  const db = getDatabase();
  db.runSync("DELETE FROM offline_records WHERE object_name = ?", [objectName]);
}

/** Clear the entire offline database */
export function clearAllLocalData(): void {
  const db = getDatabase();
  db.execSync("DELETE FROM offline_records;");
  db.execSync("DELETE FROM offline_schema_versions;");
}

/* ------------------------------------------------------------------ */
/*  Schema migration                                                    */
/* ------------------------------------------------------------------ */

interface SchemaVersion {
  object_name: string;
  version: number;
  fields_json: string;
}

/**
 * Check whether the local schema for an object needs migration.
 * Returns true if the server fields have changed since last sync.
 */
export function needsSchemaMigration(
  objectName: string,
  serverFieldsJson: string,
): boolean {
  const db = getDatabase();
  const row = db.getFirstSync<SchemaVersion>(
    "SELECT * FROM offline_schema_versions WHERE object_name = ?",
    [objectName],
  );
  if (!row) return true;
  return row.fields_json !== serverFieldsJson;
}

/**
 * Apply a schema migration: store the new field definitions and
 * bump the version counter.  Existing records are kept — the mobile
 * client is tolerant of missing/extra columns since data is JSON.
 */
export function applySchemaVersion(
  objectName: string,
  fieldsJson: string,
): void {
  const db = getDatabase();
  const existing = db.getFirstSync<SchemaVersion>(
    "SELECT * FROM offline_schema_versions WHERE object_name = ?",
    [objectName],
  );
  const nextVersion = existing ? existing.version + 1 : 1;

  db.runSync(
    `INSERT OR REPLACE INTO offline_schema_versions (object_name, version, fields_json, updated_at)
     VALUES (?, ?, ?, ?)`,
    [objectName, nextVersion, fieldsJson, Date.now()],
  );
}
