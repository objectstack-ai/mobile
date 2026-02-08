/**
 * useAnalyticsTracking — React hooks for page view and action tracking.
 *
 * Usage:
 *   usePageView("HomeScreen");
 *   const { trackAction } = useTrackAction();
 */
import { useEffect, useCallback } from "react";
import { analytics, type AnalyticsTracker } from "~/lib/analytics";

/**
 * Track a page/screen view when the component mounts.
 *
 * @param screenName  Name of the screen
 * @param properties  Extra properties attached to the event
 * @param tracker     Optional tracker instance (defaults to global singleton)
 */
export function usePageView(
  screenName: string,
  properties?: Record<string, unknown>,
  tracker: AnalyticsTracker = analytics,
) {
  useEffect(() => {
    tracker.trackPageView(screenName, properties);
    // Only track on mount (or when screen name changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenName, tracker]);
}

/**
 * Returns helpers for tracking user actions.
 */
export function useTrackAction(tracker: AnalyticsTracker = analytics) {
  const trackAction = useCallback(
    (action: string, properties?: Record<string, unknown>) => {
      tracker.trackAction(action, properties);
    },
    [tracker],
  );

  const track = useCallback(
    (name: string, properties?: Record<string, unknown>) => {
      tracker.track(name, properties);
    },
    [tracker],
  );

  return { trackAction, track };
}
