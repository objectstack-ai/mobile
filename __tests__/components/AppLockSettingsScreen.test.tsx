/**
 * The native app-lock settings screen: every change goes through the one
 * writer, which asks for biometrics; what the screen shows for each outcome;
 * a device with no screen lock; leaving; the layout direction.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
// Types for the matchers jest.config registers through setupFilesAfterEnv.
import type {} from "@testing-library/react-native/extend-expect";
import i18n from "~/lib/i18n";

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaView: View };
});

const mockChange = jest.fn();
jest.mock("~/lib/app-lock", () => ({
  changeAppLockSettings: (settings: unknown) => mockChange(settings),
}));

const mockLevel = jest.fn();
jest.mock("~/lib/biometric-auth", () => ({ getDeviceLockLevel: () => mockLevel() }));

import AppLockSettingsScreen from "~/app/app-lock-settings";
import {
  APP_LOCK_OFF,
  INITIAL_APP_LOCK_STATE,
  useSecurityStore,
  type AppLockSettings,
} from "~/stores/security-store";

const ON_5_MIN: AppLockSettings = { enabled: true, timeoutSeconds: 300 };

/** The stand-in writer commits like the real one when the outcome is "changed". */
function writerAnswers(outcome: string) {
  mockChange.mockImplementation(async (settings: AppLockSettings) => {
    if (outcome === "changed") {
      useSecurityStore.getState().dispatch({ type: "settingsCommitted", settings });
    }
    return outcome;
  });
}

async function renderScreen() {
  render(<AppLockSettingsScreen />);
  // The device lock level is read on mount.
  await act(async () => {});
}

/**
 * Cold-load cost, paid once outside any test's 5 s budget — the same warm-up as
 * ServerConfigScreen.test.tsx: the first render requires and transforms
 * react-native's lazy component getters (ScrollView, Pressable, ActivityIndicator).
 */
const COLD_LOAD_TIMEOUT_MS = 30_000;
beforeAll(() => {
  mockLevel.mockResolvedValue("biometric");
  render(<AppLockSettingsScreen />).unmount();
}, COLD_LOAD_TIMEOUT_MS);

let originalOS: typeof Platform.OS;

beforeEach(() => {
  mockChange.mockReset();
  mockBack.mockReset();
  mockReplace.mockReset();
  mockCanGoBack = true;
  mockLevel.mockReset().mockResolvedValue("biometric");
  writerAnswers("changed");
  useSecurityStore.setState(INITIAL_APP_LOCK_STATE);
  originalOS = Platform.OS;
});

