import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

/**
 * The current server URL used by the auth client.
 * Updated via `reinitializeAuthClient()` after the user configures a server.
 */
let currentBaseURL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export let authClient = createAuthClient({
  baseURL: currentBaseURL,
  plugins: [
    expoClient({
      scheme: "objectstack",
      storage: SecureStore,
    }),
  ],
});

/**
 * Re-create the auth client with a new server URL.
 * Call this after the user sets a server address on the config screen.
 */
export function reinitializeAuthClient(baseURL: string) {
  currentBaseURL = baseURL;
  authClient = createAuthClient({
    baseURL: currentBaseURL,
    plugins: [
      expoClient({
        scheme: "objectstack",
        storage: SecureStore,
      }),
    ],
  });
}

/**
 * Return the current base URL used by the auth client.
 */
export function getAuthBaseURL(): string {
  return currentBaseURL;
}
