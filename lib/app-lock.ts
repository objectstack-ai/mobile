/**
 * App-lock controller.
 *
 * Monitors the app lifecycle (foreground / background) and locks the app
 * after the configured inactivity timeout.  When locked the user must
 * authenticate via biometrics (or device passcode) to continue.
 */
import { AppState, type AppStateStatus } from "react-native";
import { useSecurityStore } from "~/stores/security-store";
import { authenticate } from "~/lib/biometric-auth";

/** Handle returned by `startAppLockMonitor` for cleanup. */
export interface AppLockHandle {
  /** Remove the AppState listener */
  dispose: () => void;
}

/**
 * Start monitoring AppState changes.
 *
 * - When the app goes to the background the current timestamp is
 *   persisted via `recordActivity()`.
 * - When the app returns to the foreground we compare elapsed time
 *   against the configured `inactivityTimeout`.  If the timeout has
 *   elapsed and biometric lock is enabled the app is locked.
 */
export function startAppLockMonitor(): AppLockHandle {
  let previousState: AppStateStatus = AppState.currentState;

  const subscription = AppState.addEventListener(
    "change",
    (nextState: AppStateStatus) => {
      const store = useSecurityStore.getState();

      if (previousState === "active" && nextState !== "active") {
        // Going to background — stamp current time
        store.recordActivity();
      }

      if (previousState !== "active" && nextState === "active") {
        // Returning to foreground — check timeout
        if (store.biometricEnabled && store.inactivityTimeout > 0) {
          const elapsed = (Date.now() - store.lastActiveAt) / 1000;
          if (elapsed >= store.inactivityTimeout) {
            store.setLocked(true);
          }
        }
      }

      previousState = nextState;
    },
  );

  return {
    dispose: () => subscription.remove(),
  };
}

/**
 * Attempt to unlock the app via biometric authentication.
 * Returns `true` when the app is successfully unlocked.
 */
export async function unlockApp(): Promise<boolean> {
  const result = await authenticate({
    promptMessage: "Unlock ObjectStack",
    fallbackToPasscode: true,
  });

  if (result.success) {
    const store = useSecurityStore.getState();
    store.setLocked(false);
    store.recordActivity();
    return true;
  }

  return false;
}
