import "../global.css";
import i18n, { followDeviceLanguageOnForeground } from "~/lib/i18n"; // Initialize i18next before any screen calls useTranslation()
import { syncRTL, useLayoutDirection } from "~/lib/rtl";

import { useCallback, useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "~/components/common/ErrorBoundary";
import { initSentry } from "~/lib/sentry";
import { shellConfig } from "~/lib/shell/config";
import { consoleScreenHref } from "~/lib/shell/incoming-link";
import { useServerStore } from "~/stores/server-store";
import { usePushRouting } from "~/hooks/usePushRouting";

if (shellConfig.sentryDsn) {
  initSentry({ dsn: shellConfig.sentryDsn, release: shellConfig.appVersion });
}

/**
 * Root of the shell. Three screens:
 *   index         — waits for the persisted server, then redirects
 *   server-config — native server picker
 *   console       — the WebView hosting the Console
 * Native business screens, when they arrive, are added beside `console` and
 * reached through the route rules in `lib/shell/route-owner.ts`.
 */
export default function RootLayout() {
  const router = useRouter();
  const serverUrl = useServerStore((s) => s.serverUrl);
  const hydrate = useServerStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // The phone language is the only source: follow a change on next foreground,
  // and keep the persisted native direction flag in step with the language.
  const direction = useLayoutDirection();
  useEffect(() => {
    syncRTL(i18n.language);
    const onLanguageChanged = (lang: string) => syncRTL(lang);
    i18n.on("languageChanged", onLanguageChanged);
    const stopFollowing = followDeviceLanguageOnForeground();
    return () => {
      stopFollowing();
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, []);

  const openRoute = useCallback(
    (route: string) => router.navigate(consoleScreenHref(route, Date.now())),
    [router]
  );
  usePushRouting(serverUrl, openRoute);

  return (
    <GestureHandlerRootView style={{ flex: 1, direction }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="server-config" />
            <Stack.Screen name="console" options={{ gestureEnabled: false }} />
          </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
