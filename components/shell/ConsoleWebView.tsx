import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
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
import { SignInExcursionBar, SignInExcursionNotice } from "./SignInExcursionBar";
import {
  consoleUrl,
  originOf,
  parseUrl,
  routeFromConsoleUrl,
  safeConsoleRoute,
} from "~/lib/shell/console-url";
import { decideNavigation, SIGN_IN_ROUTE } from "~/lib/shell/navigation-policy";
import {
  EXCURSION_TIMEOUT_MS,
  IDLE_EXCURSION,
  stepExcursion,
  type ActiveExcursion,
  type ExcursionEvent,
  type ExcursionFailure,
  type ExcursionState,
  type ExcursionStep,
} from "~/lib/shell/sign-in-excursion";
import type { RouteRule } from "~/lib/shell/route-owner";
import {
  BRIDGE_CAPABILITIES,
  BRIDGE_PROTOCOL_VERSION,
  parseConnectionRemovedDone,
  type BridgeHostInfo,
  type PushTokenResult,
} from "~/lib/shell/bridge/protocol";
import {
  buildBootstrapScript,
  buildConnectionRemovedScript,
  buildNavigateScript,
  buildPushTokenChangedScript,
  buildResolveScript,
} from "~/lib/shell/bridge/scripts";
import type { ConsoleRemovalAnswer } from "~/lib/connections/sign-out";
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
  /**
   * Before the current connection is removed: ask the loaded Console to
   * unregister this install's push token (`objectstack-native:connectionRemoved`)
   * and wait, at most {@link CONSOLE_REMOVAL_TIMEOUT_MS}, for its answer.
   */
  askConsoleToRemove: () => Promise<ConsoleRemovalAnswer>;
}

/** How long removing the current connection waits for its Console to unregister the push token. */
export const CONSOLE_REMOVAL_TIMEOUT_MS = 10_000;

