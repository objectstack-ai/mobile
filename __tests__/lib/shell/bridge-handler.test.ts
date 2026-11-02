import { createBridgeHandler, type BridgeDeps } from "~/lib/shell/bridge/handler";
import { SCAN_FORMATS } from "~/lib/shell/bridge/protocol";
import {
  SCAN_BUSY_MESSAGE,
  SCAN_DENIED_MESSAGE,
  currentScan,
  requestScan,
  settleScan,
  type ScanOutcome,
} from "~/lib/shell/bridge/scan-session";

const SERVER = "https://acme.example.com";
const PAGE = `${SERVER}/_console/home`;

function setup(overrides: Partial<BridgeDeps> = {}) {
  const deps: BridgeDeps = {
    serverUrl: SERVER,
    getPushToken: jest.fn().mockResolvedValue({ token: "t", vendor: "apns" }),
    haptic: jest.fn(),
    openExternal: jest.fn().mockResolvedValue(undefined),
    navigate: jest.fn(),
    resetServer: jest.fn().mockResolvedValue(undefined),
    scan: jest.fn().mockResolvedValue("4006381333931"),
    showConnectionSwitcher: jest.fn(),
    onEvent: jest.fn(),
    ...overrides,
  };
  return { deps, handle: createBridgeHandler(deps) };
}

const call = (method: string, args?: unknown, id = "c1") =>
  JSON.stringify({ type: "call", id, method, args });

