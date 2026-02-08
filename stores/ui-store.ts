import { create } from "zustand";
import i18n from "~/lib/i18n";
import type { SupportedLanguage } from "~/lib/i18n";

interface UIState {
  /** Current theme mode */
  theme: "light" | "dark" | "system";
  /** Set theme */
  setTheme: (theme: "light" | "dark" | "system") => void;
  /** Current language code */
  language: SupportedLanguage;
  /** Change language (updates i18next and store) */
  setLanguage: (lang: SupportedLanguage) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
  language: (i18n.language ?? "en") as SupportedLanguage,
  setLanguage: (lang) => {
    i18n.changeLanguage(lang);
    set({ language: lang });
  },
}));
