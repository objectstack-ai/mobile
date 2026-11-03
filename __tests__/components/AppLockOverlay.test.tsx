/**
 * The app lock's overlay: what each lock state shows, when the prompt starts
 * by itself, Android back, and the layout direction.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { BackHandler, StyleSheet } from "react-native";
// Types for the matchers jest.config registers through setupFilesAfterEnv.
import type {} from "@testing-library/react-native/extend-expect";
import i18n from "~/lib/i18n";

// jest.setup.ts mocks this module without a `default`, which is what
// `react-native`'s `AppState` getter reads; give it one for this file.
jest.mock("react-native/Libraries/AppState/AppState", () => {
  const appState = {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  return { __esModule: true, default: appState, ...appState };
});

const mockUnlockApp = jest.fn(async () => false);
jest.mock("~/lib/app-lock", () => ({ unlockApp: () => mockUnlockApp() }));

import { AppState } from "react-native";
import { AppLockOverlay } from "~/components/shell/AppLockOverlay";
import {
  INITIAL_APP_LOCK_STATE,
  useSecurityStore,
  type AppLockState,
} from "~/stores/security-store";

const appState = AppState as unknown as { currentState: string; addEventListener: jest.Mock };
const ON = { enabled: true, timeoutSeconds: 300 } as const;

function setLock(state: Partial<AppLockState>) {
  act(() => useSecurityStore.setState({ ...INITIAL_APP_LOCK_STATE, settings: ON, ...state }));
}

/**
 * Cold-load cost, paid once outside any test's 5 s budget — the same warm-up as
 * ServerConfigScreen.test.tsx: the first render requires and transforms
 * react-native's lazy component getters (Pressable, Text).
 */
const COLD_LOAD_TIMEOUT_MS = 30_000;
beforeAll(() => {
  useSecurityStore.setState({ ...INITIAL_APP_LOCK_STATE, settings: ON, phase: "locked" });
  render(<AppLockOverlay />).unmount();
}, COLD_LOAD_TIMEOUT_MS);

beforeEach(() => {
  mockUnlockApp.mockClear();
  appState.currentState = "active";
  appState.addEventListener.mockClear();
  useSecurityStore.setState(INITIAL_APP_LOCK_STATE);
});

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

describe("AppLockOverlay", () => {
  it("renders nothing while unlocked", () => {
    render(<AppLockOverlay />);
    expect(screen.queryByTestId("app-lock-overlay")).toBeNull();
  });

  it("covers with the mark alone while the timeout is judged, and does not prompt", () => {
    setLock({ phase: "covered", backgroundAt: 0 });
    render(<AppLockOverlay />);
    expect(screen.getByTestId("app-lock-overlay")).toBeTruthy();
    expect(screen.queryByTestId("app-lock-title")).toBeNull();
    expect(screen.queryByTestId("app-lock-unlock")).toBeNull();
    expect(mockUnlockApp).not.toHaveBeenCalled();
  });

  it("fills the screen, opaque, above what it covers", () => {
    setLock({ phase: "covered" });
    render(<AppLockOverlay />);
    const style = StyleSheet.flatten(screen.getByTestId("app-lock-overlay").props.style);
    expect(style).toMatchObject({ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 });
    expect(screen.getByTestId("app-lock-overlay").props.className).toContain("bg-background");
  });

  it("when locked, shows the title and Unlock and starts the prompt once", () => {
    setLock({ phase: "locked", promptPending: true });
    render(<AppLockOverlay />);
    expect(screen.getByTestId("app-lock-title")).toHaveTextContent("ObjectOS is locked");
    expect(screen.getByTestId("app-lock-unlock")).toHaveTextContent("Unlock");
    expect(mockUnlockApp).toHaveBeenCalledTimes(1);
  });

  it("does not prompt by itself after a cancel; Unlock asks again", () => {
    setLock({ phase: "locked", promptPending: false });
    render(<AppLockOverlay />);
    expect(mockUnlockApp).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("app-lock-unlock"));
    expect(mockUnlockApp).toHaveBeenCalledTimes(1);
  });

  it("waits for the app to be active before prompting", () => {
    appState.currentState = "background";
    setLock({ phase: "locked", promptPending: true });
    render(<AppLockOverlay />);
    expect(mockUnlockApp).not.toHaveBeenCalled();
    const calls = appState.addEventListener.mock.calls as unknown as [string, (s: string) => void][];
    const onChange = calls[calls.length - 1][1];
    onChange("inactive");
    expect(mockUnlockApp).not.toHaveBeenCalled();
    onChange("active");
    expect(mockUnlockApp).toHaveBeenCalledTimes(1);
  });

  it("disables Unlock while the prompt is on screen", () => {
    setLock({ phase: "unlocking" });
    render(<AppLockOverlay />);
    expect(screen.getByTestId("app-lock-unlock")).toBeDisabled();
  });

  it("says why the last attempt did not unlock", () => {
    setLock({ phase: "locked", unlockError: "failed" });
    render(<AppLockOverlay />);
    expect(screen.getByTestId("app-lock-error")).toHaveTextContent(
      "Couldn't confirm it's you. Try again."
    );
    setLock({ phase: "locked", unlockError: "no-device-lock" });
    expect(screen.getByTestId("app-lock-error")).toHaveTextContent(
      "Set up a screen lock in your phone's settings to unlock ObjectOS."
    );
  });

  it("goes away once unlocked", () => {
    setLock({ phase: "unlocking" });
    render(<AppLockOverlay />);
    act(() => useSecurityStore.getState().dispatch({ type: "unlockFinished", ok: true }));
    expect(screen.queryByTestId("app-lock-overlay")).toBeNull();
  });

  it("swallows Android back while up, and only then", () => {
    const add = jest.spyOn(BackHandler, "addEventListener");
    render(<AppLockOverlay />);
    expect(add).not.toHaveBeenCalled();
    setLock({ phase: "locked" });
    expect(add).toHaveBeenCalledWith("hardwareBackPress", expect.any(Function));
    const handler = add.mock.calls[add.mock.calls.length - 1][1] as () => boolean;
    expect(handler()).toBe(true);
    add.mockRestore();
  });

  it("lays out right-to-left under Arabic, with the Arabic copy", async () => {
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    setLock({ phase: "locked" });
    render(<AppLockOverlay />);
    expect(StyleSheet.flatten(screen.getByTestId("app-lock-overlay").props.style).direction).toBe(
      "rtl"
    );
    expect(screen.getByTestId("app-lock-title")).toHaveTextContent("ObjectOS مقفل");
  });
});
