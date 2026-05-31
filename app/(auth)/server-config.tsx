import React from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ServerCog } from "lucide-react-native";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { validateServerUrl } from "~/lib/server-url";
import { useServerStore } from "~/stores/server-store";

export default function ServerConfigScreen() {
  const router = useRouter();
  const connect = useServerStore((s) => s.connect);
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleConnect = async () => {
    const trimmed = url.trim().replace(/\/+$/, "");
    if (!trimmed) {
      setErrorMsg("Please enter a server URL.");
      return;
    }

    // Basic URL format check
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setErrorMsg("The URL must start with http:// or https://");
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const isValid = await validateServerUrl(trimmed);
      if (!isValid) {
        setErrorMsg(
          "Could not reach the server. Please check the URL and try again."
        );
        return;
      }

      // Persist + re-target the auth/data clients and update the reactive
      // store so the root layout's route guard advances past this screen.
      await connect(trimmed);
      router.replace("/(auth)/sign-in");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-8 pt-16"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="mb-10 items-center">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <ServerCog size={32} color="rgb(30 64 175)" />
            </View>
            <Text className="text-center text-3xl font-bold text-foreground">
              Connect to Server
            </Text>
            <Text className="mt-2 text-center text-base text-muted-foreground">
              Enter your ObjectStack server address to get started.
            </Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Server URL
              </Text>
              <Input
                placeholder="https://your-server.objectstack.com"
                autoCapitalize="none"
                keyboardType="url"
                textContentType="URL"
                autoCorrect={false}
                returnKeyType="go"
                error={!!errorMsg}
                value={url}
                onChangeText={(t) => {
                  setUrl(t);
                  if (errorMsg) setErrorMsg(null);
                }}
                onSubmitEditing={handleConnect}
              />
              {errorMsg ? (
                <Text className="mt-1.5 text-xs text-destructive">
                  {errorMsg}
                </Text>
              ) : (
                <Text className="mt-1.5 text-xs text-muted-foreground">
                  Example: https://app.objectstack.com
                </Text>
              )}
            </View>

            <Button className="mt-4" onPress={handleConnect} loading={loading}>
              {loading ? "Connecting…" : "Connect"}
            </Button>
          </View>

          <View className="mt-10">
            <Text className="text-center text-xs text-muted-foreground">
              Contact your administrator if you don&apos;t know the server
              address.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
