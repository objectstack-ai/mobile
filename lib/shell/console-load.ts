/**
 * Load states of the hosted Console — the one place that decides when the
 * loading cover lifts, when a held route is dispatched into the page, and
 * which route a re-created WebView resumes at.
 *
 *   loading ──loadEnd──▶ loaded ──ready / readyTimeout──▶ ready
 *      │                   │
 *      └──────ready────────┼──────────────────────────────▶ ready
 *      └───────fail────────┴──────────▶ failed ──recreate──▶ loading
 *
 * - `loading`: the document is loading. The cover is up; routes are held.
 * - `loaded`: the document has loaded (`onLoadEnd`) but the Console has not
 *   said `ready`. The Console boots after its document loads (boot round-trips,
 *   then the first render), and its `objectstack-native:navigate` listener
 *   mounts with that first render — a route dispatched now goes unhandled and
 *   the shell's fallback reloads the page. So the cover stays up and routes
 *   stay held until `ready`, or until {@link READY_TIMEOUT_MS} passes (a
 *   Console that never posts `ready`: an older one, or a boot that failed).
 * - `ready`: the cover is down; a held route is dispatched once, and later
 *   routes go straight to the page.
 * - `failed`: the failure page is up; routes are held for the next WebView.
 *
 * A push token the OS reports (`objectstack-native:pushTokenChanged`) follows
 * the same rule as a route: the Console installs that listener in the commit
 * that posts `ready`, so a token reported outside `ready` is held — the latest
 * one only — and delivered on entering `ready`, by the event or the timeout.
 * Unlike a held route it survives a re-created WebView, whose start URL cannot
 * carry it.
 *
 * Pure and synchronous: `stepConsoleLoad` returns the next state plus the side
 * effects the component performs (inject a route or a token, arm or clear the
 * ready timer, re-create the WebView).
 */
import { safeConsoleRoute } from "./console-url";
import type { PushTokenResult } from "./bridge/protocol";

/**
 * How long after the document has loaded the shell waits for the Console's
 * `ready` before it lifts the cover and dispatches a held route anyway.
 *
 * The Console's boot after load is three concurrent round-trips (one capped at
 * about 500 ms) and a locale chunk, then the first render; 8 s covers that on
 * a slow cellular link with room to spare, and bounds how long an older
 * Console (no `ready`) or a broken boot sits behind the cover.
 */
export const READY_TIMEOUT_MS = 8000;

export type ConsoleLoadPhase = "loading" | "loaded" | "ready" | "failed";

export interface ConsoleLoadState {
  phase: ConsoleLoadPhase;
  /** A route asked for before the page could take it; applied once, at `ready`. */
  pendingRoute: string | null;
  /** The latest push token reported before the page could take it; sent once, at `ready`. */
  heldPushToken: PushTokenResult | null;
  /** The last Console route the page was on — where a re-created WebView resumes. */
  lastRoute: string | null;
  /**
   * The Console has reported its route with `routeChanged`. From then on that
   * is the only source of `lastRoute`; WebView navigation state is the
   * fallback for Consoles that never post it (it misses SPA `pushState` on
   * some engines).
   */
  routeReported: boolean;
}

export type ConsoleLoadEvent =
  /** `onLoadEnd` of a load that was not superseded. */
  | { type: "loadEnd" }
  /** The Console's `ready` bridge event. */
  | { type: "ready" }
  /** {@link READY_TIMEOUT_MS} passed in `loaded` without `ready`. */
  | { type: "readyTimeout" }
  /** The document failed (network error, 5xx). */
  | { type: "fail" }
  /** The same WebView reloads its page. */
  | { type: "reload" }
  /** A new WebView replaces the old one (retry after a failure, dead process). */
  | { type: "recreate" }
  /** A web-owned, already validated Console route was asked for. */
  | { type: "navigate"; route: string }
  /** The OS reported a (rotated) push token, already validated. */
  | { type: "pushToken"; token: PushTokenResult }
  /** The Console's `routeChanged` bridge event, payload already parsed. */
  | { type: "routeChanged"; route: string }
  /** `onNavigationStateChange`, reduced to the Console route it points at. */
  | { type: "navigationState"; route: string | null };

