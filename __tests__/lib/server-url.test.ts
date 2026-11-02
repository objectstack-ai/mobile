/**
 * Tests for lib/server-url – persistence of the saved connections, and the
 * one-time migration of the single server URL older builds kept. The probe
 * that runs before a server is saved is tested in server-probe.test.ts.
 */

/* ---- Mock expo-secure-store ---- */
const store: Record<string, string> = {};
let mockFailWrites = false;

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    if (mockFailWrites) throw new Error("keychain unavailable");
    store[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete store[key];
  }),
}));

import * as SecureStore from "expo-secure-store";
import {
  CONNECTIONS_KEY,
  LEGACY_SERVER_URL_KEY,
  loadConnections,
  saveConnections,
} from "~/lib/server-url";
import {
  EMPTY_CONNECTIONS,
  addConnection,
  serializeConnections,
} from "~/lib/connections/model";
import { DEFAULT_BRAND_COLOR } from "~/lib/server-probe";

const NOW = 1_762_000_000_000;

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  mockFailWrites = false;
  jest.clearAllMocks();
});

describe("loadConnections", () => {
  it("fresh install: no connections, and nothing is written", async () => {
    await expect(loadConnections(NOW)).resolves.toEqual(EMPTY_CONNECTIONS);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(store).toEqual({});
  });

  it("upgrade with a saved URL: it becomes the first and current connection, once", async () => {
    store[LEGACY_SERVER_URL_KEY] = "https://erp.example.com";

    const migrated = await loadConnections(NOW);
    expect(migrated).toEqual({
      list: [
        {
          kind: "server",
          label: "erp.example.com",
          host: "erp.example.com",
          serverUrl: "https://erp.example.com",
          brandColor: DEFAULT_BRAND_COLOR,
          initial: "E",
          lastRoute: null,
          addedAt: NOW,
        },
      ],
      current: "erp.example.com",
      pushLeftRegistered: [],
    });
    // Written as the connections document; the old key is read this once and deleted.
    expect(JSON.parse(store[CONNECTIONS_KEY]).connections).toHaveLength(1);
    expect(store[LEGACY_SERVER_URL_KEY]).toBeUndefined();

    // The next launch reads the document and migrates nothing.
    jest.mocked(SecureStore.getItemAsync).mockClear();
    await expect(loadConnections(NOW + 1)).resolves.toEqual(migrated);
    expect(SecureStore.getItemAsync).not.toHaveBeenCalledWith(LEGACY_SERVER_URL_KEY);
  });

  it("does not bring a removed server back from the old key", async () => {
    store[LEGACY_SERVER_URL_KEY] = "https://erp.example.com";
    await loadConnections(NOW);
    await saveConnections(EMPTY_CONNECTIONS); // the user removed it
    await expect(loadConnections(NOW)).resolves.toEqual(EMPTY_CONNECTIONS);
  });

  it("keeps the old key for the next launch when the document cannot be written", async () => {
    store[LEGACY_SERVER_URL_KEY] = "https://erp.example.com";
    mockFailWrites = true;
    const migrated = await loadConnections(NOW);
    expect(migrated.current).toBe("erp.example.com");
    expect(store[LEGACY_SERVER_URL_KEY]).toBe("https://erp.example.com");

    mockFailWrites = false;
    await expect(loadConnections(NOW)).resolves.toEqual(migrated);
    expect(store[LEGACY_SERVER_URL_KEY]).toBeUndefined();
  });

  it("deletes an old key left beside the document (a migration interrupted before its delete)", async () => {
    const saved = addConnection(
      EMPTY_CONNECTIONS,
      {
        kind: "cloud",
        label: "Acme",
        serverUrl: "https://acme.objectos.ai",
        brandColor: "#4f46e5",
        initial: "A",
      },
      NOW
    );
    store[CONNECTIONS_KEY] = serializeConnections(saved);
    store[LEGACY_SERVER_URL_KEY] = "https://erp.example.com";
    await expect(loadConnections(NOW)).resolves.toEqual(saved);
    expect(store[LEGACY_SERVER_URL_KEY]).toBeUndefined();
  });

  it("drops an old value that is not a server URL", async () => {
    store[LEGACY_SERVER_URL_KEY] = "javascript:alert(1)";
    await expect(loadConnections(NOW)).resolves.toEqual(EMPTY_CONNECTIONS);
    expect(store).toEqual({});
  });

  it("reads storage it cannot read as nothing saved", async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error("locked"));
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error("locked"));
    await expect(loadConnections(NOW)).resolves.toEqual(EMPTY_CONNECTIONS);
  });
});

describe("saveConnections", () => {
  it("writes the connections document", async () => {
    const state = addConnection(
      EMPTY_CONNECTIONS,
      {
        kind: "server",
        label: "Example ERP",
        serverUrl: "https://erp.example.com",
        brandColor: "#0f766e",
        initial: "E",
      },
      NOW
    );
    await saveConnections(state);
    expect(store[CONNECTIONS_KEY]).toBe(serializeConnections(state));
  });

  it("throws when storage refuses the write", async () => {
    mockFailWrites = true;
    await expect(saveConnections(EMPTY_CONNECTIONS)).rejects.toThrow("keychain unavailable");
  });
});
