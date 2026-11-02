import { createBridgeHandler, type BridgeDeps } from "~/lib/shell/bridge/handler";

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

  it("refuses calls from another origin", async () => {
    const { handle, deps } = setup();
    await expect(handle(call("getPushToken"), "https://evil.example.com/")).resolves.toEqual({
      id: "c1",
      ok: false,
      error: { code: "forbidden_origin", message: expect.any(String) },
    });
    expect(deps.getPushToken).not.toHaveBeenCalled();
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
    for (const route of ["apps", "//evil.example.com", 5]) {
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

  it("reports unknown methods", async () => {
    const { handle } = setup();
    await expect(handle(call("selfDestruct"), PAGE)).resolves.toMatchObject({
      ok: false,
      error: { code: "unknown_method" },
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
