/**
 * Tests for lib/remote-config — remote configuration management
 */
import { createRemoteConfigManager } from "~/lib/remote-config";

describe("remote-config", () => {
  describe("createRemoteConfigManager", () => {
    it("starts with default values", () => {
      const mgr = createRemoteConfigManager({
        defaults: { maxRetries: 3, theme: "light" },
      });
      expect(mgr.getAll()).toEqual({ maxRetries: 3, theme: "light" });
    });

    it("getValue returns a specific key", () => {
      const mgr = createRemoteConfigManager({
        defaults: { limit: 10 },
      });
      expect(mgr.getValue<number>("limit")).toBe(10);
    });

    it("getValue returns undefined for missing key", () => {
      const mgr = createRemoteConfigManager();
      expect(mgr.getValue("missing")).toBeUndefined();
    });

    it("getValueWithDefault returns fallback for missing key", () => {
      const mgr = createRemoteConfigManager();
      expect(mgr.getValueWithDefault("missing", 42)).toBe(42);
    });

    it("getValueWithDefault returns actual value when present", () => {
      const mgr = createRemoteConfigManager({
        defaults: { count: 5 },
      });
      expect(mgr.getValueWithDefault("count", 42)).toBe(5);
    });

    it("overrideConfig merges overrides", () => {
      const mgr = createRemoteConfigManager({
        defaults: { a: 1, b: 2 },
      });
      mgr.overrideConfig({ b: 99, c: 3 });
      expect(mgr.getAll()).toEqual({ a: 1, b: 99, c: 3 });
    });

    it("subscribe is notified on overrideConfig", () => {
      const mgr = createRemoteConfigManager();
      const listener = jest.fn();
      mgr.subscribe(listener);
      mgr.overrideConfig({ key: "value" });
      expect(listener).toHaveBeenCalledWith({ key: "value" });
    });

    it("unsubscribe stops notifications", () => {
      const mgr = createRemoteConfigManager();
      const listener = jest.fn();
      const unsub = mgr.subscribe(listener);
      unsub();
      mgr.overrideConfig({ key: "value" });
      expect(listener).not.toHaveBeenCalled();
    });

    it("getLastFetchedAt is null before first fetch", () => {
      const mgr = createRemoteConfigManager();
      expect(mgr.getLastFetchedAt()).toBeNull();
    });

    it("refresh is no-op without endpoint", async () => {
      const mgr = createRemoteConfigManager();
      await expect(mgr.refresh()).resolves.toBeUndefined();
      expect(mgr.getLastFetchedAt()).toBeNull();
    });

    it("refresh fetches and merges with defaults", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ theme: "dark", newKey: true }),
      }) as jest.Mock;

      const mgr = createRemoteConfigManager({
        endpoint: "https://api.example.com/config",
        defaults: { theme: "light", limit: 10 },
      });

      await mgr.refresh();

      expect(mgr.getAll()).toEqual({ theme: "dark", limit: 10, newKey: true });
      expect(mgr.getLastFetchedAt()).toBeGreaterThan(0);
    });

    it("refresh keeps existing config on failure", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as jest.Mock;

      const mgr = createRemoteConfigManager({
        endpoint: "https://api.example.com/config",
        defaults: { a: 1 },
      });
      await mgr.refresh();
      expect(mgr.getAll()).toEqual({ a: 1 });
    });

    it("destroy clears state", () => {
      const mgr = createRemoteConfigManager({
        defaults: { x: 1 },
      });
      mgr.destroy();
      expect(mgr.getAll()).toEqual({});
      expect(mgr.getLastFetchedAt()).toBeNull();
    });
  });
});
