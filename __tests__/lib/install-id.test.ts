import { uuid } from "expo-modules-core";
import {
  INSTALL_ID_KEY,
  _resetInstallIdCache,
  getInstallId,
  isInstallId,
} from "~/lib/install-id";

const mockStore = new Map<string, string>();
const mockGetItem = jest.fn(
  (key: string, _options?: unknown): string | null => mockStore.get(key) ?? null
);
const mockSetItem = jest.fn((key: string, value: string, _options?: unknown): void => {
  mockStore.set(key, value);
});

// The shared setup mocks only the async API; the install id is read
// synchronously (the bridge bootstrap is built synchronously).
jest.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: "AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY",
  getItem: (key: string, options: unknown) => mockGetItem(key, options),
  setItem: (key: string, value: string, options: unknown) => mockSetItem(key, value, options),
}));

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => {
  mockStore.clear();
  mockGetItem.mockClear();
  mockSetItem.mockClear();
  _resetInstallIdCache();
});

describe("getInstallId", () => {
  it("generates a random UUID v4 on first use and keeps it in SecureStore", () => {
    const id = getInstallId();
    expect(id).toMatch(UUID_V4);
    expect(mockStore.get(INSTALL_ID_KEY)).toBe(id);
    // Kept out of backups restored onto another device, readable after the
    // first unlock (a notification can start the app in the background).
    expect(mockSetItem).toHaveBeenCalledWith(INSTALL_ID_KEY, id, {
      keychainAccessible: "AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY",
    });
  });

  it("is stable across calls", () => {
    const first = getInstallId();
    expect(getInstallId()).toBe(first);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
  });

  it("is stable across launches: a stored id is read back, not replaced", () => {
    const first = getInstallId();
    _resetInstallIdCache(); // a new process; SecureStore keeps the value
    expect(getInstallId()).toBe(first);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
  });

  it("does not depend on WebView storage: only SecureStore is read", () => {
    const first = getInstallId();
    _resetInstallIdCache();
    mockGetItem.mockClear();
    expect(getInstallId()).toBe(first);
    expect(mockGetItem).toHaveBeenCalledWith(INSTALL_ID_KEY, expect.anything());
  });

  it("is regenerated when missing", () => {
    const first = getInstallId();
    mockStore.delete(INSTALL_ID_KEY); // Android "clear storage", reinstall
    _resetInstallIdCache();
    const second = getInstallId();
    expect(second).toMatch(UUID_V4);
    expect(second).not.toBe(first);
    expect(mockStore.get(INSTALL_ID_KEY)).toBe(second);
  });

  it("replaces a stored value that is not an install id", () => {
    mockStore.set(INSTALL_ID_KEY, "not-an-id");
    const id = getInstallId();
    expect(id).toMatch(UUID_V4);
    expect(mockStore.get(INSTALL_ID_KEY)).toBe(id);
  });

  it("answers null, and mints nothing, when SecureStore cannot be read", () => {
    mockGetItem.mockImplementationOnce(() => {
      throw new Error("keychain locked");
    });
    expect(getInstallId()).toBeNull();
    expect(mockSetItem).not.toHaveBeenCalled();
    // Tried again on the next call.
    expect(getInstallId()).toMatch(UUID_V4);
  });

  it("never hands out an id it could not store", () => {
    mockSetItem.mockImplementationOnce(() => {
      throw new Error("write refused");
    });
    expect(getInstallId()).toBeNull();
    const id = getInstallId();
    expect(id).toMatch(UUID_V4);
    expect(mockStore.get(INSTALL_ID_KEY)).toBe(id);
  });

  it("answers null when the platform has no UUID generator", () => {
    const spy = jest.spyOn(uuid, "v4").mockImplementationOnce(() => {
      throw new Error("Native UUID version 4 generator implementation wasn't found");
    });
    expect(getInstallId()).toBeNull();
    expect(mockSetItem).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("isInstallId", () => {
  it("accepts only a lower-case UUID v4", () => {
    expect(isInstallId("3b241101-e2bb-4255-8caf-4136c566a962")).toBe(true);
    expect(isInstallId("3B241101-E2BB-4255-8CAF-4136C566A962")).toBe(false);
    expect(isInstallId("3b241101-e2bb-1255-8caf-4136c566a962")).toBe(false);
    expect(isInstallId(null)).toBe(false);
    expect(isInstallId("")).toBe(false);
  });
});
