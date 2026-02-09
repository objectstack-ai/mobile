/**
 * Server URL management.
 *
 * Persists the ObjectStack server base URL using expo-secure-store
 * so users can configure which server they connect to.
 */
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "objectstack_server_url";

/**
 * Retrieve the saved server URL. Returns `null` if not yet configured.
 */
export async function getServerUrl(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist the server URL.
 */
export async function setServerUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, url);
}

/**
 * Remove the stored server URL (used on reset / sign-out).
 */
export async function clearServerUrl(): Promise<void> {
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

    const res = await fetch(`${normalised}/api/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    // Even if /api/health fails, try a basic connectivity check
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
