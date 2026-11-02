import React from "react";
import { BackHandler, Image, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react-native";
import { Button } from "~/components/ui/Button";
import {
  DEFAULT_BRAND_COLOR,
  displayName,
  serverInitial,
  type ProbedServer,
  type SignInMethods,
} from "~/lib/server-probe";
import { useThemeColors } from "~/lib/theme-colors";

export interface ServerConfirmProps {
  server: ProbedServer;
  /** Save the server and open the Console — the only place a server is saved. */
  onConfirm: () => void;
  /** Back to the address step; nothing was saved. */
  onReject: () => void;
  /** The save is in flight. */
  connecting?: boolean;
  /** Error from the save, if any. */
  error?: string | null;
}

/** The sign-in methods row, in the order the Console's sign-in page offers them. */
function signInLabels(signIn: SignInMethods, t: (key: string) => string): string[] {
  const labels: string[] = [];
  if (signIn.sso) labels.push(t("serverConfirm.signIn.sso"));
  if (signIn.emailPassword) labels.push(t("serverConfirm.signIn.emailPassword"));
  labels.push(...signIn.providers);
  return labels;
}

/**
 * Screen 7 — "is this your server?". Shows who answered the probe so the user
 * can recognise their server before anything is saved.
 */
export function ServerConfirm({
  server,
  onConfirm,
  onReject,
  connecting = false,
  error = null,
}: ServerConfirmProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [logoFailed, setLogoFailed] = React.useState(false);
  const name = displayName(server);
  const methods = server.signIn ? signInLabels(server.signIn, t) : [];

  // Android back returns to the address step, like "Not this server".
  React.useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onReject();
      return true;
    });
    return () => sub.remove();
  }, [onReject]);

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-6 pb-8 pt-16">
      <Text className="mb-8 text-center text-base text-muted-foreground">
        {t("serverConfirm.title")}
      </Text>

      <View className="mb-8 items-center">
        {server.logoUrl && !logoFailed ? (
          <Image
            testID="server-confirm-logo"
            accessibilityIgnoresInvertColors
            source={{ uri: server.logoUrl }}
            resizeMode="contain"
            className="mb-4 h-20 w-20 rounded-2xl"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <View
            testID="server-confirm-initial"
            className="mb-4 h-20 w-20 items-center justify-center rounded-2xl"
            style={{ backgroundColor: server.brandColor ?? DEFAULT_BRAND_COLOR }}
          >
            <Text className="text-4xl font-bold text-white">{serverInitial(server)}</Text>
          </View>
        )}
        <Text
          testID="server-confirm-name"
          className="text-center text-2xl font-bold text-foreground"
        >
          {name}
        </Text>
        <Text
          testID="server-confirm-url"
          selectable
          className="mt-1 text-center text-sm text-muted-foreground"
        >
          {server.serverUrl}
        </Text>
      </View>

      <View className="gap-3 rounded-2xl border border-border p-4">
        {server.secure ? (
          <View testID="server-confirm-secure" className="flex-row items-center gap-2">
            <Lock size={16} color={colors.accent} />
            <Text className="text-sm text-foreground">{t("serverConfirm.secure")}</Text>
          </View>
        ) : null}
        {methods.length > 0 ? (
          <View testID="server-confirm-sign-in">
            <Text className="text-xs text-muted-foreground">{t("serverConfirm.signInLabel")}</Text>
            <Text className="mt-0.5 text-sm text-foreground">{methods.join(" · ")}</Text>
          </View>
        ) : null}
        <View testID="server-confirm-version">
          <Text className="text-xs text-muted-foreground">{t("serverConfirm.versionLabel")}</Text>
          <Text className="mt-0.5 text-sm text-foreground">
            {server.platformName} {server.version}
          </Text>
        </View>
      </View>

      {error ? (
        <Text testID="server-confirm-error" className="mt-4 text-center text-xs text-destructive">
          {error}
        </Text>
      ) : null}

      <Button className="mt-8" onPress={onConfirm} loading={connecting} testID="server-confirm">
        {t("serverConfirm.confirm")}
      </Button>
      <Button
        className="mt-3"
        variant="ghost"
        onPress={onReject}
        disabled={connecting}
        testID="server-reject"
      >
        {t("serverConfirm.reject")}
      </Button>
    </ScrollView>
  );
}
