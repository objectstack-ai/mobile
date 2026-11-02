/**
 * Clearing one host's cookies from the WebView cookie store — the local half
 * of signing a removed connection out.
 *
 * Native module: `@preeternal/react-native-cookie-manager` (a TurboModule; its
 * Expo config plugin is registered in `app.config.ts`). What it can scope, read
 * from its source at 7.0.0:
 *
 * - iOS. `clearByName(url, name, { iosCookieStore })` deletes, one cookie at a
 *   time (`WKHTTPCookieStore.delete` / `HTTPCookieStorage.deleteCookie`), every
 *   cookie of that name whose domain matches the URL's host — a parent-domain
 *   cookie (`.example.com`) of the same name included, on every path. Both
 *   stores are cleared: with `sharedCookiesEnabled`, react-native-webview
 *   copies the WebKit store into `HTTPCookieStorage` on every change and copies
 *   `HTTPCookieStorage` back into the WebKit store whenever a WebView is
 *   created, so a cookie left in either one comes back.
 * - Android. One app-wide `CookieManager`, which has no delete call:
 *   `clearByName` reads the cookies that apply to the URL with their domain and
 *   path (`GET_COOKIE_INFO`) and writes an expired cookie over each one of that
 *   name — again parent-domain ones included, but only those whose path covers
 *   the URL. On a WebView provider without `GET_COOKIE_INFO` it refuses with
 *   `not_supported`, and `getAsArray` returns cookies without a domain.
 *
 * So the shell decides itself which cookies are the host's own, and clears a
 * name only when every visible cookie under it is ({@link planHostCookieClear}).
 * Cookies shared with other hosts — a parent-domain cookie, or anything seen
 * by another saved connection on the same host name (cookies ignore ports) —
 * are left in place and counted. When the store cannot tell own from shared,
 * nothing is cleared. Never `clearAll`: that empties every host's cookies.
 */
import { Platform } from "react-native";
import type { Cookie, IOSCookieStoreOptions } from "@preeternal/react-native-cookie-manager";
import { CONSOLE_BASE_PATH, parseUrl } from "~/lib/shell/console-url";
import { hostOf } from "./model";

/** The slice of a stored cookie the plan reads. */
export interface VisibleCookie {
  name: string;
  /** `host` for a host-only cookie, `.parent` for a domain cookie; missing when the store does not say. */
  domain?: string | null;
}

export interface HostCookiePlan {
  /** Cookie names to clear: every visible cookie of each of these is the host's own. */
  names: string[];
  /** Visible cookies left in place, because another host shares them. */
  kept: number;
}

/** `host[:port]` → the host name cookies are scoped to (ports do not isolate cookies). */
function hostName(host: string): string {
  if (host.startsWith("[")) return host.slice(0, host.indexOf("]") + 1);
  return host.replace(/:\d+$/, "");
}

/**
 * Which of the cookies visible to `host` to clear. A cookie is the host's own
 * when it is host-only for this host name, or a domain cookie for exactly
 * this host name that no other saved connection's host falls under. A name
 * is cleared only when none of its visible cookies is shared, because
 * `clearByName` clears every visible cookie of a name. `null` when a cookie
 * has no domain, so own and shared cannot be told apart.
 */
export function planHostCookieClear(
  cookies: readonly VisibleCookie[],
  host: string,
  otherHosts: readonly string[]
): HostCookiePlan | null {
  const self = hostName(host.toLowerCase());
  const others = otherHosts.map((h) => hostName(h.toLowerCase()));
  const sameHostName = others.includes(self);
  const otherBelow = others.some((o) => o.endsWith(`.${self}`));

  const owned: boolean[] = [];
  for (const cookie of cookies) {
    const domain = cookie.domain?.toLowerCase();
    if (!domain) return null;
    const hostOnly = domain === self;
    const ownDomain = domain === `.${self}` && !otherBelow;
    owned.push(!sameHostName && (hostOnly || ownDomain));
  }

  const sharedNames = new Set(cookies.filter((_, i) => !owned[i]).map((c) => c.name));
  const names = Array.from(
    new Set(cookies.filter((c, i) => owned[i] && !sharedNames.has(c.name)).map((c) => c.name))
  );
  const cleared = cookies.filter((c) => names.includes(c.name)).length;
  return { names, kept: cookies.length - cleared };
}

