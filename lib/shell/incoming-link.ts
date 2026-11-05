/**
 * Incoming app links → shell screens.
 *
 * The shell answers three link shapes on its URL scheme (default `objectos`):
 *
 *   objectos://open?route=%2Fapps%2Fcrm%2Fopportunity%2F123
 *   objectos://console/apps/crm/opportunity/123
 *   objectos://connect?server=https%3A%2F%2Ferp.example.com
 *
 * The first two open the Console at that route. `connect` — the QR code on the
 * Console's mobile-app page, or the same link in an invite email — opens the
 * server picker with that address and probes it; the server is saved only when
 * the user confirms. Anything else lands on the shell's start screen rather
 * than on an expo-router "not found" page.
 */
import { normalizeServerUrl, safeConsoleRoute } from "./console-url";
import { isHandoffCallback } from "./system-sign-in";

const SCHEME_LINK_RE = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)([^?#]*)(\?[^#]*)?/i;

function decodeParam(value: string): string | null {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

/** Every `key=value` pair of a query, raw (not decoded); empty pairs skipped. */
function queryPairs(query: string | undefined): [string, string][] {
  if (!query) return [];
  return query
    .replace(/^\?/, "")
    .split("&")
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const eq = pair.indexOf("=");
      return eq === -1 ? [pair, ""] : [pair.slice(0, eq), pair.slice(eq + 1)];
    });
}

function queryParam(query: string | undefined, name: string): string | null {
  const pair = queryPairs(query).find(([key]) => key === name);
  return pair ? decodeParam(pair[1]) : null;
}

/** The Console route an incoming link asks for, or `null`. */
export function routeFromIncomingLink(link: string): string | null {
  const m = SCHEME_LINK_RE.exec(link.trim());
  if (!m) return null;
  const host = m[1].toLowerCase();
  if (host === "open") return safeConsoleRoute(queryParam(m[3], "route"));
  if (host === "console") return safeConsoleRoute(m[2] || "/home");
  return null;
}

/** The one parameter a `connect` link carries. */
export const CONNECT_SERVER_PARAM = "server";

/** The scheme a connect QR code must use (the Console page writes it). */
export const CONNECT_CODE_SCHEME = "objectos";

/** What a well-formed `connect` link asks for. */
export type ConnectRequest =
  /** The address normalized: probe it and show the confirm step. */
  | { ok: true; serverUrl: string }
  /**
   * The address is not usable (`normalizeServerUrl`'s reason). The picker
   * shows `value` in the address field with that error.
   */
  | { ok: false; reason: "empty" | "invalid" | "insecure"; value: string };

/**
 * Parse a `connect` link. Returns `null` when the link is not one: another
 * host, a path after the host, a malformed query, or any parameter besides a
 * single `server` (a missing or repeated `server` included). The QR code and
 * invite link carry the server address and nothing else — never a credential —
 * so a link carrying more is refused rather than half-honoured.
 */
export function connectRequestFromLink(link: string): ConnectRequest | null {
  const m = SCHEME_LINK_RE.exec(link.trim());
  if (!m || m[1].toLowerCase() !== "connect") return null;
  if (m[2] !== "" && m[2] !== "/") return null;
  const pairs = queryPairs(m[3]);
  if (pairs.length !== 1 || pairs[0][0] !== CONNECT_SERVER_PARAM) return null;
  const value = decodeParam(pairs[0][1]);
  if (value === null) return null;
  const normalized = normalizeServerUrl(value);
  return normalized.ok
    ? { ok: true, serverUrl: normalized.serverUrl }
    : { ok: false, reason: normalized.reason, value };
}

/**
 * The server address a scanned QR code carries, or `null` when the code is
 * not a connect code. Accepted: `objectos://connect?server=…` (see
 * {@link connectRequestFromLink}), and a plain `https://` server URL as a
 * convenience. A connect code whose address is unusable still counts — its raw
 * value goes to the picker, which shows it with the error.
 */
export function serverAddressFromCode(code: string): string | null {
  const text = code.trim();
  if (/^https:\/\//i.test(text)) {
    const normalized = normalizeServerUrl(text);
    return normalized.ok ? normalized.serverUrl : null;
  }
  if (!text.toLowerCase().startsWith(`${CONNECT_CODE_SCHEME}://`)) return null;
  const request = connectRequestFromLink(text);
  if (!request) return null;
  return request.ok ? request.serverUrl : request.value;
}

/**
 * The expo-router path that opens the server picker with `address` filled in
 * and probed. `nonce` makes a repeated request distinguishable.
 */
export function serverConfigHref(address: string, nonce?: string | number): string {
  const n = nonce === undefined ? "" : `&n=${encodeURIComponent(String(nonce))}`;
  return `/server-config?${CONNECT_SERVER_PARAM}=${encodeURIComponent(address)}${n}`;
}

/**
 * The expo-router path that shows `route` in the Console screen. `nonce`
 * makes a repeated request for the same route distinguishable (tapping two
 * notifications for one record must navigate both times).
 */
export function consoleScreenHref(route: string, nonce?: string | number): string {
  const n = nonce === undefined ? "" : `&n=${encodeURIComponent(String(nonce))}`;
  return `/console?route=${encodeURIComponent(route)}${n}`;
}

/**
 * expo-router `redirectSystemPath` policy: route links open the Console,
 * `connect` links open the server picker (never a silent connect), other links
 * on our scheme land on the start screen, and anything that is not a scheme
 * URL (internal paths, the dev-client launcher) passes through.
 *
 * The sign-in hand-off's callback goes nowhere (`""`, which expo-router drops).
 * Android delivers it as an ordinary link while `openAuthSessionAsync` is
 * listening for it, and the page under the auth session must stay. Its token
 * never becomes a router path.
 *
 * Each redirect carries a nonce (`now()`, injectable for tests) so opening the
 * same link twice navigates both times.
 */
export function redirectIncomingPath(path: string, now: () => number = Date.now): string {
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return path;
  if (path.includes("expo-development-client")) return path;
  if (isHandoffCallback(path)) return "";
  const route = routeFromIncomingLink(path);
  if (route) return consoleScreenHref(route, now());
  const connect = connectRequestFromLink(path);
  if (connect) return serverConfigHref(connect.ok ? connect.serverUrl : connect.value, now());
  return "/";
}
