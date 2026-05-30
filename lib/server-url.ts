/**
 * Server URL management.
 *
 * Persists the ObjectStack server base URL using expo-secure-store
 * so users can configure which server they connect to.
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "objectstack_server_url";

/**
 * expo-secure-store has no web backend (its native module resolves to an empty
 * object), so any call there throws. On web we fall back to `localStorage`,
 * which is sufficient for a non-secret config value like the server URL.
 */
const isWeb = Platform.OS === "web";

/**
 * Retrieve the saved server URL. Returns `null` if not yet configured.
 */
export async function getServerUrl(): Promise<string | null> {
  try {
    if (isWeb) {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    }
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist the server URL.
 */
export async function setServerUrl(url: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(STORAGE_KEY, url);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, url);
}

/**
 * Remove the stored server URL (used on reset / sign-out).
 */
export async function clearServerUrl(): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

/**
 * Validate that a URL looks like a valid server endpoint.
 * Attempts a lightweight HEAD request to the server.
 */
export async function validateServerUrl(url: string): Promise<boolean> {
  try {
    const normalised = url.replace(/\/+$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${normalised}/api/v1/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    // Even if /api/v1/health fails, try a basic connectivity check
    try {
      const normalised = url.replace(/\/+$/, "");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(normalised, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.status < 500;
    } catch {
      return false;
    }
  }
}
