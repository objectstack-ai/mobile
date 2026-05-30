import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { twoFactorClient } from "better-auth/client/plugins";
import type { BetterAuthClientPlugin } from "better-auth/client";
import * as SecureStore from "expo-secure-store";

/**
 * The Expo client plugin. better-auth's structural plugin type and the Expo
 * plugin's inferred shape don't line up under strict checking (the `fetchPlugins`
 * generics differ), so we assert the runtime-correct shape here in one place.
 */
function makeExpoPlugin(): BetterAuthClientPlugin {
  return expoClient({
    scheme: "objectstack",
    storage: SecureStore,
  }) as unknown as BetterAuthClientPlugin;
}

/**
 * Plugins for the auth client. The two-factor plugin adds `authClient.twoFactor.*`
 * (enable/verifyTotp/disable/generateBackupCodes), matching the server's
 * `/api/v1/auth/two-factor/*` routes (the auth plugin mounts them by default).
 */
function makePlugins() {
  return [makeExpoPlugin(), twoFactorClient()];
}

/**
 * The current server URL used by the auth client.
 * Updated via `reinitializeAuthClient()` after the user configures a server.
 */
let currentBaseURL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3100";

/**
 * ObjectStack mounts better-auth under `/api/v1/auth`, not better-auth's
 * default `/api/auth`. The client must use this base path so requests like
 * `get-session`, `sign-in/email`, and the two-factor routes resolve.
 */
const AUTH_BASE_PATH = "/api/v1/auth";

/**
 * The scheme+host origin of the server (e.g. `https://cloud.objectos.app`),
 * derived from the configured base URL.
 */
function toServerOrigin(serverUrl: string): string {
  const trimmed = serverUrl.replace(/\/+$/, "");
  try {
    const u = new URL(trimmed);
    return `${u.protocol}//${u.host}`;
  } catch {
    return trimmed;
  }
}

/**
 * better-auth enforces a CSRF origin check on state-changing requests that
 * carry a session cookie: the request's `Origin` (or `Referer`) must match a
 * trusted origin, and the server always trusts its own base URL. React Native
 * — unlike a browser — never sets `Origin` automatically, and the ObjectStack
 * server does not run the `@better-auth/expo` server plugin, so it can't derive
 * the origin from the `expo-origin` header the client sends. The result is a
 * `MISSING_OR_NULL_ORIGIN` ("Missing or null Origin") rejection on the first
 * cookied request after sign-in.
 *
 * We stamp the server's own origin on every auth request (without clobbering an
 * `Origin` already present) so the check passes.
 */
function makeAuthFetch(
  serverOrigin: string,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return (input, init = {}) => {
    const headers = new Headers(init.headers);
    if (!headers.has("Origin")) {
      headers.set("Origin", serverOrigin);
    }
    return fetch(input, { ...init, headers });
  };
}

export let authClient = createAuthClient({
  baseURL: currentBaseURL,
  basePath: AUTH_BASE_PATH,
  plugins: makePlugins(),
  fetchOptions: {
    customFetchImpl: makeAuthFetch(toServerOrigin(currentBaseURL)),
  },
});

/**
 * Re-create the auth client with a new server URL.
 * Call this after the user sets a server address on the config screen.
 */
export function reinitializeAuthClient(baseURL: string) {
  currentBaseURL = baseURL;
  authClient = createAuthClient({
    baseURL: currentBaseURL,
    basePath: AUTH_BASE_PATH,
    plugins: makePlugins(),
    fetchOptions: {
      customFetchImpl: makeAuthFetch(toServerOrigin(currentBaseURL)),
    },
  });
}

/**
 * Return the current base URL used by the auth client.
 */
export function getAuthBaseURL(): string {
  return currentBaseURL;
}
