import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface SyncConfig {
  enabled: boolean;
  interval: number;
  batchSize: number;
  retryPolicy: { maxRetries: number; backoff: number };
  conflictStrategy: string;
}

export interface ConflictResolutionConfig {
  strategy:
    | "last_write_wins"
    | "client_wins"
    | "server_wins"
    | "manual";
  fieldLevel: boolean;
}

export interface PersistStorageConfig {
  type: "sqlite" | "indexeddb" | "filesystem";
  encryption: boolean;
  compression: boolean;
}

export interface UseSyncConfigResult {
  /** Current sync configuration */
  syncConfig: SyncConfig;
  /** Current conflict resolution configuration */
  conflictConfig: ConflictResolutionConfig;
  /** Current persist storage configuration */
  storageConfig: PersistStorageConfig;
  /** Set the sync configuration */
  setSyncConfig: (config: SyncConfig) => void;
  /** Set the conflict resolution configuration */
  setConflictConfig: (config: ConflictResolutionConfig) => void;
  /** Set the persist storage configuration */
  setStorageConfig: (config: PersistStorageConfig) => void;
  /** Whether sync is enabled */
  isSyncEnabled: boolean;
  /** Determine whether a retry should occur based on retryPolicy */
  shouldRetry: (attempt: number) => boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for spec-driven sync behavior from `SyncConfigSchema`.
 *
 * Implements Phase 25 Sync Protocol.
 *
 * ```ts
 * const { syncConfig, isSyncEnabled, shouldRetry, setSyncConfig } =
 *   useSyncConfig();
 * setSyncConfig({
 *   enabled: true, interval: 30000, batchSize: 50,
 *   retryPolicy: { maxRetries: 3, backoff: 1000 }, conflictStrategy: "server_wins",
 * });
 * const retry = shouldRetry(2); // true
 * ```
 */
export function useSyncConfig(): UseSyncConfigResult {
  const [syncConfig, setSyncConfigState] = useState<SyncConfig>({
    enabled: false,
    interval: 0,
    batchSize: 0,
    retryPolicy: { maxRetries: 0, backoff: 0 },
    conflictStrategy: "last_write_wins",
  });
  const [conflictConfig, setConflictConfigState] =
    useState<ConflictResolutionConfig>({
      strategy: "last_write_wins",
      fieldLevel: false,
    });
  const [storageConfig, setStorageConfigState] = useState<PersistStorageConfig>(
    {
      type: "sqlite",
      encryption: false,
      compression: false,
    },
  );

  /* ---- computed --------------------------------------------------- */

  const isSyncEnabled = useMemo(
    () => syncConfig.enabled,
    [syncConfig.enabled],
  );

  const shouldRetry = useCallback(
    (attempt: number): boolean => {
      return attempt < syncConfig.retryPolicy.maxRetries;
    },
    [syncConfig.retryPolicy.maxRetries],
  );

  /* ---- setters ---------------------------------------------------- */

  const setSyncConfig = useCallback((cfg: SyncConfig) => {
    setSyncConfigState(cfg);
  }, []);

  const setConflictConfig = useCallback((cfg: ConflictResolutionConfig) => {
    setConflictConfigState(cfg);
  }, []);

  const setStorageConfig = useCallback((cfg: PersistStorageConfig) => {
    setStorageConfigState(cfg);
  }, []);

  return {
    syncConfig,
    conflictConfig,
    storageConfig,
    setSyncConfig,
    setConflictConfig,
    setStorageConfig,
    isSyncEnabled,
    shouldRetry,
  };
}
