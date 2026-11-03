import { createBridgeHandler, type BridgeDeps } from "~/lib/shell/bridge/handler";
import {
  FILE_TOO_LARGE_MESSAGE,
  MAX_FILE_BASE64_LENGTH,
  MAX_FILE_BYTES,
  MAX_MESSAGE_LENGTH,
  MAX_SHARE_TEXT_LENGTH,
  LOCKED_REFUSED_METHODS,
  PICK_IMAGE_DEFAULTS,
  SCAN_FORMATS,
} from "~/lib/shell/bridge/protocol";
import {
  IMAGE_TOO_LARGE_MESSAGE,
  OPEN_FILE_ARGS_MESSAGE,
  PICK_IMAGE_ARGS_MESSAGE,
  SHARE_ARGS_MESSAGE,
  isSafeFileName,
} from "~/lib/shell/bridge/handler";
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
    pickImage: jest.fn().mockResolvedValue(null),
    share: jest.fn().mockResolvedValue(undefined),
    openFile: jest.fn().mockResolvedValue(undefined),
    getAppLock: jest.fn(() => ({ enabled: true, timeoutSeconds: 300 })),
    openAppLockSettings: jest.fn(),
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

  describe("app lock", () => {
    it("reads the setting with getAppLock", async () => {
      const { handle, deps } = setup();
      await expect(handle(call("getAppLock"), PAGE)).resolves.toEqual({
        id: "c1",
        ok: true,
        value: { enabled: true, timeoutSeconds: 300 },
      });
      expect(deps.getAppLock).toHaveBeenCalledTimes(1);
    });

    it("answers getAppLock with exactly the setting, whatever else the source carries", async () => {
      const { handle } = setup({
        getAppLock: () => ({ enabled: false, timeoutSeconds: 0, extra: "x" }) as never,
      });
      await expect(handle(call("getAppLock"), PAGE)).resolves.toMatchObject({
        value: { enabled: false, timeoutSeconds: 0 },
      });
      const result = await handle(call("getAppLock"), PAGE);
      expect(result && result.ok && Object.keys(result.value as object)).toEqual([
        "enabled",
        "timeoutSeconds",
      ]);
    });

    it("opens the native settings screen with openAppLockSettings and resolves null", async () => {
      const { handle, deps } = setup();
      await expect(handle(call("openAppLockSettings"), PAGE)).resolves.toEqual({
        id: "c1",
        ok: true,
        value: null,
      });
      expect(deps.openAppLockSettings).toHaveBeenCalledTimes(1);
    });

    it("passes both through the origin gate: another page gets no answer and opens nothing", async () => {
      const { handle, deps } = setup();
      for (const method of ["getAppLock", "openAppLockSettings"]) {
        await expect(handle(call(method), "https://evil.example.com/")).resolves.toBeNull();
      }
      expect(deps.getAppLock).not.toHaveBeenCalled();
      expect(deps.openAppLockSettings).not.toHaveBeenCalled();
    });

    it("answers nothing during a sign-in excursion", async () => {
      const { handle, deps } = setup({ inExcursion: () => true });
      await expect(handle(call("getAppLock"), PAGE)).resolves.toBeNull();
      await expect(handle(call("openAppLockSettings"), PAGE)).resolves.toBeNull();
      expect(deps.openAppLockSettings).not.toHaveBeenCalled();
    });

    it("refuses methods that bring up native UI while the app is locked", async () => {
      const { handle, deps } = setup({ isLocked: () => true });
      for (const [method, args] of [
        ["openExternal", { url: "https://example.com" }],
        ["scan", undefined],
        ["showConnectionSwitcher", undefined],
        ["pickImage", undefined],
        ["share", { url: "https://acme.example.com/x" }],
        ["openFile", { base64: "QUJD", name: "a.txt", mime: "text/plain" }],
        ["openAppLockSettings", undefined],
      ] as const) {
        await expect(handle(call(method, args), PAGE)).resolves.toEqual({
          id: "c1",
          ok: false,
          error: { code: "failed", message: "The app is locked" },
        });
      }
      expect(deps.openExternal).not.toHaveBeenCalled();
      expect(deps.scan).not.toHaveBeenCalled();
      expect(deps.showConnectionSwitcher).not.toHaveBeenCalled();
      expect(deps.pickImage).not.toHaveBeenCalled();
      expect(deps.share).not.toHaveBeenCalled();
      expect(deps.openFile).not.toHaveBeenCalled();
      expect(deps.openAppLockSettings).not.toHaveBeenCalled();
    });

    it("refuses exactly the methods that bring up native UI", () => {
      expect([...LOCKED_REFUSED_METHODS].sort()).toEqual([
        "openAppLockSettings",
        "openExternal",
        "openFile",
        "pickImage",
        "scan",
        "share",
        "showConnectionSwitcher",
      ]);
    });

    it("keeps answering the rest while locked, so a Console booting under the lock still works", async () => {
      const { handle, deps } = setup({ isLocked: () => true });
      await expect(handle(call("getPushToken"), PAGE)).resolves.toMatchObject({ ok: true });
      await expect(handle(call("getAppLock"), PAGE)).resolves.toMatchObject({ ok: true });
      await expect(handle(call("navigate", { route: "/home" }), PAGE)).resolves.toMatchObject({
        ok: true,
      });
      expect(deps.navigate).toHaveBeenCalledWith("/home");
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

  describe("pickImage", () => {
    const IMAGE = { base64: "/9j/4AAQ", name: "IMG_0001.jpg", mime: "image/jpeg" };

    it("picks from the library with the defaults when the call names nothing", async () => {
      const pickImage = jest.fn().mockResolvedValue(IMAGE);
      const { handle } = setup({ pickImage });
      await expect(handle(call("pickImage"), PAGE)).resolves.toEqual({
        id: "c1",
        ok: true,
        value: IMAGE,
      });
      expect(pickImage).toHaveBeenCalledWith(PICK_IMAGE_DEFAULTS);
      expect(PICK_IMAGE_DEFAULTS).toEqual({ camera: false, maxWidth: 2048, quality: 0.8 });
    });

    it("passes camera, maxWidth and quality through", async () => {
      const pickImage = jest.fn().mockResolvedValue(IMAGE);
      const { handle } = setup({ pickImage });
      await handle(call("pickImage", { camera: true, maxWidth: 1280, quality: 0.6 }), PAGE);
      expect(pickImage).toHaveBeenCalledWith({ camera: true, maxWidth: 1280, quality: 0.6 });
    });

    it("resolves null when the user cancels", async () => {
      const { handle } = setup({ pickImage: jest.fn().mockResolvedValue(null) });
      await expect(handle(call("pickImage"), PAGE)).resolves.toEqual({
        id: "c1",
        ok: true,
        value: null,
      });
    });

    it.each([
      ["a non-object", "camera"],
      ["an array", []],
      ["an unknown key", { camera: true, crop: true }],
      ["a non-boolean camera", { camera: "yes" }],
      ["a fractional maxWidth", { maxWidth: 10.5 }],
      ["a zero maxWidth", { maxWidth: 0 }],
      ["a maxWidth over the cap", { maxWidth: 8193 }],
      ["a string maxWidth", { maxWidth: "1024" }],
      ["a quality over 1", { quality: 1.5 }],
      ["a negative quality", { quality: -0.1 }],
      ["a NaN quality", { quality: Number.NaN }],
    ])("refuses %s as bad_args, and opens no picker", async (_label, args) => {
      const { handle, deps } = setup();
      await expect(handle(call("pickImage", args), PAGE)).resolves.toEqual({
        id: "c1",
        ok: false,
        error: { code: "bad_args", message: PICK_IMAGE_ARGS_MESSAGE },
      });
      expect(deps.pickImage).not.toHaveBeenCalled();
    });

    it("refuses an image over the size limit after downscaling, with the error envelope", async () => {
      const big = "A".repeat(MAX_FILE_BASE64_LENGTH + 4);
      const { handle } = setup({
        pickImage: jest.fn().mockResolvedValue({ ...IMAGE, base64: big }),
      });
      await expect(handle(call("pickImage"), PAGE)).resolves.toEqual({
        id: "c1",
        ok: false,
        error: { code: "failed", message: IMAGE_TOO_LARGE_MESSAGE },
      });
    });

    it("answers an image exactly at the size limit", async () => {
      const atLimit = "A".repeat(MAX_FILE_BASE64_LENGTH - 4) + "AA==";
      const { handle } = setup({
        pickImage: jest.fn().mockResolvedValue({ ...IMAGE, base64: atLimit }),
      });
      await expect(handle(call("pickImage"), PAGE)).resolves.toMatchObject({ ok: true });
    });

    it("reports a picker that cannot run as failed", async () => {
      const { handle } = setup({
        pickImage: jest.fn().mockRejectedValue(new Error("Camera permission denied")),
      });
      await expect(handle(call("pickImage", { camera: true }), PAGE)).resolves.toEqual({
        id: "c1",
        ok: false,
        error: { code: "failed", message: "Camera permission denied" },
      });
    });
  });

  describe("share", () => {
    it("shares a link and a text", async () => {
      const { handle, deps } = setup();
      const content = { url: "https://acme.example.com/_console/apps/crm/lead/1", text: "Lead 1" };
      await expect(handle(call("share", content), PAGE)).resolves.toEqual({
        id: "c1",
        ok: true,
        value: null,
      });
      expect(deps.share).toHaveBeenCalledWith(content);
    });

    it("shares a text alone, or a link alone", async () => {
      const { handle, deps } = setup();
      await handle(call("share", { text: "hello" }), PAGE);
      await handle(call("share", { url: "http://intranet.example/x" }), PAGE);
      expect(deps.share).toHaveBeenNthCalledWith(1, { text: "hello" });
      expect(deps.share).toHaveBeenNthCalledWith(2, { url: "http://intranet.example/x" });
    });

    it.each([
      ["no arguments", undefined],
      ["an empty object", {}],
      ["an unknown key", { text: "hi", title: "x" }],
      ["a non-web URL", { url: "javascript:alert(1)" }],
      ["a file URL", { url: "file:///etc/hosts" }],
      ["a URL with no host", { url: "https://" }],
      ["an empty text", { text: "" }],
      ["an overlong text", { text: "x".repeat(MAX_SHARE_TEXT_LENGTH + 1) }],
      ["a non-string text", { text: 42 }],
    ])("refuses %s as bad_args, and opens no sheet", async (_label, args) => {
      const { handle, deps } = setup();
      await expect(handle(call("share", args), PAGE)).resolves.toEqual({
        id: "c1",
        ok: false,
        error: { code: "bad_args", message: SHARE_ARGS_MESSAGE },
      });
      expect(deps.share).not.toHaveBeenCalled();
    });
  });

  describe("openFile", () => {
    const PDF = { base64: "JVBERi0xLjQK", name: "Quote 42.pdf", mime: "application/pdf" };

    it("hands the bytes, name and MIME type to the OS", async () => {
      const { handle, deps } = setup();
      await expect(handle(call("openFile", PDF), PAGE)).resolves.toEqual({
        id: "c1",
        ok: true,
        value: null,
      });
      expect(deps.openFile).toHaveBeenCalledWith(PDF);
    });

    it("takes no URL: the shell fetches nothing, the Console sends the bytes", async () => {
      // Ruling 6593858903 (option A): the native side never reads cookies,
      // calls the platform API or downloads a URL for this method.
      const { handle, deps } = setup();
      for (const args of [
        { url: `${SERVER}/api/v1/files/1`, name: "a.pdf", mime: "application/pdf" },
        { ...PDF, url: `${SERVER}/api/v1/files/1` },
        `${SERVER}/api/v1/files/1`,
      ]) {
        await expect(handle(call("openFile", args), PAGE)).resolves.toEqual({
          id: "c1",
          ok: false,
          error: { code: "bad_args", message: OPEN_FILE_ARGS_MESSAGE },
        });
      }
      expect(deps.openFile).not.toHaveBeenCalled();
    });

    it.each([
      ["no arguments", undefined],
      ["a missing name", { base64: PDF.base64, mime: PDF.mime }],
      ["a path in the name", { ...PDF, name: "../../Library/x.pdf" }],
      ["a Windows path in the name", { ...PDF, name: "a\\b.pdf" }],
      ["a control character in the name", { ...PDF, name: "a\u0000.pdf" }],
      ["a dot name", { ...PDF, name: ".." }],
      ["an overlong name", { ...PDF, name: `${"x".repeat(252)}.pdf` }],
      ["a MIME type without a subtype", { ...PDF, mime: "application" }],
      ["a MIME type with parameters", { ...PDF, mime: "text/plain; charset=utf-8" }],
      ["base64 with a data: prefix", { ...PDF, base64: `data:application/pdf;base64,${PDF.base64}` }],
      ["base64 with line breaks", { ...PDF, base64: "JVBE\nRi0x" }],
      ["base64 of the wrong length", { ...PDF, base64: "JVBERi0" }],
      ["empty bytes", { ...PDF, base64: "" }],
      ["non-string bytes", { ...PDF, base64: [37, 80] }],
    ])("refuses %s as bad_args, and opens nothing", async (_label, args) => {
      const { handle, deps } = setup();
      await expect(handle(call("openFile", args), PAGE)).resolves.toEqual({
        id: "c1",
        ok: false,
        error: { code: "bad_args", message: OPEN_FILE_ARGS_MESSAGE },
      });
      expect(deps.openFile).not.toHaveBeenCalled();
    });

    it("normalises the MIME type to lower case", async () => {
      const { handle, deps } = setup();
      await handle(call("openFile", { ...PDF, mime: "Application/PDF" }), PAGE);
      expect(deps.openFile).toHaveBeenCalledWith(PDF);
    });

    it("takes a file at the size limit, in one message over the ordinary cap", async () => {
      const base64 = "A".repeat(MAX_FILE_BASE64_LENGTH - 4) + "AA==";
      const { handle, deps } = setup();
      const raw = call("openFile", { ...PDF, base64 });
      expect(raw.length).toBeGreaterThan(MAX_MESSAGE_LENGTH);
      await expect(handle(raw, PAGE)).resolves.toMatchObject({ ok: true });
      expect(deps.openFile).toHaveBeenCalledTimes(1);
      expect((deps.openFile as jest.Mock).mock.calls[0][0].base64.length).toBe(
        MAX_FILE_BASE64_LENGTH
      );
      expect(MAX_FILE_BYTES).toBe(8 * 1024 * 1024);
    });

    it("refuses a file over the size limit with the error envelope", async () => {
      const base64 = "A".repeat(MAX_FILE_BASE64_LENGTH + 4);
      const { handle, deps } = setup();
      await expect(handle(call("openFile", { ...PDF, base64 }), PAGE)).resolves.toEqual({
        id: "c1",
        ok: false,
        error: { code: "bad_args", message: FILE_TOO_LARGE_MESSAGE },
      });
      expect(deps.openFile).not.toHaveBeenCalled();
    });

    it("drops, unparsed and unanswered, a large message from a page on another origin", async () => {
      const base64 = "A".repeat(MAX_MESSAGE_LENGTH);
      const { handle, deps } = setup();
      const parse = jest.spyOn(JSON, "parse");
      try {
        await expect(
          handle(call("openFile", { ...PDF, base64 }), "https://evil.example.com/")
        ).resolves.toBeNull();
        expect(parse).not.toHaveBeenCalled();
      } finally {
        parse.mockRestore();
      }
      expect(deps.openFile).not.toHaveBeenCalled();
    });

    it("answers nothing, and opens nothing, for a small call from another origin", async () => {
      const { handle, deps } = setup();
      await expect(handle(call("openFile", PDF), "https://evil.example.com/")).resolves.toBeNull();
      expect(deps.openFile).not.toHaveBeenCalled();
    });
  });

  it("answers none of the three methods, and runs none, for a page on another origin", async () => {
    const { handle, deps } = setup();
    const other = "https://evil.example.com/";
    await expect(handle(call("pickImage"), other)).resolves.toBeNull();
    await expect(handle(call("share", { text: "x" }), other)).resolves.toBeNull();
    expect(deps.pickImage).not.toHaveBeenCalled();
    expect(deps.share).not.toHaveBeenCalled();
  });

  it("answers none of the three methods during a sign-in excursion", async () => {
    const { handle, deps } = setup({ inExcursion: () => true });
    await expect(handle(call("pickImage"), PAGE)).resolves.toBeNull();
    await expect(handle(call("share", { text: "x" }), PAGE)).resolves.toBeNull();
    await expect(
      handle(call("openFile", { base64: "QUJD", name: "a.txt", mime: "text/plain" }), PAGE)
    ).resolves.toBeNull();
    expect(deps.pickImage).not.toHaveBeenCalled();
    expect(deps.share).not.toHaveBeenCalled();
    expect(deps.openFile).not.toHaveBeenCalled();
  });

  describe("isSafeFileName", () => {
    it.each([
      ["Quote 42.pdf", true],
      ["报价单.xlsx", true],
      ["..jpg", true],
      ["", false],
      [".", false],
      ["..", false],
      ["a/b", false],
      ["a\\b", false],
      ["a\u007fb", false],
      ["a\u0085b", false],
      ["x".repeat(256), false],
    ])("%j → %s", (name, safe) => {
      expect(isSafeFileName(name)).toBe(safe);
    });
  });
});
