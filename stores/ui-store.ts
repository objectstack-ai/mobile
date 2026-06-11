import { create } from "zustand";
import { colorScheme } from "nativewind";
import { createMMKV } from "react-native-mmkv";
import i18n from "~/lib/i18n";
import type { SupportedLanguage } from "~/lib/i18n";

export type ThemeMode = "light" | "dark" | "system";

const storage = createMMKV({ id: "objectstack-ui" });
const THEME_KEY = "theme";

function loadTheme(): ThemeMode {
  const v = storage.getString(THEME_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

interface UIState {
  /** Current theme mode */
  theme: ThemeMode;
  /** Set theme — applies the NativeWind color scheme and persists it */
  setTheme: (theme: ThemeMode) => void;
  /** Current language code */
  language: SupportedLanguage;
  /** Change language (updates i18next and store) */
  setLanguage: (lang: SupportedLanguage) => void;
}

const initialTheme = loadTheme();

// Apply the persisted theme up front so the first paint matches the user's
// choice. `setTheme` previously only set state and never touched NativeWind, so
// the theme was inert and dark mode was unreachable.
colorScheme.set(initialTheme);

export const useUIStore = create<UIState>((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    colorScheme.set(theme);
    storage.set(THEME_KEY, theme);
    set({ theme });
  },
  language: (i18n.language ?? "en") as SupportedLanguage,
  setLanguage: (lang) => {
    i18n.changeLanguage(lang);
    set({ language: lang });
  },
}));
