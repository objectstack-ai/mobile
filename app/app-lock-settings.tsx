import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight } from "lucide-react-native";
import { changeAppLockSettings, type ChangeOutcome } from "~/lib/app-lock";
import { getDeviceLockLevel } from "~/lib/biometric-auth";
import { useLayoutDirection } from "~/lib/rtl";
import { useThemeColors } from "~/lib/theme-colors";
import { cn } from "~/lib/utils";
import {
  APP_LOCK_TIMEOUTS,
  useSecurityStore,
  type AppLockSettings,
  type AppLockTimeout,
} from "~/stores/security-store";

/** The message a change leaves behind (none for a change that went through). */
const OUTCOME_KEYS: Partial<Record<ChangeOutcome, string>> = {
  "not-authenticated": "appLock.settings.notChanged",
  unavailable: "appLock.settings.unavailable",
  "save-failed": "appLock.settings.saveFailed",
};

/**
 * The native app-lock settings screen: the one place the lock is changed.
 * Reached from the switcher's "App lock" row and from the bridge's
 * `openAppLockSettings()`; the bridge itself can only read the setting.
 *
 * Every change — on, off, another timeout — asks for Face ID / Touch ID /
 * fingerprint (device passcode as fallback) through `changeAppLockSettings`,
 * and nothing changes unless that succeeds and the setting is stored.
 */
export default function AppLockSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const direction = useLayoutDirection();
  const settings = useSecurityStore((s) => s.settings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Turning the lock on needs a passcode or biometrics on the device.
  const [deviceHasLock, setDeviceHasLock] = useState<boolean | null>(null);
  const Back = direction === "rtl" ? ChevronRight : ChevronLeft;

  useEffect(() => {
    let alive = true;
    getDeviceLockLevel()
      .then((level) => alive && setDeviceHasLock(level !== "none"))
      .catch(() => alive && setDeviceHasLock(false));
    return () => {
      alive = false;
    };
  }, []);

  const change = useCallback(
    async (next: AppLockSettings) => {
      if (busy) return;
      setBusy(true);
      setMessage(null);
      try {
        const outcome = await changeAppLockSettings(next);
        if (outcome === "unavailable") setDeviceHasLock(false);
        const key = OUTCOME_KEYS[outcome];
        setMessage(key ? t(key) : null);
      } finally {
        setBusy(false);
      }
    },
    [busy, t]
  );

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const canTurnOn = deviceHasLock !== false;
  const toggleDisabled = busy || (!settings.enabled && !canTurnOn);
  const privacyKey =
    Platform.OS === "android" ? "appLock.settings.privacy.android" : "appLock.settings.privacy.ios";

  return (
    <SafeAreaView className="flex-1 bg-background" style={{ direction }} testID="app-lock-settings">
      <View className="flex-row items-center gap-2 px-2 py-2">
        <Pressable
          testID="app-lock-back"
          accessibilityRole="button"
          accessibilityLabel={t("appLock.settings.back")}
          onPress={leave}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full"
        >
          <Back size={24} color={colors.foreground} />
        </Pressable>
        <Text accessibilityRole="header" className="flex-1 text-lg font-semibold text-foreground">
          {t("appLock.settings.title")}
        </Text>
        {busy ? <ActivityIndicator testID="app-lock-busy" /> : null}
      </View>

      <ScrollView contentContainerClassName="gap-6 px-6 pb-10 pt-2">
        <Text className="text-base text-muted-foreground">
          {t("appLock.settings.description")}
        </Text>

        <Pressable
          testID="app-lock-toggle"
          role="switch"
          accessibilityLabel={t("appLock.settings.toggle")}
          accessibilityState={{ checked: settings.enabled, disabled: toggleDisabled, busy }}
          disabled={toggleDisabled}
          onPress={() => void change({ ...settings, enabled: !settings.enabled })}
          className={cn(
            "flex-row items-center gap-4 rounded-2xl border border-border px-5 py-4",
            toggleDisabled && "opacity-50"
          )}
        >
          <Text className="flex-1 text-base font-semibold text-foreground">
            {t("appLock.settings.toggle")}
          </Text>
          <View
            className={cn(
              "h-7 w-12 justify-center rounded-full px-0.5",
              settings.enabled ? "items-end bg-primary" : "items-start bg-input"
            )}
          >
            <View className="h-6 w-6 rounded-full bg-background shadow-sm" />
          </View>
        </Pressable>

        {settings.enabled ? (
          <View className="gap-2">
            <Text accessibilityRole="header" className="text-sm font-semibold text-muted-foreground">
              {t("appLock.settings.timeoutTitle")}
            </Text>
            <View className="rounded-2xl border border-border" accessibilityRole="radiogroup">
              {APP_LOCK_TIMEOUTS.map((seconds: AppLockTimeout, index) => {
                const selected = settings.timeoutSeconds === seconds;
                return (
                  <Pressable
                    key={seconds}
                    testID={`app-lock-timeout-${seconds}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: busy }}
                    disabled={busy}
                    onPress={() => void change({ enabled: true, timeoutSeconds: seconds })}
                    className={cn(
                      "flex-row items-center px-5 py-4",
                      index > 0 && "border-t border-border"
                    )}
                  >
                    <Text className="flex-1 text-base text-foreground">
                      {t(`appLock.settings.timeout.${seconds}`)}
                    </Text>
                    {selected ? (
                      <View testID={`app-lock-timeout-selected-${seconds}`}>
                        <Check size={20} color={colors.accent} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {message ? (
          <Text testID="app-lock-message" accessibilityLiveRegion="polite" className="text-sm text-destructive">
            {message}
          </Text>
        ) : !settings.enabled && deviceHasLock === false ? (
          <Text testID="app-lock-unavailable" className="text-sm text-muted-foreground">
            {t("appLock.settings.unavailable")}
          </Text>
        ) : null}

        <View className="gap-2">
          <Text className="text-sm text-muted-foreground">{t("appLock.settings.authNote")}</Text>
          <Text testID="app-lock-privacy" className="text-sm text-muted-foreground">
            {t(privacyKey)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
