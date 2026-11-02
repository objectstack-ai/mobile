import { MAX_MESSAGE_LENGTH, parseInbound } from "~/lib/shell/bridge/protocol";

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
