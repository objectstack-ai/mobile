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
import { consoleUrl, routeFromConsoleUrl, safeConsoleRoute } from "~/lib/shell/console-url";
import { decideNavigation } from "~/lib/shell/navigation-policy";
import type { RouteRule } from "~/lib/shell/route-owner";
import {
  BRIDGE_CAPABILITIES,
  BRIDGE_PROTOCOL_VERSION,
  type BridgeHostInfo,
  type PushTokenResult,
} from "~/lib/shell/bridge/protocol";
import {
  buildBootstrapScript,
  buildNavigateScript,
  buildPushTokenChangedScript,
  buildResolveScript,
} from "~/lib/shell/bridge/scripts";
import { createBridgeHandler, type BridgeDeps } from "~/lib/shell/bridge/handler";
import {
  INITIAL_CONSOLE_LOAD_STATE,
  READY_TIMEOUT_MS,
  routeChangedRoute,
  stepConsoleLoad,
  type ConsoleLoadEvent,
  type ConsoleLoadPhase,
} from "~/lib/shell/console-load";
import { getInstallId } from "~/lib/install-id";
import { addBreadcrumb, captureMessage } from "~/lib/sentry";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { usePushTokenChanges } from "~/hooks/usePushRouting";

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
    const [failure, setFailure] = useState<LoadFailure | null>(null);

    // The WebView is re-created (new `key`) after a failed load or a dead web
    // content process: an instance whose renderer is gone cannot be reloaded.
    // A re-created WebView starts at `sourceRoute`, which is fixed between
    // re-creations — re-deriving the source on every render would reload the
    // page. Moves within a live page go through `navigate`.
    const [instance, setInstance] = useState(0);
    const [sourceRoute, setSourceRoute] = useState<string | null>(initialRoute ?? null);
    const source = useMemo(
      () => ({ uri: consoleUrl(serverUrl, sourceRoute) }),
      [serverUrl, sourceRoute]
    );

    // Cover, held route and last route follow one state machine
    // (`lib/shell/console-load.ts`). A route requested before the Console can
    // take it — while the page loads or boots (a notification tap on cold
    // start), or while the failure page is up — is held, and dispatched once
    // the Console says `ready` (or the ready timeout passes), or becomes the
    // start route of the next re-created WebView. The machine lives in a ref
    // so a bridge call sees the state the previous event left; `phase`
    // mirrors it for rendering.
    const loadRef = useRef(INITIAL_CONSOLE_LOAD_STATE);
    const [phase, setPhase] = useState<ConsoleLoadPhase>(INITIAL_CONSOLE_LOAD_STATE.phase);
    const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dispatchRef = useRef<(event: ConsoleLoadEvent) => void>(() => {});
    // Counts WebView instances: a call's answer is never sent to a re-created
    // WebView. A `scan()` stays open as long as the user takes, and recovery
    // can re-create the WebView meanwhile. Load starts do not count: Android
    // reports one for every SPA history change too. A page replaced within the
    // same WebView is covered by the bootstrap's per-document call ids. Bumped
    // only by the load state machine's `recreate` effect.
    const documentRef = useRef(0);

    const goTo = useCallback(
      (route: string) => {
        // The Console's router handles it when it listens; else a page load.
        const script = buildNavigateScript(serverUrl, route);
        if (script) webviewRef.current?.injectJavaScript(script);
      },
      [serverUrl]
    );

    const sendPushToken = useCallback(
      (token: PushTokenResult) => {
        const script = buildPushTokenChangedScript(serverUrl, token);
        if (script) webviewRef.current?.injectJavaScript(script);
      },
      [serverUrl]
    );

    const clearReadyTimer = useCallback(() => {
      if (readyTimerRef.current !== null) clearTimeout(readyTimerRef.current);
      readyTimerRef.current = null;
    }, []);

    const dispatch = useCallback(
      (event: ConsoleLoadEvent) => {
        const { state, effects } = stepConsoleLoad(loadRef.current, event);
        loadRef.current = state;
        setPhase(state.phase);
        for (const effect of effects) {
          switch (effect.type) {
            case "goTo":
              goTo(effect.route);
              break;
            case "sendPushToken":
              sendPushToken(effect.token);
              break;
            case "armReadyTimer":
              clearReadyTimer();
              readyTimerRef.current = setTimeout(() => {
                readyTimerRef.current = null;
                addBreadcrumb({ category: "shell", message: "ready timeout" });
                dispatchRef.current({ type: "readyTimeout" });
              }, READY_TIMEOUT_MS);
              break;
            case "clearReadyTimer":
              clearReadyTimer();
              break;
            case "recreate":
              if (effect.startRoute !== null) setSourceRoute(effect.startRoute);
              setFailure(null);
              // A new WebView: answers to the old one's calls are dropped.
              documentRef.current += 1;
              setInstance((i) => i + 1);
              break;
          }
        }
      },
      [goTo, sendPushToken, clearReadyTimer]
    );
    dispatchRef.current = dispatch;
    useEffect(() => clearReadyTimer, [clearReadyTimer]);

    const navigate = useCallback(
      (requested: string) => {
        const route = safeConsoleRoute(requested);
        if (route === null) return;
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
        dispatch({ type: "navigate", route });
      },
      [serverUrl, rules, availableScreens, trustedHosts, onOpenNative, dispatch]
    );

    const fail = useCallback(
      (next: LoadFailure) => {
        dispatch({ type: "fail" });
        setFailure(next);
      },
      [dispatch]
    );

    /** Re-create the WebView at the pending route, else where the page was. */
    const remount = useCallback(() => dispatch({ type: "recreate" }), [dispatch]);

    const reload = useCallback(() => {
      if (loadRef.current.phase === "failed" || !webviewRef.current) {
        remount();
        return;
      }
      dispatch({ type: "reload" });
      webviewRef.current.reload();
    }, [remount, dispatch]);

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
        installId: getInstallId(),
        capabilities: BRIDGE_CAPABILITIES,
        safeArea: {
          top: insets.top,
          bottom: insets.bottom,
          left: insets.left,
          right: insets.right,
        },
      }),
      [insets.top, insets.bottom, insets.left, insets.right]
    );
    const bootstrap = useMemo(
      () => buildBootstrapScript(hostInfo, serverUrl),
      [hostInfo, serverUrl]
    );

    // A push token the OS reports (rotation) goes to the page as
    // `objectstack-native:pushTokenChanged`. The Console installs its shell
    // event listeners in the same commit that posts `ready`, so the load
    // state machine holds a token reported outside `ready` (cold start, a
    // reload, a re-created WebView, the failure page) — the latest one only —
    // and sends it on entering `ready`, by the event or the ready timeout.
    // `onLoadStart` is not a document start: on Android react-native-webview
    // also fires it for SPA history changes (`doUpdateVisitedHistory`), and no
    // second `ready` follows those.
    const deliverPushToken = useCallback(
      (token: PushTokenResult) => dispatch({ type: "pushToken", token }),
      [dispatch]
    );
    usePushTokenChanges(deliverPushToken);

    const handleMessage = useMemo(
      () =>
        createBridgeHandler({
          ...capabilities,
          serverUrl,
          navigate,
          onEvent: (name, payload) => {
            if (name === "ready") dispatch({ type: "ready" });
            if (name === "routeChanged") {
              const route = routeChangedRoute(payload);
              if (route !== null) dispatch({ type: "routeChanged", route });
            }
            addBreadcrumb({ category: "bridge", message: name, data: { payload } });
          },
        }),
      [capabilities, serverUrl, navigate, dispatch]
    );

    const onMessage = useCallback(
      (event: WebViewMessageEvent) => {
        const caller = documentRef.current;
        void handleMessage(event.nativeEvent.data, event.nativeEvent.url).then((result) => {
          if (!result || documentRef.current !== caller) return;
          webviewRef.current?.injectJavaScript(buildResolveScript(result));
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

    const onNavigationStateChange = useCallback(
      (nav: WebViewNavigation) => {
        canGoBackRef.current = nav.canGoBack;
        // Fallback only: once the Console posts `routeChanged`, it decides.
        const route = nav.url ? routeFromConsoleUrl(serverUrl, nav.url) : null;
        dispatch({ type: "navigationState", route });
      },
      [serverUrl, dispatch]
    );

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
          key={instance}
          ref={webviewRef}
          testID="shell-console-webview"
          source={source}
          originWhitelist={["*"]}
          injectedJavaScriptBeforeContentLoaded={bootstrap}
          // Android evaluates the early script at onPageStarted, which can race
          // the page; the bootstrap is idempotent, so it runs again once the
          // page has loaded to guarantee the bridge exists.
          injectedJavaScript={bootstrap}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onNavigationStateChange={onNavigationStateChange}
          onLoadEnd={(e) => {
            // `loading` is still true when a load is superseded by a redirect.
            // react-native-webview also calls this after `onError`; the
            // load state ignores it on a failed load.
            if (!e.nativeEvent.loading) dispatch({ type: "loadEnd" });
          }}
          onError={(e) => {
            captureMessage(`console load failed: ${e.nativeEvent.description}`, "warning");
            fail({ kind: "network", description: e.nativeEvent.description });
          }}
          onHttpError={(e) => {
            // Only a server failure on the document itself replaces the page;
            // 4xx pages are the Console's (or the server's) to explain.
            if (e.nativeEvent.statusCode >= 500) {
              fail({ kind: "server", statusCode: e.nativeEvent.statusCode });
            }
          }}
          // A dead web content process (iOS) or renderer (Android) leaves the
          // instance unusable — `reload()` on it shows a blank view.
          onContentProcessDidTerminate={remount}
          onRenderProcessGone={remount}
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
        {phase !== "ready" ? (
          <View className="absolute inset-0" pointerEvents="none">
            <LoadingScreen message={t("shell.loading")} />
          </View>
        ) : null}
      </View>
    );
  }
);
