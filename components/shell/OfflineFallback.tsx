import React from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CloudOff, ServerCrash, ShieldAlert } from "lucide-react-native";
import { Button } from "~/components/ui/Button";
import { useLayoutDirection } from "~/lib/rtl";
import { useThemeColors } from "~/lib/theme-colors";

export type LoadFailure =
  | { kind: "network"; description?: string }
  | { kind: "server"; statusCode?: number }
  /** The server's page keeps going to a page the navigation policy does not load in the WebView. */
  | { kind: "policy" };

export interface OfflineFallbackProps {
  failure: LoadFailure;
  serverUrl: string;
  onRetry: () => void;
  /** Secondary action (screen 9): open the connection switcher. */
  onSwitchConnection: () => void;
}

/**
 * Native page shown instead of a blank WebView when the Console cannot load —
 * no network, DNS/TLS failure, a 5xx from the server, or a server page that
 * keeps going to a page the navigation policy does not load in the WebView.
 */
export function OfflineFallback({
  failure,
  serverUrl,
  onRetry,
  onSwitchConnection,
}: OfflineFallbackProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const direction = useLayoutDirection();
  const Icon =
    failure.kind === "network" ? CloudOff : failure.kind === "policy" ? ShieldAlert : ServerCrash;

  return (
    <View
      className="flex-1 items-center justify-center gap-6 bg-background px-8"
      style={{ direction }}
      testID="shell-offline-fallback"
    >
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Icon size={32} color={colors.muted} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-center text-xl font-semibold text-foreground">
          {failure.kind === "network"
            ? t("shell.offlineTitle")
            : failure.kind === "policy"
              ? t("shell.policyTitle")
              : t("shell.serverErrorTitle")}
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          {failure.kind === "network"
            ? t("shell.offlineMessage")
            : failure.kind === "policy"
              ? t("shell.policyMessage")
              : t("shell.serverErrorMessage", {
                  code: failure.statusCode ?? "—",
                })}
        </Text>
        <Text className="text-center text-xs text-muted-foreground">{serverUrl}</Text>
      </View>
      <View className="w-full gap-3">
        <Button onPress={onRetry} testID="shell-retry">
          {t("shell.retry")}
        </Button>
        <Button variant="ghost" onPress={onSwitchConnection} testID="shell-switch-connection">
          {t("switcher.title")}
        </Button>
      </View>
    </View>
  );
}
