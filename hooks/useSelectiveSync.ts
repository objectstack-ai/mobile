import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface SyncObjectConfig {
  object: string;
  enabled: boolean;
  fields?: string[];
  filters?: Record<string, unknown>;
  priority: "high" | "medium" | "low";
  lastSyncedAt?: string;
  recordCount?: number;
}

export interface SyncStatus {
  object: string;
  status: "syncing" | "synced" | "error" | "pending";
  progress: number;
  recordsSynced: number;
  recordsTotal: number;
  error?: string;
}

export interface UseSelectiveSyncResult {
  /** Sync configuration for each object */
  configs: SyncObjectConfig[];
  /** Current sync status per object */
  statuses: SyncStatus[];
  /** Overall sync progress (0-100) */
  overallProgress: number;
  /** Number of objects currently syncing */
  syncingCount: number;
  /** Set sync configurations */
  setConfigs: (configs: SyncObjectConfig[]) => void;
  /** Enable sync for an object */
  enableSync: (object: string) => void;
  /** Disable sync for an object */
  disableSync: (object: string) => void;
  /** Update sync status */
  updateStatus: (status: SyncStatus) => void;
  /** Set all statuses */
  setStatuses: (statuses: SyncStatus[]) => void;
  /** Get enabled objects sorted by priority */
  enabledObjects: SyncObjectConfig[];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for selective offline sync configuration — choose which
 * objects/fields to sync, track progress per object.
 *
 * Implements v1.6 Advanced Offline (selective sync).
 *
 * ```ts
 * const { configs, enableSync, disableSync, overallProgress } = useSelectiveSync();
 * enableSync("accounts");
 * ```
 */
export function useSelectiveSync(): UseSelectiveSyncResult {
  const [configs, setConfigsState] = useState<SyncObjectConfig[]>([]);
  const [statuses, setStatusesState] = useState<SyncStatus[]>([]);

  const enabledObjects = useMemo(() => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return configs
      .filter((c) => c.enabled)
      .sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
  }, [configs]);

  const overallProgress = useMemo(() => {
    if (statuses.length === 0) return 0;
    const total = statuses.reduce((sum, s) => sum + s.progress, 0);
    return Math.round(total / statuses.length);
  }, [statuses]);

  const syncingCount = useMemo(
    () => statuses.filter((s) => s.status === "syncing").length,
    [statuses],
  );

  const setConfigs = useCallback((items: SyncObjectConfig[]) => {
    setConfigsState(items);
  }, []);

  const enableSync = useCallback((object: string) => {
    setConfigsState((prev) =>
      prev.map((c) => (c.object === object ? { ...c, enabled: true } : c)),
    );
  }, []);

  const disableSync = useCallback((object: string) => {
    setConfigsState((prev) =>
      prev.map((c) => (c.object === object ? { ...c, enabled: false } : c)),
    );
  }, []);

  const updateStatus = useCallback((status: SyncStatus) => {
    setStatusesState((prev) => {
      const exists = prev.findIndex((s) => s.object === status.object);
      if (exists >= 0) {
        return prev.map((s) => (s.object === status.object ? status : s));
      }
      return [...prev, status];
    });
  }, []);

  const setStatuses = useCallback((items: SyncStatus[]) => {
    setStatusesState(items);
  }, []);

  return {
    configs,
    statuses,
    overallProgress,
    syncingCount,
    setConfigs,
    enableSync,
    disableSync,
    updateStatus,
    setStatuses,
    enabledObjects,
  };
}
