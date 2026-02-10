/**
 * Tests for theme-bridge – validates ThemeSchema → ThemeTokens conversion
 * and Tailwind extend config generation.
 */
import {
  resolveThemeTokens,
  toTailwindExtend,
  type ThemeSchema,
} from "~/lib/theme-bridge";

describe("resolveThemeTokens", () => {
  it("returns default tokens when no theme is provided", () => {
    const tokens = resolveThemeTokens(null);

    expect(tokens.colors.primary).toBe("#1e40af");
    expect(tokens.colors.error).toBe("#dc2626");
    expect(tokens.colors.background).toBe("#ffffff");
    expect(tokens.fontSize.base).toBe(16);
    expect(tokens.spacing.md).toBe(16);
    expect(tokens.borderRadius.lg).toBe(12);
    expect(tokens.fontFamily).toBeUndefined();
  });

  it("merges custom colors with defaults", () => {
    const theme: ThemeSchema = {
      colors: {
        primary: "#ff0000",
        secondary: "#00ff00",
        background: "#000000",
        surface: "#111111",
        error: "#990000",
        text: "#ffffff",
      },
    };

    const tokens = resolveThemeTokens(theme);

    expect(tokens.colors.primary).toBe("#ff0000");
    expect(tokens.colors.secondary).toBe("#00ff00");
    // Defaults should still be present for unset values
    expect(tokens.colors.warning).toBe("#f59e0b");
  });

  it("merges custom typography", () => {
    const theme: ThemeSchema = {
      colors: {
        primary: "#1e40af",
        secondary: "#6b7280",
        background: "#fff",
        surface: "#f9f",
        error: "#f00",
        text: "#000",
      },
      typography: {
        fontFamily: "Inter",
        fontSize: { base: 18, lg: 22 },
        fontWeight: { bold: "800" },
        lineHeight: { normal: 1.6 },
      },
    };

    const tokens = resolveThemeTokens(theme);

    expect(tokens.fontFamily).toBe("Inter");
    expect(tokens.fontSize.base).toBe(18);
    expect(tokens.fontSize.lg).toBe(22);
    // Default preserved
    expect(tokens.fontSize.sm).toBe(14);
    expect(tokens.fontWeight.bold).toBe("800");
    expect(tokens.fontWeight.normal).toBe("400");
    expect(tokens.lineHeight.normal).toBe(1.6);
  });

  it("merges custom spacing and borderRadius", () => {
    const theme: ThemeSchema = {
      colors: {
        primary: "#1e40af",
        secondary: "#6b7280",
        background: "#fff",
        surface: "#f9f",
        error: "#f00",
        text: "#000",
      },
      spacing: { xs: 2, md: 12 },
      borderRadius: { sm: 2, full: 9999 },
    };

    const tokens = resolveThemeTokens(theme);

    expect(tokens.spacing.xs).toBe(2);
    expect(tokens.spacing.md).toBe(12);
    expect(tokens.spacing.lg).toBe(24); // default
    expect(tokens.borderRadius.sm).toBe(2);
    expect(tokens.borderRadius.full).toBe(9999);
    expect(tokens.borderRadius.lg).toBe(12); // default
  });
});

describe("toTailwindExtend", () => {
  it("converts tokens to Tailwind extend config", () => {
    const tokens = resolveThemeTokens(null);
    const extend = toTailwindExtend(tokens);

    expect(extend.colors).toBeDefined();
    expect((extend.fontSize as Record<string, string>).base).toBe("16px");
    expect((extend.spacing as Record<string, string>).md).toBe("16px");
    expect((extend.borderRadius as Record<string, string>).full).toBe("9999px");
    expect((extend.borderRadius as Record<string, string>).sm).toBe("4px");
    expect(extend.fontFamily).toBeUndefined();
  });

  it("includes fontFamily when provided", () => {
    const tokens = resolveThemeTokens({
      colors: {
        primary: "#000",
        secondary: "#000",
        background: "#000",
        surface: "#000",
        error: "#000",
        text: "#000",
      },
      typography: { fontFamily: "Inter" },
    });
    const extend = toTailwindExtend(tokens);

    expect(extend.fontFamily).toEqual({ sans: ["Inter"] });
  });
});
