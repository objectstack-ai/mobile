/**
 * App lock — the side effects around the lock state in
 * `stores/security-store.ts`.
 *
 * - The setting (on/off, timeout) is kept in SecureStore and read
 *   synchronously at launch ({@link hydrateAppLock}), so a launch with the
 *   lock on starts locked before the first frame.
 * - The AppState monitor ({@link startAppLockMonitor}) reports going to the
 *   background and coming back from it. `inactive` alone (a Face ID prompt,
 *   Control Center, an incoming call banner) never locks.
 * - {@link unlockApp} runs the system prompt: Face ID / Touch ID / fingerprint
 *   with the device passcode as fallback.
 * - {@link changeAppLockSettings} is the one writer of the setting. It asks
 *   for the same authentication first, and only the native settings screen
 *   calls it. The bridge has no path to it: it reads the setting
 *   (`getAppLock()`) and opens that screen (`openAppLockSettings()`), and
 *   nothing else (docs/HYBRID-SHELL.md, "App lock").
 * - While the lock is on, the app-switcher snapshot is protected: blurred
 *   natively on iOS, and on Android the window is `FLAG_SECURE`, which blanks
 *   the recents thumbnail (and blocks screenshots and screen recording).
 *
 * Nothing here touches the Console's load state machine: the overlay is a
 * view over the WebView, which stays mounted and is never reloaded.
 */
import { AppState, Platform, type AppStateStatus } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as ScreenCapture from "expo-screen-capture";
import * as WebBrowser from "expo-web-browser";
import i18n from "~/lib/i18n";
import { authFailureKind, authenticate, getDeviceLockLevel } from "~/lib/biometric-auth";
import {
  APP_LOCK_OFF,
  DEFAULT_APP_LOCK_TIMEOUT,
  isAppLockTimeout,
  isAppLocked,
  useSecurityStore,
  type AppLockSettings,
} from "~/stores/security-store";

export const APP_LOCK_STORAGE_KEY = "objectstack_app_lock";
const RECORD_VERSION = 1;

const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** What a stored record that cannot be trusted reads as: on, at the default timeout. */
const FAIL_CLOSED: AppLockSettings = Object.freeze({
  enabled: true,
  timeoutSeconds: DEFAULT_APP_LOCK_TIMEOUT,
});

/** Key of the screen-capture block on Android (so it never lifts another holder's). */
const SCREEN_CAPTURE_KEY = "app-lock";

/**
 * The setting a stored value stands for. No value: the lock is off. A value
 * that does not check out (corrupt, or written by a newer build) fails closed:
 * someone turned the lock on or changed it, so it stays on.
 */
export function parseAppLockRecord(raw: string | null): AppLockSettings {
  if (raw === null) return APP_LOCK_OFF;
  try {
    const record = JSON.parse(raw) as Record<string, unknown> | null;
    if (
      typeof record === "object" &&
      record !== null &&
      record.v === RECORD_VERSION &&
      typeof record.enabled === "boolean" &&
      isAppLockTimeout(record.timeoutSeconds)
    ) {
      return { enabled: record.enabled, timeoutSeconds: record.timeoutSeconds };
    }
  } catch {
    // fall through
  }
  return FAIL_CLOSED;
}

export function serializeAppLockSettings(settings: AppLockSettings): string {
  return JSON.stringify({
    v: RECORD_VERSION,
    enabled: settings.enabled,
    timeoutSeconds: settings.timeoutSeconds,
  });
}

/**
 * The stored setting, read synchronously. A read that throws fails closed as
 * well: the keychain could not answer, and it may hold "on".
 */
export function readAppLockSettings(): AppLockSettings {
  try {
    return parseAppLockRecord(SecureStore.getItem(APP_LOCK_STORAGE_KEY, STORE_OPTIONS));
  } catch {
    return FAIL_CLOSED;
  }
}

let hydrated = false;

