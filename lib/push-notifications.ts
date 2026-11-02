/**
 * Push notifications — OS-level integration.
 *
 * The shell's half of push is deliberately small:
 *  - obtain the **native device token** (APNs on iOS, FCM on Android). The
 *    ObjectStack server sends through APNs/FCM directly (ADR-0012), so the Expo
 *    push-service token is not what it needs;
 *  - hand that token to the Console over the bridge (`getPushToken`). The
 *    Console registers it with the server under the signed-in session, so the
 *    shell never holds an API credential;
 *  - turn a tapped notification into a Console route.
 *
 * No React here; `hooks/usePushRouting` owns the listener lifecycle.
 */

import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { routeFromConsoleUrl } from "~/lib/shell/console-url";
import type { PushTokenResult } from "~/lib/shell/bridge/protocol";

export type PermissionOutcome = "granted" | "denied" | "undetermined";

/**
 * The `data` payload a server-sent notification carries. `route` is the
 * Console route to open on tap; `url` is accepted when it points into this
 * server's Console.
 */
export interface PushDataPayload {
  route?: string;
  url?: string;
  [key: string]: unknown;
}

export const ANDROID_DEFAULT_CHANNEL_ID = "default";

/**
 * Configure how notifications are presented while the app is in the
 * foreground. Call once, early in app startup. Idempotent.
 */
export function configureForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Create/refresh the Android notification channel. No-op on non-Android.
 * Android requires a channel before notifications can be shown.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

function normalizePermission(
  status: Notifications.NotificationPermissionsStatus
): PermissionOutcome {
  if (status.granted) return "granted";
  if (status.status === "undetermined") return "undetermined";
  return "denied";
}

/**
 * Ensure notification permission, requesting it only when not already decided.
 * Returns the resulting outcome without throwing.
 */
export async function ensurePermission(): Promise<PermissionOutcome> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return "granted";
  // Only prompt if the user hasn't explicitly denied before.
  if (existing.status === "denied" && !existing.canAskAgain) return "denied";
  const requested = await Notifications.requestPermissionsAsync();
  return normalizePermission(requested);
}

/**
 * Acquire the native push token for this device. Returns `null` when running on
 * a simulator/emulator, when permission is not granted, or when the OS cannot
 * produce a token (e.g. an Android build without FCM configured).
 */
export async function acquireDeviceToken(): Promise<PushTokenResult | null> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  if (!Device.isDevice) return null;

  const permission = await ensurePermission();
  if (permission !== "granted") return null;

  try {
    await ensureAndroidChannel();
    const { data } = await Notifications.getDevicePushTokenAsync();
    if (typeof data !== "string" || data.length === 0) return null;
    return { token: data, vendor: Platform.OS === "ios" ? "apns" : "fcm" };
  } catch {
    return null;
  }
}

/**
 * The Console route a notification payload asks to open, or `null`.
 * Prefers `route`; otherwise accepts a `url` that points into this server's
 * Console. A URL anywhere else is ignored — a notification must not be able to
 * steer the shell to another site.
 */
export function routeFromPushData(
  data: PushDataPayload | null | undefined,
  serverUrl: string | null
): string | null {
  if (!data) return null;
  if (typeof data.route === "string") {
    const r = data.route.trim();
    if (r.startsWith("/") && !r.startsWith("//")) return r;
  }
  if (typeof data.url === "string" && serverUrl) {
    return routeFromConsoleUrl(serverUrl, data.url);
  }
  return null;
}

/** Same as {@link routeFromPushData}, reading the payload off a tap response. */
export function routeFromResponse(
  response: Notifications.NotificationResponse | null | undefined,
  serverUrl: string | null
): string | null {
  const data = response?.notification?.request?.content?.data as PushDataPayload | undefined;
  return routeFromPushData(data, serverUrl);
}
