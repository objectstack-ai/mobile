import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers: string[];
  action: string;
  description: string;
  enabled: boolean;
}

export interface KeyboardNavigationConfig {
  enabled: boolean;
  shortcuts: KeyboardShortcut[];
  tabNavigation: boolean;
  arrowNavigation: boolean;
}

export interface UseKeyboardNavigationResult {
  /** Current keyboard navigation configuration */
  config: KeyboardNavigationConfig;
  /** Registered shortcuts by id */
  shortcuts: Map<string, KeyboardShortcut>;
  /** Currently active shortcut id */
  activeShortcutId: string | null;
  /** Set the keyboard navigation config */
  setConfig: (config: KeyboardNavigationConfig) => void;
  /** Register a keyboard shortcut */
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  /** Unregister a keyboard shortcut */
  unregisterShortcut: (id: string) => void;
  /** Enable a specific shortcut */
  enableShortcut: (id: string) => void;
  /** Disable a specific shortcut */
  disableShortcut: (id: string) => void;
  /** Handle a key press; returns matched shortcut or null */
  handleKeyPress: (key: string, modifiers: string[]) => KeyboardShortcut | null;
  /** All currently enabled shortcuts */
  enabledShortcuts: KeyboardShortcut[];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for external keyboard support driven by
 * `KeyboardNavigationConfigSchema`.
 *
 * Implements Phase 25 Keyboard Navigation Protocol.
 *
 * ```ts
 * const { registerShortcut, handleKeyPress, enabledShortcuts } =
 *   useKeyboardNavigation();
 * registerShortcut({
 *   id: "save", key: "s", modifiers: ["ctrl"],
 *   action: "save", description: "Save record", enabled: true,
 * });
 * const matched = handleKeyPress("s", ["ctrl"]);
 * ```
 */
export function useKeyboardNavigation(): UseKeyboardNavigationResult {
  const [config, setConfigState] = useState<KeyboardNavigationConfig>({
    enabled: false,
    shortcuts: [],
    tabNavigation: true,
    arrowNavigation: true,
  });
  const [shortcuts, setShortcuts] = useState<Map<string, KeyboardShortcut>>(
    () => new Map(),
  );
  const [activeShortcutId, setActiveShortcutId] = useState<string | null>(null);

  /* ---- computed --------------------------------------------------- */

  const enabledShortcuts = useMemo(() => {
    const list: KeyboardShortcut[] = [];
    shortcuts.forEach((s) => {
      if (s.enabled) list.push(s);
    });
    return list;
  }, [shortcuts]);

  /* ---- methods ---------------------------------------------------- */

  const setConfig = useCallback((cfg: KeyboardNavigationConfig) => {
    setConfigState(cfg);
  }, []);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => {
      const next = new Map(prev);
      next.set(shortcut.id, shortcut);
      return next;
    });
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setActiveShortcutId((prev) => (prev === id ? null : prev));
  }, []);

  const enableShortcut = useCallback((id: string) => {
    setShortcuts((prev) => {
      const existing = prev.get(id);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(id, { ...existing, enabled: true });
      return next;
    });
  }, []);

  const disableShortcut = useCallback((id: string) => {
    setShortcuts((prev) => {
      const existing = prev.get(id);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(id, { ...existing, enabled: false });
      return next;
    });
  }, []);

  const handleKeyPress = useCallback(
    (key: string, modifiers: string[]): KeyboardShortcut | null => {
      if (!config.enabled) return null;
      const sorted = [...modifiers].sort();
      for (const s of enabledShortcuts) {
        const sModifiers = [...s.modifiers].sort();
        if (
          s.key === key &&
          sModifiers.length === sorted.length &&
          sModifiers.every((m, i) => m === sorted[i])
        ) {
          setActiveShortcutId(s.id);
          return s;
        }
      }
      return null;
    },
    [config.enabled, enabledShortcuts],
  );

  return {
    config,
    shortcuts,
    activeShortcutId,
    setConfig,
    registerShortcut,
    unregisterShortcut,
    enableShortcut,
    disableShortcut,
    handleKeyPress,
    enabledShortcuts,
  };
}
