/**
 * Tests for usePackages – validates the SDK-compatible alias
 * for useAppDiscovery.
 */
import { usePackages } from "~/hooks/usePackages";
import { useAppDiscovery } from "~/hooks/useAppDiscovery";

describe("usePackages (alias)", () => {
  it("is re-exported as useAppDiscovery", () => {
    expect(usePackages).toBe(useAppDiscovery);
  });
});
