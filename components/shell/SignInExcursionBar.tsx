import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Lock, TriangleAlert, X } from "lucide-react-native";
import { useLayoutDirection } from "~/lib/rtl";
import { useThemeColors } from "~/lib/theme-colors";
import { EXCURSION_TIMEOUT_MS, type ExcursionFailure } from "~/lib/shell/sign-in-excursion";

export interface SignInExcursionBarProps {
  /** The exact host of the excursion page (port kept unless default). */
  host: string;
  /** The current connection's label, so the user sees which server this sign-in is for. */
  serverLabel: string;
  /** 取消: end the excursion and go back to the server's sign-in page. */
  onCancel: () => void;
}

/**
 * Native bar above the WebView while a sign-in excursion is on screen (design
 * screen 3). It shows the lock (excursion pages are https only), the exact host
 * of the page, which server the sign-in is for, and 取消.
 *
 * The host is drawn left to right in every language and truncated at its start,
 * so the end of the name (the registered domain) stays visible.
 */
export function SignInExcursionBar({ host, serverLabel, onCancel }: SignInExcursionBarProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const direction = useLayoutDirection();

  return (
    <View
      className="flex-row items-center gap-3 border-b border-border bg-muted px-4 py-2"
      style={{ direction }}
      testID="shell-excursion-bar"
    >
      <View accessible accessibilityLabel={t("excursion.secure")} testID="shell-excursion-lock">
        <Lock size={16} color={colors.foreground} />
      </View>
      <View className="flex-1">
        <Text
          className="text-sm font-semibold text-foreground"
          numberOfLines={1}
          ellipsizeMode="head"
          style={{ writingDirection: "ltr", textAlign: direction === "rtl" ? "right" : "left" }}
          testID="shell-excursion-host"
        >
          {host}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {t("excursion.signingIn", { server: serverLabel })}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        hitSlop={8}
        className="rounded-lg px-3 py-2 active:bg-accent"
        testID="shell-excursion-cancel"
      >
        <Text className="text-sm font-medium text-primary">{t("excursion.cancel")}</Text>
      </Pressable>
    </View>
  );
}

export interface SignInExcursionNoticeProps {
  reason: ExcursionFailure;
  onDismiss: () => void;
}

/**
 * Why an excursion ended without returning, shown above the server's sign-in
 * page that the shell went back to.
 */
export function SignInExcursionNotice({ reason, onDismiss }: SignInExcursionNoticeProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const direction = useLayoutDirection();
  const message =
    reason === "timeout"
      ? t("excursion.timeout", { minutes: Math.round(EXCURSION_TIMEOUT_MS / 60000) })
      : t(`excursion.${reason}`);

  return (
    <View
      className="flex-row items-start gap-3 border-b border-border bg-muted px-4 py-3"
      style={{ direction }}
      accessibilityLiveRegion="polite"
      testID="shell-excursion-notice"
    >
      <TriangleAlert size={18} color={colors.foreground} />
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-foreground">{t("excursion.endedTitle")}</Text>
        <Text className="text-sm text-muted-foreground" testID={`shell-excursion-notice-${reason}`}>
          {message}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("excursion.dismiss")}
        onPress={onDismiss}
        hitSlop={8}
        testID="shell-excursion-notice-dismiss"
      >
        <X size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}
