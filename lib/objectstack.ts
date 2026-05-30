import { ObjectStackClient } from "@objectstack/client";
import { Platform } from "react-native";

let API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3100";

const isWeb = Platform.OS === "web";

/**
 * Read the better-auth session cookie for native requests. Lazily required so
 * that loading this module (e.g. in unit tests, or on web where the cookie is
 * httpOnly and handled by the browser) never pulls in the better-auth ESM
 * client.
 */
function getNativeAuthCookie(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authClient } = require("~/lib/auth-client") as {
      authClient: { getCookie?: () => string };
    };
    return typeof authClient.getCookie === "function" ? authClient.getCookie() : "";
  } catch {
    return "";
  }
}

/**
 * Update the API base URL at runtime (called after server config).
 */
export function setObjectStackApiUrl(url: string) {
  API_URL = url;
}

/**
 * Fetch wrapper that carries the better-auth session to the ObjectStack data
 * API. Auth and data share the same better-auth session, but the credential
 * lives in different places per platform:
 *
 * - Web: better-auth stores the session in an httpOnly cookie. JS can't read it,
 *   so we must let the browser attach it via `credentials: "include"` (the
 *   server's CORS already allows credentials for the web origin).
 * - Native: the expo client keeps the cookie in SecureStore and exposes it via
 *   `authClient.getCookie()`; we forward it as a `Cookie` header (mirroring how
 *   the expo plugin authenticates its own requests, with `credentials: "omit"`).
 */
function authAwareFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const next: RequestInit = { ...init };
  if (isWeb) {
    next.credentials = "include";
  } else {
    const cookie = getNativeAuthCookie();
    if (cookie) {
      next.headers = { ...(init?.headers as Record<string, string>), cookie };
    }
    next.credentials = "omit";
  }
  return globalThis.fetch(input as RequestInfo, next);
}

/**
 * Create an ObjectStack client instance. Data requests are authenticated with
 * the better-auth session via {@link authAwareFetch}; an explicit bearer
 * `token` (used on native when a session token is available) still takes
 * precedence inside the client.
 */
export function createObjectStackClient(token?: string): ObjectStackClient {
  return new ObjectStackClient({
    baseUrl: API_URL,
    token,
    fetch: authAwareFetch,
  });
}

/**
 * Get a singleton client for unauthenticated/discovery requests.
 * For authenticated requests, use the provider which creates a token-aware client.
 */
export function getObjectStackClient(): ObjectStackClient {
  return new ObjectStackClient({
    baseUrl: API_URL,
    fetch: authAwareFetch,
  });
}

/**
 * Legacy singleton — prefer `getObjectStackClient()` for current URL.
 */
export const objectStackClient = new ObjectStackClient({
  baseUrl: API_URL,
  fetch: authAwareFetch,
});
