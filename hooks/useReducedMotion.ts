import { useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface UseReducedMotionResult {
  /** Whether reduced motion is enabled */
  isReducedMotion: boolean;
  /** Toggle reduced motion preference */
  setReducedMotion: (reduced: boolean) => void;
  /** Returns 0 when reduced motion is on, baseDuration otherwise */
  getAnimationDuration: (baseDuration: number) => number;
  /** Convenience flag — true when animations should play */
  shouldAnimate: boolean;
  /** Transition config suitable for Animated API */
  getTransitionConfig: () => { duration: number; useNativeDriver: boolean };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook that respects the user's reduced-motion preference and provides
 * helpers for conditionally applying animations.
 *
 * ```ts
 * const { shouldAnimate, getAnimationDuration } = useReducedMotion();
 * const dur = getAnimationDuration(300);
 * ```
 */
export function useReducedMotion(): UseReducedMotionResult {
  const [isReducedMotion, setReducedMotion] = useState(false);

  const getAnimationDuration = useCallback(
    (baseDuration: number): number => {
      return isReducedMotion ? 0 : baseDuration;
    },
    [isReducedMotion],
  );

  const shouldAnimate = !isReducedMotion;

  const getTransitionConfig = useCallback(
    () => ({
      duration: isReducedMotion ? 0 : 300,
      useNativeDriver: true,
    }),
    [isReducedMotion],
  );

  return {
    isReducedMotion,
    setReducedMotion,
    getAnimationDuration,
    shouldAnimate,
    getTransitionConfig,
  };
}
