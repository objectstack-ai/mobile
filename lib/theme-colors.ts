import { useColorScheme } from "nativewind";

/**
 * Theme-aware colors for places that need a concrete hex rather than a Tailwind
 * class — chiefly lucide icons (`color` prop) and a few inline styles. Mirrors
 * the `global.css` tokens closely enough that icons read correctly in both
 * light and dark mode, where a hardcoded `#1e40af` (too dark) or `#0f172a`
 * (invisible on a dark card) would otherwise fail.
 */
export interface ThemeColors {
  /** Brand/primary accent — for active icons, links, primary affordances. */
  accent: string;
  /** Default foreground — for neutral icons on cards/surfaces. */
  foreground: string;
  /** Muted foreground — secondary icons, chevrons, hints. */
  muted: string;
}

const LIGHT: ThemeColors = {
  accent: "#1e40af",
  foreground: "#0f172a",
  muted: "#94a3b8",
};

const DARK: ThemeColors = {
  accent: "#60a5fa",
  foreground: "#e2e8f0",
  // Slate-400 reads acceptably on both themes; keep it stable so muted icons
  // don't shift between light and dark.
  muted: "#94a3b8",
};

/** Hook: theme-aware icon/inline colors for the current color scheme. */
export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? DARK : LIGHT;
}
