import { create } from "zustand";
import type { SyncQueueEntry } from "~/lib/sync-queue";

export interface SyncState {
  /** Whether a sync cycle is currently running */
  isSyncing: boolean;
  /** Number of entries waiting to be synced */
  pendingCount: number;
  /** Last successful sync timestamp */
  lastSyncedAt: number | null;
  /** Entries that need conflict resolution */
  conflicts: SyncQueueEntry[];
  /** Set syncing state */
  setSyncing: (syncing: boolean) => void;
  /** Update pending count */
  setPendingCount: (count: number) => void;
  /** Record a successful sync */
  setLastSyncedAt: (ts: number) => void;
  /** Set conflict entries */
  setConflicts: (entries: SyncQueueEntry[]) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  pendingCount: 0,
  lastSyncedAt: null,
  conflicts: [],
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
  setConflicts: (entries) => set({ conflicts: entries }),
}));