afterEach(async () => {
  Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

describe("AppLockSettingsScreen", () => {
  it("shows the lock off, with no timeouts", async () => {
    await renderScreen();
    expect(screen.getByText("App lock")).toBeTruthy();
    expect(screen.getByTestId("app-lock-toggle")).not.toBeChecked();
    expect(screen.queryByTestId("app-lock-timeout-300")).toBeNull();
    expect(
      screen.getByText(
        "Changing the app lock asks for Face ID, Touch ID or fingerprint, or your phone's passcode."
      )
    ).toBeTruthy();
  });

  it("turning it on goes through the writer, at the current timeout", async () => {
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId("app-lock-toggle"));
    });
    expect(mockChange).toHaveBeenCalledWith({ enabled: true, timeoutSeconds: 300 });
    expect(screen.getByTestId("app-lock-toggle")).toBeChecked();
    expect(screen.getByTestId("app-lock-timeout-selected-300")).toBeTruthy();
    expect(screen.queryByTestId("app-lock-message")).toBeNull();
  });

  it("offers the five timeouts and changes one through the writer", async () => {
    useSecurityStore.setState({ settings: ON_5_MIN });
    await renderScreen();
    for (const [seconds, label] of [
      [0, "Immediately"],
      [60, "After 1 minute"],
      [300, "After 5 minutes"],
      [900, "After 15 minutes"],
      [3600, "After 1 hour"],
    ] as const) {
      expect(screen.getByTestId(`app-lock-timeout-${seconds}`)).toHaveTextContent(label);
    }
    await act(async () => {
      fireEvent.press(screen.getByTestId("app-lock-timeout-60"));
    });
    expect(mockChange).toHaveBeenCalledWith({ enabled: true, timeoutSeconds: 60 });
    expect(screen.getByTestId("app-lock-timeout-selected-60")).toBeTruthy();
    expect(screen.queryByTestId("app-lock-timeout-selected-300")).toBeNull();
  });

  it("turning it off goes through the writer too", async () => {
    useSecurityStore.setState({ settings: ON_5_MIN });
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId("app-lock-toggle"));
    });
    expect(mockChange).toHaveBeenCalledWith({ enabled: false, timeoutSeconds: 300 });
    expect(useSecurityStore.getState().settings).toEqual(APP_LOCK_OFF);
  });

  it("keeps the setting and says so when the prompt is cancelled or fails", async () => {
    useSecurityStore.setState({ settings: ON_5_MIN });
    writerAnswers("not-authenticated");
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId("app-lock-toggle"));
    });
    expect(screen.getByTestId("app-lock-toggle")).toBeChecked();
    expect(screen.getByTestId("app-lock-message")).toHaveTextContent(
      "Not changed: it couldn't be confirmed that it's you."
    );
  });

  it("says so when the setting could not be saved", async () => {
    writerAnswers("save-failed");
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId("app-lock-toggle"));
    });
    expect(screen.getByTestId("app-lock-message")).toHaveTextContent(
      "The setting couldn't be saved. Try again."
    );
  });

  it("cannot be turned on on a device with no screen lock", async () => {
    mockLevel.mockResolvedValue("none");
    await renderScreen();
    expect(screen.getByTestId("app-lock-toggle")).toBeDisabled();
    expect(screen.getByTestId("app-lock-unavailable")).toHaveTextContent(
      "Set up a screen lock (passcode, Face ID or fingerprint) in your phone's settings to use the app lock."
    );
    fireEvent.press(screen.getByTestId("app-lock-toggle"));
    expect(mockChange).not.toHaveBeenCalled();
  });

  it("can still be turned off on such a device", async () => {
    mockLevel.mockResolvedValue("none");
    useSecurityStore.setState({ settings: ON_5_MIN });
    await renderScreen();
    expect(screen.getByTestId("app-lock-toggle")).not.toBeDisabled();
  });

  it("learns a missing screen lock from the writer, too", async () => {
    writerAnswers("unavailable");
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId("app-lock-toggle"));
    });
    expect(screen.getByTestId("app-lock-toggle")).toBeDisabled();
  });

  it("asks once at a time: the controls wait while a change runs", async () => {
    useSecurityStore.setState({ settings: ON_5_MIN });
    let finish!: (outcome: string) => void;
    mockChange.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId("app-lock-timeout-60"));
    });
    expect(screen.getByTestId("app-lock-busy")).toBeTruthy();
    expect(screen.getByTestId("app-lock-timeout-900")).toBeDisabled();
    fireEvent.press(screen.getByTestId("app-lock-timeout-900"));
    expect(mockChange).toHaveBeenCalledTimes(1);
    await act(async () => finish("not-authenticated"));
    expect(screen.queryByTestId("app-lock-busy")).toBeNull();
  });

  it("names the platform's snapshot protection", async () => {
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
    await renderScreen();
    expect(screen.getByTestId("app-lock-privacy")).toHaveTextContent(
      "While the app lock is on, the recent apps screen shows ObjectOS blank, and screenshots and screen recording are blocked."
    );
  });

  it("goes back, or home when there is nothing behind it", async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId("app-lock-back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
    mockCanGoBack = false;
    fireEvent.press(screen.getByTestId("app-lock-back"));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("lays out right-to-left under Arabic", async () => {
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    await renderScreen();
    expect(StyleSheet.flatten(screen.getByTestId("app-lock-settings").props.style).direction).toBe(
      "rtl"
    );
    expect(screen.getByTestId("app-lock-toggle")).toHaveTextContent(/قفل التطبيق/);
  });
});
