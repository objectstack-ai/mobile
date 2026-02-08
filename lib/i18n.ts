/**
 * Internationalization configuration.
 *
 * Integrates i18next + react-i18next + expo-localization for locale detection.
 * Ships with built-in static translations (en, zh, ar).
 * Server-side translations via client.i18n.* can be layered on once the SDK
 * supports it (see Phase 5B.2).
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import en from "~/locales/en.json";
import zh from "~/locales/zh.json";
import ar from "~/locales/ar.json";

/** Languages that use right-to-left layout */
export const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

/** All bundled languages with display names */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/**
 * Detect the device's preferred language code.
 * Falls back to `"en"` if detection fails or the locale is unsupported.
 */
export function detectDeviceLanguage(): SupportedLanguage {
  try {
    const locales = getLocales();
    const deviceLang = locales?.[0]?.languageCode ?? "en";
    const supported = SUPPORTED_LANGUAGES.map((l) => l.code) as readonly string[];
    return (supported.includes(deviceLang) ? deviceLang : "en") as SupportedLanguage;
  } catch {
    return "en";
  }
}

/** Check whether the current language is RTL */
export function isRTL(lang?: string): boolean {
  const code = lang ?? i18n.language ?? "en";
  return RTL_LANGUAGES.has(code);
}

const resources = { en: { translation: en }, zh: { translation: zh }, ar: { translation: ar } };

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

export default i18n;
