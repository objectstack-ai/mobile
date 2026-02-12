import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface VoiceShortcut {
  id: string;
  phrase: string;
  action: string;
  params?: Record<string, string>;
  isRegistered: boolean;
}

export interface UseVoiceShortcutsResult {
  /** Current registered shortcuts */
  shortcuts: VoiceShortcut[];
  /** Register a new voice shortcut */
  registerShortcut: (shortcut: Omit<VoiceShortcut, "isRegistered">) => Promise<void>;
  /** Remove a voice shortcut by id */
  removeShortcut: (id: string) => Promise<void>;
  /** Whether native voice assistant integration is supported */
  isSupported: boolean;
  /** Default suggested shortcuts */
  defaultShortcuts: VoiceShortcut[];
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_SHORTCUTS: VoiceShortcut[] = [
  { id: "search", phrase: "Search ObjectStack", action: "search", isRegistered: false },
  { id: "create", phrase: "Create new record", action: "create", isRegistered: false },
  { id: "notifications", phrase: "Check notifications", action: "notifications", isRegistered: false },
];

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for voice assistant (Siri / Google Assistant) shortcut registration.
 *
 * ```ts
 * const { shortcuts, registerShortcut, removeShortcut } = useVoiceShortcuts();
 * await registerShortcut({ id: "search", phrase: "Search ObjectStack", action: "search" });
 * ```
 */
export function useVoiceShortcuts(): UseVoiceShortcutsResult {
  const [shortcuts, setShortcuts] = useState<VoiceShortcut[]>([]);

  const registerShortcut = useCallback(
    async (shortcut: Omit<VoiceShortcut, "isRegistered">): Promise<void> => {
      setShortcuts((prev) => {
        const exists = prev.some((s) => s.id === shortcut.id);
        if (exists) {
          return prev.map((s) =>
            s.id === shortcut.id ? { ...s, ...shortcut, isRegistered: true } : s,
          );
        }
        return [...prev, { ...shortcut, isRegistered: true }];
      });
    },
    [],
  );

  const removeShortcut = useCallback(async (id: string): Promise<void> => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    shortcuts,
    registerShortcut,
    removeShortcut,
    isSupported: false,
    defaultShortcuts: DEFAULT_SHORTCUTS,
  };
}
