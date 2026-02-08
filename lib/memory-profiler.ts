/**
 * Memory leak profiler — lightweight instrumentation for detecting
 * component and subscription leaks in development.
 *
 * Usage:
 *   const tracker = createMemoryTracker();
 *   tracker.track("MyComponent", cleanup);
 *   // later…
 *   tracker.untrack("MyComponent");
 *   tracker.reportLeaks(); // logs leaked entries
 */

export interface TrackedEntry {
  label: string;
  trackedAt: number;
  cleanup?: () => void;
}

export interface MemoryTracker {
  /** Register a resource (component mount, subscription, etc.) */
  track: (label: string, cleanup?: () => void) => void;
  /** Unregister a resource (component unmount, unsubscribe) */
  untrack: (label: string) => void;
  /** Return entries that are still tracked (potential leaks) */
  getTracked: () => TrackedEntry[];
  /** Log any entries that have been tracked longer than `thresholdMs` */
  reportLeaks: (thresholdMs?: number) => TrackedEntry[];
  /** Clean up all tracked entries by invoking their cleanup callbacks */
  disposeAll: () => void;
  /** Reset the tracker to a clean state */
  reset: () => void;
}

/**
 * Create a standalone memory tracker instance.
 * Safe to use in both dev and production (no-op in prod if desired).
 */
export function createMemoryTracker(): MemoryTracker {
  const entries = new Map<string, TrackedEntry>();

  function track(label: string, cleanup?: () => void) {
    entries.set(label, { label, trackedAt: Date.now(), cleanup });
  }

  function untrack(label: string) {
    entries.delete(label);
  }

  function getTracked(): TrackedEntry[] {
    return Array.from(entries.values());
  }

  function reportLeaks(thresholdMs = 30_000): TrackedEntry[] {
    const now = Date.now();
    const leaks = getTracked().filter((e) => now - e.trackedAt >= thresholdMs);

    if (__DEV__ && leaks.length > 0) {
      console.warn(
        `[MemoryProfiler] ${leaks.length} potential leak(s) detected:`,
        leaks.map((l) => l.label),
      );
    }

    return leaks;
  }

  function disposeAll() {
    for (const entry of entries.values()) {
      entry.cleanup?.();
    }
    entries.clear();
  }

  function reset() {
    entries.clear();
  }

  return { track, untrack, getTracked, reportLeaks, disposeAll, reset };
}

/**
 * Global singleton tracker for app-wide leak detection.
 */
export const globalTracker = createMemoryTracker();
