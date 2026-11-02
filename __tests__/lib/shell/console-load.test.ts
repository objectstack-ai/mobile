import {
  INITIAL_CONSOLE_LOAD_STATE,
  routeChangedRoute,
  stepConsoleLoad,
  type ConsoleLoadEffect,
  type ConsoleLoadEvent,
  type ConsoleLoadState,
} from "~/lib/shell/console-load";

/** Run events from the initial state; collect every effect in order. */
function run(...events: ConsoleLoadEvent[]): { state: ConsoleLoadState; effects: ConsoleLoadEffect[] } {
  let state = INITIAL_CONSOLE_LOAD_STATE;
  const effects: ConsoleLoadEffect[] = [];
  for (const event of events) {
    const step = stepConsoleLoad(state, event);
    state = step.state;
    effects.push(...step.effects);
  }
  return { state, effects };
}

const goTo = (route: string): ConsoleLoadEffect => ({ type: "goTo", route });

describe("console load state machine", () => {
  it("starts loading, with nothing held", () => {
    expect(INITIAL_CONSOLE_LOAD_STATE).toEqual({
      phase: "loading",
      pendingRoute: null,
      heldPushToken: null,
      lastRoute: null,
      routeReported: false,
    });
  });

  it("waits for ready after load end, then dispatches the held route once", () => {
    const afterLoad = run({ type: "navigate", route: "/apps/hr" }, { type: "loadEnd" });
    expect(afterLoad.state.phase).toBe("loaded");
    expect(afterLoad.state.pendingRoute).toBe("/apps/hr");
    expect(afterLoad.effects).toEqual([{ type: "armReadyTimer" }]);

    const ready = stepConsoleLoad(afterLoad.state, { type: "ready" });
    expect(ready.state.phase).toBe("ready");
    expect(ready.state.pendingRoute).toBeNull();
    expect(ready.effects).toEqual([{ type: "clearReadyTimer" }, goTo("/apps/hr")]);

    // A second ready, a late timeout and a later load end change nothing.
    for (const event of [{ type: "ready" }, { type: "readyTimeout" }, { type: "loadEnd" }] as const) {
      const again = stepConsoleLoad(ready.state, event);
      expect(again.state).toBe(ready.state);
      expect(again.effects).toEqual([]);
    }
  });

  it("takes ready before load end, and does not wait for the load event", () => {
    const { state, effects } = run(
      { type: "navigate", route: "/apps/hr" },
      { type: "ready" },
      { type: "loadEnd" }
    );
    expect(state.phase).toBe("ready");
    // No ready timer is ever armed, and the route goes out exactly once.
    expect(effects).toEqual([goTo("/apps/hr")]);
  });

  it("falls back to the timeout when ready never comes", () => {
    const { state, effects } = run(
      { type: "navigate", route: "/apps/hr" },
      { type: "loadEnd" },
      { type: "readyTimeout" }
    );
    expect(state.phase).toBe("ready");
    expect(effects).toEqual([{ type: "armReadyTimer" }, goTo("/apps/hr")]);
  });

  it("ignores a timeout that fires outside the loaded phase", () => {
    expect(run({ type: "readyTimeout" }).state.phase).toBe("loading");
    expect(run({ type: "fail" }, { type: "readyTimeout" }).state.phase).toBe("failed");
  });

  it("holds only the newest route", () => {
    const { effects } = run(
      { type: "navigate", route: "/apps/hr" },
      { type: "navigate", route: "/apps/finance" },
      { type: "ready" }
    );
    expect(effects).toEqual([goTo("/apps/finance")]);
  });

  it("sends a route straight to a ready page", () => {
    const { state, effects } = run({ type: "ready" }, { type: "navigate", route: "/apps/hr" });
    expect(effects).toEqual([goTo("/apps/hr")]);
    expect(state.pendingRoute).toBeNull();
  });

  it("keeps the held route through a failed load and hands it to the new WebView", () => {
    // react-native-webview order: onError, then onLoadEnd.
    const failed = run({ type: "navigate", route: "/apps/hr" }, { type: "fail" }, { type: "loadEnd" });
    expect(failed.state.phase).toBe("failed");
    expect(failed.state.pendingRoute).toBe("/apps/hr");
    expect(failed.effects).toEqual([]);

    // A failed page lifts nothing and receives nothing.
    const stray = stepConsoleLoad(failed.state, { type: "ready" });
    expect(stray.state.phase).toBe("failed");
    expect(stray.effects).toEqual([]);

    const recreated = stepConsoleLoad(failed.state, { type: "recreate" });
    expect(recreated.state.phase).toBe("loading");
    expect(recreated.state.pendingRoute).toBeNull();
    expect(recreated.effects).toEqual([{ type: "recreate", startRoute: "/apps/hr" }]);
  });

  it("clears the ready timer when a loaded page fails, reloads or is re-created", () => {
    const loaded = run({ type: "loadEnd" }).state;
    expect(stepConsoleLoad(loaded, { type: "fail" }).effects).toEqual([{ type: "clearReadyTimer" }]);
    const reloaded = stepConsoleLoad(loaded, { type: "reload" });
    expect(reloaded.state.phase).toBe("loading");
    expect(reloaded.effects).toEqual([{ type: "clearReadyTimer" }]);
    expect(stepConsoleLoad(loaded, { type: "recreate" }).effects).toEqual([
      { type: "clearReadyTimer" },
      { type: "recreate", startRoute: null },
    ]);
  });

  it("holds routes again after a reload of a ready page", () => {
    const { state, effects } = run(
      { type: "ready" },
      { type: "reload" },
      { type: "navigate", route: "/apps/hr" }
    );
    expect(state.phase).toBe("loading");
    expect(state.pendingRoute).toBe("/apps/hr");
    expect(effects).toEqual([]);
  });

  describe("push token", () => {
    const apns = (token: string) => ({ token, vendor: "apns" as const });
    const send = (token: string): ConsoleLoadEffect => ({ type: "sendPushToken", token: apns(token) });

    it("holds the latest token until ready, then sends it once, after the held route", () => {
      const { state, effects } = run(
        { type: "pushToken", token: apns("a") },
        { type: "navigate", route: "/apps/hr" },
        { type: "loadEnd" },
        { type: "pushToken", token: apns("b") },
        { type: "ready" },
        { type: "ready" }
      );
      expect(state.heldPushToken).toBeNull();
      expect(effects).toEqual([
        { type: "armReadyTimer" },
        { type: "clearReadyTimer" },
        goTo("/apps/hr"),
        send("b"),
      ]);
    });

    it("sends the held token on the ready timeout", () => {
      const { effects } = run(
        { type: "pushToken", token: apns("a") },
        { type: "loadEnd" },
        { type: "readyTimeout" }
      );
      expect(effects).toEqual([{ type: "armReadyTimer" }, send("a")]);
    });

    it("sends straight to a ready page, and holds again after a reload", () => {
      const ready = run({ type: "ready" }, { type: "pushToken", token: apns("a") });
      expect(ready.effects).toEqual([send("a")]);
      const reloaded = stepConsoleLoad(
        stepConsoleLoad(ready.state, { type: "reload" }).state,
        { type: "pushToken", token: apns("b") }
      );
      expect(reloaded.effects).toEqual([]);
      expect(reloaded.state.heldPushToken).toEqual(apns("b"));
    });

    it("keeps the held token through a failure and a re-created WebView", () => {
      const { state, effects } = run(
        { type: "fail" },
        { type: "pushToken", token: apns("a") },
        { type: "recreate" },
        { type: "loadEnd" },
        { type: "ready" }
      );
      expect(state.heldPushToken).toBeNull();
      expect(effects).toEqual([
        { type: "recreate", startRoute: null },
        { type: "armReadyTimer" },
        { type: "clearReadyTimer" },
        send("a"),
      ]);
    });
  });

  describe("last route", () => {
    it("follows navigation state while the Console reports no route", () => {
      const { state } = run(
        { type: "navigationState", route: "/apps/crm" },
        { type: "navigationState", route: null }
      );
      expect(state.lastRoute).toBe("/apps/crm");
    });

    it("follows routeChanged once the Console reports one, ignoring navigation state", () => {
      const { state } = run(
        { type: "navigationState", route: "/apps/crm" },
        { type: "routeChanged", route: "/apps/crm/lead/9?tab=notes" },
        { type: "navigationState", route: "/apps/crm" }
      );
      expect(state.routeReported).toBe(true);
      expect(state.lastRoute).toBe("/apps/crm/lead/9?tab=notes");
    });

    it("is where a re-created WebView starts when no route is held", () => {
      const { effects } = run(
        { type: "ready" },
        { type: "routeChanged", route: "/apps/crm/lead/9" },
        { type: "recreate" }
      );
      expect(effects).toEqual([{ type: "recreate", startRoute: "/apps/crm/lead/9" }]);
    });
  });

  describe("switching connections", () => {
    const token = { token: "apns-1", vendor: "apns" } as const;

    it("re-creates the WebView at the new connection's last route, from any phase", () => {
      for (const prefix of [
        [],
        [{ type: "loadEnd" }],
        [{ type: "ready" }],
        [{ type: "fail" }],
      ] as ConsoleLoadEvent[][]) {
        const { state, effects } = run(...prefix, { type: "switch", route: "/apps/hr" });
        expect(state.phase).toBe("loading");
        expect(effects.at(-1)).toEqual({ type: "recreate", startRoute: "/apps/hr" });
      }
    });

    it("clears the ready timer when the page it leaves had loaded", () => {
      const { effects } = run({ type: "loadEnd" }, { type: "switch", route: null });
      expect(effects).toEqual([
        { type: "armReadyTimer" },
        { type: "clearReadyTimer" },
        { type: "recreate", startRoute: null },
      ]);
    });

    it("drops the held route and the last route of the host it leaves", () => {
      const { state, effects } = run(
        { type: "routeChanged", route: "/apps/crm" },
        { type: "navigate", route: "/apps/crm/lead/1" },
        { type: "switch", route: null }
      );
      expect(effects).toEqual([{ type: "recreate", startRoute: null }]);
      expect(state).toEqual({ ...INITIAL_CONSOLE_LOAD_STATE, lastRoute: null });

      // A later recovery starts at the new host's route, never the old one's.
      const recovered = run(
        { type: "routeChanged", route: "/apps/crm" },
        { type: "switch", route: "/apps/hr" },
        { type: "fail" },
        { type: "recreate" }
      );
      expect(recovered.effects.at(-1)).toEqual({ type: "recreate", startRoute: "/apps/hr" });
    });

    it("lets navigation state report the new host's route again", () => {
      const { state } = run(
        { type: "routeChanged", route: "/apps/crm" },
        { type: "switch", route: null },
        { type: "navigationState", route: "/home" }
      );
      expect(state.lastRoute).toBe("/home");
    });

    it("keeps the held push token, sending it to the new Console at ready", () => {
      const { effects } = run(
        { type: "pushToken", token },
        { type: "switch", route: "/apps/hr" },
        { type: "ready" }
      );
      expect(effects).toEqual([
        { type: "recreate", startRoute: "/apps/hr" },
        { type: "sendPushToken", token },
      ]);
    });
  });

  describe("routeChangedRoute", () => {
    it("reads a safe route from the payload", () => {
      expect(routeChangedRoute({ route: "/apps/crm?x=1#y" })).toBe("/apps/crm?x=1#y");
    });

    it.each([
      ["no payload", undefined],
      ["a bare string", "/apps/crm"],
      ["a missing route", {}],
      ["a non-string route", { route: 7 }],
      ["a protocol-relative route", { route: "//evil.example.com" }],
      ["an escaping route", { route: "/../../api/v1/me" }],
    ])("refuses %s", (_label, payload) => {
      expect(routeChangedRoute(payload)).toBeNull();
    });
  });
});
