import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ServerCog } from "lucide-react-native";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { validateServerUrl } from "~/lib/server-url";
import { normalizeServerUrl } from "~/lib/shell/console-url";
import { shellConfig } from "~/lib/shell/config";
import { useThemeColors } from "~/lib/theme-colors";
import { useServerStore } from "~/stores/server-store";

/**
 * Native server picker — the one screen the shell must render itself, because
 * it decides which Console to load. Accepts a bare host, a full URL, or a
 * pasted Console link.
 */
export default function ServerConfigScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const current = useServerStore((s) => s.serverUrl);
  const connect = useServerStore((s) => s.connect);
  const [url, setUrl] = React.useState(current ?? shellConfig.defaultServerUrl);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleConnect = async () => {
    const normalized = normalizeServerUrl(url, { allowInsecure: __DEV__ });
    if (!normalized.ok) {
      setErrorMsg(t(`serverConfig.error.${normalized.reason}`));
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const reachable = await validateServerUrl(normalized.serverUrl);
      if (!reachable) {
        setErrorMsg(t("serverConfig.error.unreachable"));
        return;
      }
      await connect(normalized.serverUrl);
      router.dismissTo("/console");
    } catch {
      setErrorMsg(t("serverConfig.error.unknown"));
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
              <ServerCog size={32} color={colors.accent} />
            </View>
            <Text className="text-center text-3xl font-bold text-foreground">
              {t("serverConfig.title")}
            </Text>
            <Text className="mt-2 text-center text-base text-muted-foreground">
              {t("serverConfig.subtitle")}
            </Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                {t("serverConfig.label")}
              </Text>
              <Input
                testID="server-url-input"
                placeholder="https://your-server.example.com"
                autoCapitalize="none"
                keyboardType="url"
                textContentType="URL"
                autoCorrect={false}
                returnKeyType="go"
                error={!!errorMsg}
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  if (errorMsg) setErrorMsg(null);
                }}
                onSubmitEditing={handleConnect}
              />
              <Text
                className={
                  errorMsg
                    ? "mt-1.5 text-xs text-destructive"
                    : "mt-1.5 text-xs text-muted-foreground"
                }
              >
                {errorMsg ?? t("serverConfig.hint")}
              </Text>
            </View>

            <Button
              className="mt-4"
              onPress={handleConnect}
              loading={loading}
              testID="server-connect"
            >
              {t("serverConfig.connect")}
            </Button>
          </View>

          <Text className="mt-10 text-center text-xs text-muted-foreground">
            {t("serverConfig.help")}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
