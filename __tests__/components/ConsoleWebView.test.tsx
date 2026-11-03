import React, { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";
// Types for the matchers jest.config registers through setupFilesAfterEnv.
import type {} from "@testing-library/react-native/extend-expect";
import {
  ConsoleWebView,
  type ConsoleWebViewHandle,
  type ConsoleWebViewProps,
} from "~/components/shell/ConsoleWebView";
import { READY_TIMEOUT_MS } from "~/lib/shell/console-load";
import { EXCURSION_MAX_NAVIGATIONS, EXCURSION_TIMEOUT_MS } from "~/lib/shell/sign-in-excursion";
import { BRIDGE_RESOLVE_GLOBAL, CONNECTION_REMOVED_EVENT } from "~/lib/shell/bridge/protocol";
import { INITIAL_APP_LOCK_STATE, useSecurityStore } from "~/stores/security-store";

const mockWebView = {
  props: null as any,
  /** Each mounted WebView's latest props, in mount order: what its native side calls. */
  instances: [] as any[],
  mounts: 0,
  injectJavaScript: jest.fn(),
  reload: jest.fn(),
  goBack: jest.fn(),
  clearHistory: jest.fn(),
  stopLoading: jest.fn(),
};

jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  const WebView = React.forwardRef(function MockWebView(props: any, ref: any) {
    const [index] = React.useState(() => mockWebView.instances.length);
    mockWebView.instances[index] = props;
    mockWebView.props = props;
    React.useEffect(() => {
      mockWebView.mounts += 1;
    }, []);
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: mockWebView.injectJavaScript,
      reload: mockWebView.reload,
      goBack: mockWebView.goBack,
      clearHistory: mockWebView.clearHistory,
      stopLoading: mockWebView.stopLoading,
    }));
    return <View testID={props.testID} />;
  });
  return { WebView };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

let mockIsConnected = true;
jest.mock("~/hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => ({ isConnected: mockIsConnected }),
}));

jest.mock("~/lib/install-id", () => ({
  getInstallId: () => "3b241101-e2bb-4255-8caf-4136c566a962",
}));

// The OS token listener, captured so a test can report a rotated token.
const mockTokenListeners: Array<(token: unknown) => void> = [];
const mockTokenRemove = jest.fn();
jest.mock("expo-notifications", () => ({
  ...jest.requireActual("../../__mocks__/expo-notifications"),
  addPushTokenListener: jest.fn((listener: (token: unknown) => void) => {
    mockTokenListeners.push(listener);
    return { remove: mockTokenRemove };
  }),
}));

const SERVER = "https://acme.example.com";

function renderConsole(overrides: Partial<ConsoleWebViewProps> = {}) {
  const props: ConsoleWebViewProps = {
    serverUrl: SERVER,
    initialRoute: "/apps/crm",
    rules: [{ pattern: "/approvals/*", owner: "native", screen: "approvals" }],
    availableScreens: new Set(["approvals"]),
    trustedHosts: [],
    capabilities: {
      getPushToken: jest.fn().mockResolvedValue(null),
      haptic: jest.fn(),
      openExternal: jest.fn().mockResolvedValue(undefined),
      resetServer: jest.fn().mockResolvedValue(undefined),
      scan: jest.fn().mockResolvedValue(null),
      showConnectionSwitcher: jest.fn(),
      pickImage: jest.fn().mockResolvedValue(null),
      share: jest.fn().mockResolvedValue(undefined),
      openFile: jest.fn().mockResolvedValue(undefined),
      getAppLock: jest.fn(() => ({ enabled: false, timeoutSeconds: 300 })),
      openAppLockSettings: jest.fn(),
    },
    onOpenNative: jest.fn(),
    onOpenExternal: jest.fn(),
    onSwitchConnection: jest.fn(),
    ...overrides,
  };
  const ref = createRef<ConsoleWebViewHandle>();
  const view = render(<ConsoleWebView ref={ref} {...props} />);
  return { props, ref, view };
}

/** A failed load, in react-native-webview's real order: onError, then onLoadEnd. */
function failLoad(description = "offline") {
  const props = mockWebView.props;
  const event = { nativeEvent: { description, loading: false } };
  act(() => {
    props.onError(event);
    props.onLoadEnd(event);
  });
}

function finishLoad() {
  act(() => mockWebView.props.onLoadEnd({ nativeEvent: { loading: false } }));
}

/**
 * A native load start, delivered as react-native-webview's `WebViewShared`
 * does: `onLoadStart` when the host wires one, then `onNavigationStateChange`.
 * Android fires one for every SPA history change too.
 */
function loadStart(url = `${SERVER}/_console/apps/crm`) {
  const nativeEvent = { url, loading: true, title: "", canGoBack: false, canGoForward: false };
  act(() => {
    mockWebView.props.onLoadStart?.({ nativeEvent });
    mockWebView.props.onNavigationStateChange(nativeEvent);
  });
}

/** A bridge event posted by the page, from the configured server's origin. */
async function postEvent(name: string, payload?: unknown, url = `${SERVER}/_console/home`) {
  await act(async () => {
    mockWebView.props.onMessage({
      nativeEvent: { data: JSON.stringify({ type: "event", name, payload }), url },
    });
  });
}

const consoleReady = () => postEvent("ready");

const navigatedTo = (route: string) =>
  expect.stringContaining(`${SERVER}/_console${route}`);

/** Run an injected answer in a page on `origin`: what its resolve global was called with. */
function answersSettledOn(script: string, origin: string): unknown[] {
  const settled: unknown[] = [];
  new Function("window", script)({
    location: { origin },
    [BRIDGE_RESOLVE_GLOBAL]: (result: unknown) => settled.push(result),
  });
  return settled;
}

/** The script of the last injection. */
const lastInjected = (): string => {
  const calls = mockWebView.injectJavaScript.mock.calls;
  return calls[calls.length - 1][0];
};

beforeEach(() => {
  mockIsConnected = true;
  mockWebView.props = null;
  mockWebView.instances = [];
  mockWebView.mounts = 0;
  mockWebView.injectJavaScript.mockReset();
  mockWebView.reload.mockReset();
  mockWebView.goBack.mockReset();
  mockWebView.clearHistory.mockReset();
  mockWebView.stopLoading.mockReset();
});

