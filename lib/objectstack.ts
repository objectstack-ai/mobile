import { ObjectStackClient } from "@objectstack/client";

let API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Update the API base URL at runtime (called after server config).
 */
export function setObjectStackApiUrl(url: string) {
  API_URL = url;
}

/**
 * Create an ObjectStack client instance with optional auth token.
 * Token is injected from better-auth session for authenticated requests.
 */
export function createObjectStackClient(token?: string): ObjectStackClient {
  return new ObjectStackClient({
    baseUrl: API_URL,
    token,
  });
}

/**
 * Get a singleton client for unauthenticated/discovery requests.
 * For authenticated requests, use the provider which creates a token-aware client.
 */
export function getObjectStackClient(): ObjectStackClient {
  return new ObjectStackClient({
    baseUrl: API_URL,
  });
}

/**
 * Legacy singleton — prefer `getObjectStackClient()` for current URL.
 */
export const objectStackClient = new ObjectStackClient({
  baseUrl: API_URL,
});
