/**
 * Console URL handling — the one place that knows how a configured server maps
 * to the web Console the shell hosts, and back.
 *
 * Deliberately regex-based rather than `new URL()`: React Native's `URL`
 * implementation is partial (several accessors throw "not implemented"), and
 * these helpers run on every WebView navigation.
 */

/** Where the ObjectStack server mounts the Console SPA. */
export const CONSOLE_BASE_PATH = "/_console";

/** The Console route the shell opens when nothing more specific is asked for. */
export const DEFAULT_CONSOLE_ROUTE = "/home";

const URL_RE = /^([a-z][a-z0-9+.-]*):\/\/([^/?#\s]+)([^?#\s]*)?([?#].*)?$/i;

export interface ParsedUrl {
  /** Lower-cased scheme without the colon, e.g. `https`. */
  scheme: string;
  /** Lower-cased host, including a port when present. */
  host: string;
  /** Path, always starting with `/` (empty path → `/`). */
  path: string;
  /** Query + fragment, verbatim (may be empty). */
  rest: string;
}

/** Parse an absolute hierarchical URL, or return `null`. */
export function parseUrl(url: string): ParsedUrl | null {
  const m = URL_RE.exec(url.trim());
  if (!m) return null;
  return {
    scheme: m[1].toLowerCase(),
    host: m[2].toLowerCase(),
    path: m[3] && m[3].length > 0 ? m[3] : "/",
    rest: m[4] ?? "",
  };
}

/** `scheme://host` of an absolute URL, or `null`. */
export function originOf(url: string): string | null {
  const p = parseUrl(url);
  return p ? `${p.scheme}://${p.host}` : null;
}

const LOCAL_HOST_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

export type NormalizeServerUrlResult =
  | { ok: true; serverUrl: string }
  | { ok: false; reason: "empty" | "invalid" | "insecure" };

/**
 * Turn whatever the user typed into a canonical server base URL.
 *
 * - adds `https://` when no scheme is given;
 * - lower-cases scheme and host, drops a trailing slash, query and fragment;
 * - accepts a pasted Console URL (`…/_console/apps/crm`) by cutting at the
 *   Console mount;
 * - refuses plain `http://` except for local/private hosts or when
 *   `allowInsecure` is set (development builds) — iOS ATS would block it anyway.
 */
export function normalizeServerUrl(
  input: string,
  opts: { allowInsecure?: boolean } = {}
): NormalizeServerUrlResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = parseUrl(withScheme);
  if (!parsed || (parsed.scheme !== "https" && parsed.scheme !== "http")) {
    return { ok: false, reason: "invalid" };
  }
  if (
    !/^[a-z0-9.-]+(:\d{1,5})?$/.test(parsed.host) &&
    !/^\[[0-9a-f:]+\](:\d{1,5})?$/.test(parsed.host)
  ) {
    return { ok: false, reason: "invalid" };
  }
  if (parsed.scheme === "http" && !opts.allowInsecure && !LOCAL_HOST_RE.test(parsed.host)) {
    return { ok: false, reason: "insecure" };
  }

  let path = parsed.path;
  const consoleAt = path.indexOf(CONSOLE_BASE_PATH);
  if (
    consoleAt !== -1 &&
    (path.length === consoleAt + CONSOLE_BASE_PATH.length ||
      path[consoleAt + CONSOLE_BASE_PATH.length] === "/")
  ) {
    path = path.slice(0, consoleAt);
  }
  path = path.replace(/\/+$/, "");

  return { ok: true, serverUrl: `${parsed.scheme}://${parsed.host}${path}` };
}

/** Normalize a Console route: leading `/`, never empty. */
export function normalizeRoute(route: string | null | undefined): string {
  if (!route) return DEFAULT_CONSOLE_ROUTE;
  const r = route.trim();
  if (!r || r === "/") return DEFAULT_CONSOLE_ROUTE;
  return r.startsWith("/") ? r : `/${r}`;
}

/** Absolute URL of a Console route on the given server. */
export function consoleUrl(serverUrl: string, route?: string | null): string {
  return `${serverUrl}${CONSOLE_BASE_PATH}${normalizeRoute(route)}`;
}

/**
 * The Console route an absolute URL points at on this server, or `null` when
 * the URL is not inside this server's Console (other origin, API path, …).
 * The returned route keeps its query and fragment.
 */
export function routeFromConsoleUrl(serverUrl: string, url: string): string | null {
  const server = parseUrl(serverUrl);
  const target = parseUrl(url);
  if (!server || !target) return null;
  if (server.scheme !== target.scheme || server.host !== target.host) {
    return null;
  }
  const base = `${server.path === "/" ? "" : server.path}${CONSOLE_BASE_PATH}`;
  if (target.path !== base && !target.path.startsWith(`${base}/`)) return null;
  const route = target.path.slice(base.length) || "/";
  return `${route}${target.rest}`;
}

/** Strip query and fragment from a route. */
export function routePath(route: string): string {
  const cut = route.search(/[?#]/);
  return cut === -1 ? route : route.slice(0, cut);
}
