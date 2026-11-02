/**
 * usePushRouting — opens the Console route a tapped notification points at.
 *
 * Covers taps while the app runs (listener) and the cold start from a tap
 * (`getLastNotificationResponseAsync`). Each notification is routed once, even
 * though the cold-start response stays readable for the life of the process.
 *
 * Token acquisition is NOT done here: the Console asks for the token over the
 * bridge (`getPushToken`) once the user is signed in, so the OS permission
 * prompt appears at a moment the Console chooses.
 */
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { configureForegroundHandler, routeFromResponse } from "~/lib/push-notifications";

const routed = new Set<string>();

/** Test hook: forget which notifications were already routed. */
export function _resetRoutedNotifications(): void {
  routed.clear();
}

export function usePushRouting(serverUrl: string | null, onRoute: (route: string) => void): void {
  const onRouteRef = useRef(onRoute);
  useEffect(() => {
    onRouteRef.current = onRoute;
  }, [onRoute]);

  useEffect(() => {
    configureForegroundHandler();
  }, []);

  useEffect(() => {
    if (!serverUrl) return;

    const handle = (response: Notifications.NotificationResponse) => {
      const id = response.notification?.request?.identifier;
      if (id) {
        if (routed.has(id)) return;
        routed.add(id);
      }
      const route = routeFromResponse(response, serverUrl);
      if (route) onRouteRef.current(route);
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handle(response);
      })
      .catch(() => {
        // No cold-start response available — nothing to route.
      });
    return () => sub.remove();
  }, [serverUrl]);
}