export interface ConsoleWebViewProps {
  /**
   * The current connection's server. A change is a switch: the WebView is
   * re-created on the new host, at `resumeRoute`, through the load state
   * machine's `switch` event.
   */
  serverUrl: string;
  /** Route loaded on first mount. Later route changes go through `navigate`. */
  initialRoute?: string | null;
  /** The current connection's last route — where a switch to it starts. */
  resumeRoute?: string | null;
  /** The current connection's label, shown on the sign-in excursion bar (else its host). */
  serverLabel?: string | null;
  /** The Console's route changed (`routeChanged`, else navigation state) on `serverUrl`. */
  onRouteChange?: (serverUrl: string, route: string) => void;
  rules: readonly RouteRule[];
  availableScreens: ReadonlySet<string>;
  trustedHosts?: readonly string[];
  /** Platform capabilities the bridge exposes (push, haptics, …). */
  capabilities: Omit<BridgeDeps, "serverUrl" | "navigate" | "onEvent" | "inExcursion">;
  /** A Console route that a route rule hands to a native screen. */
  onOpenNative: (screen: string, route: string) => void;
  /** Open a URL outside the WebView (system browser / OS handler). */
  onOpenExternal: (url: string) => void;
  /** The failure page's secondary action: open the connection switcher. */
  onSwitchConnection: () => void;
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
      resumeRoute,
      serverLabel,
      onRouteChange,
      rules,
      availableScreens,
      trustedHosts,
      capabilities,
      onOpenNative,
      onOpenExternal,
      onSwitchConnection,
    },
    ref
  ) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const webviewRef = useRef<WebView>(null);
    const canGoBackRef = useRef(false);
    const [failure, setFailure] = useState<LoadFailure | null>(null);

    // The WebView is re-created (new `key`) after a failed load or a dead web
    // content process — an instance whose renderer is gone cannot be
    // reloaded — and on a switch to another connection. A re-created WebView
    // starts at `start`, a server and a route fixed between re-creations:
    // re-deriving the source on every render would reload the page, and a
    // switch must not move the old WebView to the new host. Moves within a
    // live page go through `navigate`.
    const [instance, setInstance] = useState(0);
    const [start, setStart] = useState<{ serverUrl: string; route: string | null }>({
      serverUrl,
      route: initialRoute ?? null,
    });
    const source = useMemo(() => ({ uri: consoleUrl(start.serverUrl, start.route) }), [start]);
    const serverUrlRef = useRef(serverUrl);
    serverUrlRef.current = serverUrl;
    const resumeRouteRef = useRef(resumeRoute ?? null);
    resumeRouteRef.current = resumeRoute ?? null;
    const onRouteChangeRef = useRef(onRouteChange);
    onRouteChangeRef.current = onRouteChange;

    // A pending `askConsoleToRemove`: the id its script carries, and how to settle it.
    const removalRef = useRef<{
      id: string;
      settle: (answer: ConsoleRemovalAnswer) => void;
    } | null>(null);
    const settleRemoval = useCallback((answer: ConsoleRemovalAnswer) => {
      const pending = removalRef.current;
      removalRef.current = null;
      pending?.settle(answer);
    }, []);

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

    // Sign-in excursion (`lib/shell/sign-in-excursion.ts`): an off-server
    // https page loads in the top frame because the server's sign-in surface
    // went there. The machine lives in a ref, like the load state, so a
    // navigation request sees the state the previous event left; `excursion`
    // mirrors the active one for the bar.
    //
    // While one is on screen the Console is not in the main frame. In the
    // load state machine its start is the `reload` event: a new document is
    // coming, so routes and push tokens are held until the server's Console
    // says `ready` again. An excursion page's load end is not fed to it, so the
    // ready timeout cannot release them into that page. The bridge is closed.
    // An excursion that ends without returning goes back to the server's
    // sign-in page in a new WebView (the machine's `switch` event, on the same
    // host), so the provider's page and its history are gone.
    const excursionRef = useRef<ExcursionState>(IDLE_EXCURSION);
    const [excursion, setExcursion] = useState<ActiveExcursion | null>(null);
    const [excursionNotice, setExcursionNotice] = useState<ExcursionFailure | null>(null);
    // Bumped when an excursion starts or ends: an answer to a call made before
    // is never injected into the page that replaced its caller.
    const excursionEpochRef = useRef(0);
    const excursionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Set by a start, cleared by the first load end back on the server's origin.
    const awaitingServerDocumentRef = useRef(false);
    const applyExcursionRef = useRef<(event: ExcursionEvent) => ExcursionStep>(() => ({
      state: IDLE_EXCURSION,
    }));

    const clearExcursionTimer = useCallback(() => {
      if (excursionTimerRef.current !== null) clearTimeout(excursionTimerRef.current);
      excursionTimerRef.current = null;
    }, []);

    /** A new WebView, or the failure page: whatever excursion there was is gone. */
    const resetExcursion = useCallback(() => {
      clearExcursionTimer();
      if (excursionRef.current.active) excursionEpochRef.current += 1;
      excursionRef.current = IDLE_EXCURSION;
      awaitingServerDocumentRef.current = false;
      setExcursion(null);
    }, [clearExcursionTimer]);

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
        const previous = loadRef.current;
        const { state, effects } = stepConsoleLoad(previous, event);
        loadRef.current = state;
        setPhase(state.phase);
        if (
          (event.type === "routeChanged" || event.type === "navigationState") &&
          state.lastRoute !== null &&
          state.lastRoute !== previous.lastRoute
        ) {
          onRouteChangeRef.current?.(serverUrlRef.current, state.lastRoute);
        }
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
            case "recreate": {
              // On the current server; after a switch that is a new one,
              // whose start is never the old host's route.
              const server = serverUrlRef.current;
              setStart((prev) => ({
                serverUrl: server,
                route: effect.startRoute ?? (prev.serverUrl === server ? prev.route : null),
              }));
              setFailure(null);
              // A new WebView: answers to the old one's calls are dropped, and
              // a Console asked to unregister its push token is gone. So is an
              // excursion page.
              documentRef.current += 1;
              settleRemoval("no-answer");
              resetExcursion();
              setInstance((i) => i + 1);
              break;
            }
          }
        }
      },
      [goTo, sendPushToken, clearReadyTimer, settleRemoval, resetExcursion]
    );
    dispatchRef.current = dispatch;
    useEffect(() => clearReadyTimer, [clearReadyTimer]);
    useEffect(() => clearExcursionTimer, [clearExcursionTimer]);

    const applyExcursion = useCallback(
      (event: ExcursionEvent): ExcursionStep => {
        const previous = excursionRef.current;
        const step = stepExcursion(previous, event, serverUrlRef.current);
        excursionRef.current = step.state;
        if (step.state.active !== previous.active) setExcursion(step.state.active);
        if (step.started) {
          excursionEpochRef.current += 1;
          awaitingServerDocumentRef.current = true;
          setExcursionNotice(null);
          dispatch({ type: "reload" });
          clearExcursionTimer();
          excursionTimerRef.current = setTimeout(() => {
            excursionTimerRef.current = null;
            applyExcursionRef.current({ type: "tick", now: Date.now() });
          }, EXCURSION_TIMEOUT_MS);
          addBreadcrumb({
            category: "shell",
            message: "sign-in excursion started",
            data: { host: step.state.active?.host },
          });
        }
        if (step.ended) {
          clearExcursionTimer();
          excursionEpochRef.current += 1;
          addBreadcrumb({
            category: "shell",
            message: "sign-in excursion ended",
            data: { reason: step.ended },
          });
          if (step.ended !== "returned") {
            if (step.ended !== "cancelled") setExcursionNotice(step.ended);
            dispatch({ type: "switch", route: SIGN_IN_ROUTE });
          }
        }
        if (step.refused) {
          addBreadcrumb({
            category: "shell",
            message: "sign-in excursion refused",
            data: { reason: step.refused },
          });
          setExcursionNotice(step.refused);
          dispatch({ type: "switch", route: SIGN_IN_ROUTE });
        }
        return step;
      },
      [dispatch, clearExcursionTimer]
    );
    applyExcursionRef.current = applyExcursion;

    const cancelExcursion = useCallback(() => {
      applyExcursion({ type: "cancel" });
    }, [applyExcursion]);
    useEffect(() => () => settleRemoval("no-answer"), [settleRemoval]);

    // A switch to another connection: the current server changed under the
    // live WebView. The machine re-creates the WebView on the new host, at
    // that connection's last route. The old WebView keeps its own `start`
    // until then, so it is never pointed at the new host; a layout effect, so
    // the replacement lands before the next frame is drawn.
    const shownServerRef = useRef(serverUrl);
    useLayoutEffect(() => {
      if (shownServerRef.current === serverUrl) return;
      shownServerRef.current = serverUrl;
      // An excursion belongs to the connection left; the re-create ends it.
      setExcursionNotice(null);
      dispatch({ type: "switch", route: safeConsoleRoute(resumeRouteRef.current) });
    }, [serverUrl, dispatch]);

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
        resetExcursion();
        dispatch({ type: "fail" });
        setFailure(next);
      },
      [dispatch, resetExcursion]
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

    const askConsoleToRemove = useCallback(
      () =>
        new Promise<ConsoleRemovalAnswer>((resolve) => {
          const id = `rm${Date.now().toString(36)}${Math.floor(Math.random() * 2176782336).toString(36)}`;
          const script =
            loadRef.current.phase === "ready" && webviewRef.current
              ? buildConnectionRemovedScript(serverUrl, id)
              : null;
          if (!script) {
            resolve("not-loaded");
            return;
          }
          settleRemoval("no-answer");
          const timer = setTimeout(() => settleRemoval("no-answer"), CONSOLE_REMOVAL_TIMEOUT_MS);
          removalRef.current = {
            id,
            settle: (answer) => {
              clearTimeout(timer);
              resolve(answer);
            },
          };
          webviewRef.current?.injectJavaScript(script);
        }),
      [serverUrl, settleRemoval]
    );

    useImperativeHandle(ref, () => ({ navigate, reload, askConsoleToRemove }), [
      navigate,
      reload,
      askConsoleToRemove,
    ]);

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
          inExcursion: () => excursionRef.current.active !== null,
          onEvent: (name, payload) => {
            if (name === "ready") dispatch({ type: "ready" });
            if (name === "routeChanged") {
              const route = routeChangedRoute(payload);
              if (route !== null) dispatch({ type: "routeChanged", route });
            }
            if (name === "connectionRemovedDone") {
              const done = parseConnectionRemovedDone(payload);
              if (done && done.id === removalRef.current?.id) {
                settleRemoval(done.handled ? (done.ok ? "unregistered" : "failed") : "not-handled");
              }
            }
            addBreadcrumb({ category: "bridge", message: name, data: { payload } });
          },
        }),
      [capabilities, serverUrl, navigate, dispatch, settleRemoval]
    );

    const onMessage = useCallback(
      (event: WebViewMessageEvent) => {
        const caller = documentRef.current;
        const epoch = excursionEpochRef.current;
        void handleMessage(event.nativeEvent.data, event.nativeEvent.url).then((result) => {
          if (!result || documentRef.current !== caller) return;
          // An excursion started or ended since the call: the page that made
          // it is gone, and the reply would run in an excursion page or in a
          // new document.
          if (excursionEpochRef.current !== epoch || excursionRef.current.active) return;
          webviewRef.current?.injectJavaScript(buildResolveScript(result));
        });
      },
      [handleMessage]
    );

    const onShouldStartLoadWithRequest = useCallback(
      (request: ShouldStartLoadRequest) => {
        const isTopFrame = request.isTopFrame ?? true;
        const base = decideNavigation(request.url, {
          serverUrl,
          rules,
          availableScreens,
          trustedHosts,
          isTopFrame,
        });
        // A sub-frame never starts, counts in or ends an excursion. Android
        // does not report `isTopFrame`, so there every request is top-frame.
        const decision = isTopFrame
          ? (applyExcursion({ type: "request", url: request.url, base, now: Date.now() })
              .decision ?? base)
          : base;
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
      [
        serverUrl,
        rules,
        availableScreens,
        trustedHosts,
        onOpenNative,
        onOpenExternal,
        applyExcursion,
      ]
    );

    // The native WebView reports the top frame's URL: at a load start (on
    // Android also for every history change) and at a load end (on iOS also
    // for history changes). That URL is the excursion's record of where the
    // top frame is. A page message never is.
    const onLoadStart = useCallback(
      (e: { nativeEvent: { url?: string } }) => {
        const url = e.nativeEvent.url ?? "";
        if (url) applyExcursion({ type: "location", url, loaded: false, now: Date.now() });
      },
      [applyExcursion]
    );

    const onLoadEnd = useCallback(
      (e: { nativeEvent: { url?: string; loading: boolean } }) => {
        const { loading } = e.nativeEvent;
        const url = e.nativeEvent.url ?? "";
        if (url) applyExcursion({ type: "location", url, loaded: !loading, now: Date.now() });
        // `loading` is still true when a load is superseded by a redirect.
        // react-native-webview also calls this after `onError`; the load
        // state ignores it on a failed load.
        if (loading) return;
        if (awaitingServerDocumentRef.current) {
          // After an excursion, only a document back on the server's origin
          // is the Console's.
          if (excursionRef.current.active || originOf(url) !== originOf(serverUrlRef.current)) {
            return;
          }
          awaitingServerDocumentRef.current = false;
          // Android's back button walks history without asking the
          // navigation policy, so the excursion pages leave it. iOS asks the
          // policy for every back-forward navigation.
          if (Platform.OS === "android") webviewRef.current?.clearHistory?.();
        }
        dispatch({ type: "loadEnd" });
      },
      [applyExcursion, dispatch]
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
            onSwitchConnection={onSwitchConnection}
          />
        </View>
      );
    }

    const label = serverLabel || parseUrl(serverUrl)?.host || serverUrl;

    return (
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {excursion ? (
          <SignInExcursionBar host={excursion.host} serverLabel={label} onCancel={cancelExcursion} />
        ) : null}
        {excursionNotice ? (
          <SignInExcursionNotice
            reason={excursionNotice}
            onDismiss={() => setExcursionNotice(null)}
          />
        ) : null}
        <View className="flex-1">
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
            onLoadStart={onLoadStart}
            onLoadEnd={onLoadEnd}
            onError={(e) => {
              captureMessage(`console load failed: ${e.nativeEvent.description}`, "warning");
              fail({ kind: "network", description: e.nativeEvent.description });
            }}
            onHttpError={(e) => {
              // Only a server failure on the document itself replaces the page;
              // 4xx pages are the Console's (or the server's) to explain. An
              // excursion page's error is the identity provider's to explain.
              if (
                excursionRef.current.active &&
                originOf(e.nativeEvent.url ?? "") !== originOf(serverUrlRef.current)
              ) {
                return;
              }
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
          {/* An excursion page is not the Console: it shows uncovered. */}
          {phase !== "ready" && !excursion ? (
            <View className="absolute inset-0" pointerEvents="none">
              <LoadingScreen message={t("shell.loading")} />
            </View>
          ) : null}
        </View>
      </View>
    );
  }
);