/** Read the stored setting into the store, once per process. Call before the first render. */
export function hydrateAppLock(): void {
  if (hydrated) return;
  hydrated = true;
  useSecurityStore.getState().dispatch({ type: "hydrated", settings: readAppLockSettings() });
}

/*
 * Authentication in flight. On Android the passcode fallback is an activity of
 * its own, which sends this app to the background and back; that is not the
 * user leaving. A background seen while a prompt runs is therefore held, and
 * reported when the prompt ends only if the app is still in the background
 * then (the user did leave: iOS and Android both cancel the prompt).
 */
let authInFlight = 0;
let heldBackgroundAt: number | null = null;
let cameFromBackground = false;

/** {@link authenticate} that never throws: a native error is a failed attempt. */
async function promptUser(promptKey: "appLock.prompt.unlock" | "appLock.prompt.change") {
  try {
    return await authenticate({
      promptMessage: i18n.t(promptKey),
      cancelLabel: i18n.t("common.cancel"),
      fallbackToPasscode: true,
    });
  } catch {
    return { success: false, error: "unknown" };
  }
}

async function withAuthentication<T>(run: () => Promise<T>, after: (result: T) => void): Promise<T> {
  authInFlight += 1;
  let result: T;
  try {
    result = await run();
  } finally {
    authInFlight -= 1;
  }
  // The outcome first, then a background held meanwhile: an unlock that
  // succeeded while the user left is covered again at once.
  after(result);
  releaseHeldBackground();
  return result;
}

function releaseHeldBackground(): void {
  if (authInFlight > 0 || heldBackgroundAt === null) return;
  const at = heldBackgroundAt;
  heldBackgroundAt = null;
  if (AppState.currentState === "active") return;
  cameFromBackground = true;
  useSecurityStore.getState().dispatch({ type: "background", at });
}

/** Handle returned by {@link startAppLockMonitor} for cleanup. */
export interface AppLockHandle {
  dispose: () => void;
}

/** Report going to the background and coming back from it to the lock. */
export function startAppLockMonitor(now: () => number = Date.now): AppLockHandle {
  const subscription = AppState.addEventListener("change", (next: AppStateStatus) => {
    const { dispatch } = useSecurityStore.getState();
    if (next === "background") {
      if (authInFlight > 0) {
        heldBackgroundAt ??= now();
        return;
      }
      cameFromBackground = true;
      dispatch({ type: "background", at: now() });
      return;
    }
    if (next === "active") {
      // Back from a prompt's own activity: nothing happened.
      heldBackgroundAt = null;
      if (!cameFromBackground) return;
      cameFromBackground = false;
      dispatch({ type: "active", at: now() });
    }
  });
  return { dispose: () => subscription.remove() };
}

/**
 * Run the unlock prompt for a locked app. Resolves `true` once unlocked;
 * `false` when the app was not locked, or the prompt was cancelled or failed
 * (the overlay stays, with the reason when there is one).
 */
export async function unlockApp(): Promise<boolean> {
  const store = useSecurityStore.getState();
  if (store.phase !== "locked") return false;
  store.dispatch({ type: "unlockStarted" });
  const result = await withAuthentication(
    () => promptUser("appLock.prompt.unlock"),
    (outcome) => {
      const kind = outcome.success ? null : authFailureKind(outcome.error);
      useSecurityStore.getState().dispatch({
        type: "unlockFinished",
        ok: outcome.success,
        error: kind === "cancelled" ? null : kind,
      });
    }
  );
  return result.success;
}

export type ChangeOutcome =
  /** Authenticated, stored, and in effect. */
  | "changed"
  /** Same as the current setting: nothing asked, nothing written. */
  | "unchanged"
  /** The prompt was cancelled or failed: nothing changed. */
  | "not-authenticated"
  /** The device has no passcode or biometrics, so the lock cannot be turned on. */
  | "unavailable"
  /** Authenticated, but the setting could not be stored: nothing changed. */
  | "save-failed";

