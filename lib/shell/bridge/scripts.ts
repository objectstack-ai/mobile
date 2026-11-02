/**
 * JavaScript the shell injects into the Console page: the bootstrap that
 * defines `window.ObjectStackNative`, and the snippet that settles a call.
 *
 * The bootstrap is written as plain ES5 so it runs before the Console bundle on
 * every WebView engine the shell supports.
 */
import { consoleUrl, originOf, safeConsoleRoute } from "../console-url";
import {
  BRIDGE_GLOBAL,
  BRIDGE_RESOLVE_GLOBAL,
  NAVIGATE_EVENT,
  PUSH_TOKEN_CHANGED_EVENT,
  type BridgeHostInfo,
  type BridgeResult,
  type PushTokenResult,
} from "./protocol";

/**
 * JSON that is safe to splice into a JS source string: escapes the two line
 * terminators JSON allows but JS string literals historically did not, and
 * `<` so the text can never close a surrounding `<script>`.
 */
export function toScriptLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Bootstrap for `injectedJavaScriptBeforeContentLoaded`.
 *
 * Injected into every main-frame document, which includes a trusted sign-in
 * host's pages. So `installId`, like every datum only the Console should see,
 * is exposed only when the document is on `serverUrl`'s origin; any other page
 * reads `null`.
 */
export function buildBootstrapScript(info: BridgeHostInfo, serverUrl: string): string {
  const { installId, ...shared } = info;
  const serverOrigin = originOf(serverUrl);
  const gatedInstallId =
    serverOrigin !== null && typeof installId === "string" ? installId : null;
  return `(function () {
  if (window.${BRIDGE_GLOBAL}) return;
  var info = ${toScriptLiteral(shared)};
  var onServer = !!window.location && window.location.origin === ${toScriptLiteral(serverOrigin)};
  var installId = onServer ? ${toScriptLiteral(gatedInstallId)} : null;
  var pending = {};
  var seq = 0;
  // Call ids carry a token of this document. An answer the shell sends after
  // the page was replaced (a reload, a re-created WebView, a sign-in redirect)
  // then matches no call of the new document, which numbers its calls afresh.
  var doc = Math.floor(Math.random() * 2176782336).toString(36) + Date.now().toString(36);
  function post(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }
  function call(method, args) {
    return new Promise(function (resolve, reject) {
      seq += 1;
      var id = doc + "." + seq;
      pending[id] = { resolve: resolve, reject: reject };
      post({ type: "call", id: id, method: method, args: args });
    });
  }
  var api = {
    version: info.protocolVersion,
    platform: info.platform,
    appVersion: info.appVersion,
    installId: installId,
    capabilities: info.capabilities.slice(),
    safeArea: info.safeArea,
    has: function (capability) { return info.capabilities.indexOf(capability) !== -1; },
    getPushToken: function () { return call("getPushToken"); },
    haptic: function (kind) { return call("haptic", { kind: kind }); },
    openExternal: function (url) { return call("openExternal", { url: url }); },
    navigate: function (route) { return call("navigate", { route: route }); },
    resetServer: function () { return call("resetServer"); },
    scan: function (opts) { return call("scan", opts); },
    ready: function () { post({ type: "event", name: "ready" }); },
    routeChanged: function (route) { post({ type: "event", name: "routeChanged", payload: { route: route } }); }
  };
  Object.freeze(api.capabilities);
  Object.freeze(api.safeArea);
  Object.freeze(api);
  Object.defineProperty(window, "${BRIDGE_GLOBAL}", { value: api, writable: false, configurable: false });
  Object.defineProperty(window, "${BRIDGE_RESOLVE_GLOBAL}", {
    value: function (result) {
      var p = result && pending[result.id];
      if (!p) return;
      delete pending[result.id];
      if (result.ok) { p.resolve(result.value); return; }
      var err = new Error((result.error && result.error.message) || "Native call failed");
      err.code = result.error && result.error.code;
      p.reject(err);
    },
    writable: false,
    configurable: false
  });
  function applySafeArea() {
    var s = document.documentElement && document.documentElement.style;
    if (!s) return;
    s.setProperty("--os-native-safe-top", info.safeArea.top + "px");
    s.setProperty("--os-native-safe-bottom", info.safeArea.bottom + "px");
    s.setProperty("--os-native-safe-left", info.safeArea.left + "px");
    s.setProperty("--os-native-safe-right", info.safeArea.right + "px");
  }
  applySafeArea();
  document.addEventListener("DOMContentLoaded", applySafeArea);
})();
true;`;
}

/** Snippet that settles one pending call in the page. */
export function buildResolveScript(result: BridgeResult): string {
  return `window.${BRIDGE_RESOLVE_GLOBAL} && window.${BRIDGE_RESOLVE_GLOBAL}(${toScriptLiteral(result)}); true;`;
}

/**
 * Snippet that moves the Console to `route` on `serverUrl`, or `null` when the
 * route fails {@link safeConsoleRoute}.
 *
 * It first dispatches a cancelable `objectstack-native:navigate` event
 * (`detail: { route }`) on `window`, so a Console that listens can navigate
 * with its own router — no reload of the bundle — and signal that with
 * `preventDefault()`. Unhandled (no listener, an older Console, or no
 * `CustomEvent` support), it falls back to loading the `consoleUrl` of the
 * route.
 */
export function buildNavigateScript(serverUrl: string, route: string): string | null {
  const safe = safeConsoleRoute(route);
  if (safe === null) return null;
  return `(function () {
  var route = ${toScriptLiteral(safe)};
  var url = ${toScriptLiteral(consoleUrl(serverUrl, safe))};
  var handled = false;
  try {
    if (typeof window.CustomEvent === "function" && typeof window.dispatchEvent === "function") {
      var event = new window.CustomEvent(${toScriptLiteral(NAVIGATE_EVENT)}, {
        detail: { route: route },
        cancelable: true
      });
      handled = window.dispatchEvent(event) === false || event.defaultPrevented === true;
    }
  } catch (e) {
    handled = false;
  }
  if (!handled) window.location.assign(url);
})();
true;`;
}

/**
 * Snippet that dispatches `objectstack-native:pushTokenChanged`
 * (`detail: { token, vendor }`) on `window`, or `null` when there is no token
 * or no server origin to deliver to.
 *
 * The token goes only to a page on the configured server's origin — the same
 * pages `getPushToken` answers. Whatever else is in the main frame when the OS
 * reports the token (a trusted identity provider's sign-in page) gets nothing.
 */
export function buildPushTokenChangedScript(
  serverUrl: string,
  token: PushTokenResult
): string | null {
  const origin = originOf(serverUrl);
  if (origin === null || typeof token.token !== "string" || token.token.length === 0) {
    return null;
  }
  return `(function () {
  if (!window.location || window.location.origin !== ${toScriptLiteral(origin)}) return;
  if (typeof window.CustomEvent !== "function" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new window.CustomEvent(${toScriptLiteral(PUSH_TOKEN_CHANGED_EVENT)}, {
    detail: ${toScriptLiteral({ token: token.token, vendor: token.vendor })}
  }));
})();
true;`;
}
