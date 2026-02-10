import "../global.css";

import { useEffect, useMemo, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ObjectStackProvider } from "@objectstack/client-react";
import { authClient, reinitializeAuthClient } from "~/lib/auth-client";
import { createObjectStackClient, setObjectStackApiUrl } from "~/lib/objectstack";
import { getServerUrl } from "~/lib/server-url";

const queryClient = new QueryClient();

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
  const [serverUrl, setServerUrlState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // On mount, load the persisted server URL and reinitialize clients
  useEffect(() => {
    (async () => {
      const url = await getServerUrl();
      if (url) {
        reinitializeAuthClient(url);
        setObjectStackApiUrl(url);
        setServerUrlState(url);
      }
      setIsReady(true);
    })();
  }, []);

  useProtectedRoute(serverUrl, isReady);

  const { data: session } = authClient.useSession();
  const sessionRecord = session as Record<string, unknown> | null;
  const token = (sessionRecord?.token ?? sessionRecord?.accessToken) as string | undefined;

  const client = useMemo(
    () => createObjectStackClient(token),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serverUrl is used by setObjectStackApiUrl, not by createObjectStackClient
    [token],
  );

  return (
    <ObjectStackProvider client={client}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ObjectStackProvider>
  );
}
