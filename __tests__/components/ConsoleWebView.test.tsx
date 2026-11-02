import React, { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import {
  ConsoleWebView,
  type ConsoleWebViewHandle,
  type ConsoleWebViewProps,
} from "~/components/shell/ConsoleWebView";

const mockWebView = {
  props: null as any,
  injectJavaScript: jest.fn(),
  reload: jest.fn(),
  goBack: jest.fn(),
};

jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  const WebView = React.forwardRef(function MockWebView(props: any, ref: any) {
    mockWebView.props = props;
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

beforeEach(() => {
  mockIsConnected = true;
  mockWebView.props = null;
  mockWebView.injectJavaScript.mockReset();
  mockWebView.reload.mockReset();
  mockWebView.goBack.mockReset();
});

describe("ConsoleWebView", () => {
  it("loads the Console at the initial route with the bridge bootstrap", () => {
    renderConsole();
    expect(mockWebView.props.source).toEqual({ uri: `${SERVER}/_console/apps/crm` });
    expect(mockWebView.props.injectedJavaScriptBeforeContentLoaded).toContain("ObjectStackNative");
    expect(mockWebView.props.applicationNameForUserAgent).toMatch(/^ObjectStackShell\//);
  });

  it("shows a loading overlay until the page finishes loading", () => {
    renderConsole();
    expect(screen.getByText("Loading…")).toBeTruthy();
    act(() => mockWebView.props.onLoadEnd({ nativeEvent: { loading: false } }));
    expect(screen.queryByText("Loading…")).toBeNull();
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

  it("does not answer pages from another origin with data", async () => {
    renderConsole();
    await act(async () => {
      mockWebView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: "call", id: "c1", method: "getPushToken" }),
          url: "https://evil.example.com/",
        },
      });
    });
    expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining("forbidden_origin")
    );
  });

  it("holds a route requested before the page loads, then applies it", () => {
    const { ref } = renderConsole();
    act(() => ref.current!.navigate("/apps/hr"));
    expect(mockWebView.injectJavaScript).not.toHaveBeenCalled();
    act(() => mockWebView.props.onLoadEnd({ nativeEvent: { loading: false } }));
    expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining(`${SERVER}/_console/apps/hr`)
    );
  });

  it("navigates the page, or hands native routes off, on request", () => {
    const { ref, props } = renderConsole();
    act(() => mockWebView.props.onLoadEnd({ nativeEvent: { loading: false } }));
    act(() => ref.current!.navigate("/apps/hr"));
    expect(mockWebView.injectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining(`${SERVER}/_console/apps/hr`)
    );
    act(() => ref.current!.navigate("/approvals/3"));
    expect(props.onOpenNative).toHaveBeenCalledWith("approvals", "/approvals/3");
  });

  it("shows the offline page on a network failure, and retries", () => {
    const { props } = renderConsole();
    act(() => mockWebView.props.onError({ nativeEvent: { description: "offline" } }));
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
    act(() => mockWebView.props.onError({ nativeEvent: { description: "offline" } }));
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

  it("reloads when the web content process dies", () => {
    renderConsole();
    act(() => mockWebView.props.onContentProcessDidTerminate());
    expect(mockWebView.reload).toHaveBeenCalled();
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
