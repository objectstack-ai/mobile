import { ObjectStackClient, type ClientConfig } from "@objectstack/client";
import { Platform } from "react-native";

let API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3100";

const isWeb = Platform.OS === "web";

/**
 * A clean logger for the SDK client. The SDK's default logger formats messages
 * with ANSI colour codes + timestamps meant for a Node terminal; in React
 * Native / web those escape codes leak as literal `[31m…` garbage into the
 * console and the dev error overlay. This routes SDK logs through plain
 * `console` calls (no ANSI), and silences debug/info noise outside dev.
 *
 * `child`/`withTrace` return the same logger (we don't need scoped context);
 * `destroy` is a no-op. Typed loosely to satisfy `ClientConfig["logger"]`
 * without depending on the core logger's exact class shape.
 */
const clientLogger = (() => {
  const dev = typeof __DEV__ !== "undefined" && __DEV__;
  const self = {
    debug: (m: string, meta?: unknown) => dev && console.log("[objectstack]", m, meta ?? ""),
    info: (m: string, meta?: unknown) => dev && console.log("[objectstack]", m, meta ?? ""),
    warn: (m: string, meta?: unknown) => console.warn("[objectstack]", m, meta ?? ""),
    error: (m: string, err?: unknown) => console.warn("[objectstack]", m, err ?? ""),
    fatal: (m: string, err?: unknown) => console.error("[objectstack]", m, err ?? ""),
    log: (m: string, ...args: unknown[]) => dev && console.log("[objectstack]", m, ...args),
    child: () => self,
    withTrace: () => self,
    destroy: async () => {},
  };
  return self as unknown as NonNullable<ClientConfig["logger"]>;
})();

/**
 * Read the better-auth session cookie for native requests. Lazily required so
 * that loading this module (e.g. in unit tests, or on web where the cookie is
 * httpOnly and handled by the browser) never pulls in the better-auth ESM
 * client.
 */
function getNativeAuthCookie(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
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
 * The currently-configured API base URL (e.g. `https://cloud.objectos.app`).
 * Used by features that call backend routes the typed SDK client doesn't
 * surface — notably object-action execution (the `/api/v1/automation/.../trigger`
 * and `/api/v1/actions/...` routes).
 */
export function getApiUrl(): string {
  return API_URL;
}

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
/**
 * Apply the better-auth session credentials to a `RequestInit` (cookie + CSRF
 * origin on native, `credentials: "include"` on web). Exported so streaming
 * callers (e.g. the AI chat over `expo/fetch`) can authenticate identically to
 * {@link apiFetch} without going through `globalThis.fetch`.
 */
export function buildAuthInit(init?: RequestInit): RequestInit {
  const next: RequestInit = { ...init };
  if (isWeb) {
    next.credentials = "include";
  } else {
    // Native carries the session as a `Cookie` header, which makes the server
    // enforce its CSRF origin check. RN never sets `Origin` automatically and
    // the server has no `@better-auth/expo` plugin to derive it, so stamp the
    // server's own (always-trusted) origin to avoid a "missing origin" reject.
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string>),
    };
    const cookie = getNativeAuthCookie();
    if (cookie) {
      headers.cookie = cookie;
    }
    if (!("Origin" in headers) && !("origin" in headers)) {
      headers.Origin = toServerOrigin(API_URL);
    }
    next.headers = headers;
    next.credentials = "omit";
  }
  return next;
}

/** Resolve a base-relative path (`/api/v1/...`) or absolute URL against the
 *  configured API base. */
export function resolveApiUrl(pathOrUrl: string): string {
  const base = API_URL.replace(/\/+$/, "");
  return /^https?:\/\//.test(pathOrUrl)
    ? pathOrUrl
    : `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function authAwareFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return globalThis.fetch(input as RequestInfo, buildAuthInit(init));
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
    logger: clientLogger,
  });
}

/**
 * Authenticated `fetch` for backend routes outside the typed SDK surface.
 * Accepts an absolute URL or a base-relative path (e.g. `/api/v1/...`) and
 * carries the better-auth session + CSRF origin exactly like SDK data calls.
 * Used for object-action execution (the `/api/v1/automation/.../trigger` and
 * `/api/v1/actions/...` routes).
 */
export function apiFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
  return authAwareFetch(resolveApiUrl(pathOrUrl), init);
}

/**
 * Build a client for unauthenticated/discovery requests against the
 * **currently-configured** server. Returns a fresh instance each call so it
 * always reflects the latest {@link setObjectStackApiUrl} — never hold the
 * result across a server switch, or it will talk to the old host.
 *
 * For authenticated requests, prefer the React provider's client (recreated on
 * server/token change); this is for non-React call sites.
 *
 * NOTE: there is deliberately no module-level singleton. `ObjectStackClient`
 * snapshots `baseUrl` at construction, so a long-lived instance created at
 * import time would freeze on the initial URL and silently talk to the wrong
 * server after the user connects elsewhere (a split-brain bug).
 */
export function getObjectStackClient(): ObjectStackClient {
  return new ObjectStackClient({
    baseUrl: API_URL,
    fetch: authAwareFetch,
    logger: clientLogger,
  });
}
