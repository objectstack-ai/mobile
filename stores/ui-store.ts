import { create } from "zustand";
import { colorScheme } from "nativewind";
import { createMMKV } from "react-native-mmkv";
import i18n, { isRTL, LANGUAGE_KEY } from "~/lib/i18n";
import type { SupportedLanguage } from "~/lib/i18n";
import { syncRTL, reloadForRTL } from "~/lib/rtl";

export type ThemeMode = "light" | "dark" | "system";
/** Default list row spacing when a view doesn't dictate its own. */
export type Density = "comfortable" | "compact";

const storage = createMMKV({ id: "objectstack-ui" });
const THEME_KEY = "theme";
const DENSITY_KEY = "density";

function loadTheme(): ThemeMode {
  const v = storage.getString(THEME_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function loadDensity(): Density {
  return storage.getString(DENSITY_KEY) === "compact" ? "compact" : "comfortable";
}

interface UIState {
  /** Current theme mode */
  theme: ThemeMode;
  /** Set theme — applies the NativeWind color scheme and persists it */
  setTheme: (theme: ThemeMode) => void;
  /** Default list density (fallback when a view has no explicit rowHeight) */
  density: Density;
  /** Set list density and persist it */
  setDensity: (density: Density) => void;
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
  density: loadDensity(),
  setDensity: (density) => {
    storage.set(DENSITY_KEY, density);
    set({ density });
  },
  language: (i18n.language ?? "en") as SupportedLanguage,
  setLanguage: (lang) => {
    const directionFlips = isRTL(i18n.language) !== isRTL(lang);
    // Persist so the choice survives the reload an RTL flip triggers (and app
    // restarts in general) — i18n's init reads this before device detection.
    storage.set(LANGUAGE_KEY, lang);
    i18n.changeLanguage(lang);
    set({ language: lang });
    // Apply writing direction. When the direction actually flips (e.g. en↔ar),
    // the layout must re-lay-out: on web a reload re-reads `document.dir`; on
    // native `forceRTL` is persisted and applies on the next launch.
    syncRTL(lang);
    if (directionFlips) reloadForRTL();
  },
}));
