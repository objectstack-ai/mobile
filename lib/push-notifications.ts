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
 *  - tell the Console when the OS reports a token (rotation), so it can
 *    register the new one (`addPushTokenChangeListener`, delivered as the
 *    `objectstack-native:pushTokenChanged` window event);
 *  - turn a tapped notification into a Console route, on the saved connection
 *    that sent it (`pushTapTarget`).
 *
 * No React here; `hooks/usePushRouting` owns the listener lifecycle.
 */

import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { routeFromConsoleUrl, safeConsoleRoute } from "~/lib/shell/console-url";
import type { PushTokenResult } from "~/lib/shell/bridge/protocol";
import { connectionByOrigin, type Connection } from "~/lib/connections/model";
import { isLocked, lockedHost, type ManagedConfig } from "~/lib/managed-config/model";

export type PermissionOutcome = "granted" | "denied" | "undetermined";

/**
 * The `data` payload a server-sent notification carries. `route` is the
 * Console route to open on tap; `url` is accepted when it points into this
 * server's Console. `origin` names the server that sent it (see
 * {@link pushSenderFromResponse}).
 */
export interface PushDataPayload {
  route?: string;
  url?: string;
  origin?: string;
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
 * A device token as the bridge hands it to the Console, or `null` for a token
 * that is not a native APNs / FCM string (web, Expo push-service, empty).
 */
export function pushTokenFromDevice(
  token: Notifications.DevicePushToken | null | undefined
): PushTokenResult | null {
  if (!token || typeof token.data !== "string" || token.data.length === 0) return null;
  if (token.type === "ios") return { token: token.data, vendor: "apns" };
  if (token.type === "android") return { token: token.data, vendor: "fcm" };
  return null;
}

export interface PushTokenSubscription {
  remove(): void;
}

/**
 * Call `listener` whenever the OS reports a native push token for this app:
 * when APNs / FCM rotate it, and possibly again with an unchanged token (iOS
 * reports every completed registration, including the one `getPushToken`
 * triggers; Android replays the last known token to a new listener).
 *
 * Never throws: where token events are unavailable (expo-notifications refuses
 * remote push in Expo Go on Android) the subscription is a no-op.
 */
export function addPushTokenChangeListener(
  listener: (token: PushTokenResult) => void
): PushTokenSubscription {
  try {
    const sub = Notifications.addPushTokenListener((devicePushToken) => {
      const token = pushTokenFromDevice(devicePushToken);
      if (token) listener(token);
    });
    return { remove: () => sub.remove() };
  } catch {
    return { remove: () => undefined };
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
    const route = safeConsoleRoute(data.route);
    if (route) return route;
  }
  if (typeof data.url === "string" && serverUrl) {
    return routeFromConsoleUrl(serverUrl, data.url);
  }
  return null;
}

function asPayload(value: unknown): PushDataPayload | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as PushDataPayload)
    : null;
}

/**
 * Same as {@link routeFromPushData}, reading the payload off a tap response.
 *
 * Where expo-notifications puts the server's keys differs by platform:
 * - Android (FCM): the `data` map is `content.data` (or, when `data.body` is a
 *   JSON object string, that object).
 * - iOS (APNs): `content.data` is only the `body` dictionary of the APNs
 *   payload; keys beside `aps` are reachable only through
 *   `trigger.payload`, the full `userInfo`.
 *
 * So `content.data` is read first, then `trigger.payload` and its `body`.
 * Last, `trigger.payload.data`: a sender that nests the keys under `data` on
 * iOS (the FCM habit) is off-contract, so that dictionary is read only after
 * the other three.
 * See docs/PUSH-NOTIFICATIONS.md for the payload contract.
 */
export function routeFromResponse(
  response: Notifications.NotificationResponse | null | undefined,
  serverUrl: string | null
): string | null {
  for (const data of payloadCandidates(response)) {
    const route = routeFromPushData(data, serverUrl);
    if (route) return route;
  }
  return null;
}

/** The dictionaries a tap response may carry the server's keys in, in reading order. */
function payloadCandidates(
  response: Notifications.NotificationResponse | null | undefined
): (PushDataPayload | null)[] {
  const request = response?.notification?.request;
  if (!request) return [];
  const trigger = request.trigger as { payload?: unknown } | null | undefined;
  const userInfo = asPayload(trigger?.payload);
  return [
    asPayload(request.content?.data),
    userInfo,
    asPayload(userInfo?.body),
    asPayload(userInfo?.data),
  ];
}

/**
 * Which server a tapped push says it came from. APNs and FCM tell the app
 * nothing about the sender, and every saved server registers the same device
 * token, so the push data names it: `origin`, the origin the Console was
 * loaded from when it registered the device (objectstack
 * `PushDeliveryDataSchema.origin`).
 *
 * - `named: false`: no dictionary carries `origin` (a server from before the
 *   member; `null` reads as absent too).
 * - `named: true`: the first dictionary that carries one, read in the same
 *   order as the route. The value is kept as sent, unvalidated: it is only
 *   ever compared with a saved connection's origin, so a value that is not a
 *   canonical origin (or not a string) names a sender no connection matches.
 */
export type PushSender = { named: false } | { named: true; origin: unknown };

export function pushSenderFromResponse(
  response: Notifications.NotificationResponse | null | undefined
): PushSender {
  for (const data of payloadCandidates(response)) {
    if (data && data.origin !== undefined && data.origin !== null) {
      return { named: true, origin: data.origin };
    }
  }
  return { named: false };
}

/** Why a tap opens nothing (see {@link pushTapTarget}). */
export type PushTapDropReason =
  /** The push names a server that is not a saved connection (any more). */
  | "unsaved-origin"
  /** The push names no server, and two or more are saved: the sender is unknown. */
  | "unnamed-sender"
  /** Nothing is saved. */
  | "no-connection"
  /** The organization locked the server, and this connection is not the managed one. */
  | "server-locked";

export type PushTapTarget =
  | { kind: "open"; connection: Connection }
  | { kind: "drop"; reason: PushTapDropReason };

/**
 * The saved connection a tapped push opens on — or none, and the route is
 * dropped. docs/PUSH-NOTIFICATIONS.md, "Which server a tap opens on":
 *
 * 1. `origin` is a saved connection's origin (byte for byte,
 *    `connectionByOrigin`): that connection. The current one routes as
 *    before; another one is switched to first (the caller's part).
 * 2. `origin` is present and no saved connection has it: none. The route is
 *    never opened on another server.
 * 3. No `origin` (an older server): the only saved connection, as before
 *    servers named themselves. With two or more saved the sender cannot be
 *    told, so none.
 *
 * Locked by the organization (MDM `lockServer`), only the managed connection
 * is open to a tap: a push for any other is dropped, never switched to.
 */
export function pushTapTarget(
  sender: PushSender,
  state: { connections: readonly Connection[]; managed: ManagedConfig }
): PushTapTarget {
  const { connections, managed } = state;
  let connection: Connection | null;
  if (sender.named) {
    connection = connectionByOrigin(connections, sender.origin);
    if (!connection) return { kind: "drop", reason: "unsaved-origin" };
  } else {
    if (connections.length === 0) return { kind: "drop", reason: "no-connection" };
    if (connections.length > 1) return { kind: "drop", reason: "unnamed-sender" };
    connection = connections[0];
  }
  if (isLocked(managed) && lockedHost(connections, managed) !== connection.host) {
    return { kind: "drop", reason: "server-locked" };
  }
  return { kind: "open", connection };
}
