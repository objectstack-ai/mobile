import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface EasingFunction {
  type:
    | "linear"
    | "ease"
    | "ease_in"
    | "ease_out"
    | "ease_in_out"
    | "spring"
    | "cubic_bezier";
  params?: number[];
}

export interface ComponentAnimationConfig {
  componentId: string;
  enter?: { duration: number; easing: EasingFunction };
  exit?: { duration: number; easing: EasingFunction };
  hover?: { duration: number; easing: EasingFunction };
  focus?: { duration: number; easing: EasingFunction };
  disabled?: boolean;
}

export interface UseComponentAnimationResult {
  /** Per-component animation configs keyed by componentId */
  componentAnimations: Map<string, ComponentAnimationConfig>;
  /** Set (or replace) a component's animation config */
  setComponentAnimation: (
    componentId: string,
    config: ComponentAnimationConfig,
  ) => void;
  /** Remove a component's animation config */
  removeComponentAnimation: (componentId: string) => void;
  /** Retrieve a component's animation config */
  getComponentAnimation: (
    componentId: string,
  ) => ComponentAnimationConfig | undefined;
  /** Update only the enter animation for a component */
  updateEnterAnimation: (
    componentId: string,
    enter: ComponentAnimationConfig["enter"],
  ) => void;
  /** Update only the exit animation for a component */
  updateExitAnimation: (
    componentId: string,
    exit: ComponentAnimationConfig["exit"],
  ) => void;
  /** List of all registered component IDs */
  registeredComponents: string[];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Per-component animation configuration hook backed by
 * `ComponentAnimationSchema`.
 *
 * Stores enter / exit / hover / focus animation configs per component so
 * renderers can look up animation behaviour declaratively.
 *
 * ```ts
 * const { setComponentAnimation, getComponentAnimation, registeredComponents } =
 *   useComponentAnimation();
 * setComponentAnimation("card-1", {
 *   componentId: "card-1",
 *   enter: { duration: 200, easing: { type: "ease_in" } },
 *   exit: { duration: 150, easing: { type: "ease_out" } },
 * });
 * const cfg = getComponentAnimation("card-1");
 * ```
 */
export function useComponentAnimation(): UseComponentAnimationResult {
  const [componentAnimations, setComponentAnimations] = useState<
    Map<string, ComponentAnimationConfig>
  >(() => new Map());

  const registeredComponents = useMemo(
    () => Array.from(componentAnimations.keys()),
    [componentAnimations],
  );

  const setComponentAnimation = useCallback(
    (componentId: string, config: ComponentAnimationConfig) => {
      setComponentAnimations((prev) => {
        const next = new Map(prev);
        next.set(componentId, config);
        return next;
      });
    },
    [],
  );

  const removeComponentAnimation = useCallback((componentId: string) => {
    setComponentAnimations((prev) => {
      const next = new Map(prev);
      next.delete(componentId);
      return next;
    });
  }, []);

  const getComponentAnimation = useCallback(
    (componentId: string): ComponentAnimationConfig | undefined => {
      return componentAnimations.get(componentId);
    },
    [componentAnimations],
  );

  const updateEnterAnimation = useCallback(
    (componentId: string, enter: ComponentAnimationConfig["enter"]) => {
      setComponentAnimations((prev) => {
        const existing = prev.get(componentId);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(componentId, { ...existing, enter });
        return next;
      });
    },
    [],
  );

  const updateExitAnimation = useCallback(
    (componentId: string, exit: ComponentAnimationConfig["exit"]) => {
      setComponentAnimations((prev) => {
        const existing = prev.get(componentId);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(componentId, { ...existing, exit });
        return next;
      });
    },
    [],
  );

  return {
    componentAnimations,
    setComponentAnimation,
    removeComponentAnimation,
    getComponentAnimation,
    updateEnterAnimation,
    updateExitAnimation,
    registeredComponents,
  };
}