describe("ConsoleWebView", () => {
  it("loads the Console at the initial route with the bridge bootstrap", () => {
    renderConsole();
    expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/apps/crm` });
    expect(mockWebView.props.injectedJavaScriptBeforeContentLoaded).toContain("ObjectStackNative");
    // Android injects the early script at onPageStarted, which can race the
    // page: the same idempotent bootstrap runs again once the page has loaded.
    expect(mockWebView.props.injectedJavaScript).toBe(
      mockWebView.props.injectedJavaScriptBeforeContentLoaded
    );
    expect(mockWebView.props.applicationNameForUserAgent).toMatch(/^ObjectStackShell\//);
  });

  it("announces the install id and the pushTokenChanged capability", () => {
    renderConsole();
    const window: Record<string, any> = { location: { origin: SERVER } };
    const document = { documentElement: null, addEventListener: () => undefined };
    new Function("window", "document", mockWebView.props.injectedJavaScriptBeforeContentLoaded)(
      window,
      document
    );
    expect(window.ObjectStackNative.installId).toBe("3b241101-e2bb-4255-8caf-4136c566a962");
    expect(window.ObjectStackNative.has("pushTokenChanged")).toBe(true);
    expect(window.ObjectStackNative.has("getPushToken")).toBe(true);
  });

  describe("pushTokenChanged", () => {
    beforeEach(() => {
      mockTokenListeners.length = 0;
      mockTokenRemove.mockReset();
    });

    const rotate = (token: unknown) => act(() => mockTokenListeners[mockTokenListeners.length - 1](token));

    /** Run an injected script on a page of `origin`; return the events it dispatched. */
    function runOnPage(script: string, origin = SERVER) {
      const target = new EventTarget();
      const seen: unknown[] = [];
      target.addEventListener("objectstack-native:pushTokenChanged", (event) =>
        seen.push((event as CustomEvent).detail)
      );
      new Function("window", script)({
        CustomEvent,
        dispatchEvent: target.dispatchEvent.bind(target),
        location: { origin },
      });
      return seen;
    }

    /** The Console posts `ready` (its shell-event listeners are mounted). */
    async function postReady() {
      await act(async () => {
        mockWebView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({ type: "event", name: "ready" }),
            url: `${SERVER}/_console/home`,
          },
        });
      });
    }

    /** The events every injected pushTokenChanged script dispatched on a server page. */
    const delivered = () =>
      mockWebView.injectJavaScript.mock.calls
        .map(([script]) => script as string)
        .filter((script) => script.includes("objectstack-native:pushTokenChanged"))
        .flatMap((script) => runOnPage(script));

    it("delivers a rotated token to a ready page as a window event", async () => {
      renderConsole();
      finishLoad();
      await postReady();
      rotate({ type: "android", data: "fcm-2" });
      expect(mockWebView.injectJavaScript).toHaveBeenCalledTimes(1);
      const script = mockWebView.injectJavaScript.mock.calls[0][0];
      expect(runOnPage(script)).toEqual([{ token: "fcm-2", vendor: "fcm" }]);
      // Never to whatever else is in the main frame (a trusted sign-in host).
      expect(runOnPage(script, "https://login.idp.example")).toEqual([]);
    });

    it("holds a token reported before ready — after load end too — and delivers the latest at ready", async () => {
      renderConsole();
      rotate({ type: "ios", data: "apns-1" }); // cold start: no page yet
      finishLoad(); // document loaded, Console listeners not mounted yet
      rotate({ type: "ios", data: "apns-2" });
      expect(delivered()).toEqual([]);
      await postReady();
      expect(delivered()).toEqual([{ token: "apns-2", vendor: "apns" }]);
      // Delivered once: a second ready has nothing held.
      await postReady();
      expect(delivered()).toHaveLength(1);
    });

    it("holds a token reported while the failure page is up, for the recovered page", async () => {
      renderConsole();
      failLoad();
      rotate({ type: "android", data: "fcm-3" });
      expect(delivered()).toEqual([]);
      // A re-created WebView: the load state machine re-arms the hold itself
      // (onLoadStart is not wired; Android fires it for SPA history changes).
      fireEvent.press(screen.getByTestId("shell-retry"));
      finishLoad();
      await postReady();
      expect(delivered()).toEqual([{ token: "fcm-3", vendor: "fcm" }]);
    });

    it("re-arms the hold when a new document starts loading", async () => {
      const { ref } = renderConsole();
      finishLoad();
      await postReady();
      act(() => ref.current!.reload()); // a reload: a new document
      expect(mockWebView.reload).toHaveBeenCalledTimes(1);
      rotate({ type: "ios", data: "apns-4" });
      expect(delivered()).toEqual([]);
      await postReady();
      expect(delivered()).toEqual([{ token: "apns-4", vendor: "apns" }]);
    });

    it("delivers a token held before ready on the ready timeout (a Console that never posts ready)", () => {
      jest.useFakeTimers();
      try {
        renderConsole();
        rotate({ type: "android", data: "fcm-5" });
        finishLoad();
        act(() => jest.advanceTimersByTime(READY_TIMEOUT_MS - 1));
        expect(delivered()).toEqual([]);
        act(() => jest.advanceTimersByTime(1));
        expect(delivered()).toEqual([{ token: "fcm-5", vendor: "fcm" }]);
      } finally {
        jest.useRealTimers();
      }
    });

    it("keeps delivering after an in-app navigation (no second ready follows one)", async () => {
      renderConsole();
      finishLoad();
      await postReady();
      await postEvent("routeChanged", { route: "/apps/crm/lead/9" });
      act(() =>
        mockWebView.props.onNavigationStateChange({ url: `${SERVER}/_console/apps/crm/lead/9`, canGoBack: true })
      );
      rotate({ type: "android", data: "fcm-6" });
      expect(delivered()).toEqual([{ token: "fcm-6", vendor: "fcm" }]);
    });

    it("ignores a report that is not a native token", async () => {
      renderConsole();
      finishLoad();
      await postReady();
      rotate({ type: "ios", data: "" });
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    });

    it("stops listening when unmounted", () => {
      renderConsole();
      screen.unmount();
      expect(mockTokenRemove).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the loading cover up past load end until the Console says ready", async () => {
    renderConsole();
    expect(screen.getByText("Loading…")).toBeTruthy();
    finishLoad();
    expect(screen.getByText("Loading…")).toBeTruthy();
    await consoleReady();
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  it("lifts the cover on ready even before load end", async () => {
    renderConsole();
    await consoleReady();
    expect(screen.queryByText("Loading…")).toBeNull();
    finishLoad();
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  it("ignores ready from a page on another origin", async () => {
    renderConsole();
    finishLoad();
    await postEvent("ready", undefined, "https://evil.example.com/");
    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("applies the navigation policy", () => {
    const { props } = renderConsole();
    const decide = (url: string, isTopFrame = true) =>
      mockWebView.props.onShouldStartLoadWithRequest({ url, isTopFrame });

    expect(decide(`${SERVER}/_console/home`)).toBe(true);
    expect(decide("https://docs.example.org/x")).toBe(false);
    expect(props.onOpenExternal).toHaveBeenCalledWith("https://docs.example.org/x");
    expect(decide(`${SERVER}/_console/approvals/7`)).toBe(false);
    expect(props.onOpenNative).toHaveBeenCalledWith("approvals", "/approvals/7");
    expect(decide("javascript:alert(1)")).toBe(false);
  });

  it("answers bridge calls by injecting the result", async () => {
    renderConsole();
    await act(async () => {
      mockWebView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: "call", id: "c1", method: "getPushToken" }),
          url: `${SERVER}/_console/home`,
        },
      });
    });
    expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining('"id":"c1","ok":true,"value":null')
    );
  });

  it("delivers an answer only to a page on the configured server's origin", async () => {
    renderConsole({ serverUrl: `${SERVER}/os` });
    await act(async () => {
      mockWebView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: "call", id: "c1", method: "getPushToken" }),
          url: `${SERVER}/os/_console/home`,
        },
      });
    });
    expect(mockWebView.injectJavaScript).toHaveBeenCalledTimes(1);
    const script = lastInjected();
    expect(answersSettledOn(script, SERVER)).toEqual([{ id: "c1", ok: true, value: null }]);
    expect(answersSettledOn(script, "https://login.idp.example")).toEqual([]);
  });

  describe("an answer whose document is gone", () => {
    /** A `scan()` from the loaded page, left open until the test settles it. */
    function openScan() {
      let settle: (text: string | null) => void = () => {};
      const scan = jest.fn(
        () => new Promise<string | null>((resolve) => (settle = resolve))
      );
      renderConsole({
        capabilities: {
          getPushToken: jest.fn().mockResolvedValue(null),
          haptic: jest.fn(),
          openExternal: jest.fn().mockResolvedValue(undefined),
          resetServer: jest.fn().mockResolvedValue(undefined),
          scan,
          showConnectionSwitcher: jest.fn(),
          pickImage: jest.fn().mockResolvedValue(null),
          share: jest.fn().mockResolvedValue(undefined),
          openFile: jest.fn().mockResolvedValue(undefined),
          getAppLock: jest.fn(() => ({ enabled: false, timeoutSeconds: 300 })),
          openAppLockSettings: jest.fn(),
        },
      });
      loadStart();
      finishLoad();
      act(() => {
        mockWebView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({ type: "call", id: "d1.1", method: "scan" }),
            url: `${SERVER}/_console/apps/crm`,
          },
        });
      });
      expect(scan).toHaveBeenCalledTimes(1);
      return (text: string | null) => act(async () => settle(text));
    }

    it("is injected into the page that asked while that page is still there", async () => {
      const settle = openScan();
      await settle("4006381333931");
      expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('"id":"d1.1","ok":true,"value":"4006381333931"')
      );
    });

    it("still settles the call after a load start in the same WebView (an in-app navigation)", async () => {
      // Android reports a load start for every SPA history change. A page that
      // really was replaced cannot match the answer: its call ids carry a
      // token of their own document (bridge-scripts.test.ts).
      const settle = openScan();
      loadStart(`${SERVER}/_console/apps/crm/lead/9`);
      await settle("4006381333931");
      expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('"id":"d1.1","ok":true,"value":"4006381333931"')
      );
      // The page is still on the server's origin, so the answer reaches it.
      expect(answersSettledOn(lastInjected(), SERVER)).toEqual([
        { id: "d1.1", ok: true, value: "4006381333931" },
      ]);
    });

    it("is dropped when the WebView was re-created meanwhile", async () => {
      const settle = openScan();
      act(() => mockWebView.props.onRenderProcessGone());
      expect(mockWebView.mounts).toBe(2);
      await settle("4006381333931");
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    });
  });

  it("injects nothing in answer to a page from another origin", async () => {
    renderConsole();
    await act(async () => {
      mockWebView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: "call", id: "c1", method: "getPushToken" }),
          url: "https://evil.example.com/",
        },
      });
    });
    expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
  });

  it("holds a route asked for on cold start past load end, and dispatches it on ready", async () => {
    // A notification tap on cold start: the Console's navigate listener mounts
    // only after its boot, so a route injected at load end would reload the page.
    const { ref } = renderConsole();
    act(() => ref.current!.navigate("/apps/hr"));
    finishLoad();
    expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    await consoleReady();
    expect(mockWebView.injectJavaScript).toHaveBeenCalledTimes(1);
    expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(navigatedTo("/apps/hr"));
  });

  it("dispatches a held route on ready that arrives before load end, once", async () => {
    const { ref } = renderConsole();
    act(() => ref.current!.navigate("/apps/hr"));
    await consoleReady();
    finishLoad();
    expect(mockWebView.injectJavaScript).toHaveBeenCalledTimes(1);
    expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(navigatedTo("/apps/hr"));
  });

  describe("when the Console never says ready", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("lifts the cover and dispatches the held route after the ready timeout", () => {
      const { ref } = renderConsole();
      act(() => ref.current!.navigate("/apps/hr"));
      finishLoad();
      act(() => jest.advanceTimersByTime(READY_TIMEOUT_MS - 1));
      expect(screen.getByText("Loading…")).toBeTruthy();
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(1));
      expect(screen.queryByText("Loading…")).toBeNull();
      expect(mockWebView.injectJavaScript).toHaveBeenCalledTimes(1);
      expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(navigatedTo("/apps/hr"));
    });

    it("does not start the timeout before the document has loaded", () => {
      renderConsole();
      act(() => jest.advanceTimersByTime(READY_TIMEOUT_MS * 3));
      expect(screen.getByText("Loading…")).toBeTruthy();
    });

    it("does not fire the timeout into a failed load", () => {
      const { ref } = renderConsole();
      act(() => ref.current!.navigate("/apps/hr"));
      finishLoad();
      act(() => mockWebView.props.onHttpError({ nativeEvent: { statusCode: 502 } }));
      act(() => jest.advanceTimersByTime(READY_TIMEOUT_MS));
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
      expect(screen.getByTestId("shell-offline-fallback")).toBeTruthy();
    });
  });

  it("navigates the page, or hands native routes off, on request", async () => {
    const { ref, props } = renderConsole();
    finishLoad();
    await consoleReady();
    act(() => ref.current!.navigate("/apps/hr"));
    expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining(`${SERVER}/_console/apps/hr`)
    );
    act(() => ref.current!.navigate("/approvals/3"));
    expect(props.onOpenNative).toHaveBeenCalledWith("approvals", "/approvals/3");
  });

  it("refuses a route that would escape the Console", async () => {
    const { ref } = renderConsole();
    finishLoad();
    await consoleReady();
    act(() => ref.current!.navigate("/../../api/v1/me"));
    act(() => ref.current!.navigate("/%2e%2e/api/v1/me"));
    expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
  });

  it("keeps a route queued on cold start across a failed load, and opens it on retry", async () => {
    const { ref } = renderConsole();
    act(() => ref.current!.navigate("/apps/hr"));
    failLoad();
    // The failing WebView must not receive the route.
    expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    expect(screen.getByTestId("shell-offline-fallback")).toBeTruthy();

    fireEvent.press(screen.getByTestId("shell-retry"));
    expect(screen.queryByTestId("shell-offline-fallback")).toBeNull();
    expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/apps/hr` });
    // It is the start route of the new WebView, so it is not injected again.
    finishLoad();
    await consoleReady();
    expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  it("queues a route requested while the failure page is shown", () => {
    const { ref } = renderConsole();
    finishLoad();
    failLoad();
    act(() => ref.current!.navigate("/apps/finance"));
    expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("shell-retry"));
    expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/apps/finance` });
  });

  it("keeps the pending route when the document fails with a 5xx", () => {
    const { ref } = renderConsole();
    act(() => ref.current!.navigate("/apps/hr"));
    act(() => {
      mockWebView.props.onHttpError({ nativeEvent: { statusCode: 502 } });
      mockWebView.props.onLoadEnd({ nativeEvent: { loading: false } });
    });
    expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("shell-retry"));
    expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/apps/hr` });
  });

  it("shows the offline page on a network failure, and retries", () => {
    const { props } = renderConsole();
    failLoad();
    expect(screen.getByTestId("shell-offline-fallback")).toBeTruthy();
    expect(screen.getByText("You're offline")).toBeTruthy();

    const secondary = screen.getByTestId("shell-switch-connection");
    expect(secondary).toHaveTextContent("Switch organization");
    fireEvent.press(secondary);
    expect(props.onSwitchConnection).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("shell-retry"));
    expect(screen.queryByTestId("shell-offline-fallback")).toBeNull();
  });

  it("retries on its own when the network comes back", () => {
    mockIsConnected = false;
    const ref = createRef<ConsoleWebViewHandle>();
    const props = {
      serverUrl: SERVER,
      rules: [],
      availableScreens: new Set<string>(),
      capabilities: {
        getPushToken: jest.fn(),
        haptic: jest.fn(),
        openExternal: jest.fn(),
        resetServer: jest.fn(),
        scan: jest.fn(),
        showConnectionSwitcher: jest.fn(),
        pickImage: jest.fn().mockResolvedValue(null),
        share: jest.fn().mockResolvedValue(undefined),
        openFile: jest.fn().mockResolvedValue(undefined),
        getAppLock: jest.fn(() => ({ enabled: false, timeoutSeconds: 300 })),
        openAppLockSettings: jest.fn(),
      },
      onOpenNative: jest.fn(),
      onOpenExternal: jest.fn(),
      onSwitchConnection: jest.fn(),
    };
    const view = render(<ConsoleWebView ref={ref} {...props} />);
    failLoad();
    expect(screen.getByTestId("shell-offline-fallback")).toBeTruthy();
    mockIsConnected = true;
    view.rerender(<ConsoleWebView ref={ref} {...props} />);
    expect(screen.queryByTestId("shell-offline-fallback")).toBeNull();
  });

  it("shows the server error page for 5xx but not for 4xx", () => {
    renderConsole();
    act(() => mockWebView.props.onHttpError({ nativeEvent: { statusCode: 404 } }));
    expect(screen.queryByTestId("shell-offline-fallback")).toBeNull();
    act(() => mockWebView.props.onHttpError({ nativeEvent: { statusCode: 503 } }));
    expect(screen.getByText("The server isn't responding")).toBeTruthy();
  });

  it("re-creates the WebView where the page was when the Android renderer is gone", () => {
    renderConsole();
    finishLoad();
    act(() =>
      mockWebView.props.onNavigationStateChange({
        url: `${SERVER}/_console/apps/crm/lead/9`,
        canGoBack: true,
      })
    );
    expect(mockWebView.mounts).toBe(1);
    act(() => mockWebView.props.onRenderProcessGone({ nativeEvent: { didCrash: true } }));
    expect(mockWebView.mounts).toBe(2);
    expect(mockWebView.reload).not.toHaveBeenCalled();
    expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/apps/crm/lead/9` });
    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("re-creates the WebView at the route the Console reported, over navigation state", async () => {
    renderConsole();
    finishLoad();
    await consoleReady();
    await postEvent("routeChanged", { route: "/apps/crm/lead/9?tab=notes" });
    // Some engines do not report SPA pushState here; once routeChanged has
    // been seen, navigation state no longer moves the last route.
    act(() =>
      mockWebView.props.onNavigationStateChange({ url: `${SERVER}/_console/apps/crm`, canGoBack: true })
    );
    act(() => mockWebView.props.onContentProcessDidTerminate());
    expect(mockWebView.props.source).toEqual({
      uri: `${SERVER}/_console/apps/crm/lead/9?tab=notes`,
    });
  });

  it("drops a routeChanged payload that is not a safe Console route", async () => {
    renderConsole();
    finishLoad();
    await postEvent("routeChanged", { route: "/../../api/v1/me" });
    await postEvent("routeChanged", "/apps/hr");
    act(() => mockWebView.props.onContentProcessDidTerminate());
    expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/apps/crm` });
  });

  it("re-creates the WebView when the iOS web content process dies", () => {
    renderConsole();
    finishLoad();
    act(() => mockWebView.props.onContentProcessDidTerminate());
    expect(mockWebView.mounts).toBe(2);
    expect(mockWebView.reload).not.toHaveBeenCalled();
    expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/apps/crm` });
  });

  it("tracks history for the Android back button", () => {
    const addSpy = jest.spyOn(BackHandler, "addEventListener");
    const Platform = require("react-native").Platform;
    const original = Platform.OS;
    Platform.OS = "android";
    try {
      renderConsole();
      const handler = addSpy.mock.calls[addSpy.mock.calls.length - 1][1] as () => boolean;
      expect(handler()).toBe(false);
      act(() => mockWebView.props.onNavigationStateChange({ canGoBack: true }));
      expect(handler()).toBe(true);
      expect(mockWebView.goBack).toHaveBeenCalled();
    } finally {
      Platform.OS = original;
      addSpy.mockRestore();
    }
  });

  it("never walks the history behind the app lock's overlay", () => {
    const addSpy = jest.spyOn(BackHandler, "addEventListener");
    const Platform = require("react-native").Platform;
    const original = Platform.OS;
    Platform.OS = "android";
    try {
      renderConsole();
      act(() => mockWebView.props.onNavigationStateChange({ canGoBack: true }));
      const handler = addSpy.mock.calls[addSpy.mock.calls.length - 1][1] as () => boolean;
      useSecurityStore.setState({ phase: "locked" });
      expect(handler()).toBe(false);
      expect(mockWebView.goBack).not.toHaveBeenCalled();
      useSecurityStore.setState({ phase: "unlocked" });
      expect(handler()).toBe(true);
      expect(mockWebView.goBack).toHaveBeenCalledTimes(1);
    } finally {
      Platform.OS = original;
      addSpy.mockRestore();
      useSecurityStore.setState(INITIAL_APP_LOCK_STATE);
    }
  });
});

describe("ConsoleWebView — saved connections", () => {
  const OTHER = "https://erp.example.com";

  /** The rendered element for `overrides`, to re-render with a changed connection. */
  function element(props: ConsoleWebViewProps, ref = createRef<ConsoleWebViewHandle>()) {
    return <ConsoleWebView ref={ref} {...props} />;
  }

  /** A bridge call posted by a page at `url`. */
  async function postCall(method: string, url: string, id = "c1") {
    await act(async () => {
      mockWebView.props.onMessage({
        nativeEvent: { data: JSON.stringify({ type: "call", id, method }), url },
      });
    });
  }

  describe("switching", () => {
    it("re-creates the WebView on the chosen host at that connection's last route", async () => {
      const { props, view } = renderConsole();
      finishLoad();
      await consoleReady();
      expect(mockWebView.mounts).toBe(1);

      view.rerender(element({ ...props, serverUrl: OTHER, resumeRoute: "/apps/hr/leave?tab=2" }));
      expect(mockWebView.mounts).toBe(2);
      expect(mockWebView.props.source).toEqual({ uri: `${OTHER}/_console/apps/hr/leave?tab=2` });
      // Nothing was injected to move the old page, and the cover is back up.
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
      expect(screen.getByText("Loading…")).toBeTruthy();
    });

    it("opens the Console's default route on a host with no last route", () => {
      const { props, view } = renderConsole();
      view.rerender(element({ ...props, serverUrl: OTHER, resumeRoute: null }));
      expect(mockWebView.props.source).toEqual({ uri: `${OTHER}/_console/home` });
    });

    it("refuses an unsafe last route and opens the default route", () => {
      const { props, view } = renderConsole();
      view.rerender(element({ ...props, serverUrl: OTHER, resumeRoute: "/../api/v1/me" }));
      expect(mockWebView.props.source).toEqual({ uri: `${OTHER}/_console/home` });
    });

    it("does not re-create the WebView for a re-render on the same connection", () => {
      const { props, view } = renderConsole();
      view.rerender(element({ ...props, resumeRoute: "/apps/hr" }));
      expect(mockWebView.mounts).toBe(1);
      expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/apps/crm` });
    });

    it("leaves the failure page for the chosen host", () => {
      const { props, view } = renderConsole();
      failLoad();
      expect(screen.getByTestId("shell-offline-fallback")).toBeTruthy();
      view.rerender(element({ ...props, serverUrl: OTHER, resumeRoute: "/apps/hr" }));
      expect(screen.queryByTestId("shell-offline-fallback")).toBeNull();
      expect(mockWebView.props.source).toEqual({ uri: `${OTHER}/_console/apps/hr` });
    });

    it("does not carry a route held for the host it leaves", async () => {
      const { props, ref, view } = renderConsole();
      act(() => ref.current?.navigate("/apps/crm/lead/1"));
      view.rerender(element({ ...props, serverUrl: OTHER, resumeRoute: null }, ref));
      finishLoad();
      await postEvent("ready", undefined, `${OTHER}/_console/home`);
      expect(mockWebView.props.source).toEqual({ uri: `${OTHER}/_console/home` });
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    });

    it("follows the new connection's origin: the host left gets no answer, the new one does", async () => {
      const { props, view } = renderConsole();
      view.rerender(element({ ...props, serverUrl: OTHER }));

      await postCall("showConnectionSwitcher", `${SERVER}/_console/home`);
      expect(props.capabilities.showConnectionSwitcher).not.toHaveBeenCalled();
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();

      await postCall("showConnectionSwitcher", `${OTHER}/_console/home`);
      expect(props.capabilities.showConnectionSwitcher).toHaveBeenCalledTimes(1);
      expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('"id":"c1","ok":true,"value":null')
      );
      // The answer is for a page on the new connection's origin only.
      expect(answersSettledOn(lastInjected(), OTHER)).toEqual([
        { id: "c1", ok: true, value: null },
      ]);
      expect(answersSettledOn(lastInjected(), SERVER)).toEqual([]);
    });

    it("gives the new host's bootstrap the new origin", () => {
      const { props, view } = renderConsole();
      view.rerender(element({ ...props, serverUrl: OTHER }));
      expect(mockWebView.props.injectedJavaScriptBeforeContentLoaded).toContain(
        '"https://erp.example.com"'
      );
    });
  });

  it("reports the Console's route changes on its server", async () => {
    const onRouteChange = jest.fn();
    renderConsole({ onRouteChange });
    await postEvent("routeChanged", { route: "/apps/crm/lead/7" });
    await postEvent("routeChanged", { route: "/apps/crm/lead/7" });
    await postEvent("routeChanged", { route: "/../api" });
    expect(onRouteChange).toHaveBeenCalledTimes(1);
    expect(onRouteChange).toHaveBeenCalledWith(SERVER, "/apps/crm/lead/7");
  });

  describe("askConsoleToRemove", () => {
    /** The id the removal script injected into the page carries. */
    function injectedRemovalId(): string {
      const script = mockWebView.injectJavaScript.mock.calls
        .map(([s]: [string]) => s)
        .find((s: string) => s.includes(CONNECTION_REMOVED_EVENT));
      if (!script) throw new Error("no removal script injected");
      return /var id = "([^"]+)"/.exec(script)![1];
    }

    async function readyConsole() {
      const handle = renderConsole();
      finishLoad();
      await consoleReady();
      return handle;
    }

    it("answers not-loaded before the Console is ready, injecting nothing", async () => {
      const { ref } = renderConsole();
      await expect(ref.current!.askConsoleToRemove()).resolves.toBe("not-loaded");
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    });

    it("answers not-loaded on the failure page", async () => {
      const { ref } = renderConsole();
      failLoad();
      await expect(ref.current!.askConsoleToRemove()).resolves.toBe("not-loaded");
    });

    it.each([
      [{ handled: true, ok: true }, "unregistered"],
      [{ handled: true, ok: false }, "failed"],
      [{ handled: false, ok: false }, "not-handled"],
    ])("reads the page's answer %j as %s", async (answer, expected) => {
      const { ref } = await readyConsole();
      let result: string | undefined;
      void ref.current!.askConsoleToRemove().then((r) => (result = r));
      const id = injectedRemovalId();
      // An answer to another request, or from another origin, settles nothing.
      await postEvent("connectionRemovedDone", { id: "someone-else", handled: true, ok: true });
      await postEvent("connectionRemovedDone", { id, ...answer }, "https://evil.example.com/");
      expect(result).toBeUndefined();
      await postEvent("connectionRemovedDone", { id, ...answer });
      expect(result).toBe(expected);
    });

    it("gives up after the timeout", async () => {
      jest.useFakeTimers();
      try {
        const { ref } = await readyConsole();
        let result: string | undefined;
        void ref.current!.askConsoleToRemove().then((r) => (result = r));
        await act(async () => {
          jest.advanceTimersByTime(10_000);
        });
        expect(result).toBe("no-answer");
      } finally {
        jest.useRealTimers();
      }
    });

    it("answers no-answer when the WebView is re-created while waiting", async () => {
      const { ref } = await readyConsole();
      let result: string | undefined;
      void ref.current!.askConsoleToRemove().then((r) => (result = r));
      await act(async () => mockWebView.props.onRenderProcessGone());
      expect(result).toBe("no-answer");
    });
  });
});

