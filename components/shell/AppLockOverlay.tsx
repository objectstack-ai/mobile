import React, { useEffect } from "react";
import { AppState, BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react-native";
import { unlockApp } from "~/lib/app-lock";
import { useLayoutDirection } from "~/lib/rtl";
import { useThemeColors } from "~/lib/theme-colors";
import { cn } from "~/lib/utils";
import { isAppLocked, useSecurityStore } from "~/stores/security-store";

/** The copy under the title for each unlock failure. */
const ERROR_KEYS = {
  failed: "appLock.overlay.failed",
  "no-device-lock": "appLock.overlay.noDeviceLock",
} as const;

/**
 * The app lock's overlay: an opaque native view over everything the stack
 * shows, the Console's WebView included. It is a sibling drawn above the
 * navigation stack in the root layout — not a route and not a reload — so the
 * WebView stays mounted under it, the page keeps its state, and the Console's
 * load state machine sees nothing.
 *
 * - `covered` (the app is in or just back from the background): the cover
 *   alone, while the timeout is judged, so the page does not flash on return.
 * - `locked`: the title and Unlock; the system prompt starts by itself once
 *   per lock while the app is active, and again after each return from the
 *   background. A cancel leaves the overlay with Unlock.
 * - `unlocking`: the prompt is on screen; Unlock waits.
 *
 * While it is up, Android back does nothing (the WebView's history is not
 * walked behind it), and the views under it are hidden from screen readers by
 * the root layout.
 */
export function AppLockOverlay() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const direction = useLayoutDirection();
  const phase = useSecurityStore((s) => s.phase);
  const promptPending = useSecurityStore((s) => s.promptPending);
  const unlockError = useSecurityStore((s) => s.unlockError);
  const up = isAppLocked({ phase });

  useEffect(() => {
    if (!up) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [up]);

  useEffect(() => {
    if (phase !== "locked" || !promptPending) return;
    if (AppState.currentState === "active") {
      void unlockApp();
      return;
    }
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void unlockApp();
    });
    return () => sub.remove();
  }, [phase, promptPending]);

  if (!up) return null;

  const covered = phase === "covered";

  return (
    <View
      testID="app-lock-overlay"
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, { direction }]}
      className="items-center justify-center gap-4 bg-background px-8"
    >
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Lock size={32} color={colors.accent} />
      </View>
      {covered ? null : (
        <>
          <Text
            testID="app-lock-title"
            accessibilityRole="header"
            className="text-center text-xl font-semibold text-foreground"
          >
            {t("appLock.overlay.title")}
          </Text>
          {unlockError ? (
            <Text
              testID="app-lock-error"
              accessibilityLiveRegion="polite"
              className="text-center text-sm text-muted-foreground"
            >
              {t(ERROR_KEYS[unlockError])}
            </Text>
          ) : null}
          <Pressable
            testID="app-lock-unlock"
            accessibilityRole="button"
            accessibilityState={{ disabled: phase === "unlocking" }}
            disabled={phase === "unlocking"}
            onPress={() => void unlockApp()}
            className={cn(
              "mt-2 h-12 min-w-40 items-center justify-center rounded-xl bg-primary px-6",
              phase === "unlocking" ? "opacity-50" : "active:opacity-90"
            )}
          >
            <Text className="text-base font-semibold text-primary-foreground">
              {t("appLock.overlay.unlock")}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
