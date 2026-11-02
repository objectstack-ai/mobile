import {
  buildBootstrapScript,
  buildNavigateScript,
  buildPushTokenChangedScript,
  buildResolveScript,
  toScriptLiteral,
} from "~/lib/shell/bridge/scripts";
import {
  BRIDGE_PROTOCOL_VERSION,
  NAVIGATE_EVENT,
  PUSH_TOKEN_CHANGED_EVENT,
  type BridgeHostInfo,
} from "~/lib/shell/bridge/protocol";

const INSTALL_ID = "3b241101-e2bb-4255-8caf-4136c566a962";

const info: BridgeHostInfo = {
  protocolVersion: BRIDGE_PROTOCOL_VERSION,
  platform: "ios",
  appVersion: "2.0.0",
  installId: INSTALL_ID,
  capabilities: ["haptic", "getPushToken"],
  safeArea: { top: 47, bottom: 34, left: 0, right: 0 },
};

const SERVER_URL = "https://acme.example.com/os";

/** Run injected page script against a fake `window` / `document` on `origin`. */
function makePage(origin = "https://acme.example.com") {
  const posted: unknown[] = [];
  const cssVars: Record<string, string> = {};
  const listeners: Record<string, () => void> = {};
  const window: Record<string, any> = {
    location: { origin },
    ReactNativeWebView: { postMessage: (m: string) => posted.push(JSON.parse(m)) },
  };
  const document = {
    documentElement: { style: { setProperty: (k: string, v: string) => (cssVars[k] = v) } },
    addEventListener: (name: string, fn: () => void) => (listeners[name] = fn),
  };
  const run = (script: string) => new Function("window", "document", script)(window, document);
  return { window, posted, cssVars, listeners, run };
}

/** The id of a call the page posted. */
const idOf = (message: unknown) => (message as { id: string }).id;

describe("toScriptLiteral", () => {
  it("escapes characters that could break out of a script", () => {
    expect(toScriptLiteral("</script>\u2028\u2029")).toBe('"\\u003c/script>\\u2028\\u2029"');
  });
});