describe("ConsoleWebView — the navigation policy at load start", () => {
  const ELSEWHERE = "https://pages.elsewhere.example/form";

  function loadEndAt(url: string, loading = false) {
    act(() => mockWebView.props.onLoadEnd({ nativeEvent: { url, loading } }));
  }

  /** The Console, loaded and ready, on `route`. */
  async function onConsolePage(
    route = "/apps/crm/lead/9",
    overrides: Partial<ConsoleWebViewProps> = {}
  ) {
    const rendered = renderConsole(overrides);
    loadStart(`${SERVER}/_console/apps/crm`);
    loadEndAt(`${SERVER}/_console/apps/crm`);
    await consoleReady();
    await postEvent("routeChanged", { route });
    mockWebView.injectJavaScript.mockReset();
    return rendered;
  }

  afterEach(() => jest.useRealTimers());

  it("stops a top-frame load the policy does not keep in the WebView, opens it where the policy sends it, and goes back to the server where the Console was", async () => {
    const { props } = await onConsolePage();
    loadStart(ELSEWHERE);
    expect(mockWebView.stopLoading).toHaveBeenCalledTimes(1);
    expect(props.onOpenExternal).toHaveBeenCalledTimes(1);
    expect(props.onOpenExternal).toHaveBeenCalledWith(ELSEWHERE);
    // A new WebView on the server, at the route the Console was on, behind the cover.
    expect(mockWebView.mounts).toBe(2);
    expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/apps/crm/lead/9` });
    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("judges a load reported only at its end the same way, and never counts that load end as the Console's", async () => {
    jest.useFakeTimers();
    const { props } = await onConsolePage();
    loadEndAt(ELSEWHERE);
    expect(mockWebView.stopLoading).toHaveBeenCalledTimes(1);
    expect(props.onOpenExternal).toHaveBeenCalledWith(ELSEWHERE);
    expect(mockWebView.mounts).toBe(2);
    // The new WebView's Console has not loaded: no ready timeout lifts the cover.
    act(() => jest.advanceTimersByTime(READY_TIMEOUT_MS * 2));
    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("stops a load the policy blocks, opening nothing", async () => {
    const { props } = await onConsolePage();
    loadStart("data:text/html,page");
    expect(mockWebView.stopLoading).toHaveBeenCalledTimes(1);
    expect(props.onOpenExternal).not.toHaveBeenCalled();
    expect(mockWebView.mounts).toBe(2);
    expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/apps/crm/lead/9` });
  });

  it("keeps the server's own pages: a document, an in-app history change, a route a native screen owns", async () => {
    const { props } = await onConsolePage();
    // Android reports an in-app history change as a load start: the URL decides.
    loadStart(`${SERVER}/_console/apps/crm/lead/10`);
    loadStart(`${SERVER}/_console/approvals/7`);
    loadStart(`${SERVER}/api/v1/auth/callback/corp?code=abc`);
    loadEndAt(`${SERVER}:443/_console/home`);
    loadStart("about:blank");
    expect(mockWebView.stopLoading).not.toHaveBeenCalled();
    expect(props.onOpenExternal).not.toHaveBeenCalled();
    expect(props.onOpenNative).not.toHaveBeenCalled();
    expect(mockWebView.mounts).toBe(1);
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  it("keeps a trusted host", async () => {
    const { props } = await onConsolePage("/apps/crm", { trustedHosts: ["login.partner.example"] });
    loadStart("https://login.partner.example/authorize");
    loadEndAt("https://login.partner.example/authorize");
    expect(mockWebView.stopLoading).not.toHaveBeenCalled();
    expect(props.onOpenExternal).not.toHaveBeenCalled();
    expect(mockWebView.mounts).toBe(1);
  });

  it("shows the failure page when the server's page goes there again before a Console is ready", async () => {
    const { props } = await onConsolePage();
    loadStart(ELSEWHERE);
    expect(mockWebView.mounts).toBe(2);
    // The new WebView's page goes there again before its Console is ready.
    loadStart(`${SERVER}/_console/apps/crm/lead/9`);
    loadStart(ELSEWHERE);
    expect(mockWebView.stopLoading).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("shell-offline-fallback")).toBeTruthy();
    expect(screen.getByText("Can't show this page in the app")).toBeTruthy();
    // Opened once, re-created once.
    expect(props.onOpenExternal).toHaveBeenCalledTimes(1);
    expect(mockWebView.mounts).toBe(2);
    // Retry is the user's: one new WebView, which stops at the same page again.
    fireEvent.press(screen.getByTestId("shell-retry"));
    expect(mockWebView.mounts).toBe(3);
    loadStart(ELSEWHERE);
    expect(screen.getByTestId("shell-offline-fallback")).toBeTruthy();
    expect(props.onOpenExternal).toHaveBeenCalledTimes(1);
  });

  it("goes back to the server again once a Console has been ready in between", async () => {
    const { props } = await onConsolePage();
    loadStart(ELSEWHERE);
    loadEndAt(`${SERVER}/_console/apps/crm/lead/9`);
    await consoleReady();
    loadStart(ELSEWHERE);
    expect(screen.queryByTestId("shell-offline-fallback")).toBeNull();
    expect(props.onOpenExternal).toHaveBeenCalledTimes(2);
    expect(mockWebView.mounts).toBe(3);
  });

  it("drops the reports of the WebView it replaces", async () => {
    jest.useFakeTimers();
    const { props } = await onConsolePage();
    loadStart(ELSEWHERE);
    expect(mockWebView.mounts).toBe(2);
    const replaced = mockWebView.instances[0];
    act(() => {
      replaced.onLoadEnd({ nativeEvent: { url: ELSEWHERE, loading: false } });
      replaced.onNavigationStateChange({ url: ELSEWHERE, loading: false, canGoBack: true });
    });
    expect(props.onOpenExternal).toHaveBeenCalledTimes(1);
    expect(mockWebView.stopLoading).toHaveBeenCalledTimes(1);
    expect(mockWebView.mounts).toBe(2);
    expect(screen.queryByTestId("shell-offline-fallback")).toBeNull();
    act(() => jest.advanceTimersByTime(READY_TIMEOUT_MS * 2));
    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("never judges a report from the WebView a switch replaced against the new server", async () => {
    const { props, view } = await onConsolePage();
    view.rerender(
      <ConsoleWebView {...props} serverUrl="https://erp.example.com" resumeRoute={null} />
    );
    expect(mockWebView.mounts).toBe(2);
    // The WebView left behind was rendered once more, for the new server, before it was replaced.
    const replaced = mockWebView.instances[0];
    act(() =>
      replaced.onLoadEnd({ nativeEvent: { url: `${SERVER}/_console/home`, loading: false } })
    );
    expect(mockWebView.stopLoading).not.toHaveBeenCalled();
    expect(props.onOpenExternal).not.toHaveBeenCalled();
    expect(mockWebView.mounts).toBe(2);
    // The new server's own pages stay; the one left is another site now.
    loadStart("https://erp.example.com/_console/home");
    expect(mockWebView.mounts).toBe(2);
    loadStart(`${SERVER}/_console/home`);
    expect(props.onOpenExternal).toHaveBeenCalledWith(`${SERVER}/_console/home`);
    expect(mockWebView.mounts).toBe(3);
    expect(mockWebView.props.source).toEqual({ uri: "https://erp.example.com/_console/home" });
  });
});

describe("ConsoleWebView — sign-in excursion", () => {
  const LOGIN = `${SERVER}/_console/login?redirect=%2Fapps%2Fcrm`;
  const IDP = "https://login.idp-corp.example/oauth2/authorize?client_id=acme";
  const CALLBACK = `${SERVER}/api/v1/auth/callback/corp?code=abc&state=s`;

  /** What the WebView is told for a navigation request (`true` = load it). */
  function decide(url: string, isTopFrame: boolean | undefined = true): boolean {
    let result = false;
    act(() => {
      result = mockWebView.props.onShouldStartLoadWithRequest({ url, isTopFrame });
    });
    return result;
  }

  function loadEndAt(url: string) {
    act(() => mockWebView.props.onLoadEnd({ nativeEvent: { url, loading: false } }));
  }

  /** The Console's sign-in page, loaded and ready. */
  async function onSignInPage(overrides: Partial<ConsoleWebViewProps> = {}) {
    const rendered = renderConsole({
      initialRoute: "/login",
      serverLabel: "Acme ERP",
      ...overrides,
    });
    loadStart(LOGIN);
    loadEndAt(LOGIN);
    await consoleReady();
    mockWebView.injectJavaScript.mockReset();
    return rendered;
  }

  /** The sign-in page went to the provider, whose first page has loaded. */
  async function inExcursion(overrides: Partial<ConsoleWebViewProps> = {}) {
    const rendered = await onSignInPage(overrides);
    expect(decide(IDP)).toBe(true);
    loadEndAt(IDP);
    return rendered;
  }

  async function postCall(method: string, url: string, id = "c1") {
    await act(async () => {
      mockWebView.props.onMessage({
        nativeEvent: { data: JSON.stringify({ type: "call", id, method }), url },
      });
    });
  }

  it("loads the provider from the sign-in page, uncovered, under a bar with its host and the server", async () => {
    const { props } = await inExcursion();
    expect(props.onOpenExternal).not.toHaveBeenCalled();
    expect(screen.getByTestId("shell-excursion-host")).toHaveTextContent("login.idp-corp.example");
    expect(screen.getByText("Signing in on an external page · Acme ERP")).toBeTruthy();
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  it("names the server by its host when the connection has no label", async () => {
    await inExcursion({ serverLabel: null });
    expect(screen.getByText("Signing in on an external page · acme.example.com")).toBeTruthy();
  });

  it("sends the same page to the system browser from any other Console page", async () => {
    const { props } = renderConsole();
    loadEndAt(`${SERVER}/_console/apps/crm`);
    await consoleReady();
    expect(decide(IDP)).toBe(false);
    expect(props.onOpenExternal).toHaveBeenCalledWith(IDP);
    expect(screen.queryByTestId("shell-excursion-bar")).toBeNull();
  });

  it("keeps the system browser for plain http, even from the sign-in page", async () => {
    const { props } = await onSignInPage();
    expect(decide("http://login.idp-corp.example/authorize")).toBe(false);
    expect(props.onOpenExternal).toHaveBeenCalledWith("http://login.idp-corp.example/authorize");
    expect(screen.queryByTestId("shell-excursion-bar")).toBeNull();
  });

  it("never starts one from a sub-frame the platform reports as such", async () => {
    await onSignInPage();
    // iOS reports `isTopFrame: false`; the plain policy loads sub-frames.
    expect(decide(IDP, false)).toBe(true);
    expect(screen.queryByTestId("shell-excursion-bar")).toBeNull();
  });

  it("follows the host of the page on screen", async () => {
    await inExcursion();
    expect(decide("https://mfa.idp-corp.example/verify")).toBe(true);
    expect(screen.getByTestId("shell-excursion-host")).toHaveTextContent("mfa.idp-corp.example");
    // A page Android loads without asking (a form POST) is reported at its load.
    loadEndAt("https://federation.partner.example/saml");
    expect(screen.getByTestId("shell-excursion-host")).toHaveTextContent(
      "federation.partner.example"
    );
  });

  it("keeps the excursion's pages at load start and load end, and returns by its own rule", async () => {
    const { props } = await inExcursion();
    loadStart("https://mfa.idp-corp.example/verify");
    loadEndAt("https://mfa.idp-corp.example/verify");
    loadStart("https://federation.partner.example/saml");
    expect(screen.getByTestId("shell-excursion-host")).toHaveTextContent(
      "federation.partner.example"
    );
    expect(mockWebView.stopLoading).not.toHaveBeenCalled();
    expect(props.onOpenExternal).not.toHaveBeenCalled();
    // Back on the server: the excursion returns, nothing is stopped.
    loadStart(CALLBACK);
    loadEndAt(`${SERVER}/_console/home`);
    expect(screen.queryByTestId("shell-excursion-bar")).toBeNull();
    expect(mockWebView.stopLoading).not.toHaveBeenCalled();
    expect(mockWebView.mounts).toBe(1);
    // Outside the excursion, the provider's page is another site again.
    loadStart("https://login.idp-corp.example/session");
    expect(mockWebView.stopLoading).toHaveBeenCalledTimes(1);
    expect(props.onOpenExternal).toHaveBeenCalledWith("https://login.idp-corp.example/session");
    expect(mockWebView.mounts).toBe(2);
  });

  it("leaves a plain http page during the excursion to the excursion's own end", async () => {
    const { props } = await inExcursion();
    loadStart("http://login.idp-corp.example/next");
    expect(screen.getByTestId("shell-excursion-notice-insecure")).toBeTruthy();
    expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/login` });
    expect(mockWebView.mounts).toBe(2);
    expect(props.onOpenExternal).not.toHaveBeenCalled();
  });

  it("opens nothing for the provider's page after 取消", async () => {
    const { props } = await inExcursion();
    fireEvent.press(screen.getByTestId("shell-excursion-cancel"));
    expect(mockWebView.mounts).toBe(2);
    const replaced = mockWebView.instances[0];
    act(() => replaced.onLoadEnd({ nativeEvent: { url: IDP, loading: false } }));
    expect(props.onOpenExternal).not.toHaveBeenCalled();
    expect(mockWebView.stopLoading).not.toHaveBeenCalled();
    expect(mockWebView.mounts).toBe(2);
  });

  describe("the bridge", () => {
    it("answers no call while an excursion page is on screen, whatever origin it names", async () => {
      const { props } = await inExcursion();
      await postCall("getPushToken", IDP);
      await postCall("getPushToken", `${SERVER}/_console/login`);
      expect(props.capabilities.getPushToken).not.toHaveBeenCalled();
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    });

    it("drops the answer to a call the Console made before it left for the provider", async () => {
      let settle: (value: null) => void = () => {};
      const getPushToken = jest.fn(() => new Promise<null>((resolve) => (settle = resolve)));
      await onSignInPage({
        capabilities: {
          getPushToken,
          haptic: jest.fn(),
          openExternal: jest.fn().mockResolvedValue(undefined),
          resetServer: jest.fn().mockResolvedValue(undefined),
          scan: jest.fn().mockResolvedValue(null),
          showConnectionSwitcher: jest.fn(),
          pickImage: jest.fn().mockResolvedValue(null),
          share: jest.fn().mockResolvedValue(undefined),
          openFile: jest.fn().mockResolvedValue(undefined),
          getAppLock: jest.fn(() => ({ enabled: false, timeoutSeconds: 300 })),
          openAppLockSettings: jest.fn(),
        },
      });
      await postCall("getPushToken", LOGIN, "d1.1");
      expect(getPushToken).toHaveBeenCalledTimes(1);
      expect(decide(IDP)).toBe(true);
      await act(async () => settle(null));
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    });

    it("asks no excursion page to unregister the push token", async () => {
      const { ref } = await inExcursion();
      let result: string | undefined;
      await act(async () => {
        result = await ref.current!.askConsoleToRemove();
      });
      expect(result).toBe("not-loaded");
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    });

    it("answers the Console again once it is back", async () => {
      await inExcursion();
      expect(decide(CALLBACK)).toBe(true);
      loadEndAt(`${SERVER}/_console/home`);
      await postCall("getPushToken", `${SERVER}/_console/home`);
      expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('"id":"c1","ok":true')
      );
    });
  });

  describe("the end", () => {
    afterEach(() => jest.useRealTimers());

    it("returns: holds a route asked for meanwhile until the Console is ready again", async () => {
      jest.useFakeTimers();
      const { ref } = await inExcursion();
      act(() => ref.current!.navigate("/apps/crm/lead/9"));
      // The provider's page finishing its load never releases the route into it.
      loadEndAt("https://login.idp-corp.example/login");
      act(() => jest.advanceTimersByTime(READY_TIMEOUT_MS * 2));
      expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();

      expect(decide(CALLBACK)).toBe(true);
      expect(screen.queryByTestId("shell-excursion-bar")).toBeNull();
      // The Console boots behind the cover, as on a cold start.
      expect(screen.getByText("Loading…")).toBeTruthy();
      loadEndAt(`${SERVER}/_console/home`);
      await consoleReady();
      expect(screen.queryByText("Loading…")).toBeNull();
      expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(navigatedTo("/apps/crm/lead/9"));
      expect(mockWebView.mounts).toBe(1);
    });

    it("returns on a server page Android loads without asking (a SAML form POST)", async () => {
      await inExcursion();
      loadEndAt(`${SERVER}/_console/home`);
      expect(screen.queryByTestId("shell-excursion-bar")).toBeNull();
      expect(mockWebView.mounts).toBe(1);
    });

    it("clears Android's history back on the server, so back cannot reach the provider's pages", async () => {
      const Platform = require("react-native").Platform;
      const original = Platform.OS;
      Platform.OS = "android";
      try {
        await inExcursion();
        expect(decide(CALLBACK)).toBe(true);
        expect(mockWebView.clearHistory).not.toHaveBeenCalled();
        loadEndAt(`${SERVER}/_console/home`);
        expect(mockWebView.clearHistory).toHaveBeenCalledTimes(1);
        loadEndAt(`${SERVER}/_console/home`);
        expect(mockWebView.clearHistory).toHaveBeenCalledTimes(1);
      } finally {
        Platform.OS = original;
      }
    });

    it("取消 goes back to the server's sign-in page in a new WebView", async () => {
      await inExcursion();
      fireEvent.press(screen.getByTestId("shell-excursion-cancel"));
      expect(mockWebView.mounts).toBe(2);
      expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/login` });
      expect(screen.queryByTestId("shell-excursion-bar")).toBeNull();
      expect(screen.queryByTestId("shell-excursion-notice")).toBeNull();
    });

    it(`ends with an error after ${EXCURSION_MAX_NAVIGATIONS} navigations`, async () => {
      await inExcursion();
      for (let n = 2; n <= EXCURSION_MAX_NAVIGATIONS; n += 1) {
        expect(decide(`https://login.idp-corp.example/step/${n}`)).toBe(true);
      }
      expect(decide("https://login.idp-corp.example/loop")).toBe(false);
      expect(screen.getByTestId("shell-excursion-notice-redirects")).toBeTruthy();
      expect(mockWebView.mounts).toBe(2);
      expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/login` });
      fireEvent.press(screen.getByTestId("shell-excursion-notice-dismiss"));
      expect(screen.queryByTestId("shell-excursion-notice")).toBeNull();
    });

    it("ends with an error after the time limit", async () => {
      jest.useFakeTimers();
      await inExcursion();
      act(() => jest.advanceTimersByTime(EXCURSION_TIMEOUT_MS - 1));
      expect(screen.getByTestId("shell-excursion-bar")).toBeTruthy();
      act(() => jest.advanceTimersByTime(1));
      expect(screen.getByTestId("shell-excursion-notice-timeout")).toBeTruthy();
      expect(screen.queryByTestId("shell-excursion-bar")).toBeNull();
      expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/login` });
    });

    it("ends with an error when a page is plain http", async () => {
      const { props } = await inExcursion();
      expect(decide("http://login.idp-corp.example/next")).toBe(false);
      expect(props.onOpenExternal).not.toHaveBeenCalled();
      expect(screen.getByTestId("shell-excursion-notice-insecure")).toBeTruthy();
      expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/login` });
    });

    it("says the sign-in method is not supported yet for a provider that refuses WebViews", async () => {
      const { props } = await onSignInPage();
      expect(decide("https://accounts.google.com/o/oauth2/v2/auth?client_id=x")).toBe(false);
      expect(props.onOpenExternal).not.toHaveBeenCalled();
      expect(screen.getByTestId("shell-excursion-notice-unsupported")).toHaveTextContent(
        "This sign-in method isn't supported in the app yet. Choose another way to sign in."
      );
      expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/login` });
    });

    it("ends when the user switches to another connection", async () => {
      const { props, view } = await inExcursion();
      view.rerender(
        <ConsoleWebView {...props} serverUrl="https://erp.example.com" resumeRoute={null} />
      );
      expect(screen.queryByTestId("shell-excursion-bar")).toBeNull();
      expect(mockWebView.props.source).toEqual({ uri: "https://erp.example.com/_console/home" });
      // The other server's pages are not the excursion's.
      expect(decide(IDP)).toBe(false);
    });

    it("ends when a network failure replaces the page", async () => {
      await inExcursion();
      failLoad();
      expect(screen.getByTestId("shell-offline-fallback")).toBeTruthy();
      expect(screen.queryByTestId("shell-excursion-bar")).toBeNull();
    });
  });

  it("leaves an excursion page's own HTTP error to the provider", async () => {
    await inExcursion();
    act(() => mockWebView.props.onHttpError({ nativeEvent: { statusCode: 503, url: IDP } }));
    expect(screen.queryByTestId("shell-offline-fallback")).toBeNull();
    expect(screen.getByTestId("shell-excursion-bar")).toBeTruthy();
  });
});
