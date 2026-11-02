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
};

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
      reload: jest.fn(),
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

import ConsoleScreen from "~/app/console";
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

  it("locked: the other saved connections can still be removed", async () => {
    useServerStore.setState({ managed: LOCKED });
    render(<ConsoleScreen />);
    await openSwitcherFromConsole();
    await act(async () => {
      fireEvent.press(screen.getByTestId("switcher-remove-acme.objectos.ai"));
    });
    expect(useServerStore.getState().connections.map((c) => c.host)).toEqual(["erp.example.com"]);
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
});