describe("bootstrap script", () => {
  it("exposes a frozen ObjectStackNative with host info", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info, SERVER_URL));
    const api = page.window.ObjectStackNative;
    expect(api.version).toBe(BRIDGE_PROTOCOL_VERSION);
    expect(api.platform).toBe("ios");
    expect(api.has("haptic")).toBe(true);
    expect(api.has("scan")).toBe(false);
    expect(Object.isFrozen(api)).toBe(true);
    expect(Object.isFrozen(api.capabilities)).toBe(true);
  });

  it("exposes the install id, read-only, to a page on the configured server's origin", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info, SERVER_URL));
    const api = page.window.ObjectStackNative;
    expect(api.installId).toBe(INSTALL_ID);
    expect(Object.getOwnPropertyDescriptor(api, "installId")?.writable).toBe(false);
    expect(Object.isFrozen(api)).toBe(true);
  });

  it("exposes a null install id to a page on another origin (a trusted sign-in host)", () => {
    const page = makePage("https://login.idp.example");
    page.run(buildBootstrapScript(info, SERVER_URL));
    const api = page.window.ObjectStackNative;
    expect(api.installId).toBeNull();
    // The rest of host info is unchanged there; the id is not in reach at all.
    expect(api.platform).toBe("ios");
    expect(JSON.stringify(api)).not.toContain(INSTALL_ID);
  });

  it("compares the page origin with the default port dropped", () => {
    const page = makePage("https://acme.example.com");
    page.run(buildBootstrapScript(info, "https://acme.example.com:443/os"));
    expect(page.window.ObjectStackNative.installId).toBe(INSTALL_ID);
  });

  it("exposes a null install id with no usable server URL", () => {
    const page = makePage("https://acme.example.com");
    page.run(buildBootstrapScript(info, "not a url"));
    expect(page.window.ObjectStackNative.installId).toBeNull();
    expect(buildBootstrapScript(info, "not a url")).not.toContain(INSTALL_ID);
  });

  it("exposes a null install id when the shell has none", () => {
    const page = makePage();
    page.run(buildBootstrapScript({ ...info, installId: null }, SERVER_URL));
    expect(page.window.ObjectStackNative.installId).toBeNull();
  });

  it("publishes the safe area as CSS variables", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info, SERVER_URL));
    expect(page.cssVars["--os-native-safe-top"]).toBe("47px");
    expect(page.cssVars["--os-native-safe-bottom"]).toBe("34px");
    expect(page.listeners.DOMContentLoaded).toBeDefined();
  });

  it("posts calls and settles them through the resolve global", async () => {
    const page = makePage();
    page.run(buildBootstrapScript(info, SERVER_URL));
    const pending = page.window.ObjectStackNative.haptic("success");
    expect(page.posted).toEqual([
      { type: "call", id: expect.any(String), method: "haptic", args: { kind: "success" } },
    ]);
    page.run(buildResolveScript({ id: idOf(page.posted[0]), ok: true, value: null }));
    await expect(pending).resolves.toBeNull();
  });

  it("gives every call of a document its own id, under a token of that document", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info, SERVER_URL));
    void page.window.ObjectStackNative.getPushToken();
    void page.window.ObjectStackNative.getPushToken();
    const [first, second] = page.posted.map(idOf);
    expect(first).toMatch(/^[a-z0-9]+\.1$/);
    expect(second).toBe(first.replace(/1$/, "2"));
    expect(first.length).toBeLessThanOrEqual(64);
  });

  it("settles no call of a later document with an answer meant for an earlier one", async () => {
    // A scan stays open while the page reloads, recovers or goes to a sign-in
    // host; each new document numbers its calls from 1 again.
    const before = makePage();
    before.run(buildBootstrapScript(info, SERVER_URL));
    void before.window.ObjectStackNative.scan();
    const staleAnswer = buildResolveScript({ id: idOf(before.posted[0]), ok: true, value: "CODE" });

    for (const origin of ["https://acme.example.com", "https://login.idp.example"]) {
      const after = makePage(origin);
      after.run(buildBootstrapScript(info, SERVER_URL));
      let settled = false;
      const pending = after.window.ObjectStackNative.getPushToken().then(() => (settled = true));
      after.run(staleAnswer);
      await Promise.resolve();
      expect(settled).toBe(false);
      after.run(buildResolveScript({ id: idOf(after.posted[0]), ok: true, value: null }));
      await pending;
      expect(settled).toBe(true);
    }
  });

  it("posts scan calls with the caller's options, or none", () => {
    const page = makePage();
    page.run(buildBootstrapScript({ ...info, capabilities: ["scan"] }, SERVER_URL));
    const api = page.window.ObjectStackNative;
    expect(api.has("scan")).toBe(true);
    void api.scan();
    void api.scan({ formats: ["ean13", "qr"] });
    expect(page.posted).toEqual([
      { type: "call", id: expect.any(String), method: "scan" },
      { type: "call", id: expect.any(String), method: "scan", args: { formats: ["ean13", "qr"] } },
    ]);
  });

  it("resolves a scan with the decoded text, or null on cancel", async () => {
    const page = makePage();
    page.run(buildBootstrapScript(info, SERVER_URL));
    const read = page.window.ObjectStackNative.scan();
    const cancelled = page.window.ObjectStackNative.scan();
    const [readId, cancelId] = page.posted.map(idOf);
    page.run(buildResolveScript({ id: readId, ok: true, value: "4006381333931" }));
    page.run(buildResolveScript({ id: cancelId, ok: true, value: null }));
    await expect(read).resolves.toBe("4006381333931");
    await expect(cancelled).resolves.toBeNull();
  });

  it("rejects failed calls with the error code", async () => {
    const page = makePage();
    page.run(buildBootstrapScript(info, SERVER_URL));
    const pending = page.window.ObjectStackNative.navigate("bad");
    page.run(
      buildResolveScript({
        id: idOf(page.posted[0]),
        ok: false,
        error: { code: "bad_args", message: "nope" },
      })
    );
    await expect(pending).rejects.toMatchObject({ message: "nope", code: "bad_args" });
  });

  it("ignores results for unknown calls", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info, SERVER_URL));
    expect(() => page.run(buildResolveScript({ id: "c99", ok: true, value: 1 }))).not.toThrow();
  });

  it("posts events", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info, SERVER_URL));
    page.window.ObjectStackNative.ready();
    page.window.ObjectStackNative.routeChanged("/apps/crm");
    expect(page.posted).toEqual([
      { type: "event", name: "ready" },
      { type: "event", name: "routeChanged", payload: { route: "/apps/crm" } },
    ]);
  });

  it("is idempotent across re-injection", () => {
    const page = makePage();
    page.run(buildBootstrapScript(info, SERVER_URL));
    const first = page.window.ObjectStackNative;
    page.run(buildBootstrapScript({ ...info, appVersion: "9.9.9" }, SERVER_URL));
    expect(page.window.ObjectStackNative).toBe(first);
  });
});

