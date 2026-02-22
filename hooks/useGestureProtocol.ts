import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type GestureType =
  | "swipe"
  | "pinch"
  | "long_press"
  | "tap"
  | "double_tap"
  | "pan";

export interface SwipeConfig {
  direction: "left" | "right" | "up" | "down";
  threshold: number;
  velocity: number;
}

export interface PinchConfig {
  minScale: number;
  maxScale: number;
}

export interface LongPressConfig {
  duration: number;
  feedbackEnabled: boolean;
}

export interface TouchTargetConfig {
  minSize: number;
  padding: number;
}

export interface GestureConfig {
  type: GestureType;
  enabled: boolean;
  swipe?: SwipeConfig;
  pinch?: PinchConfig;
  longPress?: LongPressConfig;
}

export interface UseGestureProtocolResult {
  /** Registered gesture configurations keyed by id */
  gestures: Map<string, GestureConfig>;
  /** ID of the gesture currently being performed */
  activeGesture: string | null;
  /** Global touch-target sizing configuration */
  touchTargetConfig: TouchTargetConfig;
  /** Register (or replace) a gesture configuration */
  registerGesture: (id: string, config: GestureConfig) => void;
  /** Remove a registered gesture */
  unregisterGesture: (id: string) => void;
  /** Update global touch-target configuration */
  setTouchTargetConfig: (config: TouchTargetConfig) => void;
  /** Retrieve a gesture config by id */
  getGesture: (id: string) => GestureConfig | undefined;
  /** Set the currently active gesture id */
  setActiveGesture: (id: string | null) => void;
  /** IDs of all currently registered gestures */
  activeGestureIds: string[];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Spec-driven gesture configuration hook backed by `GestureConfigSchema`.
 *
 * Centralises gesture registration, touch-target sizing, and active-gesture
 * tracking so platform gesture handlers can read declarative configs.
 *
 * ```ts
 * const { registerGesture, getGesture, activeGestureIds } = useGestureProtocol();
 * registerGesture("swipeLeft", {
 *   type: "swipe",
 *   enabled: true,
 *   swipe: { direction: "left", threshold: 50, velocity: 0.3 },
 * });
 * const cfg = getGesture("swipeLeft");
 * ```
 */
export function useGestureProtocol(): UseGestureProtocolResult {
  const [gestures, setGestures] = useState<Map<string, GestureConfig>>(
    () => new Map(),
  );
  const [activeGesture, setActiveGestureState] = useState<string | null>(null);
  const [touchTargetConfig, setTouchTargetConfigState] =
    useState<TouchTargetConfig>({ minSize: 44, padding: 8 });

  const activeGestureIds = useMemo(
    () => Array.from(gestures.keys()),
    [gestures],
  );

  const registerGesture = useCallback((id: string, config: GestureConfig) => {
    setGestures((prev) => {
      const next = new Map(prev);
      next.set(id, config);
      return next;
    });
  }, []);

  const unregisterGesture = useCallback((id: string) => {
    setGestures((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const setTouchTargetConfig = useCallback((config: TouchTargetConfig) => {
    setTouchTargetConfigState(config);
  }, []);

  const getGesture = useCallback(
    (id: string): GestureConfig | undefined => {
      return gestures.get(id);
    },
    [gestures],
  );

  const setActiveGesture = useCallback((id: string | null) => {
    setActiveGestureState(id);
  }, []);

  return {
    gestures,
    activeGesture,
    touchTargetConfig,
    registerGesture,
    unregisterGesture,
    setTouchTargetConfig,
    getGesture,
    setActiveGesture,
    activeGestureIds,
  };
}
