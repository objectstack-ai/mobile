import {
  APP_LOCK_BRIDGE_METHODS,
  BRIDGE_CAPABILITIES,
  BRIDGE_METHODS,
  CONNECTION_REMOVED_EVENT,
  MAX_FILE_BASE64_LENGTH,
  MAX_FILE_BYTES,
  MAX_FILE_MESSAGE_LENGTH,
  MAX_MESSAGE_LENGTH,
  base64ByteLength,
  SCAN_FORMATS,
  PUSH_TOKEN_CHANGED_EVENT,
  SHELL_EVENTS,
  parseConnectionRemovedDone,
  parseInbound,
  shellEventType,
} from "~/lib/shell/bridge/protocol";
import type { BarcodeType } from "expo-camera";

describe("capabilities", () => {
  it("announces every method and every shell event", () => {
    expect(BRIDGE_CAPABILITIES).toEqual([...BRIDGE_METHODS, ...SHELL_EVENTS]);
    expect(BRIDGE_CAPABILITIES).toContain("pushTokenChanged");
  });

  it("announces scan, with formats named as the camera names them", () => {
    expect(BRIDGE_CAPABILITIES).toContain("scan");
    // Compile-time: every scan format is a format expo-camera reads.
    const readable: readonly BarcodeType[] = SCAN_FORMATS;
    expect(new Set(readable).size).toBe(SCAN_FORMATS.length);
  });

  it("names a shell event's DOM type after its capability", () => {
    expect(shellEventType("pushTokenChanged")).toBe(PUSH_TOKEN_CHANGED_EVENT);
    expect(PUSH_TOKEN_CHANGED_EVENT).toBe("objectstack-native:pushTokenChanged");
    expect(shellEventType("connectionRemoved")).toBe(CONNECTION_REMOVED_EVENT);
    expect(CONNECTION_REMOVED_EVENT).toBe("objectstack-native:connectionRemoved");
  });

  it("announces the read-only app-lock methods", () => {
    expect(BRIDGE_CAPABILITIES).toContain("getAppLock");
    expect(BRIDGE_CAPABILITIES).toContain("openAppLockSettings");
  });

  it("has no app-lock method beyond reading it and opening the native screen", () => {
    // Ruled: the lock changes only on the native screen, behind biometrics.
    expect(APP_LOCK_BRIDGE_METHODS).toEqual(["getAppLock", "openAppLockSettings"]);
    const lockNamed = BRIDGE_CAPABILITIES.filter((name) => /lock/i.test(name));
    expect(lockNamed).toEqual([...APP_LOCK_BRIDGE_METHODS]);
  });

  it("announces pickImage, share and openFile", () => {
    expect(BRIDGE_CAPABILITIES).toEqual(expect.arrayContaining(["pickImage", "share", "openFile"]));
  });

  it("announces the connection switcher and the removal event", () => {
    expect(BRIDGE_CAPABILITIES).toContain("showConnectionSwitcher");
    expect(BRIDGE_CAPABILITIES).toContain("connectionRemoved");
  });
});

describe("parseConnectionRemovedDone", () => {
  it("reads { id, handled, ok }", () => {
    expect(parseConnectionRemovedDone({ id: "rm1", handled: true, ok: false })).toEqual({
      id: "rm1",
      handled: true,
      ok: false,
    });
  });

  it.each([
    ["no payload", undefined],
    ["a missing id", { handled: true, ok: true }],
    ["an empty id", { id: "", handled: true, ok: true }],
    ["an overlong id", { id: "x".repeat(65), handled: true, ok: true }],
    ["a non-boolean handled", { id: "rm1", handled: "yes", ok: true }],
    ["a missing ok", { id: "rm1", handled: true }],
  ])("refuses %s", (_label, payload) => {
    expect(parseConnectionRemovedDone(payload)).toBeNull();
  });
});

