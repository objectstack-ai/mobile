import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface OfflineConfig {
  enabled: boolean;
  strategy: "cache_first" | "network_first" | "cache_only" | "network_only";
  maxAge: number;
  maxSize: number;
}

export interface CacheConfig {
  storage: "sqlite" | "async_storage" | "memory";
  maxEntries: number;
  ttl: number;
}

export interface EvictionPolicy {
  type: "lru" | "lfu" | "fifo" | "ttl";
  maxItems: number;
  maxAge: number;
}

export interface UseOfflineConfigResult {
  /** Current offline configuration */
  config: OfflineConfig;
  /** Current cache configuration */
  cacheConfig: CacheConfig;
  /** Current eviction policy */
  evictionPolicy: EvictionPolicy;
  /** Set the offline configuration */
  setConfig: (config: OfflineConfig) => void;
  /** Set the cache configuration */
  setCacheConfig: (config: CacheConfig) => void;
  /** Set the eviction policy */
  setEvictionPolicy: (policy: EvictionPolicy) => void;
  /** Whether offline mode is enabled */
  isOfflineEnabled: boolean;
  /** Determine whether a request should be cached based on strategy */
  shouldCache: (request: string) => boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for server-driven offline strategy from `OfflineConfigSchema`.
 *
 * Implements Phase 25 Offline Protocol.
 *
 * ```ts
 * const { config, isOfflineEnabled, shouldCache, setConfig } =
 *   useOfflineConfig();
 * setConfig({ enabled: true, strategy: "cache_first", maxAge: 3600, maxSize: 50 });
 * const cache = shouldCache("/api/accounts");
 * ```
 */
export function useOfflineConfig(): UseOfflineConfigResult {
  const [config, setConfigState] = useState<OfflineConfig>({
    enabled: false,
    strategy: "network_first",
    maxAge: 0,
    maxSize: 0,
  });
  const [cacheConfig, setCacheConfigState] = useState<CacheConfig>({
    storage: "memory",
    maxEntries: 0,
    ttl: 0,
  });
  const [evictionPolicy, setEvictionPolicyState] = useState<EvictionPolicy>({
    type: "lru",
    maxItems: 0,
    maxAge: 0,
  });

  /* ---- computed --------------------------------------------------- */

  const isOfflineEnabled = useMemo(() => config.enabled, [config.enabled]);

  const shouldCache = useCallback(
    (_request: string): boolean => {
      if (!config.enabled) return false;
      if (config.strategy === "network_only") return false;
      return true;
    },
    [config.enabled, config.strategy],
  );

  /* ---- setters ---------------------------------------------------- */

  const setConfig = useCallback((cfg: OfflineConfig) => {
    setConfigState(cfg);
  }, []);

  const setCacheConfig = useCallback((cfg: CacheConfig) => {
    setCacheConfigState(cfg);
  }, []);

  const setEvictionPolicy = useCallback((policy: EvictionPolicy) => {
    setEvictionPolicyState(policy);
  }, []);

  return {
    config,
    cacheConfig,
    evictionPolicy,
    setConfig,
    setCacheConfig,
    setEvictionPolicy,
    isOfflineEnabled,
    shouldCache,
  };
}
