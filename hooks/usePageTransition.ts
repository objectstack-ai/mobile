import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface TransitionConfig {
  type: "slide" | "modal" | "fade";
  duration?: number;
  damping?: number;
  stiffness?: number;
}

export interface TransitionStyle {
  opacity: number;
  transform: string;
}

export interface UsePageTransitionResult {
  /** Current transition configuration */
  config: TransitionConfig;
  /** Set the transition type */
  setTransitionType: (type: TransitionConfig["type"]) => void;
  /** Get computed transition style for a given progress value (0–1) */
  getTransitionStyle: (progress: number) => TransitionStyle;
  /** Whether reduced-motion is preferred */
  isReducedMotion: boolean;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: TransitionConfig = {
  type: "slide",
  duration: 300,
  damping: 20,
  stiffness: 200,
};

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for spring-based page transition configuration.
 * Pure local state – no server calls.
 *
 * ```ts
 * const { config, setTransitionType, getTransitionStyle } = usePageTransition();
 * setTransitionType("modal");
 * const style = getTransitionStyle(0.5);
 * ```
 */
export function usePageTransition(): UsePageTransitionResult {
  const [config, setConfig] = useState<TransitionConfig>(DEFAULT_CONFIG);
  const [isReducedMotion] = useState(false);

  const setTransitionType = useCallback(
    (type: TransitionConfig["type"]): void => {
      setConfig((prev) => ({ ...prev, type }));
    },
    [],
  );

  const getTransitionStyle = useCallback(
    (progress: number): TransitionStyle => {
      if (isReducedMotion) {
        return { opacity: progress, transform: "translateX(0px)" };
      }

      switch (config.type) {
        case "slide":
          return {
            opacity: 1,
            transform: `translateX(${(1 - progress) * 100}px)`,
          };
        case "modal":
          return {
            opacity: progress,
            transform: `translateY(${(1 - progress) * 50}px)`,
          };
        case "fade":
          return {
            opacity: progress,
            transform: "translateX(0px)",
          };
        default:
          return { opacity: progress, transform: "translateX(0px)" };
      }
    },
    [config.type, isReducedMotion],
  );

  return { config, setTransitionType, getTransitionStyle, isReducedMotion };
}