describe("parseInbound", () => {
  it("parses a call", () => {
    expect(
      parseInbound(
        JSON.stringify({ type: "call", id: "c1", method: "haptic", args: { kind: "light" } })
      )
    ).toEqual({
      type: "call",
      id: "c1",
      method: "haptic",
      args: { kind: "light" },
    });
  });

  it("parses an event", () => {
    expect(parseInbound(JSON.stringify({ type: "event", name: "ready" }))).toEqual({
      type: "event",
      name: "ready",
      payload: undefined,
    });
  });

  it.each([
    ["non-string", 42],
    ["empty", ""],
    ["not JSON", "{oops"],
    ["array", "[]"],
    ["unknown type", JSON.stringify({ type: "other" })],
    ["call without id", JSON.stringify({ type: "call", method: "haptic" })],
    ["call with long id", JSON.stringify({ type: "call", id: "x".repeat(65), method: "haptic" })],
    ["call without method", JSON.stringify({ type: "call", id: "c1" })],
    ["event without name", JSON.stringify({ type: "event" })],
  ])("ignores %s", (_label, raw) => {
    expect(parseInbound(raw)).toBeNull();
  });

  it("ignores oversized messages", () => {
    const raw = JSON.stringify({
      type: "event",
      name: "ready",
      payload: "x".repeat(MAX_MESSAGE_LENGTH),
    });
    expect(parseInbound(raw)).toBeNull();
  });

  describe("file bytes", () => {
    const fileCall = (base64Length: number, method = "openFile") =>
      JSON.stringify({
        type: "call",
        id: "c1",
        method,
        args: { base64: "A".repeat(base64Length), name: "a.pdf", mime: "application/pdf" },
      });

    it("parses an openFile call over the ordinary cap only when the page may send files", () => {
      const raw = fileCall(MAX_MESSAGE_LENGTH);
      expect(parseInbound(raw)).toBeNull();
      expect(parseInbound(raw, { allowFile: true })).toMatchObject({ method: "openFile" });
    });

    it("parses a file at the limit, and nothing over the file message cap", () => {
      expect(parseInbound(fileCall(MAX_FILE_BASE64_LENGTH), { allowFile: true })).not.toBeNull();
      expect(
        parseInbound(fileCall(MAX_FILE_MESSAGE_LENGTH), { allowFile: true })
      ).toBeNull();
    });

    it("keeps the ordinary cap for every other method and for events", () => {
      expect(parseInbound(fileCall(MAX_MESSAGE_LENGTH, "share"), { allowFile: true })).toBeNull();
      const event = JSON.stringify({
        type: "event",
        name: "routeChanged",
        payload: "x".repeat(MAX_MESSAGE_LENGTH),
      });
      expect(parseInbound(event, { allowFile: true })).toBeNull();
    });
  });
});

describe("file limits", () => {
  it("caps a file at 8 MiB, and its base64 at the length that encodes it", () => {
    expect(MAX_FILE_BYTES).toBe(8 * 1024 * 1024);
    expect(MAX_FILE_BASE64_LENGTH).toBe(Buffer.from(new Uint8Array(MAX_FILE_BYTES)).toString("base64").length);
    expect(MAX_FILE_MESSAGE_LENGTH).toBe(MAX_FILE_BASE64_LENGTH + MAX_MESSAGE_LENGTH);
  });

  it.each([
    ["", 0],
    ["QQ==", 1],
    ["QUI=", 2],
    ["QUJD", 3],
    [Buffer.from("hello world").toString("base64"), 11],
  ])("base64ByteLength(%j) is %i", (base64, bytes) => {
    expect(base64ByteLength(base64)).toBe(bytes);
  });

  it.each(["QQ", "QQ=", "Q===", "QU JD", "QUJD\n", "QU-_", "data:,QUJD"])(
    "base64ByteLength refuses %j",
    (base64) => {
      expect(base64ByteLength(base64)).toBeNull();
    }
  );
});