export type ConsoleLoadEffect =
  /** Move the loaded page to `route` (navigate event, else a page load). */
  | { type: "goTo"; route: string }
  /** Dispatch `objectstack-native:pushTokenChanged` in the page. */
  | { type: "sendPushToken"; token: PushTokenResult }
  | { type: "armReadyTimer" }
  | { type: "clearReadyTimer" }
  /** Mount a new WebView, at `startRoute` when one is given. */
  | { type: "recreate"; startRoute: string | null };

export interface ConsoleLoadStep {
  state: ConsoleLoadState;
  effects: ConsoleLoadEffect[];
}

export const INITIAL_CONSOLE_LOAD_STATE: ConsoleLoadState = {
  phase: "loading",
  pendingRoute: null,
  heldPushToken: null,
  lastRoute: null,
  routeReported: false,
};

/** Enter `ready`: dispatch the held route and send the held push token, if any. */
function becomeReady(state: ConsoleLoadState, effects: ConsoleLoadEffect[]): ConsoleLoadStep {
  if (state.pendingRoute !== null) effects.push({ type: "goTo", route: state.pendingRoute });
  if (state.heldPushToken !== null) {
    effects.push({ type: "sendPushToken", token: state.heldPushToken });
  }
  return { state: { ...state, phase: "ready", pendingRoute: null, heldPushToken: null }, effects };
}

export function stepConsoleLoad(state: ConsoleLoadState, event: ConsoleLoadEvent): ConsoleLoadStep {
  const same: ConsoleLoadStep = { state, effects: [] };
  switch (event.type) {
    case "loadEnd":
      // `ready` can beat the document's load event (load waits for every
      // subresource); a failed load also ends with onLoadEnd.
      if (state.phase !== "loading") return same;
      return { state: { ...state, phase: "loaded" }, effects: [{ type: "armReadyTimer" }] };

    case "ready":
      // The Console posts `ready` from the render that mounts its navigate
      // listener, so the page can take a route from here on — even before
      // the document's load event. A failed page shows the failure page.
      if (state.phase === "loading") return becomeReady(state, []);
      if (state.phase === "loaded") return becomeReady(state, [{ type: "clearReadyTimer" }]);
      return same;

    case "readyTimeout":
      if (state.phase !== "loaded") return same;
      return becomeReady(state, []);

    case "fail":
      if (state.phase === "failed") return same;
      return {
        state: { ...state, phase: "failed" },
        effects: state.phase === "loaded" ? [{ type: "clearReadyTimer" }] : [],
      };

    case "reload":
      return {
        state: { ...state, phase: "loading" },
        effects: state.phase === "loaded" ? [{ type: "clearReadyTimer" }] : [],
      };

    case "recreate": {
      // The new WebView starts at the held route, else where the page was;
      // the held route is then its start route, not something to inject.
      const startRoute = state.pendingRoute ?? state.lastRoute;
      const effects: ConsoleLoadEffect[] =
        state.phase === "loaded" ? [{ type: "clearReadyTimer" }] : [];
      effects.push({ type: "recreate", startRoute });
      return { state: { ...state, phase: "loading", pendingRoute: null }, effects };
    }

    case "navigate":
      if (state.phase === "ready") {
        return { state, effects: [{ type: "goTo", route: event.route }] };
      }
      return { state: { ...state, pendingRoute: event.route }, effects: [] };

    case "pushToken":
      if (state.phase === "ready") {
        return { state, effects: [{ type: "sendPushToken", token: event.token }] };
      }
      return { state: { ...state, heldPushToken: event.token }, effects: [] };

    case "routeChanged":
      return { state: { ...state, lastRoute: event.route, routeReported: true }, effects: [] };

    case "navigationState":
      if (state.routeReported || event.route === null) return same;
      return { state: { ...state, lastRoute: event.route }, effects: [] };

    default:
      return same;
  }
}

/**
 * The route a `routeChanged` event reports (`payload: { route }`), or `null`
 * when the payload is not a well-formed, safe Console route.
 */
export function routeChangedRoute(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  return safeConsoleRoute((payload as Record<string, unknown>).route);
}
