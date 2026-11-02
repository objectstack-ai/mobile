import React, { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import {
  ConsoleWebView,
  type ConsoleWebViewHandle,
  type ConsoleWebViewProps,
} from "~/components/shell/ConsoleWebView";
import { READY_TIMEOUT_MS } from "~/lib/shell/console-load";

const mockWebView = {
  props: null as any,
  mounts: 0,
  injectJavaScript: jest.fn(),
  reload: jest.fn(),
  goBack: jest.fn(),
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
      reload: mockWebView.reload,
      goBack: mockWebView.goBack,
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
    },
    onOpenNative: jest.fn(),
    onOpenExternal: jest.fn(),
    onChangeServer: jest.fn(),
    ...overrides,
  };
  const ref = createRef<ConsoleWebViewHandle>();
  render(<ConsoleWebView ref={ref} {...props} />);
  return { props, ref };
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

beforeEach(() => {
  mockIsConnected = true;
  mockWebView.props = null;
  mockWebView.mounts = 0;
  mockWebView.injectJavaScript.mockReset();
  mockWebView.reload.mockReset();
  mockWebView.goBack.mockReset();
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

    fireEvent.press(screen.getByTestId("shell-change-server"));
    expect(props.onChangeServer).toHaveBeenCalled();

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
      },
      onOpenNative: jest.fn(),
      onOpenExternal: jest.fn(),
      onChangeServer: jest.fn(),
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
});
