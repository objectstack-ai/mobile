import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { BackHandler, Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import type {
  ShouldStartLoadRequest,
  WebViewMessageEvent,
  WebViewNavigation,
} from "react-native-webview/lib/WebViewTypes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Constants from "expo-constants";
import { LoadingScreen } from "~/components/common/LoadingScreen";
import { OfflineFallback, type LoadFailure } from "./OfflineFallback";
import { consoleUrl } from "~/lib/shell/console-url";
import { decideNavigation } from "~/lib/shell/navigation-policy";
import type { RouteRule } from "~/lib/shell/route-owner";
import {
  BRIDGE_METHODS,
  BRIDGE_PROTOCOL_VERSION,
  type BridgeHostInfo,
} from "~/lib/shell/bridge/protocol";
import {
  buildBootstrapScript,
  buildNavigateScript,
  buildResolveScript,
} from "~/lib/shell/bridge/scripts";
import { createBridgeHandler, type BridgeDeps } from "~/lib/shell/bridge/handler";
import { addBreadcrumb, captureMessage } from "~/lib/sentry";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";

export interface ConsoleWebViewHandle {
  /** Move the Console to `route` on the configured server. */
  navigate: (route: string) => void;
  reload: () => void;
}

export interface ConsoleWebViewProps {
  serverUrl: string;
  /** Route loaded on first mount. Later route changes go through `navigate`. */
  initialRoute?: string | null;
  rules: readonly RouteRule[];
  availableScreens: ReadonlySet<string>;
  trustedHosts?: readonly string[];
  /** Platform capabilities the bridge exposes (push, haptics, …). */
  capabilities: Omit<BridgeDeps, "serverUrl" | "navigate" | "onEvent">;
  /** A Console route that a route rule hands to a native screen. */
  onOpenNative: (screen: string, route: string) => void;
  /** Open a URL outside the WebView (system browser / OS handler). */
  onOpenExternal: (url: string) => void;
  /** The user asked to pick another server (fallback page or bridge). */
  onChangeServer: () => void;
}

const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";

/**
 * The Console, hosted. Owns the WebView, the navigation policy, the bridge, the
 * Android back button, and the native loading / failure states.
 */
export const ConsoleWebView = forwardRef<ConsoleWebViewHandle, ConsoleWebViewProps>(
  function ConsoleWebView(
    {
      serverUrl,
      initialRoute,
      rules,
      availableScreens,
      trustedHosts,
      capabilities,
      onOpenNative,
      onOpenExternal,
      onChangeServer,
    },
    ref
  ) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const webviewRef = useRef<WebView>(null);
    const canGoBackRef = useRef(false);
    const [loaded, setLoaded] = useState(false);
    const [failure, setFailure] = useState<LoadFailure | null>(null);

    // The source is fixed for the life of this server: re-deriving it on every
    // render would reload the page. Later moves go through `navigate`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const source = useMemo(() => ({ uri: consoleUrl(serverUrl, initialRoute) }), [serverUrl]);

    // A route requested before the page has loaded (a notification tap on cold
    // start) is held and applied once it has — injecting into a page that is
    // still loading would be lost.
    const loadedRef = useRef(false);
    const pendingRouteRef = useRef<string | null>(null);

    const goTo = useCallback(
      (route: string) => {
        webviewRef.current?.injectJavaScript(buildNavigateScript(consoleUrl(serverUrl, route)));
      },
      [serverUrl]
    );

    const navigate = useCallback(
      (route: string) => {
        const decision = decideNavigation(consoleUrl(serverUrl, route), {
          serverUrl,
          rules,
          availableScreens,
          trustedHosts,
        });
        if (decision.kind === "native") {
          onOpenNative(decision.screen, decision.route);
          return;
        }
        if (!loadedRef.current) {
          pendingRouteRef.current = route;
          return;
        }
        goTo(route);
      },
      [serverUrl, rules, availableScreens, trustedHosts, onOpenNative, goTo]
    );

    const markLoaded = useCallback(() => {
      loadedRef.current = true;
      setLoaded(true);
      const pending = pendingRouteRef.current;
      if (pending) {
        pendingRouteRef.current = null;
        goTo(pending);
      }
    }, [goTo]);

    const reload = useCallback(() => {
      loadedRef.current = false;
      setFailure(null);
      setLoaded(false);
      webviewRef.current?.reload();
    }, []);

    useImperativeHandle(ref, () => ({ navigate, reload }), [navigate, reload]);

    // Coming back online after a network failure retries on its own.
    const { isConnected } = useNetworkStatus();
    useEffect(() => {
      if (isConnected && failure?.kind === "network") reload();
      // Only a connectivity change should trigger this, not a new failure.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected]);

    // Android hardware back: walk the Console's history before leaving the app.
    useEffect(() => {
      if (Platform.OS !== "android") return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (canGoBackRef.current && !failure) {
          webviewRef.current?.goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [failure]);

    const hostInfo = useMemo<BridgeHostInfo>(
      () => ({
        protocolVersion: BRIDGE_PROTOCOL_VERSION,
        platform: Platform.OS === "ios" ? "ios" : "android",
        appVersion: APP_VERSION,
        capabilities: BRIDGE_METHODS,
        safeArea: {
          top: insets.top,
          bottom: insets.bottom,
          left: insets.left,
          right: insets.right,
        },
      }),
      [insets.top, insets.bottom, insets.left, insets.right]
    );
    const bootstrap = useMemo(() => buildBootstrapScript(hostInfo), [hostInfo]);

    const handleMessage = useMemo(
      () =>
        createBridgeHandler({
          ...capabilities,
          serverUrl,
          navigate,
          onEvent: (name, payload) => {
            if (name === "ready") markLoaded();
            addBreadcrumb({ category: "bridge", message: name, data: { payload } });
          },
        }),
      [capabilities, serverUrl, navigate, markLoaded]
    );

    const onMessage = useCallback(
      (event: WebViewMessageEvent) => {
        void handleMessage(event.nativeEvent.data, event.nativeEvent.url).then((result) => {
          if (result) webviewRef.current?.injectJavaScript(buildResolveScript(result));
        });
      },
      [handleMessage]
    );

    const onShouldStartLoadWithRequest = useCallback(
      (request: ShouldStartLoadRequest) => {
        const decision = decideNavigation(request.url, {
          serverUrl,
          rules,
          availableScreens,
          trustedHosts,
          isTopFrame: request.isTopFrame ?? true,
        });
        switch (decision.kind) {
          case "load":
            return true;
          case "native":
            onOpenNative(decision.screen, decision.route);
            return false;
          case "external":
            onOpenExternal(decision.url);
            return false;
          default:
            return false;
        }
      },
      [serverUrl, rules, availableScreens, trustedHosts, onOpenNative, onOpenExternal]
    );

    const onNavigationStateChange = useCallback((nav: WebViewNavigation) => {
      canGoBackRef.current = nav.canGoBack;
    }, []);

    if (failure) {
      return (
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
          <OfflineFallback
            failure={failure}
            serverUrl={serverUrl}
            onRetry={reload}
            onChangeServer={onChangeServer}
          />
        </View>
      );
    }

    return (
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <WebView
          ref={webviewRef}
          testID="shell-console-webview"
          source={source}
          originWhitelist={["*"]}
          injectedJavaScriptBeforeContentLoaded={bootstrap}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onNavigationStateChange={onNavigationStateChange}
          onLoadEnd={(e) => {
            // `loading` is still true when a load is superseded by a redirect.
            if (!e.nativeEvent.loading) markLoaded();
          }}
          onError={(e) => {
            captureMessage(`console load failed: ${e.nativeEvent.description}`, "warning");
            setFailure({ kind: "network", description: e.nativeEvent.description });
          }}
          onHttpError={(e) => {
            // Only a server failure on the document itself replaces the page;
            // 4xx pages are the Console's (or the server's) to explain.
            if (e.nativeEvent.statusCode >= 500) {
              setFailure({ kind: "server", statusCode: e.nativeEvent.statusCode });
            }
          }}
          onContentProcessDidTerminate={() => webviewRef.current?.reload()}
          onRenderProcessGone={() => webviewRef.current?.reload()}
          applicationNameForUserAgent={`ObjectStackShell/${APP_VERSION}`}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          pullToRefreshEnabled={false}
          bounces={false}
          overScrollMode="never"
          allowsInlineMediaPlayback
          webviewDebuggingEnabled={__DEV__}
          style={{ flex: 1 }}
        />
        {!loaded ? (
          <View className="absolute inset-0" pointerEvents="none">
            <LoadingScreen message={t("shell.loading")} />
          </View>
        ) : null}
      </View>
    );
  }
);
