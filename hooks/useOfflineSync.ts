import { useCallback, useEffect, useRef } from "react";
import { useClient } from "@objectstack/client-react";
import { useAppStore } from "~/stores/app-store";
import { useSyncStore } from "~/stores/sync-store";
import {
  getPendingEntries,
  getPendingCount,
  getConflictEntries,
  markInProgress,
  markCompleted,
  markFailed,
  markConflict,
} from "~/lib/sync-queue";

const MAX_RETRIES = 5;

/**
 * Hook that drives the offline sync cycle.
 *
 * When the device comes back online it drains the sync queue entry-by-entry,
 * applying creates, updates, and deletes against the server.  Conflicts
 * (409 responses) are surfaced for manual resolution.
 */
export function useOfflineSync() {
  const client = useClient();
  const isOffline = useAppStore((s) => s.isOffline);
  const {
    isSyncing,
    pendingCount,
    lastSyncedAt,
    conflicts,
    setSyncing,
    setPendingCount,
    setLastSyncedAt,
    setConflicts,
  } = useSyncStore();

  const syncingRef = useRef(false);

  /** Refresh counts from the database */
  const refreshCounts = useCallback(() => {
    setPendingCount(getPendingCount());
    setConflicts(getConflictEntries());
  }, [setPendingCount, setConflicts]);

  /** Attempt to sync a single entry */
  const syncEntry = useCallback(
    async (entry: ReturnType<typeof getPendingEntries>[0]) => {
      markInProgress(entry.id);

      try {
        const payload = JSON.parse(entry.payload) as Record<string, unknown>;

        switch (entry.operation) {
          case "create":
            await client.data.create(entry.objectName, payload);
            break;
          case "update":
            await client.data.update(entry.objectName, entry.recordId, payload);
            break;
          case "delete":
            await client.data.delete(entry.objectName, entry.recordId);
            break;
        }

        markCompleted(entry.id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const isConflict = message.includes("409") || message.toLowerCase().includes("conflict");

        if (isConflict) {
          markConflict(entry.id, message);
        } else if (entry.retries >= MAX_RETRIES) {
          markFailed(entry.id, `Max retries exceeded: ${message}`);
        } else {
          markFailed(entry.id, message);
        }
      }
    },
    [client],
  );

  /** Drain the queue */
  const runSync = useCallback(async () => {
    if (syncingRef.current || isOffline) return;
    syncingRef.current = true;
    setSyncing(true);

    try {
      const entries = getPendingEntries();
      for (const entry of entries) {
        if (isOffline) break; // Stop if we go offline mid-sync
        await syncEntry(entry);
      }
      setLastSyncedAt(Date.now());
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      refreshCounts();
    }
  }, [isOffline, syncEntry, setSyncing, setLastSyncedAt, refreshCounts]);

  // Auto-sync when coming online
  useEffect(() => {
    if (!isOffline) {
      void runSync();
    }
  }, [isOffline, runSync]);

  // Refresh counts on mount
  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  return {
    isSyncing,
    pendingCount,
    lastSyncedAt,
    conflicts,
    /** Manually trigger a sync */
    sync: runSync,
    /** Refresh queue counts */
    refreshCounts,
  };
}
