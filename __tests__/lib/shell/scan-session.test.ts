import {
  SCAN_BUSY_MESSAGE,
  SCAN_DENIED_MESSAGE,
  currentScan,
  requestScan,
  settleScan,
} from "~/lib/shell/bridge/scan-session";

/** Settle whatever scan is open; fails the test when none is. */
function settleOpen(outcome: Parameters<typeof settleScan>[1]) {
  const open = currentScan();
  if (!open) throw new Error("no scan open");
  expect(settleScan(open.token, outcome)).toBe(true);
}

afterEach(() => {
  const open = currentScan();
  if (open) settleScan(open.token, { kind: "cancel" });
});

describe("scan session", () => {
  it("shows the scanner with the formats asked for, and resolves the decoded text", async () => {
    const show = jest.fn(() => {
      expect(currentScan()?.formats).toEqual(["ean13"]);
    });
    const scan = requestScan(["ean13"], show);
    expect(show).toHaveBeenCalledTimes(1);
    settleOpen({ kind: "result", text: "4006381333931" });
    await expect(scan).resolves.toBe("4006381333931");
    expect(currentScan()).toBeNull();
  });

  it("resolves null on cancel", async () => {
    const scan = requestScan(["qr"], jest.fn());
    settleOpen({ kind: "cancel" });
    await expect(scan).resolves.toBeNull();
  });

  it("rejects when the camera permission is denied", async () => {
    const scan = requestScan(["qr"], jest.fn());
    settleOpen({ kind: "denied" });
    await expect(scan).rejects.toThrow(SCAN_DENIED_MESSAGE);
  });

  it("refuses a second scan while one is open, without showing it or touching the first", async () => {
    const show = jest.fn();
    const first = requestScan(["qr"], show);
    const token = currentScan()?.token;
    await expect(requestScan(["ean13"], show)).rejects.toThrow(SCAN_BUSY_MESSAGE);
    expect(show).toHaveBeenCalledTimes(1);
    expect(currentScan()).toEqual({ token, formats: ["qr"] });
    settleOpen({ kind: "result", text: "first" });
    await expect(first).resolves.toBe("first");
  });

  it("settles once: a second settle of the same scan changes nothing", async () => {
    const scan = requestScan(["qr"], jest.fn());
    const token = currentScan()!.token;
    expect(settleScan(token, { kind: "result", text: "a" })).toBe(true);
    expect(settleScan(token, { kind: "cancel" })).toBe(false);
    await expect(scan).resolves.toBe("a");
  });

  it("ignores a settle for a scan that is no longer the open one", async () => {
    const old = requestScan(["qr"], jest.fn());
    const oldToken = currentScan()!.token;
    settleScan(oldToken, { kind: "cancel" });
    await old;
    const next = requestScan(["qr"], jest.fn());
    expect(settleScan(oldToken, { kind: "result", text: "stale" })).toBe(false);
    settleOpen({ kind: "result", text: "fresh" });
    await expect(next).resolves.toBe("fresh");
  });

  it("rejects, and leaves nothing open, when the scanner cannot be shown", async () => {
    const scan = requestScan(["qr"], () => {
      throw new Error("no navigator");
    });
    await expect(scan).rejects.toThrow("no navigator");
    expect(currentScan()).toBeNull();
  });
});
