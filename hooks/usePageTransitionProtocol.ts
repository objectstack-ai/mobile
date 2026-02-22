import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface PageTransitionConfig {
  type: "slide" | "fade" | "modal" | "none";
  direction?: "left" | "right" | "up" | "down";
  duration: number;
  easing: string;
}

export interface TransitionPreset {
  name: string;
  config: PageTransitionConfig;
}

export interface UsePageTransitionProtocolResult {
  /** Fallback transition used when no preset is applied */
  defaultTransition: PageTransitionConfig;
  /** Named transition presets keyed by name */
  presets: Map<string, TransitionPreset>;
  /** Transition currently in effect */
  currentTransition: PageTransitionConfig;
  /** Replace the default transition */
  setDefaultTransition: (config: PageTransitionConfig) => void;
  /** Register (or replace) a named preset */
  registerPreset: (name: string, config: PageTransitionConfig) => void;
  /** Remove a registered preset */
  removePreset: (name: string) => void;
  /** Apply a preset by name as the current transition */
  applyPreset: (name: string) => void;
  /** Directly set the current transition */
  setCurrentTransition: (config: PageTransitionConfig) => void;
  /** Retrieve a preset by name */
  getPreset: (name: string) => TransitionPreset | undefined;
  /** List of all registered preset names */
  presetNames: string[];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

const DEFAULT_TRANSITION: PageTransitionConfig = {
  type: "fade",
  duration: 300,
  easing: "ease-in-out",
};

/**
 * Server-defined page-transition hook backed by `PageTransitionSchema`.
 *
 * Manages named transition presets, a default fallback, and the
 * currently-active transition so navigation layers can animate
 * declaratively.
 *
 * ```ts
 * const { registerPreset, applyPreset, currentTransition } =
 *   usePageTransitionProtocol();
 * registerPreset("slideRight", {
 *   type: "slide",
 *   direction: "right",
 *   duration: 250,
 *   easing: "ease-out",
 * });
 * applyPreset("slideRight");
 * console.log(currentTransition.type); // "slide"
 * ```
 */
export function usePageTransitionProtocol(): UsePageTransitionProtocolResult {
  const [defaultTransition, setDefaultTransitionState] =
    useState<PageTransitionConfig>(DEFAULT_TRANSITION);
  const [presets, setPresets] = useState<Map<string, TransitionPreset>>(
    () => new Map(),
  );
  const [currentTransition, setCurrentTransitionState] =
    useState<PageTransitionConfig>(DEFAULT_TRANSITION);

  const presetNames = useMemo(
    () => Array.from(presets.keys()),
    [presets],
  );

  const setDefaultTransition = useCallback((config: PageTransitionConfig) => {
    setDefaultTransitionState(config);
  }, []);

  const registerPreset = useCallback(
    (name: string, config: PageTransitionConfig) => {
      setPresets((prev) => {
        const next = new Map(prev);
        next.set(name, { name, config });
        return next;
      });
    },
    [],
  );

  const removePreset = useCallback((name: string) => {
    setPresets((prev) => {
      const next = new Map(prev);
      next.delete(name);
      return next;
    });
  }, []);

  const applyPreset = useCallback(
    (name: string) => {
      const preset = presets.get(name);
      if (preset) {
        setCurrentTransitionState(preset.config);
      }
    },
    [presets],
  );

  const setCurrentTransition = useCallback((config: PageTransitionConfig) => {
    setCurrentTransitionState(config);
  }, []);

  const getPreset = useCallback(
    (name: string): TransitionPreset | undefined => {
      return presets.get(name);
    },
    [presets],
  );

  return {
    defaultTransition,
    presets,
    currentTransition,
    setDefaultTransition,
    registerPreset,
    removePreset,
    applyPreset,
    setCurrentTransition,
    getPreset,
    presetNames,
  };
}