/**
 * The URLs a host's cookies are read and cleared through. Android returns
 * (and clears) only cookies whose path covers the URL, so besides the root
 * this names the server's base path, its Console mount and its API mount.
 */
export function cookieUrls(serverUrl: string): string[] {
  const parsed = parseUrl(serverUrl);
  if (!parsed) return [];
  const origin = `${parsed.scheme}://${parsed.host}`;
  const base = parsed.path === "/" ? "" : parsed.path;
  return Array.from(
    new Set([`${origin}/`, `${origin}${base}/`, `${origin}${base}${CONSOLE_BASE_PATH}/`, `${origin}${base}/api/`])
  );
}

export type CookieClearOutcome =
  /** The host's own cookies were cleared; `kept` shared ones were left (summed over the stores). */
  | { kind: "cleared"; cleared: number; kept: number }
  /** No cookie module in this build (web, Expo Go, a binary built before it). */
  | { kind: "unavailable" }
  /** The store cannot tell this host's cookies from shared ones; nothing was cleared. */
  | { kind: "unscoped" }
  | { kind: "failed"; message: string };

/** The calls this module makes, so a test can stand in for the native module. */
export interface CookieStore {
  getAsArray(url: string, options?: IOSCookieStoreOptions): Promise<ReadonlyArray<Cookie>>;
  clearByName(url: string, name: string, options?: IOSCookieStoreOptions): Promise<boolean>;
}

/**
 * The native cookie module, or `null` where there is none. Loaded on first
 * use: its TurboModule is looked up when the package is imported, and that
 * throws in a build without it.
 */
async function nativeCookieStore(): Promise<CookieStore | null> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  try {
    const mod = await import("@preeternal/react-native-cookie-manager");
    return mod.default;
  } catch {
    return null;
  }
}

function errorCode(err: unknown): string | null {
  return typeof err === "object" && err !== null && typeof (err as { code?: unknown }).code === "string"
    ? (err as { code: string }).code
    : null;
}

/**
 * Clear `serverUrl`'s own cookies (see {@link planHostCookieClear}) from the
 * WebView cookie store, leaving every other host's untouched. `otherServerUrls`
 * are the connections that stay saved. Never throws.
 */
export async function clearHostCookies(
  serverUrl: string,
  otherServerUrls: readonly string[],
  store?: CookieStore | null
): Promise<CookieClearOutcome> {
  const manager = store === undefined ? await nativeCookieStore() : store;
  if (!manager) return { kind: "unavailable" };
  const host = hostOf(serverUrl);
  if (!host) return { kind: "failed", message: `not a server URL: ${serverUrl}` };
  const others = otherServerUrls.map(hostOf).filter((h): h is string => h !== null);
  const urls = cookieUrls(serverUrl);
  const stores: Array<IOSCookieStoreOptions | undefined> =
    Platform.OS === "ios" ? [{ iosCookieStore: "webKit" }, { iosCookieStore: "foundation" }] : [undefined];

  let cleared = 0;
  let kept = 0;
  try {
    for (const options of stores) {
      // One entry per distinct cookie, with the URLs it was visible through.
      const seen = new Map<string, { cookie: Cookie; urls: string[] }>();
      for (const url of urls) {
        for (const cookie of await manager.getAsArray(url, options)) {
          const key = JSON.stringify([cookie.name, cookie.domain ?? "", cookie.path ?? ""]);
          const entry = seen.get(key);
          if (entry) entry.urls.push(url);
          else seen.set(key, { cookie, urls: [url] });
        }
      }
      const entries = Array.from(seen.values());
      const plan = planHostCookieClear(
        entries.map((e) => e.cookie),
        host,
        others
      );
      if (!plan) return { kind: "unscoped" };
      for (const name of plan.names) {
        const through = Array.from(
          new Set(entries.filter((e) => e.cookie.name === name).flatMap((e) => e.urls))
        );
        // iOS clears a name on every path at once; Android only what covers the URL.
        for (const url of Platform.OS === "ios" ? through.slice(0, 1) : through) {
          await manager.clearByName(url, name, options);
        }
      }
      cleared += entries.length - plan.kept;
      kept += plan.kept;
    }
  } catch (err) {
    if (errorCode(err) === "not_supported") return { kind: "unscoped" };
    return { kind: "failed", message: err instanceof Error ? err.message : String(err) };
  }
  return { kind: "cleared", cleared, kept };
}
