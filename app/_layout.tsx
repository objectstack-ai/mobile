import "../global.css";
import "~/lib/i18n"; // Initialize i18next before any screen calls useTranslation()

import { useCallback, useEffect, useMemo } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colorScheme } from "nativewind";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ObjectStackProvider } from "@objectstack/client-react";
import { authClient } from "~/lib/auth-client";
import { createObjectStackClient } from "~/lib/objectstack";
import { useServerStore } from "~/stores/server-store";
import { useUIStore } from "~/stores/ui-store";
import { usePushNotifications } from "~/hooks/usePushNotifications";
import { ToastProvider } from "~/components/ui/Toast";
import { ConfirmProvider } from "~/components/ui/ConfirmDialog";

const queryClient = new QueryClient();

/**
 * Activates push notifications. Rendered inside ObjectStackProvider because
 * usePushNotifications → useNotifications → useClient requires the provider.
 */
function PushNotificationsManager({
  enabled,
  onDeepLink,
}: {
  enabled: boolean;
  onDeepLink: (url: string) => void;
}) {
  usePushNotifications({ enabled, onDeepLink });
  return null;
}

function useProtectedRoute(serverUrl: string | null, isReady: boolean) {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;

    const first = segments[0] as string | undefined;
    const inAuthGroup = first === "(auth)";
    const isServerConfigRoute = segments.includes("server-config");
    // The initial `index` route is the hydration splash — treat it like the
    // auth group for redirect purposes so a signed-in user is forwarded on.
    const onIndex = !first || first === "index";

    // Step 1: No server URL configured → go to server config
    if (!serverUrl) {
      if (!isServerConfigRoute) {
        router.replace("/(auth)/server-config");
      }
      return;
    }

    if (isPending) return;

    // Step 2: Route based on session, forwarding off the splash/auth screens.
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && (inAuthGroup || onIndex)) {
      router.replace("/(tabs)");
    }
  }, [session, isPending, segments, serverUrl, isReady, router]);
}

export default function RootLayout() {
  const serverUrl = useServerStore((s) => s.serverUrl);
  const isReady = useServerStore((s) => s.isReady);
  const hydrate = useServerStore((s) => s.hydrate);
  const themeMode = useUIStore((s) => s.theme);

  // On mount, load the persisted server URL and re-target the auth/data clients.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Apply the persisted color scheme from the root (always rendered) — the
  // store's own module-load side-effect only runs once something imports it,
  // which the first screen doesn't, so the saved theme wasn't applied on a cold
  // start.
  useEffect(() => {
    colorScheme.set(themeMode);
  }, [themeMode]);

  useProtectedRoute(serverUrl, isReady);

  const { data: session } = authClient.useSession();
  const sessionRecord = session as Record<string, unknown> | null;
  const token = (sessionRecord?.token ?? sessionRecord?.accessToken) as string | undefined;

  // Recreate the data client when the token changes (sign-in/out) or the
  // configured server changes — `createObjectStackClient` snapshots the
  // module-level API URL that `connect()`/`hydrate()` updates.
  const client = useMemo(
    () => createObjectStackClient(token),
    // `serverUrl` is an intentional recompute trigger: the client snapshots the
    // module-level API URL (updated by hydrate/connect when serverUrl changes)
    // rather than reading serverUrl directly, so the rule can't see the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, serverUrl],
  );

  // Activate push notifications only once signed in. Tapped notifications carry
  // an app-scheme deep link, which expo-router resolves via Linking.
  const handleDeepLink = useCallback((url: string) => {
    void Linking.openURL(url).catch(() => {
      // Swallow: an unresolvable link should not crash the app.
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ObjectStackProvider client={client}>
        <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ToastProvider>
            <ConfirmProvider>
              <StatusBar style="auto" />
              {/* Push notifications fetch on mount, so hold them until the
                  clients are re-targeted at the configured server. */}
              {isReady && (
                <PushNotificationsManager enabled={!!token} onDeepLink={handleDeepLink} />
              )}
              {/* The navigator is ALWAYS mounted. expo-router requires a
                  navigator on every render — swapping it for a bare splash View
                  during the async hydration window makes navigation hooks throw
                  "Couldn't find a navigation context" (visible on native, where
                  hydration is slow enough to actually paint the splash). The
                  initial `index` route is a no-fetch splash that
                  `useProtectedRoute` forwards off once `isReady`, so the data
                  screens never mount against the pre-hydration default host. */}
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(app)" />
                <Stack.Screen name="account" />
                <Stack.Screen name="appearance" />
                <Stack.Screen name="ai" />
              </Stack>
            </ConfirmProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
      </ObjectStackProvider>
    </GestureHandlerRootView>
  );
}
