/**
 * JavaScript the shell injects into the Console page: the bootstrap that
 * defines `window.ObjectStackNative`, and the snippet that settles a call.
 *
 * The bootstrap is written as plain ES5 so it runs before the Console bundle on
 * every WebView engine the shell supports.
 */
import {
  BRIDGE_GLOBAL,
  BRIDGE_RESOLVE_GLOBAL,
  type BridgeHostInfo,
  type BridgeResult,
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

/** Bootstrap for `injectedJavaScriptBeforeContentLoaded`. */
export function buildBootstrapScript(info: BridgeHostInfo): string {
  return `(function () {
  if (window.${BRIDGE_GLOBAL}) return;
  var info = ${toScriptLiteral(info)};
  var pending = {};
  var seq = 0;
  function post(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }
  function call(method, args) {
    return new Promise(function (resolve, reject) {
      seq += 1;
      var id = "c" + seq;
      pending[id] = { resolve: resolve, reject: reject };
      post({ type: "call", id: id, method: method, args: args });
    });
  }
  var api = {
    version: info.protocolVersion,
    platform: info.platform,
    appVersion: info.appVersion,
    capabilities: info.capabilities.slice(),
    safeArea: info.safeArea,
    has: function (capability) { return info.capabilities.indexOf(capability) !== -1; },
    getPushToken: function () { return call("getPushToken"); },
    haptic: function (kind) { return call("haptic", { kind: kind }); },
    openExternal: function (url) { return call("openExternal", { url: url }); },
    navigate: function (route) { return call("navigate", { route: route }); },
    resetServer: function () { return call("resetServer"); },
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

/** Snippet that moves the Console to another route on the same server. */
export function buildNavigateScript(url: string): string {
  return `window.location.assign(${toScriptLiteral(url)}); true;`;
}
