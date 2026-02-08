import "../global.css";

import { useEffect, useMemo } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ObjectStackProvider } from "@objectstack/client-react";
import { authClient } from "~/lib/auth-client";
import { createObjectStackClient } from "~/lib/objectstack";

const queryClient = new QueryClient();

function useProtectedRoute() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, isPending, segments]);
}

export default function RootLayout() {
  useProtectedRoute();

  const { data: session } = authClient.useSession();
  const token = (session as any)?.token ?? (session as any)?.accessToken;

  const client = useMemo(() => createObjectStackClient(token), [token]);

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
