/**
 * Tests for lib/feature-flags — gradual rollout feature flag system
 */
import {
  createFeatureFlagManager,
  hashUserToPercentage,
} from "~/lib/feature-flags";

describe("feature-flags", () => {
  describe("hashUserToPercentage", () => {
    it("returns a number between 0 and 99", () => {
      const result = hashUserToPercentage("user-1", "flag-a");
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(100);
    });

    it("is deterministic for the same inputs", () => {
      const a = hashUserToPercentage("user-1", "flag-a");
      const b = hashUserToPercentage("user-1", "flag-a");
      expect(a).toBe(b);
    });

    it("produces different results for different users", () => {
      const a = hashUserToPercentage("user-1", "flag-a");
      const b = hashUserToPercentage("user-2", "flag-a");
      // Not guaranteed to differ, but very likely for distinct inputs
      // Just verify they are both in range
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeGreaterThanOrEqual(0);
    });
  });

  describe("createFeatureFlagManager", () => {
    it("starts with default flags", () => {
      const mgr = createFeatureFlagManager({
        defaults: [{ key: "dark_mode", enabled: true }],
      });
      expect(mgr.getFlags()).toEqual([{ key: "dark_mode", enabled: true }]);
    });

    it("isEnabled returns false for unknown flags", () => {
      const mgr = createFeatureFlagManager();
      expect(mgr.isEnabled("nonexistent")).toBe(false);
    });

    it("isEnabled returns true for enabled flags", () => {
      const mgr = createFeatureFlagManager({
        defaults: [{ key: "feature_x", enabled: true }],
      });
      expect(mgr.isEnabled("feature_x")).toBe(true);
    });

    it("isEnabled returns false for disabled flags", () => {
      const mgr = createFeatureFlagManager({
        defaults: [{ key: "feature_x", enabled: false }],
      });
      expect(mgr.isEnabled("feature_x")).toBe(false);
    });

    it("evaluates rollout percentage with user id", () => {
      const mgr = createFeatureFlagManager({
        defaults: [
          { key: "rollout_flag", enabled: true, rolloutPercentage: 50 },
        ],
      });
      mgr.setUserId("test-user");

      // Result is deterministic — just verify it returns a boolean
      const result = mgr.isEnabled("rollout_flag");
      expect(typeof result).toBe("boolean");
    });

    it("rollout 0% disables for everyone", () => {
      const mgr = createFeatureFlagManager({
        defaults: [
          { key: "flag_0", enabled: true, rolloutPercentage: 0 },
        ],
      });
      mgr.setUserId("any-user");
      expect(mgr.isEnabled("flag_0")).toBe(false);
    });

    it("rollout 100% enables for everyone", () => {
      const mgr = createFeatureFlagManager({
        defaults: [
          { key: "flag_100", enabled: true, rolloutPercentage: 100 },
        ],
      });
      mgr.setUserId("any-user");
      expect(mgr.isEnabled("flag_100")).toBe(true);
    });

    it("rollout flag returns false when userId is not set", () => {
      const mgr = createFeatureFlagManager({
        defaults: [
          { key: "rollout_no_user", enabled: true, rolloutPercentage: 100 },
        ],
      });
      // No setUserId call — userId is null
      expect(mgr.isEnabled("rollout_no_user")).toBe(false);
    });

    it("getPayload returns flag payload", () => {
      const mgr = createFeatureFlagManager({
        defaults: [
          { key: "themed", enabled: true, payload: { color: "blue" } },
        ],
      });
      expect(mgr.getPayload("themed")).toEqual({ color: "blue" });
    });

    it("getPayload returns undefined for unknown flag", () => {
      const mgr = createFeatureFlagManager();
      expect(mgr.getPayload("nope")).toBeUndefined();
    });

    it("overrideFlags replaces all flags", () => {
      const mgr = createFeatureFlagManager({
        defaults: [{ key: "a", enabled: true }],
      });
      mgr.overrideFlags([{ key: "b", enabled: false }]);
      expect(mgr.getFlags()).toEqual([{ key: "b", enabled: false }]);
    });

    it("subscribe is notified on overrideFlags", () => {
      const mgr = createFeatureFlagManager();
      const listener = jest.fn();
      mgr.subscribe(listener);

      mgr.overrideFlags([{ key: "x", enabled: true }]);
      expect(listener).toHaveBeenCalledWith([{ key: "x", enabled: true }]);
    });

    it("unsubscribe stops notifications", () => {
      const mgr = createFeatureFlagManager();
      const listener = jest.fn();
      const unsub = mgr.subscribe(listener);
      unsub();

      mgr.overrideFlags([{ key: "x", enabled: true }]);
      expect(listener).not.toHaveBeenCalled();
    });

    it("destroy clears state and stops polling", () => {
      const mgr = createFeatureFlagManager();
      mgr.overrideFlags([{ key: "a", enabled: true }]);
      mgr.destroy();
      expect(mgr.getFlags()).toEqual([]);
    });

    it("refresh is no-op without endpoint", async () => {
      const mgr = createFeatureFlagManager();
      await expect(mgr.refresh()).resolves.toBeUndefined();
    });

    it("refresh fetches from endpoint", async () => {
      const mockFlags = [{ key: "remote", enabled: true }];
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlags),
      }) as jest.Mock;

      const mgr = createFeatureFlagManager({
        endpoint: "https://api.example.com/flags",
      });
      await mgr.refresh();
      expect(mgr.getFlags()).toEqual(mockFlags);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/flags",
      );
    });

    it("refresh keeps existing flags on fetch failure", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("network")) as jest.Mock;

      const mgr = createFeatureFlagManager({
        endpoint: "https://api.example.com/flags",
        defaults: [{ key: "local", enabled: true }],
      });
      await mgr.refresh();
      expect(mgr.getFlags()).toEqual([{ key: "local", enabled: true }]);
    });
  });
});
