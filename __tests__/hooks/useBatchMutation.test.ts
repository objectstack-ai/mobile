/**
 * Tests for useBatchMutation – validates the SDK-compatible alias
 * for useBatchOperations.
 */
import { useBatchMutation } from "~/hooks/useBatchMutation";
import { useBatchOperations } from "~/hooks/useBatchOperations";

describe("useBatchMutation (alias)", () => {
  it("is re-exported as useBatchOperations", () => {
    expect(useBatchMutation).toBe(useBatchOperations);
  });
});
