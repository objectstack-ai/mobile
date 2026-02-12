/**
 * Tests for design-tokens – validates semantic colors,
 * elevation levels, spacing, and radius tokens.
 */
import {
  semanticColors,
  elevation,
  spacing,
  radius,
  getElevation,
  getSemanticColor,
} from "~/lib/design-tokens";

describe("semanticColors", () => {
  it("exposes all semantic color keys", () => {
    expect(semanticColors.success).toBe("#059669");
    expect(semanticColors.successLight).toBe("#d1fae5");
    expect(semanticColors.warning).toBe("#d97706");
    expect(semanticColors.warningLight).toBe("#fef3c7");
    expect(semanticColors.error).toBe("#dc2626");
    expect(semanticColors.errorLight).toBe("#fee2e2");
    expect(semanticColors.info).toBe("#2563eb");
    expect(semanticColors.infoLight).toBe("#dbeafe");
  });
});

describe("elevation", () => {
  it("has six levels (0–5)", () => {
    expect(Object.keys(elevation)).toHaveLength(6);
  });

  it("level 0 has no shadow", () => {
    expect(elevation[0].shadowOpacity).toBe(0);
    expect(elevation[0].elevation).toBe(0);
  });

  it("level 5 has the highest shadow", () => {
    expect(elevation[5].shadowOpacity).toBe(0.25);
    expect(elevation[5].shadowRadius).toBe(24);
    expect(elevation[5].elevation).toBe(12);
  });

  it("each level has required shadow properties", () => {
    for (let i = 0; i <= 5; i++) {
      const lvl = elevation[i];
      expect(lvl).toHaveProperty("shadowColor");
      expect(lvl).toHaveProperty("shadowOffset");
      expect(lvl).toHaveProperty("shadowOpacity");
      expect(lvl).toHaveProperty("shadowRadius");
      expect(lvl).toHaveProperty("elevation");
    }
  });
});

describe("spacing", () => {
  it("exposes all spacing tokens", () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
    expect(spacing["2xl"]).toBe(48);
    expect(spacing["3xl"]).toBe(64);
  });
});

describe("radius", () => {
  it("exposes all radius tokens", () => {
    expect(radius.none).toBe(0);
    expect(radius.sm).toBe(4);
    expect(radius.md).toBe(8);
    expect(radius.lg).toBe(12);
    expect(radius.xl).toBe(16);
    expect(radius.full).toBe(9999);
  });
});

describe("getElevation", () => {
  it("returns the correct level", () => {
    expect(getElevation(3)).toEqual(elevation[3]);
  });

  it("clamps below 0 to level 0", () => {
    expect(getElevation(-1)).toEqual(elevation[0]);
  });

  it("clamps above 5 to level 5", () => {
    expect(getElevation(10)).toEqual(elevation[5]);
  });
});

describe("getSemanticColor", () => {
  it("returns the correct color for a key", () => {
    expect(getSemanticColor("success")).toBe("#059669");
    expect(getSemanticColor("error")).toBe("#dc2626");
    expect(getSemanticColor("infoLight")).toBe("#dbeafe");
  });
});
