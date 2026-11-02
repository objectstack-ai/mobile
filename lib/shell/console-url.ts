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
  /**
   * Lower-cased host, including a port when present. The scheme's default
   * port (`:443` for https, `:80` for http) is dropped, as WebViews report
   * URLs without it — so hosts compare equal however the port was written.
   */
  host: string;
  /** Path, always starting with `/` (empty path → `/`). */
  path: string;
  /** Query + fragment, verbatim (may be empty). */
  rest: string;
}

const DEFAULT_PORTS: Readonly<Record<string, string>> = { https: ":443", http: ":80" };

/** Drop the scheme's default port from a lower-cased `host[:port]`. */
function withoutDefaultPort(scheme: string, host: string): string {
  const port = DEFAULT_PORTS[scheme];
  return port && host.endsWith(port) ? host.slice(0, -port.length) : host;
}

/** Parse an absolute hierarchical URL, or return `null`. */
export function parseUrl(url: string): ParsedUrl | null {
  const m = URL_RE.exec(url.trim());
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  return {
    scheme,
    host: withoutDefaultPort(scheme, m[2].toLowerCase()),
    path: m[3] && m[3].length > 0 ? m[3] : "/",
    rest: m[4] ?? "",
  };
}

/** `scheme://host` of an absolute URL (default port dropped), or `null`. */
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
 * - lower-cases scheme and host, drops the scheme's default port, a trailing
 *   slash, query and fragment;
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

// C0 controls, DEL and C1 controls. URL parsers silently strip tab / newline
// anywhere in a URL (`/.\t./api` becomes `/../api`), so none may appear.
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f-\u009f]/;

/** How many rounds of percent-decoding a segment is checked through. */
const MAX_DECODE_ROUNDS = 3;

/**
 * Whether one path segment is safe to place under the Console mount: not a
 * dot segment (`.` / `..`, raw or percent-encoded in any case, also after
 * repeated decoding) and not hiding a separator (`%2f`, `%5c`) or a control
 * character. Malformed percent-encoding is refused.
 */
function isSafeSegment(segment: string): boolean {
  let s = segment;
  for (let round = 0; round <= MAX_DECODE_ROUNDS; round += 1) {
    if (s === "." || s === "..") return false;
    if (round > 0 && (s.includes("/") || s.includes("\\") || CONTROL_CHAR_RE.test(s))) {
      return false;
    }
    if (!s.includes("%")) return true;
    let decoded: string;
    try {
      decoded = decodeURIComponent(s);
    } catch {
      return false;
    }
    if (decoded === s) return true;
    s = decoded;
  }
  // Still encoded after every round: nobody legitimately nests that deep.
  return false;
}

/**
 * The single gate for a Console route arriving from outside the Console — an
 * app link, a notification, a bridge `navigate` call — and the last check
 * before a route becomes a URL. Returns the trimmed route, or `null` when it
 * is not a plain Console path:
 *
 * - must start with `/` but not `//` (protocol-relative);
 * - no backslash and no control character anywhere (WebViews treat `\` as
 *   `/` and strip tab / newline);
 * - no `.` / `..` path segment, raw or percent-encoded (`%2e`, `%2E%2e`, …),
 *   and no encoded separator in a segment — otherwise
 *   `<server>/_console/../../api/…` resolves outside the Console.
 *
 * The query and fragment are not path, and are only checked for control
 * characters.
 */
export function safeConsoleRoute(route: unknown): string | null {
  if (typeof route !== "string") return null;
  const r = route.trim();
  if (!r.startsWith("/") || r.startsWith("//")) return null;
  if (r.includes("\\") || CONTROL_CHAR_RE.test(r)) return null;
  const path = routePath(r);
  for (const segment of path.split("/")) {
    if (!isSafeSegment(segment)) return null;
  }
  return r;
}

/**
 * Absolute URL of a Console route on the given server. A route that fails
 * {@link safeConsoleRoute} is replaced by the default route, so the result
 * never points outside `<server>/_console/`.
 */
export function consoleUrl(serverUrl: string, route?: string | null): string {
  const safe = safeConsoleRoute(normalizeRoute(route)) ?? DEFAULT_CONSOLE_ROUTE;
  return `${serverUrl}${CONSOLE_BASE_PATH}${safe}`;
}

/**
 * The Console route an absolute URL points at on this server, or `null` when
 * the URL is not inside this server's Console (other origin, API path, a path
 * that would escape the mount, …). The returned route keeps its query and
 * fragment.
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
  return safeConsoleRoute(`${route}${target.rest}`);
}

/**
 * The server URL to keep after the reachability probe at `probeUrl` was
 * answered from `finalUrl` (fetch's `response.url`). When a redirect changed
 * only the origin — apex → www, http → https — the server lives there, and
 * keeping the typed origin would make every origin check in the shell fail.
 * Anything else (no redirect, a redirect to another path such as a login page,
 * an insecure target) keeps `serverUrl`.
 */
export function serverUrlAfterRedirect(
  serverUrl: string,
  probeUrl: string,
  finalUrl: string | null | undefined,
  opts: { allowInsecure?: boolean } = {}
): string {
  if (!finalUrl) return serverUrl;
  const server = parseUrl(serverUrl);
  const probe = parseUrl(probeUrl);
  const final = parseUrl(finalUrl);
  if (!server || !probe || !final) return serverUrl;
  if (final.scheme === probe.scheme && final.host === probe.host) return serverUrl;
  const trim = (p: string) => p.replace(/\/+$/, "");
  if (trim(final.path) !== trim(probe.path)) return serverUrl;
  const moved = normalizeServerUrl(
    `${final.scheme}://${final.host}${server.path === "/" ? "" : server.path}`,
    opts
  );
  return moved.ok ? moved.serverUrl : serverUrl;
}

/** Strip query and fragment from a route. */
export function routePath(route: string): string {
  const cut = route.search(/[?#]/);
  return cut === -1 ? route : route.slice(0, cut);
}
