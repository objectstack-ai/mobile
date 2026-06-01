import "../global.css";
import "~/lib/i18n"; // Initialize i18next before any screen calls useTranslation()

import { useCallback, useEffect, useMemo } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ObjectStackProvider } from "@objectstack/client-react";
import { authClient } from "~/lib/auth-client";
import { createObjectStackClient } from "~/lib/objectstack";
import { useServerStore } from "~/stores/server-store";
import { usePushNotifications } from "~/hooks/usePushNotifications";
import { ToastProvider } from "~/components/ui/Toast";

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

    const inAuthGroup = segments[0] === "(auth)";
    const isServerConfigRoute = segments.includes("server-config");

    // Step 1: No server URL configured → go to server config
    if (!serverUrl) {
      if (!isServerConfigRoute) {
        router.replace("/(auth)/server-config");
      }
      return;
    }

    if (isPending) return;

    // Step 2: Not signed in → go to sign-in
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, isPending, segments, serverUrl, isReady, router]);
}

export default function RootLayout() {
  const serverUrl = useServerStore((s) => s.serverUrl);
  const isReady = useServerStore((s) => s.isReady);
  const hydrate = useServerStore((s) => s.hydrate);

  // On mount, load the persisted server URL and reinitialize clients
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useProtectedRoute(serverUrl, isReady);

  const { data: session } = authClient.useSession();
  const sessionRecord = session as Record<string, unknown> | null;
  const token = (sessionRecord?.token ?? sessionRecord?.accessToken) as string | undefined;

  // Recreate the data client when the token changes (sign-in/out) or the
  // configured server changes — `createObjectStackClient` snapshots the
  // module-level API URL that `connect()`/`hydrate()` updates.
  const client = useMemo(
    () => createObjectStackClient(token),
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
    <ObjectStackProvider client={client}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ToastProvider>
            <PushNotificationsManager enabled={!!token} onDeepLink={handleDeepLink} />
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(app)" />
              <Stack.Screen name="account" />
              <Stack.Screen name="flows" />
            </Stack>
          </ToastProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ObjectStackProvider>
  );
}
