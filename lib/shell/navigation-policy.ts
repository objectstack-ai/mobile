/**
 * WebView navigation policy — what happens when the Console (or anything it
 * links to) asks the WebView to load a URL.
 *
 * - this server, Console route owned by native → hand to the native screen;
 * - this server, anything else (Console, auth callbacks, file URLs) → load;
 * - a host the deployment trusts for sign-in (IdP) → load in the WebView;
 * - any other http(s) page in the top frame → system browser;
 * - sub-frames (embedded maps, previews) → load;
 * - `mailto:` / `tel:` / `sms:` / app schemes → hand to the OS;
 * - `javascript:` / `file:` / top-frame `data:` → block.
 *
 * This is the policy outside a sign-in excursion, and it does not change
 * during one. `lib/shell/sign-in-excursion.ts` sits on top of it. An
 * off-server https page that this policy sends to the system browser may
 * load in the WebView only when the excursion started from the server's sign-in
 * surface ({@link isSignInSurface}).
 */
import {
  originOf,
  parseUrl,
  routeFromConsoleUrl,
  routePath,
  safeConsoleRoute,
} from "./console-url";
import { resolveRoute, type RouteRule } from "./route-owner";

/** The Console route of the server's sign-in page (`<server>/_console/login`). */
export const SIGN_IN_ROUTE = "/login";

/** The server's auth API mount, under the server's base path (`<server>/api/v1/auth/…`). */
export const AUTH_API_PATH = "/api/v1/auth/";

/**
 * Whether `url` is on the server's sign-in surface: the Console's `/login`
 * route (any query), or a path under the auth API (`/api/v1/auth/*`, whose
 * sign-in routes redirect to the identity provider). Both are judged on the
 * server's own origin and under its base path, like every server URL. A path
 * with a dot segment or an encoded separator is not on the surface.
 *
 * The URL judged is the shell's own record of the top frame (see
 * `sign-in-excursion.ts`). It is never a URL a page reports over the bridge.
 */
export function isSignInSurface(serverUrl: string, url: string): boolean {
  const server = parseUrl(serverUrl);
  const target = parseUrl(url);
  if (!server || !target) return false;
  if (server.scheme !== target.scheme || server.host !== target.host) return false;
  const base = server.path === "/" ? "" : server.path;
  if (target.path.startsWith(`${base}${AUTH_API_PATH}`)) {
    return safeConsoleRoute(target.path.slice(base.length)) !== null;
  }
  const route = routeFromConsoleUrl(serverUrl, url);
  if (route === null) return false;
  const path = routePath(route);
  return path === SIGN_IN_ROUTE || path === `${SIGN_IN_ROUTE}/`;
}

export type NavigationDecision =
  | { kind: "load" }
  | { kind: "native"; screen: string; route: string }
  | { kind: "external"; url: string }
  | { kind: "block" };

export interface NavigationContext {
  serverUrl: string;
  rules: readonly RouteRule[];
  availableScreens: ReadonlySet<string>;
  /** Hosts (lower-case, may include port) allowed to load in the top frame. */
  trustedHosts?: readonly string[];
  /** `false` for iframe loads; platforms that don't report it pass `true`. */
  isTopFrame?: boolean;
}

const BLOCKED_SCHEMES = new Set(["javascript", "file", "content", "intent"]);

function schemeOf(url: string): string | null {
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(url.trim());
  return m ? m[1].toLowerCase() : null;
}

export function decideNavigation(url: string, ctx: NavigationContext): NavigationDecision {
  const isTopFrame = ctx.isTopFrame !== false;
  const scheme = schemeOf(url);
  if (!scheme) return { kind: "block" };

  if (scheme === "about") return { kind: "load" };
  if (scheme === "blob") return { kind: "load" };
  if (scheme === "data") return isTopFrame ? { kind: "block" } : { kind: "load" };
  if (BLOCKED_SCHEMES.has(scheme)) return { kind: "block" };

  if (scheme !== "http" && scheme !== "https") {
    // mailto:, tel:, sms:, maps:, weixin://, dingtalk://, … — the OS decides.
    return isTopFrame ? { kind: "external", url } : { kind: "block" };
  }

  if (!isTopFrame) return { kind: "load" };

  if (originOf(url) === originOf(ctx.serverUrl)) {
    const route = routeFromConsoleUrl(ctx.serverUrl, url);
    if (route !== null) {
      const owner = resolveRoute(route, ctx.rules, ctx.availableScreens);
      if (owner.owner === "native") {
        return { kind: "native", screen: owner.screen, route };
      }
    }
    return { kind: "load" };
  }

  const host = parseUrl(url)?.host;
  if (host && ctx.trustedHosts?.includes(host)) return { kind: "load" };

  return { kind: "external", url };
}
