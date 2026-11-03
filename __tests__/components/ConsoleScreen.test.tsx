/**
 * The Console screen with saved connections: the switcher it hosts, switching
 * through the store, and removal's sign-out order — wired end to end, with a
 * stand-in WebView and cookie store.
 */
import "react-native-gesture-handler/jestSetup";
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
// Types for the matchers jest.config registers through setupFilesAfterEnv.
import type {} from "@testing-library/react-native/extend-expect";
import "~/lib/i18n";

const mockWebView = {
  props: null as any,
  mounts: 0,
  injectJavaScript: jest.fn(),
  reload: jest.fn(),
};

// jest.setup.ts mocks this module without a `default`, which is what
// `react-native`'s `AppState` getter reads (the app lock's overlay reads it).
jest.mock("react-native/Libraries/AppState/AppState", () => {
  const appState = {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  return { __esModule: true, default: appState, ...appState };
});

// The lock's only writer, as a stand-in that really writes: if any bridge
// path reached it, the setting would change and these tests would see it.
const mockChangeAppLockSettings = jest.fn(async (settings: unknown) => {
  const { useSecurityStore } = require("~/stores/security-store");
  useSecurityStore.getState().dispatch({ type: "settingsCommitted", settings });
  return "changed";
});
const mockUnlockApp = jest.fn(async () => false);
jest.mock("~/lib/app-lock", () => ({
  changeAppLockSettings: (settings: unknown) => mockChangeAppLockSettings(settings),
  unlockApp: () => mockUnlockApp(),
}));

jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  const WebView = React.forwardRef(function MockWebView(props: any, ref: any) {
    mockWebView.props = props;
    React.useEffect(() => {
      mockWebView.mounts += 1;
    }, []);
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: mockWebView.injectJavaScript,
      reload: mockWebView.reload,
      goBack: jest.fn(),
    }));
    return <View testID={props.testID} />;
  });
  return { WebView };
});

jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MockSwipeable = React.forwardRef(function MockSwipeable(props: any, ref: any) {
    React.useImperativeHandle(ref, () => ({ close: jest.fn() }));
    return (
      <View>
        {props.children}
        {props.renderRightActions?.({ value: 0 }, { value: 0 }, {})}
      </View>
    );
  });
  return { __esModule: true, default: MockSwipeable };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("~/hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => ({ isConnected: true }),
}));

jest.mock("~/lib/install-id", () => ({ getInstallId: () => null }));

// expo-web-browser reads AppState at import, which jest.setup stubs without it.
jest.mock("~/lib/shell/external", () => ({ openExternalUrl: jest.fn() }));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require("react-native");
    return <Text testID="redirect">{href}</Text>;
  },
}));

const mockClearHostCookies = jest.fn();
jest.mock("~/lib/connections/cookies", () => ({
  clearHostCookies: (...args: unknown[]) => mockClearHostCookies(...args),
}));

const mockFileHandoff = {
  pickImage: jest.fn(),
  shareContent: jest.fn(),
  openFileBytes: jest.fn(),
};
jest.mock("~/lib/shell/file-handoff", () => ({
  pickImage: (...args: unknown[]) => mockFileHandoff.pickImage(...args),
  shareContent: (...args: unknown[]) => mockFileHandoff.shareContent(...args),
  openFileBytes: (...args: unknown[]) => mockFileHandoff.openFileBytes(...args),
}));

import { readFileSync } from "fs";
import { join } from "path";
import ConsoleScreen from "~/app/console";
import { AppLockOverlay } from "~/components/shell/AppLockOverlay";
import { BRIDGE_METHODS } from "~/lib/shell/bridge/protocol";
import { INITIAL_APP_LOCK_STATE, useSecurityStore } from "~/stores/security-store";
import { EMPTY_CONNECTIONS, addConnection, rememberRoute } from "~/lib/connections/model";
import { NO_MANAGED_CONFIG } from "~/lib/managed-config/model";
import { CONNECTION_REMOVED_EVENT } from "~/lib/shell/bridge/protocol";
import { useServerStore } from "~/stores/server-store";

