/**
 * Server URL management.
 *
 * Persists the ObjectStack server base URL using expo-secure-store
 * so users can configure which server they connect to.
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { serverUrlAfterRedirect } from "~/lib/shell/console-url";

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
 * Probe a server and return the base URL to keep, or `null` when it is not
 * reachable. Tries `GET <url>/api/v1/health`, then a plain `HEAD <url>`.
 *
 * When the probe was redirected only to another origin (apex → www,
 * http → https), the redirected origin is returned — see
 * `serverUrlAfterRedirect` — so the shell's origin checks match what the
 * WebView ends up on.
 */
export async function resolveServerUrl(
  url: string,
  opts: { allowInsecure?: boolean } = {}
): Promise<string | null> {
  const normalised = url.replace(/\/+$/, "");
  const probe = async (target: string, method: "GET" | "HEAD") => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      return await fetch(target, { method, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const healthUrl = `${normalised}/api/v1/health`;
    const res = await probe(healthUrl, "GET");
    return res.ok ? serverUrlAfterRedirect(normalised, healthUrl, res.url, opts) : null;
  } catch {
    // Even if /api/v1/health fails, try a basic connectivity check
    try {
      const res = await probe(normalised, "HEAD");
      return res.status < 500
        ? serverUrlAfterRedirect(normalised, normalised, res.url, opts)
        : null;
    } catch {
      return null;
    }
  }
}

/**
 * Validate that a URL looks like a valid server endpoint.
 * Attempts a lightweight HEAD request to the server.
 */
export async function validateServerUrl(url: string): Promise<boolean> {
  return (await resolveServerUrl(url)) !== null;
}
