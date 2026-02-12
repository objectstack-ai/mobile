import { useCallback, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface FormDraftState {
  objectName: string;
  recordId?: string;
  values: Record<string, unknown>;
  savedAt: number;
}

export interface UseFormDraftResult {
  /** Current draft state */
  draft: FormDraftState | null;
  /** Save a draft for a given object/record */
  saveDraft: (
    objectName: string,
    values: Record<string, unknown>,
    recordId?: string,
  ) => void;
  /** Load a previously saved draft */
  loadDraft: (
    objectName: string,
    recordId?: string,
  ) => FormDraftState | null;
  /** Discard (remove) a draft */
  discardDraft: (objectName: string, recordId?: string) => void;
  /** Check whether a draft exists */
  hasDraft: (objectName: string, recordId?: string) => boolean;
  /** Whether the current draft has values */
  isDirty: boolean;
  /** Percentage of filled fields (0-100) */
  completionPercent: number;
  /** Set the total number of fields for completion calculation */
  setFieldCount: (count: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function draftKey(objectName: string, recordId?: string): string {
  return recordId ? `${objectName}:${recordId}` : objectName;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Auto-save form drafts with discard confirmation.
 *
 * Stores drafts in local state (Map keyed by objectName+recordId).
 * Pure local state — no server calls.
 *
 * ```ts
 * const { saveDraft, loadDraft, isDirty, completionPercent } = useFormDraft();
 * saveDraft("tasks", { title: "New task" });
 * ```
 */
export function useFormDraft(): UseFormDraftResult {
  const draftsRef = useRef<Map<string, FormDraftState>>(new Map());
  const [draft, setDraft] = useState<FormDraftState | null>(null);
  const [fieldCount, setFieldCount] = useState(0);

  const saveDraft = useCallback(
    (
      objectName: string,
      values: Record<string, unknown>,
      recordId?: string,
    ) => {
      const state: FormDraftState = {
        objectName,
        recordId,
        values,
        savedAt: Date.now(),
      };
      draftsRef.current.set(draftKey(objectName, recordId), state);
      setDraft(state);
    },
    [],
  );

  const loadDraft = useCallback(
    (objectName: string, recordId?: string): FormDraftState | null => {
      const found =
        draftsRef.current.get(draftKey(objectName, recordId)) ?? null;
      setDraft(found);
      return found;
    },
    [],
  );

  const discardDraft = useCallback(
    (objectName: string, recordId?: string) => {
      draftsRef.current.delete(draftKey(objectName, recordId));
      setDraft(null);
    },
    [],
  );

  const hasDraft = useCallback(
    (objectName: string, recordId?: string): boolean =>
      draftsRef.current.has(draftKey(objectName, recordId)),
    [],
  );

  const isDirty =
    draft !== null && Object.keys(draft.values).length > 0;

  const filledFields = draft
    ? Object.values(draft.values).filter(
        (v) => v !== undefined && v !== null && v !== "",
      ).length
    : 0;

  const completionPercent =
    fieldCount > 0 ? Math.round((filledFields / fieldCount) * 100) : 0;

  return {
    draft,
    saveDraft,
    loadDraft,
    discardDraft,
    hasDraft,
    isDirty,
    completionPercent,
    setFieldCount,
  };
}
