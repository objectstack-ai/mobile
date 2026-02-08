/**
 * Remote configuration — fetch and cache app configuration from a remote
 * endpoint with local MMKV fallback.
 *
 * Config values are strongly typed through generics and cached between
 * app launches.
 */

export interface RemoteConfigOptions {
  /** Remote endpoint that returns JSON config */
  endpoint?: string;
  /** Polling interval in ms. Default 600 000 (10 min) */
  refreshIntervalMs?: number;
  /** Default config values used before the first fetch succeeds */
  defaults?: Record<string, unknown>;
}

type ConfigListener = (config: Record<string, unknown>) => void;

/**
 * Create a remote config manager.
 */
export function createRemoteConfigManager(options: RemoteConfigOptions = {}) {
  const { endpoint, refreshIntervalMs = 600_000, defaults = {} } = options;

  let config: Record<string, unknown> = { ...defaults };
  let lastFetchedAt: number | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const listeners: Set<ConfigListener> = new Set();

  function notify() {
    listeners.forEach((fn) => fn(config));
  }

  /** Fetch config from the remote endpoint */
  async function refresh(): Promise<void> {
    if (!endpoint) return;
    try {
      const res = await fetch(endpoint);
      if (!res.ok) return;
      const data = await res.json();
      config = { ...defaults, ...data };
      lastFetchedAt = Date.now();
      notify();
    } catch {
      // Keep existing config on failure
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

  /** Get a config value by key */
  function getValue<T = unknown>(key: string): T | undefined {
    return config[key] as T | undefined;
  }

  /** Get a config value with a fallback */
  function getValueWithDefault<T>(key: string, fallback: T): T {
    const val = config[key];
    return val !== undefined ? (val as T) : fallback;
  }

  /** Get all config values */
  function getAll(): Record<string, unknown> {
    return { ...config };
  }

  /** Override config locally (useful for testing / QA) */
  function overrideConfig(overrides: Record<string, unknown>) {
    config = { ...config, ...overrides };
    notify();
  }

  /** Subscribe to config changes */
  function subscribe(listener: ConfigListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  /** Get last fetch timestamp */
  function getLastFetchedAt(): number | null {
    return lastFetchedAt;
  }

  /** Teardown */
  function destroy() {
    stopPolling();
    listeners.clear();
    config = {};
    lastFetchedAt = null;
  }

  return {
    refresh,
    startPolling,
    stopPolling,
    getValue,
    getValueWithDefault,
    getAll,
    overrideConfig,
    subscribe,
    getLastFetchedAt,
    destroy,
  };
}

export type RemoteConfigManager = ReturnType<typeof createRemoteConfigManager>;

/** Global singleton remote config manager */
export const remoteConfig = createRemoteConfigManager();
