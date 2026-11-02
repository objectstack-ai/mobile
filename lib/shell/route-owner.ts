/**
 * Route ownership — decides, per Console route, whether the shell shows it in
 * the WebView (the default) or in a native screen.
 *
 * This is the seam that lets a "simplified native" layer grow later without a
 * rewrite: making `/approvals` native is one rule here plus one screen in
 * `NATIVE_SCREENS`. The rules are evaluated first-match-wins; anything that
 * matches no rule is `web`.
 *
 * Fallback rule (ADR-0078 spirit — never silently drop): a rule that names a
 * native screen this build does not ship resolves to `web`, so an over-eager
 * remote-config rule can never strand the user on a missing screen.
 */
import { routePath } from "./console-url";

export type RouteOwner = "web" | "native";

export interface RouteRule {
  /**
   * Console route pattern: an exact path (`/approvals`) or a prefix ending in
   * `/*` (`/apps/*` matches `/apps` and everything below it).
   */
  pattern: string;
  owner: RouteOwner;
  /** For `native` rules: the key of the screen in `NATIVE_SCREENS`. */
  screen?: string;
}

export type RouteResolution = { owner: "web" } | { owner: "native"; screen: string };

/**
 * The shipped rule table. Empty: every Console route is web until a native
 * screen earns its place (see docs/HYBRID-SHELL.md, "Growing native screens").
 */
export const DEFAULT_ROUTE_RULES: readonly RouteRule[] = [];

/** Does `pattern` match the path of `route`? */
export function matchRoutePattern(pattern: string, route: string): boolean {
  const path = routePath(route).replace(/\/+$/, "") || "/";
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2).replace(/\/+$/, "");
    if (prefix === "") return true;
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  const exact = pattern.replace(/\/+$/, "") || "/";
  return path === exact;
}

/** Resolve who renders `route`. */
export function resolveRoute(
  route: string,
  rules: readonly RouteRule[],
  availableScreens: ReadonlySet<string>
): RouteResolution {
  for (const rule of rules) {
    if (!matchRoutePattern(rule.pattern, route)) continue;
    if (rule.owner === "native" && rule.screen && availableScreens.has(rule.screen)) {
      return { owner: "native", screen: rule.screen };
    }
    return { owner: "web" };
  }
  return { owner: "web" };
}