const ERP = "https://erp.example.com";
const ACME = "https://acme.objectos.ai";

/** Two saved connections: ERP (current) and Acme, last seen at /apps/hr. */
function seed() {
  let state = addConnection(
    EMPTY_CONNECTIONS,
    { kind: "server", label: "Example ERP", serverUrl: ERP, brandColor: "#0f766e", initial: "E" },
    1
  );
  state = addConnection(
    state,
    { kind: "cloud", label: "Acme", serverUrl: ACME, brandColor: "#4f46e5", initial: "A" },
    2
  );
  state = rememberRoute(state, "acme.objectos.ai", "/apps/hr");
  useServerStore.setState({
    connections: state.list,
    currentHost: "erp.example.com",
    pushLeftRegistered: [],
    serverUrl: ERP,
    isReady: true,
    managed: NO_MANAGED_CONFIG,
    managedDeclined: null,
  });
}

async function post(message: object, url: string) {
  await act(async () => {
    mockWebView.props.onMessage({ nativeEvent: { data: JSON.stringify(message), url } });
  });
}

/** The Console on `origin` has loaded and said ready. */
async function consoleReady(origin = ERP) {
  act(() => mockWebView.props.onLoadEnd({ nativeEvent: { loading: false } }));
  await post({ type: "event", name: "ready" }, `${origin}/_console/home`);
}

async function openSwitcherFromConsole(origin = ERP) {
  await post({ type: "call", id: "c1", method: "showConnectionSwitcher" }, `${origin}/_console/home`);
}

/**
 * Cold-load cost, paid once outside any test's 5 s budget — the same warm-up as
 * ServerConfigScreen.test.tsx: the first render requires and transforms
 * react-native's lazy component getters (Modal, ScrollView, ActivityIndicator).
 */
const COLD_LOAD_TIMEOUT_MS = 30_000;
beforeAll(() => {
  seed();
  render(<ConsoleScreen />).unmount();
}, COLD_LOAD_TIMEOUT_MS);

beforeEach(() => {
  seed();
  mockWebView.props = null;
  mockWebView.mounts = 0;
  mockWebView.injectJavaScript.mockReset();
  mockWebView.reload.mockReset();
  mockChangeAppLockSettings.mockClear();
  mockUnlockApp.mockClear();
  useSecurityStore.setState(INITIAL_APP_LOCK_STATE);
  mockPush.mockReset();
  mockReplace.mockReset();
  mockClearHostCookies.mockReset().mockResolvedValue({ kind: "cleared", cleared: 1, kept: 0 });
});

