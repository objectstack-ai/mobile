import { useCallback, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface UndoableAction {
  id: string;
  description: string;
  undo: () => Promise<void>;
  timestamp: number;
}

export interface UseUndoRedoResult {
  /** Whether there is an action that can be undone */
  canUndo: boolean;
  /** The most recent undoable action */
  lastAction: UndoableAction | null;
  /** Push a new undoable action onto the stack */
  pushAction: (action: Omit<UndoableAction, "id" | "timestamp">) => void;
  /** Undo the last action */
  undo: () => Promise<void>;
  /** Dismiss the last action without undoing */
  dismiss: () => void;
  /** Whether an undo operation is in progress */
  isUndoing: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

let counter = 0;
function generateId(): string {
  counter += 1;
  return `undo-${Date.now()}-${counter}`;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for undo/redo state management.
 * Maintains a stack of undoable actions and provides undo / dismiss.
 *
 * ```ts
 * const { pushAction, undo, canUndo } = useUndoRedo();
 * pushAction({ description: "Deleted record", undo: async () => restore() });
 * await undo();
 * ```
 */
export function useUndoRedo(): UseUndoRedoResult {
  const [stack, setStack] = useState<UndoableAction[]>([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const [isUndoing, setIsUndoing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const lastAction = stack.length > 0 ? stack[stack.length - 1] : null;
  const canUndo = stack.length > 0;

  const pushAction = useCallback(
    (action: Omit<UndoableAction, "id" | "timestamp">) => {
      const entry: UndoableAction = {
        ...action,
        id: generateId(),
        timestamp: Date.now(),
      };
      setStack((prev) => [...prev, entry]);
      setError(null);
    },
    [],
  );

  const undo = useCallback(async (): Promise<void> => {
    setError(null);
    const current = stackRef.current[stackRef.current.length - 1];
    if (!current) return;

    setIsUndoing(true);
    try {
      await current.undo();
      setStack((prev) => prev.slice(0, -1));
    } catch (err: unknown) {
      const undoError =
        err instanceof Error ? err : new Error("Failed to undo action");
      setError(undoError);
      throw undoError;
    } finally {
      setIsUndoing(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
    setError(null);
  }, []);

  return { canUndo, lastAction, pushAction, undo, dismiss, isUndoing, error };
}
