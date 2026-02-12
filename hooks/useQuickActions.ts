import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  type: "create" | "search" | "scan" | "navigate" | "custom";
  target?: string;
  onExecute?: () => void;
}

export interface UseQuickActionsResult {
  /** Available quick actions */
  actions: QuickAction[];
  /** Register a new quick action */
  registerAction: (action: QuickAction) => void;
  /** Remove a quick action by id */
  removeAction: (id: string) => void;
  /** Execute a quick action by id */
  executeAction: (id: string) => Promise<void>;
  /** Whether an action is being executed */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_ACTIONS: QuickAction[] = [
  { id: "new-record", label: "New Record", icon: "plus", type: "create" },
  { id: "search", label: "Search", icon: "search", type: "search" },
  { id: "scan", label: "Scan", icon: "camera", type: "scan" },
];

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for quick action configuration.
 * Provides a set of default actions and allows registering / removing custom ones.
 *
 * ```ts
 * const { actions, registerAction, executeAction } = useQuickActions();
 * registerAction({ id: "import", label: "Import", icon: "upload", type: "custom", onExecute: () => {} });
 * await executeAction("import");
 * ```
 */
export function useQuickActions(): UseQuickActionsResult {
  const [actions, setActions] = useState<QuickAction[]>(DEFAULT_ACTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const registerAction = useCallback((action: QuickAction) => {
    setActions((prev) => {
      const exists = prev.some((a) => a.id === action.id);
      if (exists) return prev.map((a) => (a.id === action.id ? action : a));
      return [...prev, action];
    });
  }, []);

  const removeAction = useCallback((id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const executeAction = useCallback(
    async (id: string): Promise<void> => {
      const action = actions.find((a) => a.id === id);
      if (!action) {
        const err = new Error(`Action not found: ${id}`);
        setError(err);
        throw err;
      }

      setIsLoading(true);
      setError(null);
      try {
        if (action.onExecute) {
          action.onExecute();
        }
      } catch (err: unknown) {
        const execError =
          err instanceof Error ? err : new Error("Failed to execute action");
        setError(execError);
        throw execError;
      } finally {
        setIsLoading(false);
      }
    },
    [actions],
  );

  return { actions, registerAction, removeAction, executeAction, isLoading, error };
}
