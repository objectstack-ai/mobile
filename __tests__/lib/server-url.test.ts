/**
 * Tests for lib/server-url – server URL persistence. The probe that runs
 * before a server is saved is tested in server-probe.test.ts.
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

import { getServerUrl, setServerUrl, clearServerUrl } from "~/lib/server-url";

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
});
