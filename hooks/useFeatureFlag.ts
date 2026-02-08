/**
 * useFeatureFlag — React hook for evaluating feature flags.
 *
 * Usage:
 *   const isNewDashboard = useFeatureFlag("new_dashboard");
 */
import { useCallback, useEffect, useState } from "react";
import { featureFlags, type FeatureFlagManager } from "~/lib/feature-flags";

/**
 * Subscribe to a single feature flag and re-render when it changes.
 *
 * @param key  Flag key to evaluate
 * @param manager  Optional manager instance (defaults to global singleton)
 */
export function useFeatureFlag(
  key: string,
  manager: FeatureFlagManager = featureFlags,
): boolean {
  const [enabled, setEnabled] = useState(() => manager.isEnabled(key));

  useEffect(() => {
    // Re-evaluate whenever flags change
    const unsub = manager.subscribe(() => {
      setEnabled(manager.isEnabled(key));
    });
    // Also sync on mount in case flags were updated between render and effect
    setEnabled(manager.isEnabled(key));
    return unsub;
  }, [key, manager]);

  return enabled;
}

/**
 * Get the payload of a feature flag reactively.
 */
export function useFeatureFlagPayload(
  key: string,
  manager: FeatureFlagManager = featureFlags,
): Record<string, unknown> | undefined {
  const [payload, setPayload] = useState(() => manager.getPayload(key));

  useEffect(() => {
    const unsub = manager.subscribe(() => {
      setPayload(manager.getPayload(key));
    });
    setPayload(manager.getPayload(key));
    return unsub;
  }, [key, manager]);

  return payload;
}

/**
 * Get all flags and the refresh function.
 */
export function useFeatureFlags(manager: FeatureFlagManager = featureFlags) {
  const [flags, setFlags] = useState(() => manager.getFlags());

  useEffect(() => {
    const unsub = manager.subscribe(() => setFlags(manager.getFlags()));
    setFlags(manager.getFlags());
    return unsub;
  }, [manager]);

  const refresh = useCallback(() => manager.refresh(), [manager]);

  return { flags, refresh };
}
