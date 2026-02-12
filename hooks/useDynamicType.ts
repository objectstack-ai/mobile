import { useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type TextScale = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";

export interface UseDynamicTypeResult {
  /** Current scale multiplier */
  scale: number;
  /** Update the scale multiplier (clamped to 0.8–2.0) */
  setScale: (scale: number) => void;
  /** Return baseSize * scale, clamped to a reasonable range */
  getScaledSize: (baseSize: number) => number;
  /** Category derived from the current scale */
  textScaleCategory: TextScale;
  /** Whether the current scale qualifies as large text */
  isLargeText: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function clampScale(value: number): number {
  return Math.min(2.0, Math.max(0.8, value));
}

function deriveCategory(scale: number): TextScale {
  if (scale < 0.85) return "xs";
  if (scale < 0.95) return "sm";
  if (scale < 1.1) return "base";
  if (scale < 1.3) return "lg";
  if (scale < 1.5) return "xl";
  if (scale < 1.8) return "2xl";
  return "3xl";
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for dynamic type support — provides text-scale utilities that
 * respect iOS / Android font-size preferences.
 *
 * ```ts
 * const { scale, getScaledSize, textScaleCategory } = useDynamicType();
 * const fontSize = getScaledSize(16);
 * ```
 */
export function useDynamicType(): UseDynamicTypeResult {
  const [scale, setScaleRaw] = useState(1.0);

  const setScale = useCallback((value: number) => {
    setScaleRaw(clampScale(value));
  }, []);

  const getScaledSize = useCallback(
    (baseSize: number): number => {
      return Math.round(baseSize * scale);
    },
    [scale],
  );

  const textScaleCategory = deriveCategory(scale);
  const isLargeText = scale >= 1.3;

  return { scale, setScale, getScaledSize, textScaleCategory, isLargeText };
}
