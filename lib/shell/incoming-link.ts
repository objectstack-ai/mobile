/**
 * Incoming app links → Console routes.
 *
 * The shell answers two link shapes on its URL scheme (default `objectstack`):
 *
 *   objectstack://open?route=%2Fapps%2Fcrm%2Fopportunity%2F123
 *   objectstack://console/apps/crm/opportunity/123
 *
 * Both open the Console at that route. Anything else lands on the shell's start
 * screen rather than on an expo-router "not found" page.
 */
import { safeConsoleRoute } from "./console-url";

const SCHEME_LINK_RE = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)([^?#]*)(\?[^#]*)?/i;

function queryParam(query: string | undefined, name: string): string | null {
  if (!query) return null;
  for (const pair of query.replace(/^\?/, "").split("&")) {
    const eq = pair.indexOf("=");
    const key = eq === -1 ? pair : pair.slice(0, eq);
    if (key !== name) continue;
    try {
      return decodeURIComponent((eq === -1 ? "" : pair.slice(eq + 1)).replace(/\+/g, " "));
    } catch {
      return null;
    }
  }
  return null;
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
 * expo-router `redirectSystemPath` policy: our app links open the Console,
 * other links on our scheme land on the start screen, and anything that is not
 * a scheme URL (internal paths, the dev-client launcher) passes through.
 *
 * Each redirect carries a nonce (`now()`, injectable for tests) so opening the
 * same link twice navigates both times.
 */
export function redirectIncomingPath(path: string, now: () => number = Date.now): string {
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return path;
  if (path.includes("expo-development-client")) return path;
  const route = routeFromIncomingLink(path);
  return route ? consoleScreenHref(route, now()) : "/";
}
