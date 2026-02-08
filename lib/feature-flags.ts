/**
 * Feature flags — gradual rollout and A/B testing support.
 *
 * Flags are fetched from a remote endpoint, cached locally via MMKV,
 * and evaluated with rollout-percentage support (hash-based, deterministic).
 */

export interface FeatureFlag {
  /** Unique flag key (e.g. "new_dashboard") */
  key: string;
  /** Whether the flag is enabled globally */
  enabled: boolean;
  /** Rollout percentage 0–100. If set, uses deterministic hashing. */
  rolloutPercentage?: number;
  /** Optional payload attached to the flag */
  payload?: Record<string, unknown>;
}

export interface FeatureFlagConfig {
  /** Remote endpoint that returns FeatureFlag[] JSON */
  endpoint?: string;
  /** Polling interval in ms. Default 300 000 (5 min) */
  refreshIntervalMs?: number;
  /** Fallback defaults when remote is unavailable */
  defaults?: FeatureFlag[];
}

type FlagListener = (flags: FeatureFlag[]) => void;

/**
 * Simple deterministic hash for rollout bucketing.
 * Returns a value 0–99.
 */
export function hashUserToPercentage(userId: string, flagKey: string): number {
  const str = `${flagKey}:${userId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Create a feature flag manager instance.
 */
export function createFeatureFlagManager(config: FeatureFlagConfig = {}) {
  const { endpoint, refreshIntervalMs = 300_000, defaults = [] } = config;

  let flags: FeatureFlag[] = [...defaults];
  let userId: string | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const listeners: Set<FlagListener> = new Set();

  function notify() {
    listeners.forEach((fn) => fn(flags));
  }

  /** Set the current user id for rollout evaluation */
  function setUserId(id: string | null) {
    userId = id;
  }

  /** Fetch flags from the remote endpoint */
  async function refresh(): Promise<void> {
    if (!endpoint) return;
    try {
      const res = await fetch(endpoint);
      if (!res.ok) return;
      const data: FeatureFlag[] = await res.json();
      flags = data;
      notify();
    } catch {
      // Keep existing flags on failure
    }
  }

  /** Start periodic refresh */
  function startPolling() {
    stopPolling();
    refresh();
    intervalId = setInterval(refresh, refreshIntervalMs);
  }

  /** Stop periodic refresh */
  function stopPolling() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  /** Evaluate whether a flag is enabled for the current user */
  function isEnabled(key: string): boolean {
    const flag = flags.find((f) => f.key === key);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // If rolloutPercentage is defined, use deterministic bucketing.
    // Without a userId we cannot bucket, so default to disabled.
    if (flag.rolloutPercentage != null) {
      if (!userId) return false;
      return hashUserToPercentage(userId, key) < flag.rolloutPercentage;
    }

    return flag.enabled;
  }

  /** Get the payload attached to a flag, or undefined */
  function getPayload(key: string): Record<string, unknown> | undefined {
    return flags.find((f) => f.key === key)?.payload;
  }

  /** Get all current flags */
  function getFlags(): FeatureFlag[] {
    return [...flags];
  }

  /** Override flags locally (useful for testing / QA) */
  function overrideFlags(overrides: FeatureFlag[]) {
    flags = overrides;
    notify();
  }

  /** Subscribe to flag changes */
  function subscribe(listener: FlagListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  /** Teardown */
  function destroy() {
    stopPolling();
    listeners.clear();
    flags = [];
  }

  return {
    setUserId,
    refresh,
    startPolling,
    stopPolling,
    isEnabled,
    getPayload,
    getFlags,
    overrideFlags,
    subscribe,
    destroy,
  };
}

export type FeatureFlagManager = ReturnType<typeof createFeatureFlagManager>;

/** Global singleton flag manager */
export const featureFlags = createFeatureFlagManager();
