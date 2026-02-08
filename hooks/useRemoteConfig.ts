/**
 * useRemoteConfig — React hook for accessing remote configuration values.
 *
 * Usage:
 *   const maxRetries = useRemoteConfigValue<number>("maxRetries", 3);
 */
import { useCallback, useEffect, useState } from "react";
import { remoteConfig, type RemoteConfigManager } from "~/lib/remote-config";

/**
 * Get a single remote config value reactively.
 */
export function useRemoteConfigValue<T>(
  key: string,
  fallback: T,
  manager: RemoteConfigManager = remoteConfig,
): T {
  const [value, setValue] = useState<T>(
    () => manager.getValueWithDefault<T>(key, fallback),
  );

  useEffect(() => {
    const unsub = manager.subscribe(() => {
      setValue(manager.getValueWithDefault<T>(key, fallback));
    });
    setValue(manager.getValueWithDefault<T>(key, fallback));
    return unsub;
  }, [key, fallback, manager]);

  return value;
}

/**
 * Get all remote config values and the refresh function.
 */
export function useRemoteConfig(manager: RemoteConfigManager = remoteConfig) {
  const [config, setConfig] = useState(() => manager.getAll());

  useEffect(() => {
    const unsub = manager.subscribe(() => setConfig(manager.getAll()));
    setConfig(manager.getAll());
    return unsub;
  }, [manager]);

  const refresh = useCallback(() => manager.refresh(), [manager]);

  return { config, refresh };
}
