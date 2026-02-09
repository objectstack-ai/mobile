/**
 * Tests for lib/server-url – validates server URL persistence
 * and validation.
 */

/* ---- Mock expo-secure-store ---- */
const store: Record<string, string> = {};

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete store[key];
  }),
}));

import {
  getServerUrl,
  setServerUrl,
  clearServerUrl,
  validateServerUrl,
} from "~/lib/server-url";

beforeEach(() => {
  // Clear the mock store
  Object.keys(store).forEach((k) => delete store[k]);
  jest.restoreAllMocks();
});

describe("server-url", () => {
  describe("getServerUrl", () => {
    it("returns null when no URL is stored", async () => {
      const url = await getServerUrl();
      expect(url).toBeNull();
    });

    it("returns the stored URL", async () => {
      store["objectstack_server_url"] = "https://api.example.com";
      const url = await getServerUrl();
      expect(url).toBe("https://api.example.com");
    });
  });

  describe("setServerUrl", () => {
    it("persists a server URL", async () => {
      await setServerUrl("https://my-server.com");
      expect(store["objectstack_server_url"]).toBe("https://my-server.com");
    });
  });

  describe("clearServerUrl", () => {
    it("removes the stored URL", async () => {
      store["objectstack_server_url"] = "https://api.example.com";
      await clearServerUrl();
      expect(store["objectstack_server_url"]).toBeUndefined();
    });
  });

  describe("validateServerUrl", () => {
    it("returns true when /api/health responds OK", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

      const result = await validateServerUrl("https://api.example.com");
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/api/health",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("strips trailing slashes", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

      await validateServerUrl("https://api.example.com///");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/api/health",
        expect.any(Object),
      );
    });

    it("falls back to HEAD request when /api/health fails", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error("health failed"))
        .mockResolvedValueOnce({ status: 200 }) as any;

      const result = await validateServerUrl("https://api.example.com");
      expect(result).toBe(true);
    });

    it("returns false when both health and HEAD fail", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error("health failed"))
        .mockRejectedValueOnce(new Error("HEAD failed")) as any;

      const result = await validateServerUrl("https://unreachable.com");
      expect(result).toBe(false);
    });

    it("returns false when HEAD returns 500+", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error("health failed"))
        .mockResolvedValueOnce({ status: 500 }) as any;

      const result = await validateServerUrl("https://error-server.com");
      expect(result).toBe(false);
    });

    it("returns true when HEAD returns non-500 status", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error("health failed"))
        .mockResolvedValueOnce({ status: 404 }) as any;

      const result = await validateServerUrl("https://api.example.com");
      expect(result).toBe(true);
    });
  });
});