describe("ConsoleScreen with saved connections", () => {
  it("the Console opens the switcher; picking a connection remounts the WebView on its host and route", async () => {
    render(<ConsoleScreen />);
    expect(mockWebView.props.source).toEqual({ uri: `${ERP}/_console/home` });
    expect(screen.queryByTestId("connection-switcher")).toBeNull();

    await openSwitcherFromConsole();
    expect(screen.getByTestId("connection-switcher")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("switcher-row-acme.objectos.ai"));
    });
    expect(useServerStore.getState().serverUrl).toBe(ACME);
    expect(mockWebView.mounts).toBe(2);
    expect(mockWebView.props.source).toEqual({ uri: `${ACME}/_console/apps/hr` });
    expect(screen.queryByTestId("connection-switcher")).toBeNull();
  });

  it("remembers the route the Console reports, and a switch back resumes there", async () => {
    render(<ConsoleScreen />);
    await consoleReady();
    await post(
      { type: "event", name: "routeChanged", payload: { route: "/apps/crm/lead/7" } },
      `${ERP}/_console/apps/crm/lead/7`
    );
    expect(useServerStore.getState().connections[0].lastRoute).toBe("/apps/crm/lead/7");

    await act(async () => useServerStore.getState().select("acme.objectos.ai"));
    await act(async () => useServerStore.getState().select("erp.example.com"));
    expect(mockWebView.mounts).toBe(3);
    expect(mockWebView.props.source).toEqual({ uri: `${ERP}/_console/apps/crm/lead/7` });
  });

  it("the offline page's secondary action opens the switcher", () => {
    render(<ConsoleScreen />);
    act(() => {
      mockWebView.props.onError({ nativeEvent: { description: "offline" } });
    });
    fireEvent.press(screen.getByTestId("shell-switch-connection"));
    expect(screen.getByTestId("connection-switcher")).toBeTruthy();
  });

  it("adding goes back to the address step and saves nothing", async () => {
    render(<ConsoleScreen />);
    await openSwitcherFromConsole();
    fireEvent.press(screen.getByTestId("switcher-add"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/server-config", params: { add: "1" } });
    expect(useServerStore.getState().connections).toHaveLength(2);
    expect(screen.queryByTestId("connection-switcher")).toBeNull();
  });

  it("removing the current connection: its Console unregisters first, then the WebView moves on, then its cookies go", async () => {
    render(<ConsoleScreen />);
    await consoleReady();
    await openSwitcherFromConsole();

    await act(async () => {
      fireEvent.press(screen.getByTestId("switcher-remove-erp.example.com"));
    });
    // The Console was asked while ERP is still current and its cookies intact.
    const script = mockWebView.injectJavaScript.mock.calls
      .map(([s]: [string]) => s)
      .find((s: string) => s.includes(CONNECTION_REMOVED_EVENT));
    expect(script).toBeDefined();
    expect(useServerStore.getState().serverUrl).toBe(ERP);
    expect(mockClearHostCookies).not.toHaveBeenCalled();
    expect(screen.getByTestId("switcher-removing-erp.example.com")).toBeTruthy();

    const id = /var id = "([^"]+)"/.exec(script!)![1];
    await post(
      { type: "event", name: "connectionRemovedDone", payload: { id, handled: true, ok: true } },
      `${ERP}/_console/home`
    );

    expect(useServerStore.getState()).toMatchObject({
      serverUrl: ACME,
      pushLeftRegistered: [],
    });
    expect(useServerStore.getState().connections.map((c) => c.host)).toEqual(["acme.objectos.ai"]);
    expect(mockWebView.props.source).toEqual({ uri: `${ACME}/_console/apps/hr` });
    expect(mockClearHostCookies).toHaveBeenCalledWith(ERP, [ACME]);
    // The sheet stays open on the remaining connection.
    expect(screen.getByTestId("switcher-current-acme.objectos.ai")).toBeTruthy();
  });

  it("removing another connection records its push token as left registered and clears only its cookies", async () => {
    render(<ConsoleScreen />);
    await consoleReady();
    await openSwitcherFromConsole();
    await act(async () => {
      fireEvent.press(screen.getByTestId("switcher-remove-acme.objectos.ai"));
    });
    expect(
      mockWebView.injectJavaScript.mock.calls.some(([s]: [string]) =>
        s.includes(CONNECTION_REMOVED_EVENT)
      )
    ).toBe(false);
    expect(useServerStore.getState()).toMatchObject({
      serverUrl: ERP,
      pushLeftRegistered: ["acme.objectos.ai"],
    });
    expect(mockWebView.mounts).toBe(1);
    expect(mockClearHostCookies).toHaveBeenCalledWith(ACME, [ERP]);
  });

  it("removing the last connection gives way to the picker", async () => {
    render(<ConsoleScreen />);
    await openSwitcherFromConsole();
    await act(async () => {
      fireEvent.press(screen.getByTestId("switcher-remove-acme.objectos.ai"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("switcher-remove-erp.example.com"));
    });
    expect(useServerStore.getState().serverUrl).toBeNull();
    expect(screen.getByTestId("redirect")).toHaveTextContent("/server-config");
    expect(mockClearHostCookies).toHaveBeenLastCalledWith(ERP, []);
  });
});

