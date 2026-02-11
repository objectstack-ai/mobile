/**
 * Theme Bridge – converts @objectstack/spec/ui ThemeSchema tokens
 * into a flat token map consumable by NativeWind / Tailwind CSS.
 *
 * Spec compliance: Rule #4 Global Theming (ThemeSchema tokens).
 */

/* ------------------------------------------------------------------ */
/*  Spec-aligned types (mirrored from @objectstack/spec/ui)            */
/* ------------------------------------------------------------------ */

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent?: string;
  background: string;
  surface: string;
  error: string;
  warning?: string;
  success?: string;
  info?: string;
  text: string;
  textSecondary?: string;
  border?: string;
  [key: string]: string | undefined;
}

export interface Typography {
  fontFamily?: string;
  fontSize?: {
    xs?: number;
    sm?: number;
    base?: number;
    lg?: number;
    xl?: number;
    "2xl"?: number;
    "3xl"?: number;
    [key: string]: number | undefined;
  };
  fontWeight?: {
    normal?: string;
    medium?: string;
    semibold?: string;
    bold?: string;
    [key: string]: string | undefined;
  };
  lineHeight?: {
    tight?: number;
    normal?: number;
    relaxed?: number;
    [key: string]: number | undefined;
  };
}

export interface Spacing {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  "2xl"?: number;
  [key: string]: number | undefined;
}

export interface BorderRadius {
  none?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  full?: number;
  [key: string]: number | undefined;
}

export interface ThemeSchema {
  name?: string;
  mode?: "light" | "dark" | "auto";
  colors: ColorPalette;
  typography?: Typography;
  spacing?: Spacing;
  borderRadius?: BorderRadius;
}

/* ------------------------------------------------------------------ */
/*  Token map output                                                    */
/* ------------------------------------------------------------------ */

export interface ThemeTokens {
  colors: Record<string, string>;
  fontFamily?: string;
  fontSize: Record<string, number>;
  fontWeight: Record<string, string>;
  lineHeight: Record<string, number>;
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/*  Default tokens (fallback when no server theme is provided)         */
/* ------------------------------------------------------------------ */

const DEFAULT_COLORS: ColorPalette = {
  primary: "#1e40af",
  secondary: "#6b7280",
  accent: "#8b5cf6",
  background: "#ffffff",
  surface: "#f9fafb",
  error: "#dc2626",
  warning: "#f59e0b",
  success: "#16a34a",
  info: "#2563eb",
  text: "#111827",
  textSecondary: "#6b7280",
  border: "#e5e7eb",
};

const DEFAULT_FONT_SIZES: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
};

const DEFAULT_SPACING: Record<string, number> = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
};

const DEFAULT_BORDER_RADIUS: Record<string, number> = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

/* ------------------------------------------------------------------ */
/*  Conversion                                                         */
/* ------------------------------------------------------------------ */

/**
 * Convert a spec ThemeSchema into a flat ThemeTokens map.
 */
export function resolveThemeTokens(theme?: ThemeSchema | null): ThemeTokens {
  const colors: Record<string, string> = {};
  // Apply defaults first
  for (const [key, value] of Object.entries(DEFAULT_COLORS)) {
    if (value) colors[key] = value;
  }
  if (theme?.colors) {
    for (const [key, value] of Object.entries(theme.colors)) {
      if (value) colors[key] = value;
    }
  }

  const fontSize: Record<string, number> = { ...DEFAULT_FONT_SIZES };
  if (theme?.typography?.fontSize) {
    for (const [key, value] of Object.entries(theme.typography.fontSize)) {
      if (value !== undefined) fontSize[key] = value;
    }
  }

  const fontWeight: Record<string, string> = {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  };
  if (theme?.typography?.fontWeight) {
    for (const [key, value] of Object.entries(theme.typography.fontWeight)) {
      if (value !== undefined) fontWeight[key] = value;
    }
  }

  const lineHeight: Record<string, number> = {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  };
  if (theme?.typography?.lineHeight) {
    for (const [key, value] of Object.entries(theme.typography.lineHeight)) {
      if (value !== undefined) lineHeight[key] = value;
    }
  }

  const spacing: Record<string, number> = { ...DEFAULT_SPACING };
  if (theme?.spacing) {
    for (const [key, value] of Object.entries(theme.spacing)) {
      if (value !== undefined) spacing[key] = value;
    }
  }

  const borderRadius: Record<string, number> = { ...DEFAULT_BORDER_RADIUS };
  if (theme?.borderRadius) {
    for (const [key, value] of Object.entries(theme.borderRadius)) {
      if (value !== undefined) borderRadius[key] = value;
    }
  }

  return {
    colors,
    fontFamily: theme?.typography?.fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    spacing,
    borderRadius,
  };
}

/**
 * Convert ThemeTokens into a Tailwind extend config shape.
 */
export function toTailwindExtend(tokens: ThemeTokens): Record<string, unknown> {
  return {
    colors: tokens.colors,
    fontSize: Object.fromEntries(
      Object.entries(tokens.fontSize).map(([k, v]) => [k, `${v}px`]),
    ),
    spacing: Object.fromEntries(
      Object.entries(tokens.spacing).map(([k, v]) => [k, `${v}px`]),
    ),
    borderRadius: Object.fromEntries(
      Object.entries(tokens.borderRadius).map(([k, v]) => [
        k,
        v === 9999 ? "9999px" : `${v}px`,
      ]),
    ),
    fontFamily: tokens.fontFamily
      ? { sans: [tokens.fontFamily] }
      : undefined,
  };
}
