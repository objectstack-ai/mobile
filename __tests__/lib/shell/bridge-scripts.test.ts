import {
  buildBootstrapScript,
  buildNavigateScript,
  buildResolveScript,
  toScriptLiteral,
} from "~/lib/shell/bridge/scripts";
import { BRIDGE_PROTOCOL_VERSION, type BridgeHostInfo } from "~/lib/shell/bridge/protocol";

const info: BridgeHostInfo = {
  protocolVersion: BRIDGE_PROTOCOL_VERSION,
  platform: "ios",
  appVersion: "2.0.0",
  capabilities: ["haptic", "getPushToken"],
  safeArea: { top: 47, bottom: 34, left: 0, right: 0 },
};

/** Run injected page script against a fake `window` / `document`. */
function makePage() {
  const posted: unknown[] = [];
  const cssVars: Record<string, string> = {};
  const listeners: Record<string, () => void> = {};
  const window: Record<string, any> = {
    ReactNativeWebView: { postMessage: (m: string) => posted.push(JSON.parse(m)) },
  };
  const document = {
    documentElement: { style: { setProperty: (k: string, v: string) => (cssVars[k] = v) } },
    addEventListener: (name: string, fn: () => void) => (listeners[name] = fn),
  };
  const run = (script: string) => new Function("window", "document", script)(window, document);
  return { window, posted, cssVars, listeners, run };
}

describe("toScriptLiteral", () => {
  it("escapes characters that could break out of a script", () => {
    expect(toScriptLiteral("</script>\u2028\u2029")).toBe('"\\u003c/script>\\u2028\\u2029"');
  });
});

describe("bootstrap script", () => {
  it("exposes a frozen ObjectStackNative with host info", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info));
    const api = page.window.ObjectStackNative;
    expect(api.version).toBe(BRIDGE_PROTOCOL_VERSION);
    expect(api.platform).toBe("ios");
    expect(api.has("haptic")).toBe(true);
    expect(api.has("scan")).toBe(false);
    expect(Object.isFrozen(api)).toBe(true);
    expect(Object.isFrozen(api.capabilities)).toBe(true);
  });

  it("publishes the safe area as CSS variables", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info));
    expect(page.cssVars["--os-native-safe-top"]).toBe("47px");
    expect(page.cssVars["--os-native-safe-bottom"]).toBe("34px");
    expect(page.listeners.DOMContentLoaded).toBeDefined();
  });

  it("posts calls and settles them through the resolve global", async () => {
    const page = makePage();
    page.run(buildBootstrapScript(info));
    const pending = page.window.ObjectStackNative.haptic("success");
    expect(page.posted).toEqual([
      { type: "call", id: "c1", method: "haptic", args: { kind: "success" } },
    ]);
    page.run(buildResolveScript({ id: "c1", ok: true, value: null }));
    await expect(pending).resolves.toBeNull();
  });

  it("rejects failed calls with the error code", async () => {
    const page = makePage();
    page.run(buildBootstrapScript(info));
    const pending = page.window.ObjectStackNative.navigate("bad");
    page.run(
      buildResolveScript({ id: "c1", ok: false, error: { code: "bad_args", message: "nope" } })
    );
    await expect(pending).rejects.toMatchObject({ message: "nope", code: "bad_args" });
  });

  it("ignores results for unknown calls", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info));
    expect(() => page.run(buildResolveScript({ id: "c99", ok: true, value: 1 }))).not.toThrow();
  });

  it("posts events", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info));
    page.window.ObjectStackNative.ready();
    page.window.ObjectStackNative.routeChanged("/apps/crm");
    expect(page.posted).toEqual([
      { type: "event", name: "ready" },
      { type: "event", name: "routeChanged", payload: { route: "/apps/crm" } },
    ]);
  });

  it("is idempotent across re-injection", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info));
    const first = page.window.ObjectStackNative;
    page.run(buildBootstrapScript({ ...info, appVersion: "9.9.9" }));
    expect(page.window.ObjectStackNative).toBe(first);
  });
});

describe("navigate script", () => {
  it("assigns the location", () => {
    const assign = jest.fn();
    new Function("window", buildNavigateScript("https://acme.example.com/_console/home"))({
      location: { assign },
    });
    expect(assign).toHaveBeenCalledWith("https://acme.example.com/_console/home");
  });
});
