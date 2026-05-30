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
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export let authClient = createAuthClient({
  baseURL: currentBaseURL,
  plugins: makePlugins(),
});

/**
 * Re-create the auth client with a new server URL.
 * Call this after the user sets a server address on the config screen.
 */
export function reinitializeAuthClient(baseURL: string) {
  currentBaseURL = baseURL;
  authClient = createAuthClient({
    baseURL: currentBaseURL,
    plugins: makePlugins(),
  });
}

/**
 * Return the current base URL used by the auth client.
 */
export function getAuthBaseURL(): string {
  return currentBaseURL;
}
