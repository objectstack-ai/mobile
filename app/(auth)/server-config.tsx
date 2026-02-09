import React from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { setServerUrl, validateServerUrl } from "~/lib/server-url";

export default function ServerConfigScreen() {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleConnect = async () => {
    const trimmed = url.trim().replace(/\/+$/, "");
    if (!trimmed) {
      Alert.alert("Error", "Please enter a server URL.");
      return;
    }

    // Basic URL format check
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      Alert.alert(
        "Invalid URL",
        "The URL must start with http:// or https://",
      );
      return;
    }

    setLoading(true);
    try {
      const isValid = await validateServerUrl(trimmed);
      if (!isValid) {
        Alert.alert(
          "Connection Failed",
          "Could not reach the server. Please check the URL and try again.",
        );
        return;
      }

      await setServerUrl(trimmed);
      // Navigate to sign-in page after successful server config
      router.replace("/(auth)/sign-in");
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
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
        >
          <View className="mb-10 items-center">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Text className="text-3xl">🔗</Text>
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
                value={url}
                onChangeText={setUrl}
              />
              <Text className="mt-1.5 text-xs text-muted-foreground">
                Example: https://app.objectstack.com
              </Text>
            </View>

            <Button
              className="mt-4"
              onPress={handleConnect}
              disabled={loading}
            >
              {loading ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="font-semibold text-primary-foreground">
                    Connecting…
                  </Text>
                </View>
              ) : (
                "Connect"
              )}
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
