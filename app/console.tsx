import { useCallback, useEffect, useMemo, useRef } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { LoadingScreen } from "~/components/common/LoadingScreen";
import {
  ConsoleWebView,
  type ConsoleWebViewHandle,
  type ConsoleWebViewProps,
} from "~/components/shell/ConsoleWebView";
import { acquireDeviceToken } from "~/lib/push-notifications";
import { triggerHaptic } from "~/lib/haptics";
import { shellConfig } from "~/lib/shell/config";
import { openExternalUrl } from "~/lib/shell/external";
import { DEFAULT_ROUTE_RULES } from "~/lib/shell/route-owner";
import { AVAILABLE_NATIVE_SCREENS, NATIVE_SCREENS } from "~/lib/shell/native-screens";
import { useServerStore } from "~/stores/server-store";

/**
 * The Console screen. Receives Console routes as the `route` search param
 * (from notification taps and app links) and forwards them to the WebView;
 * the `n` param distinguishes repeated requests for the same route.
 */
export default function ConsoleScreen() {
  const router = useRouter();
  const { route, n } = useLocalSearchParams<{ route?: string; n?: string }>();
  const isReady = useServerStore((s) => s.isReady);
  const serverUrl = useServerStore((s) => s.serverUrl);
  const reset = useServerStore((s) => s.reset);
  const webview = useRef<ConsoleWebViewHandle>(null);

  // The first route seeds the WebView source; later ones navigate it.
  const initialRoute = useRef(route ?? null).current;
  const lastRequest = useRef(`${route ?? ""}|${n ?? ""}`);
  useEffect(() => {
    const key = `${route ?? ""}|${n ?? ""}`;
    if (key === lastRequest.current) return;
    lastRequest.current = key;
    if (route) webview.current?.navigate(route);
  }, [route, n]);

  const changeServer = useCallback(() => router.push("/server-config"), [router]);

  const capabilities = useMemo<ConsoleWebViewProps["capabilities"]>(
    () => ({
      getPushToken: acquireDeviceToken,
      haptic: triggerHaptic,
      openExternal: openExternalUrl,
      resetServer: async () => {
        await reset();
        router.replace("/server-config");
      },
    }),
    [reset, router]
  );

  const openNative = useCallback(
    (screen: string, nativeRoute: string) => {
      const pathname = NATIVE_SCREENS[screen];
      if (pathname) router.push({ pathname: pathname as never, params: { route: nativeRoute } });
    },
    [router]
  );

  const openExternal = useCallback((url: string) => void openExternalUrl(url), []);

  if (!isReady) return <LoadingScreen />;
  if (!serverUrl) return <Redirect href="/server-config" />;

  return (
    <ConsoleWebView
      key={serverUrl}
      ref={webview}
      serverUrl={serverUrl}
      initialRoute={initialRoute}
      rules={DEFAULT_ROUTE_RULES}
      availableScreens={AVAILABLE_NATIVE_SCREENS}
      trustedHosts={shellConfig.trustedHosts}
      capabilities={capabilities}
      onOpenNative={openNative}
      onOpenExternal={openExternal}
      onChangeServer={changeServer}
    />
  );
}
