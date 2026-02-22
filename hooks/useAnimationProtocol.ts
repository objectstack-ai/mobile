import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AnimationConfig {
  type: string;
  duration: number;
  delay: number;
  easing: string;
  iterations: number;
}

export interface TransitionConfig {
  property: string;
  from: string | number;
  to: string | number;
  duration: number;
  easing: string;
}

export interface MotionConfig {
  reducedMotion: boolean;
  prefersContrast: boolean;
  animationScale: number;
}

export interface UseAnimationProtocolResult {
  /** Registered animation configs keyed by id */
  animations: Map<string, AnimationConfig>;
  /** Registered transition configs keyed by id */
  transitions: Map<string, TransitionConfig>;
  /** Global motion / accessibility preferences */
  motionConfig: MotionConfig;
  /** Register (or replace) an animation */
  registerAnimation: (id: string, config: AnimationConfig) => void;
  /** Remove a registered animation */
  removeAnimation: (id: string) => void;
  /** Register (or replace) a transition */
  registerTransition: (id: string, config: TransitionConfig) => void;
  /** Remove a registered transition */
  removeTransition: (id: string) => void;
  /** Update global motion configuration */
  setMotionConfig: (config: MotionConfig) => void;
  /** Retrieve an animation config by id */
  getAnimation: (id: string) => AnimationConfig | undefined;
  /** Retrieve a transition config by id */
  getTransition: (id: string) => TransitionConfig | undefined;
  /** Whether reduced-motion is active */
  isReduced: boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Spec-driven animation & transition hook backed by `AnimationSchema`,
 * `TransitionConfigSchema`, and `MotionConfigSchema`.
 *
 * Centralises animation registration, transition management, and
 * reduced-motion awareness for the entire interaction layer.
 *
 * ```ts
 * const { registerAnimation, registerTransition, isReduced } =
 *   useAnimationProtocol();
 * registerAnimation("fadeIn", {
 *   type: "fade",
 *   duration: 300,
 *   delay: 0,
 *   easing: "ease-in-out",
 *   iterations: 1,
 * });
 * registerTransition("slideUp", {
 *   property: "translateY",
 *   from: 100,
 *   to: 0,
 *   duration: 250,
 *   easing: "ease-out",
 * });
 * ```
 */
export function useAnimationProtocol(): UseAnimationProtocolResult {
  const [animations, setAnimations] = useState<Map<string, AnimationConfig>>(
    () => new Map(),
  );
  const [transitions, setTransitions] = useState<
    Map<string, TransitionConfig>
  >(() => new Map());
  const [motionConfig, setMotionConfigState] = useState<MotionConfig>({
    reducedMotion: false,
    prefersContrast: false,
    animationScale: 1,
  });

  const isReduced = useMemo(
    () => motionConfig.reducedMotion,
    [motionConfig.reducedMotion],
  );

  /* ---- animations -------------------------------------------------- */

  const registerAnimation = useCallback(
    (id: string, config: AnimationConfig) => {
      setAnimations((prev) => {
        const next = new Map(prev);
        next.set(id, config);
        return next;
      });
    },
    [],
  );

  const removeAnimation = useCallback((id: string) => {
    setAnimations((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getAnimation = useCallback(
    (id: string): AnimationConfig | undefined => {
      return animations.get(id);
    },
    [animations],
  );

  /* ---- transitions ------------------------------------------------- */

  const registerTransition = useCallback(
    (id: string, config: TransitionConfig) => {
      setTransitions((prev) => {
        const next = new Map(prev);
        next.set(id, config);
        return next;
      });
    },
    [],
  );

  const removeTransition = useCallback((id: string) => {
    setTransitions((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getTransition = useCallback(
    (id: string): TransitionConfig | undefined => {
      return transitions.get(id);
    },
    [transitions],
  );

  /* ---- motion ------------------------------------------------------ */

  const setMotionConfig = useCallback((config: MotionConfig) => {
    setMotionConfigState(config);
  }, []);

  return {
    animations,
    transitions,
    motionConfig,
    registerAnimation,
    removeAnimation,
    registerTransition,
    removeTransition,
    setMotionConfig,
    getAnimation,
    getTransition,
    isReduced,
  };
}
