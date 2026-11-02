/**
 * Sign-in excursion: an off-server https page may load in the WebView's top
 * frame while the user signs in through an enterprise identity provider
 * (OIDC or SAML) whose host the shell did not know in advance.
 *
 *   idle ──request off-server https, from the sign-in surface──▶ active
 *   active ──back on the server's origin──▶ idle            (returned)
 *   active ──取消──▶ idle                                     (cancelled)
 *   active ──cap, http, an IdP refusing WebViews──▶ idle      (ended, error shown)
 *
 * - **Start.** Only from the server's sign-in surface (`isSignInSurface`: the
 *   Console's `/login` route, or `/api/v1/auth/*`), judged on `location`, the
 *   shell's own record of the top frame. Only two things write that record:
 *   a top-frame navigation request that the policy let load, and the URL that
 *   the native WebView reports with a load start or a load end. A page can move
 *   that URL only within its own origin (the history API is same-origin), so
 *   only a document on the server's origin can put the record on the sign-in
 *   surface. Bridge messages (`routeChanged`) never write it.
 * - **Only `https:`.** Plain http never starts an excursion. An http page
 *   during one ends it.
 * - **Return.** A top-frame request to the server's origin that the policy
 *   lets load ends the excursion, and so does a load end the WebView reports
 *   on the server's origin after an excursion page has been shown. A report
 *   of the server page from before the first excursion page finished loading
 *   is the page left behind and is ignored. Android does not ask before a
 *   form POST (a SAML response) and reports it only when it loads.
 * - **Caps.** {@link EXCURSION_MAX_NAVIGATIONS} off-server navigations, or
 *   {@link EXCURSION_TIMEOUT_MS} after the start, whichever comes first.
 * - **Refusal.** An identity provider that refuses embedded WebViews
 *   ({@link refusesEmbeddedWebView}) is not loaded. The excursion ends with
 *   `unsupported`, before the provider's error page shows.
 *
 * The bridge never answers while an excursion is active, and an excursion
 * origin is never on its trust list. See `bridge/handler.ts`.
 *
 * Pure and synchronous. The component feeds it the WebView's events and acts
 * on what each step returns.
 */
import { originOf, parseUrl } from "./console-url";
import { isSignInSurface, type NavigationDecision } from "./navigation-policy";

/**
 * Most off-server top-frame navigations one excursion may make, the first
 * included. Every navigation the WebView asks about counts: a server redirect,
 * a script's `location` change, and on iOS also a link the user taps or a form
 * they submit on the provider's pages.
 *
 * Browsers stop one request's redirect chain at 20 (the Fetch Standard's limit,
 * Chromium's and WebKit's too). A sign-in is several such chains joined by the
 * user's own steps: password, MFA method, consent, a federation hop. 30 leaves
 * room for ten such steps over one full chain. A redirect loop, which a browser
 * does not catch when it runs through script or meta refresh, is cut within
 * seconds.
 */
export const EXCURSION_MAX_NAVIGATIONS = 30;

/**
 * How long an excursion may last. 10 minutes is the server's own limit: the
 * platform's auth library (better-auth 1.7.12, the version the platform pins)
 * stores the OAuth state with a 10-minute expiry when sign-in starts, so a
 * return after that is refused by the server anyway. The excursion starts a
 * moment after that state was stored, so this cap never cuts a sign-in the
 * server would still accept.
 */
export const EXCURSION_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Hosts whose sign-in refuses every embedded WebView. Google answers an
 * embedded user agent with its "Error 403: disallowed_useragent" page. That
 * sign-in needs the system authentication session, which the app does not
 * have yet.
 */
export const EMBEDDED_WEBVIEW_REFUSERS: readonly string[] = ["accounts.google.com"];

/** The error code a WebView refusal carries (Google's, also seen in redirects that pass it on). */
const REFUSAL_CODE_RE = /disallowed_useragent/i;

/** Why an excursion ended without returning, each with its own message. */
export type ExcursionFailure = "redirects" | "timeout" | "insecure" | "unsupported";

export type ExcursionEnd = "returned" | "cancelled" | ExcursionFailure;

export interface ActiveExcursion {
  /** The exact host (port kept unless it is the default) of the excursion page, as the bar shows it. */
  host: string;
  /** `Date.now()` at the start. */
  startedAt: number;
  /** Off-server top-frame navigations so far, the first included. */
  navigations: number;
  /** An excursion page has finished loading. Until then, a server load end is the page left behind. */
  shown: boolean;
}

export interface ExcursionState {
  /**
   * The last top-frame URL the WebView is on or is headed to. Written only by
   * a navigation request the policy lets load and by the URL a native load
   * event carries. Never written by a page message.
   */
  location: string | null;
  active: ActiveExcursion | null;
}

export const IDLE_EXCURSION: ExcursionState = { location: null, active: null };

