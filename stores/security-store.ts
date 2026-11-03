/**
 * App lock state: the user's setting and where the lock is right now.
 *
 * The transitions are one pure function, {@link stepAppLock}; the store only
 * holds its result. Everything with a side effect — reading and writing the
 * setting, the AppState monitor, the biometric prompt, the app-switcher
 * protection — lives in `lib/app-lock.ts`.
 *
 *   unlocked ──background──▶ covered ──active, within the timeout──▶ unlocked
 *                               └──────active, past the timeout──▶ locked
 *   locked ──unlockStarted──▶ unlocking ──ok──▶ unlocked
 *                                └──────fail──▶ locked
 *
 * - `covered`: the app went to the background with the lock on. The overlay
 *   is up (no prompt yet), so the page does not show for a frame on return
 *   while the timeout is judged.
 * - `locked`: the overlay is up and asks for Face ID / Touch ID / fingerprint,
 *   with the device passcode as fallback. A cold start with the lock on starts
 *   here.
 * - `unlocking`: the system prompt is on screen.
 *
 * The lock never changes the page under it: the overlay is a native view over
 * the WebView, not a route, and nothing here touches the Console's load state.
 */
import { create } from "zustand";

/** The timeouts the settings screen offers, in seconds (`0`: as soon as the app leaves). */
export const APP_LOCK_TIMEOUTS = [0, 60, 300, 900, 3600] as const;
export type AppLockTimeout = (typeof APP_LOCK_TIMEOUTS)[number];
export const DEFAULT_APP_LOCK_TIMEOUT: AppLockTimeout = 300;

export function isAppLockTimeout(value: unknown): value is AppLockTimeout {
  return (APP_LOCK_TIMEOUTS as readonly unknown[]).includes(value);
}

export interface AppLockSettings {
  enabled: boolean;
  /** How long the app may stay in the background before it locks. */
  timeoutSeconds: AppLockTimeout;
}

export const APP_LOCK_OFF: AppLockSettings = Object.freeze({
  enabled: false,
  timeoutSeconds: DEFAULT_APP_LOCK_TIMEOUT,
});

export type AppLockPhase = "unlocked" | "covered" | "locked" | "unlocking";

/** Why the last unlock attempt did not unlock (a cancel leaves no reason). */
export type UnlockError = "failed" | "no-device-lock";

export interface AppLockState {
  settings: AppLockSettings;
  phase: AppLockPhase;
  /** When the app went to the background while unlocked (ms), for the timeout. */
  backgroundAt: number | null;
  /** The overlay starts the prompt by itself once the app is active. */
  promptPending: boolean;
  unlockError: UnlockError | null;
}

export type AppLockEvent =
  /** The stored setting was read at launch: with the lock on, the app starts locked. */
  | { type: "hydrated"; settings: AppLockSettings }
  /** The app went to the background (not merely inactive). */
  | { type: "background"; at: number }
  /** The app came back to the foreground from the background. */
  | { type: "active"; at: number }
  | { type: "unlockStarted" }
  | { type: "unlockFinished"; ok: boolean; error?: UnlockError | null }
  /**
   * A new setting was authenticated and stored (`changeAppLockSettings` in
   * `lib/app-lock.ts` is the only producer).
   */
  | { type: "settingsCommitted"; settings: AppLockSettings };

export const INITIAL_APP_LOCK_STATE: AppLockState = {
  settings: APP_LOCK_OFF,
  phase: "unlocked",
  backgroundAt: null,
  promptPending: false,
  unlockError: null,
};

const LOCKED = { phase: "locked", backgroundAt: null, promptPending: true } as const;

export function stepAppLock(state: AppLockState, event: AppLockEvent): AppLockState {
  switch (event.type) {
    case "hydrated":
      return event.settings.enabled
        ? { ...state, ...LOCKED, settings: event.settings, unlockError: null }
        : { ...INITIAL_APP_LOCK_STATE, settings: event.settings };

    case "background":
      if (!state.settings.enabled || state.phase !== "unlocked") return state;
      return { ...state, phase: "covered", backgroundAt: event.at };

    case "active": {
      if (state.phase === "locked") {
        // Back from the background still locked: ask again.
        return { ...state, promptPending: true, unlockError: null };
      }
      if (state.phase !== "covered") return state;
      const elapsedMs = event.at - (state.backgroundAt ?? event.at);
      if (elapsedMs >= state.settings.timeoutSeconds * 1000) {
        return { ...state, ...LOCKED, unlockError: null };
      }
      return { ...state, phase: "unlocked", backgroundAt: null };
    }

    case "unlockStarted":
      if (state.phase !== "locked") return state;
      return { ...state, phase: "unlocking", promptPending: false, unlockError: null };

    case "unlockFinished":
      if (state.phase !== "unlocking") return state;
      return event.ok
        ? { ...state, phase: "unlocked", backgroundAt: null, unlockError: null }
        : { ...state, phase: "locked", unlockError: event.error ?? null };

    case "settingsCommitted":
      // Turning the lock off lifts anything it holds; turning it on, or a new
      // timeout, takes effect at the next background.
      return event.settings.enabled
        ? { ...state, settings: event.settings }
        : { ...INITIAL_APP_LOCK_STATE, settings: event.settings };
  }
}

/** The lock holds the screen: the overlay is up. */
export function isAppLocked(state: Pick<AppLockState, "phase">): boolean {
  return state.phase !== "unlocked";
}

/** What the bridge's read-only `getAppLock()` answers: a copy, never the store's object. */
export function appLockSnapshot(state: Pick<AppLockState, "settings">): AppLockSettings {
  return { enabled: state.settings.enabled, timeoutSeconds: state.settings.timeoutSeconds };
}

export interface SecurityState extends AppLockState {
  dispatch: (event: AppLockEvent) => void;
}

export const useSecurityStore = create<SecurityState>((set) => ({
  ...INITIAL_APP_LOCK_STATE,
  dispatch: (event) => set((state) => stepAppLock(state, event)),
}));
