/**
 * usePushNotifications — wires OS push notifications into the app.
 *
 * On mount (when enabled) it:
 *  1. configures foreground presentation + the Android channel,
 *  2. requests permission and acquires the Expo push token,
 *  3. registers the token with the backend device registry,
 *  4. listens for notification taps and routes them via a deep-link callback,
 *  5. handles the "cold start from a notification" case.
 *
 * Token acquisition and registry calls are delegated to `lib/push-notifications`
 * and `useNotifications().registerDevice`, keeping this hook about lifecycle.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import {
  acquirePushToken,
  configureForegroundHandler,
  deepLinkFromResponse,
  ensureAndroidChannel,
  type PermissionOutcome,
  type PushRegistration,
} from "~/lib/push-notifications";
import { useNotifications } from "./useNotifications";

export interface UsePushNotificationsOptions {
  /** Whether push should be activated. Defaults to true. Pass the auth state
   *  so registration only happens for signed-in users. */
  enabled?: boolean;
  /** Called with a deep-link URL when a notification is tapped (foreground,
   *  background, or cold start). Wire this to your router / `useDeepLink`. */
  onDeepLink?: (url: string) => void;
}

export interface UsePushNotificationsResult {
  /** The registered push token, or null if not (yet) registered. */
  registration: PushRegistration | null;
  /** Latest permission outcome. */
  permission: PermissionOutcome | null;
  /** Whether registration is in progress. */
  isRegistering: boolean;
  /** Any error encountered during setup/registration. */
  error: Error | null;
  /** Manually (re)run permission + token acquisition + registration. */
  register: () => Promise<PushRegistration | null>;
}

/** Read the EAS projectId from the Expo config, if present. */
function getProjectId(): string | undefined {
  const fromEas = (
    Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  )?.eas?.projectId;
  // `easConfig` is populated in EAS builds.
  const fromEasConfig = (
    Constants as unknown as { easConfig?: { projectId?: string } }
  ).easConfig?.projectId;
  return fromEas ?? fromEasConfig;
}

export function usePushNotifications(
  options: UsePushNotificationsOptions = {},
): UsePushNotificationsResult {
  const { enabled = true, onDeepLink } = options;
  const { registerDevice } = useNotifications();

  const [registration, setRegistration] = useState<PushRegistration | null>(
    null,
  );
  const [permission, setPermission] = useState<PermissionOutcome | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Keep the latest deep-link handler in a ref so listeners don't need
  // re-subscription when the callback identity changes.
  const onDeepLinkRef = useRef(onDeepLink);
  useEffect(() => {
    onDeepLinkRef.current = onDeepLink;
  }, [onDeepLink]);

  const routeResponse = useCallback(
    (response: Notifications.NotificationResponse | null) => {
      const url = deepLinkFromResponse(response);
      if (url) onDeepLinkRef.current?.(url);
    },
    [],
  );

  const register =
    useCallback(async (): Promise<PushRegistration | null> => {
      setIsRegistering(true);
      setError(null);
      try {
        configureForegroundHandler();
        await ensureAndroidChannel();

        const result = await acquirePushToken(getProjectId());
        if (!result) {
          // No token: simulator, permission denied, or unavailable.
          setPermission((prev) => prev ?? "denied");
          setRegistration(null);
          return null;
        }

        setPermission("granted");
        await registerDevice(result.token, result.platform);
        setRegistration(result);
        return result;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to register for push notifications"),
        );
        return null;
      } finally {
        setIsRegistering(false);
      }
    }, [registerDevice]);

  // Run registration once when enabled.
  useEffect(() => {
    if (!enabled) return;
    void register();
    // `register` is stable (depends only on registerDevice); guarded by enabled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Subscribe to taps + handle cold start.
  useEffect(() => {
    if (!enabled) return;

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => routeResponse(response),
    );

    // Cold start: app opened by tapping a notification while terminated.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) routeResponse(response);
    });

    return () => sub.remove();
  }, [enabled, routeResponse]);

  return { registration, permission, isRegistering, error, register };
}
