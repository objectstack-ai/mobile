/**
 * Install id — a random identifier for this install of the app.
 *
 * The Console sends it as the push device registry's `deviceId`, so a device
 * keeps one registry row even after the WebView's storage (cookies,
 * localStorage, IndexedDB) is cleared: the id lives in SecureStore, outside
 * the WebView. It is a UUID v4 from the platform's CSPRNG (expo-modules-core:
 * `UUID()` on iOS, `UUID.randomUUID()` on Android) — never a hardware id and
 * never an advertising id.
 *
 * Lifetime: generated on first read, then stable. Android drops it with the
 * app's data (uninstall, "clear storage"; a value restored from a backup
 * cannot be decrypted and reads as missing). iOS keychain items can outlive an
 * uninstall, so a reinstall may keep the id. `THIS_DEVICE_ONLY` keeps it out
 * of backups restored onto another device.
 *
 * Read synchronously, because the bridge bootstrap is built synchronously when
 * the WebView mounts. A read or write that fails answers `null` and is tried
 * again on the next call; an id that could not be stored is never handed out,
 * since the next launch would mint another one.
 */
import * as SecureStore from "expo-secure-store";
import { uuid } from "expo-modules-core";

export const INSTALL_ID_KEY = "objectstack_install_id";

const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  // Readable when the app starts in the background (a notification) on a
  // device unlocked once since boot; never restored onto another device.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const INSTALL_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let cached: string | null = null;

/** Whether `value` is an install id this module would have written. */
export function isInstallId(value: unknown): value is string {
  return typeof value === "string" && INSTALL_ID_RE.test(value);
}

/**
 * This install's id, generated and stored on first use; `null` when secure
 * storage cannot be read or written right now.
 */
export function getInstallId(): string | null {
  if (cached !== null) return cached;

  let stored: string | null;
  try {
    stored = SecureStore.getItem(INSTALL_ID_KEY, STORE_OPTIONS);
  } catch {
    // Unreadable (e.g. the keychain before the first unlock): do not mint a
    // replacement over a value that may still be there.
    return null;
  }
  if (isInstallId(stored)) {
    cached = stored;
    return stored;
  }

  let fresh: string;
  try {
    fresh = uuid.v4().toLowerCase();
    if (!isInstallId(fresh)) return null;
    SecureStore.setItem(INSTALL_ID_KEY, fresh, STORE_OPTIONS);
  } catch {
    return null;
  }
  cached = fresh;
  return fresh;
}

/** Test hook: forget the id read in this process (storage is untouched). */
export function _resetInstallIdCache(): void {
  cached = null;
}