describe("ConsoleScreen under a managed deployment (MDM)", () => {
  const LOCKED = { serverUrl: ERP, lockServer: true };

  it("locked: the managed connection has no Remove, nothing can be added, and resetServer() is refused", async () => {
    useServerStore.setState({ managed: LOCKED });
    render(<ConsoleScreen />);
    await consoleReady();
    await openSwitcherFromConsole();

    expect(screen.queryByTestId("switcher-add")).toBeNull();
    expect(screen.queryByTestId(`switcher-remove-erp.example.com`)).toBeNull();
    await act(async () => {
      fireEvent(screen.getByTestId("switcher-row-erp.example.com"), "accessibilityAction", {
        nativeEvent: { actionName: "remove" },
      });
    });
    expect(useServerStore.getState().connections).toHaveLength(2);
    expect(mockClearHostCookies).not.toHaveBeenCalled();

    mockWebView.injectJavaScript.mockClear();
    await post({ type: "call", id: "r1", method: "resetServer" }, `${ERP}/_console/home`);
    const answer = mockWebView.injectJavaScript.mock.calls
      .map(([script]: [string]) => script)
      .find((script: string) => script.includes("r1"));
    expect(answer).toContain('"ok":false');
    expect(answer).toContain('"failed"');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useServerStore.getState().currentHost).toBe("erp.example.com");
  });

  it("locked: the switcher lists only the managed connection; the others stay saved and return when the lock is lifted", async () => {
    // On Acme when the lock arrives: the managed connection is made current.
    useServerStore.setState({ currentHost: "acme.objectos.ai", serverUrl: ACME });
    render(<ConsoleScreen />);
    act(() => {
      useServerStore.getState().applyManaged(LOCKED);
    });
    expect(useServerStore.getState().currentHost).toBe("erp.example.com");

    await openSwitcherFromConsole(ERP);
    expect(screen.getByTestId("switcher-row-erp.example.com")).toBeTruthy();
    expect(screen.queryByTestId("switcher-row-acme.objectos.ai")).toBeNull();
    expect(screen.queryByTestId("switcher-remove-acme.objectos.ai")).toBeNull();
    // Hidden, not removed: nothing signed out, nothing dropped from the store.
    expect(useServerStore.getState().connections.map((c) => c.host)).toEqual([
      "erp.example.com",
      "acme.objectos.ai",
    ]);
    expect(mockClearHostCookies).not.toHaveBeenCalled();

    // The configuration is removed: the lock is lifted and Acme is listed again.
    act(() => {
      useServerStore.getState().applyManaged(NO_MANAGED_CONFIG);
    });
    expect(screen.getByTestId("switcher-row-acme.objectos.ai")).toBeTruthy();
    expect(screen.getByTestId("switcher-add")).toBeTruthy();
    expect(useServerStore.getState().connections).toHaveLength(2);
    expect(useServerStore.getState().currentHost).toBe("erp.example.com");
  });

  it("a managed address that waits for its confirm step hands over to the picker, before any WebView", () => {
    useServerStore.setState({
      managed: { serverUrl: "https://new.example.com", lockServer: false },
    });
    render(<ConsoleScreen />);
    expect(screen.getByTestId("redirect")).toHaveTextContent("/server-config");
    expect(mockWebView.props).toBeNull();
  });

  it("an address the MDM pushes while the app runs hands over to the picker", () => {
    render(<ConsoleScreen />);
    expect(screen.queryByTestId("redirect")).toBeNull();
    act(() => {
      useServerStore
        .getState()
        .applyManaged({ serverUrl: "https://new.example.com", lockServer: true });
    });
    expect(screen.getByTestId("redirect")).toHaveTextContent("/server-config");
  });

  describe("files", () => {
    const PDF = { base64: "JVBERi0xLjQK", name: "Quote 42.pdf", mime: "application/pdf" };

    beforeEach(() => {
      mockFileHandoff.pickImage
        .mockReset()
        .mockResolvedValue({ base64: "/9j/4AAQ", name: "IMG_0001.jpg", mime: "image/jpeg" });
      mockFileHandoff.shareContent.mockReset().mockResolvedValue(undefined);
      mockFileHandoff.openFileBytes.mockReset().mockResolvedValue(undefined);
    });

    it("the Console's pickImage, share and openFile reach the file handoff", async () => {
      render(<ConsoleScreen />);
      const page = `${ERP}/_console/apps/crm/lead/1`;
      await post({ type: "call", id: "c1", method: "pickImage", args: { camera: true } }, page);
      await post({ type: "call", id: "c2", method: "share", args: { text: "Lead 1" } }, page);
      await post({ type: "call", id: "c3", method: "openFile", args: PDF }, page);
      expect(mockFileHandoff.pickImage).toHaveBeenCalledWith({
        camera: true,
        maxWidth: 2048,
        quality: 0.8,
      });
      expect(mockFileHandoff.shareContent).toHaveBeenCalledWith({ text: "Lead 1" });
      expect(mockFileHandoff.openFileBytes).toHaveBeenCalledWith(PDF);
      const answers = mockWebView.injectJavaScript.mock.calls.map(([script]) => script).join("\n");
      expect(answers).toContain('"IMG_0001.jpg"');
    });

    it("a connection switched away from gets no file handoff", async () => {
      render(<ConsoleScreen />);
      await post({ type: "call", id: "c1", method: "openFile", args: PDF }, `${ACME}/_console/home`);
      await post({ type: "call", id: "c2", method: "pickImage" }, `${ACME}/_console/home`);
      expect(mockFileHandoff.openFileBytes).not.toHaveBeenCalled();
      expect(mockFileHandoff.pickImage).not.toHaveBeenCalled();
    });
  });
});

