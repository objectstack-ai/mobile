/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AnimationConfig {
  type: "spring" | "timing";
  duration?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
}

/* ------------------------------------------------------------------ */
/*  Presets                                                             */
/* ------------------------------------------------------------------ */

/**
 * Pre-defined micro-interaction animation configurations.
 *
 * ```ts
 * const config = MicroInteractions.buttonPress();
 * ```
 */
export const MicroInteractions = {
  listItemEntrance: (_index: number): AnimationConfig => ({
    type: "spring",
    damping: 15,
    stiffness: 150,
    mass: 1,
  }),

  buttonPress: (): AnimationConfig => ({
    type: "spring",
    damping: 10,
    stiffness: 400,
  }),

  stateChange: (): AnimationConfig => ({
    type: "timing",
    duration: 200,
  }),

  cardExpand: (): AnimationConfig => ({
    type: "spring",
    damping: 20,
    stiffness: 200,
  }),

  fadeIn: (_delay?: number): AnimationConfig => ({
    type: "timing",
    duration: 300,
  }),

  scaleIn: (): AnimationConfig => ({
    type: "spring",
    damping: 12,
    stiffness: 200,
  }),
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Calculate a staggered entrance delay for list items.
 * Caps at index 10 to avoid excessive delays.
 */
export function getEntranceDelay(
  index: number,
  baseDelay?: number,
): number {
  return (baseDelay ?? 50) * Math.min(index, 10);
}
