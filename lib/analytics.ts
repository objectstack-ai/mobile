/**
 * Analytics tracking — page views, key actions, and user behaviour events.
 *
 * Provides a lightweight analytics layer that can flush events to a remote
 * endpoint in batches. Events are queued in memory and flushed periodically
 * or when the queue reaches a configurable threshold.
 */

export type AnalyticsEvent = {
  /** Event name (e.g. "page_view", "button_click") */
  name: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Arbitrary properties */
  properties?: Record<string, unknown>;
};

export interface AnalyticsConfig {
  /** Remote endpoint to POST event batches to */
  endpoint?: string;
  /** Max events to queue before auto-flushing. Default 20 */
  batchSize?: number;
  /** Auto-flush interval in ms. Default 30 000 (30 s) */
  flushIntervalMs?: number;
  /** User ID attached to all events */
  userId?: string;
}

type AnalyticsListener = (event: AnalyticsEvent) => void;

/**
 * Create an analytics tracker instance.
 */
export function createAnalyticsTracker(config: AnalyticsConfig = {}) {
  const { endpoint, batchSize = 20, flushIntervalMs = 30_000 } = config;

  let queue: AnalyticsEvent[] = [];
  let userId: string | undefined = config.userId;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const listeners: Set<AnalyticsListener> = new Set();

  /** Set / update the user id attached to events */
  function setUserId(id: string | undefined) {
    userId = id;
  }

  /** Track a named event */
  function track(name: string, properties?: Record<string, unknown>) {
    const event: AnalyticsEvent = {
      name,
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        ...(userId ? { userId } : {}),
      },
    };

    queue.push(event);
    listeners.forEach((fn) => fn(event));

    if (queue.length >= batchSize) {
      flush();
    }
  }

  /** Track a page / screen view */
  function trackPageView(screenName: string, properties?: Record<string, unknown>) {
    track("page_view", { screenName, ...properties });
  }

  /** Track a key user action */
  function trackAction(action: string, properties?: Record<string, unknown>) {
    track("user_action", { action, ...properties });
  }

  /** Flush queued events to the remote endpoint */
  async function flush(): Promise<void> {
    if (queue.length === 0 || !endpoint) {
      queue = [];
      return;
    }

    const batch = [...queue];
    queue = [];

    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });
    } catch {
      // Re-enqueue on failure so events are not lost
      queue = [...batch, ...queue];
    }
  }

  /** Start periodic auto-flush */
  function startAutoFlush() {
    stopAutoFlush();
    intervalId = setInterval(flush, flushIntervalMs);
  }

  /** Stop periodic auto-flush */
  function stopAutoFlush() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  /** Subscribe to events as they are tracked (useful for debugging) */
  function subscribe(listener: AnalyticsListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  /** Get current queue (for inspection / debugging) */
  function getQueue(): AnalyticsEvent[] {
    return [...queue];
  }

  /** Teardown */
  function destroy() {
    stopAutoFlush();
    listeners.clear();
    queue = [];
  }

  return {
    setUserId,
    track,
    trackPageView,
    trackAction,
    flush,
    startAutoFlush,
    stopAutoFlush,
    subscribe,
    getQueue,
    destroy,
  };
}

export type AnalyticsTracker = ReturnType<typeof createAnalyticsTracker>;

/** Global singleton analytics tracker */
export const analytics = createAnalyticsTracker();
