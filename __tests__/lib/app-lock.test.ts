/**
 * The app lock's side effects: the stored setting, the AppState monitor, the
 * unlock prompt, the one writer of the setting, and the app-switcher
 * protection.
 */
// jest.setup.ts mocks this module without a `default`, which is what
// `react-native`'s `AppState` getter reads; give it one for this file.
jest.mock("react-native/Libraries/AppState/AppState", () => {
  const appState = {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  return { __esModule: true, default: appState, ...appState };
});

import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Whole-module stand-ins: the code under test reads these modules through
// `import * as`, which copies the mock's properties at import time, so a
// property added to a shared mock later would never reach it.
jest.mock("expo-local-authentication", () => ({
  __esModule: true,
  authenticateAsync: jest.fn(),
  getEnrolledLevelAsync: jest.fn(),
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
}));
jest.mock("expo-secure-store", () => ({
  __esModule: true,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 7,
  getItem: jest.fn(),
  setItemAsync: jest.fn(),
}));
jest.mock("expo-screen-capture", () => ({
  __esModule: true,
  enableAppSwitcherProtectionAsync: jest.fn(),
  disableAppSwitcherProtectionAsync: jest.fn(),
  preventScreenCaptureAsync: jest.fn(),
  allowScreenCaptureAsync: jest.fn(),
}));
jest.mock("expo-web-browser", () => ({ __esModule: true, dismissBrowser: jest.fn() }));

import {
  APP_LOCK_STORAGE_KEY,
  _resetAppLockForTests,
  applySnapshotProtection,
  changeAppLockSettings,
  hydrateAppLock,
  parseAppLockRecord,
  readAppLockSettings,
  serializeAppLockSettings,
  startAppLock,
  startAppLockMonitor,
  unlockApp,
} from "~/lib/app-lock";
import {
  APP_LOCK_OFF,
  INITIAL_APP_LOCK_STATE,
  useSecurityStore,
  type AppLockSettings,
} from "~/stores/security-store";

const LocalAuth = jest.requireMock("expo-local-authentication") as Record<string, jest.Mock>;
const Secure = jest.requireMock("expo-secure-store") as Record<string, jest.Mock>;
const mockScreenCapture = jest.requireMock("expo-screen-capture") as Record<string, jest.Mock>;
const mockDismissBrowser = (jest.requireMock("expo-web-browser") as Record<string, jest.Mock>)
  .dismissBrowser;
const appState = AppState as unknown as { currentState: string; addEventListener: jest.Mock };

const ON_5_MIN: AppLockSettings = { enabled: true, timeoutSeconds: 300 };
const ON_IMMEDIATELY: AppLockSettings = { enabled: true, timeoutSeconds: 0 };

/** The listener the last monitor registered. */
function appStateListener(): (next: string) => void {
  const calls = appState.addEventListener.mock.calls;
  return calls[calls.length - 1][1];
}

let originalOS: typeof Platform.OS;

/** Let pending promise callbacks run. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.resetAllMocks();
  _resetAppLockForTests();
  useSecurityStore.setState(INITIAL_APP_LOCK_STATE);
  appState.currentState = "active";
  appState.addEventListener.mockImplementation(() => ({ remove: jest.fn() }));
  Secure.getItem.mockReturnValue(null);
  Secure.setItemAsync.mockResolvedValue(undefined);
  LocalAuth.authenticateAsync.mockResolvedValue({ success: true });
  LocalAuth.getEnrolledLevelAsync.mockResolvedValue(3);
  for (const fn of Object.values(mockScreenCapture)) {
    if (typeof fn === "function") fn.mockResolvedValue(undefined);
  }
  mockDismissBrowser.mockResolvedValue({ type: "dismiss" });
  originalOS = Platform.OS;
});

afterEach(() => {
  Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
});

function setOS(os: "ios" | "android") {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
}

describe("the stored setting", () => {
  it("round-trips through its record", () => {
    for (const settings of [ON_5_MIN, ON_IMMEDIATELY, APP_LOCK_OFF]) {
      expect(parseAppLockRecord(serializeAppLockSettings(settings))).toEqual(settings);
    }
    expect(JSON.parse(serializeAppLockSettings(ON_5_MIN))).toEqual({ v: 1, enabled: true, timeoutSeconds: 300 });
  });

  it("reads no record as the lock off", () => {
    expect(parseAppLockRecord(null)).toEqual(APP_LOCK_OFF);
  });

  it("fails closed on a record that does not check out", () => {
    for (const raw of [
      "not json",
      "null",
      "[]",
      JSON.stringify({ v: 2, enabled: false, timeoutSeconds: 300 }),
      JSON.stringify({ v: 1, enabled: "no", timeoutSeconds: 300 }),
      JSON.stringify({ v: 1, enabled: false, timeoutSeconds: 42 }),
    ]) {
      expect(parseAppLockRecord(raw)).toEqual({ enabled: true, timeoutSeconds: 300 });
    }
  });

  it("reads synchronously from SecureStore, and fails closed when it throws", () => {
    Secure.getItem.mockReturnValueOnce(serializeAppLockSettings(ON_IMMEDIATELY));
    expect(readAppLockSettings()).toEqual(ON_IMMEDIATELY);
    expect(Secure.getItem).toHaveBeenCalledWith(APP_LOCK_STORAGE_KEY, expect.any(Object));
    Secure.getItem.mockImplementationOnce(() => {
      throw new Error("keychain unavailable");
    });
    expect(readAppLockSettings()).toEqual({ enabled: true, timeoutSeconds: 300 });
  });

  it("hydrates once per process: a launch with the lock on starts locked", () => {
    Secure.getItem.mockReturnValue(serializeAppLockSettings(ON_5_MIN));
    hydrateAppLock();
    expect(useSecurityStore.getState()).toMatchObject({ phase: "locked", settings: ON_5_MIN });
    useSecurityStore.setState({ phase: "unlocked" });
    hydrateAppLock();
    expect(useSecurityStore.getState().phase).toBe("unlocked");
    expect(Secure.getItem).toHaveBeenCalledTimes(1);
  });
});

describe("the AppState monitor", () => {
  beforeEach(() => useSecurityStore.setState({ settings: ON_5_MIN }));

  it("covers on background and locks on a return past the timeout", () => {
    let now = 1_000;
    startAppLockMonitor(() => now);
    const onChange = appStateListener();
    onChange("inactive");
    onChange("background");
    expect(useSecurityStore.getState()).toMatchObject({ phase: "covered", backgroundAt: 1_000 });
    now += 300_000;
    onChange("active");
    expect(useSecurityStore.getState().phase).toBe("locked");
  });

  it("unlocks on a return within the timeout", () => {
    let now = 0;
    startAppLockMonitor(() => now);
    const onChange = appStateListener();
    onChange("background");
    now = 299_000;
    onChange("active");
    expect(useSecurityStore.getState().phase).toBe("unlocked");
  });

  it("never locks for inactive alone (a Face ID prompt, Control Center)", () => {
    useSecurityStore.setState({ settings: ON_IMMEDIATELY });
    startAppLockMonitor(() => 0);
    const onChange = appStateListener();
    onChange("inactive");
    onChange("active");
    expect(useSecurityStore.getState().phase).toBe("unlocked");
  });

  it("removes its listener on dispose", () => {
    const remove = jest.fn();
    appState.addEventListener.mockReturnValueOnce({ remove });
    startAppLockMonitor().dispose();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  describe("while a prompt runs", () => {
    function pendingPrompt() {
      let resolve!: (r: { success: boolean; error?: string }) => void;
      LocalAuth.authenticateAsync.mockImplementationOnce(
        () => new Promise((r) => (resolve = r))
      );
      return (r: { success: boolean; error?: string }) => resolve(r);
    }

    it("ignores the background of Android's passcode screen", async () => {
      useSecurityStore.setState({ settings: ON_IMMEDIATELY });
      startAppLockMonitor(() => 0);
      const onChange = appStateListener();
      const finish = pendingPrompt();
      const change = changeAppLockSettings({ enabled: true, timeoutSeconds: 60 });
      await flush();
      onChange("background");
      onChange("active");
      finish({ success: true });
      await expect(change).resolves.toBe("changed");
      expect(useSecurityStore.getState()).toMatchObject({ phase: "unlocked", settings: { timeoutSeconds: 60 } });
    });

    it("reports the background once the prompt ends if the user really left", async () => {
      startAppLockMonitor(() => 7);
      const onChange = appStateListener();
      const finish = pendingPrompt();
      const change = changeAppLockSettings({ enabled: true, timeoutSeconds: 0 });
      await flush();
      onChange("background");
      appState.currentState = "background";
      finish({ success: false, error: "system_cancel" });
      await expect(change).resolves.toBe("not-authenticated");
      expect(useSecurityStore.getState()).toMatchObject({ phase: "covered", backgroundAt: 7 });
      appState.currentState = "active";
      onChange("active");
      expect(useSecurityStore.getState().phase).toBe("unlocked");
    });

    it("covers an unlock that succeeded while the user had left", async () => {
      useSecurityStore.setState({ settings: ON_IMMEDIATELY, phase: "locked", promptPending: true });
      startAppLockMonitor(() => 0);
      const onChange = appStateListener();
      const finish = pendingPrompt();
      const unlock = unlockApp();
      onChange("background");
      appState.currentState = "background";
      finish({ success: true });
      await expect(unlock).resolves.toBe(true);
      expect(useSecurityStore.getState().phase).toBe("covered");
      appState.currentState = "active";
      onChange("active");
      expect(useSecurityStore.getState().phase).toBe("locked");
    });
  });
});

describe("unlockApp", () => {
  beforeEach(() => {
    useSecurityStore.setState({ settings: ON_5_MIN, phase: "locked", promptPending: true });
  });

  it("unlocks when the prompt succeeds, asking with the passcode fallback and the ObjectOS prompt", async () => {
    await expect(unlockApp()).resolves.toBe(true);
    expect(useSecurityStore.getState()).toMatchObject({ phase: "unlocked", unlockError: null });
    expect(LocalAuth.authenticateAsync).toHaveBeenCalledWith({
      promptMessage: "Unlock ObjectOS",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
  });

  it("stays locked with no reason when cancelled", async () => {
    LocalAuth.authenticateAsync.mockResolvedValueOnce({ success: false, error: "user_cancel" });
    await expect(unlockApp()).resolves.toBe(false);
    expect(useSecurityStore.getState()).toMatchObject({ phase: "locked", unlockError: null, promptPending: false });
  });

  it("stays locked with the reason when it fails or the device has no lock", async () => {
    LocalAuth.authenticateAsync.mockResolvedValueOnce({ success: false, error: "lockout" });
    await unlockApp();
    expect(useSecurityStore.getState().unlockError).toBe("failed");
    LocalAuth.authenticateAsync.mockResolvedValueOnce({ success: false, error: "passcode_not_set" });
    await unlockApp();
    expect(useSecurityStore.getState().unlockError).toBe("no-device-lock");
  });

  it("treats a native error as a failed attempt, never leaving the prompt phase stuck", async () => {
    LocalAuth.authenticateAsync.mockRejectedValueOnce(new Error("boom"));
    await expect(unlockApp()).resolves.toBe(false);
    expect(useSecurityStore.getState()).toMatchObject({ phase: "locked", unlockError: "failed" });
  });

  it("does nothing unless locked", async () => {
    useSecurityStore.setState({ phase: "unlocked" });
    await expect(unlockApp()).resolves.toBe(false);
    useSecurityStore.setState({ phase: "unlocking" });
    await expect(unlockApp()).resolves.toBe(false);
    expect(LocalAuth.authenticateAsync).not.toHaveBeenCalled();
  });
});

describe("changeAppLockSettings — the only writer", () => {
  it("authenticates, stores, then puts the setting in effect", async () => {
    await expect(changeAppLockSettings(ON_5_MIN)).resolves.toBe("changed");
    expect(LocalAuth.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: "Change the app lock", disableDeviceFallback: false })
    );
    expect(Secure.setItemAsync).toHaveBeenCalledWith(
      APP_LOCK_STORAGE_KEY,
      serializeAppLockSettings(ON_5_MIN),
      expect.objectContaining({ keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY })
    );
    expect(useSecurityStore.getState().settings).toEqual(ON_5_MIN);
  });

  it("changes nothing when the prompt is cancelled or fails", async () => {
    LocalAuth.authenticateAsync.mockResolvedValueOnce({ success: false, error: "user_cancel" });
    await expect(changeAppLockSettings(ON_5_MIN)).resolves.toBe("not-authenticated");
    useSecurityStore.setState({ settings: ON_5_MIN });
    LocalAuth.authenticateAsync.mockResolvedValueOnce({ success: false, error: "authentication_failed" });
    await expect(changeAppLockSettings(APP_LOCK_OFF)).resolves.toBe("not-authenticated");
    expect(Secure.setItemAsync).not.toHaveBeenCalled();
    expect(useSecurityStore.getState().settings).toEqual(ON_5_MIN);
  });

  it("turning the lock off asks too", async () => {
    useSecurityStore.setState({ settings: ON_5_MIN });
    await expect(changeAppLockSettings(APP_LOCK_OFF)).resolves.toBe("changed");
    expect(LocalAuth.authenticateAsync).toHaveBeenCalledTimes(1);
    expect(useSecurityStore.getState().settings).toEqual(APP_LOCK_OFF);
  });

  it("keeps the old setting when the store write fails", async () => {
    Secure.setItemAsync.mockRejectedValueOnce(new Error("disk"));
    await expect(changeAppLockSettings(ON_5_MIN)).resolves.toBe("save-failed");
    expect(useSecurityStore.getState().settings).toEqual(APP_LOCK_OFF);
  });

  it("cannot turn the lock on without a passcode or biometrics on the device", async () => {
    LocalAuth.getEnrolledLevelAsync.mockResolvedValueOnce(0);
    await expect(changeAppLockSettings(ON_5_MIN)).resolves.toBe("unavailable");
    LocalAuth.getEnrolledLevelAsync.mockRejectedValueOnce(new Error("no module"));
    await expect(changeAppLockSettings(ON_5_MIN)).resolves.toBe("unavailable");
    LocalAuth.authenticateAsync.mockResolvedValueOnce({ success: false, error: "not_enrolled" });
    await expect(changeAppLockSettings(ON_5_MIN)).resolves.toBe("unavailable");
    expect(Secure.setItemAsync).not.toHaveBeenCalled();
  });

  it("asks nothing for the current setting or a timeout it does not offer", async () => {
    await expect(changeAppLockSettings(APP_LOCK_OFF)).resolves.toBe("unchanged");
    await expect(
      changeAppLockSettings({ enabled: true, timeoutSeconds: 42 as unknown as 0 })
    ).resolves.toBe("unchanged");
    expect(LocalAuth.authenticateAsync).not.toHaveBeenCalled();
  });
});

describe("app-switcher protection", () => {
  it("blurs the snapshot natively on iOS", async () => {
    setOS("ios");
    await applySnapshotProtection(true);
    expect(mockScreenCapture.enableAppSwitcherProtectionAsync).toHaveBeenCalledWith(1);
    await applySnapshotProtection(false);
    expect(mockScreenCapture.disableAppSwitcherProtectionAsync).toHaveBeenCalled();
    expect(mockScreenCapture.preventScreenCaptureAsync).not.toHaveBeenCalled();
  });

  it("sets FLAG_SECURE on Android under its own key", async () => {
    setOS("android");
    await applySnapshotProtection(true);
    expect(mockScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledWith("app-lock");
    await applySnapshotProtection(false);
    expect(mockScreenCapture.allowScreenCaptureAsync).toHaveBeenCalledWith("app-lock");
    expect(mockScreenCapture.enableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
  });

  it("survives a build without the module", async () => {
    setOS("ios");
    mockScreenCapture.enableAppSwitcherProtectionAsync.mockRejectedValueOnce(new Error("missing"));
    await expect(applySnapshotProtection(true)).resolves.toBeUndefined();
  });
});

describe("startAppLock", () => {
  it("follows the setting with the protection and closes the in-app browser when the lock engages", async () => {
    setOS("ios");
    const stop = startAppLock();
    expect(mockScreenCapture.disableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
    useSecurityStore.getState().dispatch({ type: "settingsCommitted", settings: ON_IMMEDIATELY });
    expect(mockScreenCapture.enableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
    appStateListener()("background");
    await flush();
    expect(mockDismissBrowser).toHaveBeenCalledTimes(1);
    stop();
    useSecurityStore.getState().dispatch({ type: "settingsCommitted", settings: APP_LOCK_OFF });
    expect(mockScreenCapture.disableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss anything on Android, where the browser is another app's screen", () => {
    setOS("android");
    const stop = startAppLock();
    useSecurityStore.getState().dispatch({ type: "settingsCommitted", settings: ON_IMMEDIATELY });
    expect(mockScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledWith("app-lock");
    appStateListener()("background");
    expect(useSecurityStore.getState().phase).toBe("covered");
    expect(mockDismissBrowser).not.toHaveBeenCalled();
    stop();
  });
});
