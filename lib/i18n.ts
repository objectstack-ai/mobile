/**
 * Internationalization configuration.
 *
 * Integrates i18next + react-i18next + expo-localization. Ships the shell's own
 * strings (server picker, confirm screen, loading, offline page) in the
 * platform's one list of 11 languages, keyed by the platform's tags
 * (objectstack-ai/objectstack#29428, ruling F of #29349). Everything inside the
 * Console is translated by the Console.
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
import zhHans from "~/locales/zh-Hans.json";
import zhHant from "~/locales/zh-Hant.json";
import es from "~/locales/es.json";
import ar from "~/locales/ar.json";
import fr from "~/locales/fr.json";
import ptBR from "~/locales/pt-BR.json";
import ru from "~/locales/ru.json";
import de from "~/locales/de.json";
import ja from "~/locales/ja.json";
import ko from "~/locales/ko.json";

/** Languages that use right-to-left layout — the Console's list (`locales/rtl.ts`). */
export const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

/**
 * All bundled languages with their native display names: the platform's 11
 * tags, in the platform table's order (objectstack-ai/objectstack#29428).
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh-Hans", label: "简体中文" },
  { code: "zh-Hant", label: "繁體中文" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "ru", label: "Русский" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** The language used when no preferred phone language is supported. */
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

/** Supported languages whose tag is a bare primary subtag (`en`, `ja`, …), lower-cased. */
const PRIMARY_ONLY: ReadonlySet<string> = new Set(
  SUPPORTED_LANGUAGES.map((l) => l.code).filter((code) => !code.includes("-"))
);

/** Regions whose Chinese is written in Traditional script. */
const HANT_REGIONS: ReadonlySet<string> = new Set(["tw", "hk", "mo"]);

/**
 * Resolve one BCP 47 language tag to a bundled language, by script, or `null`
 * when the tag names no bundled language. The platform's alias rule
 * (objectstack-ai/objectstack#29428):
 *
 * - Chinese (`zh`): an explicit script subtag decides — `Hant` → `zh-Hant`,
 *   `Hans` → `zh-Hans`. Without one, the regions `TW`, `HK` and `MO` →
 *   `zh-Hant`, and every other `zh` tag (bare `zh`, `zh-CN`, `zh-SG`, …) →
 *   `zh-Hans`.
 * - Portuguese: every `pt` tag (bare `pt`, `pt-PT`, `pt-BR`, …) → `pt-BR`.
 * - Any other tag → its primary subtag when that is bundled (`en-US` → `en`,
 *   `es-MX` → `es`), else `null`.
 *
 * Subtags compare case-insensitively, as BCP 47 defines them. Only the
 * language, script and region subtags are read: scanning stops at the first
 * singleton (`-u-`, `-x-`, …), so an extension value never reads as a region.
 */
export function resolveLanguageTag(tag: string): SupportedLanguage | null {
  const subtags = tag.toLowerCase().split("-");
  const primary = subtags[0];
  if (!primary) return null;

  if (primary === "zh") {
    let script: string | undefined;
    let region: string | undefined;
    for (const subtag of subtags.slice(1)) {
      if (subtag.length === 1) break;
      if (!script && !region && /^[a-z]{4}$/.test(subtag)) script = subtag;
      else if (!region && /^([a-z]{2}|\d{3})$/.test(subtag)) region = subtag;
    }
    if (script === "hant") return "zh-Hant";
    if (script === "hans") return "zh-Hans";
    return region && HANT_REGIONS.has(region) ? "zh-Hant" : "zh-Hans";
  }
  if (primary === "pt") return "pt-BR";
  return PRIMARY_ONLY.has(primary) ? (primary as SupportedLanguage) : null;
}

/**
 * Pick the shell language from an ordered list of preferred language tags: the
 * first tag that {@link resolveLanguageTag} resolves to a bundled language, else
 * {@link DEFAULT_LANGUAGE}.
 */
export function resolveLanguage(tags: readonly (string | null | undefined)[]): SupportedLanguage {
  for (const tag of tags) {
    if (!tag) continue;
    const match = resolveLanguageTag(tag);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * One phone locale as a language tag: its `languageTag`, else a tag built from
 * its language, script and region codes, so a locale reported without a tag
 * keeps its script (`zh` + `Hant` + `TW` → `zh-Hant-TW`).
 */
function localeTag(locale: Partial<Locale> | null | undefined): string | undefined {
  if (!locale) return undefined;
  if (locale.languageTag) return locale.languageTag;
  if (!locale.languageCode) return undefined;
  return [locale.languageCode, locale.languageScriptCode, locale.regionCode]
    .filter(Boolean)
    .join("-");
}

/**
 * Detect the shell language from the phone's ordered preferred languages
 * (`expo-localization`'s `getLocales()`, in the order the user set them).
 * Falls back to `"en"` if detection fails or no preferred language is bundled.
 */
export function detectDeviceLanguage(locales?: readonly Partial<Locale>[]): SupportedLanguage {
  try {
    const list = locales ?? getLocales();
    return resolveLanguage((list ?? []).map(localeTag));
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
  "zh-Hans": { translation: zhHans },
  "zh-Hant": { translation: zhHant },
  es: { translation: es },
  ar: { translation: ar },
  fr: { translation: fr },
  "pt-BR": { translation: ptBR },
  ru: { translation: ru },
  de: { translation: de },
  ja: { translation: ja },
  ko: { translation: ko },
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