describe("navigate script", () => {
  const SERVER = "https://acme.example.com";

  /** A fake page window with real DOM events and a spied `location.assign`. */
  function makeNavPage() {
    const target = new EventTarget();
    const assign = jest.fn();
    const window = {
      CustomEvent,
      dispatchEvent: target.dispatchEvent.bind(target),
      addEventListener: target.addEventListener.bind(target),
      location: { assign },
    };
    const run = (script: string | null) => {
      if (script === null) throw new Error("no script");
      return new Function("window", script)(window);
    };
    return { window, assign, run };
  }

  it("lets a Console that handles the event navigate with its router", () => {
    const page = makeNavPage();
    const seen: unknown[] = [];
    page.window.addEventListener(NAVIGATE_EVENT, (event: Event) => {
      seen.push((event as CustomEvent).detail);
      event.preventDefault();
    });
    page.run(buildNavigateScript(SERVER, "/apps/crm/lead/1?tab=2"));
    expect(seen).toEqual([{ route: "/apps/crm/lead/1?tab=2" }]);
    expect(page.assign).not.toHaveBeenCalled();
  });

  it("falls back to loading the Console URL when nobody handles the event", () => {
    const page = makeNavPage();
    const seen: unknown[] = [];
    page.window.addEventListener(NAVIGATE_EVENT, (event: Event) => {
      seen.push((event as CustomEvent).detail);
    });
    page.run(buildNavigateScript(`${SERVER}/os`, "/apps/hr"));
    expect(seen).toEqual([{ route: "/apps/hr" }]);
    expect(page.assign).toHaveBeenCalledWith(`${SERVER}/os/_console/apps/hr`);
  });

  it("falls back to loading the Console URL without CustomEvent support", () => {
    const assign = jest.fn();
    new Function("window", buildNavigateScript(SERVER, "/home")!)({ location: { assign } });
    expect(assign).toHaveBeenCalledWith(`${SERVER}/_console/home`);
  });

  it("refuses a route that would escape the Console", () => {
    expect(buildNavigateScript(SERVER, "/../../api/v1/me")).toBeNull();
    expect(buildNavigateScript(SERVER, "/%2e%2e/api/v1/me")).toBeNull();
    expect(buildNavigateScript(SERVER, "//evil.example/x")).toBeNull();
  });

  it("splices the route as escaped JSON", () => {
    const route = '/apps/x?q=");alert(1);("</script>\u2028end';
    const script = buildNavigateScript(SERVER, route)!;
    expect(script).not.toContain("</script>");
    expect(script).not.toContain("\u2028");
    const page = makeNavPage();
    const seen: unknown[] = [];
    page.window.addEventListener(NAVIGATE_EVENT, (event: Event) => {
      seen.push((event as CustomEvent).detail);
    });
    page.run(script);
    expect(seen).toEqual([{ route }]);
    expect(page.assign).toHaveBeenCalledWith(`${SERVER}/_console${route}`);
  });
});

describe("pushTokenChanged script", () => {
  const SERVER = "https://acme.example.com";

  /** A fake page window on `origin` with real DOM events. */
  function makeEventPage(origin: string) {
    const target = new EventTarget();
    const window = {
      CustomEvent,
      dispatchEvent: target.dispatchEvent.bind(target),
      addEventListener: target.addEventListener.bind(target),
      location: { origin },
    };
    const seen: Array<{ detail: unknown; cancelable: boolean }> = [];
    window.addEventListener(PUSH_TOKEN_CHANGED_EVENT, (event: Event) => {
      seen.push({ detail: (event as CustomEvent).detail, cancelable: event.cancelable });
    });
    const run = (script: string | null) => {
      if (script === null) throw new Error("no script");
      return new Function("window", script)(window);
    };
    return { seen, run };
  }

  it("dispatches { token, vendor } on a page of the configured server", () => {
    const page = makeEventPage(SERVER);
    page.run(buildPushTokenChangedScript(`${SERVER}/os`, { token: "fcm-2", vendor: "fcm" }));
    expect(PUSH_TOKEN_CHANGED_EVENT).toBe("objectstack-native:pushTokenChanged");
    expect(page.seen).toEqual([{ detail: { token: "fcm-2", vendor: "fcm" }, cancelable: false }]);
  });

  it("delivers nothing to a page on another origin (a trusted sign-in host)", () => {
    const page = makeEventPage("https://login.idp.example");
    page.run(buildPushTokenChangedScript(SERVER, { token: "fcm-2", vendor: "fcm" }));
    expect(page.seen).toEqual([]);
  });

  it("compares origins with the default port dropped", () => {
    const page = makeEventPage(SERVER);
    page.run(buildPushTokenChangedScript(`${SERVER}:443`, { token: "t", vendor: "apns" }));
    expect(page.seen).toHaveLength(1);
  });

  it("does nothing without CustomEvent support", () => {
    expect(() =>
      new Function("window", buildPushTokenChangedScript(SERVER, { token: "t", vendor: "apns" })!)({
        location: { origin: SERVER },
      })
    ).not.toThrow();
  });

  it("builds no script for an empty token or an unusable server URL", () => {
    expect(buildPushTokenChangedScript(SERVER, { token: "", vendor: "fcm" })).toBeNull();
    expect(buildPushTokenChangedScript("not a url", { token: "t", vendor: "fcm" })).toBeNull();
  });

  it("splices the token as escaped JSON", () => {
    const token = '");alert(1);("</script>\u2028';
    const script = buildPushTokenChangedScript(SERVER, { token, vendor: "apns" })!;
    expect(script).not.toContain("</script>");
    const page = makeEventPage(SERVER);
    page.run(script);
    expect(page.seen).toEqual([{ detail: { token, vendor: "apns" }, cancelable: false }]);
  });
});