describe("ConsoleScreen and the app lock", () => {
  const ON_5_MIN = { enabled: true, timeoutSeconds: 300 } as const;

  /** The value the shell answered call `id` with, from the resolve script it injected. */
  function answerTo(id: string): unknown {
    for (const [script] of mockWebView.injectJavaScript.mock.calls) {
      const match = /__objectstackNativeResolve\((\{.*\})\);/.exec(script);
      if (match) {
        const result = JSON.parse(match[1]);
        if (result.id === id) return result;
      }
    }
    return undefined;
  }

  /** Lock the app the way a return past the timeout does. */
  function lockNow() {
    act(() => {
      const { dispatch } = useSecurityStore.getState();
      dispatch({ type: "background", at: 0 });
      dispatch({ type: "active", at: 300_000 });
    });
  }

  beforeEach(() => useSecurityStore.setState({ settings: ON_5_MIN }));

  it("getAppLock reads the setting; openAppLockSettings opens the native screen", async () => {
    render(<ConsoleScreen />);
    await post({ type: "call", id: "g1", method: "getAppLock" }, `${ERP}/_console/home`);
    expect(answerTo("g1")).toEqual({ id: "g1", ok: true, value: ON_5_MIN });
    await post({ type: "call", id: "o1", method: "openAppLockSettings" }, `${ERP}/_console/home`);
    expect(mockPush).toHaveBeenCalledWith("/app-lock-settings");
    expect(answerTo("o1")).toEqual({ id: "o1", ok: true, value: null });
  });

  it("the switcher's App lock row opens the native screen and shows the state", async () => {
    render(<ConsoleScreen />);
    await openSwitcherFromConsole();
    expect(screen.getByTestId("switcher-app-lock-state")).toHaveTextContent("On");
    fireEvent.press(screen.getByTestId("switcher-app-lock"));
    expect(mockPush).toHaveBeenCalledWith("/app-lock-settings");
    expect(screen.queryByTestId("connection-switcher")).toBeNull();
  });

  it("no bridge method changes the lock, whatever it is sent", async () => {
    // Every method the handler dispatches on, read from its source, so a case
    // added under an innocent name is covered too; plus write-shaped names.
    const handlerSource = readFileSync(
      join(__dirname, "../../lib/shell/bridge/handler.ts"),
      "utf8"
    );
    const handled = [...handlerSource.matchAll(/case "([A-Za-z]+)"/g)].map((m) => m[1]);
    const methods = [
      ...new Set([...BRIDGE_METHODS, ...handled, "setAppLock", "disableAppLock", "updateAppLock"]),
    ].filter((m) => m !== "resetServer");
    const hostile = { enabled: false, timeoutSeconds: 0, lock: false, appLock: false };
    render(<ConsoleScreen />);
    await consoleReady();
    let n = 0;
    for (const method of [...methods, "resetServer"]) {
      for (const args of [hostile, false, undefined]) {
        n += 1;
        await post({ type: "call", id: `w${n}`, method, args }, `${ERP}/_console/home`);
      }
    }
    expect(methods).toEqual(expect.arrayContaining(["getAppLock", "openAppLockSettings"]));
    expect(mockChangeAppLockSettings).not.toHaveBeenCalled();
    expect(useSecurityStore.getState().settings).toEqual(ON_5_MIN);
  });

  it("the WebView stays mounted under the lock, and nothing reloads or re-arms the load state", async () => {
    render(
      <>
        <ConsoleScreen />
        <AppLockOverlay />
      </>
    );
    await consoleReady();
    const source = mockWebView.props.source;
    expect(mockWebView.mounts).toBe(1);

    lockNow();
    expect(screen.getByTestId("app-lock-overlay")).toBeTruthy();
    expect(screen.getByTestId("app-lock-title")).toHaveTextContent("ObjectOS is locked");
    expect(mockUnlockApp).toHaveBeenCalledTimes(1);

    act(() => {
      const { dispatch } = useSecurityStore.getState();
      dispatch({ type: "unlockStarted" });
      dispatch({ type: "unlockFinished", ok: true });
    });
    expect(screen.queryByTestId("app-lock-overlay")).toBeNull();
    expect(mockWebView.mounts).toBe(1);
    expect(mockWebView.props.source).toBe(source);
    expect(mockWebView.reload).not.toHaveBeenCalled();
    expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();

    // Still `ready`: a route goes straight into the page, not held for a new load.
    await post(
      { type: "call", id: "n1", method: "navigate", args: { route: "/apps/crm" } },
      `${ERP}/_console/home`
    );
    const scripts = mockWebView.injectJavaScript.mock.calls.map(([script]) => script).join("\n");
    expect(scripts).toContain("objectstack-native:navigate");
    expect(scripts).toContain("/apps/crm");
  });

  it("while locked, the page cannot open UI above the overlay; the switcher closes when the lock engages", async () => {
    render(<ConsoleScreen />);
    await consoleReady();
    await openSwitcherFromConsole();
    expect(screen.getByTestId("connection-switcher")).toBeTruthy();
    lockNow();
    expect(screen.queryByTestId("connection-switcher")).toBeNull();

    await post({ type: "call", id: "s2", method: "showConnectionSwitcher" }, `${ERP}/_console/home`);
    expect(answerTo("s2")).toEqual({
      id: "s2",
      ok: false,
      error: { code: "failed", message: "The app is locked" },
    });
    expect(screen.queryByTestId("connection-switcher")).toBeNull();
    await post({ type: "call", id: "o2", method: "openAppLockSettings" }, `${ERP}/_console/home`);
    expect(mockPush).not.toHaveBeenCalledWith("/app-lock-settings");
  });
});
