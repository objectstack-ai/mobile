import { parseError, getUserErrorMessage } from "~/lib/error-handling";

describe("parseError", () => {
  it("parses a network error", () => {
    const err = new Error("Network request failed");
    const result = parseError(err);
    expect(result.code).toBe("NETWORK_ERROR");
  });

  it("parses a structured JSON error from the API", () => {
    const err = new Error(JSON.stringify({ code: "NOT_FOUND" }));
    const result = parseError(err);
    expect(result.code).toBe("NOT_FOUND");
  });

  it("falls back to INTERNAL_ERROR for unknown errors", () => {
    const result = parseError("something went wrong");
    expect(result.code).toBe("INTERNAL_ERROR");
  });

  it("uses the message from a plain Error", () => {
    const err = new Error("custom message");
    const result = parseError(err);
    expect(result.code).toBe("INTERNAL_ERROR");
    expect(result.message).toBe("custom message");
  });
});

describe("getUserErrorMessage", () => {
  it("returns a user-friendly string", () => {
    const msg = getUserErrorMessage(new Error("Network request failed"));
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });
});