/**
 * Change the app-lock setting — the only writer. Asks for Face ID / Touch ID /
 * fingerprint (device passcode as fallback) first, then stores the setting,
 * then puts it in effect. Called by the native settings screen alone.
 */
export async function changeAppLockSettings(next: AppLockSettings): Promise<ChangeOutcome> {
  if (!isAppLockTimeout(next.timeoutSeconds)) return "unchanged";
  const current = useSecurityStore.getState().settings;
  if (current.enabled === next.enabled && current.timeoutSeconds === next.timeoutSeconds) {
    return "unchanged";
  }
  if (next.enabled) {
    try {
      if ((await getDeviceLockLevel()) === "none") return "unavailable";
    } catch {
      return "unavailable";
    }
  }
  const settings: AppLockSettings = { enabled: next.enabled, timeoutSeconds: next.timeoutSeconds };
  let outcome: ChangeOutcome = "not-authenticated";
  await withAuthentication(
    async () => {
      const result = await promptUser("appLock.prompt.change");
      if (!result.success) {
        return authFailureKind(result.error) === "no-device-lock" && next.enabled
          ? "unavailable"
          : "not-authenticated";
      }
      try {
        await SecureStore.setItemAsync(
          APP_LOCK_STORAGE_KEY,
          serializeAppLockSettings(settings),
          STORE_OPTIONS
        );
      } catch {
        return "save-failed";
      }
      return "changed";
    },
    (result: ChangeOutcome) => {
      outcome = result;
      if (result === "changed") {
        useSecurityStore.getState().dispatch({ type: "settingsCommitted", settings });
      }
    }
  );
  return outcome;
}

/**
 * Protect the app-switcher snapshot while the lock is on: iOS blurs it
 * natively (on resign-active, before the snapshot); Android sets `FLAG_SECURE`
 * on the window, which blanks the recents thumbnail and also blocks
 * screenshots and screen recording.
 */
export async function applySnapshotProtection(enabled: boolean): Promise<void> {
  try {
    if (Platform.OS === "ios") {
      if (enabled) await ScreenCapture.enableAppSwitcherProtectionAsync(1);
      else await ScreenCapture.disableAppSwitcherProtectionAsync();
      return;
    }
    if (Platform.OS === "android") {
      if (enabled) await ScreenCapture.preventScreenCaptureAsync(SCREEN_CAPTURE_KEY);
      else await ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_KEY);
    }
  } catch {
    // The module is missing (a build without it): the lock itself still works.
  }
}

/**
 * Start the lock for this process: the monitor, the snapshot protection
 * following the setting, and, when the lock engages, the in-app browser
 * closed (iOS presents it above every view, the overlay included).
 */
export function startAppLock(): () => void {
  hydrateAppLock();
  const monitor = startAppLockMonitor();
  let protectedNow = useSecurityStore.getState().settings.enabled;
  void applySnapshotProtection(protectedNow);
  let lockedNow = isAppLocked(useSecurityStore.getState());
  const unsubscribe = useSecurityStore.subscribe((state) => {
    if (state.settings.enabled !== protectedNow) {
      protectedNow = state.settings.enabled;
      void applySnapshotProtection(protectedNow);
    }
    const locked = isAppLocked(state);
    if (locked && !lockedNow && Platform.OS === "ios") {
      // Rejects when no browser is open.
      void Promise.resolve()
        .then(() => WebBrowser.dismissBrowser())
        .catch(() => undefined);
    }
    lockedNow = locked;
  });
  return () => {
    unsubscribe();
    monitor.dispose();
  };
}

/** Test hook: forget module state (the launch read, held background, prompts in flight). */
export function _resetAppLockForTests(): void {
  hydrated = false;
  authInFlight = 0;
  heldBackgroundAt = null;
  cameFromBackground = false;
}
