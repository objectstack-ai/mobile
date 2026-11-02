import { I18nManager, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { isRTL } from "./i18n";

/** Yoga's `direction` style value for a screen root. */
export type LayoutDirection = "ltr" | "rtl";

/** The layout direction of a language: `rtl` for Arabic (and the other RTL codes), else `ltr`. */
export function layoutDirection(lang?: string): LayoutDirection {
  return isRTL(lang) ? "rtl" : "ltr";
}

/**
 * The layout direction of the current shell language, re-evaluated when the
 * language changes.
 *
 * Native screens put it on their root view as `style={{ direction }}`. Yoga
 * flips `flex-direction: row`, `start`/`end` insets and natural text alignment
 * for that subtree at once — unlike `I18nManager.forceRTL` ({@link syncRTL}),
 * which only takes effect after the next launch. So a phone switched to Arabic
 * gets right-to-left native screens on the first launch, and a language change
 * picked up on foreground flips them without a restart.
 */
export function useLayoutDirection(): LayoutDirection {
  const { i18n } = useTranslation();
  return layoutDirection(i18n.language);
}

/**
 * Apply the writing direction for a language.
 *
 * - **Web**: React-Native-Web doesn't honour `I18nManager.forceRTL`, so the
 *   direction is driven by the document `dir` attribute (CSS logical
 *   properties + `flex-direction: row` flip from there).
 * - **Native**: `I18nManager.forceRTL` flips `flex-direction: row`,
 *   `marginStart/End`, `start/end` insets and text alignment. The flag persists
 *   across launches, so a change takes full effect after the app restarts.
 *
 * Returns `true` when a **native** restart is needed to fully apply the change
 * (the direction flag differs from what's currently live).
 */
export function syncRTL(lang?: string): boolean {
  const rtl = isRTL(lang);

  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      document.documentElement.dir = rtl ? "rtl" : "ltr";
      if (lang) document.documentElement.lang = lang;
    }
    return false;
  }

  const needsRestart = I18nManager.isRTL !== rtl;
  // Allow RTL at all, then force the concrete direction. `forceRTL` persists,
  // so even without an immediate reload the next launch lays out correctly.
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(rtl);
  return needsRestart;
}

/**
 * Best-effort app reload to apply an RTL direction change immediately.
 *
 * - **Web**: a full page reload re-reads `document.dir`.
 * - **Native**: there is no bundled restart module (no `expo-updates` /
 *   `react-native-restart`), so this is a no-op — `forceRTL` has been
 *   persisted and applies on the next launch. Callers should tell the user to
 *   restart.
 */
export function reloadForRTL(): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.reload();
  }
}
