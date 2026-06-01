/**
 * Tests for interpretEnvelope — the server-response interpreter behind object
 * actions / flow triggers. The key case: a transport 200 whose body wraps an
 * INNER { success: false } must be reported as a failure, not a false success.
 */
import { interpretEnvelope } from "~/lib/record-actions";

const ok = { ok: true, status: 200 };
const notFound = { ok: false, status: 404 };

describe("interpretEnvelope", () => {
  it("treats a clean 200 as success and lifts the inner data payload", () => {
    const r = interpretEnvelope(ok, { success: true, data: { id: "1" } }, "fallback", true);
    expect(r).toEqual({ success: true, data: { id: "1" }, reload: true });
  });

  it("fails on a non-ok HTTP status", () => {
    const r = interpretEnvelope(notFound, null, "fallback err", false);
    expect(r.success).toBe(false);
    expect(r.error).toBe("fallback err");
  });

  it("fails when the outer envelope says success:false", () => {
    const r = interpretEnvelope(ok, { success: false, error: "denied" }, "fallback", false);
    expect(r).toMatchObject({ success: false, error: "denied" });
  });

  it("fails when the INNER data envelope says success:false (the bug)", () => {
    // What the action route actually returns for an unknown handler.
    const body = { success: true, data: { success: false, error: "Action 'x' not found" } };
    const r = interpretEnvelope(ok, body, "fallback", true);
    expect(r.success).toBe(false);
    expect(r.error).toBe("Action 'x' not found");
  });

  it("falls back to the default error when the inner failure has no message", () => {
    const r = interpretEnvelope(ok, { success: true, data: { success: false } }, "fallback", true);
    expect(r.success).toBe(false);
    expect(r.error).toBe("fallback");
  });

  it("honours the reload flag on success", () => {
    expect(interpretEnvelope(ok, { success: true, data: {} }, "f", false).reload).toBe(false);
  });
});
