/**
 * usePushRouting — opens the Console route a tapped notification points at,
 * on the saved connection that sent it.
 *
 * Covers taps while the app runs (listener) and the cold start from a tap
 * (`getLastNotificationResponseAsync`). Each notification is routed once, even
 * though the cold-start response stays readable for the life of the process.
 *
 * Which connection a tap opens on is `pushTapTarget` (the push's `origin`
 * against the saved connections, and the organization's server lock). A tap
 * for another saved connection switches to it through the store's `select` —
 * the switcher's path — and only then asks for the route, so the route reaches
 * the new connection's Console (the WebView holds it until that Console is
 * ready) and never the document being left.
 *
 * A tap waits, held, until the saved connections are loaded and the app lock
 * is open: a switch is a change the switcher cannot make while the app is
 * locked either, and the route follows it. Only the latest held tap is kept.
 *
 * Token acquisition is NOT done here: the Console asks for the token over the
 * bridge (`getPushToken`) once the user is signed in, so the OS permission
 * prompt appears at a moment the Console chooses. `usePushTokenChanges` only
 * listens for tokens the OS reports (rotation) — it never asks for one.
 */
import { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import {
  addPushTokenChangeListener,
  configureForegroundHandler,
  pushSenderFromResponse,
  pushTapTarget,
  routeFromResponse,
} from "~/lib/push-notifications";
import { addBreadcrumb } from "~/lib/sentry";
import type { PushTokenResult } from "~/lib/shell/bridge/protocol";
import { useServerStore } from "~/stores/server-store";
import { isAppLocked, useSecurityStore } from "~/stores/security-store";

const routed = new Set<string>();

/** Test hook: forget which notifications were already routed. */
export function _resetRoutedNotifications(): void {
  routed.clear();
}

/**
 * Open one tap: pick its connection, switch to it when it is not the current
 * one, then hand the route on. Reads the stores as they are now.
 */
async function openTap(
  response: Notifications.NotificationResponse,
  onRoute: (route: string) => void
): Promise<void> {
  const store = useServerStore.getState();
  const target = pushTapTarget(pushSenderFromResponse(response), {
    connections: store.connections,
    managed: store.managed,
  });
  if (target.kind === "drop") {
    addBreadcrumb({ category: "push", message: "push tap dropped", data: { reason: target.reason } });
    return;
  }
  const { connection } = target;
  const route = routeFromResponse(response, connection.serverUrl);
  if (route === null) return;
  if (connection.host !== store.currentHost) {
    await store.select(connection.host);
    // Something else moved the current connection meanwhile: the route was not for it.
    if (useServerStore.getState().currentHost !== connection.host) return;
  }
  onRoute(route);
}

export function usePushRouting(onRoute: (route: string) => void): void {
  const onRouteRef = useRef(onRoute);
  useEffect(() => {
    onRouteRef.current = onRoute;
  }, [onRoute]);

  const ready = useServerStore((s) => s.isReady);
  const appLocked = useSecurityStore(isAppLocked);
  const [held, setHeld] = useState<Notifications.NotificationResponse | null>(null);

  useEffect(() => {
    configureForegroundHandler();
  }, []);

  useEffect(() => {
    let mounted = true;
    const take = (response: Notifications.NotificationResponse) => {
      const id = response.notification?.request?.identifier;
      if (id) {
        if (routed.has(id)) return;
        routed.add(id);
      }
      setHeld(response);
    };

    const sub = Notifications.addNotificationResponseReceivedListener(take);
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response && mounted) take(response);
      })
      .catch(() => {
        // No cold-start response available — nothing to route.
      });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (held === null || !ready || appLocked) return;
    setHeld(null);
    void openTap(held, (route) => onRouteRef.current(route));
  }, [held, ready, appLocked]);
}

/**
 * Calls `onToken` with each native push token the OS reports while mounted
 * (see `addPushTokenChangeListener`). Subscribes once; the latest `onToken`
 * is used without re-subscribing.
 */
export function usePushTokenChanges(onToken: (token: PushTokenResult) => void): void {
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const sub = addPushTokenChangeListener((token) => onTokenRef.current(token));
    return () => sub.remove();
  }, []);
}
