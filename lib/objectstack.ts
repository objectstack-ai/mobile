import { ObjectStackClient } from "@objectstack/client";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

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
 * Singleton client for unauthenticated/discovery requests.
 * For authenticated requests, use the provider which creates a token-aware client.
 */
export const objectStackClient = new ObjectStackClient({
  baseUrl: API_URL,
});