describe("bridge handler", () => {
  it("ignores malformed messages", async () => {
    const { handle } = setup();
    await expect(handle("garbage", PAGE)).resolves.toBeNull();
  });

  it("answers nothing to calls from another origin", async () => {
    // A reply would run in the main frame, where its id could settle one of
    // the Console's own pending calls.
    const { handle, deps } = setup();
    await expect(handle(call("getPushToken"), "https://evil.example.com/")).resolves.toBeNull();
    await expect(handle(call("resetServer"), "https://evil.example.com/")).resolves.toBeNull();
    expect(deps.getPushToken).not.toHaveBeenCalled();
    expect(deps.resetServer).not.toHaveBeenCalled();
  });

  it("trusts the server's page when the server was stored with its default port", async () => {
    const { handle } = setup({ serverUrl: "https://acme.example.com:443" });
    await expect(handle(call("getPushToken"), PAGE)).resolves.toMatchObject({ ok: true });
  });

  describe("during a sign-in excursion", () => {
    const IDP_PAGE = "https://login.idp-corp.example/oauth2/authorize";

    it("never trusts the excursion page's origin, in an excursion or after it", async () => {
      let inExcursion = true;
      const { handle, deps } = setup({ inExcursion: () => inExcursion });
      await expect(handle(call("getPushToken"), IDP_PAGE)).resolves.toBeNull();
      inExcursion = false;
      await expect(handle(call("getPushToken"), IDP_PAGE)).resolves.toBeNull();
      await handle(JSON.stringify({ type: "event", name: "ready" }), IDP_PAGE);
      expect(deps.getPushToken).not.toHaveBeenCalled();
      expect(deps.onEvent).not.toHaveBeenCalled();
    });

    it("answers no call and takes no event, even one naming the server's origin", async () => {
      // The main frame is the provider's page, and a reply runs there. On iOS
      // a server-origin sub-frame inside that page reports its own URL.
      let inExcursion = true;
      const { handle, deps } = setup({ inExcursion: () => inExcursion });
      await expect(handle(call("getPushToken"), PAGE)).resolves.toBeNull();
      await expect(handle(call("scan"), PAGE)).resolves.toBeNull();
      await handle(JSON.stringify({ type: "event", name: "ready" }), PAGE);
      expect(deps.getPushToken).not.toHaveBeenCalled();
      expect(deps.scan).not.toHaveBeenCalled();
      expect(deps.onEvent).not.toHaveBeenCalled();

      // Back on the server, the Console is answered again.
      inExcursion = false;
      await expect(handle(call("getPushToken"), PAGE)).resolves.toMatchObject({ ok: true });
    });
  });

  it("drops events from another origin", async () => {
    const { handle, deps } = setup();
    await handle(JSON.stringify({ type: "event", name: "ready" }), "https://evil.example.com/");
    expect(deps.onEvent).not.toHaveBeenCalled();
  });

  it("forwards known events", async () => {
    const { handle, deps } = setup();
    await expect(
      handle(
        JSON.stringify({ type: "event", name: "routeChanged", payload: { route: "/a" } }),
        PAGE
      )
    ).resolves.toBeNull();
    expect(deps.onEvent).toHaveBeenCalledWith("routeChanged", { route: "/a" });
  });

  it("forwards the removal script's answer", async () => {
    const { handle, deps } = setup();
    const payload = { id: "rm1", handled: true, ok: true };
    await handle(JSON.stringify({ type: "event", name: "connectionRemovedDone", payload }), PAGE);
    expect(deps.onEvent).toHaveBeenCalledWith("connectionRemovedDone", payload);
  });

  it("ignores unknown events", async () => {
    const { handle, deps } = setup();
    await handle(JSON.stringify({ type: "event", name: "mystery" }), PAGE);
    expect(deps.onEvent).not.toHaveBeenCalled();
  });

  it("returns the push token", async () => {
    const { handle } = setup();
    await expect(handle(call("getPushToken"), PAGE)).resolves.toEqual({
      id: "c1",
      ok: true,
      value: { token: "t", vendor: "apns" },
    });
  });

  it("validates haptic kinds", async () => {
    const { handle, deps } = setup();
    await expect(handle(call("haptic", { kind: "success" }), PAGE)).resolves.toMatchObject({
      ok: true,
    });
    expect(deps.haptic).toHaveBeenCalledWith("success");
    await expect(handle(call("haptic", { kind: "boom" }), PAGE)).resolves.toMatchObject({
      ok: false,
      error: { code: "bad_args" },
    });
  });

  it("only opens safe external schemes", async () => {
    const { handle, deps } = setup();
    await expect(
      handle(call("openExternal", { url: "https://docs.example.org" }), PAGE)
    ).resolves.toMatchObject({ ok: true });
    expect(deps.openExternal).toHaveBeenCalledWith("https://docs.example.org");
    await expect(
      handle(call("openExternal", { url: "javascript:alert(1)" }), PAGE)
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "bad_args" },
    });
  });

  it("only navigates to Console routes", async () => {
    const { handle, deps } = setup();
    await expect(handle(call("navigate", { route: "/apps/crm" }), PAGE)).resolves.toMatchObject({
      ok: true,
    });
    expect(deps.navigate).toHaveBeenCalledWith("/apps/crm");
    for (const route of [
      "apps",
      "//evil.example.com",
      5,
      "/../../api/v1/me",
      "/%2e%2e/api/v1/me",
      "/..\\api",
    ]) {
      await expect(handle(call("navigate", { route }), PAGE)).resolves.toMatchObject({
        ok: false,
        error: { code: "bad_args" },
      });
    }
  });

  it("resets the server", async () => {
    const { handle, deps } = setup();
    await expect(handle(call("resetServer"), PAGE)).resolves.toMatchObject({ ok: true });
    expect(deps.resetServer).toHaveBeenCalled();
  });

  describe("showConnectionSwitcher", () => {
    it("opens the switcher and resolves null", async () => {
      const { handle, deps } = setup();
      await expect(handle(call("showConnectionSwitcher"), PAGE)).resolves.toEqual({
        id: "c1",
        ok: true,
        value: null,
      });
      expect(deps.showConnectionSwitcher).toHaveBeenCalledTimes(1);
    });

    it("answers nothing, and opens nothing, for a page on another origin", async () => {
      const { handle, deps } = setup();
      await expect(
        handle(call("showConnectionSwitcher"), "https://evil.example.com/")
      ).resolves.toBeNull();
      expect(deps.showConnectionSwitcher).not.toHaveBeenCalled();
    });

    it("follows the current connection: the connection switched away from gets no answer", async () => {
      // After a switch the handler is built for the new current server.
      const { handle, deps } = setup({ serverUrl: "https://erp.example.com" });
      await expect(handle(call("showConnectionSwitcher"), PAGE)).resolves.toBeNull();
      expect(deps.showConnectionSwitcher).not.toHaveBeenCalled();
      await expect(
        handle(call("showConnectionSwitcher"), "https://erp.example.com/_console/home")
      ).resolves.toMatchObject({ ok: true });
    });
  });

  it("reports unknown methods", async () => {
    const { handle } = setup();
    await expect(handle(call("selfDestruct"), PAGE)).resolves.toMatchObject({
      ok: false,
      error: { code: "unknown_method" },
    });
  });

  describe("scan", () => {
    it("reads every format when the call names none", async () => {
      const { handle, deps } = setup();
      for (const args of [undefined, null, {}]) {
        await expect(handle(call("scan", args), PAGE)).resolves.toEqual({
          id: "c1",
          ok: true,
          value: "4006381333931",
        });
      }
      expect(deps.scan).toHaveBeenCalledTimes(3);
      for (const [formats] of (deps.scan as jest.Mock).mock.calls) {
        expect(formats).toEqual(SCAN_FORMATS);
      }
    });

    it("reads only the formats the call names", async () => {
      const { handle, deps } = setup();
      await expect(
        handle(call("scan", { formats: ["ean13", "qr", "ean13"] }), PAGE)
      ).resolves.toMatchObject({ ok: true });
      expect(deps.scan).toHaveBeenCalledWith(["qr", "ean13"]);
    });

    it.each([
      ["an empty format list", { formats: [] }],
      ["an unknown format", { formats: ["qr", "barcode"] }],
      ["a format that is not a string", { formats: ["qr", 5] }],
      ["formats that are not a list", { formats: "qr" }],
      ["an unknown option", { format: ["qr"] }],
      ["an extra option", { formats: ["qr"], torch: true }],
      ["options that are a list", ["qr"]],
      ["options that are a string", "qr"],
    ])("refuses %s as bad_args without opening the scanner", async (_label, args) => {
      const { handle, deps } = setup();
      await expect(handle(call("scan", args), PAGE)).resolves.toMatchObject({
        ok: false,
        error: { code: "bad_args" },
      });
      expect(deps.scan).not.toHaveBeenCalled();
    });

    it("answers nothing, and opens no scanner, for a page on another origin", async () => {
      const { handle, deps } = setup();
      await expect(handle(call("scan"), "https://evil.example.com/")).resolves.toBeNull();
      expect(deps.scan).not.toHaveBeenCalled();
    });

    describe("through the scan session", () => {
      const show = jest.fn();
      const scanThroughSession = () =>
        setup({ scan: (formats) => requestScan(formats, show) }).handle;

      /** Settle the open scan once the handler has opened it. */
      async function settleOpen(outcome: ScanOutcome) {
        await Promise.resolve();
        const open = currentScan();
        if (!open) throw new Error("no scan open");
        settleScan(open.token, outcome);
      }

      beforeEach(() => show.mockReset());

      it("resolves the decoded text", async () => {
        const answer = scanThroughSession()(call("scan", { formats: ["code128"] }), PAGE);
        await settleOpen({ kind: "result", text: "SKU-0042" });
        await expect(answer).resolves.toEqual({ id: "c1", ok: true, value: "SKU-0042" });
        expect(show).toHaveBeenCalledTimes(1);
      });

      it("resolves null on cancel", async () => {
        const answer = scanThroughSession()(call("scan"), PAGE);
        await settleOpen({ kind: "cancel" });
        await expect(answer).resolves.toEqual({ id: "c1", ok: true, value: null });
      });

      it("fails when the camera permission is denied", async () => {
        const answer = scanThroughSession()(call("scan"), PAGE);
        await settleOpen({ kind: "denied" });
        await expect(answer).resolves.toEqual({
          id: "c1",
          ok: false,
          error: { code: "failed", message: SCAN_DENIED_MESSAGE },
        });
      });

      it("refuses a second scan while one is open, and leaves the open one alone", async () => {
        const handle = scanThroughSession();
        const first = handle(call("scan", undefined, "c1"), PAGE);
        await expect(handle(call("scan", undefined, "c2"), PAGE)).resolves.toEqual({
          id: "c2",
          ok: false,
          error: { code: "failed", message: SCAN_BUSY_MESSAGE },
        });
        expect(show).toHaveBeenCalledTimes(1);
        await settleOpen({ kind: "result", text: "first" });
        await expect(first).resolves.toEqual({ id: "c1", ok: true, value: "first" });
      });
    });
  });

  it("turns a thrown capability into a failed result", async () => {
    const { handle } = setup({ getPushToken: jest.fn().mockRejectedValue(new Error("APNs down")) });
    await expect(handle(call("getPushToken"), PAGE)).resolves.toEqual({
      id: "c1",
      ok: false,
      error: { code: "failed", message: "APNs down" },
    });
  });
});
