import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface FocusTrapConfig {
  id: string;
  enabled: boolean;
  autoFocus: boolean;
  restoreFocus: boolean;
  initialFocusRef?: string;
}

export interface FocusableElement {
  id: string;
  order: number;
  group?: string;
  disabled?: boolean;
}

export interface UseFocusManagementResult {
  /** Registered focus traps */
  traps: Map<string, FocusTrapConfig>;
  /** Registered focusable elements */
  focusableElements: FocusableElement[];
  /** Currently active trap id */
  activeTrapId: string | null;
  /** Currently focused element id */
  focusedElementId: string | null;
  /** Register a new focus trap */
  registerTrap: (config: FocusTrapConfig) => void;
  /** Unregister a focus trap */
  unregisterTrap: (id: string) => void;
  /** Activate a focus trap */
  activateTrap: (id: string) => void;
  /** Deactivate the current focus trap */
  deactivateTrap: () => void;
  /** Register a focusable element */
  registerElement: (element: FocusableElement) => void;
  /** Unregister a focusable element */
  unregisterElement: (id: string) => void;
  /** Focus a specific element */
  focusElement: (id: string) => void;
  /** Focus the next element in order */
  focusNext: () => void;
  /** Focus the previous element in order */
  focusPrevious: () => void;
  /** Active elements sorted by order, non-disabled, within the active trap group */
  activeElements: FocusableElement[];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for spec-driven focus traps and management from
 * `FocusManagementSchema`.
 *
 * Implements Phase 25 Focus Protocol.
 *
 * ```ts
 * const { registerTrap, activateTrap, focusNext, activeElements } =
 *   useFocusManagement();
 * registerTrap({ id: "dialog", enabled: true, autoFocus: true, restoreFocus: true });
 * activateTrap("dialog");
 * focusNext();
 * ```
 */
export function useFocusManagement(): UseFocusManagementResult {
  const [traps, setTraps] = useState<Map<string, FocusTrapConfig>>(
    () => new Map(),
  );
  const [focusableElements, setFocusableElements] = useState<
    FocusableElement[]
  >([]);
  const [activeTrapId, setActiveTrapId] = useState<string | null>(null);
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);

  /* ---- computed --------------------------------------------------- */

  const activeElements = useMemo(() => {
    const trap = activeTrapId ? traps.get(activeTrapId) : undefined;
    const group = trap?.id;
    return focusableElements
      .filter((el) => !el.disabled && (!group || el.group === group))
      .sort((a, b) => a.order - b.order);
  }, [focusableElements, activeTrapId, traps]);

  /* ---- trap management ------------------------------------------- */

  const registerTrap = useCallback((config: FocusTrapConfig) => {
    setTraps((prev) => {
      const next = new Map(prev);
      next.set(config.id, config);
      return next;
    });
  }, []);

  const unregisterTrap = useCallback((id: string) => {
    setTraps((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setActiveTrapId((prev) => (prev === id ? null : prev));
  }, []);

  const activateTrap = useCallback((id: string) => {
    setActiveTrapId(id);
  }, []);

  const deactivateTrap = useCallback(() => {
    setActiveTrapId(null);
  }, []);

  /* ---- element management ---------------------------------------- */

  const registerElement = useCallback((element: FocusableElement) => {
    setFocusableElements((prev) => {
      const exists = prev.findIndex((e) => e.id === element.id);
      if (exists >= 0) {
        return prev.map((e) => (e.id === element.id ? element : e));
      }
      return [...prev, element];
    });
  }, []);

  const unregisterElement = useCallback((id: string) => {
    setFocusableElements((prev) => prev.filter((e) => e.id !== id));
    setFocusedElementId((prev) => (prev === id ? null : prev));
  }, []);

  const focusElement = useCallback((id: string) => {
    setFocusedElementId(id);
  }, []);

  const focusNext = useCallback(() => {
    setFocusedElementId((prev) => {
      if (activeElements.length === 0) return prev;
      const idx = activeElements.findIndex((e) => e.id === prev);
      const next = (idx + 1) % activeElements.length;
      return activeElements[next].id;
    });
  }, [activeElements]);

  const focusPrevious = useCallback(() => {
    setFocusedElementId((prev) => {
      if (activeElements.length === 0) return prev;
      const idx = activeElements.findIndex((e) => e.id === prev);
      const next = idx <= 0 ? activeElements.length - 1 : idx - 1;
      return activeElements[next].id;
    });
  }, [activeElements]);

  return {
    traps,
    focusableElements,
    activeTrapId,
    focusedElementId,
    registerTrap,
    unregisterTrap,
    activateTrap,
    deactivateTrap,
    registerElement,
    unregisterElement,
    focusElement,
    focusNext,
    focusPrevious,
    activeElements,
  };
}
