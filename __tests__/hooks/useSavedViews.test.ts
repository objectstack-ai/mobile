/**
 * Tests for useSavedViews – validates the SDK-compatible alias
 * for useViewStorage.
 */
import { useSavedViews } from "~/hooks/useSavedViews";
import { useViewStorage } from "~/hooks/useViewStorage";

describe("useSavedViews (alias)", () => {
  it("is re-exported as useViewStorage", () => {
    expect(useSavedViews).toBe(useViewStorage);
  });
});
