/**
 * The managed app configuration, read through the local native module
 * `modules/managed-config/` (iOS `com.apple.configuration.managed`, Android
 * `RestrictionsManager`).
 *
 * When it is read:
 *
 * - on launch (`readManagedConfig`, from the server store's hydrate);
 * - every time the app becomes active — the only moment both platforms
 *   guarantee: Android delivers `ACTION_APPLICATION_RESTRICTIONS_CHANGED` only
 *   to a receiver registered while the app runs, and iOS documents
 *   `UserDefaults.didChangeNotification` for changes the app's own process
 *   makes, not for the MDM installing a configuration;
 * - on the module's `onChange` event (that broadcast, and that notification),
 *   which adds a change seen while the app is in the foreground where the
 *   platform reports one.
 *
 * Without the native module (web, Expo Go, a build older than it, tests) there
 * is no managed config.
 */
import { AppState } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NO_MANAGED_CONFIG, parseManagedConfig, type ManagedConfig } from "./model";

interface Subscription {
  remove(): void;
}

interface ManagedConfigNativeModule {
  getManagedConfig(): Record<string, unknown>;
  addListener(event: "onChange", listener: () => void): Subscription;
}

function nativeModule(): ManagedConfigNativeModule | null {
  return requireOptionalNativeModule<ManagedConfigNativeModule>("ManagedConfig");
}

/** The managed config now. Never throws: a failed read is no managed config. */
export function readManagedConfig(): ManagedConfig {
  try {
    const native = nativeModule();
    return native ? parseManagedConfig(native.getManagedConfig()) : NO_MANAGED_CONFIG;
  } catch {
    return NO_MANAGED_CONFIG;
  }
}

/**
 * Call `onRead` with the managed config each time it may have changed (see
 * above); the caller compares. Returns the unsubscribe.
 */
export function subscribeManagedConfig(onRead: (config: ManagedConfig) => void): () => void {
  const read = () => onRead(readManagedConfig());
  const subscriptions: Subscription[] = [
    AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    }),
  ];
  try {
    const native = nativeModule();
    if (native) subscriptions.push(native.addListener("onChange", read));
  } catch {
    // The foreground read above still covers it.
  }
  return () => subscriptions.forEach((s) => s.remove());
}
