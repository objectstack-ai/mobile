import {
  BRIDGE_CAPABILITIES,
  BRIDGE_METHODS,
  CONNECTION_REMOVED_EVENT,
  MAX_MESSAGE_LENGTH,
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
});
