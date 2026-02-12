import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface InlineEditState {
  field: string;
  value: unknown;
  originalValue: unknown;
  isDirty: boolean;
}

export interface UseInlineEditResult {
  /** The field currently being edited */
  editingField: string | null;
  /** Begin editing a field on a record */
  startEdit: (
    object: string,
    recordId: string,
    field: string,
    currentValue: unknown,
  ) => void;
  /** Persist the pending value to the server */
  saveEdit: () => Promise<void>;
  /** Discard changes and stop editing */
  cancelEdit: () => void;
  /** Update the pending value */
  updateValue: (value: unknown) => void;
  /** The current (pending) value */
  currentValue: unknown;
  /** Whether the pending value differs from the original */
  isDirty: boolean;
  /** Whether a save operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for inline field editing on detail views.
 *
 * ```ts
 * const { startEdit, saveEdit, cancelEdit, updateValue, isDirty } = useInlineEdit();
 * startEdit("tasks", "task-1", "title", "Old title");
 * updateValue("New title");
 * await saveEdit();
 * ```
 */
export function useInlineEdit(): UseInlineEditResult {
  const client = useClient();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [object, setObject] = useState<string>("");
  const [recordId, setRecordId] = useState<string>("");
  const [currentValue, setCurrentValue] = useState<unknown>(undefined);
  const [originalValue, setOriginalValue] = useState<unknown>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startEdit = useCallback(
    (obj: string, recId: string, field: string, value: unknown) => {
      setObject(obj);
      setRecordId(recId);
      setEditingField(field);
      setCurrentValue(value);
      setOriginalValue(value);
      setError(null);
    },
    [],
  );

  const updateValue = useCallback((value: unknown) => {
    setCurrentValue(value);
  }, []);

  const cancelEdit = useCallback(() => {
    setCurrentValue(originalValue);
    setEditingField(null);
    setError(null);
  }, [originalValue]);

  const saveEdit = useCallback(async (): Promise<void> => {
    if (!editingField) return;
    setIsLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).api?.update(object, recordId, {
        [editingField]: currentValue,
      });
      setOriginalValue(currentValue);
      setEditingField(null);
    } catch (err: unknown) {
      const saveError =
        err instanceof Error ? err : new Error("Failed to save edit");
      setError(saveError);
      throw saveError;
    } finally {
      setIsLoading(false);
    }
  }, [client, object, recordId, editingField, currentValue]);

  const isDirty = currentValue !== originalValue;

  return {
    editingField,
    startEdit,
    saveEdit,
    cancelEdit,
    updateValue,
    currentValue,
    isDirty,
    isLoading,
    error,
  };
}
