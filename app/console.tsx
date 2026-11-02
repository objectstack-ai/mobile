import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { LoadingScreen } from "~/components/common/LoadingScreen";
import { ConnectionSwitcher } from "~/components/shell/ConnectionSwitcher";
import {
  ConsoleWebView,
  type ConsoleWebViewHandle,
  type ConsoleWebViewProps,
} from "~/components/shell/ConsoleWebView";
import { clearHostCookies } from "~/lib/connections/cookies";
import { removeAndSignOut } from "~/lib/connections/sign-out";
import { acquireDeviceToken } from "~/lib/push-notifications";
import { triggerHaptic } from "~/lib/haptics";
import { shellConfig } from "~/lib/shell/config";
import { openExternalUrl } from "~/lib/shell/external";
import { requestScan } from "~/lib/shell/bridge/scan-session";
import { DEFAULT_ROUTE_RULES } from "~/lib/shell/route-owner";
import { AVAILABLE_NATIVE_SCREENS, NATIVE_SCREENS } from "~/lib/shell/native-screens";
import { useServerStore } from "~/stores/server-store";

/**
 * The Console screen. Receives Console routes as the `route` search param
 * (from notification taps and app links) and forwards them to the WebView;
 * the `n` param distinguishes repeated requests for the same route.
 *
 * It also hosts the connection switcher (screen 8), opened from the Console
 * (bridge `showConnectionSwitcher()`) or from the failure page. Switching
 * makes another saved connection current, and the WebView follows it.
 */
export default function ConsoleScreen() {
  const router = useRouter();
  const { route, n } = useLocalSearchParams<{ route?: string; n?: string }>();
  const isReady = useServerStore((s) => s.isReady);
  const serverUrl = useServerStore((s) => s.serverUrl);
  const connections = useServerStore((s) => s.connections);
  const currentHost = useServerStore((s) => s.currentHost);
  const reset = useServerStore((s) => s.reset);
  const select = useServerStore((s) => s.select);
  const rememberRoute = useServerStore((s) => s.rememberRoute);
  const webview = useRef<ConsoleWebViewHandle>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [removingHost, setRemovingHost] = useState<string | null>(null);

  // The first route seeds the WebView source; later ones navigate it.
  const initialRoute = useRef(route ?? null).current;
  const lastRequest = useRef(`${route ?? ""}|${n ?? ""}`);
  useEffect(() => {
    const key = `${route ?? ""}|${n ?? ""}`;
    if (key === lastRequest.current) return;
    lastRequest.current = key;
    if (route) webview.current?.navigate(route);
  }, [route, n]);

  const openSwitcher = useCallback(() => setSwitcherOpen(true), []);

  const capabilities = useMemo<ConsoleWebViewProps["capabilities"]>(
    () => ({
      getPushToken: acquireDeviceToken,
      haptic: triggerHaptic,
      openExternal: openExternalUrl,
      resetServer: async () => {
        await reset();
        router.replace("/server-config");
      },
      scan: (formats) => requestScan(formats, () => router.push("/bridge-scan")),
      showConnectionSwitcher: openSwitcher,
    }),
    [reset, router, openSwitcher]
  );

  const openNative = useCallback(
    (screen: string, nativeRoute: string) => {
      const pathname = NATIVE_SCREENS[screen];
      if (pathname) router.push({ pathname: pathname as never, params: { route: nativeRoute } });
    },
    [router]
  );

  const openExternal = useCallback((url: string) => void openExternalUrl(url), []);

  const switchTo = useCallback(
    (host: string) => {
      setSwitcherOpen(false);
      void select(host);
    },
    [select]
  );

  // Back to the address step: a connection is saved only from its confirm step.
  const addConnection = useCallback(() => {
    setSwitcherOpen(false);
    router.push({ pathname: "/server-config", params: { add: "1" } });
  }, [router]);

  const removeConnection = useCallback(
    async (host: string) => {
      const state = useServerStore.getState();
      const connection = state.connections.find((c) => c.host === host);
      if (!connection || removingHost !== null) return;
      setRemovingHost(host);
      try {
        await removeAndSignOut(connection, host === state.currentHost, {
          askConsole: () =>
            webview.current?.askConsoleToRemove() ?? Promise.resolve("not-loaded" as const),
          remove: (h, opts) => useServerStore.getState().remove(h, opts),
          remaining: () => useServerStore.getState().connections.map((c) => c.serverUrl),
          clearCookies: clearHostCookies,
        });
      } finally {
        setRemovingHost(null);
      }
    },
    [removingHost]
  );

  const current = connections.find((c) => c.host === currentHost) ?? null;

  if (!isReady) return <LoadingScreen />;
  if (!serverUrl) return <Redirect href="/server-config" />;

  return (
    <>
      <ConsoleWebView
        ref={webview}
        serverUrl={serverUrl}
        initialRoute={initialRoute}
        resumeRoute={current?.lastRoute ?? null}
        serverLabel={current?.label ?? null}
        onRouteChange={rememberRoute}
        rules={DEFAULT_ROUTE_RULES}
        availableScreens={AVAILABLE_NATIVE_SCREENS}
        trustedHosts={shellConfig.trustedHosts}
        capabilities={capabilities}
        onOpenNative={openNative}
        onOpenExternal={openExternal}
        onSwitchConnection={openSwitcher}
      />
      <ConnectionSwitcher
        open={switcherOpen}
        connections={connections}
        currentHost={currentHost}
        removingHost={removingHost}
        onClose={() => setSwitcherOpen(false)}
        onSelect={switchTo}
        onRemove={(host) => void removeConnection(host)}
        onAdd={addConnection}
        onOpenSettings={() => void Linking.openSettings()}
      />
    </>
  );
}
