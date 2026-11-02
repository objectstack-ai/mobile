import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ServerCog } from "lucide-react-native";
import { ServerConfirm } from "~/components/shell/ServerConfirm";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import {
  probeServer,
  xhrFetch,
  type ProbedServer,
  type ProbeFailureKind,
} from "~/lib/server-probe";
import { shellConfig } from "~/lib/shell/config";
import { useThemeColors } from "~/lib/theme-colors";
import { useServerStore } from "~/stores/server-store";

/** Copy key for each probe failure — one message per kind. */
const ERROR_KEYS: Readonly<Record<ProbeFailureKind, string>> = {
  empty: "serverConfig.error.empty",
  invalid: "serverConfig.error.invalid",
  "insecure-http": "serverConfig.error.insecure",
  unreachable: "serverConfig.error.unreachable",
  tls: "serverConfig.error.tls",
  timeout: "serverConfig.error.timeout",
  "not-objectos": "serverConfig.error.notObjectOS",
  "server-error": "serverConfig.error.serverError",
};

const HELP_STEPS = [
  "serverConfig.where.step1",
  "serverConfig.where.step2",
  "serverConfig.where.step3",
];

/**
 * Native server picker — the one screen the shell must render itself, because
 * it decides which Console to load. Two steps:
 *
 * 1. Address (screen 5): accepts a bare host, a full URL, or a pasted Console
 *    link, and probes it (`lib/server-probe.ts`).
 * 2. Confirm (screen 7): shows who answered. The server is saved only when the
 *    user confirms.
 *
 * Scan entry point: the QR scanner is not built yet, so screen 5 renders no
 * scan button. The scanner lands its button beside the address field and
 * hands the scanned address to `runProbe`.
 */
export default function ServerConfigScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const current = useServerStore((s) => s.serverUrl);
  const connect = useServerStore((s) => s.connect);
  const [url, setUrl] = React.useState(current ?? shellConfig.defaultServerUrl);
  const [probing, setProbing] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [probed, setProbed] = React.useState<ProbedServer | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  const [connectError, setConnectError] = React.useState<string | null>(null);
  // Only the latest probe may move the screen on; an edit makes older ones stale.
  const probeSeq = React.useRef(0);

  const runProbe = async (address: string) => {
    const seq = ++probeSeq.current;
    setErrorMsg(null);
    setProbing(true);
    try {
      const result = await probeServer(address, { fetch: xhrFetch, allowInsecure: __DEV__ });
      if (seq !== probeSeq.current) return;
      if (result.kind === "ok") {
        setConnectError(null);
        setProbed(result.server);
      } else {
        setErrorMsg(
          t(
            ERROR_KEYS[result.kind],
            result.kind === "server-error" ? { status: result.status } : {}
          )
        );
      }
    } finally {
      if (seq === probeSeq.current) setProbing(false);
    }
  };

  const handleConfirm = async () => {
    if (!probed) return;
    setConnecting(true);
    setConnectError(null);
    try {
      await connect(probed.serverUrl);
      router.dismissTo("/console");
    } catch {
      setConnectError(t("serverConfig.error.unknown"));
    } finally {
      setConnecting(false);
    }
  };

  const handleReject = React.useCallback(() => setProbed(null), []);

  if (probed) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ServerConfirm
          server={probed}
          onConfirm={handleConfirm}
          onReject={handleReject}
          connecting={connecting}
          error={connectError}
        />
      </SafeAreaView>
    );
  }

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
                  if (probing) {
                    probeSeq.current += 1;
                    setProbing(false);
                  }
                }}
                onSubmitEditing={() => runProbe(url)}
              />
              <Text
                testID="server-url-message"
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
              onPress={() => runProbe(url)}
              loading={probing}
              testID="server-connect"
            >
              {t("serverConfig.connect")}
            </Button>
          </View>

          <View className="mt-10 gap-2">
            <Text className="text-sm font-medium text-foreground">
              {t("serverConfig.where.title")}
            </Text>
            {HELP_STEPS.map((key, i) => (
              <Text key={key} className="text-xs text-muted-foreground">
                {i + 1}. {t(key)}
              </Text>
            ))}
            <Text className="mt-2 text-xs text-muted-foreground">{t("serverConfig.vpnHint")}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
