/**
 * Internationalization configuration.
 *
 * Integrates i18next + react-i18next + expo-localization. Ships the shell's own
 * strings (server picker, confirm screen, loading, offline page) in the same
 * ten locales, under the same short codes, as the Console UI
 * (objectstack `ui/packages/i18n/src/locales/registry.ts`,
 * `BUILT_IN_LANGUAGE_CODES`), so a phone language lands on the same locale on
 * both sides. Everything inside the Console is translated by the Console.
 *
 * The phone setting is the only source: there is no in-app language picker for
 * the native screens, and the shell follows a phone-language change the next
 * time the app comes to the foreground ({@link followDeviceLanguageOnForeground}).
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales, type Locale } from "expo-localization";
import { AppState, type AppStateStatus } from "react-native";

import en from "~/locales/en.json";
import zh from "~/locales/zh.json";
import ja from "~/locales/ja.json";
import ko from "~/locales/ko.json";
import de from "~/locales/de.json";
import fr from "~/locales/fr.json";
import es from "~/locales/es.json";
import pt from "~/locales/pt.json";
import ru from "~/locales/ru.json";
import ar from "~/locales/ar.json";

/** Languages that use right-to-left layout — the Console's list (`locales/rtl.ts`). */
export const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

/**
 * All bundled languages with their native display names: the Console's ten
 * codes in the Console's order, named as the Console's language menu names them
 * (objectstack `ui/packages/app-shell/src/layout/LocaleSwitcher.tsx`).
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** The language used when no preferred phone language is supported. */
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

const SUPPORTED_CODES: ReadonlySet<string> = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

function isSupportedLanguage(code: string): code is SupportedLanguage {
  return SUPPORTED_CODES.has(code);
}

/**
 * Exact-then-base language-tag matching: `tag` itself when `has(tag)`, else its
 * base language (`zh-CN` → `zh`) when `has(base)`, else `null`.
 *
 * A port of the Console's `matchLanguageTag` (objectstack
 * `ui/packages/i18n/src/locales/registry.ts`), kept byte-for-byte in behaviour
 * so a tag resolves to the same locale on both sides. Consequences that follow
 * from the Console's rule, not from a choice made here:
 *
 * - Traditional Chinese (`zh-Hant`, `zh-TW`, `zh-HK`, `zh-Hant-TW`) has no
 *   catalogue of its own, so it resolves to `zh`, as in the Console.
 * - The base is the text before the first `-`; case is not folded.
 */
export function matchLanguageTag(tag: string, has: (code: string) => boolean): string | null {
  if (has(tag)) return tag;
  const base = tag.split("-")[0];
  if (base && base !== tag && has(base)) return base;
  return null;
}

/**
 * Pick the shell language from an ordered list of preferred language tags: the
 * first tag that {@link matchLanguageTag} resolves to a bundled language, else
 * {@link DEFAULT_LANGUAGE}.
 */
export function resolveLanguage(tags: readonly (string | null | undefined)[]): SupportedLanguage {
  for (const tag of tags) {
    if (!tag) continue;
    const match = matchLanguageTag(tag, isSupportedLanguage);
    if (match) return match as SupportedLanguage;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Detect the shell language from the phone's ordered preferred languages
 * (`expo-localization`'s `getLocales()`, in the order the user set them).
 * Falls back to `"en"` if detection fails or no preferred language is bundled.
 */
export function detectDeviceLanguage(locales?: readonly Partial<Locale>[]): SupportedLanguage {
  try {
    const list = locales ?? getLocales();
    return resolveLanguage((list ?? []).map((l) => l?.languageTag || l?.languageCode));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** Check whether a language (default: the current one) is laid out right-to-left. */
export function isRTL(lang?: string): boolean {
  const code = lang ?? i18n.language ?? DEFAULT_LANGUAGE;
  return RTL_LANGUAGES.has(code);
}

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  pt: { translation: pt },
  ru: { translation: ru },
  ar: { translation: ar },
} as const satisfies Record<SupportedLanguage, { translation: unknown }>;

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

/**
 * Re-read the phone's languages and switch the shell to the result when it
 * differs from the current language. Resolves to the language now in effect.
 */
export async function followDeviceLanguage(
  locales?: readonly Partial<Locale>[]
): Promise<SupportedLanguage> {
  const next = detectDeviceLanguage(locales);
  if (i18n.language !== next) await i18n.changeLanguage(next);
  return next;
}

/**
 * Follow a phone-language change on the next foreground: every time the app
 * becomes `active` again, {@link followDeviceLanguage} runs. Returns the
 * unsubscribe function.
 */
export function followDeviceLanguageOnForeground(): () => void {
  let previous: AppStateStatus = AppState.currentState;
  const subscription = AppState.addEventListener("change", (next: AppStateStatus) => {
    if (next === "active" && previous !== "active") void followDeviceLanguage();
    previous = next;
  });
  return () => subscription.remove();
}

/**
 * Count-aware translation that does NOT depend on `Intl.PluralRules`.
 *
 * Hermes (React Native's JS engine) ships without `Intl.PluralRules`, and
 * i18next's plural resolver relies on it — so on device every plural key falls
 * back to the fallback language (e.g. "1 app installed" instead of the
 * localized string) while non-plural keys localize fine. This picks the English
 * one/other form manually and uses the single "other" form for the other
 * locales; the strings interpolate `{{n}}` (named so i18next's own plural
 * handling never triggers).
 */
export function tCount(baseKey: string, count: number): string {
  const isEnglish = (i18n.language || "en").startsWith("en");
  const suffix = isEnglish && count === 1 ? "_one" : "_other";
  return i18n.t(`${baseKey}${suffix}`, { n: count });
}

export default i18n;
