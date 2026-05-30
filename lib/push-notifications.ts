/**
 * Push notifications — OS-level integration (APNs / FCM via Expo).
 *
 * This module is the bridge between the operating system's push token and the
 * ObjectStack backend's device registry (`client.notifications.registerDevice`).
 * It deliberately contains no React: it is a thin, testable wrapper over
 * `expo-notifications` + `expo-device` so the hook layer (`usePushNotifications`)
 * can stay focused on wiring lifecycle and registration.
 *
 * Responsibilities:
 *  - request OS notification permission
 *  - obtain the Expo push token (works for both APNs and FCM)
 *  - configure the Android notification channel
 *  - configure how notifications present while the app is foregrounded
 *  - map a deep-link payload out of a notification response
 */

import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type PushPlatform = "ios" | "android" | "web";

export interface PushRegistration {
  /** The Expo push token (opaque; routes to APNs or FCM server-side). */
  token: string;
  /** The OS platform the token belongs to. */
  platform: PushPlatform;
}

export type PermissionOutcome = "granted" | "denied" | "undetermined";

/** Shape of the `data` payload we attach to server-sent notifications. */
export interface PushDataPayload {
  /** A deep link to open on tap, e.g. `objectstack://objects/tasks/123`. */
  url?: string;
  /** Object/record addressing as an alternative to a full URL. */
  objectName?: string;
  recordId?: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const ANDROID_DEFAULT_CHANNEL_ID = "default";

/* ------------------------------------------------------------------ */
/*  Foreground presentation                                           */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Permissions                                                        */
/* ------------------------------------------------------------------ */

function normalizePermission(
  status: Notifications.NotificationPermissionsStatus,
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

/* ------------------------------------------------------------------ */
/*  Token acquisition                                                  */
/* ------------------------------------------------------------------ */

/**
 * Resolve the current OS platform as understood by the backend registry.
 */
export function currentPushPlatform(): PushPlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

/**
 * Acquire the Expo push token for this device. Returns `null` when:
 *  - running on a simulator/emulator (no push hardware),
 *  - permission is not granted,
 *  - or the token cannot be obtained.
 *
 * `projectId` is required for EAS builds; it is read from the Expo config by
 * the caller and passed through.
 */
export async function acquirePushToken(
  projectId?: string,
): Promise<PushRegistration | null> {
  // Push tokens are only available on physical devices.
  if (!Device.isDevice) return null;

  const permission = await ensurePermission();
  if (permission !== "granted") return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    if (!data) return null;
    return { token: data, platform: currentPushPlatform() };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Response → deep link                                              */
/* ------------------------------------------------------------------ */

/**
 * Extract a navigable deep-link URL from a notification response, if any.
 *
 * Prefers an explicit `data.url`; otherwise reconstructs an
 * `objectstack://objects/{objectName}/{recordId}` link from structured fields.
 * Returns `null` when the payload carries no navigation target.
 */
export function deepLinkFromResponse(
  response: Notifications.NotificationResponse | null | undefined,
): string | null {
  const data = response?.notification?.request?.content?.data as
    | PushDataPayload
    | undefined;
  return deepLinkFromData(data);
}

/** Same as {@link deepLinkFromResponse} but operating on a raw data payload. */
export function deepLinkFromData(
  data: PushDataPayload | null | undefined,
): string | null {
  if (!data) return null;
  if (typeof data.url === "string" && data.url.length > 0) return data.url;
  if (typeof data.objectName === "string" && data.objectName.length > 0) {
    const base = `objectstack://objects/${data.objectName}`;
    return typeof data.recordId === "string" && data.recordId.length > 0
      ? `${base}/${data.recordId}`
      : base;
  }
  return null;
}
