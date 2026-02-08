/**
 * Write-ahead sync queue for offline mutations.
 *
 * When the device is offline, mutations are persisted to SQLite.
 * Once connectivity is restored the queue is drained in FIFO order,
 * with conflict detection and optional manual override.
 */

import * as SQLite from "expo-sqlite";
import { getDatabase } from "./offline-storage";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type SyncOperation = "create" | "update" | "delete";
export type SyncStatus = "pending" | "in_progress" | "failed" | "conflict";

export interface SyncQueueEntry {
  id: number;
  objectName: string;
  recordId: string;
  operation: SyncOperation;
  /** JSON-encoded payload for create/update */
  payload: string;
  status: SyncStatus;
  /** Number of retry attempts */
  retries: number;
  /** Error message from the last failed attempt */
  errorMessage: string | null;
  /** Timestamp (ms) when the entry was created */
  createdAt: number;
  /** Timestamp (ms) of the last attempt */
  updatedAt: number;
}

export interface ConflictInfo {
  entry: SyncQueueEntry;
  serverRecord: Record<string, unknown> | null;
  localRecord: Record<string, unknown> | null;
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                           */
/* ------------------------------------------------------------------ */

/**
 * Ensure the sync_queue table exists.
 * Call once at app startup (after bootstrapOfflineDatabase).
 */
export function bootstrapSyncQueue(): void {
  const db = getDatabase();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      object_name  TEXT    NOT NULL,
      record_id    TEXT    NOT NULL,
      operation    TEXT    NOT NULL CHECK (operation IN ('create','update','delete')),
      payload      TEXT    NOT NULL DEFAULT '{}',
      status       TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','failed','conflict')),
      retries      INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
}

/* ------------------------------------------------------------------ */
/*  Enqueue                                                             */
/* ------------------------------------------------------------------ */

/**
 * Add a mutation to the sync queue.
 */
export function enqueueMutation(
  objectName: string,
  recordId: string,
  operation: SyncOperation,
  payload: Record<string, unknown> = {},
): void {
  const db = getDatabase();
  const now = Date.now();
  db.runSync(
    `INSERT INTO sync_queue (object_name, record_id, operation, payload, status, retries, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
    [objectName, recordId, operation, JSON.stringify(payload), now, now],
  );
}

/* ------------------------------------------------------------------ */
/*  Query helpers                                                       */
/* ------------------------------------------------------------------ */

function rowToEntry(row: Record<string, unknown>): SyncQueueEntry {
  return {
    id: row.id as number,
    objectName: row.object_name as string,
    recordId: row.record_id as string,
    operation: row.operation as SyncOperation,
    payload: row.payload as string,
    status: row.status as SyncStatus,
    retries: row.retries as number,
    errorMessage: (row.error_message as string) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

/** Get all pending entries, oldest first */
export function getPendingEntries(): SyncQueueEntry[] {
  const db = getDatabase();
  const rows = db.getAllSync<Record<string, unknown>>(
    "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC",
  );
  return rows.map(rowToEntry);
}

/** Get all entries (for UI display) */
export function getAllQueueEntries(): SyncQueueEntry[] {
  const db = getDatabase();
  const rows = db.getAllSync<Record<string, unknown>>(
    "SELECT * FROM sync_queue ORDER BY created_at DESC",
  );
  return rows.map(rowToEntry);
}

/** Get entries with conflict status */
export function getConflictEntries(): SyncQueueEntry[] {
  const db = getDatabase();
  const rows = db.getAllSync<Record<string, unknown>>(
    "SELECT * FROM sync_queue WHERE status = 'conflict' ORDER BY created_at ASC",
  );
  return rows.map(rowToEntry);
}

/** Count pending entries */
export function getPendingCount(): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM sync_queue WHERE status IN ('pending','failed')",
  );
  return row?.cnt ?? 0;
}

/* ------------------------------------------------------------------ */
/*  Status updates                                                      */
/* ------------------------------------------------------------------ */

export function markInProgress(id: number): void {
  const db = getDatabase();
  db.runSync(
    "UPDATE sync_queue SET status = 'in_progress', updated_at = ? WHERE id = ?",
    [Date.now(), id],
  );
}

export function markCompleted(id: number): void {
  const db = getDatabase();
  db.runSync("DELETE FROM sync_queue WHERE id = ?", [id]);
}

export function markFailed(id: number, errorMessage: string): void {
  const db = getDatabase();
  db.runSync(
    "UPDATE sync_queue SET status = 'failed', retries = retries + 1, error_message = ?, updated_at = ? WHERE id = ?",
    [errorMessage, Date.now(), id],
  );
}

export function markConflict(id: number, errorMessage: string): void {
  const db = getDatabase();
  db.runSync(
    "UPDATE sync_queue SET status = 'conflict', error_message = ?, updated_at = ? WHERE id = ?",
    [errorMessage, Date.now(), id],
  );
}

/** Reset a failed/conflict entry back to pending for retry */
export function resetEntry(id: number): void {
  const db = getDatabase();
  db.runSync(
    "UPDATE sync_queue SET status = 'pending', error_message = NULL, updated_at = ? WHERE id = ?",
    [Date.now(), id],
  );
}

/** Discard a queue entry (user chose to drop it) */
export function discardEntry(id: number): void {
  const db = getDatabase();
  db.runSync("DELETE FROM sync_queue WHERE id = ?", [id]);
}

/** Clear the entire queue */
export function clearSyncQueue(): void {
  const db = getDatabase();
  db.execSync("DELETE FROM sync_queue;");
}