export type ExcursionEvent =
  /**
   * A top-frame http(s) navigation request, with what the plain policy
   * decided for it (`decideNavigation`). On iOS a request whose
   * `isTopFrame` is false never gets here. Android does not report it.
   */
  | { type: "request"; url: string; base: NavigationDecision; now: number }
  /**
   * The URL the native WebView reports for the top frame. `loaded` is a load
   * end (the document finished loading). Otherwise it is a load start, or on
   * Android a history change.
   */
  | { type: "location"; url: string; loaded: boolean; now: number }
  /** The excursion timer fired. */
  | { type: "tick"; now: number }
  /** The user tapped 取消 on the bar. */
  | { type: "cancel" };

export interface ExcursionStep {
  state: ExcursionState;
  /** For a `request`, what the WebView does with it. */
  decision?: NavigationDecision;
  /** This step started an excursion. */
  started?: true;
  /** This step ended the active excursion. */
  ended?: ExcursionEnd;
  /** This step refused to start one (an IdP that refuses WebViews). No excursion was active. */
  refused?: ExcursionFailure;
}

const LOAD: NavigationDecision = { kind: "load" };
const BLOCK: NavigationDecision = { kind: "block" };

/** Whether this sign-in URL is one that refuses embedded WebViews. */
export function refusesEmbeddedWebView(url: string): boolean {
  const target = parseUrl(url);
  if (!target) return false;
  return EMBEDDED_WEBVIEW_REFUSERS.includes(target.host) || REFUSAL_CODE_RE.test(url);
}

/** Why an excursion page at `url` ends the excursion, or `null` if it does not. */
function failureAt(
  url: string,
  scheme: string,
  active: ActiveExcursion,
  now: number
): ExcursionFailure | null {
  if (refusesEmbeddedWebView(url)) return "unsupported";
  if (scheme !== "https") return "insecure";
  if (now - active.startedAt >= EXCURSION_TIMEOUT_MS) return "timeout";
  return null;
}

function idleAt(location: string | null): ExcursionState {
  return { location, active: null };
}

export function stepExcursion(
  state: ExcursionState,
  event: ExcursionEvent,
  serverUrl: string
): ExcursionStep {
  const serverOrigin = originOf(serverUrl);

  switch (event.type) {
    case "request": {
      const { url, base, now } = event;
      const target = parseUrl(url);
      if (!target || (target.scheme !== "http" && target.scheme !== "https")) {
        return { state, decision: base };
      }

      if (serverOrigin !== null && originOf(url) === serverOrigin) {
        // A Console route a native screen owns does not move the WebView.
        if (base.kind !== "load") return { state, decision: base };
        if (state.active) return { state: idleAt(url), decision: base, ended: "returned" };
        return { state: idleAt(url), decision: base };
      }

      // A host in EXPO_PUBLIC_TRUSTED_HOSTS loads as before, in an excursion or not.
      if (base.kind === "load") {
        const active = state.active ? { ...state.active, host: target.host } : null;
        return { state: { location: url, active }, decision: base };
      }
      if (base.kind !== "external") return { state, decision: base };

      if (state.active) {
        const failure =
          failureAt(url, target.scheme, state.active, now) ??
          (state.active.navigations >= EXCURSION_MAX_NAVIGATIONS ? "redirects" : null);
        if (failure) return { state: idleAt(state.location), decision: BLOCK, ended: failure };
        return {
          state: {
            location: url,
            active: {
              ...state.active,
              host: target.host,
              navigations: state.active.navigations + 1,
            },
          },
          decision: LOAD,
        };
      }

      // Outside an excursion: only the sign-in surface starts one, only to https.
      if (state.location === null || !isSignInSurface(serverUrl, state.location)) {
        return { state, decision: base };
      }
      if (target.scheme !== "https") return { state, decision: base };
      if (refusesEmbeddedWebView(url)) return { state, decision: BLOCK, refused: "unsupported" };
      return {
        state: {
          location: url,
          active: { host: target.host, startedAt: now, navigations: 1, shown: false },
        },
        decision: LOAD,
        started: true,
      };
    }

    case "location": {
      const { url, loaded, now } = event;
      const target = parseUrl(url);
      if (!target || (target.scheme !== "http" && target.scheme !== "https")) return { state };
      const active = state.active;
      if (!active) return { state: idleAt(url) };

      if (serverOrigin !== null && originOf(url) === serverOrigin) {
        // Before an excursion page has loaded, this is the page left behind.
        if (!loaded || !active.shown) return { state };
        return { state: idleAt(url), ended: "returned" };
      }

      const failure = failureAt(url, target.scheme, active, now);
      if (failure) return { state: idleAt(url), ended: failure };
      return {
        state: {
          location: url,
          active: { ...active, host: target.host, shown: active.shown || loaded },
        },
      };
    }

    case "tick":
      if (state.active && event.now - state.active.startedAt >= EXCURSION_TIMEOUT_MS) {
        return { state: idleAt(state.location), ended: "timeout" };
      }
      return { state };

    case "cancel":
      if (!state.active) return { state };
      return { state: idleAt(state.location), ended: "cancelled" };

    default:
      return { state };
  }
}
